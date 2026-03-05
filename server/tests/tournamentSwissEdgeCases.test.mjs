import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayerStatsMap,
  generateRoundPairings,
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

function completeRound(games, resolver) {
  return games.map((game, index) => {
    if (game.isBye || !game.blackId) {
      return {
        ...game,
        result: "1-0",
        liveStatus: "completed",
      };
    }
    const result = resolver(game, index);
    return {
      ...game,
      result,
      liveStatus: "completed",
    };
  });
}

function applyStats(players, games) {
  const statsMap = createPlayerStatsMap(players, games, "swiss");
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

function pairKey(game) {
  return [String(game.whiteId || ""), String(game.blackId || "")]
    .sort()
    .join(":");
}

test("swiss assigns exactly one bye per odd round and avoids repeat bye when possible", () => {
  const players = Array.from({ length: 9 }, (_, index) =>
    makePlayer(`P${index + 1}`, index + 1),
  );

  const roundOnePairings = generateRoundPairings({
    tournamentType: "swiss",
    players,
    games: [],
    roundNumber: 1,
  });

  const roundOneByes = roundOnePairings.filter((game) => game.isBye);
  assert.equal(roundOneByes.length, 1);
  const roundOneByePlayer = String(roundOneByes[0].whiteId);

  const roundOneFinished = completeRound(roundOnePairings, (_game, index) =>
    index % 2 === 0 ? "1-0" : "0-1",
  );
  const playersAfterRoundOne = applyStats(players, roundOneFinished);

  const roundTwoPairings = generateRoundPairings({
    tournamentType: "swiss",
    players: playersAfterRoundOne,
    games: roundOneFinished,
    roundNumber: 2,
  });

  const roundTwoByes = roundTwoPairings.filter((game) => game.isBye);
  assert.equal(roundTwoByes.length, 1);
  const roundTwoByePlayer = String(roundTwoByes[0].whiteId);

  // With 9 players, a second round bye should go to a different player.
  assert.notEqual(roundTwoByePlayer, roundOneByePlayer);
});

test("swiss balances colors in forced rematch scenarios", () => {
  const players = [makePlayer("A", 1), makePlayer("B", 2)];
  const roundOneGames = [
    {
      roundNumber: 1,
      matchIndex: 0,
      whiteId: "A",
      blackId: "B",
      result: "1-0",
      liveStatus: "completed",
      isBye: false,
    },
  ];

  const playersAfterRoundOne = applyStats(players, roundOneGames);
  const roundTwoPairings = generateRoundPairings({
    tournamentType: "swiss",
    players: playersAfterRoundOne,
    games: roundOneGames,
    roundNumber: 2,
  });

  assert.equal(roundTwoPairings.length, 1);
  assert.equal(roundTwoPairings[0].whiteId, "B");
  assert.equal(roundTwoPairings[0].blackId, "A");
});

test("swiss allows rematch fallback when no alternative opponent exists", () => {
  const players = [makePlayer("A", 1), makePlayer("B", 2)];
  const roundOneGames = [
    {
      roundNumber: 1,
      matchIndex: 0,
      whiteId: "A",
      blackId: "B",
      result: "1/2-1/2",
      liveStatus: "completed",
      isBye: false,
    },
  ];

  const roundTwoPairings = generateRoundPairings({
    tournamentType: "swiss",
    players,
    games: roundOneGames,
    roundNumber: 2,
  });

  assert.equal(roundTwoPairings.length, 1);
  assert.equal(pairKey(roundTwoPairings[0]), "A:B");
});
