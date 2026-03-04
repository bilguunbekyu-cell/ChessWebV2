import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface NewsArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  contentMarkdown: string;
  contentHtml: string;
  authorName: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
}

const emptyForm: Omit<NewsArticle, "_id" | "createdAt"> = {
  title: "",
  slug: "",
  excerpt: "",
  coverImage: "",
  tags: [],
  contentMarkdown: "",
  contentHtml: "",
  authorName: "",
  status: "draft",
  publishedAt: null,
};

export default function AdminNews() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading: authLoading,
    checkAuth,
  } = useAdminStore();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Editor state
  const [editing, setEditing] = useState<string | null>(null); // article ID or "new"
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, authLoading, navigate]);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_URL}/api/admin/news?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch {
      setError("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) void fetchArticles();
  }, [isAuthenticated, fetchArticles]);

  const openEditor = (article?: NewsArticle) => {
    if (article) {
      setEditing(article._id);
      setForm({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        tags: article.tags,
        contentMarkdown: article.contentMarkdown,
        contentHtml: article.contentHtml,
        authorName: article.authorName,
        status: article.status,
        publishedAt: article.publishedAt,
      });
      setTagsInput(article.tags.join(", "));
    } else {
      setEditing("new");
      setForm({ ...emptyForm });
      setTagsInput("");
    }
  };

  const closeEditor = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setTagsInput("");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.contentMarkdown.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      };
      const isNew = editing === "new";
      const url = isNew
        ? `${API_URL}/api/admin/news`
        : `${API_URL}/api/admin/news/${editing}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      closeEditor();
      void fetchArticles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save article.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article permanently?")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/news/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setArticles((prev) => prev.filter((a) => a._id !== id));
    } catch {
      setError("Failed to delete article.");
    }
  };

  const togglePublish = async (article: NewsArticle) => {
    const nextStatus = article.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`${API_URL}/api/admin/news/${article._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      void fetchArticles();
    } catch {
      setError("Failed to update article status.");
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Newspaper className="w-7 h-7 text-teal-500" />
              News Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create and manage news articles
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-2 mb-6">
          {["", "draft", "published", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {/* Editor modal */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {editing === "new" ? "New Article" : "Edit Article"}
                </h2>
                <button
                  onClick={closeEditor}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Excerpt
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) =>
                      setForm({ ...form, excerpt: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cover Image URL
                  </label>
                  <input
                    value={form.coverImage}
                    onChange={(e) =>
                      setForm({ ...form, coverImage: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. update, tournament, feature"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Content (Markdown) *
                  </label>
                  <textarea
                    value={form.contentMarkdown}
                    onChange={(e) =>
                      setForm({ ...form, contentMarkdown: e.target.value })
                    }
                    rows={10}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-y font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as
                            | "draft"
                            | "published"
                            | "archived",
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Author
                    </label>
                    <input
                      value={form.authorName}
                      onChange={(e) =>
                        setForm({ ...form, authorName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={closeEditor}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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

        {/* Articles list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No articles found.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Published
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {articles.map((article) => (
                  <tr
                    key={article._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {article.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          article.status === "published"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : article.status === "archived"
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePublish(article)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-teal-500"
                          title={
                            article.status === "published"
                              ? "Unpublish"
                              : "Publish"
                          }
                        >
                          {article.status === "published" ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditor(article)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-teal-500"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(article._id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-400 hover:text-red-500"
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
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
