import test from "node:test";
import assert from "node:assert/strict";
import { buildManualRoundPairings } from "../utils/tournamentEngine.js";

test("buildManualRoundPairings builds valid round data", () => {
  const result = buildManualRoundPairings({
    roundNumber: 2,
    registeredIds: ["A", "B", "C", "D"],
    existingGames: [
      { roundNumber: 1, whiteId: "A", blackId: "B", result: "1-0" },
      { roundNumber: 1, whiteId: "C", blackId: "D", result: "0-1" },
    ],
    pairings: [
      { whiteId: "A", blackId: "C" },
      { whiteId: "D", blackId: "B" },
    ],
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].roundNumber, 2);
  assert.equal(result[0].matchIndex, 0);
  assert.equal(result[1].matchIndex, 1);
  assert.equal(result[0].result, "*");
  assert.equal(result[1].result, "*");
});

test("buildManualRoundPairings rejects duplicate players", () => {
  assert.throws(() =>
    buildManualRoundPairings({
      roundNumber: 2,
      registeredIds: ["A", "B", "C", "D"],
      existingGames: [],
      pairings: [
        { whiteId: "A", blackId: "B" },
        { whiteId: "A", blackId: "C" },
      ],
    }),
  );
});

test("buildManualRoundPairings rejects missing player coverage", () => {
  assert.throws(() =>
    buildManualRoundPairings({
      roundNumber: 2,
      registeredIds: ["A", "B", "C", "D"],
      existingGames: [],
      pairings: [{ whiteId: "A", blackId: "B" }],
    }),
  );
});

test("buildManualRoundPairings rejects rematch by default", () => {
  assert.throws(() =>
    buildManualRoundPairings({
      roundNumber: 2,
      registeredIds: ["A", "B"],
      existingGames: [{ roundNumber: 1, whiteId: "A", blackId: "B", result: "1-0" }],
      pairings: [{ whiteId: "A", blackId: "B" }],
    }),
  );
});

test("buildManualRoundPairings allows rematch when explicitly enabled", () => {
  const result = buildManualRoundPairings({
    roundNumber: 2,
    registeredIds: ["A", "B"],
    existingGames: [{ roundNumber: 1, whiteId: "A", blackId: "B", result: "1-0" }],
    pairings: [{ whiteId: "A", blackId: "B" }],
    allowRematch: true,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].whiteId, "A");
  assert.equal(result[0].blackId, "B");
});

test("buildManualRoundPairings supports single bye and blocks multiple byes", () => {
  const oneBye = buildManualRoundPairings({
    roundNumber: 3,
    registeredIds: ["A", "B", "C"],
    existingGames: [],
    pairings: [
      { whiteId: "A", blackId: "B" },
      { whiteId: "C" },
    ],
  });
  assert.equal(oneBye.length, 2);
  assert.equal(oneBye[1].isBye, true);
  assert.equal(oneBye[1].result, "1-0");

  assert.throws(() =>
    buildManualRoundPairings({
      roundNumber: 3,
      registeredIds: ["A", "B", "C", "D"],
      existingGames: [],
      pairings: [
        { whiteId: "A" },
        { whiteId: "B" },
        { whiteId: "C", blackId: "D" },
      ],
    }),
  );
});
