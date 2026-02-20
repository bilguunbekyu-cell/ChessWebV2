import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  applyMove,
  createInitialFourPlayerState,
  getLegalMoves,
  isPlayableSquare,
} from "./engine";
import {
  FourPlayerColor,
  FourPlayerMove,
  FourPlayerPlayers,
  FourPlayerState,
  Square,
} from "./types";

const socketBaseUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";
const SOCKET_URL = socketBaseUrl.replace(/\/api\/?$/, "");

const DEFAULT_PLAYERS: FourPlayerPlayers = {
  red: { name: "Red" },
  blue: { name: "Blue" },
  yellow: { name: "Yellow" },
  green: { name: "Green" },
};

interface TimeControl {
  initial: number;
  increment: number;
}

interface MatchFoundPayload {
  gameId: string;
  color: FourPlayerColor;
  state: FourPlayerState;
  players: FourPlayerPlayers;
  timeControl: TimeControl;
}

interface StatePayload {
  gameId: string;
  state: FourPlayerState;
  players?: FourPlayerPlayers;
  timeControl?: TimeControl;
  lastMove?: FourPlayerMove;
  systemMessage?: string;
}

export function useOnlineFourPlayerMatch() {
  const [gameState, setGameState] = useState<FourPlayerState>(() =>
    createInitialFourPlayerState(),
  );
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<FourPlayerColor>("red");
  const [players, setPlayers] = useState<FourPlayerPlayers>(DEFAULT_PLAYERS);
  const [timeControl, setTimeControl] = useState<TimeControl>({
    initial: 300,
    increment: 0,
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<FourPlayerMove | null>(null);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [forfeitedColor, setForfeitedColor] = useState<FourPlayerColor | null>(
    null,
  );

  const socketRef = useRef<Socket | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const playerNameRef = useRef("Player");

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    return getLegalMoves(gameState, selected);
  }, [gameState, selected]);

  const legalMoveSet = useMemo(
    () => new Set(legalMoves.map((sq) => `${sq.row},${sq.col}`)),
    [legalMoves],
  );

  const resetLocalState = useCallback(() => {
    setGameState(createInitialFourPlayerState());
    setGameId(null);
    gameIdRef.current = null;
    setPlayerColor("red");
    setPlayers(DEFAULT_PLAYERS);
    setGameStarted(false);
    setSelected(null);
    setLastMove(null);
    setSystemMessage(null);
    setGameOverReason(null);
    setForfeitedColor(null);
  }, []);

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

    socket.on("fourPlayerQueued", (payload: { waitingCount?: number }) => {
      const count = Number(payload?.waitingCount || 1);
      setIsSearching(true);
      setQueueStatus(`Searching players... ${Math.min(count, 4)}/4`);
    });

    socket.on("fourPlayerQueueCancelled", () => {
      setIsSearching(false);
      setQueueStatus("Search cancelled.");
    });

    socket.on("fourPlayerMatchFound", (payload: MatchFoundPayload) => {
      setIsSearching(false);
      setQueueStatus(null);
      setGameId(payload.gameId);
      gameIdRef.current = payload.gameId;
      setPlayerColor(payload.color);
      setGameState(payload.state);
      setPlayers(payload.players || DEFAULT_PLAYERS);
      setTimeControl(payload.timeControl || { initial: 300, increment: 0 });
      setSelected(null);
      setLastMove(null);
      setSystemMessage(null);
      setGameOverReason(null);
      setForfeitedColor(null);
      setGameStarted(true);
    });

    socket.on("fourPlayerState", (payload: StatePayload) => {
      if (!payload?.gameId || payload.gameId !== gameIdRef.current) return;
      setGameState(payload.state);
      if (payload.players) {
        setPlayers(payload.players);
      }
      if (payload.timeControl) {
        setTimeControl(payload.timeControl);
      }
      if (payload.lastMove) {
        setLastMove(payload.lastMove);
      }
      if (payload.systemMessage) {
        setSystemMessage(payload.systemMessage);
      }
      setSelected(null);
    });

    socket.on("fourPlayerMoveRejected", (payload: { reason?: string }) => {
      setQueueStatus(payload?.reason || "Move rejected.");
      setSelected(null);
    });

    socket.on(
      "fourPlayerGameOver",
      (payload: {
        gameId: string;
        reason?: string;
        state?: FourPlayerState;
        forfeitedColor?: FourPlayerColor;
      }) => {
        if (!payload?.gameId || payload.gameId !== gameIdRef.current) return;
        if (payload.state) {
          setGameState(payload.state);
        }
        setGameOverReason(payload.reason || "game_over");
        if (payload.forfeitedColor) {
          setForfeitedColor(payload.forfeitedColor);
        }
      },
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const startMatch = useCallback(
    (nextTimeControl: TimeControl, name?: string) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (!socket.connected) {
        setQueueStatus("Matchmaking server is offline.");
        setIsSearching(false);
        return;
      }

      playerNameRef.current = name || "Player";
      resetLocalState();
      setTimeControl(nextTimeControl);
      setIsSearching(true);
      setQueueStatus("Searching players... 1/4");
      socket.emit("findFourPlayerMatch", {
        name: playerNameRef.current,
        timeControl: nextTimeControl,
      });
    },
    [resetLocalState],
  );

  const cancelMatch = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("cancelFourPlayerFind");
    setIsSearching(false);
  }, []);

  const leaveGame = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("fourPlayerLeaveGame", { gameId: gameIdRef.current });
    resetLocalState();
  }, [resetLocalState]);

  const onSquareClick = useCallback(
    (row: number, col: number) => {
      if (!gameStarted || gameState.winner) return;
      if (!isPlayableSquare(row, col)) return;
      if (gameState.turn !== playerColor) return;

      const piece = gameState.board[row][col];
      if (selected) {
        const key = `${row},${col}`;
        if (legalMoveSet.has(key)) {
          const localResult = applyMove(gameState, selected, { row, col });
          const nextMove = localResult.moves[localResult.moves.length - 1] || null;
          if (nextMove) {
            setLastMove(nextMove);
          }

          socketRef.current?.emit("fourPlayerMove", {
            gameId: gameIdRef.current,
            from: selected,
            to: { row, col },
          });
          setSelected(null);
          return;
        }
      }

      if (piece && piece.color === playerColor) {
        setSelected({ row, col });
        return;
      }

      setSelected(null);
    },
    [gameStarted, gameState, legalMoveSet, playerColor, selected],
  );

  const rematch = useCallback(() => {
    startMatch(timeControl, playerNameRef.current);
  }, [startMatch, timeControl]);

  return {
    gameState,
    gameId,
    gameStarted,
    playerColor,
    players,
    timeControl,
    isSearching,
    isConnected,
    queueStatus,
    selected,
    legalMoveSet,
    lastMove,
    systemMessage,
    gameOverReason,
    forfeitedColor,

    startMatch,
    cancelMatch,
    leaveGame,
    onSquareClick,
    rematch,
    resetLocalState,
  };
}
