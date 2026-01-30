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
        newSquares[move.to] = {
          background:
            currentGame.get(move.to) &&
            currentGame.get(move.to)!.color !== currentGame.get(square)!.color
              ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
              : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
          borderRadius: "50%",
        };
      });
      newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
      setOptionSquares(newSquares);
      return true;
    },
    [gameRef, setOptionSquares],
  );

  return getMoveOptions;
}
