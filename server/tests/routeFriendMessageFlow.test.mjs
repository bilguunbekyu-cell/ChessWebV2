import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import friendsRoutes from "../routes/friends.js";
import messagesRoutes from "../routes/messages.js";
import {
  BlockedUser,
  Friend,
  FriendRequest,
  Message,
  Notification,
} from "../models/index.js";

const CURRENT_USER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439022";
const REQUEST_ID = "507f1f77bcf86cd799439033";

function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/friends", friendsRoutes);
  app.use("/api/messages", messagesRoutes);

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

function authCookie(userId = CURRENT_USER_ID) {
  return `authToken=${encodeURIComponent(
    JSON.stringify({ userId, email: "user@test.dev", fullName: "User Test" }),
  )}`;
}

function noBlockRelationStub() {
  return {
    select: () => ({
      lean: async () => null,
    }),
  };
}

function setStub(t, model, methodName, implementation) {
  const original = model[methodName];
  model[methodName] = implementation;
  t.after(() => {
    model[methodName] = original;
  });
}

test("friends accept validates requestId format", async (t) => {
  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/friends/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(),
    },
    body: JSON.stringify({ requestId: "bad-id" }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Valid requestId is required");
});

test("friends accept succeeds for pending request", async (t) => {
  let saved = false;
  let friendCreateCalls = 0;
  let notificationCalls = 0;

  setStub(t, FriendRequest, "findById", async () => ({
    _id: REQUEST_ID,
    from: OTHER_USER_ID,
    to: CURRENT_USER_ID,
    status: "pending",
    respondedAt: null,
    save: async () => {
      saved = true;
    },
  }));
  setStub(t, BlockedUser, "findOne", () => noBlockRelationStub());
  setStub(t, Friend, "create", async () => {
    friendCreateCalls += 1;
    return {};
  });
  setStub(t, Notification, "create", async () => {
    notificationCalls += 1;
    return {
      _id: "notif-1",
      userId: OTHER_USER_ID,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      message: "Your friend request was accepted.",
      link: "/friends",
      payload: { toUserId: CURRENT_USER_ID },
      createdAt: new Date(),
    };
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/friends/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(),
    },
    body: JSON.stringify({ requestId: REQUEST_ID }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.status, "accepted");
  assert.equal(saved, true);
  assert.equal(friendCreateCalls, 2);
  assert.equal(notificationCalls, 1);
});

test("friends decline succeeds for pending request", async (t) => {
  let saved = false;
  let notificationCalls = 0;

  setStub(t, FriendRequest, "findById", async () => ({
    _id: REQUEST_ID,
    from: OTHER_USER_ID,
    to: CURRENT_USER_ID,
    status: "pending",
    respondedAt: null,
    save: async () => {
      saved = true;
    },
  }));
  setStub(t, Notification, "create", async () => {
    notificationCalls += 1;
    return {
      _id: "notif-2",
      userId: OTHER_USER_ID,
      type: "friend_request_declined",
      title: "Friend request declined",
      message: "Your friend request was declined.",
      link: "/friends",
      payload: { toUserId: CURRENT_USER_ID },
      createdAt: new Date(),
    };
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(`${baseUrl}/api/friends/decline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie(),
    },
    body: JSON.stringify({ requestId: REQUEST_ID }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.status, "declined");
  assert.equal(saved, true);
  assert.equal(notificationCalls, 1);
});

test("messages request accept returns 404 when no pending request", async (t) => {
  setStub(t, BlockedUser, "findOne", () => noBlockRelationStub());
  setStub(t, Message, "updateMany", async () => ({ modifiedCount: 0 }));

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(
    `${baseUrl}/api/messages/requests/${OTHER_USER_ID}/accept`,
    {
      method: "POST",
      headers: { Cookie: authCookie() },
    },
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "No pending request found");
});

test("messages request accept succeeds and notifies sender", async (t) => {
  let notificationCalls = 0;
  setStub(t, BlockedUser, "findOne", () => noBlockRelationStub());
  setStub(t, Message, "updateMany", async () => ({ modifiedCount: 2 }));
  setStub(t, Notification, "create", async () => {
    notificationCalls += 1;
    return {
      _id: "notif-3",
      userId: OTHER_USER_ID,
      type: "message_request_accepted",
      title: "Message request accepted",
      message: "Your message request was accepted.",
      link: "/messages",
      payload: { userId: CURRENT_USER_ID },
      createdAt: new Date(),
    };
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(
    `${baseUrl}/api/messages/requests/${OTHER_USER_ID}/accept`,
    {
      method: "POST",
      headers: { Cookie: authCookie() },
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.acceptedCount, 2);
  assert.equal(notificationCalls, 1);
});

test("messages request decline succeeds and notifies sender", async (t) => {
  let notificationCalls = 0;
  setStub(t, Message, "updateMany", async () => ({ modifiedCount: 1 }));
  setStub(t, Notification, "create", async () => {
    notificationCalls += 1;
    return {
      _id: "notif-4",
      userId: OTHER_USER_ID,
      type: "message_request_declined",
      title: "Message request declined",
      message: "Your message request was declined.",
      link: "/messages",
      payload: { userId: CURRENT_USER_ID },
      createdAt: new Date(),
    };
  });

  const { server, baseUrl } = createServer();
  t.after(async () => {
    await closeServer(server);
  });

  const response = await fetch(
    `${baseUrl}/api/messages/requests/${OTHER_USER_ID}/decline`,
    {
      method: "POST",
      headers: { Cookie: authCookie() },
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.declinedCount, 1);
  assert.equal(notificationCalls, 1);
});
