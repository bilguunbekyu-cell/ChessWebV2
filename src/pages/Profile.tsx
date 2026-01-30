import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../store/authStore";
import { GameHistory } from "../historyTypes";
import {
  ProfileHeader,
  OverviewTabContent,
  GamesTabContent,
  NoGamesPlaceholder,
  API_URL,
  calculateStats,
  filterGames,
  type FilterType,
  type TabType,
} from "../components/profilePage";

export default function Profile() {
  const { user } = useAuthStore();
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch(`${API_URL}/api/history`, {
          credentials: "include",
        });
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

  const stats = useMemo(() => calculateStats(games), [games]);
  const filteredGames = useMemo(
    () => filterGames(games, filter),
    [games, filter],
  );

  const memberSince =
    games.length > 0
      ? new Date(games[games.length - 1]?.createdAt).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" },
        )
      : "New Player";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      <ProfileHeader
        user={user}
        stats={stats}
        memberSince={memberSince}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {stats ? (
          activeTab === "overview" ? (
            <OverviewTabContent
              stats={stats}
              games={games}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              setActiveTab={setActiveTab}
            />
          ) : (
            <GamesTabContent
              filteredGames={filteredGames}
              filter={filter}
              setFilter={setFilter}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
            />
          )
        ) : (
          <NoGamesPlaceholder />
        )}
      </div>
    </div>
  );
}
