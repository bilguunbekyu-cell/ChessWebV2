import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { timeFormats, TimeFormat } from "../../data/mockData";

interface FormatRatingsCardProps {
  currentFormat: TimeFormat | null;
  setCurrentFormat: (format: TimeFormat) => void;
}

export function FormatRatingsCard({
  currentFormat,
  setCurrentFormat,
}: FormatRatingsCardProps) {
  const winRate = 64; // Mock win rate

  return (
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
  );
}
