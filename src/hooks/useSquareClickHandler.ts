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
  setLastMove?: React.Dispatch<
    React.SetStateAction<{ from: Square; to: Square } | null>
  >,
) {
  const clearSelection = useCallback(() => {
    setMoveFrom(null);
    setOptionSquares({});
  }, [setMoveFrom, setOptionSquares]);

  const commitMove = useCallback(
    (from: Square, to: Square) => {
      const currentGame = gameRef.current;

      try {
        const result = currentGame.move({
          from,
          to,
          promotion: "q",
        });
        if (!result) return false;

        gameRef.current = currentGame;
        setGame(new Chess(currentGame.fen()));
        setMoves(currentGame.history());
        clearPreMove();
        setLastMove?.({ from, to });
        clearSelection();
        return true;
      } catch {
        return false;
      }
    },
    [clearPreMove, clearSelection, gameRef, setGame, setLastMove, setMoves],
  );

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
        clearSelection();
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
        clearSelection();
        return;
      }

      if (commitMove(moveFrom, square)) {
        return;
      }

      const piece = currentGame.get(square);
      if (piece && piece.color === playerColor) {
        getMoveOptions(square);
        setMoveFrom(square);
        return;
      }

      clearSelection();
    },
    [
      clearSelection,
      commitMove,
      gameRef,
      gameStarted,
      gameOver,
      playerColor,
      moveFrom,
      setMoveFrom,
      setOptionSquares,
      getMoveOptions,
      setPreMove,
      setLastMove,
    ],
  );

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!gameStarted || gameOver) return false;

      const currentGame = gameRef.current;
      const piece = currentGame.get(sourceSquare);
      if (!piece || piece.color !== playerColor) return false;

      const turn = currentGame.turn();
      if (turn !== playerColor) {
        const premove = currentGame
          .moves({ square: sourceSquare, verbose: true })
          .find((move) => move.to === targetSquare);
        if (!premove) return false;
        setPreMove(sourceSquare, targetSquare, premove.promotion as any);
        clearSelection();
        return false;
      }

      const moved = commitMove(sourceSquare, targetSquare);
      if (moved) return true;

      if (getMoveOptions(sourceSquare)) {
        setMoveFrom(sourceSquare);
      }
      return false;
    },
    [
      clearSelection,
      commitMove,
      gameOver,
      gameRef,
      gameStarted,
      getMoveOptions,
      playerColor,
      setMoveFrom,
      setPreMove,
    ],
  );

  const isDraggablePiece = useCallback(
    (sourceSquare: Square) => {
      if (!gameStarted || gameOver) return false;
      const piece = gameRef.current.get(sourceSquare);
      return !!piece && piece.color === playerColor;
    },
    [gameOver, gameRef, gameStarted, playerColor],
  );

  return {
    onSquareClick,
    onPieceDrop,
    onCancelSelection: clearSelection,
    isDraggablePiece,
  };
}
