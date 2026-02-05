import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Puzzle, Clock, Play, ArrowRight, Award } from "lucide-react";

export function DailyPuzzleCard() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="lg:col-span-2 bg-gradient-to-br from-white dark:from-gray-900 to-gray-50 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative group shadow-lg"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <Puzzle className="w-48 h-48 text-teal-500" />
      </div>

      <div className="p-8 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-200 dark:border-teal-500/30">
            Daily Challenge
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" /> 12 hours remaining
          </span>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          The Immortal Zugzwang
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-lg text-lg leading-relaxed">
          White to move. Can you find the subtle quiet move that leaves Black
          completely helpless despite their material advantage?
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate("/puzzles/train")}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-teal-900/20 flex items-center gap-2 transform hover:translate-y-[-2px]"
          >
            <Play className="w-5 h-5" /> Start Training{" "}
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-700">
            View Solution
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function TrainingThemes() {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        Training Themes
      </h3>

      <div className="grid grid-cols-1 gap-3">
        {["Tactics", "Endgames", "Openings", "Strategy"].map((theme, i) => (
          <motion.button
            key={theme}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="w-full p-4 rounded-xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all text-left group flex items-center justify-between shadow-sm"
          >
            <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
              {theme}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
