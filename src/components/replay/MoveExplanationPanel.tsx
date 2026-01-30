import { useMemo, useState, useEffect } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Chess } from "chess.js";
import { MoveQualityInfo } from "../../utils/moveQuality";
import {
  generateMoveExplanation,
  getQualityColor,
  getQualityBgColor,
} from "../../utils/moveExplanations";
import { AnalysisEntry } from "../../hooks/useGameReplayTypes";
import { useSettingsStore } from "../../store/settingsStore";
import { getAiMoveExplanation } from "../../utils/groqApi";

interface MoveExplanationPanelProps {
  currentPly: number;
  currentMoveSan: string;
  moveQualities: MoveQualityInfo[];
  analysisByPly: Map<number, AnalysisEntry>;
  positions: string[]; // FEN positions to convert UCI to SAN
}

export function MoveExplanationPanel({
  currentPly,
  currentMoveSan,
  moveQualities,
  analysisByPly,
  positions,
}: MoveExplanationPanelProps) {
  // Convert UCI move to SAN using chess.js
  const uciToSan = (fen: string, uci: string): string => {
    try {
      const chess = new Chess(fen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const move = chess.move({ from, to, promotion });
      return move?.san || uci;
    } catch {
      return uci;
    }
  };

  // Get best move for current position (before the move was made)
  const bestMoveInfo = useMemo(() => {
    if (currentPly === 0) return null;

    // Best move is what engine recommended BEFORE this move
    const beforeAnalysis = analysisByPly.get(currentPly - 1);
    if (!beforeAnalysis?.bestMove) return null;

    const fenBefore = positions[currentPly - 1];
    if (!fenBefore) return null;

    const bestMoveSan = uciToSan(fenBefore, beforeAnalysis.bestMove);
    const wasPlayed = bestMoveSan === currentMoveSan;

    return { san: bestMoveSan, wasPlayed };
  }, [currentPly, analysisByPly, positions, currentMoveSan]);

  // AI explanation state
  const { groqApiKey, enableAiExplanations } = useSettingsStore();
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch AI explanation when ply changes
  useEffect(() => {
    if (!enableAiExplanations || !groqApiKey || currentPly === 0) {
      setAiExplanation(null);
      return;
    }

    const qualityInfo = moveQualities.find((q) => q.ply === currentPly);
    const fenBefore = positions[currentPly - 1];

    if (!fenBefore) return;

    // Get best move SAN
    const beforeAnalysis = analysisByPly.get(currentPly - 1);
    let bestMoveSan: string | undefined;
    if (beforeAnalysis?.bestMove) {
      bestMoveSan = uciToSan(fenBefore, beforeAnalysis.bestMove);
    }

    const moveNumber = Math.ceil(currentPly / 2);

    setAiLoading(true);
    setAiError(null);

    getAiMoveExplanation(
      groqApiKey,
      fenBefore,
      currentMoveSan,
      bestMoveSan,
      qualityInfo,
      moveNumber,
    )
      .then((explanation) => {
        setAiExplanation(explanation);
      })
      .catch((err) => {
        setAiError(err.message || "Failed to get AI explanation");
        setAiExplanation(null);
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [
    currentPly,
    enableAiExplanations,
    groqApiKey,
    positions,
    currentMoveSan,
    moveQualities,
    analysisByPly,
  ]);

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
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        {explanation.title}
        {enableAiExplanations && groqApiKey && (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-purple-500">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}
      </h4>

      {/* AI Explanation or Template Description */}
      {aiLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Getting AI explanation...</span>
        </div>
      ) : aiExplanation ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
          {aiExplanation}
        </p>
      ) : (
        <>
          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {explanation.description}
          </p>

          {/* Details */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {explanation.details}
          </p>
        </>
      )}

      {/* AI Error */}
      {aiError && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-2">{aiError}</p>
      )}

      {/* Best Move */}
      {bestMoveInfo && (
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
      )}

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
