export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface PuzzleItem {
  _id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string[];
  description: string;
  icon: string;
  fen: string;
  solution: string[];
  rating: number;
  isWhiteToMove: boolean;
}

export type PuzzleStatus = "solving" | "correct" | "wrong" | "showingSolution";

export const SIDEBAR_WIDTH = 256;
export const PANEL_MIN_WIDTH = 360;
export const BOARD_GUTTER = 48;
