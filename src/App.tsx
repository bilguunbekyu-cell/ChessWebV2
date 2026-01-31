import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Puzzles from "./pages/Puzzles";
import PuzzleTrainer from "./pages/PuzzleTrainer";
import Learn from "./pages/Learn";
import Watch from "./pages/Watch";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Analyze from "./pages/Analyze";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminUserProfile from "./pages/AdminUserProfile";
import AdminAnalyze from "./pages/AdminAnalyze";
import AdminPuzzles from "./pages/AdminPuzzles";
import { useThemeStore } from "./store/themeStore";
import { useAuthStore, authApi } from "./store/authStore";

// Auth check component
function AuthChecker() {
  const { setUser, setLoading, setBanned } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getMe();
        setUser(user);
      } catch (err: unknown) {
        // Check if user was banned
        if (err && typeof err === "object" && "banned" in err) {
          const banErr = err as { banned: boolean; banReason: string };
          setBanned(banErr.banReason);
        } else {
          setUser(null);
        }
      }
    };
    checkAuth();
  }, [setUser, setLoading, setBanned]);

  return null;
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Redirect if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ThemeController() {
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isGamePage = location.pathname === "/play";

  // Pages that have their own sidebar or are auth pages
  const hasOwnLayout =
    [
      "/watch",
      "/community",
      "/settings",
      "/login",
      "/register",
      "/profile",
    ].includes(location.pathname) ||
    location.pathname.startsWith("/puzzles/train") ||
    location.pathname.startsWith("/analyze") ||
    location.pathname.startsWith("/admin");

  // For pages with their own layout, just render children
  if (hasOwnLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-teal-500/30 transition-colors duration-300">
      <Sidebar />

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col md:ml-64 relative z-10 ${
          isGamePage ? "h-screen" : "min-h-screen"
        }`}
      >
        {/* Main Content */}
        <main
          className={`w-full flex-1 flex flex-col ${
            isGamePage
              ? "min-h-0 overflow-hidden px-0 py-0"
              : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeController />
      <AuthChecker />
      <Layout>
        <Routes>
          {/* Public routes - redirect to home if logged in */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected routes - redirect to login if not logged in */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/play"
            element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzles"
            element={
              <ProtectedRoute>
                <Puzzles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzles/train/:puzzleId?"
            element={
              <ProtectedRoute>
                <PuzzleTrainer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <Learn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watch"
            element={
              <ProtectedRoute>
                <Watch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze/:gameId"
            element={
              <ProtectedRoute>
                <Analyze />
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard - uses same login page, admin auth checked inside */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
          <Route path="/admin/puzzles" element={<AdminPuzzles />} />
          <Route path="/admin/analyze/:gameId" element={<AdminAnalyze />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
