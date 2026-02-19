import {
  LayoutDashboard,
  Play,
  Puzzle,
  GraduationCap,
  Eye,
  Users,
  Settings,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/themeStore";
import { useAuthStore, authApi } from "../store/authStore";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isActive = (path: string) => location.pathname === path;
  const isCompact =
    location.pathname.startsWith("/play/quick") ||
    location.pathname.startsWith("/play/friend") ||
    location.pathname.startsWith("/play/variants") ||
    location.pathname.startsWith("/play/practice");

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Play, label: "Play", path: "/play" },
    { icon: Puzzle, label: "Puzzles", path: "/puzzles" },
    { icon: GraduationCap, label: "Learn", path: "/learn" },
    { icon: Eye, label: "Watch", path: "/watch" },
    { icon: Users, label: "Community", path: "/community" },
  ];

  return (
    <div
      className={`w-72 h-screen bg-[#ebebed] dark:bg-gray-900 border-r border-gray-200/60 dark:border-gray-800 flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300 ${
        isCompact ? "text-sm" : ""
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center space-x-3 border-b border-gray-200/60 dark:border-gray-800 ${isCompact ? "px-5 py-4" : "px-6 py-5"}`}
      >
        <div
          className={`bg-teal-500 rounded-lg flex items-center justify-center ${
            isCompact ? "w-7 h-7" : "w-8 h-8"
          }`}
        >
          <span
            className={`text-white font-bold ${isCompact ? "text-lg" : "text-xl"}`}
          >
            C
          </span>
        </div>
        <span
          className={`text-gray-900 dark:text-white font-bold tracking-tight ${
            isCompact ? "text-lg" : "text-xl"
          }`}
        >
          ChessFlow
        </span>
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 overflow-y-auto ${isCompact ? "px-3 py-2" : "px-3 py-4"}`}
      >
        <div className={`flex flex-col ${isCompact ? "gap-0.5" : "gap-1"}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 border-l-4 ${
                isCompact ? "px-3 py-2" : "px-4 py-2.5"
              } rounded-lg transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <item.icon
                className={`${isCompact ? "w-4 h-4" : "w-5 h-5"} ${
                  isActive(item.path)
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
                }`}
              />
              <span className={`font-medium ${isCompact ? "text-sm" : ""}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div
        className={`border-t border-gray-200/60 dark:border-gray-800 flex flex-col ${isCompact ? "px-3 py-3 gap-1" : "px-3 py-4 gap-1.5"}`}
      >
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center space-x-3 border-l-4 border-transparent ${
            isCompact ? "px-3 py-2" : "px-4 py-2.5"
          } rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors`}
        >
          {isDarkMode ? (
            <Sun className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
          ) : (
            <Moon className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
          )}
          <span className={`font-medium ${isCompact ? "text-sm" : ""}`}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center space-x-3 border-l-4 border-transparent ${
            isCompact ? "px-3 py-2" : "px-4 py-2.5"
          } rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        >
          <LogOut className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
          <span className={`font-medium ${isCompact ? "text-sm" : ""}`}>
            Log Out
          </span>
        </button>

        {/* User Profile & Quick Actions */}
        <div
          className={`border-t border-gray-200/60 dark:border-gray-800 ${
            isCompact ? "pt-2 mt-1" : "pt-3 mt-1.5"
          }`}
        >
          <div className="flex items-center gap-2 w-full">
            {/* Click avatar/name to go to Profile */}
            <Link
              to="/profile"
              className={`flex-1 min-w-0 flex items-center space-x-3 ${
                isCompact ? "px-3 py-2" : "px-3 py-2.5"
              } rounded-lg transition-colors cursor-pointer group ${
                isActive("/profile")
                  ? "bg-teal-500/10"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div
                className={`flex-shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg overflow-hidden ${
                  isCompact ? "w-8 h-8" : "w-9 h-9"
                }`}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.fullName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className={`text-white font-bold ${isCompact ? "text-xs" : "text-sm"}`}
                  >
                    {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium text-gray-900 dark:text-white truncate ${
                    isCompact ? "text-xs" : "text-sm"
                  }`}
                >
                  {user?.fullName || "User"}
                </div>
                <div
                  className={`text-gray-500 truncate ${isCompact ? "text-[10px]" : "text-xs"}`}
                >
                  View Profile
                </div>
              </div>
            </Link>

            {/* Add Friend Icon Button */}
            <Link
              to="/friends"
              className={`flex-shrink-0 rounded-lg transition-colors ${
                isActive("/friends")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${isCompact ? "p-1.5" : "p-2"}`}
              title="Friends"
            >
              <Users className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
            </Link>

            {/* Settings Icon Button */}
            <Link
              to="/settings"
              className={`flex-shrink-0 rounded-lg transition-colors ${
                isActive("/settings")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${isCompact ? "p-1.5" : "p-2"}`}
              title="Settings"
            >
              <Settings className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
