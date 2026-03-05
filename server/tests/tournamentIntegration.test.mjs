import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import tournamentsRoutes from "../routes/tournaments.js";
import { Tournament, TournamentGame, TournamentPlayer, User } from "../models/index.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const USERS = {
  owner: {
    id: "507f1f77bcf86cd799439101",
    fullName: "Owner User",
    email: "owner.tournament@test.dev",
    blitzRating: 1750,
  },
  p1: {
    id: "507f1f77bcf86cd799439102",
    fullName: "Player One",
    email: "p1.tournament@test.dev",
    blitzRating: 1680,
  },
  p2: {
    id: "507f1f77bcf86cd799439103",
    fullName: "Player Two",
    email: "p2.tournament@test.dev",
    blitzRating: 1620,
  },
  p3: {
    id: "507f1f77bcf86cd799439104",
    fullName: "Player Three",
    email: "p3.tournament@test.dev",
    blitzRating: 1550,
  },
  lowRated: {
    id: "507f1f77bcf86cd799439105",
    fullName: "Low Rated",
    email: "low.tournament@test.dev",
    blitzRating: 1100,
  },
  highRated: {
    id: "507f1f77bcf86cd799439106",
    fullName: "High Rated",
    email: "high.tournament@test.dev",
    blitzRating: 1980,
  },
};

function authCookie(user) {
  return `authToken=${encodeURIComponent(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    }),
  )}`;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections || {};
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

async function seedUsers(userList) {
  await User.insertMany(
    userList.map((user) => ({
      _id: user.id,
      fullName: user.fullName,
      email: user.email,
      password: "integration-test-password",
      rating: user.blitzRating,
      blitzRating: user.blitzRating,
      rapidRating: user.blitzRating,
      bulletRating: user.blitzRating,
      classicalRating: user.blitzRating,
    })),
  );
}

async function createTournament({
  owner = USERS.owner,
  name = "Integration Swiss Tournament",
  type = "swiss",
  roundsPlanned = 2,
  ratingMin = null,
  ratingMax = null,
} = {}) {
  const response = await fetch(`${baseUrl}/api/tournaments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(owner),
    },
    body: JSON.stringify({
      name,
      type,
      timeControl: "3+2",
      roundsPlanned,
      ratingMin,
      ratingMax,
      noRatingFilter: ratingMin === null && ratingMax === null,
    }),
  });
  const body = await response.json();
  return { response, body };
}

async function registerPlayer(tournamentId, user) {
  const response = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/register`, {
    method: "POST",
    headers: {
      Cookie: authCookie(user),
    },
  });
  const body = await response.json();
  return { response, body };
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/tournaments", tournamentsRoutes);

  httpServer = app.listen(0);
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(() => resolve()));
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await clearDatabase();
});

test("tournaments enforce rating range on registration", async () => {
  await seedUsers([USERS.owner, USERS.lowRated, USERS.highRated]);

  const created = await createTournament({
    name: "Rating Gate Tournament",
    ratingMin: 1500,
    ratingMax: 2100,
  });
  assert.equal(created.response.status, 201);
  const tournamentId = String(created.body.tournament.id);

  const lowAttempt = await registerPlayer(tournamentId, USERS.lowRated);
  assert.equal(lowAttempt.response.status, 400);
  assert.match(lowAttempt.body.error, /below the minimum/i);

  const highAttempt = await registerPlayer(tournamentId, USERS.highRated);
  assert.equal(highAttempt.response.status, 200);
  assert.equal(highAttempt.body.success, true);

  const registeredCount = await TournamentPlayer.countDocuments({
    tournamentId,
  });
  assert.equal(registeredCount, 1);
});

test("tournament lifecycle start -> report round results -> auto-finish", async () => {
  await seedUsers([USERS.owner, USERS.p1, USERS.p2, USERS.p3]);

  const created = await createTournament({
    name: "Lifecycle Tournament",
    roundsPlanned: 2,
  });
  assert.equal(created.response.status, 201);
  const tournamentId = String(created.body.tournament.id);

  for (const user of [USERS.owner, USERS.p1, USERS.p2, USERS.p3]) {
    const reg = await registerPlayer(tournamentId, user);
    assert.equal(reg.response.status, 200);
    assert.equal(reg.body.success, true);
  }

  const startResponse = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/start`, {
    method: "POST",
    headers: { Cookie: authCookie(USERS.owner) },
  });
  const startBody = await startResponse.json();
  assert.equal(startResponse.status, 200);
  assert.equal(startBody.success, true);
  assert.equal(startBody.tournament.status, "running");
  assert.equal(startBody.tournament.currentRound, 1);

  const roundOne = (startBody.rounds || []).find(
    (round) => Number(round.roundNumber) === 1,
  );
  assert.ok(roundOne);
  const roundOneGames = (roundOne.games || []).filter((game) => !game.isBye);
  assert.equal(roundOneGames.length, 2);

  const firstReportRes = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/games/${roundOneGames[0].gameId}/result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ result: "1-0" }),
    },
  );
  const firstReportBody = await firstReportRes.json();
  assert.equal(firstReportRes.status, 200);
  assert.equal(firstReportBody.success, true);
  assert.equal(firstReportBody.tournament.currentRound, 1);

  const secondReportRes = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/games/${roundOneGames[1].gameId}/result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ result: "0-1" }),
    },
  );
  const secondReportBody = await secondReportRes.json();
  assert.equal(secondReportRes.status, 200);
  assert.equal(secondReportBody.success, true);
  assert.equal(secondReportBody.tournament.currentRound, 2);
  assert.equal(secondReportBody.tournament.status, "running");

  const roundTwo = (secondReportBody.rounds || []).find(
    (round) => Number(round.roundNumber) === 2,
  );
  assert.ok(roundTwo);
  const roundTwoGames = (roundTwo.games || []).filter((game) => !game.isBye);
  assert.equal(roundTwoGames.length, 2);

  const thirdReportRes = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/games/${roundTwoGames[0].gameId}/result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ result: "1/2-1/2" }),
    },
  );
  const thirdReportBody = await thirdReportRes.json();
  assert.equal(thirdReportRes.status, 200);
  assert.equal(thirdReportBody.success, true);
  assert.equal(thirdReportBody.tournament.status, "running");

  const fourthReportRes = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/games/${roundTwoGames[1].gameId}/result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ result: "1-0" }),
    },
  );
  const fourthReportBody = await fourthReportRes.json();
  assert.equal(fourthReportRes.status, 200);
  assert.equal(fourthReportBody.success, true);
  assert.equal(fourthReportBody.tournament.status, "finished");
  assert.equal(fourthReportBody.tournament.currentRound, 2);
  assert.equal((fourthReportBody.standings || []).length, 4);

  const pendingGames = await TournamentGame.countDocuments({
    tournamentId,
    result: "*",
  });
  assert.equal(pendingGames, 0);

  const tournamentDoc = await Tournament.findById(tournamentId).lean();
  assert.ok(tournamentDoc);
  assert.equal(tournamentDoc.status, "finished");
  assert.ok(tournamentDoc.finishedAt);
});

test("tournament repair route enforces manager access and started-game guard", async () => {
  await seedUsers([USERS.owner, USERS.p1, USERS.p2, USERS.p3]);

  const created = await createTournament({
    name: "Repair Guard Tournament",
    roundsPlanned: 2,
  });
  assert.equal(created.response.status, 201);
  const tournamentId = String(created.body.tournament.id);

  for (const user of [USERS.owner, USERS.p1, USERS.p2, USERS.p3]) {
    const reg = await registerPlayer(tournamentId, user);
    assert.equal(reg.response.status, 200);
  }

  const startResponse = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/start`, {
    method: "POST",
    headers: { Cookie: authCookie(USERS.owner) },
  });
  const startBody = await startResponse.json();
  assert.equal(startResponse.status, 200);
  assert.equal(startBody.tournament.currentRound, 1);

  const pairPayload = {
    pairings: [
      { whiteId: USERS.owner.id, blackId: USERS.p1.id },
      { whiteId: USERS.p2.id, blackId: USERS.p3.id },
    ],
  };

  const nonManagerRepair = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/rounds/1/repair`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.p1),
      },
      body: JSON.stringify(pairPayload),
    },
  );
  const nonManagerBody = await nonManagerRepair.json();
  assert.equal(nonManagerRepair.status, 403);
  assert.match(nonManagerBody.error, /manager/i);

  const ownerRepair = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/rounds/1/repair`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify(pairPayload),
    },
  );
  const ownerRepairBody = await ownerRepair.json();
  assert.equal(ownerRepair.status, 200);
  assert.equal(ownerRepairBody.success, true);

  const repairedRound = (ownerRepairBody.rounds || []).find(
    (round) => Number(round.roundNumber) === 1,
  );
  assert.ok(repairedRound);
  const repairedGameId = repairedRound.games[0].gameId;

  const reportStartedGame = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/games/${repairedGameId}/result`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ result: "1-0" }),
    },
  );
  const reportStartedGameBody = await reportStartedGame.json();
  assert.equal(reportStartedGame.status, 200);
  assert.equal(reportStartedGameBody.success, true);

  const repairAfterStart = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/rounds/1/repair`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify(pairPayload),
    },
  );
  const repairAfterStartBody = await repairAfterStart.json();
  assert.equal(repairAfterStart.status, 400);
  assert.match(repairAfterStartBody.error, /cannot be repaired/i);
});

test("tournament manager add/remove is owner-only and idempotent", async () => {
  await seedUsers([USERS.owner, USERS.p1, USERS.p2]);

  const created = await createTournament({
    name: "Manager Permissions Tournament",
    roundsPlanned: 2,
  });
  assert.equal(created.response.status, 201);
  const tournamentId = String(created.body.tournament.id);

  const nonOwnerAdd = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/managers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.p1),
      },
      body: JSON.stringify({ managerId: USERS.p2.id }),
    },
  );
  const nonOwnerAddBody = await nonOwnerAdd.json();
  assert.equal(nonOwnerAdd.status, 403);
  assert.match(nonOwnerAddBody.error, /owner/i);

  const ownerAdd = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/managers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ managerId: USERS.p1.id }),
    },
  );
  const ownerAddBody = await ownerAdd.json();
  assert.equal(ownerAdd.status, 200);
  assert.equal(ownerAddBody.success, true);
  assert.equal(
    ownerAddBody.managers.some(
      (manager) => String(manager.userId) === USERS.p1.id && !manager.isOwner,
    ),
    true,
  );

  const ownerAddDuplicate = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/managers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie(USERS.owner),
      },
      body: JSON.stringify({ managerId: USERS.p1.id }),
    },
  );
  const ownerAddDuplicateBody = await ownerAddDuplicate.json();
  assert.equal(ownerAddDuplicate.status, 200);
  const managerOccurrences = ownerAddDuplicateBody.managers.filter(
    (manager) => String(manager.userId) === USERS.p1.id,
  ).length;
  assert.equal(managerOccurrences, 1);

  const nonOwnerRemove = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/managers/${USERS.p1.id}`,
    {
      method: "DELETE",
      headers: {
        Cookie: authCookie(USERS.p1),
      },
    },
  );
  const nonOwnerRemoveBody = await nonOwnerRemove.json();
  assert.equal(nonOwnerRemove.status, 403);
  assert.match(nonOwnerRemoveBody.error, /owner/i);

  const ownerRemove = await fetch(
    `${baseUrl}/api/tournaments/${tournamentId}/managers/${USERS.p1.id}`,
    {
      method: "DELETE",
      headers: {
        Cookie: authCookie(USERS.owner),
      },
    },
  );
  const ownerRemoveBody = await ownerRemove.json();
  assert.equal(ownerRemove.status, 200);
  assert.equal(ownerRemoveBody.success, true);
  assert.equal(
    ownerRemoveBody.managers.some(
      (manager) => String(manager.userId) === USERS.p1.id,
    ),
    false,
  );
});
