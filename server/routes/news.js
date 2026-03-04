import { Router } from "express";
import { NewsArticle } from "../models/index.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(String(req.query.limit || "12"), 10) || 12),
    );
    const skip = (page - 1) * limit;
    const tag = String(req.query.tag || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();

    const query = {
      status: "published",
      publishedAt: { $ne: null },
    };
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { excerpt: regex }];
    }

    const [items, total] = await Promise.all([
      NewsArticle.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "title slug coverImage excerpt tags authorName publishedAt createdAt updatedAt",
        )
        .lean(),
      NewsArticle.countDocuments(query),
    ]);

    res.json({
      articles: items.map((item) => ({
        _id: String(item._id),
        title: item.title,
        slug: item.slug,
        coverImage: item.coverImage || "",
        excerpt: item.excerpt || "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        authorName: item.authorName || "Admin",
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("News list error:", error);
    res.status(500).json({ error: "Failed to fetch news articles" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: "Invalid article slug" });
    }

    const article = await NewsArticle.findOne({
      slug,
      status: "published",
      publishedAt: { $ne: null },
    }).lean();

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({
      article: {
        _id: String(article._id),
        title: article.title,
        slug: article.slug,
        coverImage: article.coverImage || "",
        excerpt: article.excerpt || "",
        tags: Array.isArray(article.tags) ? article.tags : [],
        contentMarkdown: article.contentMarkdown || "",
        contentHtml: article.contentHtml || "",
        authorName: article.authorName || "Admin",
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
    });
  } catch (error) {
    console.error("News detail error:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

export default router;
