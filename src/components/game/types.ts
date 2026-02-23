import { BotPersonality } from "../../data/botPersonalities";
import type { Square } from "chess.js";

export interface GameSettings {
  timeControl: { initial: number; increment: number };
  playAs: "white" | "black";
  difficulty: number;
  selectedBot?: BotPersonality;
}

export type PromotionPiece = "q" | "r" | "b" | "n";

export interface PromotionState {
  isOpen: boolean;
  from: Square | null;
  to: Square | null;
  color: "w" | "b" | null;
}
