import { MoveQuality as MoveQualityInternal } from "../utils/moveQuality";

export type AnalysisEntry = {
  ply: number;
  cp?: number;
  mate?: number;
  bestMove?: string; // UCI format e.g. "e2e4"
};

export type PlyState = {
  fen: string;
  moveSAN?: string;
  from?: string;
  to?: string;
  color?: "w" | "b";
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  captured?: string;
};

export type MoveQuality = MoveQualityInternal;

export type MoveRow = {
  moveNumber: number;
  white?: string;
  black?: string;
  plyWhite: number;
  plyBlack?: number;
  timeWhite?: number;
  timeBlack?: number;
  whiteQuality?: MoveQuality;
  blackQuality?: MoveQuality;
};

export type QualityCounts = Record<MoveQuality, number>;

export type CaptureTimeline = {
  white: string[][];
  black: string[][];
};

export type PositionData = {
  positions: string[];
  plies: PlyState[];
  moveRows: MoveRow[];
  totalPlies: number;
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
