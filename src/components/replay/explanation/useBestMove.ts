import { useMemo } from "react";
import { AnalysisEntry } from "../../../hooks/useGameReplayTypes";
import { uciToSan } from "./utils";
import { BestMoveInfo } from "./types";

interface UseBestMoveParams {
  currentPly: number;
  currentMoveSan: string;
  analysisByPly: Map<number, AnalysisEntry>;
  positions: string[];
}

export function useBestMove({
  currentPly,
  currentMoveSan,
  analysisByPly,
  positions,
}: UseBestMoveParams): BestMoveInfo | null {
  return useMemo(() => {
    if (currentPly === 0) return null;

    const beforeAnalysis = analysisByPly.get(currentPly - 1);
    if (!beforeAnalysis?.bestMove) return null;

    const fenBefore = positions[currentPly - 1];
    if (!fenBefore) return null;

    const bestMoveSan = uciToSan(fenBefore, beforeAnalysis.bestMove);
    const wasPlayed = bestMoveSan === currentMoveSan;

    return { san: bestMoveSan, wasPlayed };
  }, [currentPly, analysisByPly, positions, currentMoveSan]);
}
