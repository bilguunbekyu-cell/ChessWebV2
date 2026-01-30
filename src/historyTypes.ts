export interface AnalysisEntry {
  ply: number;
  cp?: number;   // centipawn evaluation (positive favors White)
  mate?: number; // mate in N; sign indicates side to move wins
}

export interface GameHistory {
  _id: string;
  event: string;
  site: string;
  date: string; // "YYYY.MM.DD"
  round: string;
  white: string;
  black: string;
  result: string; // "1-0" | "0-1" | "1/2-1/2"
  currentPosition: string;
  timeControl: string;
  utcDate: string;
  utcTime: string;
  startTime: string;
  endDate: string;
  endTime: string;
  whiteElo: number;
  blackElo: number;
  eco: string;
  ecoUrl?: string;
  timezone?: string;
  link?: string;
  whiteUrl?: string;
  whiteCountry?: string;
  whiteTitle?: string;
  blackUrl?: string;
  blackCountry?: string;
  blackTitle?: string;
  moveText?: string;
  termination: string;
  moves: string[];
  pgn: string;
  playAs: "white" | "black";
  opponent: string;
  opponentLevel?: number;
  durationMs?: number;
  createdAt: string;
  analysis?: AnalysisEntry[];
  moveTimes?: number[]; // milliseconds per move or elapsed; interpretation handled in UI
}
