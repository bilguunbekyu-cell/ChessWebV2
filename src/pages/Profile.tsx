import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Trophy,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  TrendingUp,
  Target,
  Zap,
  Swords,
  History,
  PieChart,
  User,
  Mail,
  MapPin,
  Award,
  Flame,
  Crown,
  BarChart3,
  Activity
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface GameHistory {
  _id: string;
  event: string;
  site: string;
  date: string;
  round: string;
  white: string;
  black: string;
  result: string;
  currentPosition: string;
  timeControl: string;
  utcDate: string;
  utcTime: string;
  startTime: string;
  endDate: string;
  endTime: string;
  whiteElo: number;
  blackElo: number;
  eco: string;
  ecoUrl?: string;
  timezone?: string;
  link?: string;
  whiteUrl?: string;
  whiteCountry?: string;
  whiteTitle?: string;
  blackUrl?: string;
  blackCountry?: string;
  blackTitle?: string;
  moveText?: string;
  termination: string;
  moves: string[];
  pgn: string;
  playAs: "white" | "black";
  opponent: string;
  opponentLevel?: number;
  durationMs?: number;
  createdAt: string;
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// --- Components ---

function StatCard({ title, value, subtext, icon: Icon, color, gradient }: { 
  title: string, 
  value: string | number, 
  subtext?: string, 
  icon: any, 
  color: string,
  gradient?: string 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all ${gradient || 'bg-white dark:bg-gray-900'}`}
    >
      {gradient && <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent" />}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2.5 rounded-xl ${color} bg-opacity-15`}>
            <Icon className={`w-5 h-5 ${color.includes('text-') ? color : color.replace('bg-', 'text-')}`} />
          </div>
          {subtext && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {subtext}
            </span>
          )}
        </div>
        <h3 className={`text-sm font-medium mb-1 ${gradient ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{title}</h3>
        <p className={`text-2xl font-bold ${gradient ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      </div>
    </motion.div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        <span className="text-gray-900 dark:text-white font-bold">{value} <span className="text-gray-400 font-normal">({percentage}%)</span></span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`} 
        />
      </div>
    </div>
  );
}

function GameCard({
  game,
  isExpanded,
  onToggle,
}: {
  game: GameHistory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const playerIsWhite = game.playAs === "white";
  const resultText =
    game.result === "1-0"
      ? playerIsWhite ? "Win" : "Loss"
      : game.result === "0-1"
        ? playerIsWhite ? "Loss" : "Win"
        : "Draw";

  const resultColor =
    resultText === "Win" ? "text-green-500" : resultText === "Loss" ? "text-red-500" : "text-yellow-500";
  const resultBg =
    resultText === "Win" ? "bg-green-500/10" : resultText === "Loss" ? "bg-red-500/10" : "bg-yellow-500/10";
  const borderColor = 
    resultText === "Win" ? "border-l-4 border-l-green-500" : resultText === "Loss" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-yellow-500";

  const copyPgn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(game.pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [game.pgn]);

  const downloadPgn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([game.pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chessflow_${game.date.replace(/\./g, "-")}_${game._id.slice(-6)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [game]);

  const formattedMoves = game.moves.reduce((acc: string[], move, idx) => {
    if (idx % 2 === 0) {
      acc.push(`${Math.floor(idx / 2) + 1}. ${move}`);
    } else {
      acc[acc.length - 1] += ` ${move}`;
    }
    return acc;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all ${borderColor}`}
    >
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${resultBg} ${resultColor} w-16 text-center`}>
              {resultText}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${game.white === 'Stockfish' ? 'bg-gray-400' : 'bg-teal-500'}`}></div>
                <span className={`font-medium ${playerIsWhite ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                  {game.white} <span className="text-xs text-gray-400">({game.whiteElo})</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${game.black === 'Stockfish' ? 'bg-gray-400' : 'bg-teal-500'}`}></div>
                <span className={`font-medium ${!playerIsWhite ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                  {game.black} <span className="text-xs text-gray-400">({game.blackElo})</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5" title="Date">
              <Calendar size={14} />
              <span>{game.date}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Duration">
              <Clock size={14} />
              <span>{formatDuration(game.durationMs)}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Moves">
              <Swords size={14} />
              <span>{game.moves.length}</span>
            </div>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Opening</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={game.eco}>{game.eco || "Unknown"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Time Control</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{game.timeControl}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Termination</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{game.termination}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Opponent Level</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{game.opponentLevel || "N/A"}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Move History</h4>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto">
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {formattedMoves.map((m, i) => (
                  <span key={i} className="mr-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded px-1 cursor-pointer transition-colors">
                    {m}
                  </span>
                ))}
                <span className="font-bold text-teal-600 dark:text-teal-400 ml-2">{game.result}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={copyPgn}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? "PGN Copied" : "Copy PGN"}
            </button>
            <button
              onClick={downloadPgn}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors shadow-lg shadow-teal-500/20"
            >
              <Download size={16} />
              Download File
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Profile() {
  const { user } = useAuthStore();
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses' | 'draws'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'games'>('overview');

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch(`${API_URL}/api/history`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        setGames(data.games || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const total = games.length;
    if (total === 0) return null;

    const wins = games.filter(g => {
      const isWhite = g.playAs === "white";
      return (g.result === "1-0" && isWhite) || (g.result === "0-1" && !isWhite);
    }).length;

    const losses = games.filter(g => {
      const isWhite = g.playAs === "white";
      return (g.result === "0-1" && isWhite) || (g.result === "1-0" && !isWhite);
    }).length;

    const draws = games.filter(g => g.result === "1/2-1/2").length;

    const whiteGames = games.filter(g => g.playAs === "white");
    const whiteWins = whiteGames.filter(g => g.result === "1-0").length;
    const whiteWinRate = whiteGames.length ? Math.round((whiteWins / whiteGames.length) * 100) : 0;

    const blackGames = games.filter(g => g.playAs === "black");
    const blackWins = blackGames.filter(g => g.result === "0-1").length;
    const blackWinRate = blackGames.length ? Math.round((blackWins / blackGames.length) * 100) : 0;

    const avgMoves = Math.round(games.reduce((acc, g) => acc + g.moves.length, 0) / total);
    
    const openings: Record<string, number> = {};
    games.forEach(g => { if(g.eco) openings[g.eco] = (openings[g.eco] || 0) + 1; });
    const favOpening = Object.entries(openings).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    let currentStreak = 0;
    let maxStreak = 0;
    const sortedGames = [...games].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const g of sortedGames) {
      const isWhite = g.playAs === "white";
      const isWin = (g.result === "1-0" && isWhite) || (g.result === "0-1" && !isWhite);
      if (isWin) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        break;
      }
    }

    const gamesWithDuration = games.filter(g => g.durationMs);
    const avgDuration = gamesWithDuration.length 
      ? Math.round(gamesWithDuration.reduce((acc, g) => acc + (g.durationMs || 0), 0) / gamesWithDuration.length)
      : 0;

    const winRate = Math.round((wins / total) * 100);

    return { total, wins, losses, draws, whiteWinRate, blackWinRate, avgMoves, favOpening, currentStreak, maxStreak, avgDuration, winRate };
  }, [games]);

  const filteredGames = games.filter(g => {
    if (filter === 'all') return true;
    const isWhite = g.playAs === "white";
    if (filter === 'wins') return (g.result === "1-0" && isWhite) || (g.result === "0-1" && !isWhite);
    if (filter === 'losses') return (g.result === "0-1" && isWhite) || (g.result === "1-0" && !isWhite);
    if (filter === 'draws') return g.result === "1/2-1/2";
    return true;
  });

  // Calculate member since from first game or show "New Player"
  const memberSince = games.length > 0
    ? new Date(games[games.length - 1]?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'New Player';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Profile Header */}
      <div className="relative">
        {/* Cover Background */}
        <div className="h-48 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6bS0xMiAwYzAtMiAyLTQgMi00czIgMiAyIDQtMiA0LTIgNC0yLTItMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        </div>

        {/* Profile Card */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="relative -mt-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 lg:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-900">
                    <span className="text-white font-bold text-4xl">
                      {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
                    </span>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                        {user?.fullName || "Chess Player"}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} />
                          {user?.email || "email@example.com"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          Member since {memberSince}
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats Badges */}
                    {stats && (
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl">
                          <Trophy size={18} />
                          <span className="font-bold">{stats.winRate}%</span>
                          <span className="text-sm opacity-75">Win Rate</span>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-xl">
                          <Flame size={18} />
                          <span className="font-bold">{stats.currentStreak}</span>
                          <span className="text-sm opacity-75">Streak</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl">
                          <Crown size={18} />
                          <span className="font-bold">{stats.total}</span>
                          <span className="text-sm opacity-75">Games</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'overview'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 size={16} />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('games')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'games'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <History size={16} />
                    Game History
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {activeTab === 'overview' && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stats Grid */}
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

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Win/Loss Distribution */}
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
                <ProgressBar label="Wins" value={stats.wins} total={stats.total} color="bg-gradient-to-r from-green-500 to-emerald-500" />
                <ProgressBar label="Losses" value={stats.losses} total={stats.total} color="bg-gradient-to-r from-red-500 to-rose-500" />
                <ProgressBar label="Draws" value={stats.draws} total={stats.total} color="bg-gradient-to-r from-yellow-500 to-amber-500" />
              </motion.div>

              {/* Color Performance */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Activity size={20} className="text-yellow-500" />
                  Performance by Color
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>
                        Playing White
                      </span>
                      <span className="text-sm font-bold">{stats.whiteWinRate}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.whiteWinRate}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full" 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-800 border border-gray-600"></div>
                        Playing Black
                      </span>
                      <span className="text-sm font-bold">{stats.blackWinRate}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.blackWinRate}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-gray-700 to-gray-800 rounded-full" 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Target size={20} className="text-blue-500" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Favorite Opening</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.favOpening}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Game Duration</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDuration(stats.avgDuration)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Best Win Streak</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.maxStreak} games 🏆</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Games Preview */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <History size={20} className="text-teal-500" />
                  Recent Games
                </h3>
                <button 
                  onClick={() => setActiveTab('games')}
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
                    onToggle={() => setExpandedId(expandedId === game._id ? null : game._id)}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'overview' && !stats && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <Trophy size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No games yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Play your first game to start tracking your progress!</p>
            <a 
              href="/play" 
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-teal-500/25"
            >
              <Swords size={18} />
              Play Now
            </a>
          </div>
        )}

        {activeTab === 'games' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History size={24} className="text-teal-500" />
                All Games ({filteredGames.length})
              </h2>
              
              <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                {(['all', 'wins', 'losses', 'draws'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f 
                        ? 'bg-teal-500 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-3">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <GameCard
                    key={game._id}
                    game={game}
                    isExpanded={expandedId === game._id}
                    onToggle={() => setExpandedId(expandedId === game._id ? null : game._id)}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <Trophy size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No games found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try changing your filters or play a new game.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
