import { useCallback } from "react";
import { GameHistory } from "../historyTypes";

export function useDownloadPgn(game: GameHistory) {
  const downloadPgn = useCallback(() => {
    const blob = new Blob([game.pgn || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chessflow_${game.date?.replace(/\./g, "-") || "game"}_${game._id?.slice(-6) || "unknown"}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [game]);

  return downloadPgn;
}
