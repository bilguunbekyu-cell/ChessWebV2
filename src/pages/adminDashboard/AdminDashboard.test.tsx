import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import { useAdminStore } from "../../store/adminStore";

vi.mock("../../components/AdminSidebar", () => ({
  default: function AdminSidebarMock() {
    return <div data-testid="admin-sidebar-mock" />;
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: unknown }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children?: unknown }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line-series" />,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  BarChart: ({ children }: { children?: unknown }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar-series" />,
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

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || "GET").toUpperCase();

    if (url.endsWith("/api/admin/stats") && method === "GET") {
      return jsonResponse({
        totalUsers: 120,
        totalGames: 520,
        newUsersThisWeek: 14,
        gamesThisWeek: 78,
      });
    }

    if (url.includes("/api/admin/metrics/active?days=30") && method === "GET") {
      return jsonResponse({
        summary: {
          dau: 34,
          wau: 102,
          mau: 280,
          avgDau: 28.4,
          windowDays: 30,
          comparison: {
            prevWau: 96,
            prevMau: 250,
            wauGrowthPercent: 6.25,
            mauGrowthPercent: 12,
          },
        },
        trend: [
          {
            date: "2026-02-20",
            dau: 20,
            gamesPlayed: 34,
            timeSpentSec: 3600,
            loginCount: 18,
            puzzlesAttempted: 42,
          },
          {
            date: "2026-02-21",
            dau: 25,
            gamesPlayed: 38,
            timeSpentSec: 5400,
            loginCount: 21,
            puzzlesAttempted: 44,
          },
        ],
        topUsers: [],
      });
    }

    if (url.includes("/api/admin/metrics/retention?days=120") && method === "GET") {
      return jsonResponse({
        summary: {
          usersConsidered: 90,
          d1: { eligible: 90, retained: 52, rate: 57.8 },
          d7: { eligible: 82, retained: 30, rate: 36.6 },
          d30: { eligible: 70, retained: 16, rate: 22.9 },
        },
        cohorts: [
          {
            cohortStart: "2026-02-01",
            size: 20,
            d7Eligible: 20,
            d7Retained: 8,
            d7Rate: 40,
            d30Eligible: 20,
            d30Retained: 5,
            d30Rate: 25,
          },
        ],
      });
    }

    if (url.includes("/api/admin/users?") && method === "GET") {
      const parsedUrl = new URL(url);
      const skip = Number(parsedUrl.searchParams.get("skip") || "0");
      const search = (parsedUrl.searchParams.get("search") || "").toLowerCase();

      if (search === "alice") {
        return jsonResponse({
          users: [
            {
              _id: "u-alice",
              fullName: "Alice Search",
              email: "alice@test.dev",
              rating: 1810,
              gamesPlayed: 48,
              gamesWon: 31,
              createdAt: "2026-02-15T00:00:00.000Z",
            },
          ],
          total: 1,
        });
      }

      if (skip >= 10) {
        return jsonResponse({
          users: [
            {
              _id: "u-page2",
              fullName: "User Page Two",
              email: "page2@test.dev",
              rating: 1590,
              gamesPlayed: 20,
              gamesWon: 10,
              createdAt: "2026-01-05T00:00:00.000Z",
            },
          ],
          total: 15,
        });
      }

      return jsonResponse({
        users: [
          {
            _id: "u-alpha",
            fullName: "User Alpha",
            email: "alpha@test.dev",
            rating: 1720,
            gamesPlayed: 60,
            gamesWon: 35,
            createdAt: "2026-01-10T00:00:00.000Z",
          },
        ],
        total: 15,
      });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });
}

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

describe("AdminDashboard page", () => {
  beforeEach(() => {
    localStorage.clear();
    setupAdminStore();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads metrics cards and chart sections", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Active Users Trend (30d)")).toBeInTheDocument();
    expect(
      screen.getByText("Cohort Retention (D7 / D30)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Avg 28.4 / day")).toBeInTheDocument();
    expect(
      screen.getByText("57.8% / 36.6% / 22.9%"),
    ).toBeInTheDocument();

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        calledUrls.some((url) => url.includes("/api/admin/metrics/active?days=30")),
      ).toBe(true);
      expect(
        calledUrls.some((url) =>
          url.includes("/api/admin/metrics/retention?days=120"),
        ),
      ).toBe(true);
    });
  });

  it("applies search filter and resets users pagination", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("User Alpha")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(await screen.findByText("User Page Two")).toBeInTheDocument();

    await waitFor(() => {
      const usersCalls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/api/admin/users?"));

      expect(
        usersCalls.some((url) => new URL(url).searchParams.get("skip") === "10"),
      ).toBe(true);
    });

    fireEvent.change(screen.getByPlaceholderText("Search users..."), {
      target: { value: "Alice" },
    });

    expect(await screen.findByText("Alice Search")).toBeInTheDocument();

    await waitFor(() => {
      const usersCalls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/api/admin/users?"));
      const filteredCall = usersCalls
        .reverse()
        .find((url) => new URL(url).searchParams.get("search") === "Alice");

      expect(filteredCall).toBeTruthy();
      expect(new URL(String(filteredCall)).searchParams.get("skip")).toBe("0");
    });
  });
});
