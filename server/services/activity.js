import { UserActivity } from "../models/index.js";

function toUtcDateParts(input = new Date()) {
  const date = new Date(input);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const dateKey = `${year}-${month}-${day}`;
  const dayStart = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  return { dateKey, dayStart, date };
}

function safeInt(value, fallback = 0) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function recordUserActivity({
  userId,
  at = new Date(),
  eventCount = 1,
  loginCount = 0,
  gamesPlayed = 0,
  movesPlayed = 0,
  timeSpentSec = 0,
  puzzlesAttempted = 0,
}) {
  if (!userId) return null;
  const { dateKey, dayStart, date } = toUtcDateParts(at);

  const inc = {
    eventCount: Math.max(0, safeInt(eventCount, 0)),
    loginCount: Math.max(0, safeInt(loginCount, 0)),
    gamesPlayed: Math.max(0, safeInt(gamesPlayed, 0)),
    movesPlayed: Math.max(0, safeInt(movesPlayed, 0)),
    timeSpentSec: Math.max(0, safeNumber(timeSpentSec, 0)),
    puzzlesAttempted: Math.max(0, safeInt(puzzlesAttempted, 0)),
  };

  return UserActivity.findOneAndUpdate(
    { userId, dateKey },
    {
      $setOnInsert: {
        userId,
        dateKey,
        date: dayStart,
      },
      $set: {
        lastSeenAt: date,
      },
      $inc: inc,
    },
    { upsert: true, new: true },
  );
}

export async function recordUserLogin(userId, at = new Date()) {
  return recordUserActivity({
    userId,
    at,
    eventCount: 1,
    loginCount: 1,
  });
}

export async function recordUserGameActivity(
  userId,
  {
    at = new Date(),
    movesPlayed = 0,
    durationMs = 0,
    gamesPlayed = 1,
  } = {},
) {
  return recordUserActivity({
    userId,
    at,
    eventCount: 1,
    gamesPlayed: Math.max(0, safeInt(gamesPlayed, 1)),
    movesPlayed: Math.max(0, safeInt(movesPlayed, 0)),
    timeSpentSec: Math.max(0, safeNumber(durationMs, 0) / 1000),
  });
}

export async function recordUserPuzzleActivity(userId, at = new Date()) {
  return recordUserActivity({
    userId,
    at,
    eventCount: 1,
    puzzlesAttempted: 1,
  });
}

export function toUtcDateKey(input = new Date()) {
  return toUtcDateParts(input).dateKey;
}
