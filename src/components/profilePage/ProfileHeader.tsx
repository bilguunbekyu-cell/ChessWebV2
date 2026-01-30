import { motion } from "framer-motion";
import {
  Calendar,
  Trophy,
  Mail,
  Flame,
  Crown,
  BarChart3,
  History,
} from "lucide-react";
import { ProfileStats, TabType } from "./types";

interface ProfileHeaderProps {
  user: { fullName?: string; email?: string } | null;
  stats: ProfileStats | null;
  memberSince: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function ProfileHeader({
  user,
  stats,
  memberSince,
  activeTab,
  setActiveTab,
}: ProfileHeaderProps) {
  return (
    <div className="relative">
      <div className="h-40 bg-gradient-to-r  relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6bS0xMiAwYzAtMiAyLTQgMi00czIgMiAyIDQtMiA0LTIgNC0yLTItMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="relative -mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 lg:p-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-900">
                  <span className="text-white font-bold text-4xl">
                    {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                      {user?.fullName || "Chess Player"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Mail size={14} />
                        {user?.email || "email@example.com"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        Member since {memberSince}
                      </span>
                    </div>
                  </div>

                  {stats && (
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl">
                        <Trophy size={18} />
                        <span className="font-bold">{stats.winRate}%</span>
                        <span className="text-sm opacity-75">Win Rate</span>
                      </div>
                      <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-xl">
                        <Flame size={18} />
                        <span className="font-bold">{stats.currentStreak}</span>
                        <span className="text-sm opacity-75">Streak</span>
                      </div>
                      <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl">
                        <Crown size={18} />
                        <span className="font-bold">{stats.total}</span>
                        <span className="text-sm opacity-75">Games</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === "overview"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <BarChart3 size={16} />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("games")}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === "games"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <History size={16} />
                  Game History
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
