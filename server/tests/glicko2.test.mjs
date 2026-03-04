import test from "node:test";
import assert from "node:assert/strict";
import {
  updateGlickoPair,
  rdFieldForPool,
  volatilityFieldForPool,
  lastRatedAtFieldForPool,
  DEFAULT_GLICKO_RD,
  DEFAULT_GLICKO_VOLATILITY,
} from "../utils/glicko2.js";

/* ── Helper field mappers ── */
test("rdFieldForPool returns correct field names", () => {
  assert.equal(rdFieldForPool("bullet"), "bulletRd");
  assert.equal(rdFieldForPool("blitz"), "blitzRd");
  assert.equal(rdFieldForPool("rapid"), "rapidRd");
  assert.equal(rdFieldForPool("classical"), "classicalRd");
});

test("volatilityFieldForPool returns correct field names", () => {
  assert.equal(volatilityFieldForPool("bullet"), "bulletVolatility");
  assert.equal(volatilityFieldForPool("rapid"), "rapidVolatility");
});

test("lastRatedAtFieldForPool returns correct field names", () => {
  assert.equal(lastRatedAtFieldForPool("blitz"), "blitzLastRatedAt");
  assert.equal(lastRatedAtFieldForPool("classical"), "classicalLastRatedAt");
});

test("DEFAULT_GLICKO_RD is 350", () => {
  assert.equal(DEFAULT_GLICKO_RD, 350);
});

test("DEFAULT_GLICKO_VOLATILITY is 0.06", () => {
  assert.equal(DEFAULT_GLICKO_VOLATILITY, 0.06);
});

/* ── updateGlickoPair ── */
test("white win increases white rating, decreases black", () => {
  const result = updateGlickoPair({
    whiteRating: 1500,
    whiteRd: 200,
    whiteVolatility: 0.06,
    whiteLastRatedAt: null,
    blackRating: 1500,
    blackRd: 200,
    blackVolatility: 0.06,
    blackLastRatedAt: null,
    winnerColor: "w",
    now: new Date(),
  });

  assert.ok(result.white.delta > 0, "White should gain rating");
  assert.ok(result.black.delta < 0, "Black should lose rating");
});

test("draw with equal ratings yields near-zero deltas", () => {
  const result = updateGlickoPair({
    whiteRating: 1500,
    whiteRd: 100,
    whiteVolatility: 0.06,
    whiteLastRatedAt: null,
    blackRating: 1500,
    blackRd: 100,
    blackVolatility: 0.06,
    blackLastRatedAt: null,
    winnerColor: "draw",
    now: new Date(),
  });

  assert.ok(
    Math.abs(result.white.delta) <= 1,
    `White delta close to 0, got ${result.white.delta}`,
  );
  assert.ok(
    Math.abs(result.black.delta) <= 1,
    `Black delta close to 0, got ${result.black.delta}`,
  );
});

test("high RD player has larger rating change than low RD player", () => {
  const result = updateGlickoPair({
    whiteRating: 1500,
    whiteRd: 350,
    whiteVolatility: 0.06,
    whiteLastRatedAt: null,
    blackRating: 1500,
    blackRd: 50,
    blackVolatility: 0.06,
    blackLastRatedAt: null,
    winnerColor: "w",
    now: new Date(),
  });

  assert.ok(
    Math.abs(result.white.delta) > Math.abs(result.black.delta),
    "High-RD player should move more",
  );
});

test("RD decreases after a game", () => {
  const result = updateGlickoPair({
    whiteRating: 1500,
    whiteRd: 200,
    whiteVolatility: 0.06,
    whiteLastRatedAt: null,
    blackRating: 1500,
    blackRd: 200,
    blackVolatility: 0.06,
    blackLastRatedAt: null,
    winnerColor: "w",
    now: new Date(),
  });

  assert.ok(
    result.white.newRd < result.white.rdBefore,
    "White RD should decrease",
  );
  assert.ok(
    result.black.newRd < result.black.rdBefore,
    "Black RD should decrease",
  );
});

test("ratings stay within [100, 4000] bounds", () => {
  const result = updateGlickoPair({
    whiteRating: 3950,
    whiteRd: 350,
    whiteVolatility: 0.06,
    whiteLastRatedAt: null,
    blackRating: 150,
    blackRd: 350,
    blackVolatility: 0.06,
    blackLastRatedAt: null,
    winnerColor: "w",
    now: new Date(),
  });

  assert.ok(result.white.newRating <= 4000);
  assert.ok(result.black.newRating >= 100);
});
