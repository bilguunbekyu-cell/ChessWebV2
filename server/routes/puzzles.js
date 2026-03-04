import { Router } from "express";
import { Puzzle, PuzzleAttempt, User } from "../models/index.js";
import { authMiddleware } from "../middleware/index.js";
import { recordUserPuzzleActivity } from "../services/activity.js";

const router = Router();

const ATTEMPT_RESULTS = new Set(["SOLVED", "FAILED", "SKIPPED"]);
const DEFAULT_USER_PUZZLE_RATING = 1200;
const DEFAULT_PUZZLE_RATING = 1200;
const USER_PROVISIONAL_K = 40;
const USER_STABLE_K = 20;
const PUZZLE_PROVISIONAL_K = 20;
const PUZZLE_STABLE_K = 10;
const PROVISIONAL_WINDOW = 20;
const MIN_RATING = 100;

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    errorCode: code,
    error: message,
    ...extra,
  });
}

function normalizeResult(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return ATTEMPT_RESULTS.has(normalized) ? normalized : null;
}

function normalizeMovesPlayed(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, 300);
}

function normalizeTimeMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function expectedUserScore(userRating, puzzleRating) {
  return 1 / (1 + 10 ** ((puzzleRating - userRating) / 400));
}

function resolveScore(result, usedHint) {
  if (result === "SOLVED") {
    return usedHint ? 0.5 : 1;
  }
  return 0;
}

function resolveUserK(userAttempts) {
  return userAttempts < PROVISIONAL_WINDOW ? USER_PROVISIONAL_K : USER_STABLE_K;
}

function resolvePuzzleK(puzzleAttempts) {
  return puzzleAttempts < PROVISIONAL_WINDOW
    ? PUZZLE_PROVISIONAL_K
    : PUZZLE_STABLE_K;
}

function applyEloDelta(currentRating, k, score, expectedScore) {
  return Math.max(MIN_RATING, Math.round(currentRating + k * (score - expectedScore)));
}

function toUtcDateKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function calculateSolvedStreak(solvedDays) {
  if (!solvedDays || solvedDays.size === 0) return 0;

  const cursor = new Date();
  let streak = 0;
  while (true) {
    const key = toUtcDateKey(cursor);
    if (!solvedDays.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function recordPuzzleAttempt({
  userId,
  puzzleId,
  result,
  movesPlayed,
  timeMs,
  usedHint,
}) {
  const [puzzle, user] = await Promise.all([
    Puzzle.findById(puzzleId),
    User.findById(userId),
  ]);

  if (!puzzle) {
    return {
      error: {
        status: 404,
        code: "PUZZLE_NOT_FOUND",
        message: "Puzzle not found",
      },
    };
  }
  if (!user) {
    return {
      error: {
        status: 404,
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    };
  }

  const userRatingBefore = Number(user.puzzleElo ?? DEFAULT_USER_PUZZLE_RATING);
  const puzzleRatingBefore = Number(puzzle.rating ?? DEFAULT_PUZZLE_RATING);
  const userAttemptsBefore = Number(user.puzzleAttempts ?? 0);
  const puzzleAttemptsBefore = Number(puzzle.timesPlayed ?? 0);

  const expectedScore = expectedUserScore(userRatingBefore, puzzleRatingBefore);
  const score = resolveScore(result, usedHint);
  const kUser = resolveUserK(userAttemptsBefore);
  const kPuzzle = resolvePuzzleK(puzzleAttemptsBefore);

  const userRatingAfter = applyEloDelta(userRatingBefore, kUser, score, expectedScore);
  const puzzleRatingAfter = applyEloDelta(
    puzzleRatingBefore,
    kPuzzle,
    1 - score,
    1 - expectedScore,
  );

  const solvedIncrement = result === "SOLVED" ? 1 : 0;
  const failedIncrement = result === "FAILED" ? 1 : 0;
  const skippedIncrement = result === "SKIPPED" ? 1 : 0;

  user.puzzleElo = userRatingAfter;
  user.puzzleAttempts = userAttemptsBefore + 1;
  user.puzzleSolved = Number(user.puzzleSolved ?? 0) + solvedIncrement;
  user.puzzleFailed = Number(user.puzzleFailed ?? 0) + failedIncrement;
  user.puzzleSkipped = Number(user.puzzleSkipped ?? 0) + skippedIncrement;
  user.puzzleBestElo = Math.max(
    Number(user.puzzleBestElo ?? userRatingBefore),
    userRatingAfter,
  );
  user.puzzleLastAttemptAt = new Date();

  puzzle.rating = puzzleRatingAfter;
  puzzle.timesPlayed = puzzleAttemptsBefore + 1;
  puzzle.timesSolved = Number(puzzle.timesSolved ?? 0) + solvedIncrement;

  await Promise.all([user.save(), puzzle.save()]);

  const attempt = await PuzzleAttempt.create({
    userId,
    puzzleId: puzzle._id,
    result,
    movesPlayed,
    timeMs,
    usedHint,
    score,
    expectedScore,
    kUser,
    kPuzzle,
    userRatingBefore,
    userRatingAfter,
    puzzleRatingBefore,
    puzzleRatingAfter,
  });

  await recordUserPuzzleActivity(userId).catch((error) => {
    console.error("Puzzle activity record error:", error);
  });

  return {
    attempt: {
      id: String(attempt._id),
      result: attempt.result,
      createdAt: attempt.createdAt,
      timeMs: attempt.timeMs,
      movesPlayed: attempt.movesPlayed,
      usedHint: attempt.usedHint,
      score,
      expectedScore,
      kUser,
      kPuzzle,
      userRatingBefore,
      userRatingAfter,
      puzzleRatingBefore,
      puzzleRatingAfter,
    },
    user: {
      id: String(user._id),
      puzzleElo: userRatingAfter,
      puzzleBestElo: Number(user.puzzleBestElo ?? userRatingAfter),
      puzzleAttempts: Number(user.puzzleAttempts ?? 0),
      puzzleSolved: Number(user.puzzleSolved ?? 0),
      puzzleFailed: Number(user.puzzleFailed ?? 0),
      puzzleSkipped: Number(user.puzzleSkipped ?? 0),
      delta: userRatingAfter - userRatingBefore,
      provisional: userAttemptsBefore + 1 < PROVISIONAL_WINDOW,
    },
    puzzle: {
      id: String(puzzle._id),
      title: puzzle.title,
      difficulty: puzzle.difficulty,
      rating: puzzleRatingAfter,
      delta: puzzleRatingAfter - puzzleRatingBefore,
      timesPlayed: Number(puzzle.timesPlayed ?? 0),
      timesSolved: Number(puzzle.timesSolved ?? 0),
    },
  };
}

router.get("/", async (_req, res) => {
  try {
    const puzzles = await Puzzle.find().sort({ rating: 1 });
    res.json(puzzles);
  } catch (error) {
    sendError(res, 500, "PUZZLES_FETCH_FAILED", "Failed to fetch puzzles");
  }
});

router.get("/me/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select(
      "puzzleElo puzzleBestElo puzzleAttempts puzzleSolved puzzleFailed puzzleSkipped",
    );
    if (!user) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    const now = new Date();
    const todayUtcStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [solvedToday, solvedAttempts] = await Promise.all([
      PuzzleAttempt.countDocuments({
        userId,
        result: "SOLVED",
        createdAt: { $gte: todayUtcStart },
      }),
      PuzzleAttempt.find({ userId, result: "SOLVED" })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .limit(3650)
        .lean(),
    ]);

    const solvedDays = new Set(
      solvedAttempts.map((entry) => toUtcDateKey(entry.createdAt)),
    );
    const streak = calculateSolvedStreak(solvedDays);

    res.json({
      rating: Number(user.puzzleElo ?? DEFAULT_USER_PUZZLE_RATING),
      bestRating: Number(
        user.puzzleBestElo ?? user.puzzleElo ?? DEFAULT_USER_PUZZLE_RATING,
      ),
      attempts: Number(user.puzzleAttempts ?? 0),
      solved: Number(user.puzzleSolved ?? 0),
      failed: Number(user.puzzleFailed ?? 0),
      skipped: Number(user.puzzleSkipped ?? 0),
      solvedToday: Number(solvedToday ?? 0),
      streak,
      provisional: Number(user.puzzleAttempts ?? 0) < PROVISIONAL_WINDOW,
    });
  } catch (error) {
    console.error("Puzzle stats error:", error);
    sendError(
      res,
      500,
      "PUZZLE_STATS_FETCH_FAILED",
      "Failed to fetch puzzle stats",
    );
  }
});

router.get("/featured", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const puzzles = await Puzzle.find({ featured: true })
      .sort({ rating: 1 })
      .limit(limit);
    res.json(puzzles);
  } catch (error) {
    sendError(
      res,
      500,
      "PUZZLE_FEATURED_FETCH_FAILED",
      "Failed to fetch featured puzzles",
    );
  }
});

router.patch("/:id/featured", async (req, res) => {
  try {
    const { featured } = req.body;
    const puzzle = await Puzzle.findByIdAndUpdate(
      req.params.id,
      { featured },
      { new: true },
    );
    if (!puzzle) {
      return sendError(res, 404, "PUZZLE_NOT_FOUND", "Puzzle not found");
    }
    res.json(puzzle);
  } catch (error) {
    sendError(res, 500, "PUZZLE_UPDATE_FAILED", "Failed to update puzzle");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return sendError(res, 404, "PUZZLE_NOT_FOUND", "Puzzle not found");
    }
    res.json(puzzle);
  } catch (error) {
    sendError(res, 500, "PUZZLE_FETCH_FAILED", "Failed to fetch puzzle");
  }
});

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
      return sendError(res, 404, "PUZZLE_NOT_FOUND", "Puzzle not found");
    }
    res.json(puzzle);
  } catch (error) {
    sendError(
      res,
      500,
      "PUZZLE_STATS_UPDATE_FAILED",
      "Failed to update puzzle stats",
    );
  }
});

router.post("/:id/attempt", authMiddleware, async (req, res) => {
  try {
    const result = normalizeResult(req.body?.result);
    if (!result) {
      return sendError(
        res,
        400,
        "PUZZLE_INVALID_RESULT",
        "Invalid result. Expected SOLVED, FAILED, or SKIPPED.",
      );
    }

    const outcome = await recordPuzzleAttempt({
      userId: req.user.userId,
      puzzleId: req.params.id,
      result,
      movesPlayed: normalizeMovesPlayed(req.body?.movesPlayed),
      timeMs: normalizeTimeMs(req.body?.timeMs),
      usedHint: req.body?.usedHint === true,
    });

    if (outcome.error) {
      return sendError(
        res,
        outcome.error.status,
        outcome.error.code,
        outcome.error.message,
      );
    }

    res.json({ success: true, ...outcome });
  } catch (error) {
    console.error("Puzzle attempt error:", error);
    sendError(
      res,
      500,
      "PUZZLE_ATTEMPT_RECORD_FAILED",
      "Failed to record puzzle attempt",
    );
  }
});

router.post("/:id/solve", authMiddleware, async (req, res) => {
  try {
    const outcome = await recordPuzzleAttempt({
      userId: req.user.userId,
      puzzleId: req.params.id,
      result: "SOLVED",
      movesPlayed: normalizeMovesPlayed(req.body?.movesPlayed),
      timeMs: normalizeTimeMs(req.body?.timeMs),
      usedHint: req.body?.usedHint === true,
    });

    if (outcome.error) {
      return sendError(
        res,
        outcome.error.status,
        outcome.error.code,
        outcome.error.message,
      );
    }

    const gain = outcome.user.delta;
    res.json({
      success: true,
      puzzleElo: outcome.user.puzzleElo,
      gain,
      difficulty: outcome.puzzle.difficulty,
      ...outcome,
    });
  } catch (error) {
    console.error("Solve error:", error);
    sendError(
      res,
      500,
      "PUZZLE_SOLVE_RECORD_FAILED",
      "Failed to record puzzle solve",
    );
  }
});

export default router;
