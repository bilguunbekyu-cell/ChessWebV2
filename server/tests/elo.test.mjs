import test from "node:test";
import assert from "node:assert/strict";
import {
  expectedScore,
  kFactor,
  normalizeResult,
  getRatingPoolForTimeControl,
  ratingFieldForPool,
  gamesFieldForPool,
  updateEloPair,
} from "../utils/elo.js";

/* ── expectedScore ── */
test("expectedScore returns 0.5 for equal ratings", () => {
  assert.equal(expectedScore(1500, 1500), 0.5);
});

test("expectedScore favors higher-rated player", () => {
  const score = expectedScore(1800, 1400);
  assert.ok(score > 0.5 && score < 1, `Expected > 0.5, got ${score}`);
});

test("expectedScore returns value between 0 and 1", () => {
  const score = expectedScore(2500, 800);
  assert.ok(score > 0 && score < 1);
});

/* ── kFactor ── */
test("kFactor returns 40 for new players", () => {
  assert.equal(kFactor(1200, 5), 40);
});

test("kFactor returns 20 for sub-2000 experienced players", () => {
  assert.equal(kFactor(1600, 50), 20);
});

test("kFactor returns 10 for 2000+ experienced players", () => {
  assert.equal(kFactor(2200, 30), 10);
});

/* ── normalizeResult ── */
test("normalizeResult returns 1/0 for white win", () => {
  assert.deepEqual(normalizeResult("w"), { white: 1, black: 0 });
});

test("normalizeResult returns 0/1 for black win", () => {
  assert.deepEqual(normalizeResult("b"), { white: 0, black: 1 });
});

test("normalizeResult returns 0.5/0.5 for draw", () => {
  assert.deepEqual(normalizeResult("draw"), { white: 0.5, black: 0.5 });
  assert.deepEqual(normalizeResult(null), { white: 0.5, black: 0.5 });
});

/* ── getRatingPoolForTimeControl ── */
test("getRatingPoolForTimeControl maps bullet", () => {
  assert.equal(
    getRatingPoolForTimeControl({ initial: 60, increment: 0 }),
    "bullet",
  );
});

test("getRatingPoolForTimeControl maps blitz", () => {
  assert.equal(
    getRatingPoolForTimeControl({ initial: 300, increment: 0 }),
    "blitz",
  );
});

test("getRatingPoolForTimeControl maps rapid", () => {
  assert.equal(
    getRatingPoolForTimeControl({ initial: 600, increment: 0 }),
    "rapid",
  );
});

test("getRatingPoolForTimeControl maps classical", () => {
  assert.equal(
    getRatingPoolForTimeControl({ initial: 1800, increment: 0 }),
    "classical",
  );
});

test("getRatingPoolForTimeControl accounts for increment", () => {
  // 60 + 2*40 = 140 < 180 → bullet
  assert.equal(
    getRatingPoolForTimeControl({ initial: 60, increment: 2 }),
    "bullet",
  );
  // 180 + 0*40 = 180 → blitz (≥ 180)
  assert.equal(
    getRatingPoolForTimeControl({ initial: 180, increment: 0 }),
    "blitz",
  );
});

/* ── ratingFieldForPool / gamesFieldForPool ── */
test("ratingFieldForPool returns correct field names", () => {
  assert.equal(ratingFieldForPool("bullet"), "bulletRating");
  assert.equal(ratingFieldForPool("blitz"), "blitzRating");
  assert.equal(ratingFieldForPool("rapid"), "rapidRating");
  assert.equal(ratingFieldForPool("classical"), "classicalRating");
});

test("gamesFieldForPool returns correct field names", () => {
  assert.equal(gamesFieldForPool("bullet"), "bulletGames");
  assert.equal(gamesFieldForPool("blitz"), "blitzGames");
  assert.equal(gamesFieldForPool("rapid"), "rapidGames");
  assert.equal(gamesFieldForPool("classical"), "classicalGames");
});

/* ── updateEloPair ── */
test("updateEloPair white win increases white rating, decreases black", () => {
  const result = updateEloPair({
    whiteRating: 1500,
    whiteGamesPlayed: 20,
    blackRating: 1500,
    blackGamesPlayed: 20,
    winnerColor: "w",
  });
  assert.ok(result.white.delta > 0, "White should gain rating");
  assert.ok(result.black.delta < 0, "Black should lose rating");
  assert.equal(result.white.score, 1);
  assert.equal(result.black.score, 0);
});

test("updateEloPair draw with equal ratings yields small deltas", () => {
  const result = updateEloPair({
    whiteRating: 1500,
    whiteGamesPlayed: 30,
    blackRating: 1500,
    blackGamesPlayed: 30,
    winnerColor: "draw",
  });
  assert.equal(result.white.delta, 0);
  assert.equal(result.black.delta, 0);
});

test("updateEloPair uses higher K-factor for new players", () => {
  const result = updateEloPair({
    whiteRating: 1200,
    whiteGamesPlayed: 3,
    blackRating: 1200,
    blackGamesPlayed: 50,
    winnerColor: "w",
  });
  assert.equal(result.white.kFactor, 40);
  assert.equal(result.black.kFactor, 20);
  // New player gains more than experienced player would
  assert.ok(result.white.delta > Math.abs(result.black.delta));
});

test("updateEloPair clamps ratings to [100, 4000]", () => {
  const result = updateEloPair({
    whiteRating: 3990,
    whiteGamesPlayed: 100,
    blackRating: 110,
    blackGamesPlayed: 100,
    winnerColor: "w",
  });
  assert.ok(result.white.newRating <= 4000);
  assert.ok(result.black.newRating >= 100);
});
