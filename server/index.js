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
const games = new Map(); // gameId -> { room, chess, players, timeControl }
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

function getQueueKey(timeControl) {
  const initial = Number(timeControl?.initial ?? 300);
  const increment = Number(timeControl?.increment ?? 0);
  return `${initial}+${increment}`;
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
  return !!socket && !socket.data?.gameId;
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

function removeFromQueues(socketId) {
  for (const queue of waitingQueues.values()) {
    const idx = queue.indexOf(socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }
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

  socket.on("findMatch", ({ name, timeControl } = {}) => {
    if (socket.data.gameId) return;
    socket.data.name = name || "Player";
    if (socket.data.inQueue) return;

    const queueKey = getQueueKey(timeControl);
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
      const chess = new Chess();
      const white = Math.random() < 0.5 ? socket.id : opponentSocket.id;
      const black = white === socket.id ? opponentSocket.id : socket.id;

      games.set(gameId, {
        room,
        chess,
        players: { white, black },
        timeControl: {
          initial: Number(timeControl?.initial ?? 300),
          increment: Number(timeControl?.increment ?? 0),
        },
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
        timeControl: {
          initial: Number(timeControl?.initial ?? 300),
          increment: Number(timeControl?.increment ?? 0),
        },
      });

      io.to(opponentSocket.id).emit("matchFound", {
        gameId,
        color: opponentSocket.id === white ? "w" : "b",
        fen: chess.fen(),
        opponentName: socket.data.name || "Opponent",
        timeControl: {
          initial: Number(timeControl?.initial ?? 300),
          increment: Number(timeControl?.increment ?? 0),
        },
      });
    } else {
      if (!queue.includes(socket.id)) {
        queue.push(socket.id);
      }
      socket.emit("queued", { timeControl });
    }
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

      if (socket.data.gameId) {
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

      if (challengerSocket.data.gameId || receiverSocket.data.gameId) {
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
      challengerSocket.data.inQueue = false;
      challengerSocket.data.queueKey = null;
      receiverSocket.data.inQueue = false;
      receiverSocket.data.queueKey = null;

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

    const { chess, room, players } = game;
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

    const move = chess.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      return socket.emit("moveRejected", { reason: "Illegal move" });
    }

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
    removeFromQueues(socket.id);
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
