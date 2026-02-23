import { Router } from "express";
import { authMiddleware } from "../middleware/index.js";
import { Friend, User } from "../models/index.js";

const router = Router();

// List friends for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friends = await Friend.find({ userId })
      .populate("friendId", "fullName email avatar rating")
      .lean();

    const result = friends.map((f) => ({
      id: f.friendId?._id,
      name: f.friendId?.fullName || "Unknown",
      email: f.friendId?.email,
      avatar: f.friendId?.avatar || "",
      rating: f.friendId?.rating || 1200,
      since: f.createdAt,
    }));

    res.json({ friends: result });
  } catch (err) {
    console.error("Friends list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Search users to add
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = (req.query.q || "").toString().trim();
    if (!query) return res.json({ results: [] });

    const existing = await Friend.find({ userId }).select("friendId").lean();
    const existingIds = new Set(existing.map((f) => f.friendId.toString()));

    const regex = new RegExp(query, "i");
    const users = await User.find({
      _id: { $ne: userId },
      $or: [{ fullName: regex }, { email: regex }],
    })
      .select("fullName email avatar rating")
      .limit(10)
      .lean();

    const results = users
      .filter((u) => !existingIds.has(u._id.toString()))
      .map((u) => ({
        id: u._id,
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

// Add friend (mutual)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.body || {};

    if (!friendId) {
      return res.status(400).json({ error: "friendId is required" });
    }
    if (friendId === userId) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }

    const friendUser = await User.findById(friendId).select("_id");
    if (!friendUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await Friend.findOne({ userId, friendId }).lean();
    if (existing) {
      return res.json({ success: true, already: true });
    }

    await Friend.create({ userId, friendId }).catch((e) => {
      if (e.code !== 11000) throw e;
    });
    await Friend.create({ userId: friendId, friendId: userId }).catch((e) => {
      if (e.code !== 11000) throw e;
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove friend (mutual)
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

export default router;
