import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageSquare, Send } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface FeedbackUser {
  _id: string;
  fullName: string;
  email: string;
}

interface FeedbackItem {
  _id: string;
  category: string;
  message: string;
  status: "open" | "closed";
  adminReply?: string;
  createdAt: string;
  user: FeedbackUser | null;
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAdminStore();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loadFeedback = useCallback(async () => {
    try {
      setLoadingFeedback(true);
      const res = await fetch(`${API_URL}/api/admin/feedback?limit=100`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      const data = await res.json();
      const items = Array.isArray(data.feedback) ? data.feedback : [];
      setFeedback(items);
      setReplyMap(
        items.reduce(
          (acc: Record<string, string>, item: FeedbackItem) => ({
            ...acc,
            [item._id]: item.adminReply || "",
          }),
          {},
        ),
      );
      setError(null);
    } catch {
      setError("Failed to load feedback inbox.");
    } finally {
      setLoadingFeedback(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadFeedback();
    }
  }, [isAuthenticated, loadFeedback]);

  const updateFeedback = async (id: string, status: "open" | "closed") => {
    try {
      const res = await fetch(`${API_URL}/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          adminReply: replyMap[id] || "",
        }),
      });
      if (!res.ok) throw new Error("Failed to update feedback");
      const data = await res.json();
      setFeedback((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, ...data.feedback } : item,
        ),
      );
    } catch {
      setError("Failed to update feedback.");
    }
  };

  if (isLoading) {
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-500" />
            Feedback Inbox
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review user feedback and reply from one place.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300/60 dark:border-red-700/60 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loadingFeedback ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : feedback.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400">
            No feedback found.
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {item.user?.fullName || "Unknown user"} • {item.category}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.user?.email || "No email"} •{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.status === "open"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {item.message}
                </p>

                <div className="mt-3">
                  <textarea
                    value={replyMap[item._id] || ""}
                    onChange={(e) =>
                      setReplyMap((prev) => ({
                        ...prev,
                        [item._id]: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Reply to user..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => void updateFeedback(item._id, "closed")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply & Close
                  </button>
                  {item.status === "closed" && (
                    <button
                      onClick={() => void updateFeedback(item._id, "open")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
