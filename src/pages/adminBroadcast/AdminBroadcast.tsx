import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { useAdminStore } from "../../store/adminStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type Audience = "all" | "active" | "banned";
type ExtendedAudience = Audience | "flagged" | "tournament_players";

export default function AdminBroadcast() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, checkAuth } = useAdminStore();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<ExtendedAudience>("all");
  const [tournamentId, setTournamentId] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSend = async () => {
    if (!title.trim()) {
      setToast({ type: "error", text: "Title is required." });
      return;
    }
    if (!message.trim()) {
      setToast({ type: "error", text: "Message is required." });
      return;
    }
    if (audience === "tournament_players" && !tournamentId.trim()) {
      setToast({ type: "error", text: "Tournament ID is required for this audience." });
      return;
    }

    setSending(true);
    setToast(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim(),
          audience,
          tournamentId:
            audience === "tournament_players" ? tournamentId.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Broadcast failed");
      }

      setToast({
        type: "success",
        text: `Broadcast sent to ${data.sent ?? 0} user${data.sent === 1 ? "" : "s"} (audience: ${data.audience || audience}).`,
      });
      setTitle("");
      setMessage("");
      setLink("");
      setTournamentId("");
    } catch (err: unknown) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to send broadcast.",
      });
    } finally {
      setSending(false);
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="w-7 h-7 text-teal-500" />
            Broadcast Notification
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Send a notification to multiple users at once
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.text}
          </div>
        )}

        {/* Form */}
        <div className="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Scheduled Maintenance Tonight"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/120</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={600}
              rows={4}
              placeholder="Describe the notification content..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{message.length}/600</p>
          </div>

          {/* Link */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Link (optional)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={300}
              placeholder="e.g. /tournaments or https://..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <Users className="w-3.5 h-3.5" /> Audience
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                ["all", "active", "banned", "flagged", "tournament_players"] as ExtendedAudience[]
              ).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    audience === a
                      ? "bg-teal-500/20 border-teal-500 text-teal-600 dark:text-teal-400"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {a === "all" && "All Users"}
                  {a === "active" && "Online / Active"}
                  {a === "banned" && "Banned Users"}
                  {a === "flagged" && "Flagged Users"}
                  {a === "tournament_players" && "Tournament Players"}
                </button>
              ))}
            </div>
            {audience === "tournament_players" && (
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                  Tournament ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  placeholder="Paste tournament ObjectId"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
