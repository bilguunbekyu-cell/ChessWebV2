import { motion } from "framer-motion";
import { GameHistory } from "../../historyTypes";
import { ProfileStats, TabType } from "./types";
import { StatsGrid } from "./StatsGrid";
import { GameOutcomesCard } from "./GameOutcomesCard";
import { PerformanceByColorCard } from "./PerformanceByColorCard";
import { QuickStatsCard } from "./QuickStatsCard";
import { RecentGames } from "./RecentGames";

interface OverviewTabContentProps {
  stats: ProfileStats;
  games: GameHistory[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  setActiveTab: (tab: TabType) => void;
}

export function OverviewTabContent({
  stats,
  games,
  expandedId,
  setExpandedId,
  setActiveTab,
}: OverviewTabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GameOutcomesCard stats={stats} />
        <PerformanceByColorCard stats={stats} />
        <QuickStatsCard stats={stats} />
      </div>

      <RecentGames
        games={games}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        setActiveTab={setActiveTab}
      />
    </motion.div>
  );
}
