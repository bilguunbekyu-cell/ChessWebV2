import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import feedbackRoutes from "../routes/feedback.js";
import adminFeedbackRoutes from "../routes/adminFeedback.js";
import adminMetricsRoutes from "../routes/adminMetrics.js";
import adminNewsRoutes from "../routes/adminNews.js";

function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/admin/feedback", adminFeedbackRoutes);
  app.use("/api/admin/metrics", adminMetricsRoutes);
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

test("feedback route rejects unauthenticated requests", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "bug", message: "This is a test bug report." }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Not authenticated");
});

test("feedback route rejects invalid auth token cookie", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/feedback/mine`, {
    headers: { Cookie: "authToken=not-json" },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Invalid token");
});

test("admin news route rejects unauthenticated requests", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/admin/news`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Not authenticated as admin");
});

test("admin metrics route rejects unauthenticated requests", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/admin/metrics/active`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Not authenticated as admin");
});

test("admin news route rejects invalid admin token", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/admin/news`, {
    headers: { Cookie: "adminToken=not-json" },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Invalid admin token");
});

test("admin routes reject non-admin token payloads", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const cookie = `adminToken=${encodeURIComponent(
    JSON.stringify({ adminId: "x1", username: "viewer", isAdmin: false }),
  )}`;

  const [newsRes, feedbackRes, metricsRes] = await Promise.all([
    fetch(`${baseUrl}/api/admin/news`, { headers: { Cookie: cookie } }),
    fetch(`${baseUrl}/api/admin/feedback`, { headers: { Cookie: cookie } }),
    fetch(`${baseUrl}/api/admin/metrics/active`, { headers: { Cookie: cookie } }),
  ]);
  const newsBody = await newsRes.json();
  const feedbackBody = await feedbackRes.json();
  const metricsBody = await metricsRes.json();

  assert.equal(newsRes.status, 403);
  assert.equal(newsBody.error, "Not authorized");
  assert.equal(feedbackRes.status, 403);
  assert.equal(feedbackBody.error, "Not authorized");
  assert.equal(metricsRes.status, 403);
  assert.equal(metricsBody.error, "Not authorized");
});
