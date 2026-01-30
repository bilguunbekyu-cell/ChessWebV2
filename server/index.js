import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from parent directory
dotenv.config({ path: join(__dirname, "..", ".env") });

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

// MongoDB Connection
const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error("MONGODB_URL is not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// User Schema
const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    rating: { type: Number, default: 1200 },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Game History Schema
const HistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // PGN Headers
    event: { type: String, default: "ChessFlow Game" },
    site: { type: String, default: "ChessFlow" },
    date: { type: String }, // "2026.01.29"
    round: { type: String, default: "-" },
    white: { type: String, required: true },
    black: { type: String, required: true },
    result: { type: String, required: true }, // "1-0", "0-1", "1/2-1/2"

    // Position
    currentPosition: { type: String }, // FEN of final position

    // Time
    timeControl: { type: String }, // e.g., "300" or "300+5"
    utcDate: { type: String },
    utcTime: { type: String },
    startTime: { type: String },
    endDate: { type: String },
    endTime: { type: String },

    // Ratings
    whiteElo: { type: Number, default: 1200 },
    blackElo: { type: Number, default: 1200 },

    // Game info
    timezone: { type: String, default: "UTC" },
    eco: { type: String, default: "" },
    ecoUrl: { type: String, default: "" },
    link: { type: String, default: "" },
    termination: { type: String }, // "White won by checkmate"
    whiteUrl: { type: String, default: "" },
    whiteCountry: { type: String, default: "" },
    whiteTitle: { type: String, default: "" },
    blackUrl: { type: String, default: "" },
    blackCountry: { type: String, default: "" },
    blackTitle: { type: String, default: "" },

    // Moves
    moves: { type: [String], default: [] },
    moveText: { type: String, default: "" }, // raw PGN movetext (all moves)
    pgn: { type: String }, // Full PGN with headers
    analysis: [
      {
        ply: { type: Number, required: true },
        cp: { type: Number },
        mate: { type: Number },
      },
    ],
    moveTimes: { type: [Number], default: [] }, // ms per move (ply)

    // Additional metadata
    playAs: { type: String, enum: ["white", "black"], required: true },
    opponent: { type: String, default: "Stockfish" },
    opponentLevel: { type: Number },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

const History =
  mongoose.models.History || mongoose.model("History", HistorySchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authToken = req.cookies.authToken;
  if (!authToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    req.user = JSON.parse(authToken);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Routes

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    // Auto login after register
    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.json({
      success: true,
      message: "User registered successfully",
      user: { id: user._id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user._id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Save game history
app.post("/api/history", authMiddleware, async (req, res) => {
  try {
    const {
      // PGN Headers
      event = "ChessFlow Game",
      site = "ChessFlow",
      date,
      round = "-",
      white,
      black,
      result,
      currentPosition,
      timeControl,
      utcDate,
      utcTime,
      startTime,
      endDate,
      endTime,
      whiteElo = 1200,
      blackElo = 1200,
      timezone = "UTC",
      eco = "",
      ecoUrl = "",
      termination,
      link = "",
      whiteUrl = "",
      whiteCountry = "",
      whiteTitle = "",
      blackUrl = "",
      blackCountry = "",
      blackTitle = "",
      moves = [],
      moveText = "",
      pgn,
      playAs,
      opponent = "Stockfish",
      opponentLevel,
      durationMs,
      analysis = [],
      moveTimes = [],
    } = req.body;

    if (!result || !playAs || !white || !black) {
      return res
        .status(400)
        .json({ error: "result, playAs, white, and black are required" });
    }

    const history = await History.create({
      userId: req.user.userId,
      event,
      site,
      date,
      round,
      white,
      black,
      result,
      currentPosition,
      timeControl,
      utcDate,
      utcTime,
      startTime,
      endDate,
      endTime,
      whiteElo,
      blackElo,
      timezone,
      eco,
      ecoUrl,
      link,
      termination,
      whiteUrl,
      whiteCountry,
      whiteTitle,
      blackUrl,
      blackCountry,
      blackTitle,
      moves,
      moveText,
      pgn,
      playAs,
      opponent,
      opponentLevel,
      durationMs,
      analysis,
      moveTimes,
    });

    res.json({ success: true, historyId: history._id });
  } catch (err) {
    console.error("History save error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get game history for current user
app.get("/api/history", authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const games = await History.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await History.countDocuments({ userId: req.user.userId });

    res.json({ games, total });
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single game by ID
app.get("/api/history/:id", authMiddleware, async (req, res) => {
  try {
    const game = await History.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).lean();

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ game });
  } catch (err) {
    console.error("Get game error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// Get current user (check auth)
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update profile
app.put("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, avatar },
      { new: true },
    ).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
