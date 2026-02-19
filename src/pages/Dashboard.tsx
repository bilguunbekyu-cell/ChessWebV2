import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import {
  LiveGamesSection,
  TournamentsSection,
  PuzzlesSection,
  FormatRatingsCard,
  RecentMatchesCard,
} from "../components/dashboardComponents";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[5fr_2fr] gap-6">
      {/* Left Column */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-6 min-w-0"
      >
        {/* Live Games */}
        <LiveGamesSection loading={loading} />

        {/* Tournaments + Puzzles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Tournaments
              </h2>
            </div>
            <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors">
              Browse All
            </button>
          </div>
          <TournamentsSection />
          <PuzzlesSection />
        </motion.div>
      </motion.div>

      {/* Player Dashboard (Right Column) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="space-y-6"
      >
        <FormatRatingsCard />
        <RecentMatchesCard />
      </motion.div>
    </div>
  );
}
