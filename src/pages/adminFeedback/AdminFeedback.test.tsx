import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFeedback from "./AdminFeedback";
import { useAdminStore } from "../../store/adminStore";

vi.mock("../../components/AdminSidebar", () => ({
  default: function AdminSidebarMock() {
    return <div data-testid="admin-sidebar-mock" />;
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function setupAdminStore() {
  useAdminStore.setState({
    admin: {
      id: "admin-1",
      email: "admin@test.dev",
      username: "admin",
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    checkAuth: vi.fn().mockResolvedValue(undefined),
  });
}

function buildFetchMock(initialItems: Array<Record<string, unknown>>) {
  let items = [...initialItems];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || "GET").toUpperCase();

    if (url.includes("/api/admin/feedback?limit=100") && method === "GET") {
      return jsonResponse({ feedback: items, total: items.length });
    }

    if (url.includes("/api/admin/feedback/") && method === "PATCH") {
      const id = url.split("/api/admin/feedback/")[1] || "";
      const payload = JSON.parse(String(init?.body || "{}"));
      const current = items.find((item) => String(item._id) === id);
      const updated = {
        ...current,
        status: payload.status,
        adminReply: payload.adminReply || "",
      };
      items = items.map((item) => (String(item._id) === id ? updated : item));
      return jsonResponse({ success: true, feedback: updated });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  return fetchMock;
}

describe("AdminFeedback page", () => {
  beforeEach(() => {
    localStorage.clear();
    setupAdminStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads inbox and supports Reply & Close action", async () => {
    const fetchMock = buildFetchMock([
      {
        _id: "fb-1",
        category: "bug",
        message: "There is a reproducible bug in puzzle trainer.",
        status: "open",
        adminReply: "",
        createdAt: "2026-03-05T08:00:00.000Z",
        user: {
          _id: "u-1",
          fullName: "Feedback User",
          email: "feedback.user@test.dev",
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Feedback Inbox")).toBeInTheDocument();
    expect(screen.getByText("Feedback User • bug")).toBeInTheDocument();

    const replyBox = screen.getByPlaceholderText("Reply to user...");
    fireEvent.change(replyBox, {
      target: { value: "Fixed and deployed. Please verify now." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reply & Close" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/admin/feedback/fb-1"),
      );
      expect(patchCall).toBeTruthy();
      expect(String(patchCall?.[1]?.method || "").toUpperCase()).toBe("PATCH");
      const payload = JSON.parse(String(patchCall?.[1]?.body || "{}"));
      expect(payload.status).toBe("closed");
      expect(payload.adminReply).toBe("Fixed and deployed. Please verify now.");
    });

    expect(await screen.findByText("closed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("reopens closed feedback", async () => {
    const fetchMock = buildFetchMock([
      {
        _id: "fb-2",
        category: "feature",
        message: "Please add tournament category filters.",
        status: "closed",
        adminReply: "Already implemented.",
        createdAt: "2026-03-05T08:30:00.000Z",
        user: {
          _id: "u-2",
          fullName: "Feature User",
          email: "feature.user@test.dev",
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminFeedback />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Feature User • feature")).toBeInTheDocument();
    const reopenButton = screen.getByRole("button", { name: "Reopen" });
    fireEvent.click(reopenButton);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/admin/feedback/fb-2"),
      );
      expect(patchCall).toBeTruthy();
      const payload = JSON.parse(String(patchCall?.[1]?.body || "{}"));
      expect(payload.status).toBe("open");
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("open")).toBeInTheDocument();
  });
});
