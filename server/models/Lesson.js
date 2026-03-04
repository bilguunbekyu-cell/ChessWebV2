import mongoose from "mongoose";

const LessonSectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "board", "quiz"],
      default: "text",
      index: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 6000,
    },
    fen: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    expectedMoves: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 220,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    sections: {
      type: [LessonSectionSchema],
      default: [],
    },
    estimatedMinutes: {
      type: Number,
      default: 10,
      min: 1,
      max: 600,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    authorName: {
      type: String,
      default: "Admin",
      trim: true,
      maxlength: 120,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

LessonSchema.index({ status: 1, level: 1, createdAt: -1 });
LessonSchema.index({ tags: 1, status: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);

export default Lesson;
