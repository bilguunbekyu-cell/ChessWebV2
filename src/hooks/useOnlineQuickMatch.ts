import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import { io, Socket } from "socket.io-client";
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

const socketBaseUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";
const SOCKET_URL = socketBaseUrl.replace(/\/api\/?$/, "");
const BOARD_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type PlayerColor = "w" | "b";
type MatchVariant = "standard" | "chess960";
type GameOverReason =
  | "checkmate"
  | "draw"
  | "resign"
  | "timeout"
  | "opponent_left";

interface MatchFoundPayload {
  gameId: string;
  color: PlayerColor;
  fen: string;
  opponentName?: string;
  timeControl?: { initial: number; increment: number };
  variant?: MatchVariant;
}

interface MoveAppliedPayload {
  gameId: string;
  move: { from: Square; to: Square; san: string };
  fen: string;
  turn: PlayerColor;
  isChess960Castle?: boolean;
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

function normalizeMatchVariant(value: unknown): MatchVariant {
  if (typeof value !== "string") return "standard";
  return value.trim().toLowerCase() === "chess960" ? "chess960" : "standard";
}

export function useOnlineQuickMatch() {
  const { user, setUser } = useAuthStore();
  const userRef = useRef(user);
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
  const [opponentName, setOpponentName] = useState("Opponent");
  const [isSearching, setIsSearching] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchVariant, setMatchVariant] = useState<MatchVariant>("standard");
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<OptionSquares>({});
  const [playerTime, setPlayerTime] = useState(
    defaultGameSettings.timeControl.initial,
  );
  const [opponentTime, setOpponentTime] = useState(
    defaultGameSettings.timeControl.initial,
  );

  const socketRef = useRef<Socket | null>(null);
  const playerNameRef = useRef<string>("Player");
  const gameIdRef = useRef<string | null>(null);
  const playerColorRef = useRef<PlayerColor>("w");
  const startTimeRef = useRef<number | null>(null);
  const historySavedRef = useRef(false);
  const [lastGameOver, setLastGameOver] = useState<GameOverPayload | null>(
    null,
  );
  const saveGameHistory = useSaveGameHistory();

  const getMoveOptions = useMoveOptions(gameRef, setOptionSquares);
  const isPlayerTurn = game.turn() === playerColor;

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
    setOpponentName("Opponent");
    setPlayerColor("w");
    playerColorRef.current = "w";
    startTimeRef.current = null;
    historySavedRef.current = false;
    setLastGameOver(null);
  }, []);

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

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setQueueStatus(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsSearching(false);
      setQueueStatus("Disconnected from server.");
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
      setIsSearching(false);
      setQueueStatus("Unable to connect to matchmaking server.");
    });

    socket.on(
      "queued",
      (payload?: { ratingRange?: number; pool?: string; playerRating?: number }) => {
      setIsSearching(true);
        const range = Number(payload?.ratingRange);
        if (Number.isFinite(range) && range > 0) {
          setQueueStatus(`Searching for opponent (±${Math.round(range)})...`);
        } else {
          setQueueStatus("Searching for opponent...");
        }
      },
    );

    socket.on("queueCancelled", () => {
      setIsSearching(false);
      setQueueStatus("Search cancelled.");
    });

    socket.on("matchFound", (payload: MatchFoundPayload) => {
      const nextGame = new Chess(payload.fen);
      gameRef.current = nextGame;
      setGame(nextGame);
      setMatchVariant(normalizeMatchVariant(payload.variant));
      setMoves([]);
      setLastMove(null);
      setGameId(payload.gameId);
      gameIdRef.current = payload.gameId;
      setPlayerColor(payload.color);
      playerColorRef.current = payload.color;
      setOpponentName(payload.opponentName || "Opponent");
      setGameStarted(true);
      setGameOver(false);
      setGameResult(null);
      setShowGameOverModal(false);
      setIsSearching(false);
      setQueueStatus(null);
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
    });

    socket.on("moveApplied", (payload: MoveAppliedPayload) => {
      if (payload.gameId !== gameIdRef.current) return;

      if (payload.isChess960Castle) {
        const nextGame = new Chess(payload.fen);
        gameRef.current = nextGame;
        setGame(nextGame);
        setMoves((prev) => [...prev, payload.move.san]);
        setLastMove({ from: payload.move.from, to: payload.move.to });
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }

      const currentGame = gameRef.current;
      const applied = currentGame.move({
        from: payload.move.from,
        to: payload.move.to,
        promotion: (payload.move as any).promotion || "q",
      });

      if (applied) {
        gameRef.current = currentGame;
        setGame(new Chess(currentGame.fen()));
        setMoves((prev) => [...prev, payload.move.san || applied.san]);
      } else {
        const nextGame = new Chess(payload.fen);
        gameRef.current = nextGame;
        setGame(nextGame);
        setMoves((prev) => [...prev, payload.move.san]);
      }
      setLastMove({ from: payload.move.from, to: payload.move.to });
      setMoveFrom(null);
      setOptionSquares({});
    });

    socket.on("moveRejected", (payload: { reason?: string }) => {
      setQueueStatus(payload?.reason || "Move rejected.");
    });

    socket.on("gameOver", (payload: GameOverPayload) => {
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
    });

    socket.on("opponentLeft", () => {
      setGameOver(true);
      setShowGameOverModal(true);
      setGameResult("Opponent left. You win.");
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [setUser]);

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

    const playerName = playerNameRef.current || "Player";
    const opponent = opponentName || "Opponent";
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
      event: matchVariant === "chess960" ? "Live Chess960" : "Live Chess",
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
      rated: true,
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
    user?.rating,
    matchVariant,
  ]);

  const startMatch = useCallback(
    (
      timeControl: { initial: number; increment: number },
      name?: string,
      variant: MatchVariant = "standard",
    ) => {
      if (!socketRef.current) return;
      if (!socketRef.current.connected) {
        setIsSearching(false);
        setQueueStatus("Matchmaking server is offline.");
        return;
      }
      const normalizedVariant = normalizeMatchVariant(variant);
      playerNameRef.current = name || "Player";
      resetGameState();
      setMatchVariant(normalizedVariant);
      setIsSearching(true);
      setQueueStatus("Searching for opponent...");
      setGameSettings({
        ...defaultGameSettings,
        playAs: "white",
        difficulty: 0,
        timeControl,
      });
      setPlayerTime(timeControl.initial);
      setOpponentTime(timeControl.initial);
      socketRef.current.emit("findMatch", {
        name: playerNameRef.current,
        timeControl,
        variant: normalizedVariant,
      });
    },
    [resetGameState],
  );

  const cancelMatch = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("cancelFind");
    setIsSearching(false);
  }, []);

  const resign = useCallback(() => {
    if (!socketRef.current || !gameId) return;
    socketRef.current.emit("resign", { gameId });
  }, [gameId]);

  const timeOut = useCallback(
    (isPlayer: boolean) => {
      if (!socketRef.current || !gameId) return;
      if (!isPlayer) return;
      socketRef.current.emit("timeout", { gameId });
    },
    [gameId],
  );

  const leaveGame = useCallback(() => {
    if (!socketRef.current || !gameId) return;
    socketRef.current.emit("leaveGame", { gameId });
    resetGameState();
  }, [gameId, resetGameState]);

  const addChess960CastlingTargets = useCallback(
    (currentGame: Chess, kingSquare: Square) => {
      if (matchVariant !== "chess960") return;

      const kingPiece = currentGame.get(kingSquare);
      if (
        !kingPiece ||
        kingPiece.color !== playerColor ||
        kingPiece.type !== "k"
      ) {
        return;
      }

      const rank = kingSquare[1];
      const extraSquares: OptionSquares = {};

      BOARD_FILES.forEach((file) => {
        const candidateSquare = `${file}${rank}` as Square;
        if (candidateSquare === kingSquare) return;
        const candidatePiece = currentGame.get(candidateSquare);
        if (
          candidatePiece &&
          candidatePiece.color === playerColor &&
          candidatePiece.type === "r"
        ) {
          extraSquares[candidateSquare] = {
            background:
              "radial-gradient(circle, rgba(20, 184, 166, 0.35) 45%, transparent 47%)",
            borderRadius: "50%",
          };
        }
      });

      if (Object.keys(extraSquares).length === 0) return;
      setOptionSquares((prev) => ({ ...prev, ...extraSquares }));
    },
    [matchVariant, playerColor],
  );

  const isChess960CastlingDrop = useCallback(
    (currentGame: Chess, sourceSquare: Square, targetSquare: Square) => {
      if (matchVariant !== "chess960") return false;

      const kingPiece = currentGame.get(sourceSquare);
      if (
        !kingPiece ||
        kingPiece.color !== playerColor ||
        kingPiece.type !== "k"
      ) {
        return false;
      }

      if (sourceSquare[1] !== targetSquare[1]) return false;

      const targetPiece = currentGame.get(targetSquare);
      return (
        !!targetPiece &&
        targetPiece.color === playerColor &&
        targetPiece.type === "r"
      );
    },
    [matchVariant, playerColor],
  );

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

      if (!piece || !from || !to) return false;
      if (!gameIdRef.current) return false;

      socketRef.current?.emit("makeMove", {
        gameId: gameIdRef.current,
        from,
        to,
        promotion: extractPromo(piece),
      });
      clearSelection();
      return true;
    },
    [clearSelection, pendingPromoFrom, promotionToSquare],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!gameStarted || gameOver) return;
      if (!isPlayerTurn) return;

      const currentGame = gameRef.current;

      if (!moveFrom) {
        const piece = currentGame.get(square);
        if (!piece || piece.color !== playerColor) return;
        setMoveFrom(square);
        getMoveOptions(square);
        addChess960CastlingTargets(currentGame, square);
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

        socketRef.current?.emit("makeMove", {
          gameId,
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
        addChess960CastlingTargets(currentGame, square);
        return;
      }

      clearSelection();
    },
    [
      clearSelection,
      gameId,
      gameOver,
      gameStarted,
      addChess960CastlingTargets,
      getMoveOptions,
      isPlayerTurn,
      moveFrom,
      optionSquares,
      playerColor,
    ],
  );

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece?: string) => {
      if (!gameStarted || gameOver) return false;
      if (!isPlayerTurn) return false;
      if (!gameIdRef.current) return false;

      const currentGame = gameRef.current;
      const sourcePiece = currentGame.get(sourceSquare);
      if (!sourcePiece || sourcePiece.color !== playerColor) return false;

      const isLegalStandardMove = currentGame
        .moves({ square: sourceSquare, verbose: true })
        .some((move) => move.to === targetSquare);
      const isLegalChess960Castle = isChess960CastlingDrop(
        currentGame,
        sourceSquare,
        targetSquare,
      );

      if (!isLegalStandardMove && !isLegalChess960Castle) {
        if (getMoveOptions(sourceSquare)) {
          setMoveFrom(sourceSquare);
          addChess960CastlingTargets(currentGame, sourceSquare);
        } else {
          clearSelection();
        }
        return false;
      }

      socketRef.current?.emit("makeMove", {
        gameId: gameIdRef.current,
        from: sourceSquare,
        to: targetSquare,
        promotion: extractPromo(piece),
      });
      clearSelection();
      return true;
    },
    [
      addChess960CastlingTargets,
      clearSelection,
      gameOver,
      gameStarted,
      getMoveOptions,
      isChess960CastlingDrop,
      isPlayerTurn,
      playerColor,
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

  const rematch = useCallback(() => {
    startMatch(gameSettings.timeControl, playerNameRef.current, matchVariant);
  }, [gameSettings.timeControl, matchVariant, startMatch]);

  return {
    // Game state
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

    // UI state
    showGameOverModal,
    optionSquares,
    preMoveSquares: {},
    playerTime,
    opponentTime,
    setPlayerTime,
    setOpponentTime,
    isSearching,
    queueStatus,
    isConnected,
    matchVariant,

    // Handlers
    onSquareClick,
    onPieceDrop,
    onCancelSelection: clearSelection,
    isDraggablePiece,
    promotionToSquare,
    showPromotionDialog,
    onPromotionPieceSelect,
    startMatch,
    cancelMatch,
    resign,
    timeOut,
    rematch,
    leaveGame,
  };
}
