import { useMemo } from "react";
import {
  MoveQualityInfo,
  classifyByExpectedPointsLoss,
  evalToExpectedPoints,
  maybeMarkGreatMove,
  maybeMarkBook,
  maybeMarkMiss,
  maybeMarkBrilliant,
} from "../../utils/moveQuality";
import { AnalysisEntry, MoveRow, MoveQuality } from "../useGameReplayTypes";
import { isSameMoveAsBest } from "./utils";

/**
 * Hook to classify move quality based on analysis
 */
export function useQualityClassification(
  analysisByPly: Map<number, AnalysisEntry>,
  positions: string[],
  moveRows: MoveRow[],
  totalPlies: number,
): MoveQualityInfo[] {
  return useMemo<MoveQualityInfo[]>(() => {
    if (totalPlies === 0) return [];

    const list: MoveQualityInfo[] = [];
    const prevLabels = new Map<number, MoveQuality>();
    const sanByPly = new Map<number, string>();

    moveRows.forEach((row) => {
      if (row.white) sanByPly.set(row.plyWhite, row.white);
      if (row.black && row.plyBlack) sanByPly.set(row.plyBlack, row.black);
    });

    for (let i = 1; i <= totalPlies; i++) {
      const mover: "w" | "b" = i % 2 === 1 ? "w" : "b";
      const before = analysisByPly.get(i - 1);
      const after = analysisByPly.get(i);
      const san = sanByPly.get(i);

      // Special case: last move ends the game (mate/stalemate) — always "Best"
      const isLastMove = i === totalPlies;
      const gameEndedAfterMove = !after || after?.mate === 0;
      if (isLastMove && gameEndedAfterMove) {
        const epBefore = before
          ? evalToExpectedPoints(before.cp, before.mate, mover)
          : 0.5;
        list.push({
          ply: i,
          mover,
          label: "Best",
          epBefore,
          epAfter: 1.0,
          epLoss: 0,
          epGain: Math.max(0, 1 - epBefore),
        });
        continue;
      }

      if (!after) continue;

      const epBefore = evalToExpectedPoints(before?.cp, before?.mate, mover);
      const epAfter = evalToExpectedPoints(after.cp, after.mate, mover);
      const epLoss = Math.max(0, epBefore - epAfter);
      const epGain = Math.max(0, epAfter - epBefore);

      const beforeAnalysis = analysisByPly.get(i - 1);
      const playedBestMove =
        beforeAnalysis?.bestMove && san
          ? isSameMoveAsBest(positions[i - 1], beforeAnalysis.bestMove, san)
          : false;

      let label = classifyByExpectedPointsLoss(epLoss, playedBestMove);
      label = maybeMarkGreatMove(label, epGain, epBefore, epAfter);
      label = maybeMarkBook(label, i, after.cp);
      label = maybeMarkMiss(
        label,
        prevLabels.get(i - 1),
        epGain,
        playedBestMove,
      );
      label = maybeMarkBrilliant(label, epGain, epAfter, san);

      prevLabels.set(i, label);

      list.push({
        ply: i,
        mover,
        label,
        epBefore,
        epAfter,
        epLoss,
        epGain,
      });
    }

    return list;
  }, [analysisByPly, totalPlies, moveRows, positions]);
}
