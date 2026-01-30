import { useCallback } from "react";
import { API_URL, GameHistoryPayload } from "./useStockfishGameTypes";

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
        console.error("Save history failed:", err);
        return null;
      }
    },
    [],
  );

  return saveGameHistory;
}
