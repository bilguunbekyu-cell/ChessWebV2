import { motion } from "framer-motion";
import { History, Trophy } from "lucide-react";
import { GameHistory } from "../../historyTypes";
import { GameCard } from "../profile";
import { FilterType } from "./types";

interface GamesTabContentProps {
  filteredGames: GameHistory[];
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}

export function GamesTabContent({
  filteredGames,
  filter,
  setFilter,
  expandedId,
  setExpandedId,
}: GamesTabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History size={24} className="text-teal-500" />
          All Games ({filteredGames.length})
        </h2>

        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
          {(["all", "wins", "losses", "draws"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-teal-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <GameCard
              key={game._id}
              game={game}
              isExpanded={expandedId === game._id}
              onToggle={() =>
                setExpandedId(expandedId === game._id ? null : game._id)
              }
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Trophy
              size={48}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
            />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No games found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try changing your filters or play a new game.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
