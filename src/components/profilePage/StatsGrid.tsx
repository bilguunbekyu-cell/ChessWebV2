import { motion } from "framer-motion";
import { Trophy, TrendingUp, Zap, Swords } from "lucide-react";
import { ProfileStats } from "./types";
import { StatCard } from "../profile";

interface StatsGridProps {
  stats: ProfileStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Total Games"
        value={stats.total}
        icon={Trophy}
        color="bg-purple-500 text-purple-500"
      />
      <StatCard
        title="Win Rate"
        value={`${stats.winRate}%`}
        subtext={`${stats.wins}W - ${stats.losses}L - ${stats.draws}D`}
        icon={TrendingUp}
        color="bg-green-500 text-green-500"
      />
      <StatCard
        title="Current Streak"
        value={`${stats.currentStreak} 🔥`}
        subtext={`Best: ${stats.maxStreak}`}
        icon={Zap}
        color="bg-orange-500 text-orange-500"
      />
      <StatCard
        title="Avg. Moves"
        value={stats.avgMoves}
        icon={Swords}
        color="bg-blue-500 text-blue-500"
      />
    </div>
  );
}
