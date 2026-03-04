import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Play,
  Star,
  Target,
  Video,
  X,
} from "lucide-react";
import { courses } from "../data/mockData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface LessonProgress {
  completedSections: number[];
  completedCount: number;
  totalSections: number;
  percent: number;
  isCompleted: boolean;
  lastSection: number;
}

interface LessonSummary {
  _id: string;
  title: string;
  slug: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  estimatedMinutes: number;
  sectionsCount: number;
  progress: LessonProgress;
}

interface LessonSection {
  index: number;
  type: "text" | "board" | "quiz";
  title: string;
  content: string;
  fen: string;
  hasExpectedMoves: boolean;
}

interface LessonDetail {
  _id: string;
  title: string;
  slug: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  estimatedMinutes: number;
  sections: LessonSection[];
  progress: LessonProgress;
}

type CourseItem = {
  id: string;
  title: string;
  author: string;
  category: string;
  image: string;
  level: string;
  progress: number;
  lessons: number;
  backendLessonId?: string;
};

function levelColor(level: string) {
  switch (level) {
    case "Beginner":
    case "beginner":
      return "text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800";
    case "Intermediate":
    case "intermediate":
      return "text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800";
    case "Advanced":
    case "advanced":
      return "text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800";
    default:
      return "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
  }
}

function prettyLevel(level: string) {
  if (!level) return "Beginner";
  const raw = level.toLowerCase();
  if (raw === "intermediate") return "Intermediate";
  if (raw === "advanced") return "Advanced";
  return "Beginner";
}

function iconForLevel(level: string) {
  const raw = level.toLowerCase();
  if (raw === "advanced") return "♛";
  if (raw === "intermediate") return "♞";
  return "♙";
}

export default function Learn() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
  const [loadingLessonDetail, setLoadingLessonDetail] = useState(false);
  const [lessonDetailError, setLessonDetailError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<number | null>(null);
  const [validatingSection, setValidatingSection] = useState<number | null>(null);
  const [moveInputs, setMoveInputs] = useState<Record<number, string>>({});
  const [sectionFeedback, setSectionFeedback] = useState<
    Record<number, { ok: boolean; message: string }>
  >({});

  const fetchLessons = useCallback(async () => {
    try {
      setLoadingLessons(true);
      const res = await fetch(`${API_URL}/api/lessons`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load lessons");
      const data = await res.json();
      setLessons(Array.isArray(data.lessons) ? data.lessons : []);
      setLessonsError(null);
    } catch {
      setLessonsError("Failed to load lessons from backend.");
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }, []);

  useEffect(() => {
    void fetchLessons();
  }, [fetchLessons]);

  const openLesson = useCallback(async (lessonId: string) => {
    try {
      setLoadingLessonDetail(true);
      setLessonDetailError(null);
      setMoveInputs({});
      setSectionFeedback({});

      const res = await fetch(`${API_URL}/api/lessons/${lessonId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load lesson detail");
      const data = await res.json();
      if (!data.lesson) throw new Error("Lesson not found");
      setActiveLesson(data.lesson);
    } catch {
      setLessonDetailError("Failed to load this lesson.");
      setActiveLesson(null);
    } finally {
      setLoadingLessonDetail(false);
    }
  }, []);

  const closeLesson = () => {
    setActiveLesson(null);
    setLessonDetailError(null);
    setMoveInputs({});
    setSectionFeedback({});
  };

  const syncProgressInList = useCallback(
    (lessonId: string, progress: LessonProgress) => {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson._id === lessonId
            ? { ...lesson, progress, sectionsCount: progress.totalSections }
            : lesson,
        ),
      );
    },
    [],
  );

  const markSectionComplete = useCallback(
    async (sectionIndex: number) => {
      if (!activeLesson) return;
      try {
        setSavingSection(sectionIndex);
        const res = await fetch(`${API_URL}/api/lessons/${activeLesson._id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sectionIndex }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save progress");
        }

        const data = await res.json();
        const progress = data.progress as LessonProgress;
        setActiveLesson((prev) => (prev ? { ...prev, progress } : prev));
        syncProgressInList(activeLesson._id, progress);
        setSectionFeedback((prev) => ({
          ...prev,
          [sectionIndex]: { ok: true, message: "Section marked as complete." },
        }));
      } catch (error: unknown) {
        setSectionFeedback((prev) => ({
          ...prev,
          [sectionIndex]: {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to save section progress.",
          },
        }));
      } finally {
        setSavingSection(null);
      }
    },
    [activeLesson, syncProgressInList],
  );

  const validateSectionMove = useCallback(
    async (sectionIndex: number) => {
      if (!activeLesson) return;
      const move = String(moveInputs[sectionIndex] || "").trim();
      if (!move) {
        setSectionFeedback((prev) => ({
          ...prev,
          [sectionIndex]: { ok: false, message: "Enter a move first." },
        }));
        return;
      }

      try {
        setValidatingSection(sectionIndex);
        const res = await fetch(
          `${API_URL}/api/lessons/${activeLesson._id}/validate-move`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sectionIndex, move }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Validation failed");

        setSectionFeedback((prev) => ({
          ...prev,
          [sectionIndex]: {
            ok: data.isCorrect === true,
            message: String(
              data.message ||
                (data.isCorrect ? "Correct move." : "Incorrect move."),
            ),
          },
        }));
      } catch (error: unknown) {
        setSectionFeedback((prev) => ({
          ...prev,
          [sectionIndex]: {
            ok: false,
            message:
              error instanceof Error ? error.message : "Failed to validate move.",
          },
        }));
      } finally {
        setValidatingSection(null);
      }
    },
    [activeLesson, moveInputs],
  );

  const backendCourses: CourseItem[] = useMemo(
    () =>
      lessons.map((lesson) => ({
        id: lesson._id,
        title: lesson.title,
        author: "NeonGambit",
        category: lesson.tags[0] || "Lesson",
        image: iconForLevel(lesson.level),
        level: prettyLevel(lesson.level),
        progress: Number(lesson.progress?.percent || 0),
        lessons: Number(lesson.sectionsCount || 0),
        backendLessonId: lesson._id,
      })),
    [lessons],
  );

  const safeCourses = useMemo(
    () =>
      Array.isArray(courses)
        ? (courses as CourseItem[]).map((course) => ({
            id: String(course.id),
            title: course.title,
            author: course.author,
            category: course.category,
            image: course.image,
            level: course.level,
            progress: Number(course.progress || 0),
            lessons: Number(course.lessons || 0),
          }))
        : [],
    [],
  );

  const featuredCourses = backendCourses.length > 0 ? backendCourses : safeCourses;

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-teal-600 dark:from-teal-900 to-gray-700 dark:to-gray-900 border border-teal-500 dark:border-teal-900/50 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-100 dark:text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-500/30">
              <Star className="w-3 h-3" />
              <span>Training Academy</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Master the Game <br />
              <span className="text-teal-200 dark:text-teal-400">
                One Move at a Time
              </span>
            </h1>
            <p className="text-gray-200 dark:text-gray-300 text-lg">
              Learn with structured lessons and interactive move checks.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-teal-900/20 flex items-center gap-2"
                onClick={() => {
                  if (backendCourses.length > 0) void openLesson(backendCourses[0].id);
                }}
              >
                Start Learning <ChevronRight className="w-5 h-5" />
              </button>
              <button
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20"
                onClick={() => void fetchLessons()}
              >
                Refresh Lessons
              </button>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="w-64 h-64 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-full blur-3xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            <GraduationCap className="w-48 h-48 text-teal-100/80 relative z-10 drop-shadow-2xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["Openings", "Middlegame", "Endgame", "Strategy"].map((cat, i) => (
          <motion.button
            key={cat}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-teal-400 dark:hover:border-teal-500/50 transition-all group text-left shadow-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 flex items-center justify-center mb-3 transition-colors">
              {cat === "Openings" && (
                <BookOpen className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400" />
              )}
              {cat === "Middlegame" && (
                <Target className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400" />
              )}
              {cat === "Endgame" && (
                <BarChart className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400" />
              )}
              {cat === "Strategy" && (
                <Video className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {cat}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {backendCourses.length > 0 ? "Live Lessons" : "Catalog"}
            </p>
          </motion.button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Featured Courses
          </h2>
          {loadingLessons ? (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading lessons...
            </div>
          ) : lessonsError ? (
            <div className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              Backend unavailable, showing local courses
            </div>
          ) : backendCourses.length > 0 ? (
            <div className="inline-flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
              Live lesson backend connected
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featuredCourses.length > 0 ? (
            featuredCourses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all group hover:shadow-xl shadow-sm flex flex-col"
              >
                <div className="h-32 bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-teal-500/5 group-hover:bg-teal-500/10 transition-colors" />
                  <span className="text-4xl transform group-hover:scale-110 transition-transform duration-500">
                    {course.image}
                  </span>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${levelColor(course.level)}`}
                    >
                      {course.level}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-xs font-medium text-teal-600 dark:text-teal-500 mb-2 uppercase tracking-wider">
                    {course.category}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    by {course.author}
                  </p>

                  <div className="mt-auto space-y-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {course.lessons} Sections
                      </span>
                      <span>{course.progress}% Complete</span>
                    </div>

                    <button
                      className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-600 dark:text-gray-300 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => {
                        if (course.backendLessonId) void openLesson(course.backendLessonId);
                      }}
                      disabled={!course.backendLessonId}
                    >
                      {course.progress > 0 ? "Continue Lesson" : "Start Lesson"}
                      {course.progress === 0 && <Play className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              No courses available at the moment.
            </div>
          )}
        </div>
      </div>

      {(loadingLessonDetail || activeLesson || lessonDetailError) && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {activeLesson?.title || "Lesson"}
                </h3>
                {activeLesson && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activeLesson.progress.percent}% complete •{" "}
                    {activeLesson.progress.completedCount}/
                    {activeLesson.progress.totalSections} sections
                  </p>
                )}
              </div>
              <button
                onClick={closeLesson}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingLessonDetail ? (
              <div className="p-6 flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading lesson...
              </div>
            ) : lessonDetailError ? (
              <div className="p-6 text-red-600 dark:text-red-400">
                {lessonDetailError}
              </div>
            ) : activeLesson ? (
              <div className="p-6 space-y-4">
                {activeLesson.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {activeLesson.description}
                  </p>
                )}

                {activeLesson.sections.map((section) => {
                  const done = activeLesson.progress.completedSections.includes(
                    section.index,
                  );
                  const feedback = sectionFeedback[section.index];
                  return (
                    <div
                      key={section.index}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Section {section.index + 1}:{" "}
                            {section.title || section.type.toUpperCase()}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Type: {section.type}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-semibold ${
                            done
                              ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400"
                              : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {done ? "Completed" : "Pending"}
                        </span>
                      </div>

                      {section.content && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap">
                          {section.content}
                        </p>
                      )}

                      {(section.type === "board" || section.type === "quiz") &&
                        section.hasExpectedMoves && (
                          <div className="mt-3 space-y-2">
                            {section.fen && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                FEN:{" "}
                                <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                                  {section.fen}
                                </code>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                value={moveInputs[section.index] || ""}
                                onChange={(event) =>
                                  setMoveInputs((prev) => ({
                                    ...prev,
                                    [section.index]: event.target.value,
                                  }))
                                }
                                placeholder="Enter best move (e.g., Nf3 or e2e4)"
                                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-teal-500"
                              />
                              <button
                                onClick={() => void validateSectionMove(section.index)}
                                className="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors disabled:opacity-60"
                                disabled={validatingSection === section.index}
                              >
                                {validatingSection === section.index
                                  ? "Checking..."
                                  : "Check Move"}
                              </button>
                            </div>
                          </div>
                        )}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => void markSectionComplete(section.index)}
                          disabled={done || savingSection === section.index}
                          className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {done
                            ? "Completed"
                            : savingSection === section.index
                              ? "Saving..."
                              : "Mark Complete"}
                        </button>
                      </div>

                      {feedback && (
                        <div
                          className={`mt-3 text-xs px-2 py-1.5 rounded ${
                            feedback.ok
                              ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
