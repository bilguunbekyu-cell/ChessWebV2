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
    <div className="w-64 h-screen bg-[#ebebed] dark:bg-gray-900 border-r border-gray-200/60 dark:border-gray-800 flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300">
      {/* Logo */}
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <span className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">
          ChessFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              isActive(item.path)
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-l-4 border-teal-500"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <item.icon
              className={`w-5 h-5 ${isActive(item.path) ? "text-teal-600 dark:text-teal-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"}`}
            />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Theme Toggle & Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="font-medium">
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* User Profile & Settings Row */}
        <div className="flex items-center gap-2">
          {/* Click avatar/name to go to Profile */}
          <Link
            to="/profile"
            className={`flex-1 flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer group ${
              isActive("/profile")
                ? "bg-teal-500/10"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">
                {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.fullName || "User"}
              </div>
              <div className="text-xs text-gray-500 truncate">View Profile</div>
            </div>
          </Link>

          {/* Settings Icon Button */}
          <Link
            to="/settings"
            className={`p-3 rounded-lg transition-colors ${
              isActive("/settings")
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}
