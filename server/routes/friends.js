import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/index.js";
import {
  BlockedUser,
  Friend,
  FriendRequest,
  Message,
  User,
} from "../models/index.js";
import { notifyUser } from "../services/notify.js";

const router = Router();

function toId(value) {
  return value ? String(value) : "";
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

async function hasBlockRelation(userA, userB) {
  return !!(await BlockedUser.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  })
    .select("_id")
    .lean());
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friends = await Friend.find({ userId })
      .populate("friendId", "fullName email avatar rating")
      .lean();

    const result = friends
      .filter((f) => f.friendId?._id)
      .map((f) => ({
        id: toId(f.friendId._id),
        name: f.friendId.fullName || "Unknown",
        email: f.friendId.email,
        avatar: f.friendId.avatar || "",
        rating: f.friendId.rating || 1200,
        since: f.createdAt,
      }));

    res.json({ friends: result });
  } catch (err) {
    console.error("Friends list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/search", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = String(req.query.q || "").trim();
    if (!query) return res.json({ results: [] });

    const [existingFriends, blockedByMe] = await Promise.all([
      Friend.find({ userId }).select("friendId").lean(),
      BlockedUser.find({ blocker: userId }).select("blocked").lean(),
    ]);
    const existingIds = new Set(existingFriends.map((f) => toId(f.friendId)));
    const blockedIds = new Set(blockedByMe.map((entry) => toId(entry.blocked)));

    const regex = new RegExp(query, "i");
    const users = await User.find({
      _id: { $ne: userId },
      deletedAt: null,
      $or: [{ fullName: regex }, { email: regex }],
    })
      .select("fullName email avatar rating")
      .limit(20)
      .lean();

    const results = users
      .filter((u) => {
        const uid = toId(u._id);
        return !existingIds.has(uid) && !blockedIds.has(uid);
      })
      .map((u) => ({
        id: toId(u._id),
        name: u.fullName,
        email: u.email,
        avatar: u.avatar || "",
        rating: u.rating || 1200,
      }));

    res.json({ results });
  } catch (err) {
    console.error("Friend search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [incomingDocs, outgoingDocs] = await Promise.all([
      FriendRequest.find({ to: userId, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("from", "fullName email avatar rating")
        .lean(),
      FriendRequest.find({ from: userId, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("to", "fullName email avatar rating")
        .lean(),
    ]);

    const incoming = incomingDocs
      .filter((entry) => entry.from?._id)
      .map((entry) => ({
        requestId: toId(entry._id),
        from: {
          id: toId(entry.from._id),
          name: entry.from.fullName,
          email: entry.from.email,
          avatar: entry.from.avatar || "",
          rating: entry.from.rating || 1200,
        },
        createdAt: entry.createdAt,
      }));

    const outgoing = outgoingDocs
      .filter((entry) => entry.to?._id)
      .map((entry) => ({
        requestId: toId(entry._id),
        to: {
          id: toId(entry.to._id),
          name: entry.to.fullName,
          email: entry.to.email,
          avatar: entry.to.avatar || "",
          rating: entry.to.rating || 1200,
        },
        createdAt: entry.createdAt,
      }));

    res.json({ incoming, outgoing });
  } catch (err) {
    console.error("Friend requests list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/request", authMiddleware, async (req, res) => {
  try {
    const from = req.user.userId;
    const to = String(req.body?.toUserId || req.body?.friendId || "").trim();

    if (!to || !isValidObjectId(to)) {
      return res.status(400).json({ error: "Valid toUserId is required" });
    }
    if (to === from) {
      return res.status(400).json({ error: "Cannot send request to yourself" });
    }

    const user = await User.findOne({ _id: to, deletedAt: null })
      .select("_id fullName")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (await hasBlockRelation(from, to)) {
      return res
        .status(403)
        .json({ error: "Friend request is blocked by privacy settings" });
    }

    const existingFriend = await Friend.findOne({ userId: from, friendId: to })
      .select("_id")
      .lean();
    if (existingFriend) {
      return res.status(409).json({ error: "Already friends" });
    }

    const reversePending = await FriendRequest.findOne({
      from: to,
      to: from,
      status: "pending",
    }).lean();
    if (reversePending) {
      return res.status(409).json({
        error: "User already sent you a request. Accept it instead.",
        reverseRequestId: toId(reversePending._id),
      });
    }

    let requestDoc = await FriendRequest.findOne({
      from,
      to,
      status: "pending",
    });
    if (!requestDoc) {
      requestDoc = await FriendRequest.create({ from, to, status: "pending" });
      await notifyUser(req.app, {
        userId: to,
        type: "friend_request",
        title: "New friend request",
        message: "You received a friend request.",
        link: "/friends",
        payload: { fromUserId: from, requestId: toId(requestDoc._id) },
      });
    }

    res.status(201).json({
      success: true,
      request: {
        requestId: toId(requestDoc._id),
        from: toId(requestDoc.from),
        to: toId(requestDoc.to),
        status: requestDoc.status,
        createdAt: requestDoc.createdAt,
      },
    });
  } catch (err) {
    console.error("Send friend request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = String(req.body?.requestId || "").trim();
    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({ error: "Valid requestId is required" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found" });
    }
    if (toId(request.to) !== toId(userId)) {
      return res.status(403).json({ error: "Not authorized to accept this request" });
    }

    if (await hasBlockRelation(request.from, request.to)) {
      return res.status(403).json({ error: "Cannot accept due to block status" });
    }

    request.status = "accepted";
    request.respondedAt = new Date();
    await request.save();

    await Friend.create({ userId: request.from, friendId: request.to }).catch((e) => {
      if (e?.code !== 11000) throw e;
    });
    await Friend.create({ userId: request.to, friendId: request.from }).catch((e) => {
      if (e?.code !== 11000) throw e;
    });

    await notifyUser(req.app, {
      userId: request.from,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      message: "Your friend request was accepted.",
      link: "/friends",
      payload: { toUserId: toId(request.to) },
    });

    res.json({ success: true, requestId: toId(request._id), status: request.status });
  } catch (err) {
    console.error("Accept friend request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/decline", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = String(req.body?.requestId || "").trim();
    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({ error: "Valid requestId is required" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found" });
    }
    if (toId(request.to) !== toId(userId)) {
      return res.status(403).json({ error: "Not authorized to decline this request" });
    }

    request.status = "declined";
    request.respondedAt = new Date();
    await request.save();

    await notifyUser(req.app, {
      userId: request.from,
      type: "friend_request_declined",
      title: "Friend request declined",
      message: "Your friend request was declined.",
      link: "/friends",
      payload: { toUserId: toId(request.to) },
    });

    res.json({ success: true, requestId: toId(request._id), status: request.status });
  } catch (err) {
    console.error("Decline friend request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Legacy endpoint: immediate friendship creation
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.body || {};

    if (!friendId || !isValidObjectId(friendId)) {
      return res.status(400).json({ error: "Valid friendId is required" });
    }
    if (friendId === userId) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }

    const friendUser = await User.findOne({ _id: friendId, deletedAt: null }).select(
      "_id",
    );
    if (!friendUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (await hasBlockRelation(userId, friendId)) {
      return res
        .status(403)
        .json({ error: "Cannot add this user due to block settings" });
    }

    const existing = await Friend.findOne({ userId, friendId }).lean();
    if (existing) {
      return res.json({ success: true, already: true });
    }

    await Friend.create({ userId, friendId }).catch((e) => {
      if (e?.code !== 11000) throw e;
    });
    await Friend.create({ userId: friendId, friendId: userId }).catch((e) => {
      if (e?.code !== 11000) throw e;
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:friendId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.params;
    await Friend.deleteMany({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/blocks/list", authMiddleware, async (req, res) => {
  try {
    const items = await BlockedUser.find({ blocker: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("blocked", "fullName email avatar rating")
      .lean();

    res.json({
      blockedUsers: items
        .filter((entry) => entry.blocked?._id)
        .map((entry) => ({
          id: toId(entry.blocked._id),
          name: entry.blocked.fullName || "Unknown",
          email: entry.blocked.email || "",
          avatar: entry.blocked.avatar || "",
          rating: entry.blocked.rating || 1200,
          blockedAt: entry.createdAt,
        })),
    });
  } catch (err) {
    console.error("Block list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const blocker = req.user.userId;
    const blocked = String(req.params.userId || "").trim();

    if (!blocked || !isValidObjectId(blocked)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (blocked === blocker) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const target = await User.findOne({ _id: blocked, deletedAt: null })
      .select("_id")
      .lean();
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await BlockedUser.create({ blocker, blocked }).catch((error) => {
      if (error?.code !== 11000) throw error;
    });

    await Promise.all([
      Friend.deleteMany({
        $or: [
          { userId: blocker, friendId: blocked },
          { userId: blocked, friendId: blocker },
        ],
      }),
      FriendRequest.updateMany(
        {
          status: "pending",
          $or: [
            { from: blocker, to: blocked },
            { from: blocked, to: blocker },
          ],
        },
        { $set: { status: "declined", respondedAt: new Date() } },
      ),
      Message.updateMany(
        {
          status: "request_pending",
          $or: [
            { sender: blocker, receiver: blocked },
            { sender: blocked, receiver: blocker },
          ],
        },
        { $set: { status: "request_declined" } },
      ),
    ]);

    res.json({ success: true, blocker: toId(blocker), blocked: toId(blocked) });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/block/:userId", authMiddleware, async (req, res) => {
  try {
    const blocker = req.user.userId;
    const blocked = String(req.params.userId || "").trim();

    if (!blocked || !isValidObjectId(blocked)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    await BlockedUser.deleteOne({ blocker, blocked });
    res.json({ success: true, blocker: toId(blocker), blocked: toId(blocked) });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
