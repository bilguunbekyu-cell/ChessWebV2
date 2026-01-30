import { useCallback } from "react";
import { Chess, Square } from "chess.js";
import { OptionSquares } from "./useStockfishGameTypes";

export function useSquareClickHandler(
  gameRef: React.MutableRefObject<Chess>,
  gameStarted: boolean,
  gameOver: boolean,
  playerColor: "w" | "b",
  moveFrom: Square | null,
  setMoveFrom: React.Dispatch<React.SetStateAction<Square | null>>,
  setOptionSquares: React.Dispatch<React.SetStateAction<OptionSquares>>,
  setGame: React.Dispatch<React.SetStateAction<Chess>>,
  setMoves: React.Dispatch<React.SetStateAction<string[]>>,
  getMoveOptions: (square: Square) => boolean,
  setPreMove: (from: string, to: string, promotion?: string) => void,
  clearPreMove: () => void,
) {
  const onSquareClick = useCallback(
    (square: Square) => {
      if (!gameStarted || gameOver) return;

      const currentGame = gameRef.current;
      const turn = currentGame.turn();

      // If engine's turn: allow setting a premove with player's piece
      if (turn !== playerColor) {
        if (!moveFrom) {
          const piece = currentGame.get(square);
          if (piece && piece.color === playerColor) {
            getMoveOptions(square);
            setMoveFrom(square);
          }
          return;
        }

        const moves = currentGame.moves({ square: moveFrom, verbose: true });
        const legal = moves.find((m) => m.to === square);
        if (legal) {
          setPreMove(moveFrom, square, legal.promotion as any);
        }
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }

      // Player turn: normal move flow
      if (!moveFrom) {
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor) {
          getMoveOptions(square);
          setMoveFrom(square);
        }
        return;
      }

      if (moveFrom === square) {
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }

      try {
        const result = currentGame.move({
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        if (result) {
          gameRef.current = currentGame;
          setGame(new Chess(currentGame.fen()));
          setMoves(currentGame.history());
          clearPreMove();
        }
      } catch {
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor) {
          getMoveOptions(square);
          setMoveFrom(square);
          return;
        }
      }

      setMoveFrom(null);
      setOptionSquares({});
    },
    [
      gameRef,
      gameStarted,
      gameOver,
      playerColor,
      moveFrom,
      setMoveFrom,
      setOptionSquares,
      setGame,
      setMoves,
      getMoveOptions,
      setPreMove,
      clearPreMove,
    ],
  );

  return onSquareClick;
}
