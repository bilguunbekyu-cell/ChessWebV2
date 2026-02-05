import { useState, useEffect, useMemo } from "react";
import { MoveQualityInfo } from "../../../utils/moveQuality";
import { AnalysisEntry } from "../../../hooks/useGameReplayTypes";
import { useSettingsStore } from "../../../store/settingsStore";
import {
  getAiBatchExplanations,
  isGroqConfigured,
} from "../../../utils/groqApi";
import { preparedTexts, AI_EXPLAINABLE_TYPES } from "./constants";
import { uciToSan, pickRandom } from "./utils";

interface UseAiExplanationsParams {
  moveQualities: MoveQualityInfo[];
  analysisByPly: Map<number, AnalysisEntry>;
  positions: string[];
  sanMoves: string[];
}

export function useAiExplanations({
  moveQualities,
  analysisByPly,
  positions,
  sanMoves,
}: UseAiExplanationsParams) {
  const { enableAiExplanations } = useSettingsStore();
  const [explanationsByPly, setExplanationsByPly] = useState<
    Map<number, string>
  >(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasRequestedBatch, setHasRequestedBatch] = useState(false);

  // Build SAN by ply map
  const sanByPly = useMemo(() => {
    const map = new Map<number, string>();
    sanMoves.forEach((san, idx) => {
      map.set(idx + 1, san);
    });
    return map;
  }, [sanMoves]);

  // Build prepared texts immediately so we always have something short
  useEffect(() => {
    const preset = new Map<number, string>();
    moveQualities.forEach((mq) => {
      const pool = preparedTexts[mq.label] || preparedTexts.Inaccuracy;
      const pick = pickRandom(pool);
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
      .filter((mq) => AI_EXPLAINABLE_TYPES.includes(mq.label))
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

  return {
    explanationsByPly,
    aiLoading,
    aiError,
    enableAiExplanations,
    isAiConfigured: isGroqConfigured(),
  };
}
