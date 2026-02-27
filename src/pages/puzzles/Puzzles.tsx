import { useEffect, useMemo, useState } from "react";
import { Puzzle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { parseApiError } from "../../utils/apiError";
import {
  API_URL,
  detectPuzzleCollection,
  getMateBucket,
  MateBucket,
  puzzleMatchesMotif,
  puzzleMatchesQuery,
  PuzzleCollection,
  PuzzleItem,
  PuzzleUserStats,
} from "./types";
import { PuzzleStatsCards } from "./PuzzleStatsCards";
import { DailyPuzzleCard } from "./DailyPuzzleSection";
import { PuzzlesGrid } from "./PuzzlesGrid";
import { PuzzleBrowseFilters } from "./PuzzleBrowseFilters";

export default function Puzzles() {
  const { t } = useTranslation();
  const tr = (value: string) => t(value, { defaultValue: value });
  const { user } = useAuthStore();
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<PuzzleUserStats | null>(null);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<PuzzleCollection>("all");
  const [mateBucket, setMateBucket] = useState<MateBucket>("all");
  const [motif, setMotif] = useState("All");

  useEffect(() => {
    const fetchPuzzles = async () => {
      try {
        const res = await fetch(`${API_URL}/api/puzzles`, {
          credentials: "include",
        });
        if (!res.ok) {
          const parsed = await parseApiError(res, "Failed to fetch puzzles");
          throw new Error(parsed.message);
        }
        const data = await res.json();
        setPuzzles(data);
      } catch (err) {
        console.error("Failed to fetch puzzles:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPuzzles();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/puzzles/me/stats`, {
          credentials: "include",
        });
        if (!res.ok) {
          const parsed = await parseApiError(
            res,
            "Failed to fetch puzzle stats",
          );
          throw new Error(parsed.message);
        }
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch puzzle stats:", error);
        setStats({
          rating: user?.puzzleElo ?? 1200,
          bestRating: user?.puzzleBestElo ?? user?.puzzleElo ?? 1200,
          attempts: user?.puzzleAttempts ?? 0,
          solved: user?.puzzleSolved ?? 0,
          failed: user?.puzzleFailed ?? 0,
          skipped: user?.puzzleSkipped ?? 0,
          solvedToday: 0,
          streak: 0,
          provisional: (user?.puzzleAttempts ?? 0) < 20,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    void fetchStats();
  }, [
    user?.puzzleAttempts,
    user?.puzzleBestElo,
    user?.puzzleElo,
    user?.puzzleFailed,
    user?.puzzleSkipped,
    user?.puzzleSolved,
  ]);

  const filteredPuzzles = useMemo(() => {
    let result = [...puzzles];

    if (collection !== "all") {
      result = result.filter((puzzle) => {
        const detected = detectPuzzleCollection(puzzle);
        return detected === collection;
      });
    }

    if (collection === "mate" && mateBucket !== "all") {
      result = result.filter((puzzle) => getMateBucket(puzzle) === mateBucket);
    }

    if ((collection === "tactics" || collection === "endgame") && motif !== "All") {
      result = result.filter((puzzle) => puzzleMatchesMotif(puzzle, motif));
    }

    result = result.filter((puzzle) => puzzleMatchesQuery(puzzle, query));
    result.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
    return result;
  }, [collection, mateBucket, motif, puzzles, query]);

  const activeLabel = useMemo(() => {
    if (collection === "all") return "All Puzzles";
    if (collection === "mate") {
      return mateBucket === "all" ? tr("Mate") : `${tr("Mate in")} ${mateBucket}`;
    }
    if ((collection === "tactics" || collection === "endgame") && motif !== "All") {
      return `${collection === "tactics" ? tr("Tactics") : tr("Endgame")} • ${motif}`;
    }
    if (collection === "openings") return tr("Openings");
    return tr("Filtered");
  }, [collection, mateBucket, motif, tr]);

  return (
    <div className="space-y-8">
      {}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-teal-500 dark:text-teal-400" />
            {tr("Puzzles")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {tr("Train by motif and track your puzzle strength.")}
          </p>
        </div>

        <PuzzleStatsCards stats={stats} loading={statsLoading} />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {}
        <DailyPuzzleCard />

        {}
        <PuzzleBrowseFilters
          query={query}
          onQueryChange={setQuery}
          collection={collection}
          onCollectionChange={(nextCollection) => {
            setCollection(nextCollection);
            setMateBucket("all");
            setMotif("All");
          }}
          mateBucket={mateBucket}
          onMateBucketChange={setMateBucket}
          motif={motif}
          onMotifChange={setMotif}
        />
      </div>

      {}
      <PuzzlesGrid
        puzzles={filteredPuzzles}
        loading={loading}
        totalCount={puzzles.length}
        activeLabel={activeLabel}
      />
    </div>
  );
}
