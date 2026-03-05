import {
  Puzzle,
  GraduationCap,
  Eye,
  Users,
  Settings,
  MessageSquare,
  Bell,
  Newspaper,
  LogOut,
  Trophy,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, authApi } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useNotificationStore } from "../store/notificationStore";
import { useEffect } from "react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const isActive = (path: string) =>
    path === "/news"
      ? location.pathname === "/news" || location.pathname.startsWith("/news/")
      : location.pathname === path;
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

  useEffect(() => {
    if (!user?.id) return;
    void fetchUnreadCount();
    // Slow fallback poll – socket pushes handle most updates in real-time
    const timerId = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(timerId);
  }, [user?.id, fetchUnreadCount]);

  const navItems = [
    { icon: Trophy, label: "Tournaments", path: "/tournaments" },
    { icon: Newspaper, label: "News", path: "/news" },
    { icon: Puzzle, label: "Puzzles", path: "/puzzles" },
    { icon: GraduationCap, label: "Learn", path: "/learn" },
    { icon: Eye, label: "Watch", path: "/watch" },
    { icon: Users, label: "Community", path: "/community" },
  ];
  const fontSizeGroup = {
    primary: "text-base",
    secondary: "text-sm",
    caption: "text-xs",
  } as const;
  const styleGroup = {
    logoWrapper: isCompact ? "px-5 pt-4 pb-3" : "px-6 pt-5 pb-4",
    logoHeight: isCompact ? "h-14" : "h-16",
    navWrapper: isCompact ? "px-3 py-3" : "px-3 py-4",
    navGap: isCompact ? "gap-1" : "gap-1.5",
    rowPadding: isCompact ? "px-3 py-2" : "px-4 py-2.5",
    rowIcon: isCompact ? "w-4 h-4" : "w-5 h-5",
    profileRowPadding: isCompact ? "px-3 py-2" : "px-3 py-2.5",
    iconButtonPadding: isCompact ? "p-1.5" : "p-2",
  } as const;
  const logoSrc = isDarkMode ? "/images/Logo.png" : "/images/LightModeLogo.png";

  return (
    <div className="w-72 h-screen bg-[#ebebed] dark:bg-gray-900 flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300">
      {}
      <Link
        to="/"
        className={`flex items-center gap-3 border-b border-gray-200/70 dark:border-gray-800 ${styleGroup.logoWrapper}`}
      >
        <img
          src={logoSrc}
          alt="NeonGambit"
          className={`object-contain ${styleGroup.logoHeight}`}
        />
        <span
          className={`text-gray-900 dark:text-white font-bold tracking-tight ${
            isCompact ? "text-xl" : "text-2xl"
          }`}
        >
          NeonGambit
        </span>
      </Link>

      {}
      <nav className={`flex-1 overflow-y-auto ${styleGroup.navWrapper}`}>
        <div className={`flex flex-col ${styleGroup.navGap}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 min-h-[44px] ${styleGroup.rowPadding} rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <item.icon
                className={`shrink-0 ${styleGroup.rowIcon} ${
                  isActive(item.path)
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
                }`}
              />
              <span
                className={`font-medium leading-none ${fontSizeGroup.primary}`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {}
      <div
        className={`border-t border-gray-200/70 dark:border-gray-800 flex flex-col ${isCompact ? "px-3 py-3 gap-1" : "px-3 py-4 gap-1.5"}`}
      >
        <div className={`${isCompact ? "pt-1" : "pt-1.5"} space-y-2`}>
          <Link
            to="/profile"
            className={`w-full min-w-0 flex items-center gap-3 ${styleGroup.profileRowPadding} rounded-xl transition-colors cursor-pointer group ${
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
                <span className={`text-white font-bold ${fontSizeGroup.caption}`}>
                  {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`font-medium text-gray-900 dark:text-white truncate ${fontSizeGroup.secondary}`}
              >
                {user?.fullName || "User"}
              </div>
              <div className={`text-gray-500 truncate ${fontSizeGroup.caption}`}>
                View Profile
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-4 gap-2">
            <Link
              to="/messages"
              className={`flex items-center justify-center rounded-lg transition-colors ${
                isActive("/messages")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${styleGroup.iconButtonPadding}`}
              title="Messages"
            >
              <MessageSquare className={styleGroup.rowIcon} />
            </Link>

            <Link
              to="/notifications"
              className={`relative flex items-center justify-center rounded-lg transition-colors ${
                isActive("/notifications")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${styleGroup.iconButtonPadding}`}
              title="Notifications"
            >
              <Bell className={styleGroup.rowIcon} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>

            <Link
              to="/friends"
              className={`flex items-center justify-center rounded-lg transition-colors ${
                isActive("/friends")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${styleGroup.iconButtonPadding}`}
              title="Friends"
            >
              <Users className={styleGroup.rowIcon} />
            </Link>

            <Link
              to="/settings"
              className={`flex items-center justify-center rounded-lg transition-colors ${
                isActive("/settings")
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              } ${styleGroup.iconButtonPadding}`}
              title="Settings"
            >
              <Settings className={styleGroup.rowIcon} />
            </Link>
          </div>
        </div>

        {}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 min-h-[44px] ${styleGroup.rowPadding} rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        >
          <LogOut className={styleGroup.rowIcon} />
          <span className={`font-medium leading-none ${fontSizeGroup.primary}`}>
            Log Out
          </span>
        </button>
      </div>
    </div>
  );
}
