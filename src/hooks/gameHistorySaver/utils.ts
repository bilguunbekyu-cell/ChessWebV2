import { Chess } from "chess.js";
import { GameSettings } from "../../components/game";
import { TerminationInfo, PlayerInfo } from "./types";

export function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function formatTimeControl(tc: {
  initial: number;
  increment: number;
}): string {
  if (tc.initial === 0) return "-";
  return tc.increment > 0 ? `${tc.initial}+${tc.increment}` : `${tc.initial}`;
}

export function getTerminationInfo(
  currentGame: Chess,
  gameResult: string,
  gameSettings: GameSettings,
): TerminationInfo {

  const isCheckmate =
    typeof (currentGame as any).isCheckmate === "function"
      ? (currentGame as any).isCheckmate()
      : currentGame.in_checkmate();
  const isStalemate =
    typeof (currentGame as any).isStalemate === "function"
      ? (currentGame as any).isStalemate()
      : currentGame.in_stalemate();
  const isInsufficient =
    typeof (currentGame as any).isInsufficientMaterial === "function"
      ? (currentGame as any).isInsufficientMaterial()
      : currentGame.insufficient_material();
  const isThreefold =
    typeof (currentGame as any).isThreefoldRepetition === "function"
      ? (currentGame as any).isThreefoldRepetition()
      : currentGame.in_threefold_repetition();

  const reason = isCheckmate
    ? "checkmate"
    : isStalemate
      ? "stalemate"
      : isInsufficient
        ? "insufficient material"
        : isThreefold
          ? "threefold repetition"
          : gameResult.toLowerCase().includes("time")
            ? "time forfeit"
            : gameResult.toLowerCase().includes("resigned")
              ? "resignation"
              : "normal";

  const isPlayerWin =
    gameResult.includes("You Win") ||
    (gameResult.toLowerCase().includes("time") &&
      !gameResult.toLowerCase().includes("stockfish wins"));

  const isStockfishWin =
    gameResult.includes("Stockfish Wins") ||
    gameResult.toLowerCase().includes("resigned") ||
    (gameResult.toLowerCase().includes("time") &&
      gameResult.toLowerCase().includes("stockfish"));

  const winner = isPlayerWin
    ? gameSettings.playAs === "white"
      ? "White"
      : "Black"
    : isStockfishWin
      ? gameSettings.playAs === "white"
        ? "Black"
        : "White"
      : null;

  const text = winner
    ? `${winner} won by ${reason}`
    : `Game drawn by ${reason}`;

  const pgnResult = isPlayerWin
    ? gameSettings.playAs === "white"
      ? "1-0"
      : "0-1"
    : isStockfishWin
      ? gameSettings.playAs === "white"
        ? "0-1"
        : "1-0"
      : "1/2-1/2";

  return { reason, winner, text, pgnResult };
}

export function getPlayerInfo(gameSettings: GameSettings): PlayerInfo {
  const playerName = "Player";
  const botName = gameSettings.selectedBot
    ? `${gameSettings.selectedBot.name} (${gameSettings.selectedBot.rating})`
    : "Stockfish";
  const botElo = gameSettings.selectedBot?.rating || 1500;

  return {
    whiteName: gameSettings.playAs === "white" ? playerName : botName,
    blackName: gameSettings.playAs === "black" ? playerName : botName,
    whiteElo: gameSettings.playAs === "white" ? 1200 : botElo,
    blackElo: gameSettings.playAs === "black" ? 1200 : botElo,
    botName,
  };
}
