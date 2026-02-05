import { Router } from "express";
import { History } from "../models/index.js";
import { adminAuthMiddleware } from "../middleware/index.js";

const router = Router();

// Get all games
router.get("/", adminAuthMiddleware, async (req, res) => {
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

// Get single game by ID
router.get("/:gameId", adminAuthMiddleware, async (req, res) => {
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

export default router;
