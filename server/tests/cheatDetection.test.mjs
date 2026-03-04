import test from "node:test";
import assert from "node:assert/strict";
import { __test } from "../services/cheatDetection.js";

function buildCleanGame(id) {
  const totalPlies = 30;
  const moves = Array.from({ length: totalPlies }, () => "e4");
  const analysis = [];
  for (let ply = 0; ply <= totalPlies; ply += 1) {
    analysis.push({ ply, cp: 40 });
  }

  const moveTimes = Array.from({ length: totalPlies }, (_, idx) =>
    idx % 2 === 0 ? 2.2 : 2.6,
  );

  return {
    _id: id,
    playAs: "white",
    moves,
    analysis,
    moveTimes,
  };
}

function buildNoisyGame(id) {
  const totalPlies = 30;
  const moves = Array.from({ length: totalPlies }, () => "e4");
  const analysis = [];
  for (let ply = 0; ply <= totalPlies; ply += 1) {
    const cp = ply % 4 === 0 ? 300 : ply % 3 === 0 ? -250 : 20;
    analysis.push({ ply, cp });
  }

  const moveTimes = Array.from(
    { length: totalPlies },
    (_, idx) => (idx % 2 === 0 ? 1 + (idx % 7) * 8 : 3 + (idx % 5) * 6),
  );

  return {
    _id: id,
    playAs: "white",
    moves,
    analysis,
    moveTimes,
  };
}

test("aggregateGames flags suspicious low-CPL low-variance profile", () => {
  const games = Array.from({ length: 12 }, (_, idx) =>
    buildCleanGame(`clean-${idx}`),
  );
  const result = __test.aggregateGames(games, 10);

  assert.equal(result.suspicious, true);
  assert.equal(result.metrics.gamesAnalyzed, 12);
  assert.ok(result.metrics.nearPerfectMoveRate >= 0.95);
  assert.ok(result.metrics.lowVarianceGameRate >= 0.8);
  assert.ok(result.metrics.suspicionScore >= 70);
});

test("aggregateGames does not flag noisy inconsistent profile", () => {
  const games = Array.from({ length: 12 }, (_, idx) =>
    buildNoisyGame(`noisy-${idx}`),
  );
  const result = __test.aggregateGames(games, 10);

  assert.equal(result.suspicious, false);
  assert.equal(result.metrics.gamesAnalyzed, 12);
  assert.ok(result.metrics.suspicionScore < 70);
});
