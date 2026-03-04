import mongoose from "mongoose";

const CheatReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "History",
      default: [],
    },
    source: {
      type: String,
      enum: ["manual_scan", "batch_scan", "auto_scan"],
      default: "manual_scan",
      index: true,
    },
    metrics: {
      gamesConsidered: { type: Number, default: 0 },
      gamesAnalyzed: { type: Number, default: 0 },
      movesAnalyzed: { type: Number, default: 0 },
      bestMoveMatchRate: { type: Number, default: null },
      top3MatchRate: { type: Number, default: null },
      avgCentipawnLoss: { type: Number, default: 0 },
      nearPerfectMoveRate: { type: Number, default: 0 },
      strongMoveRate: { type: Number, default: 0 },
      blunderRate: { type: Number, default: 0 },
      avgMoveTimeSec: { type: Number, default: 0 },
      avgMoveTimeStdSec: { type: Number, default: 0 },
      lowVarianceGameRate: { type: Number, default: 0 },
      criticalWindowRate: { type: Number, default: 0 },
      suspicionScore: { type: Number, default: 0, index: true },
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
        index: true,
      },
    },
    flags: {
      type: [String],
      default: [],
    },
    dataGaps: {
      bestMoveUnavailable: { type: Boolean, default: true },
      top3Unavailable: { type: Boolean, default: true },
      notes: { type: [String], default: [] },
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
    reviewAction: {
      type: String,
      enum: ["none", "warn", "restrict", "ban"],
      default: "none",
      index: true,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

CheatReportSchema.index({ status: 1, createdAt: -1 });
CheatReportSchema.index({ "metrics.suspicionScore": -1, createdAt: -1 });
CheatReportSchema.index({ userId: 1, createdAt: -1 });

const CheatReport =
  mongoose.models.CheatReport ||
  mongoose.model("CheatReport", CheatReportSchema);

export default CheatReport;
