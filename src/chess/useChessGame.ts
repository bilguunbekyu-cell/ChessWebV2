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

  // Get available moves for a square
  const getMoveOptions = useCallback((square: Square) => {
    const currentGame = gameRef.current;
    const moves = currentGame.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: OptionSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {};
    });
    setOptionSquares(newSquares);
    return true;
  }, []);

  // Check if a move is valid
  const isValidMove = useCallback((from: Square, to: Square): boolean => {
    const moves = gameRef.current.moves({ square: from, verbose: true });
    return moves.some((m) => m.from === from && m.to === to);
  }, []);

  // Make a move on the board
  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: "b" | "n" | "r" | "q"): boolean => {
      try {
        // Create a copy of the game to avoid mutating the current state
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

  // Reset the game
  const resetGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setMoves([]);
    setOptionSquares({});
    setMoveFrom(null);
    setMoveTo(null);
  }, [setMoves]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setOptionSquares({});
    setMoveFrom(null);
    setMoveTo(null);
  }, []);

  // Check game state - use ref for consistent reads
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

  // Update game state (for external use)
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
