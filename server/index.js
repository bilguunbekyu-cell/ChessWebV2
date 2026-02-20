import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import crypto from "crypto";
import { Server } from "socket.io";
import { Chess } from "chess.js";
import {
  FOUR_PLAYER_COLORS,
  createInitialFourPlayerState,
  applyFourPlayerMove,
  eliminateFourPlayerColor,
} from "./utils/fourPlayerEngine.js";
import { connectDB } from "./config/db.js";
import { Friend } from "./models/index.js";
import { seedPuzzles, seedGamePageConfig, seedBots } from "./seeds/index.js";
import {
  authRoutes,
  historyRoutes,
  puzzleRoutes,
  gameConfigRoutes,
  botsRoutes,
  adminRoutes,
  adminUsersRoutes,
  adminGamesRoutes,
  adminPuzzlesRoutes,
  adminBotsRoutes,
  featuredEventsRoutes,
  adminFeaturedEventsRoutes,
  lichessRoutes,
  friendsRoutes,
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

const waitingQueues = new Map(); // key -> socket ids
const games = new Map(); // gameId -> { room, chess, players, timeControl, variant, chess960 }
const fourPlayerQueues = new Map(); // key -> socket ids
const fourPlayerGames = new Map(); // gameId -> { room, state, playersByColor, socketToColor, timeControl }
const userSockets = new Map(); // userId -> Set<socketId>
const pendingChallenges = new Map(); // challengeId -> challenge metadata

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Run seeds after DB connection
mongoose.connection.once("open", () => {
  seedPuzzles().catch(console.error);
  seedGamePageConfig().catch(console.error);
  seedBots().catch(console.error);
});

// API Routes
app.use("/api", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/puzzles", puzzleRoutes);
app.use("/api/game-config", gameConfigRoutes);
app.use("/api/bots", botsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/games", adminGamesRoutes);
app.use("/api/admin/puzzles", adminPuzzlesRoutes);
app.use("/api/admin/bots", adminBotsRoutes);
app.use("/api/admin/featured-events", adminFeaturedEventsRoutes);
app.use("/api/featured-events", featuredEventsRoutes);
app.use("/api/lichess", lichessRoutes);
app.use("/api/friends", friendsRoutes);

function getQueueKey(timeControl, variant) {
  const initial = Number(timeControl?.initial ?? 300);
  const increment = Number(timeControl?.increment ?? 0);
  const normalizedVariant = normalizeVariant(variant);
  return `${normalizedVariant}:${initial}+${increment}`;
}

function getQueue(key) {
  if (!waitingQueues.has(key)) {
    waitingQueues.set(key, []);
  }
  return waitingQueues.get(key);
}

function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function getSocketAuth(socket) {
  try {
    const cookieHeader = socket.handshake?.headers?.cookie || "";
    const cookies = parseCookies(cookieHeader);
    const rawToken = cookies.authToken;
    if (!rawToken) return null;
    return JSON.parse(decodeURIComponent(rawToken));
  } catch {
    return null;
  }
}

function normalizeId(value) {
  if (!value) return "";
  return String(value);
}

function getUserRoom(userId) {
  return `user:${userId}`;
}

function registerUserSocket(userId, socketId) {
  if (!userId) return;
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
}

function unregisterUserSocket(userId, socketId) {
  if (!userId) return;
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
}

function isSocketReadyForGame(socket) {
  return !!socket && !socket.data?.gameId && !socket.data?.fourPlayerGameId;
}

function getSocketForUser(io, userId, preferredSocketId = null) {
  if (preferredSocketId) {
    const preferred = io.sockets.sockets.get(preferredSocketId);
    if (
      preferred &&
      normalizeId(preferred.data?.userId) === normalizeId(userId) &&
      isSocketReadyForGame(preferred)
    ) {
      return preferred;
    }
  }

  const socketIds = userSockets.get(normalizeId(userId));
  if (!socketIds) return null;

  for (const socketId of socketIds) {
    const candidate = io.sockets.sockets.get(socketId);
    if (
      candidate &&
      normalizeId(candidate.data?.userId) === normalizeId(userId) &&
      isSocketReadyForGame(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

function normalizeTimeControl(timeControl) {
  const initial = Number(timeControl?.initial);
  const increment = Number(timeControl?.increment);

  return {
    initial: Number.isFinite(initial) && initial >= 0 ? initial : 300,
    increment: Number.isFinite(increment) && increment >= 0 ? increment : 0,
  };
}

function normalizePlayAs(playAs) {
  if (playAs === "white" || playAs === "black" || playAs === "random") {
    return playAs;
  }
  return "random";
}

function normalizeGameType(gameType) {
  if (!gameType) return "standard";
  return String(gameType).trim().toLowerCase() || "standard";
}

function normalizeVariant(variant) {
  if (!variant) return "standard";
  const normalized = String(variant).trim().toLowerCase();
  if (normalized === "chess960") return "chess960";
  if (normalized === "fourplayer" || normalized === "four_player") {
    return "fourPlayer";
  }
  return "standard";
}

function normalizeFourPlayerSquare(square) {
  if (!square || typeof square !== "object") return null;
  const row = Number(square.row);
  const col = Number(square.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

function pickRandomIndex(indexes) {
  const random = Math.floor(Math.random() * indexes.length);
  return indexes[random];
}

function generateChess960BackRank() {
  const backRank = Array(8).fill("");
  const evenSquares = [0, 2, 4, 6];
  const oddSquares = [1, 3, 5, 7];

  const darkBishopSquare = pickRandomIndex(evenSquares);
  const lightBishopSquare = pickRandomIndex(oddSquares);
  backRank[darkBishopSquare] = "b";
  backRank[lightBishopSquare] = "b";

  const emptySquares = [];
  for (let i = 0; i < 8; i += 1) {
    if (!backRank[i]) emptySquares.push(i);
  }

  const queenSquare = pickRandomIndex(emptySquares);
  backRank[queenSquare] = "q";

  const remainingAfterQueen = emptySquares.filter((idx) => idx !== queenSquare);
  const knightOneSquare = pickRandomIndex(remainingAfterQueen);
  backRank[knightOneSquare] = "n";

  const remainingAfterKnightOne = remainingAfterQueen.filter(
    (idx) => idx !== knightOneSquare,
  );
  const knightTwoSquare = pickRandomIndex(remainingAfterKnightOne);
  backRank[knightTwoSquare] = "n";

  const finalSquares = remainingAfterKnightOne
    .filter((idx) => idx !== knightTwoSquare)
    .sort((a, b) => a - b);
  backRank[finalSquares[0]] = "r";
  backRank[finalSquares[1]] = "k";
  backRank[finalSquares[2]] = "r";

  return backRank.join("");
}

const FILES = "abcdefgh";
const BOARD_SIZE = 8;

function fileIndexToSquare(fileIndex, rank) {
  return `${FILES[fileIndex]}${rank}`;
}

function squareToCoords(square) {
  if (typeof square !== "string" || square.length !== 2) return null;
  const file = FILES.indexOf(square[0]);
  const rankNumber = Number(square[1]);
  if (file < 0 || !Number.isFinite(rankNumber) || rankNumber < 1 || rankNumber > 8) {
    return null;
  }
  const rankIndex = 8 - rankNumber;
  return { file, rank: rankIndex };
}

function coordsToSquare(file, rank) {
  if (
    file < 0 ||
    file >= BOARD_SIZE ||
    rank < 0 ||
    rank >= BOARD_SIZE
  ) {
    return null;
  }
  const rankNumber = 8 - rank;
  return `${FILES[file]}${rankNumber}`;
}

function createChess960MetadataFromBackRank(backRank) {
  const kingFile = backRank.indexOf("k");
  const rookFiles = [];

  for (let i = 0; i < backRank.length; i += 1) {
    if (backRank[i] === "r") {
      rookFiles.push(i);
    }
  }

  const queenSideRookFile = rookFiles.find((file) => file < kingFile);
  const kingSideRookFile = rookFiles.find((file) => file > kingFile);

  if (
    kingFile < 0 ||
    queenSideRookFile === undefined ||
    kingSideRookFile === undefined
  ) {
    return null;
  }

  return {
    starts: {
      w: {
        king: fileIndexToSquare(kingFile, 1),
        rooks: {
          q: fileIndexToSquare(queenSideRookFile, 1),
          k: fileIndexToSquare(kingSideRookFile, 1),
        },
      },
      b: {
        king: fileIndexToSquare(kingFile, 8),
        rooks: {
          q: fileIndexToSquare(queenSideRookFile, 8),
          k: fileIndexToSquare(kingSideRookFile, 8),
        },
      },
    },
    rights: {
      w: { q: true, k: true },
      b: { q: true, k: true },
    },
  };
}

function createInitialPosition(variant) {
  if (normalizeVariant(variant) !== "chess960") {
    return { fen: "start", chess960: null };
  }

  const blackBackRank = generateChess960BackRank();
  const whiteBackRank = blackBackRank.toUpperCase();
  const chess960 = createChess960MetadataFromBackRank(blackBackRank);

  // chess.js 0.13.x does not support Chess960 castling semantics.
  return {
    fen: `${blackBackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteBackRank} w - - 0 1`,
    chess960,
  };
}

function parseFenPosition(fen) {
  const [placement, activeColor = "w", castling = "-", enPassant = "-", halfmove = "0", fullmove = "1"] =
    String(fen || "").trim().split(/\s+/);

  const rows = placement.split("/");
  if (rows.length !== 8) return null;

  const board = [];
  for (const row of rows) {
    const parsedRow = [];
    for (const char of row) {
      const num = Number(char);
      if (Number.isInteger(num) && num > 0) {
        for (let i = 0; i < num; i += 1) parsedRow.push(null);
      } else {
        parsedRow.push(char);
      }
    }
    if (parsedRow.length !== 8) return null;
    board.push(parsedRow);
  }

  return {
    board,
    activeColor,
    castling,
    enPassant,
    halfmove: Number.isFinite(Number(halfmove)) ? Number(halfmove) : 0,
    fullmove: Number.isFinite(Number(fullmove)) ? Number(fullmove) : 1,
  };
}

function serializeFenBoard(board) {
  return board
    .map((row) => {
      let rowFen = "";
      let emptyCount = 0;
      for (const piece of row) {
        if (!piece) {
          emptyCount += 1;
        } else {
          if (emptyCount > 0) {
            rowFen += String(emptyCount);
            emptyCount = 0;
          }
          rowFen += piece;
        }
      }
      if (emptyCount > 0) {
        rowFen += String(emptyCount);
      }
      return rowFen;
    })
    .join("/");
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function getPiece(board, square) {
  const coords = squareToCoords(square);
  if (!coords) return null;
  return board[coords.rank]?.[coords.file] || null;
}

function setPiece(board, square, piece) {
  const coords = squareToCoords(square);
  if (!coords) return false;
  if (!board[coords.rank]) return false;
  board[coords.rank][coords.file] = piece;
  return true;
}

function isSquareUnderAttack(board, square, attackerColor) {
  const coords = squareToCoords(square);
  if (!coords) return false;
  const { file, rank } = coords;
  const pawn = attackerColor === "w" ? "P" : "p";
  const knight = attackerColor === "w" ? "N" : "n";
  const bishop = attackerColor === "w" ? "B" : "b";
  const rook = attackerColor === "w" ? "R" : "r";
  const queen = attackerColor === "w" ? "Q" : "q";
  const king = attackerColor === "w" ? "K" : "k";

  const pawnAttackers =
    attackerColor === "w"
      ? [
          { file: file - 1, rank: rank + 1 },
          { file: file + 1, rank: rank + 1 },
        ]
      : [
          { file: file - 1, rank: rank - 1 },
          { file: file + 1, rank: rank - 1 },
        ];

  for (const pos of pawnAttackers) {
    const piece = board[pos.rank]?.[pos.file];
    if (piece === pawn) return true;
  }

  const knightOffsets = [
    { df: -2, dr: -1 },
    { df: -2, dr: 1 },
    { df: -1, dr: -2 },
    { df: -1, dr: 2 },
    { df: 1, dr: -2 },
    { df: 1, dr: 2 },
    { df: 2, dr: -1 },
    { df: 2, dr: 1 },
  ];
  for (const { df, dr } of knightOffsets) {
    const piece = board[rank + dr]?.[file + df];
    if (piece === knight) return true;
  }

  const kingOffsets = [
    { df: -1, dr: -1 },
    { df: -1, dr: 0 },
    { df: -1, dr: 1 },
    { df: 0, dr: -1 },
    { df: 0, dr: 1 },
    { df: 1, dr: -1 },
    { df: 1, dr: 0 },
    { df: 1, dr: 1 },
  ];
  for (const { df, dr } of kingOffsets) {
    const piece = board[rank + dr]?.[file + df];
    if (piece === king) return true;
  }

  const bishopDirections = [
    { df: -1, dr: -1 },
    { df: -1, dr: 1 },
    { df: 1, dr: -1 },
    { df: 1, dr: 1 },
  ];
  for (const { df, dr } of bishopDirections) {
    let nextFile = file + df;
    let nextRank = rank + dr;
    while (
      nextFile >= 0 &&
      nextFile < BOARD_SIZE &&
      nextRank >= 0 &&
      nextRank < BOARD_SIZE
    ) {
      const piece = board[nextRank][nextFile];
      if (piece) {
        if (piece === bishop || piece === queen) {
          return true;
        }
        break;
      }
      nextFile += df;
      nextRank += dr;
    }
  }

  const rookDirections = [
    { df: -1, dr: 0 },
    { df: 1, dr: 0 },
    { df: 0, dr: -1 },
    { df: 0, dr: 1 },
  ];
  for (const { df, dr } of rookDirections) {
    let nextFile = file + df;
    let nextRank = rank + dr;
    while (
      nextFile >= 0 &&
      nextFile < BOARD_SIZE &&
      nextRank >= 0 &&
      nextRank < BOARD_SIZE
    ) {
      const piece = board[nextRank][nextFile];
      if (piece) {
        if (piece === rook || piece === queen) {
          return true;
        }
        break;
      }
      nextFile += df;
      nextRank += dr;
    }
  }

  return false;
}

function getChess960CastlingTargets(color, side) {
  if (color === "w") {
    return side === "k"
      ? { kingTo: "g1", rookTo: "f1" }
      : { kingTo: "c1", rookTo: "d1" };
  }
  return side === "k"
    ? { kingTo: "g8", rookTo: "f8" }
    : { kingTo: "c8", rookTo: "d8" };
}

function updateChess960RightsForNormalMove(game, move, moverColor) {
  if (!game?.chess960) return;

  const metadata = game.chess960;
  const opponentColor = moverColor === "w" ? "b" : "w";

  if (move.piece === "k") {
    metadata.rights[moverColor].k = false;
    metadata.rights[moverColor].q = false;
  }

  if (move.piece === "r") {
    if (move.from === metadata.starts[moverColor].rooks.k) {
      metadata.rights[moverColor].k = false;
    }
    if (move.from === metadata.starts[moverColor].rooks.q) {
      metadata.rights[moverColor].q = false;
    }
  }

  if (move.captured === "r") {
    if (move.to === metadata.starts[opponentColor].rooks.k) {
      metadata.rights[opponentColor].k = false;
    }
    if (move.to === metadata.starts[opponentColor].rooks.q) {
      metadata.rights[opponentColor].q = false;
    }
  }
}

function tryHandleChess960Castling(game, moverColor, from, to) {
  if (!game?.chess960 || game.variant !== "chess960") {
    return { handled: false };
  }

  const currentFen = game.chess.fen();
  const parsed = parseFenPosition(currentFen);
  if (!parsed) {
    return { handled: true, success: false, reason: "Invalid board state." };
  }

  const board = parsed.board;
  const kingStart = game.chess960.starts[moverColor].king;
  const rookStarts = game.chess960.starts[moverColor].rooks;
  const kingPiece = moverColor === "w" ? "K" : "k";
  const rookPiece = moverColor === "w" ? "R" : "r";

  const pieceFrom = getPiece(board, from);
  const pieceTo = getPiece(board, to);

  if (pieceFrom !== kingPiece || pieceTo !== rookPiece) {
    return { handled: false };
  }

  if (from !== kingStart) {
    return { handled: true, success: false, reason: "King has already moved." };
  }

  let side = null;
  if (to === rookStarts.k) side = "k";
  if (to === rookStarts.q) side = "q";
  if (!side) {
    return {
      handled: true,
      success: false,
      reason: "Select your castling rook to castle in Chess960.",
    };
  }

  if (!game.chess960.rights[moverColor][side]) {
    return { handled: true, success: false, reason: "Castling is no longer available." };
  }

  const kingCoords = squareToCoords(from);
  const rookCoords = squareToCoords(to);
  if (!kingCoords || !rookCoords || kingCoords.rank !== rookCoords.rank) {
    return { handled: true, success: false, reason: "Invalid castling move." };
  }

  const { kingTo, rookTo } = getChess960CastlingTargets(moverColor, side);
  const kingToCoords = squareToCoords(kingTo);
  const rookToCoords = squareToCoords(rookTo);
  if (!kingToCoords || !rookToCoords) {
    return { handled: true, success: false, reason: "Invalid castling targets." };
  }

  const rank = kingCoords.rank;
  const kingFile = kingCoords.file;
  const rookFile = rookCoords.file;
  const kingToFile = kingToCoords.file;
  const rookToFile = rookToCoords.file;

  const betweenKingAndRookStart = Math.min(kingFile, rookFile) + 1;
  const betweenKingAndRookEnd = Math.max(kingFile, rookFile) - 1;
  for (let file = betweenKingAndRookStart; file <= betweenKingAndRookEnd; file += 1) {
    const square = coordsToSquare(file, rank);
    if (!square) continue;
    if (square === from || square === to) continue;
    if (getPiece(board, square)) {
      return { handled: true, success: false, reason: "Pieces block castling." };
    }
  }

  const kingStep = kingToFile > kingFile ? 1 : kingToFile < kingFile ? -1 : 0;
  if (kingStep !== 0) {
    for (let file = kingFile + kingStep; file !== kingToFile + kingStep; file += kingStep) {
      const square = coordsToSquare(file, rank);
      if (!square) continue;
      if (square === to) continue;
      if (file !== kingToFile && getPiece(board, square)) {
        return { handled: true, success: false, reason: "King path is blocked." };
      }
      if (file === kingToFile) {
        const occupant = getPiece(board, square);
        if (occupant && square !== to) {
          return { handled: true, success: false, reason: "King destination is blocked." };
        }
      }
    }
  } else {
    const occupant = getPiece(board, kingTo);
    // In Chess960 the king can already be on its castling destination square.
    if (occupant && kingTo !== to && kingTo !== from) {
      return { handled: true, success: false, reason: "King destination is blocked." };
    }
  }

  const rookStep = rookToFile > rookFile ? 1 : rookToFile < rookFile ? -1 : 0;
  if (rookStep !== 0) {
    for (let file = rookFile + rookStep; file !== rookToFile + rookStep; file += rookStep) {
      const square = coordsToSquare(file, rank);
      if (!square) continue;
      if (square === from) continue;
      if (file !== rookToFile && getPiece(board, square)) {
        return { handled: true, success: false, reason: "Rook path is blocked." };
      }
      if (file === rookToFile) {
        const occupant = getPiece(board, square);
        if (occupant && square !== from) {
          return { handled: true, success: false, reason: "Rook destination is blocked." };
        }
      }
    }
  } else {
    const occupant = getPiece(board, rookTo);
    if (occupant && rookTo !== from) {
      return { handled: true, success: false, reason: "Rook destination is blocked." };
    }
  }

  const opponentColor = moverColor === "w" ? "b" : "w";
  if (isSquareUnderAttack(board, from, opponentColor)) {
    return { handled: true, success: false, reason: "King is in check." };
  }

  const travelBoard = cloneBoard(board);
  setPiece(travelBoard, from, null);
  setPiece(travelBoard, to, null);
  if (kingStep !== 0) {
    // Validate only transit squares here; final king safety is checked on the final board.
    for (let file = kingFile + kingStep; file !== kingToFile; file += kingStep) {
      const travelSquare = coordsToSquare(file, rank);
      if (!travelSquare) continue;
      setPiece(travelBoard, travelSquare, kingPiece);
      if (isSquareUnderAttack(travelBoard, travelSquare, opponentColor)) {
        return {
          handled: true,
          success: false,
          reason: "King cannot castle through check.",
        };
      }
      setPiece(travelBoard, travelSquare, null);
    }
  }

  const nextBoard = cloneBoard(board);
  setPiece(nextBoard, from, null);
  setPiece(nextBoard, to, null);
  setPiece(nextBoard, kingTo, kingPiece);
  setPiece(nextBoard, rookTo, rookPiece);

  const placement = serializeFenBoard(nextBoard);
  const nextTurn = opponentColor;
  const nextHalfmove = parsed.halfmove + 1;
  const nextFullmove = parsed.fullmove + (moverColor === "b" ? 1 : 0);
  const nextFen = `${placement} ${nextTurn} - - ${nextHalfmove} ${nextFullmove}`;

  if (isSquareUnderAttack(nextBoard, kingTo, opponentColor)) {
    return {
      handled: true,
      success: false,
      reason: "King destination is under attack.",
    };
  }

  let nextChess;
  try {
    nextChess = new Chess(nextFen);
  } catch {
    return { handled: true, success: false, reason: "Illegal castling move." };
  }

  game.chess = nextChess;
  game.chess960.rights[moverColor].k = false;
  game.chess960.rights[moverColor].q = false;

  return {
    handled: true,
    success: true,
    game,
    move: {
      from,
      to: kingTo,
      san: side === "k" ? "O-O" : "O-O-O",
    },
  };
}

function removeFromQueues(socketId) {
  for (const queue of waitingQueues.values()) {
    const idx = queue.indexOf(socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }
}

function removeFromFourPlayerQueues(socketId) {
  for (const queue of fourPlayerQueues.values()) {
    const idx = queue.indexOf(socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }
}

function getFourPlayerQueueKey(timeControl) {
  const initial = Number(timeControl?.initial ?? 300);
  const increment = Number(timeControl?.increment ?? 0);
  return `fourPlayer:${initial}+${increment}`;
}

function getFourPlayerQueue(queueKey) {
  if (!fourPlayerQueues.has(queueKey)) {
    fourPlayerQueues.set(queueKey, []);
  }
  return fourPlayerQueues.get(queueKey);
}

function serializeFourPlayerPlayers(playersByColor) {
  const payload = {};
  FOUR_PLAYER_COLORS.forEach((color) => {
    const player = playersByColor[color];
    payload[color] = {
      userId: player?.userId || null,
      name: player?.name || color.toUpperCase(),
    };
  });
  return payload;
}

function clearFourPlayerGameForPlayers(game) {
  FOUR_PLAYER_COLORS.forEach((color) => {
    const player = game.playersByColor[color];
    if (!player?.socketId) return;
    const sock = io.sockets.sockets.get(player.socketId);
    if (!sock) return;
    sock.leave(game.room);
    sock.data.fourPlayerGameId = null;
    sock.data.inFourPlayerQueue = false;
    sock.data.fourPlayerQueueKey = null;
  });
}

function emitFourPlayerState(game, extra = {}) {
  io.to(game.room).emit("fourPlayerState", {
    gameId: game.id,
    state: game.state,
    players: serializeFourPlayerPlayers(game.playersByColor),
    timeControl: game.timeControl,
    ...extra,
  });
}

function maybeFinishFourPlayerGame(game, reason = "game_over") {
  if (!game?.state?.winner) return false;
  io.to(game.room).emit("fourPlayerGameOver", {
    gameId: game.id,
    reason,
    winner: game.state.winner,
    state: game.state,
    players: serializeFourPlayerPlayers(game.playersByColor),
  });
  clearFourPlayerGameForPlayers(game);
  fourPlayerGames.delete(game.id);
  return true;
}

function forfeitFourPlayerSocket(socket, reason = "player_left") {
  const gameId = socket.data.fourPlayerGameId;
  if (!gameId) return;

  const game = fourPlayerGames.get(gameId);
  socket.data.fourPlayerGameId = null;
  socket.data.inFourPlayerQueue = false;
  socket.data.fourPlayerQueueKey = null;
  if (!game) return;

  const color = game.socketToColor[socket.id];
  if (!color) return;

  delete game.socketToColor[socket.id];
  if (game.playersByColor[color]) {
    game.playersByColor[color].socketId = null;
  }
  socket.leave(game.room);

  game.state = eliminateFourPlayerColor(game.state, color);

  emitFourPlayerState(game, {
    systemMessage: `${color.toUpperCase()} left the game.`,
    forfeitedColor: color,
    forfeitReason: reason,
  });

  maybeFinishFourPlayerGame(game, reason);
}

function queueFourPlayerStatus(socket, queueKey) {
  const queue = getFourPlayerQueue(queueKey);
  let activeCount = 0;
  for (const socketId of queue) {
    const candidate = io.sockets.sockets.get(socketId);
    if (
      candidate &&
      candidate.data.inFourPlayerQueue &&
      !candidate.data.gameId &&
      !candidate.data.fourPlayerGameId &&
      candidate.data.fourPlayerQueueKey === queueKey
    ) {
      activeCount += 1;
    }
  }

  socket.emit("fourPlayerQueued", {
    queueKey,
    waitingCount: activeCount,
  });
}

function clearGameForPlayers(game) {
  const whiteSocket = io.sockets.sockets.get(game.players.white);
  const blackSocket = io.sockets.sockets.get(game.players.black);
  if (whiteSocket) {
    whiteSocket.data.gameId = null;
    whiteSocket.data.inQueue = false;
    whiteSocket.data.queueKey = null;
  }
  if (blackSocket) {
    blackSocket.data.gameId = null;
    blackSocket.data.inQueue = false;
    blackSocket.data.queueKey = null;
  }
}

function emitGameOver(gameId, reason, winner) {
  const game = games.get(gameId);
  if (!game) return;
  io.to(game.room).emit("gameOver", { gameId, reason, winner });
  clearGameForPlayers(game);
  games.delete(gameId);
}

function isCheck(chess) {
  return typeof chess.inCheck === "function" ? chess.inCheck() : chess.in_check();
}

function isCheckmate(chess) {
  return typeof chess.isCheckmate === "function"
    ? chess.isCheckmate()
    : chess.in_checkmate();
}

function isDraw(chess) {
  return typeof chess.isDraw === "function" ? chess.isDraw() : chess.in_draw();
}

function isStalemate(chess) {
  return typeof chess.isStalemate === "function"
    ? chess.isStalemate()
    : chess.in_stalemate();
}

function isInsufficientMaterial(chess) {
  return typeof chess.isInsufficientMaterial === "function"
    ? chess.isInsufficientMaterial()
    : chess.insufficient_material();
}

function isThreefoldRepetition(chess) {
  return typeof chess.isThreefoldRepetition === "function"
    ? chess.isThreefoldRepetition()
    : chess.in_threefold_repetition();
}

io.on("connection", (socket) => {
  const auth = getSocketAuth(socket);
  if (auth?.userId) {
    const userId = normalizeId(auth.userId);
    socket.data.userId = userId;
    socket.data.name = auth.fullName || socket.data.name || "Player";
    registerUserSocket(userId, socket.id);
    socket.join(getUserRoom(userId));

    // Deliver account-level pending challenges when user comes online.
    for (const challenge of pendingChallenges.values()) {
      if (challenge.toUserId === userId) {
        socket.emit("friendChallengeReceived", challenge);
      }
    }
  }

  const safeAck = (ack, payload) => {
    if (typeof ack === "function") {
      ack(payload);
    }
  };

  socket.on("findMatch", ({ name, timeControl, variant } = {}) => {
    if (socket.data.gameId || socket.data.fourPlayerGameId) return;
    socket.data.name = name || "Player";
    socket.data.inFourPlayerQueue = false;
    socket.data.fourPlayerQueueKey = null;
    removeFromFourPlayerQueues(socket.id);
    if (socket.data.inQueue) return;

    const normalizedTimeControl = normalizeTimeControl(timeControl);
    const requestedVariant = normalizeVariant(variant);
    const normalizedVariant =
      requestedVariant === "fourPlayer" ? "standard" : requestedVariant;
    const queueKey = getQueueKey(normalizedTimeControl, normalizedVariant);
    removeFromQueues(socket.id);
    socket.data.inQueue = true;
    socket.data.queueKey = queueKey;

    const queue = getQueue(queueKey);
    let opponentSocket = null;

    while (queue.length > 0 && !opponentSocket) {
      const opponentId = queue.shift();
      const candidate = io.sockets.sockets.get(opponentId);
      if (
        candidate &&
        candidate.id !== socket.id &&
        candidate.data.inQueue &&
        !candidate.data.gameId &&
        !candidate.data.fourPlayerGameId &&
        candidate.data.queueKey === queueKey
      ) {
        opponentSocket = candidate;
      }
    }

    if (opponentSocket) {
      removeFromQueues(socket.id);
      removeFromQueues(opponentSocket.id);
      opponentSocket.data.inQueue = false;
      opponentSocket.data.queueKey = null;
      socket.data.inQueue = false;
      socket.data.queueKey = null;

      const gameId = crypto.randomBytes(8).toString("hex");
      const room = `game:${gameId}`;
      const initialPosition = createInitialPosition(normalizedVariant);
      const chess =
        initialPosition.fen === "start"
          ? new Chess()
          : new Chess(initialPosition.fen);
      const white = Math.random() < 0.5 ? socket.id : opponentSocket.id;
      const black = white === socket.id ? opponentSocket.id : socket.id;

      games.set(gameId, {
        room,
        chess,
        players: { white, black },
        timeControl: normalizedTimeControl,
        variant: normalizedVariant,
        chess960: initialPosition.chess960,
      });

      socket.data.gameId = gameId;
      opponentSocket.data.gameId = gameId;

      socket.join(room);
      opponentSocket.join(room);

      io.to(socket.id).emit("matchFound", {
        gameId,
        color: socket.id === white ? "w" : "b",
        fen: chess.fen(),
        opponentName: opponentSocket.data.name || "Opponent",
        timeControl: normalizedTimeControl,
        variant: normalizedVariant,
      });

      io.to(opponentSocket.id).emit("matchFound", {
        gameId,
        color: opponentSocket.id === white ? "w" : "b",
        fen: chess.fen(),
        opponentName: socket.data.name || "Opponent",
        timeControl: normalizedTimeControl,
        variant: normalizedVariant,
      });
    } else {
      if (!queue.includes(socket.id)) {
        queue.push(socket.id);
      }
      socket.emit("queued", {
        timeControl: normalizedTimeControl,
        variant: normalizedVariant,
      });
    }
  });

  socket.on("findFourPlayerMatch", ({ name, timeControl } = {}) => {
    if (socket.data.gameId || socket.data.fourPlayerGameId) return;
    if (socket.data.inFourPlayerQueue) return;

    socket.data.name = name || socket.data.name || "Player";
    socket.data.inQueue = false;
    socket.data.queueKey = null;
    removeFromQueues(socket.id);

    const normalizedTimeControl = normalizeTimeControl(timeControl);
    const queueKey = getFourPlayerQueueKey(normalizedTimeControl);

    removeFromFourPlayerQueues(socket.id);
    socket.data.inFourPlayerQueue = true;
    socket.data.fourPlayerQueueKey = queueKey;

    const queue = getFourPlayerQueue(queueKey);
    if (!queue.includes(socket.id)) {
      queue.push(socket.id);
    }

    const validQueue = [];
    for (const queuedId of queue) {
      const candidate = io.sockets.sockets.get(queuedId);
      if (
        candidate &&
        candidate.data.inFourPlayerQueue &&
        !candidate.data.gameId &&
        !candidate.data.fourPlayerGameId &&
        candidate.data.fourPlayerQueueKey === queueKey
      ) {
        validQueue.push(queuedId);
      }
    }
    fourPlayerQueues.set(queueKey, validQueue);

    if (validQueue.length < 4) {
      queueFourPlayerStatus(socket, queueKey);
      return;
    }

    const selectedSocketIds = validQueue.slice(0, 4);
    const remaining = validQueue.slice(4);
    fourPlayerQueues.set(queueKey, remaining);

    const selectedSockets = selectedSocketIds
      .map((socketId) => io.sockets.sockets.get(socketId))
      .filter(Boolean);

    if (selectedSockets.length < 4) {
      const repairedQueue = [...remaining, ...selectedSockets.map((s) => s.id)];
      fourPlayerQueues.set(queueKey, repairedQueue);
      selectedSockets.forEach((s) => queueFourPlayerStatus(s, queueKey));
      return;
    }

    const gameId = crypto.randomBytes(8).toString("hex");
    const room = `four-player:${gameId}`;
    const shuffledColors = [...FOUR_PLAYER_COLORS].sort(() => Math.random() - 0.5);
    const playersByColor = {};
    const socketToColor = {};

    selectedSockets.forEach((playerSocket, index) => {
      const color = shuffledColors[index];
      playersByColor[color] = {
        socketId: playerSocket.id,
        userId: normalizeId(playerSocket.data.userId),
        name: playerSocket.data.name || "Player",
      };
      socketToColor[playerSocket.id] = color;

      playerSocket.data.fourPlayerGameId = gameId;
      playerSocket.data.inFourPlayerQueue = false;
      playerSocket.data.fourPlayerQueueKey = null;
      playerSocket.join(room);
    });

    const game = {
      id: gameId,
      room,
      state: createInitialFourPlayerState(),
      playersByColor,
      socketToColor,
      timeControl: normalizedTimeControl,
    };
    fourPlayerGames.set(gameId, game);

    const playersPayload = serializeFourPlayerPlayers(playersByColor);
    selectedSockets.forEach((playerSocket) => {
      io.to(playerSocket.id).emit("fourPlayerMatchFound", {
        gameId,
        color: socketToColor[playerSocket.id],
        state: game.state,
        players: playersPayload,
        timeControl: normalizedTimeControl,
      });
    });
  });

  socket.on("cancelFourPlayerFind", () => {
    socket.data.inFourPlayerQueue = false;
    socket.data.fourPlayerQueueKey = null;
    removeFromFourPlayerQueues(socket.id);
    socket.emit("fourPlayerQueueCancelled");
  });

  socket.on("fourPlayerMove", ({ gameId, from, to } = {}) => {
    const resolvedGameId = gameId || socket.data.fourPlayerGameId;
    if (!resolvedGameId) return;

    const game = fourPlayerGames.get(resolvedGameId);
    if (!game) return;

    const moverColor = game.socketToColor[socket.id];
    if (!moverColor) {
      socket.emit("fourPlayerMoveRejected", { reason: "Not part of this game." });
      return;
    }

    const normalizedFrom = normalizeFourPlayerSquare(from);
    const normalizedTo = normalizeFourPlayerSquare(to);
    if (!normalizedFrom || !normalizedTo) {
      socket.emit("fourPlayerMoveRejected", { reason: "Invalid move payload." });
      return;
    }

    const result = applyFourPlayerMove(
      game.state,
      normalizedFrom,
      normalizedTo,
      moverColor,
    );
    if (!result.ok) {
      socket.emit("fourPlayerMoveRejected", {
        reason: result.reason || "Illegal move.",
      });
      return;
    }

    game.state = result.state;
    emitFourPlayerState(game, {
      lastMove: result.move,
      moverColor,
    });
    maybeFinishFourPlayerGame(game, "king_capture");
  });

  socket.on("fourPlayerLeaveGame", ({ gameId } = {}) => {
    const resolvedGameId = gameId || socket.data.fourPlayerGameId;
    if (!resolvedGameId) return;
    if (socket.data.fourPlayerGameId !== resolvedGameId) return;
    forfeitFourPlayerSocket(socket, "player_left");
  });

  socket.on("sendFriendChallenge", async (payload = {}, ack) => {
    try {
      const fromUserId = normalizeId(socket.data.userId);
      const fromName = socket.data.name || "Player";
      const toUserId = normalizeId(payload.toUserId);
      const toName = String(payload.toName || "Friend");

      if (!fromUserId) {
        safeAck(ack, { success: false, error: "Not authenticated." });
        return;
      }

      if (!toUserId) {
        safeAck(ack, { success: false, error: "Invalid friend target." });
        return;
      }

      if (fromUserId === toUserId) {
        safeAck(ack, { success: false, error: "You cannot challenge yourself." });
        return;
      }

      if (socket.data.gameId || socket.data.fourPlayerGameId) {
        safeAck(ack, { success: false, error: "You are already in a game." });
        return;
      }

      const isFriend = await Friend.findOne({
        userId: fromUserId,
        friendId: toUserId,
      })
        .select("_id")
        .lean();

      if (!isFriend) {
        safeAck(ack, {
          success: false,
          error: "Challenge failed: player is not in your friends list.",
        });
        return;
      }

      const challengeId = crypto.randomBytes(12).toString("hex");
      const challenge = {
        id: challengeId,
        fromUserId,
        fromName,
        fromRating:
          Number.isFinite(Number(payload.fromRating)) &&
          Number(payload.fromRating) > 0
            ? Number(payload.fromRating)
            : 1200,
        toUserId,
        toName,
        gameType: normalizeGameType(payload.gameType),
        rated: !!payload.rated,
        playAs: normalizePlayAs(payload.playAs),
        timeControl: normalizeTimeControl(payload.timeControl),
        createdAt: Date.now(),
        fromSocketId: socket.id,
      };

      pendingChallenges.set(challengeId, challenge);

      io.to(getUserRoom(toUserId)).emit("friendChallengeReceived", challenge);
      io.to(getUserRoom(fromUserId)).emit("friendChallengeSent", {
        challengeId,
        toUserId,
        toName,
      });

      safeAck(ack, { success: true, challengeId, challenge });
    } catch (error) {
      console.error("sendFriendChallenge error:", error);
      safeAck(ack, { success: false, error: "Failed to send challenge." });
    }
  });

  socket.on("respondFriendChallenge", (payload = {}, ack) => {
    try {
      const userId = normalizeId(socket.data.userId);
      const challengeId = String(payload.challengeId || "");
      const accept = payload.accept === true;

      if (!userId) {
        safeAck(ack, { success: false, error: "Not authenticated." });
        return;
      }

      if (!challengeId || !pendingChallenges.has(challengeId)) {
        safeAck(ack, { success: false, error: "Challenge no longer available." });
        return;
      }

      const challenge = pendingChallenges.get(challengeId);
      if (challenge.toUserId !== userId) {
        safeAck(ack, { success: false, error: "Not authorized for challenge." });
        return;
      }

      pendingChallenges.delete(challengeId);

      if (!accept) {
        io.to(getUserRoom(challenge.fromUserId)).emit("friendChallengeDeclined", {
          challengeId,
          byUserId: userId,
          byName: socket.data.name || "Friend",
        });
        safeAck(ack, { success: true, status: "declined" });
        return;
      }

      const challengerSocket = getSocketForUser(
        io,
        challenge.fromUserId,
        challenge.fromSocketId,
      );
      const receiverSocket = socket;

      if (!challengerSocket) {
        io.to(getUserRoom(userId)).emit("friendChallengeError", {
          challengeId,
          error: "Challenger went offline.",
        });
        safeAck(ack, { success: false, error: "Challenger is offline." });
        return;
      }

      if (
        challengerSocket.data.gameId ||
        challengerSocket.data.fourPlayerGameId ||
        receiverSocket.data.gameId ||
        receiverSocket.data.fourPlayerGameId
      ) {
        io.to(getUserRoom(challenge.fromUserId)).emit("friendChallengeDeclined", {
          challengeId,
          byUserId: userId,
          byName: "System",
          reason: "One of the players is already in a game.",
        });
        safeAck(ack, {
          success: false,
          error: "One of the players is already in a game.",
        });
        return;
      }

      removeFromQueues(challengerSocket.id);
      removeFromQueues(receiverSocket.id);
      removeFromFourPlayerQueues(challengerSocket.id);
      removeFromFourPlayerQueues(receiverSocket.id);
      challengerSocket.data.inQueue = false;
      challengerSocket.data.queueKey = null;
      challengerSocket.data.inFourPlayerQueue = false;
      challengerSocket.data.fourPlayerQueueKey = null;
      receiverSocket.data.inQueue = false;
      receiverSocket.data.queueKey = null;
      receiverSocket.data.inFourPlayerQueue = false;
      receiverSocket.data.fourPlayerQueueKey = null;

      const gameId = crypto.randomBytes(8).toString("hex");
      const room = `game:${gameId}`;
      const chess = new Chess();
      const normalizedTimeControl = normalizeTimeControl(challenge.timeControl);

      let whiteSocketId = challengerSocket.id;
      let blackSocketId = receiverSocket.id;
      if (challenge.playAs === "black") {
        whiteSocketId = receiverSocket.id;
        blackSocketId = challengerSocket.id;
      } else if (challenge.playAs === "random") {
        if (Math.random() < 0.5) {
          whiteSocketId = receiverSocket.id;
          blackSocketId = challengerSocket.id;
        }
      }

      games.set(gameId, {
        room,
        chess,
        players: { white: whiteSocketId, black: blackSocketId },
        timeControl: normalizedTimeControl,
      });

      challengerSocket.data.gameId = gameId;
      receiverSocket.data.gameId = gameId;
      challengerSocket.join(room);
      receiverSocket.join(room);

      const challengerColor = challengerSocket.id === whiteSocketId ? "w" : "b";
      const receiverColor = receiverSocket.id === whiteSocketId ? "w" : "b";

      const challengerPayload = {
        challengeId,
        gameId,
        color: challengerColor,
        fen: chess.fen(),
        opponentUserId: challenge.toUserId,
        opponentName: challenge.toName || receiverSocket.data.name || "Friend",
        timeControl: normalizedTimeControl,
        gameType: challenge.gameType,
        rated: challenge.rated,
      };

      const receiverPayload = {
        challengeId,
        gameId,
        color: receiverColor,
        fen: chess.fen(),
        opponentUserId: challenge.fromUserId,
        opponentName:
          challenge.fromName || challengerSocket.data.name || "Friend",
        timeControl: normalizedTimeControl,
        gameType: challenge.gameType,
        rated: challenge.rated,
      };

      io.to(challengerSocket.id).emit("friendGameStarted", challengerPayload);
      io.to(receiverSocket.id).emit("friendGameStarted", receiverPayload);

      safeAck(ack, { success: true, status: "accepted", gameId });
    } catch (error) {
      console.error("respondFriendChallenge error:", error);
      safeAck(ack, { success: false, error: "Failed to process challenge." });
    }
  });

  socket.on("cancelFind", () => {
    socket.data.inQueue = false;
    socket.data.queueKey = null;
    removeFromQueues(socket.id);
    socket.emit("queueCancelled");
  });

  socket.on("makeMove", ({ gameId, from, to, promotion }) => {
    const game = games.get(gameId);
    if (!game) return;

    const { room, players } = game;
    const chess = game.chess;
    const moverColor =
      socket.id === players.white
        ? "w"
        : socket.id === players.black
          ? "b"
          : null;

    if (!moverColor) return;
    if (chess.turn() !== moverColor) {
      return socket.emit("moveRejected", { reason: "Not your turn" });
    }

    const castlingResult = tryHandleChess960Castling(game, moverColor, from, to);
    if (castlingResult.handled) {
      if (!castlingResult.success) {
        return socket.emit("moveRejected", {
          reason: castlingResult.reason || "Illegal castling move",
        });
      }

      const nextChess = castlingResult.game.chess;
      io.to(room).emit("moveApplied", {
        gameId,
        move: castlingResult.move,
        fen: nextChess.fen(),
        turn: nextChess.turn(),
        isChess960Castle: true,
        isCheck: isCheck(nextChess),
        isCheckmate: isCheckmate(nextChess),
        isDraw: isDraw(nextChess),
        isStalemate: isStalemate(nextChess),
      });

      if (isCheckmate(nextChess)) {
        const winner = nextChess.turn() === "w" ? "b" : "w";
        emitGameOver(gameId, "checkmate", winner);
      } else if (
        isDraw(nextChess) ||
        isStalemate(nextChess) ||
        isInsufficientMaterial(nextChess) ||
        isThreefoldRepetition(nextChess)
      ) {
        emitGameOver(gameId, "draw", null);
      }
      return;
    }

    const move = chess.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      return socket.emit("moveRejected", { reason: "Illegal move" });
    }

    updateChess960RightsForNormalMove(game, move, moverColor);

    io.to(room).emit("moveApplied", {
      gameId,
      move,
      fen: chess.fen(),
      turn: chess.turn(),
      isCheck: isCheck(chess),
      isCheckmate: isCheckmate(chess),
      isDraw: isDraw(chess),
      isStalemate: isStalemate(chess),
    });

    if (isCheckmate(chess)) {
      const winner = chess.turn() === "w" ? "b" : "w";
      emitGameOver(gameId, "checkmate", winner);
    } else if (
      isDraw(chess) ||
      isStalemate(chess) ||
      isInsufficientMaterial(chess) ||
      isThreefoldRepetition(chess)
    ) {
      emitGameOver(gameId, "draw", null);
    }
  });

  socket.on("resign", ({ gameId } = {}) => {
    const game = games.get(gameId || socket.data.gameId);
    if (!game) return;
    const winner =
      socket.id === game.players.white
        ? "b"
        : socket.id === game.players.black
          ? "w"
          : null;
    if (!winner) return;
    emitGameOver(gameId || socket.data.gameId, "resign", winner);
  });

  socket.on("timeout", ({ gameId } = {}) => {
    const game = games.get(gameId || socket.data.gameId);
    if (!game) return;
    const winner =
      socket.id === game.players.white
        ? "b"
        : socket.id === game.players.black
          ? "w"
          : null;
    if (!winner) return;
    emitGameOver(gameId || socket.data.gameId, "timeout", winner);
  });

  socket.on("leaveGame", ({ gameId } = {}) => {
    const game = games.get(gameId || socket.data.gameId);
    if (!game) return;
    const winner =
      socket.id === game.players.white
        ? "b"
        : socket.id === game.players.black
          ? "w"
          : null;
    if (!winner) return;
    emitGameOver(gameId || socket.data.gameId, "opponent_left", winner);
  });

  socket.on("disconnect", () => {
    socket.data.inQueue = false;
    socket.data.queueKey = null;
    socket.data.inFourPlayerQueue = false;
    socket.data.fourPlayerQueueKey = null;
    removeFromQueues(socket.id);
    removeFromFourPlayerQueues(socket.id);

    if (socket.data.fourPlayerGameId) {
      forfeitFourPlayerSocket(socket, "disconnect");
    }

    const userId = normalizeId(socket.data.userId);
    unregisterUserSocket(userId, socket.id);

    if (userId && !userSockets.has(userId)) {
      for (const [challengeId, challenge] of pendingChallenges.entries()) {
        if (challenge.fromUserId === userId) {
          pendingChallenges.delete(challengeId);
          io.to(getUserRoom(challenge.toUserId)).emit("friendChallengeCancelled", {
            challengeId,
            reason: "Challenger disconnected.",
          });
        }
      }
    }

    const gameId = socket.data.gameId;
    if (gameId) {
      const game = games.get(gameId);
      if (game) {
        const winner =
          socket.id === game.players.white
            ? "b"
            : socket.id === game.players.black
              ? "w"
              : null;
        if (winner) emitGameOver(gameId, "opponent_left", winner);
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
