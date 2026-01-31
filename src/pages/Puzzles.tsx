import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Puzzle,
  TrendingUp,
  Zap,
  Target,
  Award,
  ArrowRight,
  Brain,
  Clock,
  Play,
  Flame,
  Trophy,
  Loader2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface PuzzleItem {
  _id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string[];
  description: string;
  icon: string;
  fen: string;
  solution: string[];
  rating: number;
  isWhiteToMove: boolean;
  timesPlayed: number;
  timesSolved: number;
}

export default function Puzzles() {
  const navigate = useNavigate();
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/puzzles`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPuzzles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch puzzles:", err);
        setLoading(false);
      });
  }, []);

  const difficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800";
      case "Medium":
        return "text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800";
      case "Hard":
        return "text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800";
      default:
        return "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-teal-500 dark:text-teal-400" />
            Puzzles
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sharpen your tactical skills
          </p>
        </div>

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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Puzzle (Left 2 cols) */}
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
              White to move. Can you find the subtle quiet move that leaves
              Black completely helpless despite their material advantage?
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

        {/* Puzzle Themes / Categories (Right col) */}
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
      </div>

      {/* Recommended Puzzles Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recommended for You
          </h3>
          <button className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 text-sm font-medium transition-colors">
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : puzzles.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              No puzzles available
            </div>
          ) : (
            puzzles.map((puzzle, idx) => (
              <motion.div
                key={puzzle._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/puzzles/train/${puzzle._id}`)}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-teal-300 dark:hover:border-teal-700 transition-all group hover:shadow-lg shadow-sm cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {puzzle.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {puzzle.rating}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${difficultyColor(puzzle.difficulty)}`}
                    >
                      {puzzle.difficulty}
                    </span>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {puzzle.title}
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {puzzle.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {puzzle.themes.map((theme) => (
                    <span
                      key={theme}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {puzzle.isWhiteToMove ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-white border border-gray-300" />
                        White to move
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full bg-gray-800 border border-gray-600" />
                        Black to move
                      </>
                    )}
                  </span>
                  <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-1 group-hover:shadow-lg group-hover:shadow-teal-500/20">
                    <Play size={14} /> Solve
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
