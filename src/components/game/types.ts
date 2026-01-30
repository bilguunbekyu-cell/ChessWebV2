import { BotPersonality } from "../../data/botPersonalities";

export interface GameSettings {
  timeControl: { initial: number; increment: number };
  playAs: "white" | "black";
  difficulty: number;
  selectedBot?: BotPersonality;
}
