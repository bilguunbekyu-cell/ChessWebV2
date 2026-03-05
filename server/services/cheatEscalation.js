/**
 * Cheat auto-escalation & rating-refund pipeline.
 *
 * Chapter 3 requirement:
 *   • 96–100% engine match → auto-flag as cheat
 *   • First offence → warning; repeat → auto-close account
 *   • Opponents who lost to a cheater get their rating refunded
 *
 * This module wraps the existing cheatDetection scanner and adds:
 *   1. Auto-escalation thresholds (configurable)
 *   2. Repeat-offence tracking  (prior actioned reports count)
 *   3. Rating refund for victims (reverse RatingEvents)
 */

import { CheatReport, History, RatingEvent, User } from "../models/index.js";
import { scanUserHistoryForCheat } from "./cheatDetection.js";
import { notifyUser } from "./notify.js";
import { ratingFieldForPool, gamesFieldForPool } from "../utils/elo.js";
import { rdFieldForPool, volatilityFieldForPool } from "../utils/glicko2.js";

/* ── Configurable thresholds ─────────────────────────────── */
const AUTO_BAN_SCORE = Number(process.env.CHEAT_AUTO_BAN_SCORE) || 96;
const AUTO_WARN_SCORE = Number(process.env.CHEAT_AUTO_WARN_SCORE) || 85;
const REPEAT_OFFENCE_MAX_WARNINGS = Number(process.env.CHEAT_MAX_WARNINGS) || 1;

/* ── helpers ─────────────────────────────────────────────── */
function normalizeId(value) {
  return value ? String(value) : "";
}

/**
 * Count how many previous CheatReports for this user were already actioned
 * with "warn" or "ban".
 */
async function countPriorActions(userId) {
  const count = await CheatReport.countDocuments({
    userId,
    status: "actioned",
    reviewAction: { $in: ["warn", "restrict", "ban"] },
  });
  return count;
}

/* ── 1. Auto-escalate a single report ────────────────────── */
/**
 * Given a freshly-created CheatReport, decide whether to auto-escalate.
 *
 * Returns { escalated: boolean, action: string, report }
 */
export async function autoEscalateReport(report, { app } = {}) {
  if (!report || report.status === "actioned") {
    return { escalated: false, action: "none", report };
  }

  const score = report.metrics?.suspicionScore ?? 0;
  const userId = normalizeId(report.userId);
  if (!userId) return { escalated: false, action: "none", report };

  let action = "none";

  if (score >= AUTO_BAN_SCORE) {
    // Extremely high confidence → immediate ban
    action = "ban";
  } else if (score >= AUTO_WARN_SCORE) {
    // High confidence → check repeat-offence history
    const priorActions = await countPriorActions(userId);
    if (priorActions >= REPEAT_OFFENCE_MAX_WARNINGS) {
      action = "ban";
    } else {
      action = "warn";
    }
  }

  if (action === "none") {
    return { escalated: false, action: "none", report };
  }

  // Persist escalation on the report
  report.reviewAction = action;
  report.status = "actioned";
  report.reviewNote =
    (report.reviewNote ? report.reviewNote + "\n" : "") +
    `[auto-escalation] score=${score}, action=${action}, ts=${new Date().toISOString()}`;
  report.reviewedAt = new Date();
  await report.save();

  // Apply ban on the user
  if (action === "ban") {
    await User.findByIdAndUpdate(userId, {
      $set: {
        banned: true,
        bannedAt: new Date(),
        banReason:
          "Account automatically closed after fair-play detection system flagged repeated violations.",
      },
    });

    // Notify + refund
    if (app) {
      await notifyUser(app, {
        userId,
        type: "account_action",
        title: "Account restriction",
        message:
          "Your account was restricted after automated fair-play review. Contact support for appeal.",
        link: "/settings",
        payload: { reportId: normalizeId(report._id), action: "ban" },
      });
    }

    // Refund opponents
    try {
      await refundOpponentsOfCheater(userId);
    } catch (err) {
      console.error("Rating refund after auto-ban error:", err);
    }
  } else if (action === "warn") {
    if (app) {
      await notifyUser(app, {
        userId,
        type: "fair_play_warning",
        title: "Fair-play warning",
        message:
          "Your recent games were flagged by our fair-play detection system. Please follow fair-play rules.",
        link: "/settings",
        payload: { reportId: normalizeId(report._id), action: "warn" },
      });
    }
  }

  return { escalated: true, action, report };
}

/* ── 2. Full pipeline: scan → create report → auto-escalate ── */
/**
 * Run cheat scan for a user. If suspicious, create a report and
 * auto-escalate it according to the Chapter 3 rules.
 */
export async function scanAndAutoEscalate(userId, options = {}) {
  const scanResult = await scanUserHistoryForCheat(userId, options);
  if (
    !scanResult.eligible ||
    !scanResult.suspicious ||
    !scanResult.reportPayload
  ) {
    return { scanned: true, eligible: scanResult.eligible, escalated: false };
  }

  // Avoid duplicate pending reports within 24 h
  const recentReport = await CheatReport.findOne({
    userId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (recentReport) {
    return {
      scanned: true,
      eligible: true,
      escalated: false,
      reason: "recent_report_exists",
    };
  }

  const report = await CheatReport.create({
    ...scanResult.reportPayload,
    source: String(options.source || "auto_scan"),
    status: "pending",
    reviewAction: "none",
  });

  const result = await autoEscalateReport(report, { app: options.app });
  return {
    scanned: true,
    eligible: true,
    escalated: result.escalated,
    action: result.action,
    reportId: normalizeId(report._id),
  };
}

/* ── 3. Rating refund for opponents of a cheater ─────────── */
/**
 * Find all rated games where `cheaterId` won, and reverse the rating
 * impact on the opponent (refund).
 *
 * Approach:
 *   For each RatingEvent where the cheater's opponent lost, restore
 *   the opponent's rating to ratingBefore and adjust pool games count.
 *
 * We only refund losses (opponent result === "L") within the last
 * 30 days to keep the scope bounded and fair.
 */
export async function refundOpponentsOfCheater(cheaterId, { days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Find all rating events where the cheater was the opponent and the
  // victim lost.  The RatingEvent is stored per-player, so we look for
  // events where opponentId === cheaterId AND result === "L".
  const victimEvents = await RatingEvent.find({
    opponentId: cheaterId,
    result: "L",
    ts: { $gte: since },
  })
    .sort({ ts: -1 })
    .lean();

  if (!victimEvents.length) return { refunded: 0 };

  // Group by victim userId to apply net refund per pool
  const refundMap = new Map(); // key: `${userId}:${pool}` → { userId, pool, ratingRestore, events[] }

  for (const ev of victimEvents) {
    const key = `${ev.userId}:${ev.pool}`;
    if (!refundMap.has(key)) {
      refundMap.set(key, { userId: ev.userId, pool: ev.pool, events: [] });
    }
    refundMap.get(key).events.push(ev);
  }

  let refunded = 0;

  for (const [, entry] of refundMap) {
    const { userId, pool, events } = entry;
    // Take the earliest event's ratingBefore as the best restore point
    const earliest = events[events.length - 1]; // sorted desc, so last = earliest
    const restoreRating = earliest.ratingBefore;
    const restoreRd = earliest.rdBefore;
    const restoreVol = earliest.volBefore;

    const rField = ratingFieldForPool(pool);
    const gField = gamesFieldForPool(pool);
    const rdField = rdFieldForPool(pool);
    const volField = volatilityFieldForPool(pool);

    const user = await User.findById(userId);
    if (!user) continue;

    const currentRating = user[rField] ?? 1200;
    // Only refund if the restore point is higher (i.e., victim was hurt)
    if (restoreRating > currentRating) {
      user[rField] = restoreRating;
      user[rdField] = restoreRd;
      user[volField] = restoreVol;
      user.rating = restoreRating;
      // Don't reduce gamesPlayed — games happened, just ratings are adjusted
      await user.save();
      refunded += 1;

      // Mark refunded events
      await RatingEvent.updateMany(
        { _id: { $in: events.map((e) => e._id) } },
        { $set: { refunded: true, refundedAt: new Date() } },
      );
    }
  }

  return { refunded, victimEventsCount: victimEvents.length };
}
