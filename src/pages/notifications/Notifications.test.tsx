import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Notifications from "./Notifications";
import { useNotificationStore } from "../../store/notificationStore";

vi.mock("../../components/Sidebar", () => ({
  default: function SidebarMock() {
    return <div data-testid="sidebar-mock" />;
  },
}));

function resetNotificationStore(overrides?: Partial<ReturnType<typeof useNotificationStore.getState>>) {
  const fetchNotifications = vi.fn().mockResolvedValue(undefined);
  const markAsRead = vi.fn().mockResolvedValue(undefined);
  const markAllAsRead = vi.fn().mockResolvedValue(undefined);

  useNotificationStore.setState({
    notifications: [
      {
        _id: "n1",
        type: "friend_request",
        title: "Friend request",
        message: "Alice sent you a request",
        createdAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
        readAt: null,
      },
      {
        _id: "n2",
        type: "system",
        title: "Welcome",
        message: "Your account is ready",
        createdAt: new Date("2026-03-01T09:00:00.000Z").toISOString(),
        readAt: new Date("2026-03-01T09:05:00.000Z").toISOString(),
      },
    ],
    unreadCount: 1,
    loading: false,
    error: null,
    pushNotification: vi.fn(),
    fetchNotifications,
    fetchUnreadCount: vi.fn(),
    markAsRead,
    markAllAsRead,
    ...overrides,
  });

  return { fetchNotifications, markAsRead, markAllAsRead };
}

describe("Notifications page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads notifications on mount", () => {
    const { fetchNotifications } = resetNotificationStore();
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    expect(fetchNotifications).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("1 unread")).toBeInTheDocument();
  });

  it("calls markAsRead when clicking unread item action", () => {
    const { markAsRead } = resetNotificationStore();
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    const markReadButton = screen.getByRole("button", { name: "Mark read" });
    fireEvent.click(markReadButton);

    expect(markAsRead).toHaveBeenCalledTimes(1);
    expect(markAsRead).toHaveBeenCalledWith("n1");
  });

  it("calls markAllAsRead when clicking top action", () => {
    const { markAllAsRead } = resetNotificationStore();
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: "Mark all as read" });
    fireEvent.click(button);
    expect(markAllAsRead).toHaveBeenCalledTimes(1);
  });
});
