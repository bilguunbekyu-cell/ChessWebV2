import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
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
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
