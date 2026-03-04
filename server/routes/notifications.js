import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/index.js";
import { Notification } from "../models/index.js";
import { serializeNotification } from "../services/notify.js";

const router = Router();

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "30"), 10) || 30),
    );
    const skip = Math.max(
      0,
      Number.parseInt(String(req.query.skip || "0"), 10) || 0,
    );
    const unreadOnly =
      String(req.query.unreadOnly || "").toLowerCase() === "true" ||
      String(req.query.unreadOnly || "") === "1";

    const query = { userId: req.user.userId };
    if (unreadOnly) {
      query.readAt = null;
    }

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.user.userId, readAt: null }),
    ]);

    res.json({
      notifications: items.map(serializeNotification),
      total,
      unreadCount,
      limit,
      skip,
    });
  } catch (error) {
    console.error("Notifications list error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.userId,
      readAt: null,
    });
    res.json({ count });
  } catch (error) {
    console.error("Notifications unread-count error:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    await Notification.updateMany(
      { userId: req.user.userId, readAt: null },
      { $set: { readAt: now } },
    );
    res.json({ success: true, readAt: now.toISOString() });
  } catch (error) {
    console.error("Notifications read-all error:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.userId,
      },
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean();

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, notification: serializeNotification(notification) });
  } catch (error) {
    console.error("Notifications read-one error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
