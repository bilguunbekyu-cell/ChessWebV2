import { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { playGameplaySound } from "../utils/moveSounds";

export function useGameStateChecker(
  game: Chess,
  gameRef: React.MutableRefObject<Chess>,
  gameStarted: boolean,
  playerColor: "w" | "b",
  isEngineThinking: React.MutableRefObject<boolean>,
  makeEngineMove: () => void,
  setGameResult: React.Dispatch<React.SetStateAction<string | null>>,
  setGameOver: React.Dispatch<React.SetStateAction<boolean>>,
  setShowGameOverModal: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const gameEndSoundPlayedRef = useRef(false);

  useEffect(() => {
    const currentGame = gameRef.current;

    if (currentGame.game_over()) {
      if (!gameEndSoundPlayedRef.current) {
        playGameplaySound("gameEnd");
        gameEndSoundPlayedRef.current = true;
      }
      let result = "Draw";
      if (currentGame.in_checkmate()) {
        result =
          currentGame.turn() === playerColor ? "Stockfish Wins!" : "You Win!";
      } else if (currentGame.in_stalemate()) {
        result = "Stalemate - Draw";
      } else if (currentGame.in_threefold_repetition()) {
        result = "Threefold Repetition - Draw";
      } else if (currentGame.insufficient_material()) {
        result = "Insufficient Material - Draw";
      }
      setGameResult(result);
      setGameOver(true);
      setShowGameOverModal(true);
      return;
    }

    gameEndSoundPlayedRef.current = false;

    if (
      gameStarted &&
      currentGame.turn() !== playerColor &&
      !isEngineThinking.current
    ) {
      const timer = setTimeout(() => makeEngineMove(), 200);
      return () => clearTimeout(timer);
    }
  }, [
    game,
    gameRef,
    gameStarted,
    playerColor,
    isEngineThinking,
    makeEngineMove,
    setGameResult,
    setGameOver,
    setShowGameOverModal,
  ]);
}
