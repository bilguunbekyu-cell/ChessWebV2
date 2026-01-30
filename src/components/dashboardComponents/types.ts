import { TimeFormat } from "../data/mockData";

export interface DashboardProps {
  currentFormat: TimeFormat | null;
  setCurrentFormat: (format: TimeFormat) => void;
}

export const difficultyBadge = (diff: string) => {
  switch (diff) {
    case "Easy":
      return "bg-green-900/30 text-green-400 border border-green-800";
    case "Medium":
      return "bg-amber-900/30 text-amber-400 border border-amber-800";
    case "Hard":
      return "bg-red-900/30 text-red-400 border border-red-800";
    default:
      return "bg-gray-800 text-gray-400";
  }
};
