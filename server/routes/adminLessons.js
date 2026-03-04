import { Router } from "express";
import mongoose from "mongoose";
import { adminAuthMiddleware } from "../middleware/index.js";
import { Lesson } from "../models/index.js";

const router = Router();
router.use(adminAuthMiddleware);

const VALID_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const VALID_STATUSES = new Set(["draft", "published", "archived"]);
const VALID_SECTION_TYPES = new Set(["text", "board", "quiz"]);

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeMove(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[+#?!]/g, "");
  if (raw === "000") return "ooo";
  if (raw === "00") return "oo";
  return raw;
}

function normalizeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 220);
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .map((tag) =>
          String(tag || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

function sanitizeSections(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 200)
    .map((raw) => {
      const type = VALID_SECTION_TYPES.has(
        String(raw?.type || "")
          .trim()
          .toLowerCase(),
      )
        ? String(raw.type).trim().toLowerCase()
        : "text";
      const title = String(raw?.title || "").trim().slice(0, 180);
      const content = String(raw?.content || "").trim().slice(0, 6000);
      const fen = String(raw?.fen || "").trim().slice(0, 200);
      const expectedMoves = Array.isArray(raw?.expectedMoves)
        ? [
            ...new Set(
              raw.expectedMoves
                .map((value) => normalizeMove(value))
                .filter(Boolean),
            ),
          ].slice(0, 50)
        : [];
      return {
        type,
        title,
        content,
        fen,
        expectedMoves,
      };
    })
    .filter((section) => section.title || section.content || section.fen);
}

async function generateUniqueSlug(base, excludeId = null) {
  const baseSlug = normalizeSlug(base) || `lesson-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Lesson.findOne(query).select("_id").lean();
    if (!exists) return candidate;
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function mapLesson(lesson) {
  return {
    _id: String(lesson._id),
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description || "",
    level: lesson.level,
    tags: Array.isArray(lesson.tags) ? lesson.tags : [],
    sections: Array.isArray(lesson.sections)
      ? lesson.sections.map((section, index) => ({
          index,
          type: section.type || "text",
          title: section.title || "",
          content: section.content || "",
          fen: section.fen || "",
          expectedMoves: Array.isArray(section.expectedMoves)
            ? section.expectedMoves
            : [],
        }))
      : [],
    estimatedMinutes: Number(lesson.estimatedMinutes || 10),
    status: lesson.status,
    authorName: lesson.authorName || "Admin",
    authorId: lesson.authorId ? String(lesson.authorId) : null,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20),
    );
    const skip = (page - 1) * limit;
    const level = String(req.query.level || "")
      .trim()
      .toLowerCase();
    const status = String(req.query.status || "")
      .trim()
      .toLowerCase();
    const search = String(req.query.search || "").trim();

    const query = {};
    if (VALID_LEVELS.has(level)) query.level = level;
    if (VALID_STATUSES.has(status)) query.status = status;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { description: regex }, { slug: regex }];
    }

    const [items, total] = await Promise.all([
      Lesson.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lesson.countDocuments(query),
    ]);

    res.json({
      lessons: items.map(mapLesson),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Admin lessons list error:", error);
    res.status(500).json({ error: "Failed to fetch lesson list" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid lesson id" });
    }

    const lesson = await Lesson.findById(id).lean();
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ lesson: mapLesson(lesson) });
  } catch (error) {
    console.error("Admin lesson detail error:", error);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

router.post("/", async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const level = String(req.body?.level || "beginner")
      .trim()
      .toLowerCase();
    if (!VALID_LEVELS.has(level)) {
      return res.status(400).json({ error: "Invalid lesson level" });
    }

    const status = String(req.body?.status || "draft")
      .trim()
      .toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid lesson status" });
    }

    const slug = await generateUniqueSlug(req.body?.slug || title);
    const lesson = await Lesson.create({
      title: title.slice(0, 180),
      slug,
      description: String(req.body?.description || "").trim().slice(0, 500),
      level,
      tags: normalizeTags(req.body?.tags),
      sections: sanitizeSections(req.body?.sections),
      estimatedMinutes: Math.max(
        1,
        Math.min(
          600,
          Number.parseInt(String(req.body?.estimatedMinutes || "10"), 10) || 10,
        ),
      ),
      status,
      authorName: String(
        req.body?.authorName || req.admin?.username || "Admin",
      )
        .trim()
        .slice(0, 120),
      authorId: req.admin?.adminId || null,
    });

    res.status(201).json({ lesson: mapLesson(lesson) });
  } catch (error) {
    console.error("Admin lesson create error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "slug already exists" });
    }
    res.status(500).json({ error: "Failed to create lesson" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid lesson id" });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ error: "title cannot be empty" });
      lesson.title = title.slice(0, 180);
    }
    if (req.body?.slug !== undefined) {
      lesson.slug = await generateUniqueSlug(req.body.slug, id);
    }
    if (req.body?.description !== undefined) {
      lesson.description = String(req.body.description || "")
        .trim()
        .slice(0, 500);
    }
    if (req.body?.level !== undefined) {
      const level = String(req.body.level || "")
        .trim()
        .toLowerCase();
      if (!VALID_LEVELS.has(level)) {
        return res.status(400).json({ error: "Invalid lesson level" });
      }
      lesson.level = level;
    }
    if (req.body?.status !== undefined) {
      const status = String(req.body.status || "")
        .trim()
        .toLowerCase();
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: "Invalid lesson status" });
      }
      lesson.status = status;
    }
    if (req.body?.tags !== undefined) {
      lesson.tags = normalizeTags(req.body.tags);
    }
    if (req.body?.sections !== undefined) {
      lesson.sections = sanitizeSections(req.body.sections);
    }
    if (req.body?.estimatedMinutes !== undefined) {
      lesson.estimatedMinutes = Math.max(
        1,
        Math.min(
          600,
          Number.parseInt(String(req.body.estimatedMinutes || "10"), 10) || 10,
        ),
      );
    }
    if (req.body?.authorName !== undefined) {
      lesson.authorName = String(req.body.authorName || "")
        .trim()
        .slice(0, 120);
    }

    await lesson.save();
    res.json({ lesson: mapLesson(lesson) });
  } catch (error) {
    console.error("Admin lesson update error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "slug already exists" });
    }
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid lesson id" });
    }
    const lesson = await Lesson.findByIdAndDelete(id).lean();
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    res.json({ success: true, id: String(lesson._id) });
  } catch (error) {
    console.error("Admin lesson delete error:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

export default router;
