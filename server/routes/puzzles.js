import { Router } from "express";
import { Puzzle, User } from "../models/index.js";
import { authMiddleware } from "../middleware/index.js";

const router = Router();

// Get all puzzles
router.get("/", async (req, res) => {
  try {
    const puzzles = await Puzzle.find().sort({ rating: 1 });
    res.json(puzzles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch puzzles" });
  }
});

// Get featured puzzles for dashboard
router.get("/featured", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const puzzles = await Puzzle.find({ featured: true })
      .sort({ rating: 1 })
      .limit(limit);
    res.json(puzzles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch featured puzzles" });
  }
});

// Toggle puzzle featured status
router.patch("/:id/featured", async (req, res) => {
  try {
    const { featured } = req.body;
    const puzzle = await Puzzle.findByIdAndUpdate(
      req.params.id,
      { featured },
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

// Get single puzzle by ID
router.get("/:id", async (req, res) => {
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

// Update puzzle stats
router.patch("/:id/stats", async (req, res) => {
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
router.post("/:id/solve", authMiddleware, async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }

    await Puzzle.findByIdAndUpdate(puzzle._id, {
      $inc: { timesPlayed: 1, timesSolved: 1 },
    });

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

export default router;
