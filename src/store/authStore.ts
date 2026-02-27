import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createApiError, parseApiError } from "../utils/apiError";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  rating?: number;
  bulletRating?: number;
  blitzRating?: number;
  rapidRating?: number;
  classicalRating?: number;
  bulletRd?: number;
  blitzRd?: number;
  rapidRd?: number;
  classicalRd?: number;
  bulletVolatility?: number;
  blitzVolatility?: number;
  rapidVolatility?: number;
  classicalVolatility?: number;
  bulletGames?: number;
  blitzGames?: number;
  rapidGames?: number;
  classicalGames?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  presenceStatus?: "online" | "offline" | "searching_match" | "in_game" | "away";
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  puzzleElo?: number;
  puzzleBestElo?: number;
  puzzleAttempts?: number;
  puzzleSolved?: number;
  puzzleFailed?: number;
  puzzleSkipped?: number;
  puzzleLastAttemptAt?: string | null;
  language?: "en" | "mn";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  banReason: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setBanned: (reason: string) => void;
  logout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      banReason: null,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          banReason: null,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      setBanned: (banReason) =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          banReason,
        }),
      logout: () =>
        set({ user: null, isAuthenticated: false, banReason: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const authApi = {
  async login(email: string, password: string, rememberMe = false) {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (!res.ok) {
      const parsed = await parseApiError(res, "Login failed");
      throw createApiError(parsed);
    }
    const data = await res.json();
    return data;
  },

  async register(fullName: string, email: string, password: string) {
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fullName, email, password }),
    });
    if (!res.ok) {
      const parsed = await parseApiError(res, "Registration failed");
      throw createApiError(parsed);
    }
    const data = await res.json();
    return data;
  },

  async logout() {
    const res = await fetch(`${API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const parsed = await parseApiError(res, "Logout failed");
      throw createApiError(parsed);
    }
    const data = await res.json();
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_URL}/api/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      const parsed = await parseApiError(res, "Failed to load user");
      if (parsed.banned) {
        throw {
          banned: true,
          banReason: parsed.banReason || "No reason provided",
        };
      }
      return null;
    }
    const data = await res.json();
    return data.user;
  },

  async updateProfile(data: {
    fullName?: string;
    avatar?: string;
    language?: "en" | "mn";
  }) {
    const res = await fetch(`${API_URL}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const parsed = await parseApiError(res, "Failed to update profile");
      throw createApiError(parsed);
    }
    const result = await res.json();
    return result.user;
  },
};
