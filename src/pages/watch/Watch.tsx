import { useState } from "react";
import { Search, Filter } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { FeaturedMatch } from "./FeaturedMatch";
import { LiveGamesGrid } from "./LiveGamesGrid";
import { StreamersSection } from "./StreamersSection";

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
        <FeaturedMatch />

        {/* Live Games Grid */}
        <LiveGamesGrid activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Streamers Section */}
        <StreamersSection />
      </main>
    </div>
  );
}
