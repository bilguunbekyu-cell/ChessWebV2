import { LeaderboardCache, User } from "../models/index.js";
import { gamesFieldForPool, ratingFieldForPool } from "../utils/elo.js";

const VALID_POOLS = new Set(["bullet", "blitz", "rapid", "classical"]);
const DEFAULT_CACHE_LIMIT = 200;
const DEFAULT_CACHE_TTL_MS = Number.parseInt(
  String(process.env.LEADERBOARD_CACHE_TTL_MS || ""),
  10,
) || 5 * 60 * 1000;
const DEFAULT_REFRESH_INTERVAL_MS = Number.parseInt(
  String(process.env.LEADERBOARD_CACHE_REFRESH_MS || ""),
  10,
) || 5 * 60 * 1000;

let refreshTimer = null;

function normalizePool(value) {
  const pool = String(value || "")
    .trim()
    .toLowerCase();
  return VALID_POOLS.has(pool) ? pool : null;
}

function toSafeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function getDefaultMinGames(includeProvisional) {
  return includeProvisional ? 0 : 10;
}

export function shouldUseLeaderboardCache({
  scope,
  limit,
  minGames,
  includeProvisional,
  maxCacheLimit = DEFAULT_CACHE_LIMIT,
}) {
  if (String(scope || "").trim().toLowerCase() === "friends") return false;
  const safeLimit = Math.max(1, toSafeInt(limit, 100));
  if (safeLimit > maxCacheLimit) return false;
  const safeMinGames = Math.max(0, toSafeInt(minGames, 10));
  return safeMinGames === getDefaultMinGames(includeProvisional);
}

function mapLeaderboardEntry(user, index, ratingField, gamesField) {
  const games = Number(user?.[gamesField] ?? 0);
  return {
    rank: index + 1,
    id: String(user._id),
    name: String(user.fullName || "Player"),
    avatar: String(user.avatar || ""),
    rating: Number(user?.[ratingField] ?? user.rating ?? 1200),
    games,
    isProvisional: games < 10,
  };
}

async function buildLeaderboardEntries({
  pool,
  includeProvisional,
  minGames,
  limit = DEFAULT_CACHE_LIMIT,
}) {
  const normalizedPool = normalizePool(pool);
  if (!normalizedPool) {
    throw new Error("Invalid pool");
  }

  const safeLimit = Math.min(
    DEFAULT_CACHE_LIMIT,
    Math.max(1, toSafeInt(limit, DEFAULT_CACHE_LIMIT)),
  );
  const safeMinGames = Math.max(
    0,
    Number.isFinite(Number(minGames))
      ? Number(minGames)
      : getDefaultMinGames(includeProvisional),
  );
  const ratingField = ratingFieldForPool(normalizedPool);
  const gamesField = gamesFieldForPool(normalizedPool);

  const users = await User.find({
    deletedAt: null,
    [gamesField]: { $gte: safeMinGames },
  })
    .sort({ [ratingField]: -1, [gamesField]: -1, fullName: 1 })
    .limit(safeLimit)
    .select(`fullName avatar ${ratingField} ${gamesField}`)
    .lean();

  const entries = users.map((user, index) =>
    mapLeaderboardEntry(user, index, ratingField, gamesField),
  );
  return {
    pool: normalizedPool,
    includeProvisional: !!includeProvisional,
    minGames: safeMinGames,
    entries,
    total: entries.length,
    limit: safeLimit,
  };
}

export async function refreshLeaderboardCacheEntry({
  pool,
  includeProvisional = false,
  minGames = null,
  limit = DEFAULT_CACHE_LIMIT,
}) {
  const normalizedPool = normalizePool(pool);
  if (!normalizedPool) throw new Error("Invalid pool");
  const effectiveMinGames = Number.isFinite(Number(minGames))
    ? Math.max(0, Number(minGames))
    : getDefaultMinGames(includeProvisional);

  const built = await buildLeaderboardEntries({
    pool: normalizedPool,
    includeProvisional: !!includeProvisional,
    minGames: effectiveMinGames,
    limit,
  });
  const now = new Date();

  const doc = await LeaderboardCache.findOneAndUpdate(
    {
      pool: built.pool,
      includeProvisional: built.includeProvisional,
      minGames: built.minGames,
    },
    {
      $set: {
        entries: built.entries,
        total: built.total,
        refreshedAt: now,
      },
    },
    { upsert: true, new: true },
  ).lean();

  return {
    pool: built.pool,
    includeProvisional: built.includeProvisional,
    minGames: built.minGames,
    total: Number(doc?.total || built.total || 0),
    entries: Array.isArray(doc?.entries) ? doc.entries : built.entries,
    refreshedAt: doc?.refreshedAt || now,
  };
}

export async function getCachedLeaderboard({
  pool,
  includeProvisional = false,
  minGames = null,
  limit = 100,
  maxAgeMs = DEFAULT_CACHE_TTL_MS,
}) {
  const normalizedPool = normalizePool(pool);
  if (!normalizedPool) return null;
  const safeLimit = Math.max(1, toSafeInt(limit, 100));
  const effectiveMinGames = Number.isFinite(Number(minGames))
    ? Math.max(0, Number(minGames))
    : getDefaultMinGames(includeProvisional);

  const cacheDoc = await LeaderboardCache.findOne({
    pool: normalizedPool,
    includeProvisional: !!includeProvisional,
    minGames: effectiveMinGames,
  }).lean();

  if (!cacheDoc) return null;
  const refreshedAt = new Date(cacheDoc.refreshedAt || cacheDoc.updatedAt || 0);
  const ageMs = Date.now() - refreshedAt.getTime();
  if (Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && ageMs > maxAgeMs) {
    return null;
  }

  const entries = Array.isArray(cacheDoc.entries)
    ? cacheDoc.entries.slice(0, safeLimit)
    : [];
  return {
    pool: normalizedPool,
    includeProvisional: !!includeProvisional,
    minGames: effectiveMinGames,
    entries,
    total: Number(cacheDoc.total || 0),
    refreshedAt,
    ageMs,
  };
}

export async function refreshAllLeaderboardCaches({
  pools = ["bullet", "blitz", "rapid", "classical"],
  includeProvisionalValues = [false, true],
  limit = DEFAULT_CACHE_LIMIT,
} = {}) {
  const normalizedPools = pools
    .map((pool) => normalizePool(pool))
    .filter(Boolean);
  const uniquePools = [...new Set(normalizedPools)];
  const results = [];

  for (const pool of uniquePools) {
    for (const includeProvisional of includeProvisionalValues) {
      try {
        const refreshed = await refreshLeaderboardCacheEntry({
          pool,
          includeProvisional: !!includeProvisional,
          minGames: getDefaultMinGames(!!includeProvisional),
          limit,
        });
        results.push({
          pool,
          includeProvisional: !!includeProvisional,
          ok: true,
          total: refreshed.total,
          refreshedAt: refreshed.refreshedAt,
        });
      } catch (error) {
        results.push({
          pool,
          includeProvisional: !!includeProvisional,
          ok: false,
          error: error?.message || "refresh_failed",
        });
      }
    }
  }

  const okCount = results.filter((item) => item.ok).length;
  return {
    ok: okCount === results.length,
    okCount,
    failCount: results.length - okCount,
    results,
  };
}

export async function runLeaderboardRefreshCycle() {
  const summary = await refreshAllLeaderboardCaches();
  if (!summary.ok) {
    const failed = summary.results
      .filter((item) => !item.ok)
      .map((item) => `${item.pool}/${item.includeProvisional ? "prov" : "std"}:${item.error}`)
      .join(", ");
    throw new Error(`Leaderboard cache refresh failed: ${failed}`);
  }
  return summary;
}

export function startLeaderboardCacheRefreshScheduler({
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
} = {}) {
  const configuredInterval = toSafeInt(intervalMs, DEFAULT_REFRESH_INTERVAL_MS);
  if (configuredInterval <= 0) return null;
  const safeInterval = Math.max(10_000, configuredInterval);
  if (refreshTimer) return refreshTimer;

  void runLeaderboardRefreshCycle().catch((error) => {
    console.error("Leaderboard cache initial refresh error:", error);
  });

  refreshTimer = setInterval(() => {
    void runLeaderboardRefreshCycle().catch((error) => {
      console.error("Leaderboard cache scheduled refresh error:", error);
    });
  }, safeInterval);

  if (typeof refreshTimer.unref === "function") {
    refreshTimer.unref();
  }

  return refreshTimer;
}

export function stopLeaderboardCacheRefreshScheduler() {
  if (!refreshTimer) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
}
