import { Square } from "chess.js";
import { GameSettings } from "../components/game";
import type { CSSProperties } from "react";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface GameHistoryPayload {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: string;
  black: string;
  result: string;
  currentPosition?: string;
  timeControl?: string;
  utcDate?: string;
  utcTime?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  whiteElo?: number;
  blackElo?: number;
  eco?: string;
  ecoUrl?: string;
  timezone?: string;
  link?: string;
  whiteUrl?: string;
  whiteCountry?: string;
  whiteTitle?: string;
  blackUrl?: string;
  blackCountry?: string;
  blackTitle?: string;
  termination?: string;
  moves: string[];
  moveText?: string;
  pgn?: string;
  playAs: "white" | "black";
  opponent?: string;
  opponentLevel?: number;
  durationMs?: number;
}

export type OptionSquares = Record<string, CSSProperties>;

export interface StockfishGameState {
  gameStarted: boolean;
  showSetupModal: boolean;
  showGameOverModal: boolean;
  gameResult: string | null;
  gameOver: boolean;
  playerTime: number;
  opponentTime: number;
  moveFrom: Square | null;
  optionSquares: OptionSquares;
  moves: string[];
}

export const defaultGameSettings: GameSettings = {
  timeControl: { initial: 300, increment: 0 },
  playAs: "white",
  difficulty: 3,
};
