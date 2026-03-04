import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  payload?: unknown;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  /** Called by socket listener when a new notification arrives in real-time */
  pushNotification: (item: NotificationItem) => void;

  /** Fetch the full notification list from the API */
  fetchNotifications: () => Promise<void>;

  /** Lightweight: fetch only the unread count */
  fetchUnreadCount: () => Promise<void>;

  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  pushNotification: (item) => {
    set((state) => {
      const exists = state.notifications.some((n) => n._id === item._id);
      if (exists) return state;
      return {
        notifications: [item, ...state.notifications],
        unreadCount: state.unreadCount + (item.readAt ? 0 : 1),
      };
    });
  },

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/notifications?limit=100`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      set({
        notifications: Array.isArray(data.notifications)
          ? data.notifications
          : [],
        unreadCount: Number(data.unreadCount || 0),
        loading: false,
      });
    } catch {
      set({ error: "Failed to load notifications.", loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      set({ unreadCount: Number(data.count || 0) });
    } catch {
      /* noop */
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        { method: "PATCH", credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to mark as read");
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      set({ error: "Failed to update notification." });
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      const now = new Date().toISOString();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || now,
        })),
        unreadCount: 0,
      }));
    } catch {
      set({ error: "Failed to mark all as read." });
    }
  },
}));
