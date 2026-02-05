import { useMemo } from "react";
import { MoveQualityInfo } from "../../utils/moveQuality";
import { MoveRow, MoveQuality, QualityCounts } from "../useGameReplayTypes";
import { calculateMoveScore, calculatePositionWeight } from "./utils";
import { AccuracyResult, QualityCountsResult } from "./types";

/**
 * Hook to add quality labels to move rows
 */
export function useMoveRowsWithQuality(
  moveRows: MoveRow[],
  moveQualities: MoveQualityInfo[],
): MoveRow[] {
  return useMemo<MoveRow[]>(() => {
    if (moveQualities.length === 0) return moveRows;

    const lookup = new Map<number, MoveQuality>();
    moveQualities.forEach((q) => lookup.set(q.ply, q.label));

    return moveRows.map((row) => ({
      ...row,
      whiteQuality: lookup.get(row.plyWhite),
      blackQuality: row.plyBlack ? lookup.get(row.plyBlack) : undefined,
    }));
  }, [moveRows, moveQualities]);
}

/**
 * Hook to count move qualities for each side
 */
export function useQualityCounts(
  moveQualities: MoveQualityInfo[],
): QualityCountsResult {
  return useMemo(() => {
    const initCounts = (): QualityCounts =>
      ({
        Best: 0,
        Excellent: 0,
        Good: 0,
        Book: 0,
        Inaccuracy: 0,
        Mistake: 0,
        Miss: 0,
        Blunder: 0,
        Great: 0,
        Brilliant: 0,
        Unknown: 0,
      }) as QualityCounts;

    const white = initCounts();
    const black = initCounts();

    moveQualities.forEach((q) => {
      const bucket = q.mover === "w" ? white : black;
      bucket[q.label] = (bucket[q.label] || 0) + 1;
    });

    return { white, black };
  }, [moveQualities]);
}

/**
 * Hook to calculate accuracy percentage for each side
 */
export function useAccuracy(moveQualities: MoveQualityInfo[]): AccuracyResult {
  return useMemo(() => {
    const calc = (mover: "w" | "b") => {
      // Exclude Book moves from accuracy calculation
      const subset = moveQualities.filter(
        (q) => q.mover === mover && q.label !== "Book",
      );
      if (subset.length === 0) return null;

      let totalWeight = 0;
      let weightedScore = 0;

      subset.forEach((q) => {
        const positionWeight = calculatePositionWeight(q.epBefore);
        const moveScore = calculateMoveScore(q.epLoss);

        totalWeight += positionWeight;
        weightedScore += moveScore * positionWeight;
      });

      const score = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
      return Number(Math.max(0, Math.min(100, score)).toFixed(1));
    };

    return { white: calc("w"), black: calc("b") };
  }, [moveQualities]);
}
