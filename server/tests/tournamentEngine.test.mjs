import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRoundsPlanned,
  createPlayerStatsMap,
  generateRoundPairings,
  parseTimeControl,
} from "../utils/tournamentEngine.js";

function makePlayer(userId, seed, score = 0, buchholz = 0, hadBye = false) {
  return {
    userId,
    seed,
    score,
    buchholz,
    hadBye,
    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

test("parseTimeControl supports string and object formats", () => {
  const fromString = parseTimeControl("3+2");
  assert.equal(fromString.baseMs, 180000);
  assert.equal(fromString.incMs, 2000);
  assert.equal(fromString.label, "3+2");

  const fromObject = parseTimeControl({ initial: 300, increment: 5 });
  assert.equal(fromObject.baseMs, 300000);
  assert.equal(fromObject.incMs, 5000);
});

test("computeRoundsPlanned follows format defaults", () => {
  assert.equal(computeRoundsPlanned("roundRobin", 6), 5);
  assert.equal(computeRoundsPlanned("roundRobin", 7), 7);
  assert.equal(computeRoundsPlanned("knockout", 9), 4);
  assert.equal(computeRoundsPlanned("swiss", 16), 5);
  assert.equal(computeRoundsPlanned("swiss", 10, 7), 7);
  assert.equal(computeRoundsPlanned("swiss", 2, 4), 4);
});

test("createPlayerStatsMap computes swiss score and buchholz", () => {
  const players = [
    makePlayer("A", 1),
    makePlayer("B", 2),
    makePlayer("C", 3),
    makePlayer("D", 4),
  ];
  const games = [
    { whiteId: "A", blackId: "B", result: "1-0", isBye: false },
    { whiteId: "C", blackId: "D", result: "1/2-1/2", isBye: false },
    { whiteId: "A", blackId: "C", result: "0-1", isBye: false },
    { whiteId: "B", blackId: "D", result: "1-0", isBye: false },
  ];

  const stats = createPlayerStatsMap(players, games, "swiss");

  assert.equal(stats.get("A").score, 1);
  assert.equal(stats.get("B").score, 1);
  assert.equal(stats.get("C").score, 1.5);
  assert.equal(stats.get("D").score, 0.5);

  // A played B(1) + C(1.5) => 2.5
  assert.equal(stats.get("A").buchholz, 2.5);
  // D played C(1.5) + B(1) => 2.5
  assert.equal(stats.get("D").buchholz, 2.5);
});

test("generateRoundPairings swiss avoids rematches when possible", () => {
  const players = [
    makePlayer("A", 1, 1),
    makePlayer("B", 2, 1),
    makePlayer("C", 3, 1),
    makePlayer("D", 4, 1),
  ];
  const roundOneGames = [
    { whiteId: "A", blackId: "B", result: "1-0", roundNumber: 1 },
    { whiteId: "C", blackId: "D", result: "1-0", roundNumber: 1 },
  ];

  const roundTwoPairings = generateRoundPairings({
    tournamentType: "swiss",
    players,
    games: roundOneGames,
    roundNumber: 2,
  });

  assert.equal(roundTwoPairings.length, 2);
  const pairs = roundTwoPairings.map((pairing) =>
    [pairing.whiteId, pairing.blackId].sort().join(":"),
  );
  assert.ok(!pairs.includes("A:B"));
  assert.ok(!pairs.includes("C:D"));
});

test("generateRoundPairings round-robin emits bye for odd count", () => {
  const players = [makePlayer("A", 1), makePlayer("B", 2), makePlayer("C", 3)];
  const roundOne = generateRoundPairings({
    tournamentType: "roundRobin",
    players,
    games: [],
    roundNumber: 1,
  });

  assert.equal(roundOne.length, 2);
  assert.ok(roundOne.some((game) => game.isBye === true));
});

test("generateRoundPairings knockout creates byes to next power of 2", () => {
  const players = [
    makePlayer("A", 1),
    makePlayer("B", 2),
    makePlayer("C", 3),
    makePlayer("D", 4),
    makePlayer("E", 5),
  ];
  const roundOne = generateRoundPairings({
    tournamentType: "knockout",
    players,
    games: [],
    roundNumber: 1,
  });

  // next power of 2 = 8 => 4 first-round matches total
  assert.equal(roundOne.length, 4);
  assert.ok(roundOne.some((game) => game.isBye === true));
});
