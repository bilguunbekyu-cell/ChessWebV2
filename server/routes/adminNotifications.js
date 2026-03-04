import { Router } from "express";
import { adminAuthMiddleware } from "../middleware/index.js";
import { User } from "../models/index.js";
import { notifyUsers } from "../services/notify.js";

const router = Router();

router.post("/broadcast", adminAuthMiddleware, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const message = String(req.body?.message || "").trim().slice(0, 600);
    const link = String(req.body?.link || "").trim().slice(0, 300);
    const audience = String(req.body?.audience || "all")
      .trim()
      .toLowerCase();
    const explicitUserIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];

    if (!title || !message) {
      return res
        .status(400)
        .json({ error: "title and message are required" });
    }

    let userIds = [];
    if (explicitUserIds.length > 0) {
      userIds = explicitUserIds;
    } else if (audience === "active") {
      const users = await User.find({ presenceStatus: { $ne: "offline" } })
        .select("_id")
        .lean();
      userIds = users.map((user) => String(user._id));
    } else if (audience === "banned") {
      const users = await User.find({ banned: true }).select("_id").lean();
      userIds = users.map((user) => String(user._id));
    } else {
      const users = await User.find({}).select("_id").lean();
      userIds = users.map((user) => String(user._id));
    }

    const created = await notifyUsers(req.app, userIds, {
      type: "admin_broadcast",
      title,
      message,
      link,
      payload: {
        audience: explicitUserIds.length > 0 ? "custom" : audience,
        adminId: req.admin?.adminId || null,
      },
    });

    res.json({
      success: true,
      sent: created.length,
      audience: explicitUserIds.length > 0 ? "custom" : audience,
    });
  } catch (error) {
    console.error("Admin broadcast notification error:", error);
    res.status(500).json({ error: "Failed to broadcast notifications" });
  }
});

export default router;
