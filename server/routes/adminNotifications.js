import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { CheatReport, TournamentPlayer, User } from "../models/index.js";
import { notifyUsers } from "../services/notify.js";

const router = Router();

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

router.post("/broadcast", adminAuthMiddleware, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const message = String(req.body?.message || "").trim().slice(0, 600);
    const link = String(req.body?.link || "").trim().slice(0, 300);
    const audience = String(req.body?.audience || "all")
      .trim()
      .toLowerCase();
    const tournamentId = String(req.body?.tournamentId || "").trim();
    const explicitUserIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];

    if (!title || !message) {
      return res
        .status(400)
        .json({ error: "title and message are required" });
    }

    let userIds = [];
    if (explicitUserIds.length > 0) {
      userIds = explicitUserIds;
    } else if (audience === "flagged") {
      const reports = await CheatReport.find({
        status: { $in: ["pending", "actioned"] },
      })
        .select("userId")
        .lean();
      userIds = [...new Set(reports.map((report) => String(report.userId)).filter(Boolean))];
    } else if (audience === "tournament_players") {
      if (!isValidObjectId(tournamentId)) {
        return res.status(400).json({
          error: "tournamentId is required for tournament_players audience",
        });
      }

      const players = await TournamentPlayer.find({ tournamentId })
        .select("userId")
        .lean();
      userIds = [...new Set(players.map((player) => String(player.userId)).filter(Boolean))];
    } else if (audience === "active") {
      const users = await User.find({ presenceStatus: { $ne: "offline" } })
        .select("_id")
        .lean();
      userIds = users.map((user) => String(user._id));
    } else if (audience === "banned") {
      const users = await User.find({ banned: true }).select("_id").lean();
      userIds = users.map((user) => String(user._id));
    } else {
      const users = await User.find({}).select("_id").lean();
      userIds = users.map((user) => String(user._id));
    }

    const created = await notifyUsers(req.app, userIds, {
      type: "admin_broadcast",
      title,
      message,
      link,
      payload: {
        audience: explicitUserIds.length > 0 ? "custom" : audience,
        adminId: req.admin?.adminId || null,
        tournamentId: audience === "tournament_players" ? tournamentId : null,
      },
    });

    res.json({
      success: true,
      sent: created.length,
      audience: explicitUserIds.length > 0 ? "custom" : audience,
    });
  } catch (error) {
    console.error("Admin broadcast notification error:", error);
    res.status(500).json({ error: "Failed to broadcast notifications" });
  }
});

export default router;
