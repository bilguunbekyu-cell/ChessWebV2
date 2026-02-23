import { useCallback } from "react";
import { Chess, Square } from "chess.js";
import { OptionSquares } from "./useStockfishGameTypes";

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

      const newSquares: OptionSquares = {};
      movesForSquare.forEach((move) => {
        newSquares[move.to] = {};
      });
      setOptionSquares(newSquares);
      return true;
    },
    [gameRef, setOptionSquares],
  );

  return getMoveOptions;
}
