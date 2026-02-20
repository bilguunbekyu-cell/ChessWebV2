import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Timer, Users } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BOARD_FRAME, TIME_OPTIONS } from "../quickMatch/types";
import {
  createInitialFourPlayerState,
  formatMoveText,
  FOUR_PLAYER_BOARD_SIZE,
  isPlayableSquare,
} from "./engine";
import { PieceIcon } from "./PieceIcon";
import { useOnlineFourPlayerMatch } from "./useOnlineFourPlayerMatch";
import { FourPlayerColor, FourPlayerPlayers, FourPlayerState } from "./types";

interface TimeControl {
  initial: number;
  increment: number;
}

function getTimeControlFromState(state: unknown): TimeControl | null {
  if (!state || typeof state !== "object") return null;
  const maybeState = state as { initial?: unknown; increment?: unknown };
  if (
    typeof maybeState.initial === "number" &&
    typeof maybeState.increment === "number"
  ) {
    return {
      initial: maybeState.initial,
      increment: maybeState.increment,
    };
  }
  return null;
}

function getTimeControlFromSearch(search: string): TimeControl | null {
  const params = new URLSearchParams(search);
  const initial = Number(params.get("initial"));
  const increment = Number(params.get("increment"));
  if (Number.isFinite(initial) && Number.isFinite(increment)) {
    return { initial, increment };
  }
  return null;
}

function getAutoStartFromState(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  return (state as { autoStart?: unknown }).autoStart === true;
}

function getAutoStartFromSearch(search: string): boolean {
  const value = new URLSearchParams(search).get("autostart");
  return value === "1" || value === "true";
}

const COLOR_LABEL_CLASS: Record<FourPlayerColor, string> = {
  red: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30",
  blue: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30",
  yellow:
    "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/30",
  green:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
};

const COLOR_RING_CLASS: Record<FourPlayerColor, string> = {
  red: "ring-rose-400",
  blue: "ring-sky-400",
  yellow: "ring-amber-400",
  green: "ring-emerald-400",
};

function FourPlayerBoard({
  state,
  selected,
  legalMoveSet,
  lastMoveFrom,
  lastMoveTo,
  onSquareClick,
  boardWidth,
  interactive,
}: {
  state: FourPlayerState;
  selected: string | null;
  legalMoveSet: Set<string>;
  lastMoveFrom: string | null;
  lastMoveTo: string | null;
  onSquareClick: (row: number, col: number) => void;
  boardWidth: number;
  interactive: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-gray-200/70 dark:border-white/10 shadow-xl bg-gray-200/20 dark:bg-black/20"
      style={{ width: boardWidth + BOARD_FRAME, height: boardWidth + BOARD_FRAME }}
    >
      <div
        className="m-2 rounded-xl overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${FOUR_PLAYER_BOARD_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: FOUR_PLAYER_BOARD_SIZE }).map((_, row) =>
          Array.from({ length: FOUR_PLAYER_BOARD_SIZE }).map((_, col) => {
            const key = `${row},${col}`;
            const playable = isPlayableSquare(row, col);
            const piece = playable ? state.board[row][col] : null;
            const isSelected = selected === key;
            const isLegal = legalMoveSet.has(key);
            const isLastFrom = lastMoveFrom === key;
            const isLastTo = lastMoveTo === key;
            const isDark = (row + col) % 2 === 1;

            if (!playable) {
              return (
                <div
                  key={key}
                  className="bg-transparent pointer-events-none aspect-square"
                />
              );
            }

            return (
              <button
                type="button"
                key={key}
                onClick={() => onSquareClick(row, col)}
                disabled={!interactive}
                className={`relative aspect-square flex items-center justify-center transition-colors ${
                  isDark ? "bg-[#769656]" : "bg-[#eeeed2]"
                } ${
                  isLastFrom
                    ? "ring-2 ring-yellow-300/70 ring-inset"
                    : isLastTo
                      ? "ring-2 ring-emerald-300/70 ring-inset"
                      : ""
                } ${isSelected ? "ring-2 ring-cyan-400 ring-inset" : ""}`}
              >
                {isLegal && (
                  <span
                    className={`absolute ${
                      piece
                        ? "w-[40%] h-[40%] border-2 border-cyan-300/85 rounded-full"
                        : "w-[23%] h-[23%] rounded-full bg-cyan-400/75"
                    }`}
                  />
                )}
                {piece && (
                  <PieceIcon
                    type={piece.type}
                    color={piece.color}
                    className="w-[86%] h-[86%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function PlayersGrid({
  players,
  turn,
  eliminated,
  you,
}: {
  players: FourPlayerPlayers;
  turn: FourPlayerColor;
  eliminated: FourPlayerColor[];
  you: FourPlayerColor;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["red", "blue", "yellow", "green"] as FourPlayerColor[]).map((color) => {
        const isOut = eliminated.includes(color);
        const isTurn = turn === color;
        const isYou = you === color;
        return (
          <div
            key={color}
            className={`rounded-xl border px-3 py-2 ${COLOR_LABEL_CLASS[color]} ${
              isTurn ? `ring-2 ${COLOR_RING_CLASS[color]}` : ""
            } ${isOut ? "opacity-45 line-through" : ""}`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide">
              {color}
              {isYou ? " (You)" : ""}
            </div>
            <div className="text-xs mt-0.5 truncate">{players[color]?.name || color}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function FourPlayerChess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    gameState,
    gameStarted,
    playerColor,
    players,
    isSearching,
    isConnected,
    queueStatus,
    selected,
    legalMoveSet,
    lastMove,
    systemMessage,
    gameOverReason,
    startMatch,
    cancelMatch,
    leaveGame,
    onSquareClick,
    rematch,
    resetLocalState,
  } = useOnlineFourPlayerMatch();

  const [timeControl, setTimeControl] = useState<TimeControl>(() => {
    return (
      getTimeControlFromState(location.state) ||
      getTimeControlFromSearch(location.search) || {
        initial: 300,
        increment: 0,
      }
    );
  });

  useEffect(() => {
    const next =
      getTimeControlFromState(location.state) ||
      getTimeControlFromSearch(location.search);
    if (next) setTimeControl(next);
  }, [location.search, location.state]);

  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!isSearching) {
      setSearchElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setSearchElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isSearching]);

  const autoStartRequested =
    getAutoStartFromState(location.state) || getAutoStartFromSearch(location.search);
  const autoStartHandledRef = useRef(false);
  const [pendingAutoStart, setPendingAutoStart] = useState(autoStartRequested);

  useEffect(() => {
    autoStartHandledRef.current = false;
    setPendingAutoStart(autoStartRequested);
  }, [autoStartRequested, location.key]);

  useEffect(() => {
    if (!pendingAutoStart || autoStartHandledRef.current) return;
    if (gameStarted || isSearching) {
      autoStartHandledRef.current = true;
      setPendingAutoStart(false);
      return;
    }
    if (!isConnected) return;

    autoStartHandledRef.current = true;
    startMatch(timeControl, user?.fullName || "Player");
  }, [
    gameStarted,
    isConnected,
    isSearching,
    pendingAutoStart,
    startMatch,
    timeControl,
    user?.fullName,
  ]);

  const [boardWidth, setBoardWidth] = useState(650);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = boardAreaRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.floor(Math.min(rect.width - 18, rect.height - 18));
      setBoardWidth(Math.max(260, Math.min(size, 780)));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(container);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const previewState = useMemo(() => createInitialFourPlayerState(), []);
  const selectedKey = selected ? `${selected.row},${selected.col}` : null;
  const lastMoveFrom = lastMove ? `${lastMove.from.row},${lastMove.from.col}` : null;
  const lastMoveTo = lastMove ? `${lastMove.to.row},${lastMove.to.col}` : null;

  const selectedTimeOption = TIME_OPTIONS.find(
    (opt) =>
      opt.initial === timeControl.initial && opt.increment === timeControl.increment,
  );

  const handleStartMatch = () => {
    const params = new URLSearchParams({
      initial: String(timeControl.initial),
      increment: String(timeControl.increment),
    });
    navigate(`/play/four-player?${params.toString()}`, {
      replace: true,
      state: { ...timeControl },
    });
    setPendingAutoStart(false);
    startMatch(timeControl, user?.fullName || "Player");
  };

  const handleCancelSearch = () => {
    setPendingAutoStart(false);
    cancelMatch();
  };

  const handlePlayAgain = () => {
    if (!gameState.winner) {
      leaveGame();
    }
    rematch();
  };

  const handleNewSearch = () => {
    leaveGame();
    resetLocalState();
  };

  if (!gameStarted) {
    return (
      <div className="relative h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] gap-2 p-2">
          <div ref={boardAreaRef} className="min-w-0 min-h-0 flex items-center justify-center">
            <FourPlayerBoard
              state={previewState}
              selected={null}
              legalMoveSet={new Set()}
              lastMoveFrom={null}
              lastMoveTo={null}
              onSquareClick={() => {}}
              boardWidth={boardWidth}
              interactive={false}
            />
          </div>

          <div className="min-w-0 rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 shadow-2xl backdrop-blur-lg flex flex-col min-h-0 overflow-hidden">
            {isSearching ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-[320px] rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-7 text-center shadow-lg">
                  <Timer className="w-10 h-10 mx-auto text-gray-700 dark:text-gray-200" />
                  <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                    {searchElapsedSeconds}s
                  </p>
                  <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
                    {queueStatus || "Searching 4-player match..."}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelSearch}
                    className="mt-7 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200/60 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-500" />
                      <h2 className="font-bold text-base text-gray-900 dark:text-white">
                        4-Player Online
                      </h2>
                    </div>
                    <span className="text-[11px] rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300 px-2 py-0.5 font-semibold">
                      {selectedTimeOption?.label || "5+0"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Queue with 3 more players and start instantly.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <Clock className="w-4 h-4 text-teal-500" />
                      <span>Time Control</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TIME_OPTIONS.map((opt) => {
                        const isSelected =
                          timeControl.initial === opt.initial &&
                          timeControl.increment === opt.increment;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setTimeControl({
                                initial: opt.initial,
                                increment: opt.increment,
                              })
                            }
                            className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                              isSelected
                                ? "bg-teal-500 text-white ring-2 ring-teal-500"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {queueStatus && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 px-1">
                      {queueStatus}
                    </p>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleStartMatch}
                    disabled={!isConnected}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-base transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isConnected ? "Search Match" : "Server Offline"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.turn === playerColor && !gameState.winner;
  const youWin = gameState.winner === playerColor;

  return (
    <div className="relative h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {gameState.winner && (
        <div className="absolute inset-0 z-30 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 text-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">
              {youWin ? "You Win" : `${gameState.winner.toUpperCase()} Wins`}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              {gameOverReason ? `Reason: ${gameOverReason}` : "Match finished."}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handlePlayAgain}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 font-semibold"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={handleNewSearch}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold"
              >
                New Search
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] gap-2 p-2">
        <div ref={boardAreaRef} className="min-w-0 rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 shadow-xl backdrop-blur-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                leaveGame();
                navigate("/play/variants");
              }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Variants
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                4-Player Chess Online
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You are {playerColor.toUpperCase()}
              </p>
            </div>
            <div
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                isMyTurn
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
              }`}
            >
              {isMyTurn ? "Your Turn" : `${gameState.turn.toUpperCase()} to move`}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center">
            <FourPlayerBoard
              state={gameState}
              selected={selectedKey}
              legalMoveSet={legalMoveSet}
              lastMoveFrom={lastMoveFrom}
              lastMoveTo={lastMoveTo}
              onSquareClick={onSquareClick}
              boardWidth={boardWidth}
              interactive
            />
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-xl backdrop-blur-lg p-4 flex flex-col min-h-0">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Match Info</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Playing as {players[playerColor]?.name || user?.fullName || "You"}.
            </p>
          </div>

          <PlayersGrid
            players={players}
            turn={gameState.turn}
            eliminated={gameState.eliminated}
            you={playerColor}
          />

          {(systemMessage || queueStatus) && (
            <div className="mt-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
              {systemMessage || queueStatus}
            </div>
          )}

          <div className="flex-1 min-h-0 mt-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-950/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Move Log
            </div>
            <div className="h-full max-h-[48vh] overflow-y-auto p-2 space-y-1 text-xs font-mono text-gray-700 dark:text-gray-200">
              {gameState.moves.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No moves yet.</p>
              ) : (
                gameState.moves
                  .slice()
                  .reverse()
                  .map((move, index) => (
                    <div
                      key={`${move.from.row}-${move.from.col}-${move.to.row}-${move.to.col}-${index}`}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800/70"
                    >
                      {gameState.moves.length - index}. {formatMoveText(move)}
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePlayAgain}
              className="py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={() => {
                leaveGame();
                navigate("/play/variants");
              }}
              className="py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
