import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import feedbackRoutes from "../routes/feedback.js";
import adminNewsRoutes from "../routes/adminNews.js";
import { Feedback, NewsArticle } from "../models/index.js";

function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/admin/news", adminNewsRoutes);

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function authCookie(userId = "507f1f77bcf86cd799439011") {
  return `authToken=${encodeURIComponent(
    JSON.stringify({ userId, email: "user@test.dev", fullName: "User Test" }),
  )}`;
}

function adminCookie() {
  return `adminToken=${encodeURIComponent(
    JSON.stringify({
      isAdmin: true,
      adminId: "507f1f77bcf86cd799439012",
      username: "AdminUser",
    }),
  )}`;
}

test("feedback POST validates minimum message length", async (t) => {
  const originalCreate = Feedback.create;
  let createCalls = 0;
  Feedback.create = async () => {
    createCalls += 1;
    return {};
  };

  t.after(async () => {
    Feedback.create = originalCreate;
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(),
    },
    body: JSON.stringify({
      category: "bug",
      message: "too short",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    body.error,
    "Feedback message must be at least 10 characters.",
  );
  assert.equal(createCalls, 0);
});

test("feedback POST normalizes category/screenshots and creates feedback", async (t) => {
  const originalCreate = Feedback.create;
  let capturedPayload = null;

  Feedback.create = async (payload) => {
    capturedPayload = payload;
    return {
      _id: "fb1",
      category: payload.category,
      message: payload.message,
      screenshots: payload.screenshots,
      status: payload.status,
      createdAt: new Date("2026-03-04T10:00:00.000Z"),
    };
  };

  t.after(async () => {
    Feedback.create = originalCreate;
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(),
    },
    body: JSON.stringify({
      category: "not-valid",
      message: "This is a valid feedback message.",
      screenshots: [
        " https://a.png ",
        "",
        "https://b.png",
        "https://c.png",
        "https://d.png",
        "https://e.png",
        "https://f.png",
      ],
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.feedback.category, "general");
  assert.equal(body.feedback.screenshots.length, 5);
  assert.equal(capturedPayload.category, "general");
  assert.deepEqual(capturedPayload.screenshots, [
    "https://a.png",
    "https://b.png",
    "https://c.png",
    "https://d.png",
    "https://e.png",
  ]);
});

test("admin news POST validates required fields", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/admin/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "",
      contentMarkdown: "",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "title is required");
});

test("admin news POST normalizes slug/tags and creates article", async (t) => {
  const originalFindOne = NewsArticle.findOne;
  const originalCreate = NewsArticle.create;
  let capturedPayload = null;

  NewsArticle.findOne = () => ({
    select: () => ({
      lean: async () => null,
    }),
  });

  NewsArticle.create = async (payload) => {
    capturedPayload = payload;
    return {
      _id: "news1",
      ...payload,
      createdAt: new Date("2026-03-04T10:00:00.000Z"),
      updatedAt: new Date("2026-03-04T10:00:00.000Z"),
    };
  };

  t.after(async () => {
    NewsArticle.findOne = originalFindOne;
    NewsArticle.create = originalCreate;
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/admin/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie(),
    },
    body: JSON.stringify({
      title: "  Hello Chess World!  ",
      contentMarkdown: "## body",
      tags: ["Chess", " chess ", "", "Tactics"],
      status: "published",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.article.slug, "hello-chess-world");
  assert.deepEqual(body.article.tags, ["chess", "tactics"]);
  assert.equal(capturedPayload.slug, "hello-chess-world");
  assert.deepEqual(capturedPayload.tags, ["chess", "tactics"]);
  assert.equal(capturedPayload.authorName, "AdminUser");
});
