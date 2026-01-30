export interface GameSettings {
  timeControl: { initial: number; increment: number };
  playAs: "white" | "black";
  difficulty: number;
}
