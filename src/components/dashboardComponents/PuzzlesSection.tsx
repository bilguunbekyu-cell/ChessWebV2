import { motion } from "framer-motion";
import { puzzles } from "../../data/mockData";
import { difficultyBadge } from "./types";

export function PuzzlesSection() {
  return (
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
  );
}
