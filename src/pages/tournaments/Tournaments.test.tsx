import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tournaments from "./Tournaments";
import { useAuthStore } from "../../store/authStore";

function buildTournamentState() {
  const summary = {
    id: "t1",
    name: "Manager Cup",
    type: "swiss",
    status: "running",
    roundsPlanned: 3,
    currentRound: 1,
    timeControl: { baseMs: 180_000, incMs: 2_000, label: "3+2" },
    ratingMin: null,
    ratingMax: null,
    registeredCount: 3,
    canManage: true,
    isRegistered: true,
    createdBy: "u-owner",
    managerIds: [],
  };

  const players = [
    {
      userId: "u-owner",
      name: "Owner User",
      rating: 1800,
      seed: 1,
      score: 0,
      buchholz: 0,
      gamesPlayed: 0,
    },
    {
      userId: "u-p1",
      name: "Player One",
      rating: 1650,
      seed: 2,
      score: 0,
      buchholz: 0,
      gamesPlayed: 0,
    },
    {
      userId: "u-p2",
      name: "Player Two",
      rating: 1600,
      seed: 3,
      score: 0,
      buchholz: 0,
      gamesPlayed: 0,
    },
  ];

  const state = {
    summary,
    detail: {
      tournament: summary,
      players,
      rounds: [
        {
          roundNumber: 1,
          games: [
            {
              id: "g1",
              gameId: "tg-1",
              whiteId: "u-p1",
              blackId: "u-p2",
              whiteName: "Player One",
              blackName: "Player Two",
              result: "*",
              isBye: false,
              status: "pending",
            },
          ],
        },
      ],
      standings: [
        {
          rank: 1,
          userId: "u-owner",
          name: "Owner User",
          score: 0,
          buchholz: 0,
          seed: 1,
          gamesPlayed: 0,
        },
      ],
      managers: [{ userId: "u-owner", name: "Owner User", avatar: "", isOwner: true }],
      winners: [],
    },
  };

  return state;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function createFetchMock() {
  const state = buildTournamentState();
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || "GET").toUpperCase();

    if (url.endsWith("/api/tournaments") && method === "GET") {
      return jsonResponse({ tournaments: [state.summary] });
    }

    if (url.endsWith("/api/tournaments/t1") && method === "GET") {
      return jsonResponse(state.detail);
    }

    if (url.endsWith("/api/tournaments/t1/managers") && method === "POST") {
      const payload = JSON.parse(String(init?.body || "{}"));
      const managerId = String(payload.managerId || "");
      const alreadyExists = state.detail.managers.some(
        (manager) => manager.userId === managerId,
      );
      if (!alreadyExists) {
        const player = state.detail.players.find((item) => item.userId === managerId);
        if (player) {
          state.detail.managers.push({
            userId: player.userId,
            name: player.name,
            avatar: "",
            isOwner: false,
          });
          state.summary.managerIds = [...state.summary.managerIds, player.userId];
        }
      }
      return jsonResponse({ success: true, ...state.detail });
    }

    if (url.includes("/api/tournaments/t1/managers/") && method === "DELETE") {
      const managerId = url.split("/api/tournaments/t1/managers/")[1] || "";
      state.detail.managers = state.detail.managers.filter(
        (manager) => manager.userId !== managerId,
      );
      state.summary.managerIds = state.summary.managerIds.filter(
        (id) => id !== managerId,
      );
      return jsonResponse({ success: true, ...state.detail });
    }

    if (url.endsWith("/api/tournaments/t1/rounds/1/repair") && method === "POST") {
      return jsonResponse({ success: true, ...state.detail });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  return fetchMock;
}

function setAuthenticatedUser() {
  useAuthStore.setState({
    user: {
      id: "u-owner",
      email: "owner@test.dev",
      fullName: "Owner User",
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    banReason: null,
  });
}

describe("Tournaments page interactions", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthenticatedUser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("supports owner manager add/remove flow", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <Tournaments />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Manager Cup")).toBeInTheDocument();
    const placeholderOption = await screen.findByRole("option", {
      name: "Select player to add as manager",
    });
    const managerSelect = placeholderOption.parentElement as HTMLSelectElement;
    expect(managerSelect).toBeTruthy();

    fireEvent.change(managerSelect, { target: { value: "u-p1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Manager" }));

    await waitFor(() => {
      const addCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).endsWith("/api/tournaments/t1/managers"),
      );
      expect(addCall).toBeTruthy();
      const payload = JSON.parse(String(addCall?.[1]?.body || "{}"));
      expect(payload.managerId).toBe("u-p1");
    });

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    await waitFor(() => {
      const removeCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/tournaments/t1/managers/u-p1"),
      );
      expect(removeCall).toBeTruthy();
      expect(String(removeCall?.[1]?.method || "").toUpperCase()).toBe("DELETE");
    });
  });

  it("validates repair JSON and submits repair payload", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <Tournaments />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Manager Cup")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Repair Current Round" }));

    expect(
      await screen.findByText("Repair Current Round Pairings (JSON)"),
    ).toBeInTheDocument();

    const editor = document.querySelector("textarea");
    if (!editor) {
      throw new Error("Repair textarea not found");
    }

    fireEvent.change(editor, { target: { value: "{invalid json" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Repair" }));
    expect(
      await screen.findByText("Repair payload must be valid JSON"),
    ).toBeInTheDocument();

    const repairCallsBeforeValid = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/tournaments/t1/rounds/1/repair"),
    ).length;
    expect(repairCallsBeforeValid).toBe(0);

    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          pairings: [{ whiteId: "u-p1", blackId: "u-p2" }],
          allowRematch: true,
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Repair" }));

    await waitFor(() => {
      const repairCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/tournaments/t1/rounds/1/repair"),
      );
      expect(repairCall).toBeTruthy();
      expect(String(repairCall?.[1]?.method || "").toUpperCase()).toBe("POST");
      const payload = JSON.parse(String(repairCall?.[1]?.body || "{}"));
      expect(payload.pairings).toEqual([{ whiteId: "u-p1", blackId: "u-p2" }]);
      expect(payload.allowRematch).toBe(true);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Repair Current Round Pairings (JSON)"),
      ).not.toBeInTheDocument();
    });
  });
});
