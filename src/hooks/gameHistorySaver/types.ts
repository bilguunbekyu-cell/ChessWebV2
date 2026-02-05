import { Chess } from "chess.js";
import { GameSettings } from "../../components/game";
import { GameHistoryPayload } from "../useStockfishGameTypes";

export interface GameHistorySaverParams {
  gameOver: boolean;
  gameResult: string | null;
  gameSettings: GameSettings;
  gameRef: React.MutableRefObject<Chess>;
  game: Chess;
  startTimeRef: React.MutableRefObject<number | null>;
  historySavedRef: React.MutableRefObject<boolean>;
  saveGameHistory: (payload: GameHistoryPayload) => Promise<string | null>;
  setSavedGameId: (id: string | null) => void;
}

export interface TerminationInfo {
  reason: string;
  winner: string | null;
  text: string;
  pgnResult: string;
}

export interface PlayerInfo {
  whiteName: string;
  blackName: string;
  whiteElo: number;
  blackElo: number;
  botName: string;
}
