import { motion } from "framer-motion";
import { GameHistory } from "../../historyTypes";
import { ProfileStats, TabType } from "./types";
import { GameOutcomesCard } from "./GameOutcomesCard";
import { RecentGames } from "./RecentGames";
import { FormatStatsCard } from "./FormatStatsCard";

interface OverviewTabContentProps {
  stats: ProfileStats;
  games: GameHistory[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  setActiveTab: (tab: TabType) => void;
  analyzeBaseUrl?: string;
}

export function OverviewTabContent({
  stats,
  games,
  expandedId,
  setExpandedId,
  setActiveTab,
  analyzeBaseUrl,
}: OverviewTabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GameOutcomesCard stats={stats} />
        <FormatStatsCard />
      </div>

      <RecentGames
        games={games}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        setActiveTab={setActiveTab}
        analyzeBaseUrl={analyzeBaseUrl}
      />
    </motion.div>
  );
}
