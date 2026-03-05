import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBroadcast from "./AdminBroadcast";
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

describe("AdminBroadcast page", () => {
  beforeEach(() => {
    localStorage.clear();
    setupAdminStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates required title/message before sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminBroadcast />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));
    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Scheduled Maintenance Tonight"),
      { target: { value: "Server update" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));
    expect(await screen.findByText("Message is required.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends broadcast with trimmed payload and audience", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse({ success: true, sent: 4, audience: "banned" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminBroadcast />
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Scheduled Maintenance Tonight"),
      { target: { value: "  System Notice  " } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("Describe the notification content..."),
      { target: { value: "  We will deploy a patch at 22:00 UTC.  " } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("e.g. /tournaments or https://..."),
      { target: { value: "  /tournaments  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Banned Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body || "{}"));
    expect(String(requestInit?.method || "").toUpperCase()).toBe("POST");
    expect(payload).toEqual({
      title: "System Notice",
      message: "We will deploy a patch at 22:00 UTC.",
      link: "/tournaments",
      audience: "banned",
    });

    expect(
      await screen.findByText(/Broadcast sent to 4 users \(audience: banned\)\./),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g. Scheduled Maintenance Tonight"),
    ).toHaveValue("");
    expect(
      screen.getByPlaceholderText("Describe the notification content..."),
    ).toHaveValue("");
    expect(
      screen.getByPlaceholderText("e.g. /tournaments or https://..."),
    ).toHaveValue("");
  });

  it("shows server error when broadcast request fails", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse({ error: "Broadcast failed on server" }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminBroadcast />
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Scheduled Maintenance Tonight"),
      { target: { value: "Urgent Notice" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("Describe the notification content..."),
      { target: { value: "Service degraded in one region." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));

    expect(await screen.findByText("Broadcast failed on server")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires tournament id for tournament players audience and sends payload", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ success: true, sent: 2, audience: "tournament_players" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminBroadcast />
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByPlaceholderText("e.g. Scheduled Maintenance Tonight"),
      { target: { value: "Round Pairings Ready" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("Describe the notification content..."),
      { target: { value: "Join your round now." } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Tournament Players" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));

    expect(
      await screen.findByText("Tournament ID is required for this audience."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Paste tournament ObjectId"), {
      target: { value: "507f1f77bcf86cd7994390ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Broadcast" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(requestInit?.body || "{}"));
    expect(payload.audience).toBe("tournament_players");
    expect(payload.tournamentId).toBe("507f1f77bcf86cd7994390ab");
    expect(await screen.findByText(/audience: tournament_players/)).toBeInTheDocument();
  });
});
