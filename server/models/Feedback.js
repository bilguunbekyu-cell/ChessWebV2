import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["general", "bug", "feature", "account", "other"],
      default: "general",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    screenshots: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    adminReply: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

const Feedback =
  mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);

export default Feedback;
