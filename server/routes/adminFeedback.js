import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { Feedback } from "../models/index.js";
import { notifyUser } from "../services/notify.js";
import { decryptField } from "../utils/fieldEncryption.js";

const router = Router();

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

router.get("/", adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "30"), 10) || 30),
    );
    const skip = Math.max(
      0,
      Number.parseInt(String(req.query.skip || "0"), 10) || 0,
    );
    const status = String(req.query.status || "").trim().toLowerCase();
    const query = {};
    if (status === "open" || status === "closed") {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName email avatar")
        .lean(),
      Feedback.countDocuments(query),
    ]);

    res.json({
      feedback: items.map((item) => ({
        _id: String(item._id),
        category: item.category,
        message: decryptField(item.message),
        screenshots: item.screenshots || [],
        status: item.status,
        adminReply: decryptField(item.adminReply || ""),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        closedAt: item.closedAt || null,
        user: item.userId
          ? {
              _id: String(item.userId._id),
              fullName: item.userId.fullName,
              email: item.userId.email,
              avatar: item.userId.avatar || "",
            }
          : null,
      })),
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error("Admin feedback list error:", error);
    res.status(500).json({ error: "Failed to fetch feedback list" });
  }
});

router.patch("/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid feedback id" });
    }

    const status = String(req.body?.status || "").trim().toLowerCase();
    const adminReply = String(req.body?.adminReply || "").trim().slice(0, 4000);
    if (status && status !== "open" && status !== "closed") {
      return res.status(400).json({ error: "Invalid feedback status" });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    if (status) {
      feedback.status = status;
      feedback.closedAt = status === "closed" ? new Date() : null;
    }
    if (adminReply) {
      feedback.adminReply = adminReply;
    }
    await feedback.save();

    if (adminReply || status === "closed") {
      await notifyUser(req.app, {
        userId: feedback.userId,
        type: "feedback_update",
        title: "Feedback update",
        message:
          status === "closed"
            ? "Your feedback has been reviewed and closed."
            : "You received a reply on your feedback.",
        link: "/settings",
        payload: {
          feedbackId: String(feedback._id),
          status: feedback.status,
        },
      });
    }

    const populated = await Feedback.findById(feedback._id)
      .populate("userId", "fullName email avatar")
      .lean();

    res.json({
      success: true,
      feedback: {
        _id: String(populated._id),
        category: populated.category,
        message: decryptField(populated.message),
        screenshots: populated.screenshots || [],
        status: populated.status,
        adminReply: decryptField(populated.adminReply || ""),
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
        closedAt: populated.closedAt || null,
        user: populated.userId
          ? {
              _id: String(populated.userId._id),
              fullName: populated.userId.fullName,
              email: populated.userId.email,
              avatar: populated.userId.avatar || "",
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Admin feedback update error:", error);
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

export default router;
