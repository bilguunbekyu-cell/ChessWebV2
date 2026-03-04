import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useNotificationStore } from "../../store/notificationStore";

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleString();
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-72 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unreadCount} unread
            </p>
          </div>
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-gray-500 dark:text-gray-400">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl border p-4 transition-colors ${
                  item.readAt
                    ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    : "border-teal-300/60 dark:border-teal-700/60 bg-teal-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold inline-flex items-center gap-2">
                      <Bell className="w-4 h-4 text-teal-500" />
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                      {item.message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  {!item.readAt && (
                    <button
                      onClick={() => markAsRead(item._id)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors"
                    >
                      Mark read
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
