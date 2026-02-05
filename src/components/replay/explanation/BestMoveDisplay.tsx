import { Target } from "lucide-react";
import { BestMoveInfo } from "./types";

interface BestMoveDisplayProps {
  bestMoveInfo: BestMoveInfo;
}

export function BestMoveDisplay({ bestMoveInfo }: BestMoveDisplayProps) {
  return (
    <div className="mb-3 p-2.5 rounded-md bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-green-500 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Best move:{" "}
          </span>
          <span
            className={`font-mono font-semibold ${
              bestMoveInfo.wasPlayed
                ? "text-green-600 dark:text-green-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {bestMoveInfo.san}
          </span>
          {bestMoveInfo.wasPlayed && (
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
              ✓ You played this!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
