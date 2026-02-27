import { useState, useCallback, useRef } from "react";
import { Chess, Square } from "chess.js";
import { useChessStore } from "../store/chessStore";
import { OptionSquares } from "./types";

export const useChessGame = () => {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const gameRef = useRef<Chess>(game);

  const [optionSquares, setOptionSquares] = useState<OptionSquares>({});
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [moveTo, setMoveTo] = useState<Square | null>(null);
  const setMoves = useChessStore((state) => state.setMoves);

  const getMoveOptions = useCallback((square: Square) => {
    const currentGame = gameRef.current;
    const moves = currentGame.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: OptionSquares = {
      [square]: {
        backgroundColor: "rgba(0, 0, 0, 0.08)",
        boxShadow: "inset 0 0 0 3px rgba(0, 0, 0, 0.18)",
      } as any,
    };
    moves.forEach((move) => {
      const targetPiece = currentGame.get(move.to);
      newSquares[move.to] = targetPiece
        ? ({
            background:
              "radial-gradient(circle, transparent 52%, rgba(0, 0, 0, 0.25) 53%, rgba(0, 0, 0, 0.25) 66%, transparent 67%)",
            cursor: "pointer",
          } as any)
        : ({
            background:
              "radial-gradient(circle, rgba(0, 0, 0, 0.25) 24%, transparent 25%)",
            cursor: "pointer",
          } as any);
    });
    setOptionSquares(newSquares);
    return true;
  }, []);

  const isValidMove = useCallback((from: Square, to: Square): boolean => {
    const moves = gameRef.current.moves({ square: from, verbose: true });
    return moves.some((m) => m.from === from && m.to === to);
  }, []);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: "b" | "n" | "r" | "q"): boolean => {
      try {
        const gameCopy = new Chess(gameRef.current.fen());
        const move = gameCopy.move({ from, to, promotion: promotion || "q" });
        if (move) {
          gameRef.current = gameCopy;
          setGame(gameCopy);
          setMoves(gameCopy.history());
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [setMoves],
  );

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setMoves([]);
    setOptionSquares({});
    setMoveFrom(null);
    setMoveTo(null);
  }, [setMoves]);

  const clearSelection = useCallback(() => {
    setOptionSquares({});
    setMoveFrom(null);
    setMoveTo(null);
  }, []);

  const isGameOver = useCallback(() => {
    const g = gameRef.current;
    return g.game_over();
  }, []);

  const isCheckmate = useCallback(() => gameRef.current.in_checkmate(), []);
  const isDraw = useCallback(() => gameRef.current.in_draw(), []);
  const isStalemate = useCallback(() => gameRef.current.in_stalemate(), []);
  const getCurrentTurn = useCallback(() => gameRef.current.turn(), []);
  const getFen = useCallback(() => gameRef.current.fen(), []);
  const getHistory = useCallback(() => gameRef.current.history(), []);
  const getPiece = useCallback(
    (square: Square) => gameRef.current.get(square),
    [],
  );

  const updateGame = useCallback(
    (newGame: Chess) => {
      gameRef.current = newGame;
      setGame(newGame);
      setMoves(newGame.history());
    },
    [setMoves],
  );

  return {
    game,
    gameRef,
    setGame,
    updateGame,
    optionSquares,
    setOptionSquares,
    moveFrom,
    setMoveFrom,
    moveTo,
    setMoveTo,
    getMoveOptions,
    isValidMove,
    makeMove,
    resetGame,
    clearSelection,
    isGameOver,
    isCheckmate,
    isDraw,
    isStalemate,
    getCurrentTurn,
    getFen,
    getHistory,
    getPiece,
  };
};
