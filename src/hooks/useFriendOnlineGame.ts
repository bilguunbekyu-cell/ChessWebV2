import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import type { GameSettings } from "../components/game";
import { defaultGameSettings, OptionSquares } from "./useStockfishGameTypes";
import { useMoveOptions } from "./useMoveOptions";
import { useSaveGameHistory } from "./useSaveGameHistory";
import { buildFullPgn } from "./gameHistorySaver/buildPgn";
import {
  formatDate,
  formatTime,
  formatTimeControl,
} from "./gameHistorySaver/utils";
import { detectOpeningFromSan } from "../utils/openingExplorer";
import { useAuthStore } from "../store/authStore";
import {
  FriendGameStartedPayload,
  useFriendChallengeStore,
} from "../store/friendChallengeStore";

type PlayerColor = "w" | "b";
type GameOverReason =
  | "checkmate"
  | "draw"
  | "resign"
  | "timeout"
  | "opponent_left";

interface MoveAppliedPayload {
  gameId: string;
  move: { from: Square; to: Square; san: string };
  fen: string;
  turn: PlayerColor;
  isCheckmate?: boolean;
  isDraw?: boolean;
  isStalemate?: boolean;
}

interface GameOverPayload {
  gameId: string;
  reason: GameOverReason;
  winner: PlayerColor | null;
}

export function useFriendOnlineGame() {
  const { user } = useAuthStore();
  const socket = useFriendChallengeStore((state) => state.socket);
  const activeGame = useFriendChallengeStore((state) => state.activeGame);
  const clearActiveGame = useFriendChallengeStore(
    (state) => state.clearActiveGame,
  );
  const isConnected = useFriendChallengeStore((state) => state.isConnected);

  const [game, setGame] = useState(() => new Chess());
  const gameRef = useRef(game);
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null,
  );
  const [gameSettings, setGameSettings] =
    useState<GameSettings>(defaultGameSettings);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");
  const [gameId, setGameId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState("Friend");
  const [opponentUserId, setOpponentUserId] = useState<string | null>(null);
  const [gameType, setGameType] = useState("standard");
  const [isRated, setIsRated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<OptionSquares>({});
  const [playerTime, setPlayerTime] = useState(
    defaultGameSettings.timeControl.initial,
  );
  const [opponentTime, setOpponentTime] = useState(
    defaultGameSettings.timeControl.initial,
  );

  const gameIdRef = useRef<string | null>(null);
  const playerColorRef = useRef<PlayerColor>("w");
  const playerNameRef = useRef<string>("Player");
  const startTimeRef = useRef<number | null>(null);
  const historySavedRef = useRef(false);
  const [lastGameOver, setLastGameOver] = useState<GameOverPayload | null>(
    null,
  );
  const saveGameHistory = useSaveGameHistory();

  const getMoveOptions = useMoveOptions(gameRef, setOptionSquares);
  const isPlayerTurn = game.turn() === playerColor;

  useEffect(() => {
    playerNameRef.current = user?.fullName || "Player";
  }, [user?.fullName]);

  const formatResult = (payload: GameOverPayload) => {
    if (payload.reason === "draw" || !payload.winner) {
      return "Draw";
    }
    const win = payload.winner === playerColorRef.current;
    const reasonMap: Record<GameOverReason, string> = {
      checkmate: "by checkmate",
      resign: "by resignation",
      timeout: "on time",
      opponent_left: "opponent left",
      draw: "",
    };
    const reason = reasonMap[payload.reason];
    return reason
      ? `${win ? "You Win" : "You Lose"} (${reason})`
      : win
        ? "You Win"
        : "You Lose";
  };

  const resetGameState = useCallback(() => {
    const nextGame = new Chess();
    gameRef.current = nextGame;
    setGame(nextGame);
    setMoves([]);
    setLastMove(null);
    setGameStarted(false);
    setGameOver(false);
    setGameResult(null);
    setShowGameOverModal(false);
    setMoveFrom(null);
    setOptionSquares({});
    setGameId(null);
    setSavedGameId(null);
    gameIdRef.current = null;
    setOpponentName("Friend");
    setOpponentUserId(null);
    setGameType("standard");
    setIsRated(false);
    setPlayerColor("w");
    playerColorRef.current = "w";
    setStatusMessage(null);
    startTimeRef.current = null;
    historySavedRef.current = false;
    setLastGameOver(null);
  }, []);

  const applyFriendGameStart = useCallback((payload: FriendGameStartedPayload) => {
    if (payload.gameId === gameIdRef.current && gameStarted) return;

    const nextGame = new Chess(payload.fen);
    gameRef.current = nextGame;
    setGame(nextGame);
    setMoves([]);
    setLastMove(null);
    setGameId(payload.gameId);
    gameIdRef.current = payload.gameId;
    setPlayerColor(payload.color);
    playerColorRef.current = payload.color;
    setOpponentUserId(
      payload.opponentUserId ? String(payload.opponentUserId) : null,
    );
    setOpponentName(payload.opponentName || "Friend");
    setGameType(payload.gameType || "standard");
    setIsRated(payload.rated === true);
    setGameStarted(true);
    setGameOver(false);
    setGameResult(null);
    setShowGameOverModal(false);
    setStatusMessage(null);
    setSavedGameId(null);
    historySavedRef.current = false;
    startTimeRef.current = Date.now();
    setLastGameOver(null);

    const timeControl = payload.timeControl || defaultGameSettings.timeControl;
    setGameSettings({
      ...defaultGameSettings,
      playAs: payload.color === "w" ? "white" : "black",
      difficulty: 0,
      timeControl,
    });
    setPlayerTime(timeControl.initial);
    setOpponentTime(timeControl.initial);
  }, [gameStarted]);

  useEffect(() => {
    if (!activeGame) return;
    applyFriendGameStart(activeGame);
    clearActiveGame();
  }, [activeGame, applyFriendGameStart, clearActiveGame]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendGameStarted = (payload: FriendGameStartedPayload) => {
      applyFriendGameStart(payload);
      clearActiveGame();
    };

    const handleMoveApplied = (payload: MoveAppliedPayload) => {
      if (payload.gameId !== gameIdRef.current) return;
      const currentGame = gameRef.current;
      const applied = currentGame.move({
        from: payload.move.from,
        to: payload.move.to,
        promotion: (payload.move as { promotion?: string }).promotion || "q",
      });

      if (applied) {
        gameRef.current = currentGame;
        setGame(new Chess(currentGame.fen()));
        setMoves(currentGame.history());
      } else {
        const nextGame = new Chess(payload.fen);
        gameRef.current = nextGame;
        setGame(nextGame);
        setMoves((prev) => [...prev, payload.move.san]);
      }
      setLastMove({ from: payload.move.from, to: payload.move.to });
      setMoveFrom(null);
      setOptionSquares({});
    };

    const handleMoveRejected = (payload: { reason?: string }) => {
      setStatusMessage(payload?.reason || "Move rejected.");
    };

    const handleGameOver = (payload: GameOverPayload) => {
      if (payload.gameId !== gameIdRef.current) return;
      setGameOver(true);
      setShowGameOverModal(true);
      setGameResult(formatResult(payload));
      setLastGameOver(payload);
    };

    socket.on("friendGameStarted", handleFriendGameStarted);
    socket.on("moveApplied", handleMoveApplied);
    socket.on("moveRejected", handleMoveRejected);
    socket.on("gameOver", handleGameOver);

    return () => {
      socket.off("friendGameStarted", handleFriendGameStarted);
      socket.off("moveApplied", handleMoveApplied);
      socket.off("moveRejected", handleMoveRejected);
      socket.off("gameOver", handleGameOver);
    };
  }, [socket, applyFriendGameStart, clearActiveGame]);

  useEffect(() => {
    if (!gameOver || !lastGameOver || historySavedRef.current) return;
    historySavedRef.current = true;

    const currentGame = gameRef.current;
    const now = new Date();
    const startDate = startTimeRef.current
      ? new Date(startTimeRef.current)
      : now;
    const durationMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : undefined;

    const opening = detectOpeningFromSan(currentGame.history());
    const ecoCode = opening?.eco || "";
    const openingName = opening
      ? opening.variation
        ? `${opening.name}: ${opening.variation}`
        : opening.name
      : "";
    const openingSlug = openingName
      ? openingName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")
      : ecoCode
        ? `eco_${ecoCode}`
        : "";
    const ecoUrl =
      openingSlug.length > 0
        ? `https://lichess.org/opening/${openingSlug}`
        : "";

    const reasonMap: Record<GameOverReason, string> = {
      checkmate: "checkmate",
      resign: "resignation",
      timeout: "time forfeit",
      opponent_left: "opponent left",
      draw: "draw",
    };

    const isDraw = lastGameOver.reason === "draw" || !lastGameOver.winner;
    const pgnResult = isDraw
      ? "1/2-1/2"
      : lastGameOver.winner === "w"
        ? "1-0"
        : "0-1";
    const terminationText = isDraw
      ? `Game drawn by ${reasonMap[lastGameOver.reason] || "draw"}`
      : `${lastGameOver.winner === "w" ? "White" : "Black"} won by ${
          reasonMap[lastGameOver.reason] || "checkmate"
        }`;

    const playerName = playerNameRef.current || user?.fullName || "Player";
    const opponent = opponentName || "Friend";
    const playerElo = user?.rating ?? 1200;
    const opponentElo = 1200;
    const whiteName = playerColorRef.current === "w" ? playerName : opponent;
    const blackName = playerColorRef.current === "b" ? playerName : opponent;
    const whiteElo = playerColorRef.current === "w" ? playerElo : opponentElo;
    const blackElo = playerColorRef.current === "b" ? playerElo : opponentElo;
    const timeControlStr = formatTimeControl(gameSettings.timeControl);

    const fullPgn = buildFullPgn(currentGame, {
      startDate,
      endDate: now,
      whiteName,
      blackName,
      whiteElo,
      blackElo,
      pgnResult,
      terminationText,
      timeControlStr,
      ecoCode,
      ecoUrl,
      currentFen: currentGame.fen(),
    });

    saveGameHistory({
      event: "Friend Challenge",
      site: "NeonGambit",
      date: formatDate(startDate),
      round: "-",
      white: whiteName,
      black: blackName,
      result: pgnResult,
      currentPosition: currentGame.fen(),
      timeControl: timeControlStr,
      utcDate: formatDate(startDate),
      utcTime: formatTime(startDate),
      startTime: formatTime(startDate),
      endDate: formatDate(now),
      endTime: formatTime(now),
      whiteElo,
      blackElo,
      timezone: "UTC",
      eco: ecoCode,
      ecoUrl,
      termination: terminationText,
      moves: currentGame.history(),
      moveText: currentGame.pgn(),
      pgn: fullPgn,
      playAs: gameSettings.playAs,
      opponent,
      durationMs,
    }).then((id) => {
      if (id) setSavedGameId(id);
    });
  }, [
    gameOver,
    lastGameOver,
    gameSettings.timeControl,
    gameSettings.playAs,
    opponentName,
    saveGameHistory,
    user?.fullName,
    user?.rating,
  ]);

  const clearSelection = useCallback(() => {
    setMoveFrom(null);
    setOptionSquares({});
  }, []);

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!socket) return;
      if (!gameStarted || gameOver) return;
      if (!isPlayerTurn) return;
      if (!gameIdRef.current) return;

      const currentGame = gameRef.current;

      if (!moveFrom) {
        const piece = currentGame.get(square);
        if (!piece || piece.color !== playerColor) return;
        setMoveFrom(square);
        getMoveOptions(square);
        return;
      }

      if (square === moveFrom) {
        clearSelection();
        return;
      }

      if (optionSquares[square]) {
        socket.emit("makeMove", {
          gameId: gameIdRef.current,
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        clearSelection();
        return;
      }

      const piece = currentGame.get(square);
      if (piece && piece.color === playerColor) {
        setMoveFrom(square);
        getMoveOptions(square);
        return;
      }

      clearSelection();
    },
    [
      clearSelection,
      socket,
      gameStarted,
      gameOver,
      isPlayerTurn,
      moveFrom,
      optionSquares,
      playerColor,
      getMoveOptions,
    ],
  );

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!socket) return false;
      if (!gameStarted || gameOver) return false;
      if (!isPlayerTurn) return false;
      if (!gameIdRef.current) return false;

      const currentGame = gameRef.current;
      const sourcePiece = currentGame.get(sourceSquare);
      if (!sourcePiece || sourcePiece.color !== playerColor) return false;

      const isLegalMove = currentGame
        .moves({ square: sourceSquare, verbose: true })
        .some((move) => move.to === targetSquare);

      if (!isLegalMove) {
        if (getMoveOptions(sourceSquare)) {
          setMoveFrom(sourceSquare);
        } else {
          clearSelection();
        }
        return false;
      }

      socket.emit("makeMove", {
        gameId: gameIdRef.current,
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      clearSelection();
      return true;
    },
    [
      clearSelection,
      gameOver,
      gameStarted,
      getMoveOptions,
      isPlayerTurn,
      playerColor,
      socket,
    ],
  );

  const isDraggablePiece = useCallback(
    (sourceSquare: Square) => {
      if (!gameStarted || gameOver || !isPlayerTurn) return false;
      const piece = gameRef.current.get(sourceSquare);
      return !!piece && piece.color === playerColor;
    },
    [gameOver, gameStarted, isPlayerTurn, playerColor],
  );

  const resign = useCallback(() => {
    if (!socket || !gameIdRef.current) return;
    socket.emit("resign", { gameId: gameIdRef.current });
  }, [socket]);

  const timeOut = useCallback(
    (isPlayer: boolean) => {
      if (!socket || !gameIdRef.current || !isPlayer) return;
      socket.emit("timeout", { gameId: gameIdRef.current });
    },
    [socket],
  );

  const leaveGame = useCallback(() => {
    if (socket && gameIdRef.current) {
      socket.emit("leaveGame", { gameId: gameIdRef.current });
    }
    resetGameState();
  }, [socket, resetGameState]);

  const resetToSetup = useCallback(() => {
    resetGameState();
  }, [resetGameState]);

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
    opponentName,
    opponentUserId,
    gameType,
    isRated,
    statusMessage,
    showGameOverModal,
    optionSquares,
    preMoveSquares: {},
    playerTime,
    opponentTime,
    setPlayerTime,
    setOpponentTime,
    isConnected,
    onSquareClick,
    onPieceDrop,
    onCancelSelection: clearSelection,
    isDraggablePiece,
    resign,
    timeOut,
    leaveGame,
    resetToSetup,
  };
}
