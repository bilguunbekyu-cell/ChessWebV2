import { Router } from "express";
import { adminAuthMiddleware } from "../middleware/index.js";
import { User, UserActivity } from "../models/index.js";

const router = Router();
router.use(adminAuthMiddleware);

function utcStartOfDay(input = new Date()) {
  const date = new Date(input);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(input = new Date()) {
  const date = new Date(input);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDays(raw, fallback, min, max) {
  const parsed = Number.parseInt(String(raw || fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function percent(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function startOfIsoWeek(input) {
  const date = utcStartOfDay(input);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(date, diff);
}

async function countActiveUsersBetween(fromDate, toDate) {
  const rows = await UserActivity.aggregate([
    { $match: { date: { $gte: fromDate, $lt: toDate } } },
    { $group: { _id: "$userId" } },
    { $count: "total" },
  ]);
  return Number(rows?.[0]?.total || 0);
}

router.get("/active", async (req, res) => {
  try {
    const days = parseDays(req.query.days, 30, 7, 180);
    const topUsersLimit = parseDays(req.query.topUsers, 10, 0, 50);

    const todayStart = utcStartOfDay(new Date());
    const nextDayStart = addUtcDays(todayStart, 1);
    const sinceStart = addUtcDays(todayStart, -(days - 1));
    const last7Start = addUtcDays(todayStart, -6);
    const prev7Start = addUtcDays(todayStart, -13);
    const prev7End = addUtcDays(todayStart, -6);
    const last30Start = addUtcDays(todayStart, -29);
    const prev30Start = addUtcDays(todayStart, -59);
    const prev30End = addUtcDays(todayStart, -29);

    const [dailyRows, wau, prevWau, mau, prevMau, topUsers] = await Promise.all([
      UserActivity.aggregate([
        {
          $match: {
            date: { $gte: sinceStart, $lt: nextDayStart },
          },
        },
        {
          $group: {
            _id: "$dateKey",
            dau: { $sum: 1 },
            gamesPlayed: { $sum: "$gamesPlayed" },
            timeSpentSec: { $sum: "$timeSpentSec" },
            loginCount: { $sum: "$loginCount" },
            puzzlesAttempted: { $sum: "$puzzlesAttempted" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      countActiveUsersBetween(last7Start, nextDayStart),
      countActiveUsersBetween(prev7Start, prev7End),
      countActiveUsersBetween(last30Start, nextDayStart),
      countActiveUsersBetween(prev30Start, prev30End),
      topUsersLimit > 0
        ? UserActivity.aggregate([
            { $match: { date: { $gte: last30Start, $lt: nextDayStart } } },
            {
              $group: {
                _id: "$userId",
                eventCount: { $sum: "$eventCount" },
                gamesPlayed: { $sum: "$gamesPlayed" },
                timeSpentSec: { $sum: "$timeSpentSec" },
                loginCount: { $sum: "$loginCount" },
                puzzlesAttempted: { $sum: "$puzzlesAttempted" },
                lastSeenAt: { $max: "$lastSeenAt" },
              },
            },
            { $sort: { eventCount: -1, gamesPlayed: -1, _id: 1 } },
            { $limit: topUsersLimit },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                eventCount: 1,
                gamesPlayed: 1,
                timeSpentSec: 1,
                loginCount: 1,
                puzzlesAttempted: 1,
                lastSeenAt: 1,
                user: {
                  _id: "$user._id",
                  fullName: "$user.fullName",
                  email: "$user.email",
                  avatar: "$user.avatar",
                  banned: "$user.banned",
                },
              },
            },
          ])
        : [],
    ]);

    const byKey = new Map(dailyRows.map((row) => [String(row._id), row]));
    const trend = [];
    for (let i = 0; i < days; i += 1) {
      const date = addUtcDays(sinceStart, i);
      const dateKey = toDateKey(date);
      const row = byKey.get(dateKey);
      trend.push({
        date: dateKey,
        dau: Number(row?.dau || 0),
        gamesPlayed: Number(row?.gamesPlayed || 0),
        timeSpentSec: Number(row?.timeSpentSec || 0),
        loginCount: Number(row?.loginCount || 0),
        puzzlesAttempted: Number(row?.puzzlesAttempted || 0),
      });
    }

    const todayKey = toDateKey(todayStart);
    const dau = Number(byKey.get(todayKey)?.dau || 0);
    const avgDau =
      trend.length > 0
        ? Number(
            (
              trend.reduce((sum, point) => sum + Number(point.dau || 0), 0) /
              trend.length
            ).toFixed(2),
          )
        : 0;

    const wauGrowth = prevWau > 0 ? percent(wau - prevWau, prevWau) : null;
    const mauGrowth = prevMau > 0 ? percent(mau - prevMau, prevMau) : null;

    res.json({
      summary: {
        dau,
        wau,
        mau,
        avgDau,
        windowDays: days,
        comparison: {
          prevWau,
          prevMau,
          wauGrowthPercent: wauGrowth,
          mauGrowthPercent: mauGrowth,
        },
      },
      trend,
      topUsers: (topUsers || []).map((entry) => ({
        _id: String(entry._id),
        user: entry.user?._id
          ? {
              _id: String(entry.user._id),
              fullName: entry.user.fullName || "Unknown",
              email: entry.user.email || "",
              avatar: entry.user.avatar || "",
              banned: !!entry.user.banned,
            }
          : null,
        eventCount: Number(entry.eventCount || 0),
        gamesPlayed: Number(entry.gamesPlayed || 0),
        timeSpentSec: Number(entry.timeSpentSec || 0),
        loginCount: Number(entry.loginCount || 0),
        puzzlesAttempted: Number(entry.puzzlesAttempted || 0),
        lastSeenAt: entry.lastSeenAt || null,
      })),
    });
  } catch (error) {
    console.error("Admin active metrics error:", error);
    res.status(500).json({ error: "Failed to fetch active metrics" });
  }
});

router.get("/retention", async (req, res) => {
  try {
    const windowDays = parseDays(req.query.days, 120, 30, 365);
    const cohortLimit = parseDays(req.query.cohorts, 12, 4, 24);

    const todayStart = utcStartOfDay(new Date());
    const nextDayStart = addUtcDays(todayStart, 1);
    const sinceStart = addUtcDays(todayStart, -(windowDays - 1));

    const users = await User.find({
      createdAt: { $gte: sinceStart, $lt: nextDayStart },
      deletedAt: null,
    })
      .select("_id createdAt")
      .lean();

    if (!users.length) {
      return res.json({
        summary: {
          usersConsidered: 0,
          d1: { eligible: 0, retained: 0, rate: 0 },
          d7: { eligible: 0, retained: 0, rate: 0 },
          d30: { eligible: 0, retained: 0, rate: 0 },
        },
        cohorts: [],
      });
    }

    const userIds = users.map((user) => user._id);
    const activityRows = await UserActivity.find({
      userId: { $in: userIds },
      date: { $gte: sinceStart, $lt: nextDayStart },
    })
      .select("userId dateKey")
      .lean();

    const activityByUserId = new Map();
    for (const row of activityRows) {
      const userId = String(row.userId);
      if (!activityByUserId.has(userId)) {
        activityByUserId.set(userId, new Set());
      }
      activityByUserId.get(userId).add(String(row.dateKey));
    }

    const summary = {
      usersConsidered: users.length,
      d1: { eligible: 0, retained: 0, rate: 0 },
      d7: { eligible: 0, retained: 0, rate: 0 },
      d30: { eligible: 0, retained: 0, rate: 0 },
    };
    const cohorts = new Map();

    for (const user of users) {
      const userId = String(user._id);
      const signupDay = utcStartOfDay(user.createdAt);
      const userActivity = activityByUserId.get(userId) || new Set();

      const d1Date = addUtcDays(signupDay, 1);
      const d7Date = addUtcDays(signupDay, 7);
      const d30Date = addUtcDays(signupDay, 30);
      const d1Key = toDateKey(d1Date);
      const d7Key = toDateKey(d7Date);
      const d30Key = toDateKey(d30Date);

      if (d1Date < nextDayStart) {
        summary.d1.eligible += 1;
        if (userActivity.has(d1Key)) summary.d1.retained += 1;
      }
      if (d7Date < nextDayStart) {
        summary.d7.eligible += 1;
        if (userActivity.has(d7Key)) summary.d7.retained += 1;
      }
      if (d30Date < nextDayStart) {
        summary.d30.eligible += 1;
        if (userActivity.has(d30Key)) summary.d30.retained += 1;
      }

      const cohortStart = startOfIsoWeek(signupDay);
      const cohortKey = toDateKey(cohortStart);
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, {
          cohortStart: cohortKey,
          size: 0,
          d7Eligible: 0,
          d7Retained: 0,
          d30Eligible: 0,
          d30Retained: 0,
        });
      }
      const cohort = cohorts.get(cohortKey);
      cohort.size += 1;
      if (d7Date < nextDayStart) {
        cohort.d7Eligible += 1;
        if (userActivity.has(d7Key)) cohort.d7Retained += 1;
      }
      if (d30Date < nextDayStart) {
        cohort.d30Eligible += 1;
        if (userActivity.has(d30Key)) cohort.d30Retained += 1;
      }
    }

    summary.d1.rate = percent(summary.d1.retained, summary.d1.eligible);
    summary.d7.rate = percent(summary.d7.retained, summary.d7.eligible);
    summary.d30.rate = percent(summary.d30.retained, summary.d30.eligible);

    const cohortRows = Array.from(cohorts.values())
      .sort((a, b) => (a.cohortStart < b.cohortStart ? 1 : -1))
      .slice(0, cohortLimit)
      .map((cohort) => ({
        cohortStart: cohort.cohortStart,
        size: cohort.size,
        d7Eligible: cohort.d7Eligible,
        d7Retained: cohort.d7Retained,
        d7Rate: percent(cohort.d7Retained, cohort.d7Eligible),
        d30Eligible: cohort.d30Eligible,
        d30Retained: cohort.d30Retained,
        d30Rate: percent(cohort.d30Retained, cohort.d30Eligible),
      }));

    res.json({
      summary,
      cohorts: cohortRows,
    });
  } catch (error) {
    console.error("Admin retention metrics error:", error);
    res.status(500).json({ error: "Failed to fetch retention metrics" });
  }
});

export default router;
