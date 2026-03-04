import mongoose from "mongoose";

const NewsArticleSchema = new mongoose.Schema(
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
    coverImage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 400,
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    tags: {
      type: [String],
      default: [],
    },
    contentMarkdown: {
      type: String,
      required: true,
      trim: true,
    },
    contentHtml: {
      type: String,
      default: "",
      trim: true,
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
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

NewsArticleSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
NewsArticleSchema.index({ tags: 1, status: 1, publishedAt: -1 });

const NewsArticle =
  mongoose.models.NewsArticle ||
  mongoose.model("NewsArticle", NewsArticleSchema);

export default NewsArticle;
