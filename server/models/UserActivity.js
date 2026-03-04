import mongoose from "mongoose";

const UserActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    eventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    movesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeSpentSec: {
      type: Number,
      default: 0,
      min: 0,
    },
    puzzlesAttempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSeenAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

UserActivitySchema.index({ userId: 1, dateKey: 1 }, { unique: true });
UserActivitySchema.index({ dateKey: 1, userId: 1 });
UserActivitySchema.index({ date: -1, eventCount: -1 });

const UserActivity =
  mongoose.models.UserActivity ||
  mongoose.model("UserActivity", UserActivitySchema);

export default UserActivity;
