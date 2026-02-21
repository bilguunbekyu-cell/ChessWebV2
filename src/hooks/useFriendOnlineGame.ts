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
  elo?: {
    rated: boolean;
    applied: boolean;
    pool?: "bullet" | "blitz" | "rapid" | "classical";
    skippedReason?: string;
    white?: {
      userId: string;
      oldRating: number;
      newRating: number;
      delta: number;
      oldRd?: number;
      newRd?: number;
      oldVolatility?: number;
      newVolatility?: number;
      gamesPlayed: number;
      gamesWon: number;
      poolGamesPlayed?: number;
      isProvisional?: boolean;
      wasProvisional?: boolean;
    };
    black?: {
      userId: string;
      oldRating: number;
      newRating: number;
      delta: number;
      oldRd?: number;
      newRd?: number;
      oldVolatility?: number;
      newVolatility?: number;
      gamesPlayed: number;
      gamesWon: number;
      poolGamesPlayed?: number;
      isProvisional?: boolean;
      wasProvisional?: boolean;
    };
  };
}

export function useFriendOnlineGame() {
  const { user, setUser } = useAuthStore();
  const userRef = useRef(user);
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

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  const applyFriendGameStart = useCallback(
    (payload: FriendGameStartedPayload) => {
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

      const timeControl =
        payload.timeControl || defaultGameSettings.timeControl;
      setGameSettings({
        ...defaultGameSettings,
        playAs: payload.color === "w" ? "white" : "black",
        difficulty: 0,
        timeControl,
      });
      setPlayerTime(timeControl.initial);
      setOpponentTime(timeControl.initial);
    },
    [gameStarted],
  );

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

      const currentUser = userRef.current;
      if (!currentUser?.id || !payload.elo?.applied) return;

      const currentUserId = String(currentUser.id);
      const sideUpdate =
        payload.elo.white?.userId === currentUserId
          ? payload.elo.white
          : payload.elo.black?.userId === currentUserId
            ? payload.elo.black
            : playerColorRef.current === "w"
              ? payload.elo.white
              : payload.elo.black;

      if (!sideUpdate) return;
      const nextUser = {
        ...currentUser,
        rating: sideUpdate.newRating,
        gamesPlayed: sideUpdate.gamesPlayed,
        gamesWon: sideUpdate.gamesWon,
      };
      if (payload.elo.pool === "bullet") nextUser.bulletRating = sideUpdate.newRating;
      if (payload.elo.pool === "bullet") {
        nextUser.bulletGames = sideUpdate.poolGamesPlayed;
        nextUser.bulletRd = sideUpdate.newRd;
        nextUser.bulletVolatility = sideUpdate.newVolatility;
      }
      if (payload.elo.pool === "blitz") nextUser.blitzRating = sideUpdate.newRating;
      if (payload.elo.pool === "blitz") {
        nextUser.blitzGames = sideUpdate.poolGamesPlayed;
        nextUser.blitzRd = sideUpdate.newRd;
        nextUser.blitzVolatility = sideUpdate.newVolatility;
      }
      if (payload.elo.pool === "rapid") nextUser.rapidRating = sideUpdate.newRating;
      if (payload.elo.pool === "rapid") {
        nextUser.rapidGames = sideUpdate.poolGamesPlayed;
        nextUser.rapidRd = sideUpdate.newRd;
        nextUser.rapidVolatility = sideUpdate.newVolatility;
      }
      if (payload.elo.pool === "classical") {
        nextUser.classicalRating = sideUpdate.newRating;
        nextUser.classicalGames = sideUpdate.poolGamesPlayed;
        nextUser.classicalRd = sideUpdate.newRd;
        nextUser.classicalVolatility = sideUpdate.newVolatility;
      }
      setUser(nextUser);
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
  }, [socket, applyFriendGameStart, clearActiveGame, setUser]);

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
    const whitePreRating = Number(lastGameOver.elo?.white?.oldRating);
    const blackPreRating = Number(lastGameOver.elo?.black?.oldRating);
    const fallbackPlayerElo = user?.rating ?? 1200;
    const playerPreRating =
      playerColorRef.current === "w" ? whitePreRating : blackPreRating;
    const opponentPreRating =
      playerColorRef.current === "w" ? blackPreRating : whitePreRating;
    const whitePostRating = Number(lastGameOver.elo?.white?.newRating);
    const blackPostRating = Number(lastGameOver.elo?.black?.newRating);
    const playerPostRating =
      playerColorRef.current === "w" ? whitePostRating : blackPostRating;
    const opponentPostRating =
      playerColorRef.current === "w" ? blackPostRating : whitePostRating;
    const whitePreRd = Number(lastGameOver.elo?.white?.oldRd);
    const blackPreRd = Number(lastGameOver.elo?.black?.oldRd);
    const playerPreRd = playerColorRef.current === "w" ? whitePreRd : blackPreRd;
    const opponentPreRd =
      playerColorRef.current === "w" ? blackPreRd : whitePreRd;
    const whitePostRd = Number(lastGameOver.elo?.white?.newRd);
    const blackPostRd = Number(lastGameOver.elo?.black?.newRd);
    const playerPostRd =
      playerColorRef.current === "w" ? whitePostRd : blackPostRd;
    const opponentPostRd =
      playerColorRef.current === "w" ? blackPostRd : whitePostRd;
    const whitePreVolatility = Number(lastGameOver.elo?.white?.oldVolatility);
    const blackPreVolatility = Number(lastGameOver.elo?.black?.oldVolatility);
    const playerPreVolatility =
      playerColorRef.current === "w" ? whitePreVolatility : blackPreVolatility;
    const opponentPreVolatility =
      playerColorRef.current === "w"
        ? blackPreVolatility
        : whitePreVolatility;
    const whitePostVolatility = Number(lastGameOver.elo?.white?.newVolatility);
    const blackPostVolatility = Number(lastGameOver.elo?.black?.newVolatility);
    const playerPostVolatility =
      playerColorRef.current === "w"
        ? whitePostVolatility
        : blackPostVolatility;
    const opponentPostVolatility =
      playerColorRef.current === "w"
        ? blackPostVolatility
        : whitePostVolatility;
    const whiteDelta = Number(lastGameOver.elo?.white?.delta);
    const blackDelta = Number(lastGameOver.elo?.black?.delta);
    const whiteIsProvisional = lastGameOver.elo?.white?.isProvisional === true;
    const blackIsProvisional = lastGameOver.elo?.black?.isProvisional === true;
    const playerIsProvisional =
      playerColorRef.current === "w" ? whiteIsProvisional : blackIsProvisional;
    const opponentIsProvisional =
      playerColorRef.current === "w" ? blackIsProvisional : whiteIsProvisional;
    const playerDelta =
      playerColorRef.current === "w" ? whiteDelta : blackDelta;
    const opponentDelta =
      playerColorRef.current === "w" ? blackDelta : whiteDelta;
    const playerElo = Number.isFinite(playerPreRating)
      ? playerPreRating
      : fallbackPlayerElo;
    const opponentElo = Number.isFinite(opponentPreRating)
      ? opponentPreRating
      : 1200;
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
      rated: isRated,
      ratingBefore: Number.isFinite(playerPreRating)
        ? playerPreRating
        : undefined,
      ratingAfter: Number.isFinite(playerPostRating)
        ? playerPostRating
        : undefined,
      ratingDelta: Number.isFinite(playerDelta) ? playerDelta : undefined,
      ratingDeviationBefore: Number.isFinite(playerPreRd)
        ? playerPreRd
        : undefined,
      ratingDeviationAfter: Number.isFinite(playerPostRd)
        ? playerPostRd
        : undefined,
      ratingDeviationDelta:
        Number.isFinite(playerPreRd) && Number.isFinite(playerPostRd)
          ? playerPostRd - playerPreRd
          : undefined,
      volatilityBefore: Number.isFinite(playerPreVolatility)
        ? playerPreVolatility
        : undefined,
      volatilityAfter: Number.isFinite(playerPostVolatility)
        ? playerPostVolatility
        : undefined,
      volatilityDelta:
        Number.isFinite(playerPreVolatility) &&
        Number.isFinite(playerPostVolatility)
          ? playerPostVolatility - playerPreVolatility
          : undefined,
      isProvisional: playerIsProvisional,
      opponentRatingBefore: Number.isFinite(opponentPreRating)
        ? opponentPreRating
        : undefined,
      opponentRatingAfter: Number.isFinite(opponentPostRating)
        ? opponentPostRating
        : undefined,
      opponentRatingDelta: Number.isFinite(opponentDelta)
        ? opponentDelta
        : undefined,
      opponentRatingDeviationBefore: Number.isFinite(opponentPreRd)
        ? opponentPreRd
        : undefined,
      opponentRatingDeviationAfter: Number.isFinite(opponentPostRd)
        ? opponentPostRd
        : undefined,
      opponentRatingDeviationDelta:
        Number.isFinite(opponentPreRd) && Number.isFinite(opponentPostRd)
          ? opponentPostRd - opponentPreRd
          : undefined,
      opponentVolatilityBefore: Number.isFinite(opponentPreVolatility)
        ? opponentPreVolatility
        : undefined,
      opponentVolatilityAfter: Number.isFinite(opponentPostVolatility)
        ? opponentPostVolatility
        : undefined,
      opponentVolatilityDelta:
        Number.isFinite(opponentPreVolatility) &&
        Number.isFinite(opponentPostVolatility)
          ? opponentPostVolatility - opponentPreVolatility
          : undefined,
      opponentIsProvisional,
      ratingPool: lastGameOver.elo?.pool,
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
    isRated,
  ]);

  const clearSelection = useCallback(() => {
    setMoveFrom(null);
    setOptionSquares({});
  }, []);

  // ---------- promotion dialog state (click-to-move) ----------
  const [promotionToSquare, setPromotionToSquare] = useState<Square | null>(
    null,
  );
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromoFrom, setPendingPromoFrom] = useState<Square | null>(null);

  /** Extract promotion char from react-chessboard piece string ("wQ" → "q") */
  const extractPromo = (piece?: string): string => {
    if (!piece) return "q";
    const ch =
      piece.length === 2 ? piece[1].toLowerCase() : piece[0].toLowerCase();
    return ch === "q" || ch === "r" || ch === "b" || ch === "n" ? ch : "q";
  };

  const onPromotionPieceSelect = useCallback(
    (piece?: string, _fromSquare?: Square, _toSquare?: Square) => {
      const from = pendingPromoFrom;
      const to = promotionToSquare;

      setShowPromotionDialog(false);
      setPromotionToSquare(null);
      setPendingPromoFrom(null);

      if (!piece || !from || !to || !socket || !gameIdRef.current) return false;

      socket.emit("makeMove", {
        gameId: gameIdRef.current,
        from,
        to,
        promotion: extractPromo(piece),
      });
      clearSelection();
      return true;
    },
    [clearSelection, pendingPromoFrom, promotionToSquare, socket],
  );

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
        // Check for promotion
        const srcPiece = currentGame.get(moveFrom);
        const isPromo =
          srcPiece?.type === "p" &&
          ((srcPiece.color === "w" && square[1] === "8") ||
            (srcPiece.color === "b" && square[1] === "1"));

        if (isPromo) {
          setPendingPromoFrom(moveFrom);
          setPromotionToSquare(square);
          setShowPromotionDialog(true);
          clearSelection();
          return;
        }

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
    (sourceSquare: Square, targetSquare: Square, piece?: string) => {
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
        promotion: extractPromo(piece),
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
    promotionToSquare,
    showPromotionDialog,
    onPromotionPieceSelect,
    resign,
    timeOut,
    leaveGame,
    resetToSetup,
  };
}
