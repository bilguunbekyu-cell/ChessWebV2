import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import feedbackRoutes from "../routes/feedback.js";
import adminFeedbackRoutes from "../routes/adminFeedback.js";
import newsRoutes from "../routes/news.js";
import adminNewsRoutes from "../routes/adminNews.js";
import { Feedback, NewsArticle, Notification, User } from "../models/index.js";

let mongoServer;
let httpServer;
let baseUrl = "";

const USER_ID = "507f1f77bcf86cd799439021";
const ADMIN_ID = "507f1f77bcf86cd799439012";

function userCookie(userId = USER_ID) {
  return `authToken=${encodeURIComponent(
    JSON.stringify({ userId, email: "content.user@test.dev", fullName: "Content User" }),
  )}`;
}

function adminCookie() {
  return `adminToken=${encodeURIComponent(
    JSON.stringify({ isAdmin: true, adminId: ADMIN_ID, username: "AdminUser" }),
  )}`;
}

async function clearDatabase() {
  const collections = mongoose.connection.collections || {};
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/admin/feedback", adminFeedbackRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/admin/news", adminNewsRoutes);

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

test("feedback lifecycle: user submit -> admin review -> user sees update", async () => {
  await User.create({
    _id: USER_ID,
    fullName: "Content User",
    email: "content.user@test.dev",
    password: await bcrypt.hash("Secret!123", 10),
  });

  const submitRes = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userCookie(),
    },
    body: JSON.stringify({
      category: "bug",
      message: "A reproducible issue appears on profile save.",
      screenshots: [" https://cdn.example.com/shot-1.png "],
    }),
  });
  const submitBody = await submitRes.json();
  assert.equal(submitRes.status, 201);
  assert.equal(submitBody.success, true);
  assert.equal(submitBody.feedback.category, "bug");
  const feedbackId = String(submitBody.feedback._id);
  assert.ok(feedbackId);

  const mineBeforeRes = await fetch(`${baseUrl}/api/feedback/mine`, {
    headers: { Cookie: userCookie() },
  });
  const mineBeforeBody = await mineBeforeRes.json();
  assert.equal(mineBeforeRes.status, 200);
  assert.equal(mineBeforeBody.feedback.length, 1);
  assert.equal(mineBeforeBody.feedback[0].status, "open");

  const adminListRes = await fetch(`${baseUrl}/api/admin/feedback`, {
    headers: { Cookie: adminCookie() },
  });
  const adminListBody = await adminListRes.json();
  assert.equal(adminListRes.status, 200);
  assert.equal(adminListBody.total, 1);
  assert.equal(adminListBody.feedback[0].user.email, "content.user@test.dev");

  const adminPatchRes = await fetch(`${baseUrl}/api/admin/feedback/${feedbackId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      status: "closed",
      adminReply: "Thanks, fixed in patch v2.8.1.",
    }),
  });
  const adminPatchBody = await adminPatchRes.json();
  assert.equal(adminPatchRes.status, 200);
  assert.equal(adminPatchBody.success, true);
  assert.equal(adminPatchBody.feedback.status, "closed");
  assert.equal(adminPatchBody.feedback.adminReply, "Thanks, fixed in patch v2.8.1.");

  const feedbackDoc = await Feedback.findById(feedbackId).lean();
  assert.ok(feedbackDoc);
  assert.equal(feedbackDoc.status, "closed");
  assert.ok(feedbackDoc.closedAt);

  const notifications = await Notification.find({ userId: USER_ID }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "feedback_update");

  const mineAfterRes = await fetch(`${baseUrl}/api/feedback/mine`, {
    headers: { Cookie: userCookie() },
  });
  const mineAfterBody = await mineAfterRes.json();
  assert.equal(mineAfterRes.status, 200);
  assert.equal(mineAfterBody.feedback[0].status, "closed");
  assert.equal(mineAfterBody.feedback[0].adminReply, "Thanks, fixed in patch v2.8.1.");
});

test("news lifecycle: draft hidden -> publish visible -> delete removes public detail", async () => {
  const createRes = await fetch(`${baseUrl}/api/admin/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "Integration News Draft",
      contentMarkdown: "## draft body",
      tags: ["Update", " update ", "Release"],
      status: "draft",
    }),
  });
  const createBody = await createRes.json();
  assert.equal(createRes.status, 201);
  const articleId = String(createBody.article._id);
  const slug = String(createBody.article.slug);
  assert.ok(articleId);
  assert.equal(slug, "integration-news-draft");
  assert.deepEqual(createBody.article.tags, ["update", "release"]);
  assert.equal(createBody.article.status, "draft");

  const publicBeforeRes = await fetch(`${baseUrl}/api/news`);
  const publicBeforeBody = await publicBeforeRes.json();
  assert.equal(publicBeforeRes.status, 200);
  assert.equal(
    publicBeforeBody.articles.some((article) => article.slug === slug),
    false,
  );

  const publishRes = await fetch(`${baseUrl}/api/admin/news/${articleId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({ status: "published" }),
  });
  const publishBody = await publishRes.json();
  assert.equal(publishRes.status, 200);
  assert.equal(publishBody.article.status, "published");
  assert.ok(publishBody.article.publishedAt);

  const publicAfterRes = await fetch(`${baseUrl}/api/news`);
  const publicAfterBody = await publicAfterRes.json();
  assert.equal(publicAfterRes.status, 200);
  assert.equal(
    publicAfterBody.articles.some((article) => article.slug === slug),
    true,
  );

  const detailRes = await fetch(`${baseUrl}/api/news/${slug}`);
  const detailBody = await detailRes.json();
  assert.equal(detailRes.status, 200);
  assert.equal(detailBody.article.slug, slug);
  assert.equal(detailBody.article.title, "Integration News Draft");

  const deleteRes = await fetch(`${baseUrl}/api/admin/news/${articleId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie() },
  });
  const deleteBody = await deleteRes.json();
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteBody.success, true);

  const deletedDetailRes = await fetch(`${baseUrl}/api/news/${slug}`);
  const deletedDetailBody = await deletedDetailRes.json();
  assert.equal(deletedDetailRes.status, 404);
  assert.equal(deletedDetailBody.error, "Article not found");

  const count = await NewsArticle.countDocuments({});
  assert.equal(count, 0);
});
