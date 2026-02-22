import { Router } from "express";
import { History } from "../models/index.js";
import { authMiddleware } from "../middleware/index.js";

const router = Router();

function normalizeVariant(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "chess960" ? "chess960" : "standard";
}

function detectVariantFromEvent(event) {
  const text = String(event || "");
  return /960|chess960/i.test(text) ? "chess960" : "standard";
}

// Save game history
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      event = "NeonGambit Game",
      site = "NeonGambit",
      date,
      round = "-",
      white,
      black,
      result,
      variant,
      currentPosition,
      timeControl,
      utcDate,
      utcTime,
      startTime,
      endDate,
      endTime,
      whiteElo = 1200,
      blackElo = 1200,
      rated = false,
      ratingBefore,
      ratingAfter,
      ratingDelta,
      ratingDeviationBefore,
      ratingDeviationAfter,
      ratingDeviationDelta,
      volatilityBefore,
      volatilityAfter,
      volatilityDelta,
      isProvisional = false,
      opponentRatingBefore,
      opponentRatingAfter,
      opponentRatingDelta,
      opponentRatingDeviationBefore,
      opponentRatingDeviationAfter,
      opponentRatingDeviationDelta,
      opponentVolatilityBefore,
      opponentVolatilityAfter,
      opponentVolatilityDelta,
      opponentIsProvisional = false,
      ratingPool,
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
      variant: variant ? normalizeVariant(variant) : detectVariantFromEvent(event),
      currentPosition,
      timeControl,
      utcDate,
      utcTime,
      startTime,
      endDate,
      endTime,
      whiteElo,
      blackElo,
      rated,
      ratingBefore,
      ratingAfter,
      ratingDelta,
      ratingDeviationBefore,
      ratingDeviationAfter,
      ratingDeviationDelta,
      volatilityBefore,
      volatilityAfter,
      volatilityDelta,
      isProvisional,
      opponentRatingBefore,
      opponentRatingAfter,
      opponentRatingDelta,
      opponentRatingDeviationBefore,
      opponentRatingDeviationAfter,
      opponentRatingDeviationDelta,
      opponentVolatilityBefore,
      opponentVolatilityAfter,
      opponentVolatilityDelta,
      opponentIsProvisional,
      ratingPool,
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

// Get game history for a specific user (public)
router.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const games = await History.find({ userId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await History.countDocuments({ userId });

    res.json({ games, total });
  } catch (err) {
    console.error("Get user history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get game history for current user
router.get("/", authMiddleware, async (req, res) => {
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
router.get("/:id", authMiddleware, async (req, res) => {
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

export default router;
