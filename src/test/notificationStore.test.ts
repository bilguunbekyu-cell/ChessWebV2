import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotificationStore } from "../store/notificationStore";
import type { NotificationItem } from "../store/notificationStore";

function makeNotification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    _id: `n-${Math.random().toString(36).slice(2, 8)}`,
    type: "system",
    title: "Test",
    message: "Hello",
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("notificationStore", () => {
  beforeEach(() => {
    // Reset the store between tests
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
  });

  it("starts with empty state", () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("pushNotification adds a notification and increments unread", () => {
    const n = makeNotification({ _id: "abc-123" });
    useNotificationStore.getState().pushNotification(n);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]._id).toBe("abc-123");
    expect(state.unreadCount).toBe(1);
  });

  it("pushNotification does not double-add same _id", () => {
    const n = makeNotification({ _id: "dup-1" });
    useNotificationStore.getState().pushNotification(n);
    useNotificationStore.getState().pushNotification(n);

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it("pushNotification does not increment unread for already-read items", () => {
    const n = makeNotification({
      _id: "read-1",
      readAt: new Date().toISOString(),
    });
    useNotificationStore.getState().pushNotification(n);

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("pushNotification prepends to the list", () => {
    const n1 = makeNotification({ _id: "first" });
    const n2 = makeNotification({ _id: "second" });

    useNotificationStore.getState().pushNotification(n1);
    useNotificationStore.getState().pushNotification(n2);

    const ids = useNotificationStore.getState().notifications.map((n) => n._id);
    expect(ids).toEqual(["second", "first"]);
  });

  it("fetchNotifications calls the API and populates state", async () => {
    const mockData = {
      notifications: [makeNotification({ _id: "api-1" })],
      unreadCount: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.loading).toBe(false);
  });

  it("fetchNotifications sets error on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });

    await useNotificationStore.getState().fetchNotifications();

    expect(useNotificationStore.getState().error).toBe(
      "Failed to load notifications.",
    );
  });

  it("markAsRead patches the item and decrements unread", async () => {
    const n = makeNotification({ _id: "mark-1" });
    useNotificationStore.setState({
      notifications: [n],
      unreadCount: 1,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await useNotificationStore.getState().markAsRead("mark-1");

    const state = useNotificationStore.getState();
    expect(state.notifications[0].readAt).toBeTruthy();
    expect(state.unreadCount).toBe(0);
  });

  it("markAllAsRead patches all items and zeroes unread", async () => {
    const items = [
      makeNotification({ _id: "a1" }),
      makeNotification({ _id: "a2" }),
    ];
    useNotificationStore.setState({
      notifications: items,
      unreadCount: 2,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.readAt)).toBe(true);
  });
});
