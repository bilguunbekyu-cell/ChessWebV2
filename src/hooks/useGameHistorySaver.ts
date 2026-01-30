import { useEffect } from "react";
import { Chess } from "chess.js";
import { GameSettings } from "../components/game";
import { GameHistoryPayload } from "./useStockfishGameTypes";
import { detectOpeningFromSan } from "../utils/openingExplorer";

export function useGameHistorySaver(
  gameOver: boolean,
  gameResult: string | null,
  gameSettings: GameSettings,
  gameRef: React.MutableRefObject<Chess>,
  game: Chess,
  startTimeRef: React.MutableRefObject<number | null>,
  historySavedRef: React.MutableRefObject<boolean>,
  saveGameHistory: (payload: GameHistoryPayload) => Promise<string | null>,
  setSavedGameId: (id: string | null) => void,
) {
  useEffect(() => {
    if (!gameOver || !gameResult || historySavedRef.current) return;
    historySavedRef.current = true;

    const currentGame = gameRef.current;
    const durationMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : undefined;

    const opening = detectOpeningFromSan(currentGame.history());
    const ecoCode = opening?.eco || "";
    const openingName = opening
      ? opening.variation
        ? `${opening.name}: ${opening.variation}`
        : opening.name
      : "";
    const openingSlug = openingName
      ? openingName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")
      : ecoCode
        ? `eco_${ecoCode}`
        : "";
    const ecoUrl =
      openingSlug.length > 0
        ? `https://lichess.org/opening/${openingSlug}`
        : "";

    const terminationReason = currentGame.in_checkmate()
      ? "checkmate"
      : currentGame.in_stalemate()
        ? "stalemate"
        : currentGame.insufficient_material()
          ? "insufficient material"
          : currentGame.in_threefold_repetition()
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

    const terminationText = winner
      ? `${winner} won by ${terminationReason}`
      : `Game drawn by ${terminationReason}`;

    const pgnResult = isPlayerWin
      ? gameSettings.playAs === "white"
        ? "1-0"
        : "0-1"
      : isStockfishWin
        ? gameSettings.playAs === "white"
          ? "0-1"
          : "1-0"
        : "1/2-1/2";

    const now = new Date();
    const startDate = startTimeRef.current
      ? new Date(startTimeRef.current)
      : now;
    const formatDate = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    const formatTime = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

    const tc = gameSettings.timeControl;
    const timeControlStr =
      tc.initial === 0
        ? "-"
        : tc.increment > 0
          ? `${tc.initial}+${tc.increment}`
          : `${tc.initial}`;

    const playerName = "Player";
    const whiteName =
      gameSettings.playAs === "white" ? playerName : "Stockfish";
    const blackName =
      gameSettings.playAs === "black" ? playerName : "Stockfish";

    const pgnHeaders = [
      `[Event "Live Chess"]`,
      `[Site "ChessFlow"]`,
      `[Date "${formatDate(startDate)}"]`,
      `[Round "-"]`,
      `[White "${whiteName}"]`,
      `[Black "${blackName}"]`,
      `[Result "${pgnResult}"]`,
      `[CurrentPosition "${game.fen()}"]`,
      `[Timezone "UTC"]`,
      `[ECO "${ecoCode}"]`,
      `[ECOUrl "${ecoUrl}"]`,
      `[TimeControl "${timeControlStr}"]`,
      `[UTCDate "${formatDate(startDate)}"]`,
      `[UTCTime "${formatTime(startDate)}"]`,
      `[WhiteElo "1200"]`,
      `[BlackElo "1200"]`,
      `[Termination "${terminationText}"]`,
      `[StartTime "${formatTime(startDate)}"]`,
      `[EndDate "${formatDate(now)}"]`,
      `[EndTime "${formatTime(now)}"]`,
      `[Link ""]`,
      `[WhiteUrl ""]`,
      `[WhiteCountry ""]`,
      `[WhiteTitle ""]`,
      `[BlackUrl ""]`,
      `[BlackCountry ""]`,
      `[BlackTitle ""]`,
    ].join("\n");

    const moveText = currentGame.pgn();
    const fullPgn = `${pgnHeaders}\n\n${moveText} ${pgnResult}`;

    saveGameHistory({
      event: "Live Chess",
      site: "ChessFlow",
      date: formatDate(startDate),
      round: "-",
      white: whiteName,
      black: blackName,
      result: pgnResult,
      currentPosition: currentGame.fen(),
      timeControl: timeControlStr,
      utcDate: formatDate(startDate),
      utcTime: formatTime(startDate),
      startTime: formatTime(startDate),
      endDate: formatDate(now),
      endTime: formatTime(now),
      whiteElo: 1200,
      blackElo: 1200,
      timezone: "UTC",
      eco: ecoCode,
      ecoUrl,
      link: "",
      whiteUrl: "",
      whiteCountry: "",
      whiteTitle: "",
      blackUrl: "",
      blackCountry: "",
      blackTitle: "",
      termination: terminationText,
      moves: currentGame.history(),
      moveText,
      pgn: fullPgn,
      playAs: gameSettings.playAs,
      opponent: "Stockfish",
      opponentLevel: gameSettings.difficulty,
      durationMs,
    }).then((id) => {
      if (id) setSavedGameId(id);
    });
  }, [
    gameOver,
    gameResult,
    gameSettings,
    gameRef,
    game,
    startTimeRef,
    historySavedRef,
    saveGameHistory,
    setSavedGameId,
  ]);
}
