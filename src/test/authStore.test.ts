import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      banReason: null,
    });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("setUser sets user and toggles isAuthenticated", () => {
    const mockUser = {
      id: "u1",
      email: "test@test.com",
      fullName: "Test User",
    };
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("setUser(null) clears authentication", () => {
    useAuthStore.getState().setUser({
      id: "u1",
      email: "a@b.com",
      fullName: "A",
    });
    useAuthStore.getState().setUser(null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("logout clears user and auth state", () => {
    useAuthStore.getState().setUser({
      id: "u1",
      email: "a@b.com",
      fullName: "A",
    });
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.banReason).toBeNull();
  });

  it("setError sets error and stops loading", () => {
    useAuthStore.getState().setError("Something went wrong");

    const state = useAuthStore.getState();
    expect(state.error).toBe("Something went wrong");
    expect(state.isLoading).toBe(false);
  });

  it("setBanned clears user and stores ban reason", () => {
    useAuthStore.getState().setUser({
      id: "u1",
      email: "a@b.com",
      fullName: "A",
    });
    useAuthStore.getState().setBanned("Cheating");

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.banReason).toBe("Cheating");
    expect(state.isLoading).toBe(false);
  });

  it("setLoading toggles loading state", () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);

    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });
});
