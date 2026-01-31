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
import { getAiBatchExplanations, isGroqConfigured } from "../../utils/groqApi";

interface MoveExplanationPanelProps {
  currentPly: number;
  currentMoveSan: string;
  moveQualities: MoveQualityInfo[];
  analysisByPly: Map<number, AnalysisEntry>;
  positions: string[]; // FEN positions to convert UCI to SAN
  sanMoves: string[];
  gameId?: string;
}

export function MoveExplanationPanel({
  currentPly,
  currentMoveSan,
  moveQualities,
  analysisByPly,
  positions,
  sanMoves = [],
  gameId,
}: MoveExplanationPanelProps) {
  // Prepared short phrases for non-AI move types (all <= 60 chars)
  // AI only explains: Blunder, Mistake, Brilliant
  const preparedTexts: Record<string, string[]> = {
    Best: [
      "That's the right idea.",
      "Best move!",
      "Nice eye.",
      "Couldn't be better.",
      "Spot on!",
      "Perfect choice.",
      "Engine approved.",
      "Exactly right.",
      "Top move.",
      "Nailed it.",
      "Sharp play.",
      "Precision.",
      "Textbook.",
      "Flawless.",
      "Crushed it.",
    ],
    Great: [
      "Strong follow-up.",
      "Keeps the squeeze.",
      "Clean play.",
      "Great instincts.",
      "Power move.",
      "Impressive.",
      "Well spotted.",
      "Showing class.",
      "That hurts them.",
      "Dangerous.",
      "Putting pressure on.",
      "Nice technique.",
    ],
    Excellent: [
      "Nearly perfect.",
      "Top-tier choice.",
      "Engine-level find.",
      "Very strong.",
      "Excellent judgment.",
      "High-quality move.",
      "Almost the best.",
      "Impressive accuracy.",
      "Super solid.",
      "Really well played.",
    ],
    Good: [
      "Solid choice.",
      "Keeps things stable.",
      "Safe, steady move.",
      "Reasonable.",
      "Gets the job done.",
      "No complaints.",
      "Practical.",
      "Sensible.",
      "Stays on track.",
      "Fair enough.",
      "Keeps balance.",
    ],
    Inaccuracy: [
      "Small slip; still okay.",
      "Slightly drifts.",
      "Not critical.",
      "Minor wobble.",
      "Could be sharper.",
      "Lets tension slip.",
      "Missed a nuance.",
      "A bit passive.",
      "Room for improvement.",
      "Not the tightest.",
      "Slight misstep.",
    ],
    Book: [
      "Theory move.",
      "Staying in book.",
      "Standard line.",
      "Known territory.",
      "Opening prep.",
      "By the book.",
      "Mainline theory.",
      "Well-trodden path.",
      "Classical approach.",
    ],
    Miss: [
      "Missed the punishing line.",
      "Chance slipped away.",
      "Let them off the hook.",
      "Opportunity missed.",
      "Could've pounced.",
      "They got lucky.",
      "Didn't capitalize.",
      "The knockout was there.",
      "Hesitation cost you.",
    ],
    // Fallback texts for AI-explained moves (shown if AI is disabled or fails)
    Blunder: [
      "A serious error that changes the game.",
      "This move loses significant material or position.",
      "Critical mistake - check the best move above.",
      "Big oversight here.",
      "This hands the advantage to the opponent.",
    ],
    Mistake: [
      "This move weakens your position.",
      "Not the best choice here.",
      "There was a better option available.",
      "This gives up some advantage.",
      "A slip that costs you.",
    ],
    Brilliant: [
      "Exceptional move!",
      "A stroke of genius.",
      "Outstanding tactical vision.",
      "Incredible find!",
      "World-class move.",
    ],
    Unknown: [
      "Move played.",
      "No data available.",
      "Unclassified move.",
      "Analysis pending.",
    ],
  };

  const sanByPly = useMemo(() => {
    const map = new Map<number, string>();
    sanMoves.forEach((san, idx) => {
      map.set(idx + 1, san);
    });
    return map;
  }, [sanMoves]);

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
  const { enableAiExplanations } = useSettingsStore();
  const [explanationsByPly, setExplanationsByPly] = useState<
    Map<number, string>
  >(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasRequestedBatch, setHasRequestedBatch] = useState(false);

  // Build prepared texts immediately so we always have something short
  useEffect(() => {
    const preset = new Map<number, string>();
    moveQualities.forEach((mq) => {
      const pool =
        preparedTexts[mq.label] || preparedTexts.Inaccuracy; /* fallback */
      const pick = pool[Math.floor(Math.random() * pool.length)];
      preset.set(mq.ply, pick);
    });
    setExplanationsByPly(preset);
  }, [moveQualities]);

  // Fetch AI batch once per analysis session (game)
  useEffect(() => {
    if (
      hasRequestedBatch ||
      !enableAiExplanations ||
      !isGroqConfigured() ||
      moveQualities.length === 0
    ) {
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setHasRequestedBatch(true);

    const payload = moveQualities
      .filter((mq) => ["Blunder", "Mistake", "Brilliant"].includes(mq.label))
      .map((mq) => {
        const fenBefore = positions[mq.ply - 1];
        const beforeAnalysis = analysisByPly.get(mq.ply - 1);
        let bestMoveSan: string | undefined;
        if (fenBefore && beforeAnalysis?.bestMove) {
          bestMoveSan = uciToSan(fenBefore, beforeAnalysis.bestMove);
        }
        return {
          ply: mq.ply,
          san: sanByPly.get(mq.ply) || `Move ${mq.ply}`,
          quality: mq.label,
          bestMove: bestMoveSan,
          epLoss: mq.epLoss,
        };
      });

    getAiBatchExplanations(payload)
      .then((result) => {
        setExplanationsByPly((prev) => {
          const next = new Map(prev);
          Object.entries(result).forEach(([ply, text]) => {
            const numericPly = Number(ply);
            const trimmed = text.slice(0, 120);
            next.set(numericPly, trimmed);
          });
          return next;
        });
      })
      .catch((err) => {
        setAiError(err.message || "Failed to get AI explanations");
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [
    enableAiExplanations,
    moveQualities,
    analysisByPly,
    positions,
    sanByPly,
    hasRequestedBatch,
  ]);

  const aiExplanation = explanationsByPly.get(currentPly) || null;

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
        {enableAiExplanations && isGroqConfigured() && (
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
