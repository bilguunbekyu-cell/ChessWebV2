import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import notificationsRoutes from "../routes/notifications.js";
import adminNotificationsRoutes from "../routes/adminNotifications.js";
import {
  CheatReport,
  Notification,
  Tournament,
  TournamentPlayer,
  User,
} from "../models/index.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const ADMIN_ID = "507f1f77bcf86cd799439a10";
const USER_A = "507f1f77bcf86cd799439a11";
const USER_B = "507f1f77bcf86cd799439a12";
const USER_C = "507f1f77bcf86cd799439a13";

function adminCookie() {
  return `adminToken=${encodeURIComponent(
    JSON.stringify({ isAdmin: true, adminId: ADMIN_ID, username: "AdminUser" }),
  )}`;
}

function userCookie(userId) {
  return `authToken=${encodeURIComponent(
    JSON.stringify({
      userId,
      email: `${userId}@test.dev`,
      fullName: `User ${userId.slice(-2)}`,
    }),
  )}`;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections || {};
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

async function seedUsers() {
  const hashed = await bcrypt.hash("Secret!123", 10);
  await User.insertMany([
    {
      _id: USER_A,
      fullName: "User A",
      email: "user.a@test.dev",
      password: hashed,
      banned: false,
      presenceStatus: "online",
    },
    {
      _id: USER_B,
      fullName: "User B",
      email: "user.b@test.dev",
      password: hashed,
      banned: true,
      presenceStatus: "offline",
    },
    {
      _id: USER_C,
      fullName: "User C",
      email: "user.c@test.dev",
      password: hashed,
      banned: false,
      presenceStatus: "away",
    },
  ]);
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/admin/notifications", adminNotificationsRoutes);

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

test("admin broadcast targets flagged audience from cheat reports", async () => {
  await seedUsers();

  await CheatReport.insertMany([
    {
      userId: USER_B,
      source: "manual_scan",
      status: "pending",
      flags: ["Suspicious move-time consistency"],
      metrics: { suspicionScore: 85, riskLevel: "high" },
    },
    {
      userId: USER_C,
      source: "batch_scan",
      status: "actioned",
      reviewAction: "warn",
      flags: ["High near-perfect move rate"],
      metrics: { suspicionScore: 78, riskLevel: "high" },
    },
    {
      userId: USER_A,
      source: "manual_scan",
      status: "dismissed",
      flags: ["False positive"],
      metrics: { suspicionScore: 40, riskLevel: "low" },
    },
  ]);

  const response = await fetch(`${baseUrl}/api/admin/notifications/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "Fair Play Review",
      message: "Your account has a pending fair-play review.",
      audience: "flagged",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.audience, "flagged");
  assert.equal(body.sent, 2);

  const docs = await Notification.find({ type: "admin_broadcast" }).lean();
  const targetedUserIds = docs.map((item) => String(item.userId)).sort();
  assert.deepEqual(targetedUserIds, [USER_B, USER_C].sort());
});

test("admin broadcast supports tournament_players audience and requires tournamentId", async () => {
  await seedUsers();

  const badResponse = await fetch(`${baseUrl}/api/admin/notifications/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "Round Start",
      message: "Your next round is ready.",
      audience: "tournament_players",
    }),
  });
  const badBody = await badResponse.json();
  assert.equal(badResponse.status, 400);
  assert.match(
    String(badBody.error || ""),
    /tournamentId is required for tournament_players audience/i,
  );

  const tournament = await Tournament.create({
    name: "Integration Swiss",
    type: "swiss",
    timeControl: { baseMs: 180000, incMs: 2000, label: "3+2" },
    status: "running",
    roundsPlanned: 3,
    currentRound: 1,
    createdBy: USER_A,
  });
  await TournamentPlayer.insertMany([
    { tournamentId: tournament._id, userId: USER_A, seed: 1 },
    { tournamentId: tournament._id, userId: USER_B, seed: 2 },
  ]);

  const response = await fetch(`${baseUrl}/api/admin/notifications/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "Round Start",
      message: "Your next round is ready.",
      audience: "tournament_players",
      tournamentId: String(tournament._id),
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.audience, "tournament_players");
  assert.equal(body.sent, 2);

  const docs = await Notification.find({ type: "admin_broadcast" }).lean();
  const targetedUserIds = docs.map((item) => String(item.userId)).sort();
  assert.deepEqual(targetedUserIds, [USER_A, USER_B].sort());
});

test("notification unread-count lifecycle works with read-one and read-all", async () => {
  await seedUsers();

  const broadcastRes = await fetch(`${baseUrl}/api/admin/notifications/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "System Notice",
      message: "Platform update available.",
      audience: "all",
    }),
  });
  const broadcastBody = await broadcastRes.json();
  assert.equal(broadcastRes.status, 200);
  assert.equal(broadcastBody.sent, 3);

  const unreadBeforeRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
    headers: { Cookie: userCookie(USER_A) },
  });
  const unreadBeforeBody = await unreadBeforeRes.json();
  assert.equal(unreadBeforeRes.status, 200);
  assert.equal(unreadBeforeBody.count, 1);

  const listRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Cookie: userCookie(USER_A) },
  });
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listBody.notifications.length, 1);
  assert.equal(listBody.unreadCount, 1);

  const notificationId = String(listBody.notifications[0]._id);
  const readOneRes = await fetch(
    `${baseUrl}/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: { Cookie: userCookie(USER_A) },
    },
  );
  const readOneBody = await readOneRes.json();
  assert.equal(readOneRes.status, 200);
  assert.equal(readOneBody.success, true);
  assert.ok(readOneBody.notification.readAt);

  const unreadAfterOneRes = await fetch(
    `${baseUrl}/api/notifications/unread-count`,
    {
      headers: { Cookie: userCookie(USER_A) },
    },
  );
  const unreadAfterOneBody = await unreadAfterOneRes.json();
  assert.equal(unreadAfterOneRes.status, 200);
  assert.equal(unreadAfterOneBody.count, 0);

  await Notification.create({
    userId: USER_A,
    type: "friend_request",
    title: "Friend Request",
    message: "User B sent you a friend request.",
  });
  await Notification.create({
    userId: USER_A,
    type: "news_published",
    title: "News Published",
    message: "A new article is available.",
  });

  const unreadBeforeAllRes = await fetch(
    `${baseUrl}/api/notifications/unread-count`,
    {
      headers: { Cookie: userCookie(USER_A) },
    },
  );
  const unreadBeforeAllBody = await unreadBeforeAllRes.json();
  assert.equal(unreadBeforeAllRes.status, 200);
  assert.equal(unreadBeforeAllBody.count, 2);

  const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
    method: "PATCH",
    headers: { Cookie: userCookie(USER_A) },
  });
  const readAllBody = await readAllRes.json();
  assert.equal(readAllRes.status, 200);
  assert.equal(readAllBody.success, true);

  const unreadAfterAllRes = await fetch(
    `${baseUrl}/api/notifications/unread-count`,
    {
      headers: { Cookie: userCookie(USER_A) },
    },
  );
  const unreadAfterAllBody = await unreadAfterAllRes.json();
  assert.equal(unreadAfterAllRes.status, 200);
  assert.equal(unreadAfterAllBody.count, 0);

  const unreadOnlyRes = await fetch(`${baseUrl}/api/notifications?unreadOnly=true`, {
    headers: { Cookie: userCookie(USER_A) },
  });
  const unreadOnlyBody = await unreadOnlyRes.json();
  assert.equal(unreadOnlyRes.status, 200);
  assert.equal(unreadOnlyBody.notifications.length, 0);
});
