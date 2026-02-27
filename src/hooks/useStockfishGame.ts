import { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Square } from "chess.js";
import { usePreMove } from "../chess/usePreMove";
import { GameSettings } from "../components/game";
import {
  OptionSquares,
  defaultGameSettings,
  GameHistoryPayload,
} from "./useStockfishGameTypes";
import { useStockfishEngine } from "./useStockfishEngine";
import { useMoveOptions } from "./useMoveOptions";
import { useSaveGameHistory } from "./useSaveGameHistory";
import { useEngineMoves } from "./useEngineMoves";
import { useGameStateChecker } from "./useGameStateChecker";
import { useGameHistorySaver } from "./useGameHistorySaver";
import { useSquareClickHandler } from "./useSquareClickHandler";
import { useGameActions } from "./useGameActions";
import { useOpeningExplorer } from "./useOpeningExplorer";
import { playChessMoveSound } from "../utils/moveSounds";

export type { GameHistoryPayload };

export function useStockfishGame() {
  const [game, setGame] = useState(() => new Chess());
  const gameRef = useRef<Chess>(game);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<OptionSquares>({});
  const [moves, setMoves] = useState<string[]>([]);

  const [gameSettings, setGameSettings] =
    useState<GameSettings>(defaultGameSettings);

  const { preMove, preMoveSquares, setPreMove, clearPreMove, getPreMove } =
    usePreMove();

  const [gameStarted, setGameStarted] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null,
  );
  const [playerTime, setPlayerTime] = useState(300);
  const [opponentTime, setOpponentTime] = useState(300);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);

  const historySavedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const playerColor = gameSettings.playAs === "white" ? "w" : "b";
  const isPlayerTurn = game.turn() === playerColor;

  const engineRef = useStockfishEngine(
    gameSettings.difficulty,
    gameSettings.selectedBot,
  );

  const { opening, isLoading: openingLoading } = useOpeningExplorer(moves, {
    enableRemote: true,
  });

  const getMoveOptions = useMoveOptions(gameRef, setOptionSquares);

  const saveGameHistory = useSaveGameHistory();

  const tryApplyPreMove = useCallback(() => {
    const queued = getPreMove();
    if (!queued) return;

    const currentGame = gameRef.current;
    if (currentGame.turn() !== playerColor) return;

    try {
      const move = currentGame.move({
        from: queued.from as Square,
        to: queued.to as Square,
        promotion: (queued.promotion as any) || "q",
      });
      if (move) {
        gameRef.current = currentGame;
        setGame(new Chess(currentGame.fen()));
        setMoves(currentGame.history());
        playChessMoveSound(move);
        setLastMove({ from: queued.from as Square, to: queued.to as Square });
      }
    } catch {

    }
    clearPreMove();
  }, [clearPreMove, getPreMove, playerColor]);

  const { isEngineThinking, makeEngineMove, handleEngineMessage } =
    useEngineMoves(
      engineRef,
      gameRef,
      playerColor,
      gameSettings.difficulty,
      gameOver,
      setGame,
      setMoves,
      setLastMove,
      tryApplyPreMove,
    );

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.onMessage(handleEngineMessage);
  }, [engineRef, handleEngineMessage]);

  useGameStateChecker(
    game,
    gameRef,
    gameStarted,
    playerColor,
    isEngineThinking,
    makeEngineMove,
    setGameResult,
    setGameOver,
    setShowGameOverModal,
  );

  useEffect(() => {
    if (
      gameStarted &&
      gameSettings.playAs === "black" &&
      game.history().length === 0
    ) {
      const timer = setTimeout(() => makeEngineMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameSettings.playAs, game, makeEngineMove]);

  useEffect(() => {
    if (!gameStarted || gameOver || !isPlayerTurn || !preMove) return;
    const timer = setTimeout(() => {
      tryApplyPreMove();
    }, 0);
    return () => clearTimeout(timer);
  }, [gameStarted, gameOver, isPlayerTurn, preMove, tryApplyPreMove]);

  useGameHistorySaver(
    gameOver,
    gameResult,
    gameSettings,
    gameRef,
    game,
    startTimeRef,
    historySavedRef,
    saveGameHistory,
    setSavedGameId,
  );

  const {
    onSquareClick,
    onPieceDrop,
    onCancelSelection: baseOnCancelSelection,
    isDraggablePiece,
    promotionState,
    onPromotionPieceSelect,
  } = useSquareClickHandler(
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
    setLastMove,
  );

  const {
    handleStartGame: baseHandleStartGame,
    handleNewGame: baseHandleNewGame,
    handleResign: baseHandleResign,
    handleTimeOut: baseHandleTimeOut,
  } =
    useGameActions(
      gameRef,
      setGame,
      setMoves,
      setMoveFrom,
      setOptionSquares,
      setGameSettings,
      setShowSetupModal,
      setShowGameOverModal,
      setGameStarted,
      setGameOver,
      setGameResult,
      setPlayerTime,
      setOpponentTime,
      setSavedGameId,
      isEngineThinking,
      historySavedRef,
      startTimeRef,
      setLastMove,
    );

  const handleStartGame = useCallback(
    (settings: GameSettings) => {
      clearPreMove();
      baseHandleStartGame(settings);
    },
    [baseHandleStartGame, clearPreMove],
  );

  const handleNewGame = useCallback(() => {
    clearPreMove();
    baseHandleNewGame();
  }, [baseHandleNewGame, clearPreMove]);

  const handleResign = useCallback(() => {
    clearPreMove();
    baseHandleResign();
  }, [baseHandleResign, clearPreMove]);

  const handleTimeOut = useCallback(
    (isPlayer: boolean) => {
      clearPreMove();
      baseHandleTimeOut(isPlayer);
    },
    [baseHandleTimeOut, clearPreMove],
  );

  const onCancelSelection = useCallback(() => {
    if (moveFrom) {
      baseOnCancelSelection();
      return;
    }
    clearPreMove();
  }, [baseOnCancelSelection, clearPreMove, moveFrom]);

  return {

    game,
    moves,
    gameSettings,
    gameStarted,
    gameOver,
    gameResult,
    isPlayerTurn,
    playerColor,
    savedGameId,
    lastMove,

    showSetupModal,
    showGameOverModal,
    optionSquares,
    preMoveSquares,
    playerTime,
    opponentTime,
    setPlayerTime,
    setOpponentTime,
    opening,
    openingLoading,

    onSquareClick,
    onPieceDrop,
    onCancelSelection,
    isDraggablePiece,
    promotionState,
    onPromotionPieceSelect,
    handleStartGame,
    handleNewGame,
    handleResign,
    handleTimeOut,
  };
}
