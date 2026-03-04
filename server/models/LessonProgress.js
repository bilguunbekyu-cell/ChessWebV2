import mongoose from "mongoose";

const LessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    completedSections: {
      type: [Number],
      default: [],
    },
    lastSection: {
      type: Number,
      default: -1,
    },
    percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, updatedAt: -1 });

const LessonProgress =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", LessonProgressSchema);

export default LessonProgress;
