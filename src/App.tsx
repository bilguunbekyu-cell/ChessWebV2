import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/game";
import PlayWithBot, { BotGamePage } from "./pages/playWithBot";
import QuickMatch from "./pages/quickMatch";
import PlayWithFriend from "./pages/playWithFriend";
import PlayVariants from "./pages/playVariants";
import PlayFourPlayer from "./pages/playFourPlayer";
import PlayPractice from "./pages/playPractice";
import Puzzles from "./pages/puzzles";
import PuzzleTrainer from "./pages/puzzleTrainer";
import Learn from "./pages/Learn";
import Watch from "./pages/watch";
import Community from "./pages/Community";
import Friends from "./pages/friends";
import Messages from "./pages/messages";
import Notifications from "./pages/notifications";
import Tournaments from "./pages/tournaments";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Analyze from "./pages/analyze";
import Analyze960 from "./pages/analyze960";
import AdminDashboard from "./pages/adminDashboard";
import AdminUsers from "./pages/adminUsers";
import AdminUserProfile from "./pages/AdminUserProfile";
import AdminAnalyze from "./pages/adminAnalyze";
import AdminPuzzles from "./pages/AdminPuzzles";
import { AdminBots } from "./pages/adminBots";
import { AdminFeaturedEvents } from "./pages/adminFeaturedEvents";
import { AdminGames } from "./pages/adminGames";
import AdminFeedback from "./pages/adminFeedback";
import AdminLessons from "./pages/adminLessons";
import AdminNews from "./pages/adminNews";
import AdminBroadcast from "./pages/adminBroadcast";
import AdminCheatReports from "./pages/adminCheatReports";
import AdminAuditLogs from "./pages/adminAuditLogs";
import NewsList from "./pages/news";
import { NewsDetail } from "./pages/news/detailIndex";
import { useThemeStore } from "./store/themeStore";
import { useAuthStore, authApi } from "./store/authStore";
import { useFriendChallengeStore } from "./store/friendChallengeStore";
import { useSettingsStore } from "./store/settingsStore";
import FriendChallengeOverlay from "./components/FriendChallengeOverlay";
import { ProtectedRoute, PublicRoute } from "./components/routes/RouteGuards";
import i18n from "./i18n";
import { AutoTranslate } from "./i18n/AutoTranslate";

function AuthChecker() {
  const { setUser, setBanned } = useAuthStore();
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getMe();
        setUser(user);
        if (user?.language === "en" || user?.language === "mn") {
          setLanguage(user.language);
        }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "banned" in err) {
          const banErr = err as { banned: boolean; banReason: string };
          setBanned(banErr.banReason);
        } else {
          setUser(null);
        }
      }
    };
    checkAuth();
  }, [setUser, setBanned, setLanguage]);

  return null;
}

function LanguageProfileSync() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const language = useSettingsStore((state) => state.settings.language);
  const lastSyncKeyRef = useRef<string>("");

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const userLanguage = user.language === "mn" ? "mn" : "en";
    const targetLanguage = language === "mn" ? "mn" : "en";
    if (userLanguage === targetLanguage) return;

    const syncKey = `${user.id}:${targetLanguage}`;
    if (lastSyncKeyRef.current === syncKey) return;
    lastSyncKeyRef.current = syncKey;

    void authApi
      .updateProfile({ language: targetLanguage })
      .then((updatedUser) => {
        setUser(updatedUser);
      })
      .catch(() => {
        lastSyncKeyRef.current = "";
      });
  }, [isAuthenticated, language, setUser, user?.id, user?.language]);

  return null;
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

function LanguageController() {
  const language = useSettingsStore((state) => state.settings.language);
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Applying language...");

  useEffect(() => {
    const targetLanguage = language === "mn" ? "mn" : "en";
    if (i18n.resolvedLanguage === targetLanguage) {
      document.documentElement.lang = targetLanguage;
      return;
    }

    let cancelled = false;
    setLoadingLabel(
      i18n.t("Applying language...", {
        lng: targetLanguage,
        defaultValue: "Applying language...",
      }),
    );
    setIsSwitchingLanguage(true);

    void i18n
      .changeLanguage(targetLanguage)
      .then(() => {
        if (cancelled) return;
        document.documentElement.lang = targetLanguage;
      })
      .finally(() => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (!cancelled) setIsSwitchingLanguage(false);
        }, 250);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  if (!isSwitchingLanguage) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-[#f5f5f7]/80 dark:bg-gray-950/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 shadow-lg">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {loadingLabel}
        </span>
      </div>
    </div>
  );
}

function RealtimeBridge() {
  const { isAuthenticated, user } = useAuthStore();
  const initialize = useFriendChallengeStore((state) => state.initialize);
  const disconnect = useFriendChallengeStore((state) => state.disconnect);

  useEffect(() => {
    if (isAuthenticated && user) {
      initialize(user);
      return;
    }
    disconnect();
  }, [disconnect, initialize, isAuthenticated, user]);

  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isDashboardPage = location.pathname === "/";
  const isGamePage =
    location.pathname === "/play" ||
    location.pathname === "/play/bot" ||
    location.pathname === "/play/quick" ||
    location.pathname === "/play/friend" ||
    location.pathname === "/play/variants" ||
    location.pathname === "/play/four-player" ||
    location.pathname === "/play/practice";

  const hasOwnLayout =
    [
      "/watch",
      "/community",
      "/friends",
      "/messages",
      "/notifications",
      "/settings",
      "/login",
      "/register",
      "/profile",
    ].includes(location.pathname) ||
    location.pathname.startsWith("/news") ||
    location.pathname.startsWith("/u/") ||
    location.pathname.startsWith("/puzzles/train") ||
    location.pathname.startsWith("/analyze") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.match(/^\/play\/bot\/.+/);

  if (hasOwnLayout) {
    return <>{children}</>;
  }

  return (
    <div
      className={`bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white font-sans selection:bg-teal-500/30 transition-colors duration-300 ${
        isGamePage ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <Sidebar />

      {}
      <div
        className={`flex-1 flex flex-col ml-72 relative z-10 ${
          isGamePage ? "h-screen overflow-hidden" : "min-h-screen"
        }`}
      >
        {}
        <main
          className={`w-full flex-1 flex flex-col ${
            isGamePage
              ? "min-h-0 overflow-hidden px-0 py-0"
              : isDashboardPage
                ? "w-full px-4 sm:px-5 lg:px-6 xl:px-8 py-8"
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
  const language = useSettingsStore((state) => state.settings.language);
  const activeLanguage = language === "mn" ? "mn" : "en";

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AutoTranslate language={activeLanguage}>
        <ThemeController />
        <LanguageController />
        <AuthChecker />
        <LanguageProfileSync />
        <RealtimeBridge />
        <Layout>
          <Routes>
            {}
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

            {}
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
              path="/play/bot"
              element={
                <ProtectedRoute>
                  <PlayWithBot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/bot/:botId"
              element={
                <ProtectedRoute>
                  <BotGamePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/quick"
              element={
                <ProtectedRoute>
                  <QuickMatch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/variants"
              element={
                <ProtectedRoute>
                  <PlayVariants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/four-player"
              element={
                <ProtectedRoute>
                  <PlayFourPlayer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/practice"
              element={
                <ProtectedRoute>
                  <PlayPractice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/friend"
              element={
                <ProtectedRoute>
                  <PlayWithFriend />
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
              path="/news"
              element={
                <ProtectedRoute>
                  <NewsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news/:slug"
              element={
                <ProtectedRoute>
                  <NewsDetail />
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
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <Tournaments />
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
              path="/u/:userId"
              element={
                <ProtectedRoute>
                  <UserProfile />
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
            <Route
              path="/analyze960/:gameId"
              element={
                <ProtectedRoute>
                  <Analyze960 />
                </ProtectedRoute>
              }
            />

            {}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
            <Route path="/admin/puzzles" element={<AdminPuzzles />} />
            <Route path="/admin/bots" element={<AdminBots />} />
            <Route path="/admin/events" element={<AdminFeaturedEvents />} />
            <Route path="/admin/games" element={<AdminGames />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/lessons" element={<AdminLessons />} />
            <Route path="/admin/cheat-reports" element={<AdminCheatReports />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/admin/broadcast" element={<AdminBroadcast />} />
            <Route path="/admin/analyze/:gameId" element={<AdminAnalyze />} />
          </Routes>
        </Layout>
        <FriendChallengeOverlay />
      </AutoTranslate>
    </Router>
  );
}

export default App;
