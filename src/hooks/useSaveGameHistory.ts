import { useCallback } from "react";
import { API_URL, GameHistoryPayload } from "./useStockfishGameTypes";

let historyErrorLogged = false;

export function useSaveGameHistory() {
  const saveGameHistory = useCallback(
    async (payload: GameHistoryPayload): Promise<string | null> => {
      try {
        const res = await fetch(`${API_URL}/api/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          return data.historyId || null;
        }
        return null;
      } catch (err) {
        if (!historyErrorLogged) {
          console.warn(
            "History save skipped (API unavailable). Game continues locally.",
          );
          historyErrorLogged = true;
        }
        return null;
      }
    },
    [],
  );

  return saveGameHistory;
}
