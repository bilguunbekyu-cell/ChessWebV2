import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Cpu,
  MessageCircle,
  Trophy,
  Users,
} from "lucide-react";
import { useLichessLiveGames } from "../hooks/useWatchPage";
import {
  LiveGamesSection,
  TournamentsSection,
  PuzzlesSection,
} from "../components/dashboardComponents";

type PairingOption = {
  label: string;
  category: string;
  initial?: number;
  increment?: number;
};

const pairingOptions: PairingOption[] = [
  { label: "1+0", category: "Bullet", initial: 60, increment: 0 },
  { label: "2+1", category: "Bullet", initial: 120, increment: 1 },
  { label: "3+0", category: "Blitz", initial: 180, increment: 0 },
  { label: "3+2", category: "Blitz", initial: 180, increment: 2 },
  { label: "5+0", category: "Blitz", initial: 300, increment: 0 },
  { label: "5+3", category: "Blitz", initial: 300, increment: 3 },
  { label: "10+0", category: "Rapid", initial: 600, increment: 0 },
  { label: "10+5", category: "Rapid", initial: 600, increment: 5 },
  { label: "15+10", category: "Rapid", initial: 900, increment: 10 },
  { label: "30+0", category: "Classical", initial: 1800, increment: 0 },
  { label: "30+20", category: "Classical", initial: 1800, increment: 20 },
  { label: "Custom", category: "Choose setup" },
];

const lobbyActions = [
  {
    title: "Create lobby game",
    hint: "Start a private game room",
    to: "/play/friend",
    icon: Users,
  },
  {
    title: "Challenge a friend",
    hint: "Invite from your friend list",
    to: "/friends",
    icon: MessageCircle,
  },
  {
    title: "Play against computer",
    hint: "Choose a bot personality",
    to: "/play/bot",
    icon: Cpu,
  },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { games, loading: apiLoading, error, refetch } = useLichessLiveGames();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const viewerCount = useMemo(
    () =>
      games.reduce((sum, game) => sum + (Number.parseInt(game.viewers, 10) || 0), 0),
    [games],
  );

  return (
    <div className="space-y-6 md:space-y-8 min-w-0">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid grid-cols-1 2xl:grid-cols-[minmax(0,_1fr)_380px] gap-6"
      >
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {pairingOptions.map((option) => (
                <Link
                  key={option.label}
                  to="/play/quick"
                  state={
                    option.initial !== undefined && option.increment !== undefined
                      ? { initial: option.initial, increment: option.increment }
                      : undefined
                  }
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/35 min-h-[124px] p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:border-teal-300 dark:hover:border-teal-700/50 hover:bg-white dark:hover:bg-gray-800/60 transition-colors"
                >
                  <p className="text-4xl sm:text-[2.65rem] leading-none font-light text-gray-900 dark:text-white tracking-tight">
                    {option.label}
                  </p>
                  <p className="mt-3 text-lg font-medium text-gray-600 dark:text-gray-300">
                    {option.category}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="space-y-3">
            {lobbyActions.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/35 px-4 py-4 hover:border-teal-300 dark:hover:border-teal-700/50 hover:bg-white dark:hover:bg-gray-800/60 transition-colors flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 group-hover:border-teal-300 dark:group-hover:border-teal-700/50 transition-colors">
                  <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {item.hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-6 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {loading || apiLoading ? "..." : viewerCount.toLocaleString()}
              </span>{" "}
              viewers watching now
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-900 dark:text-white">
                {loading || apiLoading ? "..." : games.length.toLocaleString()}
              </span>{" "}
              games in play
            </p>
          </div>
        </aside>
      </motion.section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="xl:col-span-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
        >
          <PuzzlesSection showTopDivider={false} />

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
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
          </div>
        </motion.section>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <LiveGamesSection
          loading={loading}
          games={games}
          apiLoading={apiLoading}
          error={error}
          refetch={refetch}
        />
      </motion.div>
    </div>
  );
}
