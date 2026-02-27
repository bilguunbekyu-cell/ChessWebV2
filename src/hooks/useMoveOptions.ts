import { useCallback } from "react";
import { Chess, Square } from "chess.js";
import { OptionSquares } from "./useStockfishGameTypes";

const SELECTED_SOURCE_STYLE = {
  backgroundColor: "rgba(0, 0, 0, 0.08)",
  boxShadow: "inset 0 0 0 3px rgba(0, 0, 0, 0.18)",
};

const MOVE_DOT_STYLE = {
  background:
    "radial-gradient(circle, rgba(0, 0, 0, 0.25) 24%, transparent 25%)",
  cursor: "pointer",
};

const CAPTURE_RING_STYLE = {
  background:
    "radial-gradient(circle, transparent 52%, rgba(0, 0, 0, 0.25) 53%, rgba(0, 0, 0, 0.25) 66%, transparent 67%)",
  cursor: "pointer",
};

export function useMoveOptions(
  gameRef: React.MutableRefObject<Chess>,
  setOptionSquares: React.Dispatch<React.SetStateAction<OptionSquares>>,
) {
  const getMoveOptions = useCallback(
    (square: Square) => {
      const currentGame = gameRef.current;
      const movesForSquare = currentGame.moves({ square, verbose: true });
      if (movesForSquare.length === 0) {
        setOptionSquares({});
        return false;
      }

      const newSquares: OptionSquares = {
        [square]: SELECTED_SOURCE_STYLE,
      };
      movesForSquare.forEach((move) => {
        const targetPiece = currentGame.get(move.to as Square);
        newSquares[move.to] = targetPiece ? CAPTURE_RING_STYLE : MOVE_DOT_STYLE;
      });
      setOptionSquares(newSquares);
      return true;
    },
    [gameRef, setOptionSquares],
  );

  return getMoveOptions;
}
