import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Trophy, Clock, Shield } from "lucide-react";
import {
  liveGames,
  recentMatches,
  puzzles,
  timeFormats,
  TimeFormat,
} from "../data/mockData";

interface DashboardProps {
  currentFormat: TimeFormat | null;
  setCurrentFormat: (format: TimeFormat) => void;
}

export default function Dashboard({
  currentFormat,
  setCurrentFormat,
}: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const winRate = 64; // Mock win rate

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const difficultyBadge = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "bg-green-900/30 text-green-400 border border-green-800";
      case "Medium":
        return "bg-amber-900/30 text-amber-400 border border-amber-800";
      case "Hard":
        return "bg-red-900/30 text-red-400 border border-red-800";
      default:
        return "bg-gray-800 text-gray-400";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
      {/* Left Column */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Live Games */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-500 dark:text-teal-400" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Live Games
                </h2>
                <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs rounded-full">
                  {liveGames.length} active
                </span>
              </div>
              <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors">
                View All
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {loading
              ? [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-100 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 w-2/3">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700/60 rounded w-36"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700/60 rounded w-64"></div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700/60 rounded w-24"></div>
                    </div>
                  </div>
                ))
              : liveGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group hover:translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {game.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
                            <Clock className="w-3 h-3" />
                            <span className="text-sm font-mono">
                              {game.timeControl}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {game.players.white}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 mx-2">
                              vs
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {game.players.black}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                            <Users className="w-3 h-3" />
                            <span className="text-sm">
                              {game.viewers.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-md transition-colors opacity-0 group-hover:opacity-100 shadow-sm hover:shadow-teal-600/20">
                          Watch
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
          </div>
        </motion.div>

        {/* Tournaments + Puzzles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Tournaments
              </h2>
            </div>
            <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors">
              Browse All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-50 dark:from-amber-900/15 to-orange-50 dark:to-olive-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Weekend Arena
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Starting in 2h
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                5+3 Blitz • Prize Pool $500
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  234/256 players
                </span>
                <button className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-md transition-colors">
                  Join
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 dark:from-slate-900/25 to-blue-50 dark:to-blue-900/20 rounded-lg p-4 border border-slate-200 dark:border-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Daily Rapid
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Tomorrow 8PM
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                10+5 Rapid • Prize Pool $200
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Open registration
                </span>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors">
                  Register
                </button>
              </div>
            </div>
          </div>

          {/* Embedded Puzzles under Tournaments */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🧩</span>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Puzzles
                </h3>
              </div>
              <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors">
                Browse All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {puzzles.map((pz, idx) => (
                <motion.div
                  key={pz.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.06 }}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-slate-50 dark:from-slate-900/25 to-blue-50 dark:to-blue-900/15 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{pz.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {pz.title}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${difficultyBadge(pz.difficulty)}`}
                    >
                      {pz.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {pz.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pz.themes.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md transition-colors">
                      Solve
                    </button>
                    <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                      Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Player Dashboard (Right Column) */}
      <div className="space-y-6">
        {/* Format Ratings Card */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-teal-50 dark:from-teal-900/20 to-cyan-50 dark:to-cyan-900/20 rounded-xl border border-teal-200 dark:border-teal-800/30 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
              Format Ratings
            </h3>
            <Shield className="w-5 h-5 text-teal-500 dark:text-teal-400" />
          </div>
          <div className="space-y-3">
            {timeFormats.map((format) => (
              <div
                key={format.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                  currentFormat?.id === format.id
                    ? "bg-teal-100 dark:bg-teal-800/30 border border-teal-400 dark:border-teal-600"
                    : "bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
                onClick={() => setCurrentFormat(format)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{format.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {format.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format.displayTime}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {format.rating}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format.rating > 1850
                      ? "🔥 Hot"
                      : format.rating > 1750
                        ? "📈 Rising"
                        : "📊 Stable"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Win Rate
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {winRate}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Games
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  142
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Streak
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  W3
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Matches */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
              Recent Matches
            </h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      match.result === "win"
                        ? "bg-green-500"
                        : match.result === "loss"
                          ? "bg-red-500"
                          : "bg-gray-500"
                    }`}
                  ></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {match.opponent}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {match.date} • {match.timeControl}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-sm font-bold ${
                    match.ratingChange > 0
                      ? "text-green-500 dark:text-green-400"
                      : match.ratingChange < 0
                        ? "text-red-500 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {match.ratingChange > 0 ? "+" : ""}
                  {match.ratingChange}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
