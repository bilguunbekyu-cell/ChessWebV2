import mongoose from "mongoose";
import { encryptField } from "../utils/fieldEncryption.js";

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

function encryptMutableFields(updatePayload) {
  if (!updatePayload || typeof updatePayload !== "object") return;

  const targets = [updatePayload, updatePayload.$set].filter(Boolean);
  for (const target of targets) {
    if (typeof target.message === "string") {
      target.message = encryptField(target.message);
    }
    if (typeof target.adminReply === "string") {
      target.adminReply = encryptField(target.adminReply);
    }
  }
}

FeedbackSchema.pre("save", function encryptFeedbackOnSave(next) {
  if (this.isModified("message")) {
    this.message = encryptField(this.message);
  }
  if (this.isModified("adminReply")) {
    this.adminReply = encryptField(this.adminReply);
  }
  next();
});

FeedbackSchema.pre("findOneAndUpdate", function encryptFeedbackOnUpdate(next) {
  encryptMutableFields(this.getUpdate());
  next();
});

FeedbackSchema.pre("updateOne", function encryptFeedbackOnUpdate(next) {
  encryptMutableFields(this.getUpdate());
  next();
});

FeedbackSchema.pre("updateMany", function encryptFeedbackOnUpdate(next) {
  encryptMutableFields(this.getUpdate());
  next();
});

const Feedback =
  mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);

export default Feedback;
