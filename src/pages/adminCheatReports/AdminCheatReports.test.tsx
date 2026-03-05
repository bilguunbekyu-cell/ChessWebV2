import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCheatReports from "./AdminCheatReports";
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

function createFetchMock() {
  const reportSummary = {
    _id: "report-1",
    user: {
      _id: "u-1",
      fullName: "Flagged User",
      email: "flagged.user@test.dev",
      avatar: "",
      banned: false,
    },
    source: "manual_scan",
    status: "pending",
    reviewAction: "none",
    metrics: {
      gamesConsidered: 12,
      gamesAnalyzed: 12,
      movesAnalyzed: 420,
      bestMoveMatchRate: null,
      top3MatchRate: null,
      avgCentipawnLoss: 16,
      nearPerfectMoveRate: 0.91,
      strongMoveRate: 0.95,
      blunderRate: 0.02,
      avgMoveTimeSec: 2.4,
      avgMoveTimeStdSec: 0.3,
      lowVarianceGameRate: 0.88,
      criticalWindowRate: 0.9,
      suspicionScore: 84,
      riskLevel: "high",
    },
    flags: ["Suspicious move-time consistency"],
    createdAt: "2026-03-05T08:00:00.000Z",
    reviewedAt: null,
  };

  const reportDetail = {
    ...reportSummary,
    reviewNote: "",
    reviewedBy: null,
    dataGaps: {
      bestMoveUnavailable: true,
      top3Unavailable: true,
      notes: [],
    },
    games: [
      {
        _id: "g-1",
        white: "Flagged User",
        black: "Opponent",
        result: "1-0",
        createdAt: "2026-03-04T10:00:00.000Z",
        rated: true,
        variant: "standard",
        movesCount: 40,
        timeControl: "3+2",
      },
    ],
    updatedAt: "2026-03-05T08:10:00.000Z",
  };

  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || "GET").toUpperCase();

    if (url.includes("/api/admin/cheat-reports/scan/") && method === "POST") {
      return jsonResponse({
        success: true,
        flagged: true,
        created: true,
      });
    }

    if (url.endsWith("/api/admin/cheat-reports/scan") && method === "POST") {
      return jsonResponse({
        success: true,
        scanned: 9,
        flagged: 2,
        created: 2,
      });
    }

    if (url.includes("/api/admin/cheat-reports/report-1/review") && method === "PATCH") {
      const payload = JSON.parse(String(init?.body || "{}"));
      reportSummary.status = payload.action === "none" ? "reviewed" : "actioned";
      reportSummary.reviewAction = payload.action || "none";
      reportDetail.status = reportSummary.status;
      reportDetail.reviewAction = reportSummary.reviewAction;
      reportDetail.reviewNote = payload.note || "";
      return jsonResponse({
        success: true,
        report: reportDetail,
      });
    }

    if (url.endsWith("/api/admin/cheat-reports/report-1") && method === "GET") {
      return jsonResponse({
        report: reportDetail,
      });
    }

    if (url.includes("/api/admin/cheat-reports?") && method === "GET") {
      return jsonResponse({
        reports: [reportSummary],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  return fetchMock;
}

describe("AdminCheatReports page", () => {
  beforeEach(() => {
    localStorage.clear();
    setupAdminStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens report detail and applies warn review action", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminCheatReports />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Flagged User")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(await screen.findByText("Cheat Report Detail")).toBeInTheDocument();

    const noteInput = document.querySelector("textarea");
    if (!noteInput) {
      throw new Error("Review note textarea not found");
    }
    fireEvent.change(noteInput, {
      target: { value: "Reviewed and warning issued." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Warn User" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/admin/cheat-reports/report-1/review"),
      );
      expect(patchCall).toBeTruthy();
      const payload = JSON.parse(String(patchCall?.[1]?.body || "{}"));
      expect(payload.action).toBe("warn");
      expect(payload.note).toBe("Reviewed and warning issued.");
    });

    expect(await screen.findByText("Report action applied: warn.")).toBeInTheDocument();
  });

  it("runs batch scan and manual scan actions", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <AdminCheatReports />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Flagged User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run Batch Scan" }));
    expect(
      await screen.findByText("Batch scan finished. Scanned 9, flagged 2, created 2."),
    ).toBeInTheDocument();

    const manualInput = screen.getByPlaceholderText("Manual scan userId");
    fireEvent.change(manualInput, { target: { value: "507f1f77bcf86cd7994390aa" } });
    fireEvent.click(screen.getByRole("button", { name: "Scan User" }));

    expect(
      await screen.findByText("Manual scan flagged user and created a report."),
    ).toBeInTheDocument();

    const scanCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/admin/cheat-reports/scan/507f1f77bcf86cd7994390aa"),
    );
    expect(scanCall).toBeTruthy();
    expect(String(scanCall?.[1]?.method || "").toUpperCase()).toBe("POST");
  });
});
