import { useCallback } from "react";
import { Chess, Square } from "chess.js";
import { GameSettings } from "../components/game";
import { OptionSquares } from "./useStockfishGameTypes";

export function useGameActions(
  gameRef: React.MutableRefObject<Chess>,
  setGame: React.Dispatch<React.SetStateAction<Chess>>,
  setMoves: React.Dispatch<React.SetStateAction<string[]>>,
  setMoveFrom: React.Dispatch<React.SetStateAction<Square | null>>,
  setOptionSquares: React.Dispatch<React.SetStateAction<OptionSquares>>,
  setGameSettings: React.Dispatch<React.SetStateAction<GameSettings>>,
  setShowSetupModal: React.Dispatch<React.SetStateAction<boolean>>,
  setShowGameOverModal: React.Dispatch<React.SetStateAction<boolean>>,
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>,
  setGameOver: React.Dispatch<React.SetStateAction<boolean>>,
  setGameResult: React.Dispatch<React.SetStateAction<string | null>>,
  setPlayerTime: React.Dispatch<React.SetStateAction<number>>,
  setOpponentTime: React.Dispatch<React.SetStateAction<number>>,
  setSavedGameId: React.Dispatch<React.SetStateAction<string | null>>,
  isEngineThinking: React.MutableRefObject<boolean>,
  historySavedRef: React.MutableRefObject<boolean>,
  startTimeRef: React.MutableRefObject<number | null>,
  setLastMove?: React.Dispatch<
    React.SetStateAction<{ from: Square; to: Square } | null>
  >,
) {
  const handleStartGame = useCallback(
    (settings: GameSettings) => {
      const newGame = new Chess();
      gameRef.current = newGame;
      setGame(newGame);
      setGameSettings(settings);
      setShowSetupModal(false);
      setShowGameOverModal(false);
      setGameStarted(true);
      setGameOver(false);
      setGameResult(null);
      setSavedGameId(null);
      setMoves([]);
      setMoveFrom(null);
      setOptionSquares({});
      setPlayerTime(settings.timeControl.initial);
      setOpponentTime(settings.timeControl.initial);
      isEngineThinking.current = false;
      historySavedRef.current = false;
      startTimeRef.current = Date.now();
      setLastMove?.(null);
    },
    [
      gameRef,
      setGame,
      setGameSettings,
      setShowSetupModal,
      setShowGameOverModal,
      setGameStarted,
      setGameOver,
      setGameResult,
      setSavedGameId,
      setMoves,
      setMoveFrom,
      setOptionSquares,
      setPlayerTime,
      setOpponentTime,
    isEngineThinking,
    historySavedRef,
    startTimeRef,
    setLastMove,
  ],
);

  const handleNewGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setMoves([]);
    setMoveFrom(null);
    setOptionSquares({});
    setGameStarted(false);
    setShowSetupModal(true);
    setShowGameOverModal(false);
    setGameOver(false);
    setGameResult(null);
    setSavedGameId(null);
    isEngineThinking.current = false;
    historySavedRef.current = false;
    startTimeRef.current = null;
    setLastMove?.(null);
  }, [
    gameRef,
    setGame,
    setMoves,
    setMoveFrom,
    setOptionSquares,
    setGameStarted,
    setShowSetupModal,
    setShowGameOverModal,
    setGameOver,
    setGameResult,
    setSavedGameId,
    isEngineThinking,
    historySavedRef,
    startTimeRef,
    setLastMove,
  ]);

  const handleResign = useCallback(() => {
    setGameResult("You Resigned");
    setGameOver(true);
    setShowGameOverModal(true);
  }, [setGameResult, setGameOver, setShowGameOverModal]);

  const handleTimeOut = useCallback(
    (isPlayer: boolean) => {
      setGameResult(isPlayer ? "Stockfish Wins on Time!" : "You Win on Time!");
      setGameOver(true);
      setShowGameOverModal(true);
    },
    [setGameResult, setGameOver, setShowGameOverModal],
  );

  return {
    handleStartGame,
    handleNewGame,
    handleResign,
    handleTimeOut,
  };
}
