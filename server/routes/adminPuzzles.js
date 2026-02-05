import { Router } from "express";
import { Puzzle } from "../models/index.js";
import { adminAuthMiddleware } from "../middleware/index.js";

const router = Router();

// Create puzzle
router.post("/", adminAuthMiddleware, async (req, res) => {
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
      mateIn,
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
      mateIn: mateIn || 2,
    });

    await puzzle.save();
    res.status(201).json(puzzle);
  } catch (error) {
    res.status(500).json({ error: "Failed to create puzzle" });
  }
});

// Update puzzle
router.put("/:id", adminAuthMiddleware, async (req, res) => {
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
      mateIn,
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
        mateIn,
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

// Delete puzzle
router.delete("/:id", adminAuthMiddleware, async (req, res) => {
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

export default router;
