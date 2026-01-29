import { useState, useCallback } from "react";
import { PreMove, PreMoveSquares } from "./types";

export const usePreMove = () => {
  const [preMove, setPreMove] = useState<PreMove | null>(null);
  const [preMoveSquares, setPreMoveSquares] = useState<PreMoveSquares>({});

  // Set a pre-move with visual highlight - distinctive cyan/teal color with border
  const setPreMoveWithHighlight = useCallback(
    (from: string, to: string, promotion?: "b" | "n" | "r" | "q") => {
      setPreMove({ from, to, promotion });
      setPreMoveSquares({
        [from]: {
          backgroundColor: "rgba(0, 200, 200, 0.4)",
          boxShadow: "inset 0 0 0 3px rgba(0, 200, 200, 0.8)",
        },
        [to]: {
          backgroundColor: "rgba(0, 200, 200, 0.4)",
          boxShadow: "inset 0 0 0 3px rgba(0, 200, 200, 0.8)",
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0, 200, 200, 0.2) 5px, rgba(0, 200, 200, 0.2) 10px)",
        },
      });
    },
    [],
  );

  // Clear the pre-move
  const clearPreMove = useCallback(() => {
    setPreMove(null);
    setPreMoveSquares({});
  }, []);

  // Check if a pre-move is set
  const hasPreMove = useCallback(() => {
    return preMove !== null;
  }, [preMove]);

  // Get the current pre-move
  const getPreMove = useCallback(() => {
    return preMove;
  }, [preMove]);

  return {
    preMove,
    preMoveSquares,
    setPreMove: setPreMoveWithHighlight,
    clearPreMove,
    hasPreMove,
    getPreMove,
  };
};
