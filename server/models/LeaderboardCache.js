import mongoose from "mongoose";

const LeaderboardEntrySchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, min: 1 },
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    avatar: { type: String, default: "", trim: true, maxlength: 400 },
    rating: { type: Number, required: true },
    games: { type: Number, required: true, min: 0 },
    isProvisional: { type: Boolean, default: false },
  },
  { _id: false },
);

const LeaderboardCacheSchema = new mongoose.Schema(
  {
    pool: {
      type: String,
      enum: ["bullet", "blitz", "rapid", "classical"],
      required: true,
      index: true,
    },
    includeProvisional: { type: Boolean, required: true, default: false },
    minGames: { type: Number, required: true, min: 0, default: 10 },
    entries: { type: [LeaderboardEntrySchema], default: [] },
    total: { type: Number, default: 0, min: 0 },
    refreshedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

LeaderboardCacheSchema.index(
  { pool: 1, includeProvisional: 1, minGames: 1 },
  { unique: true },
);

const LeaderboardCache =
  mongoose.models.LeaderboardCache ||
  mongoose.model("LeaderboardCache", LeaderboardCacheSchema);

export default LeaderboardCache;
