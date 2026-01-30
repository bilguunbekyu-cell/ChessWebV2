import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  Trophy,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

// Mock Data
const LIVE_GAMES = [
  {
    id: 1,
    white: "Magnus Carlsen",
    whiteRating: 2830,
    black: "Hikaru Nakamura",
    blackRating: 2780,
    viewers: "45k",
    time: "10+0",
    type: "Blitz",
  },
  {
    id: 2,
    white: "Alireza Firouzja",
    whiteRating: 2760,
    black: "Fabiano Caruana",
    blackRating: 2790,
    viewers: "32k",
    time: "3+2",
    type: "Blitz",
  },
  {
    id: 3,
    white: "Ding Liren",
    whiteRating: 2780,
    black: "Ian Nepomniachtchi",
    blackRating: 2770,
    viewers: "28k",
    time: "90+30",
    type: "Classical",
  },
  {
    id: 4,
    white: "Gukesh D",
    whiteRating: 2750,
    black: "Praggnanandhaa",
    blackRating: 2740,
    viewers: "15k",
    time: "15+10",
    type: "Rapid",
  },
  {
    id: 5,
    white: "Wesley So",
    whiteRating: 2760,
    black: "Levon Aronian",
    blackRating: 2750,
    viewers: "12k",
    time: "3+0",
    type: "Blitz",
  },
  {
    id: 6,
    white: "Anish Giri",
    whiteRating: 2745,
    black: "Maxime Vachier-Lagrave",
    blackRating: 2740,
    viewers: "10k",
    time: "5+0",
    type: "Blitz",
  },
];

const STREAMERS = [
  { name: "Hikaru", viewers: "25k", title: "Road to 3300 Blitz", avatar: "H" },
  { name: "GothamChess", viewers: "18k", title: "Guess the ELO", avatar: "G" },
  {
    name: "BotezLive",
    viewers: "12k",
    title: "Street Chess Hustling",
    avatar: "B",
  },
  { name: "ChessBrah", viewers: "8k", title: "Techno Chess", avatar: "C" },
];

export default function Watch() {
  const [activeTab, setActiveTab] = useState("Top Rated");

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Watch Live
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Follow the best games happening right now
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search players or events..."
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-300 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-teal-500 w-64 transition-colors shadow-sm"
              />
            </div>
            <button className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-sm">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Featured Game */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
              Featured Match
            </h2>
            <span className="text-teal-600 dark:text-teal-500 text-sm font-medium cursor-pointer hover:underline">
              View all tournaments
            </span>
          </div>

          <div className="bg-white dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-teal-500/10 dark:group-hover:bg-teal-500/20"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Player 1 */}
              <div className="flex items-center space-x-4 flex-1 justify-end">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    Magnus Carlsen
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono">
                    2830
                  </div>
                </div>
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-2xl shadow-lg">
                  ♟️
                </div>
              </div>

              {/* VS / Score */}
              <div className="flex flex-col items-center px-8">
                <div className="text-sm font-bold text-teal-600 dark:text-teal-500 tracking-widest mb-2">
                  LIVE
                </div>
                <div className="text-4xl font-black text-gray-900 dark:text-white font-mono flex items-center space-x-4">
                  <span>1</span>
                  <span className="text-gray-400 dark:text-gray-600 text-2xl">
                    -
                  </span>
                  <span>0</span>
                </div>
                <div className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  Blitz 3+2
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-2xl shadow-lg">
                  ♙
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    Hikaru Nakamura
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono">
                    2780
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-teal-900/20 hover:scale-105">
                <Eye className="w-5 h-5" />
                <span>Watch Game</span>
              </button>
            </div>
          </div>
        </section>

        {/* Live Games Grid */}
        <section>
          {/* Tabs */}
          <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800 mb-6">
            {["Top Rated", "Friends", "Tournaments", "Streamers"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LIVE_GAMES.map((game) => (
              <motion.div
                key={game.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span>
                      {game.type} • {game.time}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Eye className="w-3 h-3" />
                    <span>{game.viewers}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs">
                        ♟️
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {game.white}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">
                      {game.whiteRating}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-100 flex items-center justify-center text-xs text-black">
                        ♙
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {game.black}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">
                      {game.blackRating}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900"
                      ></div>
                    ))}
                  </div>
                  <button className="text-teal-600 dark:text-teal-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    Watch <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Streamers Section */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <PlayCircle className="w-5 h-5 text-purple-500 mr-2" />
            Live Streamers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STREAMERS.map((streamer) => (
              <div
                key={streamer.name}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer shadow-sm"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg text-white">
                    {streamer.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white dark:border-gray-900">
                    LIVE
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {streamer.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {streamer.title}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                    {streamer.viewers} watching
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
