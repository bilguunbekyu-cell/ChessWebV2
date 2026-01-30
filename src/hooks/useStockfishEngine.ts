import { useRef, useEffect } from "react";
import { StockfishEngine } from "../chess";

export function useStockfishEngine(difficulty: number) {
  const engineRef = useRef<StockfishEngine | null>(null);

  // Initialize Stockfish engine
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.quit();
    };
  }, []);

  // Set engine difficulty when settings change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSkillLevel(difficulty * 2);
    }
  }, [difficulty]);

  return engineRef;
}
