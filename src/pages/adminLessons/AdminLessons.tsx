import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type LessonLevel = "beginner" | "intermediate" | "advanced";
type LessonStatus = "draft" | "published" | "archived";

interface LessonSection {
  type: "text" | "board" | "quiz";
  title: string;
  content: string;
  fen?: string;
  expectedMoves?: string[];
}

interface LessonItem {
  _id: string;
  title: string;
  slug: string;
  description: string;
  level: LessonLevel;
  tags: string[];
  sections: LessonSection[];
  estimatedMinutes: number;
  status: LessonStatus;
  updatedAt: string;
}

interface LessonFormState {
  title: string;
  slug: string;
  description: string;
  level: LessonLevel;
  status: LessonStatus;
  estimatedMinutes: number;
  tagsInput: string;
  sectionsJson: string;
}

const defaultSectionsJson = `[
  {
    "type": "text",
    "title": "Introduction",
    "content": "Explain this concept..."
  },
  {
    "type": "board",
    "title": "Find the move",
    "content": "White to move. Find best move.",
    "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 3",
    "expectedMoves": ["Nf3", "g1f3"]
  }
]`;

const emptyForm: LessonFormState = {
  title: "",
  slug: "",
  description: "",
  level: "beginner",
  status: "draft",
  estimatedMinutes: 10,
  tagsInput: "",
  sectionsJson: defaultSectionsJson,
};

export default function AdminLessons() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAdminStore();

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | LessonStatus>("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<LessonFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_URL}/api/admin/lessons?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const data = await res.json();
      setLessons(Array.isArray(data.lessons) ? data.lessons : []);
      setError(null);
    } catch {
      setError("Failed to load lessons.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthenticated) void fetchLessons();
  }, [isAuthenticated, fetchLessons]);

  const openEditor = (lesson?: LessonItem) => {
    if (!lesson) {
      setEditingId("new");
      setForm({ ...emptyForm });
      return;
    }
    setEditingId(lesson._id);
    setForm({
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description || "",
      level: lesson.level,
      status: lesson.status,
      estimatedMinutes: lesson.estimatedMinutes || 10,
      tagsInput: Array.isArray(lesson.tags) ? lesson.tags.join(", ") : "",
      sectionsJson: JSON.stringify(lesson.sections || [], null, 2),
    });
  };

  const closeEditor = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    let sections: LessonSection[] = [];
    try {
      const parsed = JSON.parse(form.sectionsJson);
      if (!Array.isArray(parsed)) throw new Error("Sections must be an array.");
      sections = parsed;
    } catch (parseError: unknown) {
      setError(
        parseError instanceof Error
          ? `Invalid sections JSON: ${parseError.message}`
          : "Invalid sections JSON.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        level: form.level,
        status: form.status,
        estimatedMinutes: Number(form.estimatedMinutes) || 10,
        tags: form.tagsInput
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        sections,
      };

      const isCreate = editingId === "new";
      const url = isCreate
        ? `${API_URL}/api/admin/lessons`
        : `${API_URL}/api/admin/lessons/${editingId}`;
      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save lesson");

      closeEditor();
      void fetchLessons();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save lesson.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Delete this lesson permanently?")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete lesson");
      setLessons((prev) => prev.filter((lesson) => lesson._id !== lessonId));
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete lesson.",
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white">
      <AdminSidebar />
      <main className="ml-72 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-teal-500" />
              Lessons Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create and maintain interactive learning lessons
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lesson
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          {(["", "draft", "published", "archived"] as const).map((status) => (
            <button
              key={status || "all"}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {status || "All"}
            </button>
          ))}
        </div>

        {editingId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {editingId === "new" ? "New Lesson" : "Edit Lesson"}
                </h2>
                <button
                  onClick={closeEditor}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Level</label>
                    <select
                      value={form.level}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          level: event.target.value as LessonLevel,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <option value="beginner">beginner</option>
                      <option value="intermediate">intermediate</option>
                      <option value="advanced">advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as LessonStatus,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estimated Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={form.estimatedMinutes}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          estimatedMinutes:
                            Number.parseInt(event.target.value, 10) || 10,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      value={form.tagsInput}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          tagsInput: event.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sections JSON
                  </label>
                  <textarea
                    rows={14}
                    value={form.sectionsJson}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sectionsJson: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono resize-y"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={closeEditor}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No lessons found.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Level
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Sections
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {lessons.map((lesson) => (
                  <tr
                    key={lesson._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {lesson.title}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {lesson.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {lesson.level}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          lesson.status === "published"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : lesson.status === "archived"
                              ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {lesson.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {Array.isArray(lesson.sections) ? lesson.sections.length : 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditor(lesson)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-teal-500"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(lesson._id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
