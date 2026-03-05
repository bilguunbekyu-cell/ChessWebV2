import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Friends from "./Friends";

vi.mock("../../components/Sidebar", () => ({
  default: function SidebarMock() {
    return <div data-testid="sidebar-mock" />;
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function buildFetchMock() {
  const state = {
    friends: [
      {
        id: "f-1",
        name: "Existing Friend",
        email: "existing.friend@test.dev",
        since: "2026-02-20T00:00:00.000Z",
      },
    ],
    incoming: [
      {
        requestId: "req-1",
        from: {
          id: "u-2",
          name: "Incoming User",
          email: "incoming@test.dev",
        },
        createdAt: "2026-03-03T00:00:00.000Z",
      },
    ],
    outgoing: [] as Array<unknown>,
    blockedUsers: [
      {
        id: "b-1",
        name: "Blocked User",
        email: "blocked@test.dev",
        blockedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
    searchResults: [
      {
        id: "s-1",
        name: "Search User",
        email: "search.user@test.dev",
      },
    ],
  };

  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method || "GET").toUpperCase();

    if (url.includes("/api/friends/search") && method === "GET") {
      return jsonResponse({ results: state.searchResults });
    }

    if (url.endsWith("/api/friends") && method === "GET") {
      return jsonResponse({ friends: state.friends });
    }

    if (url.endsWith("/api/friends/requests") && method === "GET") {
      return jsonResponse({
        incoming: state.incoming,
        outgoing: state.outgoing,
      });
    }

    if (url.endsWith("/api/friends/blocks/list") && method === "GET") {
      return jsonResponse({ blockedUsers: state.blockedUsers });
    }

    if (url.endsWith("/api/friends/accept") && method === "POST") {
      const payload = JSON.parse(String(init?.body || "{}"));
      if (payload.requestId === "req-1") {
        const incomingRequest = state.incoming.find(
          (item) => item.requestId === payload.requestId,
        );
        if (incomingRequest) {
          state.friends.push({
            id: incomingRequest.from.id,
            name: incomingRequest.from.name,
            email: incomingRequest.from.email,
            since: "2026-03-05T00:00:00.000Z",
          });
          state.incoming = state.incoming.filter(
            (item) => item.requestId !== payload.requestId,
          );
        }
      }
      return jsonResponse({ success: true });
    }

    if (url.endsWith("/api/friends/request") && method === "POST") {
      const payload = JSON.parse(String(init?.body || "{}"));
      state.searchResults = state.searchResults.filter(
        (item) => item.id !== payload.toUserId,
      );
      state.outgoing.push({
        requestId: "out-1",
        to: {
          id: payload.toUserId,
          name: "Search User",
          email: "search.user@test.dev",
        },
        createdAt: "2026-03-05T00:00:00.000Z",
      });
      return jsonResponse({ success: true });
    }

    if (url.includes("/api/friends/block/") && method === "DELETE") {
      const id = url.split("/api/friends/block/")[1] || "";
      state.blockedUsers = state.blockedUsers.filter((item) => item.id !== id);
      return jsonResponse({ success: true });
    }

    if (url.includes("/api/friends/") && method === "DELETE") {
      const id = url.split("/api/friends/")[1] || "";
      state.friends = state.friends.filter((item) => item.id !== id);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500);
  });

  return fetchMock;
}

describe("Friends page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts incoming friend request and refreshes lists", async () => {
    const fetchMock = buildFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Incoming User")).toBeInTheDocument();
    const acceptButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(acceptButton);

    expect(await screen.findByText("Friend request accepted.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No incoming requests.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Incoming User")).toBeInTheDocument();

    const acceptCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith("/api/friends/accept"),
    );
    expect(acceptCall).toBeTruthy();
    expect(String(acceptCall?.[1]?.method || "").toUpperCase()).toBe("POST");
  });

  it("searches users and sends friend request", async () => {
    const fetchMock = buildFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>,
    );

    const input = await screen.findByPlaceholderText("Username or email");
    fireEvent.change(input, { target: { value: "search user" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Search User")).toBeInTheDocument();

    const resultCard = screen
      .getAllByText("Search User")
      .find((el) => el.closest("div.p-2.rounded-lg.border"));
    expect(resultCard).toBeTruthy();
    if (!resultCard) return;

    const cardRoot = resultCard.closest("div.p-2.rounded-lg.border");
    expect(cardRoot).toBeTruthy();
    if (!cardRoot) return;

    const requestButton = within(cardRoot).getByRole("button", { name: "Request" });
    fireEvent.click(requestButton);

    expect(await screen.findByText("Friend request sent.")).toBeInTheDocument();

    const requestCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith("/api/friends/request"),
    );
    expect(requestCall).toBeTruthy();
    expect(String(requestCall?.[1]?.method || "").toUpperCase()).toBe("POST");
  });

  it("unblocks blocked users", async () => {
    const fetchMock = buildFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <Friends />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Blocked User")).toBeInTheDocument();
    const unblockButton = screen.getByRole("button", { name: "Unblock" });
    fireEvent.click(unblockButton);

    expect(await screen.findByText("User unblocked.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No blocked users.")).toBeInTheDocument(),
    );

    const unblockCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/friends/block/b-1"),
    );
    expect(unblockCall).toBeTruthy();
    expect(String(unblockCall?.[1]?.method || "").toUpperCase()).toBe("DELETE");
  });
});
