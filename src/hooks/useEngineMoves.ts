import { useCallback, useRef } from "react";
import { Chess, Square } from "chess.js";
import { StockfishEngine } from "../chess";

export function useEngineMoves(
  engineRef: React.MutableRefObject<StockfishEngine | null>,
  gameRef: React.MutableRefObject<Chess>,
  playerColor: "w" | "b",
  difficulty: number,
  gameOver: boolean,
  setGame: React.Dispatch<React.SetStateAction<Chess>>,
  setMoves: React.Dispatch<React.SetStateAction<string[]>>,
  tryApplyPreMove: () => void,
) {
  const isEngineThinking = useRef(false);

  const makeEngineMove = useCallback(() => {
    if (!engineRef.current || isEngineThinking.current || gameOver) return;

    const currentGame = gameRef.current;
    if (currentGame.turn() === playerColor || currentGame.game_over()) return;

    isEngineThinking.current = true;
    const moveNumber = Math.floor(currentGame.history().length / 2) + 1;

    // Pass legal moves to engine for potential blundering
    const legalMoves = currentGame
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || ""));
    engineRef.current.setLegalMoves(legalMoves);

    engineRef.current.evaluatePosition(
      currentGame.fen(),
      difficulty + 2,
      moveNumber,
    );
  }, [engineRef, gameRef, playerColor, difficulty, gameOver]);

  const handleEngineMessage = useCallback(
    ({ bestMove }: { bestMove?: string }) => {
      if (!bestMove || !isEngineThinking.current) return;

      const currentGame = gameRef.current;
      if (currentGame.turn() === playerColor) return;

      setTimeout(
        () => {
          const from = bestMove.substring(0, 2) as Square;
          const to = bestMove.substring(2, 4) as Square;
          const promotion = bestMove.substring(4, 5) as
            | "q"
            | "r"
            | "b"
            | "n"
            | undefined;

          try {
            const move = currentGame.move({
              from,
              to,
              promotion: promotion || "q",
            });
            if (move) {
              gameRef.current = currentGame;
              setGame(new Chess(currentGame.fen()));
              setMoves(currentGame.history());
            }
          } catch (e) {
            console.error("Engine move error:", e);
          }

          tryApplyPreMove();
          isEngineThinking.current = false;
        },
        3000 + Math.random() * 800,
      );
    },
    [gameRef, playerColor, setGame, setMoves, tryApplyPreMove],
  );

  return {
    isEngineThinking,
    makeEngineMove,
    handleEngineMessage,
  };
}
