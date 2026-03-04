import mongoose from "mongoose";

const FriendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

FriendRequestSchema.index({ from: 1, to: 1, status: 1 }, { unique: true });
FriendRequestSchema.index({ to: 1, status: 1, createdAt: -1 });

const FriendRequest =
  mongoose.models.FriendRequest ||
  mongoose.model("FriendRequest", FriendRequestSchema);

export default FriendRequest;
