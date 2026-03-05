import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute } from "./RouteGuards";
import { useAuthStore } from "../../store/authStore";

function resetAuthState() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    banReason: null,
  });
}

describe("RouteGuards", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthState();
  });

  it("ProtectedRoute redirects unauthenticated users to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Private Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Private Page")).not.toBeInTheDocument();
  });

  it("ProtectedRoute renders children for authenticated users", () => {
    useAuthStore.setState({
      user: {
        id: "u-1",
        email: "route.user@test.dev",
        fullName: "Route User",
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      banReason: null,
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Private Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Private Page")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("PublicRoute redirects authenticated users to /", async () => {
    useAuthStore.setState({
      user: {
        id: "u-2",
        email: "public.route@test.dev",
        fullName: "Public Route User",
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      banReason: null,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Form</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
    expect(screen.queryByText("Login Form")).not.toBeInTheDocument();
  });

  it("Route guards show loading state when auth is loading", () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      banReason: null,
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Private Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-loading")).toBeInTheDocument();
  });
});
