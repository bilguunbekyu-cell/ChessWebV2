import { Router } from "express";
import { authMiddleware } from "../middleware/index.js";
import { Feedback } from "../models/index.js";
import {
  normalizeFeedbackCategory,
  normalizeFeedbackMessage,
  normalizeFeedbackScreenshots,
  validateFeedbackMessage,
} from "../utils/feedbackInput.js";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const category = normalizeFeedbackCategory(req.body?.category);
    const message = normalizeFeedbackMessage(req.body?.message);
    const screenshots = normalizeFeedbackScreenshots(req.body?.screenshots);

    if (!validateFeedbackMessage(message, 10)) {
      return res
        .status(400)
        .json({ error: "Feedback message must be at least 10 characters." });
    }

    const feedback = await Feedback.create({
      userId: req.user.userId,
      category,
      message,
      screenshots,
      status: "open",
    });

    res.status(201).json({
      success: true,
      feedback: {
        _id: String(feedback._id),
        category: feedback.category,
        message: feedback.message,
        screenshots: feedback.screenshots || [],
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const items = await Feedback.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      feedback: items.map((item) => ({
        _id: String(item._id),
        category: item.category,
        message: item.message,
        status: item.status,
        screenshots: item.screenshots || [],
        adminReply: item.adminReply || "",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        closedAt: item.closedAt || null,
      })),
    });
  } catch (error) {
    console.error("Fetch own feedback error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

export default router;
