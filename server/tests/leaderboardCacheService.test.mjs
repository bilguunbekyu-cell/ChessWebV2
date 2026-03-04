import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultMinGames,
  shouldUseLeaderboardCache,
} from "../services/leaderboardCache.js";

test("getDefaultMinGames returns format defaults", () => {
  assert.equal(getDefaultMinGames(false), 10);
  assert.equal(getDefaultMinGames(true), 0);
});

test("shouldUseLeaderboardCache disables cache for friends scope", () => {
  assert.equal(
    shouldUseLeaderboardCache({
      scope: "friends",
      limit: 10,
      minGames: 10,
      includeProvisional: false,
    }),
    false,
  );
});

test("shouldUseLeaderboardCache requires default minGames per provisional mode", () => {
  assert.equal(
    shouldUseLeaderboardCache({
      scope: "global",
      limit: 10,
      minGames: 10,
      includeProvisional: false,
    }),
    true,
  );
  assert.equal(
    shouldUseLeaderboardCache({
      scope: "global",
      limit: 10,
      minGames: 0,
      includeProvisional: true,
    }),
    true,
  );
  assert.equal(
    shouldUseLeaderboardCache({
      scope: "global",
      limit: 10,
      minGames: 5,
      includeProvisional: true,
    }),
    false,
  );
});

test("shouldUseLeaderboardCache disables cache for oversized limit", () => {
  assert.equal(
    shouldUseLeaderboardCache({
      scope: "global",
      limit: 500,
      minGames: 10,
      includeProvisional: false,
    }),
    false,
  );
});
