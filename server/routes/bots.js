import express from "express";
import Bot from "../models/Bot.js";

const router = express.Router();

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    errorCode: code,
    error: message,
    ...extra,
  });
}

router.get("/", async (req, res) => {
  try {
    const bots = await Bot.find({ isActive: true })
      .sort({ difficulty: 1, eloRating: 1 })
      .select("-__v");

    const grouped = {
      beginner: [],
      casual: [],
      intermediate: [],
      advanced: [],
      master: [],
    };

    bots.forEach((bot) => {
      if (grouped[bot.difficulty]) {
        grouped[bot.difficulty].push(bot);
      }
    });

    res.json({
      success: true,
      bots,
      grouped,
      total: bots.length,
    });
  } catch (error) {
    console.error("Error fetching bots:", error);
    sendError(res, 500, "BOT_FETCH_FAILED", "Failed to fetch bots");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const bot = await Bot.findOne({
      _id: req.params.id,
      isActive: true,
    }).select("-__v");

    if (!bot) {
      return sendError(res, 404, "BOT_NOT_FOUND", "Bot not found");
    }

    res.json({ success: true, bot });
  } catch (error) {
    console.error("Error fetching bot:", error);
    sendError(res, 500, "BOT_FETCH_FAILED", "Failed to fetch bot");
  }
});

export default router;
