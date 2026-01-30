import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import { ProfileStats } from "./types";
import { ProgressBar } from "../profile";

interface GameOutcomesCardProps {
  stats: ProfileStats;
}

export function GameOutcomesCard({ stats }: GameOutcomesCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
    >
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <PieChart size={20} className="text-teal-500" />
        Game Outcomes
      </h3>
      <ProgressBar
        label="Wins"
        value={stats.wins}
        total={stats.total}
        color="bg-gradient-to-r from-green-500 to-emerald-500"
      />
      <ProgressBar
        label="Losses"
        value={stats.losses}
        total={stats.total}
        color="bg-gradient-to-r from-red-500 to-rose-500"
      />
      <ProgressBar
        label="Draws"
        value={stats.draws}
        total={stats.total}
        color="bg-gradient-to-r from-yellow-500 to-amber-500"
      />
    </motion.div>
  );
}
