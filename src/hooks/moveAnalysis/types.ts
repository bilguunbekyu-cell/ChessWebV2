import { MoveQuality, AnalysisEntry } from "../useGameReplayTypes";

export interface AccuracyResult {
  white: number | null;
  black: number | null;
}

export interface QualityCountsResult {
  white: Record<MoveQuality, number>;
  black: Record<MoveQuality, number>;
}

export interface AnalysisState {
  analysis: AnalysisEntry[];
  isAnalyzing: boolean;
  analysisProgress: number;
}
