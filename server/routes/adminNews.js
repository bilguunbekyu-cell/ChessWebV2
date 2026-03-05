import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { NewsArticle, User } from "../models/index.js";
import { notifyUsers } from "../services/notify.js";
import { normalizeSlug, normalizeTags } from "../utils/newsInput.js";

const router = Router();
router.use(adminAuthMiddleware);

const VALID_STATUSES = new Set(["draft", "published", "archived"]);

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

async function generateUniqueSlug(base, excludeId = null) {
  const baseSlug = normalizeSlug(base) || `news-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await NewsArticle.findOne(query).select("_id").lean();
    if (!exists) return candidate;
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function mapArticle(article) {
  return {
    _id: String(article._id),
    title: article.title,
    slug: article.slug,
    coverImage: article.coverImage || "",
    excerpt: article.excerpt || "",
    tags: Array.isArray(article.tags) ? article.tags : [],
    contentMarkdown: article.contentMarkdown || "",
    contentHtml: article.contentHtml || "",
    authorName: article.authorName || "Admin",
    authorId: article.authorId ? String(article.authorId) : null,
    status: article.status,
    publishedAt: article.publishedAt || null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}

async function notifyArticlePublished(app, article) {
  try {
    if (!app || !article?._id || !article?.slug) return;

    const users = await User.find({ deletedAt: null }).select("_id").lean();
    const userIds = users.map((user) => String(user._id)).filter(Boolean);
    if (!userIds.length) return;

    await notifyUsers(app, userIds, {
      type: "news_published",
      title: "New article published",
      message: String(article.title || "A new article is available.").slice(0, 220),
      link: `/news/${article.slug}`,
      payload: {
        articleId: String(article._id),
        slug: article.slug,
        tags: Array.isArray(article.tags) ? article.tags : [],
      },
    });
  } catch (error) {
    console.error("News publish notification error:", error);
  }
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20),
    );
    const skip = (page - 1) * limit;
    const status = String(req.query.status || "").trim().toLowerCase();
    const tag = String(req.query.tag || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();

    const query = {};
    if (status && VALID_STATUSES.has(status)) query.status = status;
    if (tag) query.tags = tag;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { excerpt: regex }, { slug: regex }];
    }

    const [items, total] = await Promise.all([
      NewsArticle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NewsArticle.countDocuments(query),
    ]);

    res.json({
      articles: items.map(mapArticle),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Admin news list error:", error);
    res.status(500).json({ error: "Failed to fetch news list" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid article id" });
    }

    const article = await NewsArticle.findById(id).lean();
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({ article: mapArticle(article) });
  } catch (error) {
    console.error("Admin news detail error:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

router.post("/", async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const contentMarkdown = String(req.body?.contentMarkdown || "").trim();
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!contentMarkdown) {
      return res.status(400).json({ error: "contentMarkdown is required" });
    }

    const requestedStatus = String(req.body?.status || "draft")
      .trim()
      .toLowerCase();
    if (!VALID_STATUSES.has(requestedStatus)) {
      return res.status(400).json({ error: "Invalid article status" });
    }

    const providedSlug = String(req.body?.slug || "").trim();
    const slug = await generateUniqueSlug(providedSlug || title);
    const now = new Date();
    const publishedAtInput = req.body?.publishedAt
      ? new Date(req.body.publishedAt)
      : null;
    const publishedAt =
      requestedStatus === "published"
        ? Number.isFinite(publishedAtInput?.getTime?.())
          ? publishedAtInput
          : now
        : null;

    const article = await NewsArticle.create({
      title: title.slice(0, 180),
      slug,
      coverImage: String(req.body?.coverImage || "").trim().slice(0, 400),
      excerpt: String(req.body?.excerpt || "").trim().slice(0, 500),
      tags: normalizeTags(req.body?.tags),
      contentMarkdown,
      contentHtml: String(req.body?.contentHtml || "").trim(),
      authorName: String(
        req.body?.authorName || req.admin?.username || "Admin",
      )
        .trim()
        .slice(0, 120),
      authorId: req.admin?.adminId || null,
      status: requestedStatus,
      publishedAt,
    });

    if (article.status === "published") {
      void notifyArticlePublished(req.app, article);
    }

    res.status(201).json({ article: mapArticle(article) });
  } catch (error) {
    console.error("Admin create news error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "slug already exists" });
    }
    res.status(500).json({ error: "Failed to create article" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid article id" });
    }

    const article = await NewsArticle.findById(id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const wasPublished = article.status === "published";

    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ error: "title cannot be empty" });
      article.title = title.slice(0, 180);
    }
    if (req.body?.slug !== undefined) {
      const slug = await generateUniqueSlug(String(req.body.slug || "").trim(), id);
      article.slug = slug;
    }
    if (req.body?.coverImage !== undefined) {
      article.coverImage = String(req.body.coverImage || "").trim().slice(0, 400);
    }
    if (req.body?.excerpt !== undefined) {
      article.excerpt = String(req.body.excerpt || "").trim().slice(0, 500);
    }
    if (req.body?.tags !== undefined) {
      article.tags = normalizeTags(req.body.tags);
    }
    if (req.body?.contentMarkdown !== undefined) {
      const contentMarkdown = String(req.body.contentMarkdown || "").trim();
      if (!contentMarkdown) {
        return res.status(400).json({ error: "contentMarkdown cannot be empty" });
      }
      article.contentMarkdown = contentMarkdown;
    }
    if (req.body?.contentHtml !== undefined) {
      article.contentHtml = String(req.body.contentHtml || "").trim();
    }
    if (req.body?.authorName !== undefined) {
      article.authorName = String(req.body.authorName || "").trim().slice(0, 120);
    }
    if (req.body?.status !== undefined) {
      const status = String(req.body.status || "").trim().toLowerCase();
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: "Invalid article status" });
      }
      article.status = status;
      if (status === "published" && !article.publishedAt) {
        article.publishedAt = new Date();
      }
      if (status !== "published") {
        article.publishedAt = null;
      }
    }
    if (req.body?.publishedAt !== undefined) {
      if (req.body.publishedAt === null || req.body.publishedAt === "") {
        article.publishedAt = null;
      } else {
        const parsed = new Date(req.body.publishedAt);
        if (!Number.isFinite(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid publishedAt value" });
        }
        article.publishedAt = parsed;
      }
    }

    await article.save();
    if (!wasPublished && article.status === "published") {
      void notifyArticlePublished(req.app, article);
    }
    res.json({ article: mapArticle(article) });
  } catch (error) {
    console.error("Admin update news error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "slug already exists" });
    }
    res.status(500).json({ error: "Failed to update article" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid article id" });
    }

    const article = await NewsArticle.findByIdAndDelete(id).lean();
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({ success: true, id: String(article._id) });
  } catch (error) {
    console.error("Admin delete news error:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
});

export default router;
