import { motion } from "framer-motion";
import { Target, Brain, Zap } from "lucide-react";

export function PuzzleStatsCards() {
  return (
    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-sm"
      >
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            Puzzle Rating
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            2150
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Target className="w-5 h-5 text-teal-500 dark:text-teal-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-sm"
      >
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            Solved Today
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            12
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-sm"
      >
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            Streak
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            5 Days
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
      </motion.div>
    </div>
  );
}
