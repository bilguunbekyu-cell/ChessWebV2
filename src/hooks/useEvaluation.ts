import { useMemo } from "react";
import { AnalysisEntry, clamp } from "./useGameReplayTypes";

export function useEvaluation(analysis: AnalysisEntry[], ply: number) {
  const currentEval = useMemo(() => {
    if (!analysis || analysis.length === 0) return undefined;
    return (
      analysis.find((a: AnalysisEntry) => a.ply === ply) ||
      analysis.find((a: AnalysisEntry) => a.ply === ply - 1)
    );
  }, [analysis, ply]);

  const evalPercent = useMemo(() => {
    if (!currentEval) return 50;
    if (typeof currentEval.mate === "number") {
      return currentEval.mate > 0 ? 100 : 0;
    }
    const cp = currentEval.cp ?? 0;
    const clamped = clamp(cp, -600, 600);
    return Math.round(((clamped + 600) / 1200) * 100);
  }, [currentEval]);

  const evalLabel = useMemo(() => {
    if (!currentEval) return "—";
    if (typeof currentEval.mate === "number") {
      return `M${Math.abs(currentEval.mate)}`;
    }
    return `${((currentEval.cp ?? 0) / 100).toFixed(2)}`;
  }, [currentEval]);

  return {
    currentEval,
    evalPercent,
    evalLabel,
  };
}
