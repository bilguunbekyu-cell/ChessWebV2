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

function removeFromQueues(socketId) {
  for (const queue of waitingQueues.values()) {
    const idx = queue.indexOf(socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }
}

function clearGameForPlayers(game) {
  const whiteSocket = io.sockets.sockets.get(game.players.white);
  const blackSocket = io.sockets.sockets.get(game.players.black);
  if (whiteSocket) whiteSocket.data.gameId = null;
  if (blackSocket) blackSocket.data.gameId = null;
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
  socket.on("findMatch", ({ name, timeControl } = {}) => {
    if (socket.data.gameId) return;
    socket.data.name = name || "Player";

    if (socket.data.inQueue) return;
    socket.data.inQueue = true;

    const queueKey = getQueueKey(timeControl);
    socket.data.queueKey = queueKey;

    const queue = getQueue(queueKey);
    let opponentSocket = null;

    while (queue.length > 0 && !opponentSocket) {
      const opponentId = queue.shift();
      const candidate = io.sockets.sockets.get(opponentId);
      if (candidate && candidate.id !== socket.id) {
        opponentSocket = candidate;
      }
    }

    if (opponentSocket) {
      opponentSocket.data.inQueue = false;
      socket.data.inQueue = false;

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
      queue.push(socket.id);
      socket.emit("queued", { timeControl });
    }
  });

  socket.on("cancelFind", () => {
    socket.data.inQueue = false;
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
    removeFromQueues(socket.id);
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
