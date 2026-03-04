import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { CheatReport, History, User } from "../models/index.js";
import {
  scanUserAndCreateCheatReport,
  scanUserHistoryForCheat,
} from "../services/cheatDetection.js";
import { notifyUser } from "../services/notify.js";

const router = Router();
router.use(adminAuthMiddleware);

const VALID_STATUSES = new Set(["pending", "reviewed", "dismissed", "actioned"]);
const VALID_RISK_LEVELS = new Set(["low", "medium", "high"]);
const VALID_ACTIONS = new Set(["none", "warn", "restrict", "ban"]);

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeString(value) {
  return String(value || "").trim();
}

function mapReportSummary(report) {
  const user = report.userId && typeof report.userId === "object" ? report.userId : null;
  return {
    _id: String(report._id),
    user: user
      ? {
          _id: String(user._id),
          fullName: user.fullName || "Unknown",
          email: user.email || "",
          avatar: user.avatar || "",
          banned: !!user.banned,
          deletedAt: user.deletedAt || null,
        }
      : null,
    source: report.source || "manual_scan",
    status: report.status || "pending",
    reviewAction: report.reviewAction || "none",
    metrics: report.metrics || {},
    flags: Array.isArray(report.flags) ? report.flags : [],
    createdAt: report.createdAt,
    reviewedAt: report.reviewedAt || null,
  };
}

function mapReportDetail(report) {
  const summary = mapReportSummary(report);
  const games = Array.isArray(report.gameIds)
    ? report.gameIds.map((game) => ({
        _id: String(game._id),
        white: game.white || "",
        black: game.black || "",
        result: game.result || "",
        createdAt: game.createdAt || null,
        rated: !!game.rated,
        variant: game.variant || "standard",
        movesCount: Array.isArray(game.moves) ? game.moves.length : 0,
        timeControl: game.timeControl || "",
      }))
    : [];

  return {
    ...summary,
    reviewNote: report.reviewNote || "",
    reviewedBy: report.reviewedBy || null,
    dataGaps: report.dataGaps || {
      bestMoveUnavailable: true,
      top3Unavailable: true,
      notes: [],
    },
    games,
    updatedAt: report.updatedAt || null,
  };
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20),
    );
    const skip = (page - 1) * limit;

    const status = normalizeString(req.query.status).toLowerCase();
    const riskLevel = normalizeString(req.query.riskLevel).toLowerCase();
    const userId = normalizeString(req.query.userId);
    const search = normalizeString(req.query.search);

    const query = {};
    if (VALID_STATUSES.has(status)) query.status = status;
    if (VALID_RISK_LEVELS.has(riskLevel)) query["metrics.riskLevel"] = riskLevel;
    if (userId) {
      if (!isValidObjectId(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      query.userId = userId;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      const users = await User.find({
        $or: [{ fullName: regex }, { email: regex }],
      })
        .select("_id")
        .limit(200)
        .lean();
      const userIds = users.map((user) => user._id);
      if (!userIds.length) {
        return res.json({
          reports: [],
          pagination: { page, limit, total: 0, pages: 1 },
        });
      }
      query.userId = { $in: userIds };
    }

    const [items, total] = await Promise.all([
      CheatReport.find(query)
        .sort({ status: 1, "metrics.suspicionScore": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName email avatar banned deletedAt")
        .lean(),
      CheatReport.countDocuments(query),
    ]);

    res.json({
      reports: items.map(mapReportSummary),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Admin cheat reports list error:", error);
    res.status(500).json({ error: "Failed to fetch cheat reports" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const report = await CheatReport.findById(id)
      .populate("userId", "fullName email avatar banned deletedAt")
      .populate("gameIds", "white black result createdAt rated variant moves timeControl")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report: mapReportDetail(report) });
  } catch (error) {
    console.error("Admin cheat report detail error:", error);
    res.status(500).json({ error: "Failed to fetch report detail" });
  }
});

router.post("/scan/:userId", async (req, res) => {
  try {
    const userId = normalizeString(req.params.userId);
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findById(userId).select("_id fullName email").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const minGames = Math.max(
      3,
      Number.parseInt(String(req.body?.minGames || "10"), 10) || 10,
    );
    const maxGames = Math.min(
      100,
      Math.max(
        10,
        Number.parseInt(String(req.body?.maxGames || "40"), 10) || 40,
      ),
    );

    const result = await scanUserAndCreateCheatReport(userId, {
      minGames,
      maxGames,
      source: "manual_scan",
    });

    return res.json({
      success: true,
      user: {
        _id: String(user._id),
        fullName: user.fullName || "Unknown",
        email: user.email || "",
      },
      created: !!result.created,
      flagged: !!result.suspicious,
      eligible: !!result.eligible,
      reason: result.reason || null,
      report: result.report ? mapReportSummary(result.report) : null,
      metrics: result.reportPayload?.metrics || null,
      flags: result.reportPayload?.flags || [],
    });
  } catch (error) {
    console.error("Admin manual cheat scan error:", error);
    res.status(500).json({ error: "Failed to scan user for cheating" });
  }
});

router.post("/scan", async (req, res) => {
  try {
    const minGames = Math.max(
      3,
      Number.parseInt(String(req.body?.minGames || "10"), 10) || 10,
    );
    const maxGames = Math.min(
      100,
      Math.max(
        minGames,
        Number.parseInt(String(req.body?.maxGames || "40"), 10) || 40,
      ),
    );
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(String(req.body?.limit || "50"), 10) || 50),
    );

    const candidates = await History.aggregate([
      { $match: { rated: true } },
      { $group: { _id: "$userId", games: { $sum: 1 } } },
      { $match: { games: { $gte: minGames } } },
      { $sort: { games: -1 } },
      { $limit: limit },
    ]);

    let scanned = 0;
    let flagged = 0;
    let created = 0;
    const reports = [];

    for (const candidate of candidates) {
      const userId = String(candidate?._id || "");
      if (!isValidObjectId(userId)) continue;
      scanned += 1;

      const result = await scanUserAndCreateCheatReport(userId, {
        minGames,
        maxGames,
        source: "batch_scan",
      });
      if (result.suspicious) flagged += 1;
      if (result.created) created += 1;
      if (result.report) reports.push(mapReportSummary(result.report));
    }

    res.json({
      success: true,
      scanned,
      flagged,
      created,
      reports,
    });
  } catch (error) {
    console.error("Admin batch cheat scan error:", error);
    res.status(500).json({ error: "Failed to run batch cheat scan" });
  }
});

router.patch("/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const status = normalizeString(req.body?.status).toLowerCase();
    const action = normalizeString(req.body?.action || "none").toLowerCase();
    const note = normalizeString(req.body?.note).slice(0, 4000);

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid report status" });
    }
    if (!VALID_ACTIONS.has(action)) {
      return res.status(400).json({ error: "Invalid review action" });
    }

    const report = await CheatReport.findById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (status) report.status = status;
    report.reviewAction = action;
    report.reviewNote = note;
    report.reviewedBy = req.admin?.adminId || null;
    report.reviewedAt = new Date();
    if (action !== "none") {
      report.status = "actioned";
    } else if (!status) {
      report.status = "reviewed";
    }
    await report.save();

    if (action === "ban") {
      await User.findByIdAndUpdate(report.userId, {
        $set: {
          banned: true,
          bannedAt: new Date(),
          banReason:
            note || "Account actioned after anti-cheat administrative review.",
        },
      });
      await notifyUser(req.app, {
        userId: report.userId,
        type: "account_action",
        title: "Account restriction update",
        message:
          "Your account was restricted after fair-play review. Contact support for appeal.",
        link: "/settings",
        payload: {
          reportId: String(report._id),
          action: "ban",
        },
      });
    } else if (action === "warn" || action === "restrict") {
      await notifyUser(req.app, {
        userId: report.userId,
        type: "fair_play_warning",
        title: "Fair-play warning",
        message:
          action === "warn"
            ? "Your recent games were flagged for fair-play review. Please follow fair-play rules."
            : "Your account is under fair-play restriction review.",
        link: "/settings",
        payload: {
          reportId: String(report._id),
          action,
        },
      });
    }

    const updated = await CheatReport.findById(report._id)
      .populate("userId", "fullName email avatar banned deletedAt")
      .populate("gameIds", "white black result createdAt rated variant moves timeControl")
      .lean();
    return res.json({ success: true, report: mapReportDetail(updated) });
  } catch (error) {
    console.error("Admin cheat report review error:", error);
    res.status(500).json({ error: "Failed to review cheat report" });
  }
});

router.post("/scan-preview/:userId", async (req, res) => {
  try {
    const userId = normalizeString(req.params.userId);
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const minGames = Math.max(
      3,
      Number.parseInt(String(req.body?.minGames || "10"), 10) || 10,
    );
    const maxGames = Math.min(
      100,
      Math.max(
        10,
        Number.parseInt(String(req.body?.maxGames || "40"), 10) || 40,
      ),
    );

    const result = await scanUserHistoryForCheat(userId, { minGames, maxGames });
    res.json({
      success: true,
      eligible: !!result.eligible,
      flagged: !!result.suspicious,
      reason: result.reason || null,
      metrics: result.reportPayload?.metrics || null,
      flags: result.reportPayload?.flags || [],
      dataGaps: result.reportPayload?.dataGaps || null,
    });
  } catch (error) {
    console.error("Admin cheat report preview scan error:", error);
    res.status(500).json({ error: "Failed to preview scan" });
  }
});

export default router;
