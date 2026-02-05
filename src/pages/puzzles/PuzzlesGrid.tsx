import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Loader2 } from "lucide-react";
import { PuzzleItem, getDifficultyColor } from "./types";

interface PuzzleCardProps {
  puzzle: PuzzleItem;
  index: number;
}

export function PuzzleCard({ puzzle, index }: PuzzleCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
            className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getDifficultyColor(puzzle.difficulty)}`}
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
  );
}

interface PuzzlesGridProps {
  puzzles: PuzzleItem[];
  loading: boolean;
}

export function PuzzlesGrid({ puzzles, loading }: PuzzlesGridProps) {
  return (
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
            <PuzzleCard key={puzzle._id} puzzle={puzzle} index={idx} />
          ))
        )}
      </div>
    </div>
  );
}
