import { motion } from "framer-motion";
import { History } from "lucide-react";
import { GameHistory } from "../../historyTypes";
import { GameCard } from "../profile";
import { TabType } from "./types";

interface RecentGamesProps {
  games: GameHistory[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  setActiveTab: (tab: TabType) => void;
  analyzeBaseUrl?: string;
}

export function RecentGames({
  games,
  expandedId,
  setExpandedId,
  setActiveTab,
  analyzeBaseUrl,
}: RecentGamesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History size={20} className="text-teal-500" />
          Recent Games
        </h3>
        <button
          onClick={() => setActiveTab("games")}
          className="text-sm text-teal-600 dark:text-teal-400 hover:underline font-medium"
        >
          View All →
        </button>
      </div>
      <div className="space-y-3">
        {games.slice(0, 3).map((game) => (
          <GameCard
            key={game._id}
            game={game}
            isExpanded={expandedId === game._id}
            onToggle={() =>
              setExpandedId(expandedId === game._id ? null : game._id)
            }
            analyzeBaseUrl={analyzeBaseUrl}
          />
        ))}
      </div>
    </motion.div>
  );
}
