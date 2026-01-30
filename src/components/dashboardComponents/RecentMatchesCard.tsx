import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { recentMatches } from "../../data/mockData";

export function RecentMatchesCard() {
  return (
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
  );
}
