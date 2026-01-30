import { useState, useRef, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Puzzles from "./pages/Puzzles";
import Learn from "./pages/Learn";
import Watch from "./pages/Watch";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Analyze from "./pages/Analyze";
import { useThemeStore } from "./store/themeStore";
import { useAuthStore, authApi } from "./store/authStore";
import { timeFormats, TimeFormat } from "./data/mockData";

// Auth check component
function AuthChecker() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getMe();
        setUser(user);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, [setUser, setLoading]);

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

function Layout({
  children,
  currentFormat,
  setCurrentFormat,
}: {
  children: React.ReactNode;
  currentFormat: TimeFormat | null;
  setCurrentFormat: (f: TimeFormat) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isGamePage = location.pathname === "/play";

  // Pages that have their own sidebar or are auth pages
  const hasOwnLayout =
    ["/watch", "/community", "/settings", "/login", "/register"].includes(
      location.pathname,
    ) || location.pathname.startsWith("/analyze");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // For pages with their own layout, just render children
  if (hasOwnLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-teal-500/30 transition-colors duration-300">
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 relative z-10 min-h-screen">
        {/* Header */}
        <header className="border-b border-gray-200/60 dark:border-gray-800 bg-[#f5f5f7]/95 dark:bg-gray-950/95 backdrop-blur-sm sticky top-0 z-40 h-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            {/* Mobile Logo */}
            <div className="flex items-center space-x-2 md:hidden">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ChessFlow
              </span>
            </div>

            {/* Desktop Spacer (or Breadcrumbs) */}
            <div className="hidden md:block">
              {/* Could add breadcrumbs or page title here */}
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4 ml-auto">
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <Trophy className="w-5 h-5" />
              </button>

              {/* Play Dropdown - Only show on Dashboard or if we want global access */}
              {!isGamePage && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center space-x-2 shadow-sm hover:shadow-teal-600/20"
                  >
                    <span className="text-lg">{currentFormat?.icon}</span>
                    <span className="hidden sm:inline">
                      {currentFormat?.name} • Play {currentFormat?.displayTime}
                    </span>
                    <span className="sm:hidden">Play</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    />
                  </button>
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-2">
                          {timeFormats.map((format) => (
                            <motion.button
                              key={format.id}
                              whileHover={{
                                backgroundColor: "rgba(20, 184, 166, 0.08)",
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setCurrentFormat(format);
                                setShowDropdown(false);
                              }}
                              className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${
                                currentFormat?.id === format.id
                                  ? "bg-teal-50 dark:bg-teal-900/20 border border-teal-400 dark:border-teal-700"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-xl">{format.icon}</span>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {format.name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      •
                                    </span>
                                    <span className="text-sm text-teal-600 dark:text-teal-400">
                                      {format.displayTime}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {format.description}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Rating
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                  {format.rating}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [currentFormat, setCurrentFormat] = useState<TimeFormat | null>(null);

  useEffect(() => {
    setCurrentFormat(timeFormats[2]);
  }, []); // Default to Rapid

  return (
    <Router>
      <ThemeController />
      <AuthChecker />
      <Layout currentFormat={currentFormat} setCurrentFormat={setCurrentFormat}>
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
                <Dashboard
                  currentFormat={currentFormat}
                  setCurrentFormat={setCurrentFormat}
                />
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
