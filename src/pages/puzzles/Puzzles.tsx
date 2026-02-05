import { useEffect, useState } from "react";
import { Puzzle } from "lucide-react";
import { PuzzleItem, API_URL } from "./types";
import { PuzzleStatsCards } from "./PuzzleStatsCards";
import { DailyPuzzleCard, TrainingThemes } from "./DailyPuzzleSection";
import { PuzzlesGrid } from "./PuzzlesGrid";

export default function Puzzles() {
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/puzzles`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPuzzles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch puzzles:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-teal-500 dark:text-teal-400" />
            Puzzles
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sharpen your tactical skills
          </p>
        </div>

        <PuzzleStatsCards />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Puzzle (Left 2 cols) */}
        <DailyPuzzleCard />

        {/* Puzzle Themes / Categories (Right col) */}
        <TrainingThemes />
      </div>

      {/* Recommended Puzzles Grid */}
      <PuzzlesGrid puzzles={puzzles} loading={loading} />
    </div>
  );
}
