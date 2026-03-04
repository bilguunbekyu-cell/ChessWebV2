import { CheatReport, History } from "../models/index.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function evalToExpectedPoints(cp, mate, mover = "w") {
  if (mate !== undefined && mate !== null) {
    const m = safeNumber(mate, 0);
    if (m === 0) return 0.99;
    const whiteWins = m > 0;
    return mover === "w" ? (whiteWins ? 0.99 : 0.01) : whiteWins ? 0.01 : 0.99;
  }

  if (cp === undefined || cp === null) return 0.5;
  const rawCp = safeNumber(cp, 0);
  const povCp = mover === "w" ? rawCp : -rawCp;
  const clampedCp = clamp(povCp, -1200, 1200);
  return 1 / (1 + Math.exp(-0.004 * clampedCp));
}

function expectedPointsToCp(ep) {
  const p = clamp(safeNumber(ep, 0.5), 0.01, 0.99);
  return Math.log(p / (1 - p)) / 0.004;
}

function inferTimeUnit(values) {
  if (!values.length) return "sec";
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median > 100 ? "ms" : "sec";
}

function normalizeTimesToSeconds(times) {
  if (!times.length) return [];
  const unit = inferTimeUnit(times);
  return times
    .map((value) => (unit === "ms" ? value / 1000 : value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 600);
}

function analyzeSingleGame(game) {
  const totalPlies = Array.isArray(game.moves) ? game.moves.length : 0;
  if (totalPlies < 8) {
    return {
      gameId: String(game._id),
      analyzedMoves: 0,
      nearPerfectMoves: 0,
      strongMoves: 0,
      blunders: 0,
      avgCentipawnLoss: 0,
      avgEpLoss: 0,
      timingAvailable: false,
      avgMoveTimeSec: 0,
      moveTimeStdSec: 0,
      lowVarianceTiming: false,
      criticalWindowRate: 0,
    };
  }

  const playerColor = game.playAs === "black" ? "b" : "w";
  const analysisByPly = new Map();
  for (const entry of Array.isArray(game.analysis) ? game.analysis : []) {
    const ply = Number.parseInt(String(entry?.ply), 10);
    if (!Number.isFinite(ply) || ply < 0) continue;
    analysisByPly.set(ply, {
      cp: entry?.cp,
      mate: entry?.mate,
    });
  }

  const cpLosses = [];
  const epLosses = [];
  let nearPerfectMoves = 0;
  let strongMoves = 0;
  let blunders = 0;

  for (let ply = 1; ply <= totalPlies; ply += 1) {
    const mover = ply % 2 === 1 ? "w" : "b";
    if (mover !== playerColor) continue;

    const before = analysisByPly.get(ply - 1);
    const after = analysisByPly.get(ply);
    if (!after) continue;

    const epBefore = evalToExpectedPoints(before?.cp, before?.mate, mover);
    const epAfter = evalToExpectedPoints(after.cp, after.mate, mover);
    const epLoss = Math.max(0, epBefore - epAfter);
    const cpBefore = expectedPointsToCp(epBefore);
    const cpAfter = expectedPointsToCp(epAfter);
    const cpLoss = Math.max(0, cpBefore - cpAfter);

    epLosses.push(epLoss);
    cpLosses.push(cpLoss);

    if (epLoss <= 0.015) nearPerfectMoves += 1;
    if (epLoss <= 0.03) strongMoves += 1;
    if (epLoss >= 0.2) blunders += 1;
  }

  const playerTimesRaw = [];
  const moveTimes = Array.isArray(game.moveTimes) ? game.moveTimes : [];
  for (
    let index = playerColor === "w" ? 0 : 1;
    index < moveTimes.length;
    index += 2
  ) {
    const value = safeNumber(moveTimes[index], NaN);
    if (!Number.isFinite(value)) continue;
    playerTimesRaw.push(value);
  }

  const playerTimesSec = normalizeTimesToSeconds(playerTimesRaw);
  const avgMoveTimeSec = mean(playerTimesSec);
  const moveTimeStdSec = stdDev(playerTimesSec);
  const coeffVar =
    avgMoveTimeSec > 0 ? moveTimeStdSec / Math.max(0.001, avgMoveTimeSec) : 0;
  const criticalWindowCount = playerTimesSec.filter(
    (seconds) => seconds >= 1.5 && seconds <= 3.5,
  ).length;
  const criticalWindowRate =
    playerTimesSec.length > 0 ? criticalWindowCount / playerTimesSec.length : 0;
  const lowVarianceTiming =
    playerTimesSec.length >= 10 &&
    avgMoveTimeSec >= 1.5 &&
    avgMoveTimeSec <= 8 &&
    coeffVar <= 0.35;

  return {
    gameId: String(game._id),
    analyzedMoves: epLosses.length,
    nearPerfectMoves,
    strongMoves,
    blunders,
    avgCentipawnLoss: mean(cpLosses),
    avgEpLoss: mean(epLosses),
    timingAvailable: playerTimesSec.length >= 6,
    avgMoveTimeSec,
    moveTimeStdSec,
    lowVarianceTiming,
    criticalWindowRate,
  };
}

function aggregateGames(games, minAnalyzedGames = 10) {
  const perGame = games.map(analyzeSingleGame);
  const analyzedGames = perGame.filter((game) => game.analyzedMoves >= 6);
  const timedGames = analyzedGames.filter((game) => game.timingAvailable);

  const totalMoves = analyzedGames.reduce(
    (sum, game) => sum + game.analyzedMoves,
    0,
  );
  const nearPerfectMoves = analyzedGames.reduce(
    (sum, game) => sum + game.nearPerfectMoves,
    0,
  );
  const strongMoves = analyzedGames.reduce(
    (sum, game) => sum + game.strongMoves,
    0,
  );
  const blunders = analyzedGames.reduce((sum, game) => sum + game.blunders, 0);

  const nearPerfectMoveRate = totalMoves > 0 ? nearPerfectMoves / totalMoves : 0;
  const strongMoveRate = totalMoves > 0 ? strongMoves / totalMoves : 0;
  const blunderRate = totalMoves > 0 ? blunders / totalMoves : 0;
  const avgCentipawnLoss = mean(
    analyzedGames.map((game) => game.avgCentipawnLoss),
  );

  const avgMoveTimeSec = mean(timedGames.map((game) => game.avgMoveTimeSec));
  const avgMoveTimeStdSec = mean(timedGames.map((game) => game.moveTimeStdSec));
  const lowVarianceGameRate =
    timedGames.length > 0
      ? timedGames.filter((game) => game.lowVarianceTiming).length /
        timedGames.length
      : 0;
  const criticalWindowRate = mean(
    timedGames.map((game) => game.criticalWindowRate),
  );

  let suspicionScore = 0;
  if (nearPerfectMoveRate >= 0.9) suspicionScore += 45;
  else if (nearPerfectMoveRate >= 0.84) suspicionScore += 30;
  else if (nearPerfectMoveRate >= 0.78) suspicionScore += 15;

  if (avgCentipawnLoss <= 18) suspicionScore += 25;
  else if (avgCentipawnLoss <= 26) suspicionScore += 15;
  else if (avgCentipawnLoss <= 35) suspicionScore += 5;

  if (lowVarianceGameRate >= 0.7) suspicionScore += 20;
  else if (lowVarianceGameRate >= 0.5) suspicionScore += 10;

  if (criticalWindowRate >= 0.45) suspicionScore += 10;
  else if (criticalWindowRate >= 0.3) suspicionScore += 5;

  if (blunderRate <= 0.02) suspicionScore += 10;
  else if (blunderRate <= 0.04) suspicionScore += 5;

  suspicionScore = clamp(Math.round(suspicionScore), 0, 100);

  const enoughGames = analyzedGames.length >= minAnalyzedGames;
  const suspiciousAccuracy =
    nearPerfectMoveRate >= 0.84 && avgCentipawnLoss <= 26;
  const suspiciousTiming = lowVarianceGameRate >= 0.55 || criticalWindowRate >= 0.4;
  const suspicious =
    enoughGames &&
    suspicionScore >= 70 &&
    suspiciousAccuracy &&
    suspiciousTiming;

  const riskLevel =
    suspicionScore >= 85 ? "high" : suspicionScore >= 70 ? "medium" : "low";

  const flags = [];
  if (nearPerfectMoveRate >= 0.9) flags.push("Near-perfect move rate is extremely high.");
  else if (nearPerfectMoveRate >= 0.84)
    flags.push("Near-perfect move rate is unusually high.");
  if (avgCentipawnLoss <= 18)
    flags.push("Estimated centipawn loss is exceptionally low.");
  else if (avgCentipawnLoss <= 26)
    flags.push("Estimated centipawn loss is unusually low.");
  if (lowVarianceGameRate >= 0.7)
    flags.push("Move-time variance is low across many games.");
  else if (lowVarianceGameRate >= 0.5)
    flags.push("Move-time variance pattern is suspicious.");
  if (criticalWindowRate >= 0.45)
    flags.push("Atypical concentration of moves in narrow time windows.");
  if (!enoughGames)
    flags.push(
      `Not enough analyzed games for strong confidence (need ${minAnalyzedGames}+).`,
    );

  const rankedGames = analyzedGames
    .map((game) => ({
      ...game,
      score:
        (game.avgCentipawnLoss <= 26 ? 1 : 0) +
        (game.analyzedMoves > 0
          ? game.nearPerfectMoves / game.analyzedMoves >= 0.84
            ? 1
            : 0
          : 0) +
        (game.lowVarianceTiming ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return {
    suspicious,
    riskLevel,
    flags,
    gameIds: rankedGames.map((game) => game.gameId),
    metrics: {
      gamesConsidered: games.length,
      gamesAnalyzed: analyzedGames.length,
      movesAnalyzed: totalMoves,
      bestMoveMatchRate: null,
      top3MatchRate: null,
      avgCentipawnLoss: Number(avgCentipawnLoss.toFixed(2)),
      nearPerfectMoveRate: Number(nearPerfectMoveRate.toFixed(4)),
      strongMoveRate: Number(strongMoveRate.toFixed(4)),
      blunderRate: Number(blunderRate.toFixed(4)),
      avgMoveTimeSec: Number(avgMoveTimeSec.toFixed(2)),
      avgMoveTimeStdSec: Number(avgMoveTimeStdSec.toFixed(2)),
      lowVarianceGameRate: Number(lowVarianceGameRate.toFixed(4)),
      criticalWindowRate: Number(criticalWindowRate.toFixed(4)),
      suspicionScore,
      riskLevel,
    },
    dataGaps: {
      bestMoveUnavailable: true,
      top3Unavailable: true,
      notes: [
        "bestMove/top3 match rate cannot be computed from stored history yet.",
      ],
    },
  };
}

export async function scanUserHistoryForCheat(userId, options = {}) {
  const minGames = Math.max(3, Number.parseInt(String(options.minGames || "10"), 10) || 10);
  const maxGames = Math.min(
    100,
    Math.max(10, Number.parseInt(String(options.maxGames || "40"), 10) || 40),
  );

  const games = await History.find({
    userId,
    rated: true,
  })
    .sort({ createdAt: -1 })
    .limit(maxGames)
    .select("moves analysis moveTimes playAs rated createdAt")
    .lean();

  if (games.length < minGames) {
    return {
      eligible: false,
      reason: `Not enough rated games to scan (required: ${minGames}).`,
      suspicious: false,
      reportPayload: null,
    };
  }

  const summary = aggregateGames(games, minGames);
  return {
    eligible: true,
    suspicious: summary.suspicious,
    reason: summary.suspicious ? null : "Heuristic thresholds not met.",
    reportPayload: {
      userId,
      gameIds: summary.gameIds,
      metrics: summary.metrics,
      flags: summary.flags,
      dataGaps: summary.dataGaps,
    },
  };
}

export async function scanUserAndCreateCheatReport(userId, options = {}) {
  const source = String(options.source || "manual_scan")
    .trim()
    .toLowerCase();
  const normalizedSource =
    source === "batch_scan" || source === "auto_scan" ? source : "manual_scan";

  const scanResult = await scanUserHistoryForCheat(userId, options);
  if (!scanResult.eligible || !scanResult.suspicious || !scanResult.reportPayload) {
    return {
      created: false,
      report: null,
      ...scanResult,
    };
  }

  const recentReport = await CheatReport.findOne({
    userId,
    status: "pending",
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();
  if (recentReport) {
    return {
      created: false,
      report: recentReport,
      eligible: true,
      suspicious: true,
      reason: "Recent pending report already exists.",
      reportPayload: scanResult.reportPayload,
    };
  }

  const report = await CheatReport.create({
    ...scanResult.reportPayload,
    source: normalizedSource,
    status: "pending",
    reviewAction: "none",
  });

  return {
    created: true,
    report,
    ...scanResult,
  };
}

export const __test = {
  evalToExpectedPoints,
  expectedPointsToCp,
  normalizeTimesToSeconds,
  analyzeSingleGame,
  aggregateGames,
};
