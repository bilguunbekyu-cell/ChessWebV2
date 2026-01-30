import { useMemo } from "react";
import { Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MoveQualityInfo } from "../../utils/moveQuality";
import {
  generateMoveExplanation,
  getQualityColor,
  getQualityBgColor,
} from "../../utils/moveExplanations";
import { AnalysisEntry } from "../../hooks/useGameReplayTypes";

interface MoveExplanationPanelProps {
  currentPly: number;
  currentMoveSan: string;
  moveQualities: MoveQualityInfo[];
  analysisByPly: Map<number, AnalysisEntry>;
}

export function MoveExplanationPanel({
  currentPly,
  currentMoveSan,
  moveQualities,
  analysisByPly,
}: MoveExplanationPanelProps) {
  const explanation = useMemo(() => {
    if (currentPly === 0) {
      return {
        title: "Starting Position",
        description: "The game begins from the standard starting position.",
        details: "Select a move to see its analysis and explanation.",
        evalChange: "—",
      };
    }

    const qualityInfo = moveQualities.find((q) => q.ply === currentPly);
    const before = analysisByPly.get(currentPly - 1);
    const after = analysisByPly.get(currentPly);

    return generateMoveExplanation(
      qualityInfo,
      currentMoveSan,
      before?.cp,
      after?.cp,
    );
  }, [currentPly, currentMoveSan, moveQualities, analysisByPly]);

  const qualityInfo = moveQualities.find((q) => q.ply === currentPly);
  const evalTrend = useMemo(() => {
    if (!qualityInfo) return "neutral";
    if (qualityInfo.epGain > 0.05) return "up";
    if (qualityInfo.epLoss > 0.05) return "down";
    return "neutral";
  }, [qualityInfo]);

  if (currentPly === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Move Explanation
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click on any move in the move list to see why it's good or bad.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        qualityInfo
          ? getQualityBgColor(qualityInfo.label)
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
            {currentMoveSan}
          </span>
          {qualityInfo && (
            <span
              className={`text-sm font-semibold ${getQualityColor(qualityInfo.label)}`}
            >
              {qualityInfo.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {evalTrend === "up" && (
            <TrendingUp className="w-4 h-4 text-green-500" />
          )}
          {evalTrend === "down" && (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          {evalTrend === "neutral" && (
            <Minus className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {explanation.evalChange}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        {explanation.title}
      </h4>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
        {explanation.description}
      </p>

      {/* Details */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {explanation.details}
      </p>

      {/* Suggestion (for mistakes/blunders) */}
      {explanation.suggestion && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Tip:{" "}
              </span>
              {explanation.suggestion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
