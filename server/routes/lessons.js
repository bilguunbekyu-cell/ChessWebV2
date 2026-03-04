import mongoose from "mongoose";
import { Router } from "express";
import { authMiddleware } from "../middleware/index.js";
import { Lesson, LessonProgress } from "../models/index.js";

const router = Router();

const ALLOWED_LEVELS = new Set(["beginner", "intermediate", "advanced"]);

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
  if (raw === "0-0-0") return "ooo";
  if (raw === "0-0") return "oo";
  if (raw === "o-o-o") return "ooo";
  if (raw === "o-o") return "oo";
  return raw;
}

function normalizeCompletedSections(values, totalSections) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => Number.parseInt(String(value), 10))
        .filter(
          (value) =>
            Number.isFinite(value) && value >= 0 && value < totalSections,
        ),
    ),
  ].sort((a, b) => a - b);
}

function mapProgress(progressDoc, totalSections) {
  const completedSections = Array.isArray(progressDoc?.completedSections)
    ? progressDoc.completedSections
        .map((value) => Number.parseInt(String(value), 10))
        .filter(
          (value) =>
            Number.isFinite(value) && value >= 0 && value < totalSections,
        )
        .sort((a, b) => a - b)
    : [];
  const completedCount = completedSections.length;
  const percent =
    totalSections > 0
      ? Math.max(0, Math.min(100, Math.round((completedCount / totalSections) * 100)))
      : 0;
  const isCompleted = totalSections > 0 && completedCount >= totalSections;

  return {
    completedSections,
    completedCount,
    totalSections,
    percent,
    isCompleted,
    lastSection:
      completedSections.length > 0
        ? completedSections[completedSections.length - 1]
        : -1,
    completedAt: progressDoc?.completedAt || null,
    updatedAt: progressDoc?.updatedAt || null,
  };
}

function mapLessonSummary(lesson, progressDoc = null) {
  const sectionsCount = Array.isArray(lesson.sections) ? lesson.sections.length : 0;
  return {
    _id: String(lesson._id),
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description || "",
    level: lesson.level,
    tags: Array.isArray(lesson.tags) ? lesson.tags : [],
    estimatedMinutes: Number(lesson.estimatedMinutes || 10),
    sectionsCount,
    progress: mapProgress(progressDoc, sectionsCount),
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

function mapLessonDetail(lesson, progressDoc = null) {
  const sections = Array.isArray(lesson.sections)
    ? lesson.sections.map((section, index) => ({
        index,
        type: section.type || "text",
        title: section.title || "",
        content: section.content || "",
        fen: section.fen || "",
        hasExpectedMoves:
          Array.isArray(section.expectedMoves) && section.expectedMoves.length > 0,
      }))
    : [];

  return {
    _id: String(lesson._id),
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description || "",
    level: lesson.level,
    tags: Array.isArray(lesson.tags) ? lesson.tags : [],
    estimatedMinutes: Number(lesson.estimatedMinutes || 10),
    sections,
    progress: mapProgress(progressDoc, sections.length),
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

async function findPublishedLessonOrNull(idOrSlug) {
  const value = String(idOrSlug || "").trim();
  if (!value) return null;
  const query = { status: "published" };
  if (isValidObjectId(value)) {
    query._id = value;
  } else {
    query.slug = value.toLowerCase();
  }
  return Lesson.findOne(query).lean();
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const level = String(req.query.level || "")
      .trim()
      .toLowerCase();
    const tag = String(req.query.tag || "")
      .trim()
      .toLowerCase();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "50"), 10) || 50),
    );

    const query = { status: "published" };
    if (level && ALLOWED_LEVELS.has(level)) query.level = level;
    if (tag) query.tags = tag;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { description: regex }];
    }

    const lessons = await Lesson.find(query)
      .sort({ level: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const lessonIds = lessons.map((lesson) => lesson._id);
    const progressRows =
      lessonIds.length > 0
        ? await LessonProgress.find({
            userId: req.user.userId,
            lessonId: { $in: lessonIds },
          }).lean()
        : [];
    const progressByLessonId = new Map(
      progressRows.map((row) => [String(row.lessonId), row]),
    );

    res.json({
      lessons: lessons.map((lesson) =>
        mapLessonSummary(lesson, progressByLessonId.get(String(lesson._id))),
      ),
    });
  } catch (error) {
    console.error("Lessons list error:", error);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const lesson = await findPublishedLessonOrNull(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const progress = await LessonProgress.findOne({
      userId: req.user.userId,
      lessonId: lesson._id,
    }).lean();

    res.json({ lesson: mapLessonDetail(lesson, progress) });
  } catch (error) {
    console.error("Lesson detail error:", error);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

router.post("/:id/progress", authMiddleware, async (req, res) => {
  try {
    const lesson = await findPublishedLessonOrNull(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const totalSections = Array.isArray(lesson.sections) ? lesson.sections.length : 0;
    const providedSectionIndex =
      req.body?.sectionIndex !== undefined && req.body?.sectionIndex !== null
        ? Number.parseInt(String(req.body.sectionIndex), 10)
        : null;

    if (
      providedSectionIndex !== null &&
      (!Number.isFinite(providedSectionIndex) ||
        providedSectionIndex < 0 ||
        providedSectionIndex >= totalSections)
    ) {
      return res.status(400).json({ error: "Invalid section index" });
    }

    let progress = await LessonProgress.findOne({
      userId: req.user.userId,
      lessonId: lesson._id,
    });
    if (!progress) {
      progress = new LessonProgress({
        userId: req.user.userId,
        lessonId: lesson._id,
      });
    }

    let completedSections = normalizeCompletedSections(
      progress.completedSections,
      totalSections,
    );
    if (Array.isArray(req.body?.completedSections)) {
      completedSections = normalizeCompletedSections(
        req.body.completedSections,
        totalSections,
      );
    }
    if (providedSectionIndex !== null && !completedSections.includes(providedSectionIndex)) {
      completedSections = [...completedSections, providedSectionIndex].sort(
        (a, b) => a - b,
      );
    }

    const completedCount = completedSections.length;
    const percent =
      totalSections > 0
        ? Math.max(0, Math.min(100, Math.round((completedCount / totalSections) * 100)))
        : 0;
    const isCompleted = totalSections > 0 && completedCount >= totalSections;

    progress.completedSections = completedSections;
    progress.percent = percent;
    progress.isCompleted = isCompleted;
    progress.lastSection =
      completedSections.length > 0
        ? completedSections[completedSections.length - 1]
        : -1;
    progress.completedAt = isCompleted ? progress.completedAt || new Date() : null;
    await progress.save();

    res.json({
      success: true,
      lessonId: String(lesson._id),
      progress: mapProgress(progress, totalSections),
    });
  } catch (error) {
    console.error("Lesson progress update error:", error);
    res.status(500).json({ error: "Failed to save lesson progress" });
  }
});

router.post("/:id/validate-move", authMiddleware, async (req, res) => {
  try {
    const lesson = await findPublishedLessonOrNull(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const sectionIndex = Number.parseInt(String(req.body?.sectionIndex), 10);
    if (
      !Number.isFinite(sectionIndex) ||
      sectionIndex < 0 ||
      sectionIndex >= lesson.sections.length
    ) {
      return res.status(400).json({ error: "Invalid section index" });
    }

    const section = lesson.sections[sectionIndex];
    if (!section || (section.type !== "board" && section.type !== "quiz")) {
      return res
        .status(400)
        .json({ error: "This section is not an interactive move section" });
    }

    const move = normalizeMove(req.body?.move);
    if (!move) {
      return res.status(400).json({ error: "move is required" });
    }

    const expectedMoves = (Array.isArray(section.expectedMoves)
      ? section.expectedMoves
      : []
    )
      .map((value) => normalizeMove(value))
      .filter(Boolean);
    if (expectedMoves.length === 0) {
      return res
        .status(400)
        .json({ error: "No expected moves are configured for this section" });
    }

    const isCorrect = expectedMoves.includes(move);
    return res.json({
      success: true,
      sectionIndex,
      isCorrect,
      message: isCorrect ? "Correct move." : "Incorrect move. Try again.",
    });
  } catch (error) {
    console.error("Lesson move validation error:", error);
    res.status(500).json({ error: "Failed to validate move" });
  }
});

export default router;
