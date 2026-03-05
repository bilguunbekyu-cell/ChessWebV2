import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import adminCheatReportsRoutes from "../routes/adminCheatReports.js";
import { CheatReport, Notification, User } from "../models/index.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const ADMIN_ID = "507f1f77bcf86cd799439901";
const USER_ID = "507f1f77bcf86cd799439902";

function adminCookie(adminId = ADMIN_ID) {
  return `adminToken=${encodeURIComponent(
    JSON.stringify({ isAdmin: true, adminId, username: "AdminUser" }),
  )}`;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections || {};
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

async function seedUserAndReport() {
  await User.create({
    _id: USER_ID,
    fullName: "Cheat Review User",
    email: "cheat.review.user@test.dev",
    password: "integration-password",
    rating: 1500,
  });

  return CheatReport.create({
    userId: USER_ID,
    source: "manual_scan",
    status: "pending",
    reviewAction: "none",
    flags: ["Suspicious move-time variance pattern"],
    metrics: {
      suspicionScore: 82,
      riskLevel: "high",
      gamesConsidered: 12,
      gamesAnalyzed: 12,
      movesAnalyzed: 420,
      avgCentipawnLoss: 18,
      nearPerfectMoveRate: 0.93,
      strongMoveRate: 0.95,
      blunderRate: 0.01,
      avgMoveTimeSec: 2.4,
      avgMoveTimeStdSec: 0.4,
      lowVarianceGameRate: 0.88,
      criticalWindowRate: 0.92,
    },
  });
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin/cheat-reports", adminCheatReportsRoutes);

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

test("cheat report review warn action marks report as actioned and notifies user", async () => {
  const report = await seedUserAndReport();

  const response = await fetch(
    `${baseUrl}/api/admin/cheat-reports/${report._id}/review`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie(),
      },
      body: JSON.stringify({
        action: "warn",
        note: "Fair-play warning after admin review.",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.report.status, "actioned");
  assert.equal(body.report.reviewAction, "warn");
  assert.equal(body.report.reviewNote, "Fair-play warning after admin review.");

  const reportDoc = await CheatReport.findById(report._id).lean();
  assert.ok(reportDoc);
  assert.equal(reportDoc.status, "actioned");
  assert.equal(reportDoc.reviewAction, "warn");
  assert.equal(String(reportDoc.reviewedBy), ADMIN_ID);
  assert.ok(reportDoc.reviewedAt);

  const notifications = await Notification.find({ userId: USER_ID }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "fair_play_warning");
});

test("cheat report review ban action bans user and emits account action notification", async () => {
  const report = await seedUserAndReport();

  const response = await fetch(
    `${baseUrl}/api/admin/cheat-reports/${report._id}/review`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie(),
      },
      body: JSON.stringify({
        action: "ban",
        note: "Engine-use violation confirmed.",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.report.status, "actioned");
  assert.equal(body.report.reviewAction, "ban");

  const userDoc = await User.findById(USER_ID).lean();
  assert.ok(userDoc);
  assert.equal(userDoc.banned, true);
  assert.equal(userDoc.banReason, "Engine-use violation confirmed.");
  assert.ok(userDoc.bannedAt);

  const notifications = await Notification.find({ userId: USER_ID }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "account_action");
});

test("cheat report review with no action and no explicit status defaults to reviewed", async () => {
  const report = await seedUserAndReport();

  const response = await fetch(
    `${baseUrl}/api/admin/cheat-reports/${report._id}/review`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie(),
      },
      body: JSON.stringify({
        action: "none",
        note: "Checked manually, keeping under watch.",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.report.status, "reviewed");
  assert.equal(body.report.reviewAction, "none");
  assert.equal(body.report.reviewNote, "Checked manually, keeping under watch.");

  const notifications = await Notification.find({ userId: USER_ID }).lean();
  assert.equal(notifications.length, 0);
});
