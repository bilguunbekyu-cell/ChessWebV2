export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface PuzzleItem {
  _id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string[];
  description: string;
  icon: string;
  fen: string;
  solution: string[];
  rating: number;
  isWhiteToMove: boolean;
  timesPlayed: number;
  timesSolved: number;
}

export function getDifficultyColor(diff: string): string {
  switch (diff) {
    case "Easy":
      return "text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800";
    case "Medium":
      return "text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800";
    case "Hard":
      return "text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800";
    default:
      return "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
  }
}
