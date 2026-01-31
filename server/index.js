import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Chess } from "chess.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from parent directory
dotenv.config({ path: join(__dirname, "..", ".env") });

const app = express();
const PORT = 3001;
const LICHESS_API_TOKEN = process.env.LICHESS_API_TOKEN;

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
    banned: { type: Boolean, default: false },
    bannedAt: { type: Date, default: null },
    banReason: { type: String, default: "" },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    puzzleElo: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

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

// Puzzle Schema
const PuzzleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    themes: { type: [String], default: [] },
    description: { type: String, default: "" },
    icon: { type: String, default: "🧩" },
    fen: { type: String, required: true },
    solution: { type: [String], required: true },
    rating: { type: Number, default: 1200 },
    isWhiteToMove: { type: Boolean, required: true },
    timesPlayed: { type: Number, default: 0 },
    timesSolved: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Puzzle = mongoose.models.Puzzle || mongoose.model("Puzzle", PuzzleSchema);

const isUciMove = (move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);

const uciToSanMoves = (fen, moves) => {
  if (!fen || !Array.isArray(moves) || moves.length === 0) return moves;
  if (!moves.every(isUciMove)) return moves;

  const chess = new Chess(fen);
  const sanMoves = [];
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    if (!move) return moves;
    sanMoves.push(move.san);
  }
  return sanMoves;
};

// Seed puzzles on startup
async function seedPuzzles() {
  const count = await Puzzle.countDocuments();
  if (count > 0) return; // Already seeded

  const initialPuzzles = [
    {
      title: "Mate in 2",
      difficulty: "Easy",
      themes: ["Back Rank", "Queen Sac"],
      description: "Find the winning move for White.",
      icon: "🧩",
      fen: "6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1",
      solution: ["Qb8+", "Qxf8#"],
      rating: 1100,
      isWhiteToMove: true,
    },
    {
      title: "Scholar's Mate",
      difficulty: "Easy",
      themes: ["Checkmate", "Quick Mate"],
      description: "White to move and checkmate.",
      icon: "🎓",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      solution: ["Qxf7#"],
      rating: 800,
      isWhiteToMove: true,
    },
    {
      title: "Endgame Magic",
      difficulty: "Hard",
      themes: ["Promotion", "Opposition"],
      description: "White to move and promote.",
      icon: "♟️",
      fen: "8/8/8/8/8/4k3/4P3/4K3 w - - 0 1",
      solution: ["Kf1"],
      rating: 1600,
      isWhiteToMove: true,
    },
    {
      title: "Pin to Win",
      difficulty: "Medium",
      themes: ["Pin", "Skewer"],
      description: "Exploit the pinned piece.",
      icon: "📍",
      fen: "r2qkb1r/ppp2ppp/2n1bn2/4p3/4P3/1PN2N2/PBPP1PPP/R2QKB1R w KQkq - 0 6",
      solution: ["Bb5"],
      rating: 1350,
      isWhiteToMove: true,
    },
    {
      title: "Greek Gift",
      difficulty: "Hard",
      themes: ["Sacrifice", "King Hunt"],
      description: "Classic bishop sacrifice on h7.",
      icon: "🎁",
      fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 6",
      solution: ["Bxh7+"],
      rating: 1550,
      isWhiteToMove: true,
    },
    {
      title: "Smothered Mate",
      difficulty: "Hard",
      themes: ["Checkmate", "Knight"],
      description: "Beautiful mate with the knight.",
      icon: "⚔️",
      fen: "r1b1kb1r/pppp1Npp/5n2/8/3nq3/8/PPPPBPPP/RNBQK2R b KQkq - 0 1",
      solution: ["Qxe2#"],
      rating: 1500,
      isWhiteToMove: false,
    },
    {
      title: "Fork Attack",
      difficulty: "Easy",
      themes: ["Fork", "Knight"],
      description: "Win material with a knight fork.",
      icon: "🐴",
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      solution: ["Ng5"],
      rating: 1000,
      isWhiteToMove: true,
    },
    {
      title: "Anastasia's Mate",
      difficulty: "Hard",
      themes: ["Checkmate", "Sacrifice"],
      description: "Find the beautiful checkmate pattern.",
      icon: "👑",
      fen: "5rk1/1b3ppp/8/2RN4/8/8/5PPP/6K1 w - - 0 1",
      solution: ["Ne7+", "Kh8", "Rxh7#"],
      rating: 1700,
      isWhiteToMove: true,
    },
    {
      title: "Back Rank Mate",
      difficulty: "Medium",
      themes: ["Back Rank", "Checkmate"],
      description: "Exploit the weak back rank.",
      icon: "🏰",
      fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      solution: ["Re8#"],
      rating: 1200,
      isWhiteToMove: true,
    },
    {
      title: "Discovered Attack",
      difficulty: "Medium",
      themes: ["Discovered Attack", "Tactics"],
      description: "Use a discovered attack to win material.",
      icon: "💡",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      solution: ["Ng5"],
      rating: 1300,
      isWhiteToMove: true,
    },
  ];

  await Puzzle.insertMany(initialPuzzles);
  console.log("✅ Puzzles seeded successfully");
}

// Run seed after DB connection
mongoose.connection.once("open", () => {
  seedPuzzles().catch(console.error);
});

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

// Admin Auth Middleware
const adminAuthMiddleware = (req, res, next) => {
  const adminToken = req.cookies.adminToken;
  if (!adminToken) {
    return res.status(401).json({ error: "Not authenticated as admin" });
  }
  try {
    const parsed = JSON.parse(adminToken);
    if (!parsed.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    req.admin = parsed;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid admin token" });
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

    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({
        error: "Your account has been banned",
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
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

// Get all puzzles
app.get("/api/puzzles", async (req, res) => {
  try {
    const puzzles = await Puzzle.find().sort({ rating: 1 });
    res.json(puzzles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch puzzles" });
  }
});

// Get single puzzle by ID
app.get("/api/puzzles/:id", async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    res.json(puzzle);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch puzzle" });
  }
});

// Update puzzle stats (timesPlayed, timesSolved)
app.patch("/api/puzzles/:id/stats", async (req, res) => {
  try {
    const { solved } = req.body;
    const update = { $inc: { timesPlayed: 1 } };
    if (solved) {
      update.$inc.timesSolved = 1;
    }
    const puzzle = await Puzzle.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    res.json(puzzle);
  } catch (error) {
    res.status(500).json({ error: "Failed to update puzzle stats" });
  }
});

// Puzzle solve: increment stats and award puzzle elo
app.post("/api/puzzles/:id/solve", authMiddleware, async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }

    // Stats
    await Puzzle.findByIdAndUpdate(puzzle._id, {
      $inc: { timesPlayed: 1, timesSolved: 1 },
    });

    // Elo gain by difficulty
    const diff = puzzle.difficulty || "Medium";
    const gain = diff === "Hard" ? 15 : diff === "Easy" ? 5 : 10;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.puzzleElo = (user.puzzleElo || 0) + gain;
    await user.save();

    res.json({
      success: true,
      puzzleElo: user.puzzleElo,
      gain,
      difficulty: diff,
    });
  } catch (error) {
    console.error("Solve error:", error);
    res.status(500).json({ error: "Failed to record puzzle solve" });
  }
});

// Admin: Create puzzle
app.post("/api/admin/puzzles", adminAuthMiddleware, async (req, res) => {
  try {
    const {
      title,
      difficulty,
      themes,
      description,
      icon,
      fen,
      solution,
      rating,
      isWhiteToMove,
    } = req.body;
    const puzzle = new Puzzle({
      title,
      difficulty,
      themes: themes || [],
      description: description || "",
      icon: icon || "🧩",
      fen,
      solution,
      rating: rating || 1200,
      isWhiteToMove,
    });
    await puzzle.save();
    res.status(201).json(puzzle);
  } catch (error) {
    res.status(500).json({ error: "Failed to create puzzle" });
  }
});

// Admin: Update puzzle
app.put("/api/admin/puzzles/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const {
      title,
      difficulty,
      themes,
      description,
      icon,
      fen,
      solution,
      rating,
      isWhiteToMove,
    } = req.body;
    const puzzle = await Puzzle.findByIdAndUpdate(
      req.params.id,
      {
        title,
        difficulty,
        themes,
        description,
        icon,
        fen,
        solution,
        rating,
        isWhiteToMove,
      },
      { new: true },
    );
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    res.json(puzzle);
  } catch (error) {
    res.status(500).json({ error: "Failed to update puzzle" });
  }
});

// Admin: Delete puzzle
app.delete("/api/admin/puzzles/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const puzzle = await Puzzle.findByIdAndDelete(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    res.json({ success: true, message: "Puzzle deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete puzzle" });
  }
});

// Get current user (check auth)
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is banned - if so, clear cookie and kick them out
    if (user.banned) {
      res.clearCookie("authToken", { path: "/" });
      return res.status(403).json({
        error: "Your account has been banned",
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
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

// =====================
// ADMIN ROUTES
// =====================

// Admin Login (No registration - admins created via seed script)
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tokenData = {
      adminId: admin._id,
      email: admin.email,
      username: admin.username,
      isAdmin: true,
    };

    res.cookie("adminToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/",
    });

    res.json({
      success: true,
      message: "Admin login successful",
      admin: { id: admin._id, email: admin.email, username: admin.username },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin Logout
app.post("/api/admin/logout", (req, res) => {
  res.cookie("adminToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.json({ success: true, message: "Admin logged out successfully" });
});

// Get current admin (check auth)
app.get("/api/admin/me", adminAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({ admin });
  } catch (err) {
    console.error("Get admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get all users
app.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.json({ users, total });
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get single user
app.get("/api/admin/users/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Admin get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get user's games
app.get("/api/admin/users/:id/games", adminAuthMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const games = await History.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await History.countDocuments({ userId: req.params.id });

    res.json({ games, total });
  } catch (err) {
    console.error("Admin get user games error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Delete user
app.delete("/api/admin/users/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Also delete user's game history
    await History.deleteMany({ userId: req.params.id });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Ban/Unban user
app.patch("/api/admin/users/:id/ban", adminAuthMiddleware, async (req, res) => {
  try {
    const { banned, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.banned = banned;
    user.bannedAt = banned ? new Date() : null;
    user.banReason = banned ? reason || "No reason provided" : "";
    await user.save();

    res.json({
      success: true,
      message: banned
        ? "User banned successfully"
        : "User unbanned successfully",
      user: {
        _id: user._id,
        banned: user.banned,
        bannedAt: user.bannedAt,
        banReason: user.banReason,
      },
    });
  } catch (err) {
    console.error("Admin ban user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get all games
app.get("/api/admin/games", adminAuthMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const games = await History.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await History.countDocuments();

    res.json({ games, total });
  } catch (err) {
    console.error("Admin get games error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get single game by ID
app.get("/api/admin/games/:gameId", adminAuthMiddleware, async (req, res) => {
  try {
    const game = await History.findById(req.params.gameId)
      .populate("userId", "fullName email")
      .lean();

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ game });
  } catch (err) {
    console.error("Admin get single game error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: Get stats
app.get("/api/admin/stats", adminAuthMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGames = await History.countDocuments();

    // Users registered in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Games played in last 7 days
    const gamesThisWeek = await History.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    res.json({
      totalUsers,
      totalGames,
      newUsersThisWeek,
      gamesThisWeek,
    });
  } catch (err) {
    console.error("Admin get stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
