import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayerStatsMap,
  generateRoundPairings,
  sortStandings,
} from "../utils/tournamentEngine.js";

function makePlayer(userId, seed) {
  return {
    userId,
    seed,
    score: 0,
    buchholz: 0,
    gamesPlayed: 0,
    hadBye: false,
    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function applyStats(players, statsMap) {
  return players.map((player) => {
    const stats = statsMap.get(player.userId);
    return {
      ...player,
      score: stats?.score ?? 0,
      buchholz: stats?.buchholz ?? 0,
      gamesPlayed: stats?.gamesPlayed ?? 0,
      hadBye: stats?.hadBye ?? false,
    };
  });
}

function withResult(game, result) {
  return {
    ...game,
    result,
    liveStatus: "completed",
    finishedAt: new Date("2026-01-01T00:10:00.000Z"),
  };
}

test("swiss lifecycle: start -> report all results -> pair next round", () => {
  const registeredPlayers = [
    makePlayer("P1", 1),
    makePlayer("P2", 2),
    makePlayer("P3", 3),
    makePlayer("P4", 4),
  ];

  const roundOnePairings = generateRoundPairings({
    tournamentType: "swiss",
    players: registeredPlayers,
    games: [],
    roundNumber: 1,
  });

  assert.equal(roundOnePairings.length, 2);
  assert.ok(roundOnePairings.every((game) => game.liveStatus === "pending"));
  assert.ok(roundOnePairings.every((game) => game.result === "*"));

  const roundOneFinished = [
    withResult(roundOnePairings[0], "1-0"),
    withResult(roundOnePairings[1], "0-1"),
  ];
  const roundOneStats = createPlayerStatsMap(
    registeredPlayers,
    roundOneFinished,
    "swiss",
  );
  const playersAfterRoundOne = applyStats(registeredPlayers, roundOneStats);

  const roundTwoPairings = generateRoundPairings({
    tournamentType: "swiss",
    players: playersAfterRoundOne,
    games: roundOneFinished,
    roundNumber: 2,
  });

  assert.equal(roundTwoPairings.length, 2);
  assert.ok(roundTwoPairings.every((game) => game.result === "*"));

  const roundOnePairs = new Set(
    roundOneFinished.map((game) => [game.whiteId, game.blackId].sort().join(":")),
  );
  const roundTwoPairs = roundTwoPairings.map((game) =>
    [game.whiteId, game.blackId].sort().join(":"),
  );
  assert.ok(roundTwoPairs.every((pair) => !roundOnePairs.has(pair)));

  const roundTwoFinished = [
    withResult(roundTwoPairings[0], "1/2-1/2"),
    withResult(roundTwoPairings[1], "1-0"),
  ];
  const allFinishedGames = [...roundOneFinished, ...roundTwoFinished];
  const finalStats = createPlayerStatsMap(
    registeredPlayers,
    allFinishedGames,
    "swiss",
  );
  const finalPlayers = applyStats(registeredPlayers, finalStats);
  const standings = sortStandings(finalPlayers);

  assert.equal(standings.length, 4);
  assert.ok(standings[0].score >= standings[1].score);
  assert.ok(standings.every((player) => player.gamesPlayed === 2));
});

