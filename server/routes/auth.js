import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { authMiddleware } from "../middleware/index.js";
import { recordUserActivity, recordUserLogin } from "../services/activity.js";

const router = Router();

const VALID_PRESENCE = new Set([
  "online",
  "offline",
  "searching_match",
  "in_game",
  "away",
]);
const VALID_LANGUAGES = new Set(["en", "mn"]);

function normalizePresenceStatus(value) {
  const status = String(value || "offline")
    .trim()
    .toLowerCase();
  return VALID_PRESENCE.has(status) ? status : "offline";
}

function normalizeLanguage(value) {
  const normalized = String(value || "en")
    .trim()
    .toLowerCase();
  return VALID_LANGUAGES.has(normalized) ? normalized : "en";
}

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    errorCode: code,
    error: message,
    ...extra,
  });
}

function toPublicUser(user) {
  if (!user) return null;
  const baseRating = user.rating ?? 1200;
  return {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar || "",
    rating: baseRating,
    bulletRating: user.bulletRating ?? baseRating,
    blitzRating: user.blitzRating ?? baseRating,
    rapidRating: user.rapidRating ?? baseRating,
    classicalRating: user.classicalRating ?? baseRating,
    bulletRd: user.bulletRd ?? 350,
    blitzRd: user.blitzRd ?? 350,
    rapidRd: user.rapidRd ?? 350,
    classicalRd: user.classicalRd ?? 350,
    bulletVolatility: user.bulletVolatility ?? 0.06,
    blitzVolatility: user.blitzVolatility ?? 0.06,
    rapidVolatility: user.rapidVolatility ?? 0.06,
    classicalVolatility: user.classicalVolatility ?? 0.06,
    bulletGames: user.bulletGames ?? 0,
    blitzGames: user.blitzGames ?? 0,
    rapidGames: user.rapidGames ?? 0,
    classicalGames: user.classicalGames ?? 0,
    gamesPlayed: user.gamesPlayed ?? 0,
    gamesWon: user.gamesWon ?? 0,
    presenceStatus: normalizePresenceStatus(user.presenceStatus),
    lastSeenAt: user.lastSeenAt ?? null,
    lastActiveAt: user.lastActiveAt ?? null,
    puzzleElo: user.puzzleElo ?? 1200,
    puzzleBestElo: user.puzzleBestElo ?? user.puzzleElo ?? 1200,
    puzzleAttempts: user.puzzleAttempts ?? 0,
    puzzleSolved: user.puzzleSolved ?? 0,
    puzzleFailed: user.puzzleFailed ?? 0,
    puzzleSkipped: user.puzzleSkipped ?? 0,
    puzzleLastAttemptAt: user.puzzleLastAttemptAt ?? null,
    language: normalizeLanguage(user.language),
  };
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, language } = req.body;

    if (!fullName || !email || !password) {
      return sendError(
        res,
        400,
        "AUTH_REQUIRED_FIELDS",
        "All fields are required",
      );
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return sendError(res, 400, "AUTH_EMAIL_IN_USE", "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let normalizedLanguage = "en";
    if (language !== undefined) {
      const requestedLanguage = String(language).trim().toLowerCase();
      if (!VALID_LANGUAGES.has(requestedLanguage)) {
        return sendError(
          res,
          400,
          "AUTH_INVALID_LANGUAGE",
          "Invalid language setting",
        );
      }
      normalizedLanguage = requestedLanguage;
    }

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      language: normalizedLanguage,
    });

    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    await recordUserLogin(user._id).catch((error) => {
      console.error("Record register login activity error:", error);
    });

    res.json({
      success: true,
      message: "User registered successfully",
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Register error:", err);
    sendError(res, 500, "AUTH_REGISTER_FAILED", "Server error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        400,
        "AUTH_EMAIL_PASSWORD_REQUIRED",
        "Email and password are required",
      );
    }

    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      return sendError(
        res,
        401,
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    if (user.banned) {
      return sendError(res, 403, "AUTH_ACCOUNT_BANNED", "Your account has been banned", {
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(
        res,
        401,
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }

    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    await recordUserLogin(user._id).catch((error) => {
      console.error("Record login activity error:", error);
    });

    res.json({
      success: true,
      message: "Login successful",
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    sendError(res, 500, "AUTH_LOGIN_FAILED", "Server error");
  }
});

router.post("/logout", (req, res) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user || user.deletedAt) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    if (user.banned) {
      res.clearCookie("authToken", { path: "/" });
      return sendError(res, 403, "AUTH_ACCOUNT_BANNED", "Your account has been banned", {
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
    }

    await recordUserActivity({
      userId: user._id,
      eventCount: 1,
      loginCount: 0,
    }).catch((error) => {
      console.error("Record /me activity error:", error);
    });

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error("Get user error:", err);
    sendError(res, 500, "AUTH_ME_FAILED", "Server error");
  }
});

router.get("/users/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user || user.banned || user.deletedAt) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    let relationship = "none";
    if (String(user._id) === String(viewerId)) {
      relationship = "self";
    } else {
      const { default: Friend } = await import("../models/Friend.js");
      const isFriend = await Friend.findOne({
        userId: viewerId,
        friendId: user._id,
      }).lean();
      if (isFriend) relationship = "friends";
    }

    const { default: HistoryModel } = await import("../models/History.js");
    const totalGames = await HistoryModel.countDocuments({ userId: user._id });
    const totalWins = await HistoryModel.countDocuments({
      userId: user._id,
      $or: [
        { result: "1-0", playAs: "white" },
        { result: "0-1", playAs: "black" },
      ],
    });

    res.json({
      user: {
        ...toPublicUser(user),
        gamesPlayed: Math.max(user.gamesPlayed ?? 0, totalGames),
        gamesWon: Math.max(user.gamesWon ?? 0, totalWins),
      },
      relationship,
    });
  } catch (err) {
    console.error("Public profile error:", err);
    sendError(res, 500, "AUTH_PUBLIC_PROFILE_FAILED", "Server error");
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, avatar, language, userId: targetUserId } = req.body || {};

    if (
      targetUserId &&
      String(targetUserId).trim() &&
      String(targetUserId) !== String(req.user.userId)
    ) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Forbidden");
    }

    const update = {};
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      update.fullName = fullName.trim().slice(0, 80);
    }
    if (typeof avatar === "string") {
      update.avatar = avatar;
    }
    if (language !== undefined) {
      const requestedLanguage = String(language).trim().toLowerCase();
      if (!VALID_LANGUAGES.has(requestedLanguage)) {
        return sendError(
          res,
          400,
          "AUTH_INVALID_LANGUAGE",
          "Invalid language setting",
        );
      }
      update.language = requestedLanguage;
    }

    if (Object.keys(update).length === 0) {
      return sendError(
        res,
        400,
        "AUTH_INVALID_PROFILE_UPDATE",
        "No valid profile fields provided",
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: update },
      { new: true },
    ).select("-password");
    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    console.error("Update profile error:", err);
    sendError(res, 500, "AUTH_PROFILE_UPDATE_FAILED", "Server error");
  }
});

router.put("/users/:userId/avatar", authMiddleware, async (req, res) => {
  try {
    const targetUserId = String(req.params.userId || "");
    const requesterId = String(req.user.userId || "");
    if (!targetUserId || targetUserId !== requesterId) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Forbidden");
    }

    const avatar = req.body?.avatar;
    if (typeof avatar !== "string") {
      return sendError(res, 400, "AUTH_AVATAR_REQUIRED", "Avatar is required");
    }

    const user = await User.findByIdAndUpdate(
      requesterId,
      { $set: { avatar } },
      { new: true },
    ).select("-password");

    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    console.error("Update avatar error:", err);
    sendError(res, 500, "AUTH_AVATAR_UPDATE_FAILED", "Server error");
  }
});

export default router;
