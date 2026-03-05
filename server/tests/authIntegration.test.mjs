import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import authRoutes from "../routes/auth.js";
import { User, UserActivity } from "../models/index.js";

let mongoServer;
let httpServer;
let baseUrl = "";

function extractCookie(response, key = "authToken") {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(new RegExp(`${key}=([^;]*)`));
  if (!match) return "";
  return `${key}=${match[1]}`;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections || {};
  const deletions = Object.values(collections).map((collection) =>
    collection.deleteMany({}),
  );
  await Promise.all(deletions);
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", authRoutes);

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

test("auth register creates user, hash, cookie, and activity row", async () => {
  const email = "register.user@test.dev";
  const password = "StrongPass!123";

  const response = await fetch(`${baseUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Register User",
      email,
      password,
      language: "en",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.user.email, email);

  const authCookie = extractCookie(response);
  assert.ok(authCookie.startsWith("authToken="));

  const userDoc = await User.findOne({ email }).lean();
  assert.ok(userDoc);
  assert.notEqual(userDoc.password, password);
  assert.equal(await bcrypt.compare(password, userDoc.password), true);

  const activityDoc = await UserActivity.findOne({ userId: userDoc._id }).lean();
  assert.ok(activityDoc);
  assert.ok(Number(activityDoc.loginCount || 0) >= 1);
});

test("auth login -> me -> logout lifecycle works with DB state", async () => {
  const email = "login.user@test.dev";
  const plainPassword = "StrongPass!456";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  await User.create({
    fullName: "Login User",
    email,
    password: hashedPassword,
  });

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: plainPassword,
      rememberMe: false,
    }),
  });
  const loginBody = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.equal(loginBody.success, true);

  const authCookie = extractCookie(loginRes);
  assert.ok(authCookie.startsWith("authToken="));

  const meRes = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: authCookie },
  });
  const meBody = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meBody.user.email, email);

  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: "POST",
    headers: { Cookie: authCookie },
  });
  const logoutBody = await logoutRes.json();
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutBody.success, true);
  assert.ok((logoutRes.headers.get("set-cookie") || "").includes("Max-Age=0"));

  const clearedCookie = extractCookie(logoutRes);
  const meAfterLogoutRes = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: clearedCookie || "authToken=" },
  });
  const meAfterLogoutBody = await meAfterLogoutRes.json();
  assert.equal(meAfterLogoutRes.status, 401);
  assert.equal(meAfterLogoutBody.error, "Not authenticated");
});

test("auth login rejects wrong password and keeps DB unchanged", async () => {
  const email = "wrong.pass@test.dev";
  const hashedPassword = await bcrypt.hash("CorrectPass!999", 10);
  const user = await User.create({
    fullName: "Wrong Pass User",
    email,
    password: hashedPassword,
  });

  const response = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "WrongPass!000",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.errorCode, "AUTH_INVALID_CREDENTIALS");

  const userAfter = await User.findById(user._id).lean();
  assert.ok(userAfter);
  assert.equal(userAfter.email, email);
});

test("auth register rejects duplicate email", async () => {
  const email = "duplicate@test.dev";
  await User.create({
    fullName: "Dup Existing",
    email,
    password: await bcrypt.hash("SomePassword!1", 10),
  });

  const response = await fetch(`${baseUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Dup New",
      email,
      password: "AnotherPassword!2",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.errorCode, "AUTH_EMAIL_IN_USE");

  const users = await User.find({ email }).lean();
  assert.equal(users.length, 1);
});
