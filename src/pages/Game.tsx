import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Zap, Bot, Users, Brain, Trophy } from "lucide-react";
import { useStockfishGame } from "../hooks/useStockfishGame";
import {
  GameOverModal,
  PlayerInfo,
  GameBoard,
  GameSidebar,
} from "../components/game";
import type { GameSettings } from "../components/game";
import { defaultGameSettings } from "../hooks/useStockfishGameTypes";
import { useAuthStore } from "../store/authStore";

export default function Game() {
  const { user } = useAuthStore();
  const {
    // Game state
    game,
    moves,
    gameSettings,
    gameStarted,
    gameOver,
    gameResult,
    isPlayerTurn,
    savedGameId,
    opening,
    openingLoading,

    // UI state
    showGameOverModal,
    optionSquares,
    preMoveSquares,
    setPlayerTime,
    setOpponentTime,

    // Handlers
    onSquareClick,
    handleStartGame,
    handleResign,
    handleTimeOut,
  } = useStockfishGame();

  const navigate = useNavigate();

  const [matchSettings, setMatchSettings] =
    useState<GameSettings>(defaultGameSettings);

  useEffect(() => {
    setMatchSettings((prev) => ({
      ...prev,
      ...gameSettings,
      selectedBot: undefined,
    }));
  }, [gameSettings]);

  // Responsive board width based on available viewport and layout
  const [boardWidth, setBoardWidth] = useState(900);
  const BOARD_FRAME = 16; // extra pixels added by board container padding
  const containerRef = useRef<HTMLDivElement>(null);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const bottomInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const isWide = window.innerWidth >= 1024;
      const topH = topInfoRef.current?.getBoundingClientRect().height ?? 80;
      const bottomH =
        bottomInfoRef.current?.getBoundingClientRect().height ?? 80;
      // Board takes about 55% of width on large screens, sidebar gets the rest
      const maxBoardWidth = isWide ? rect.width * 0.55 : rect.width;
      const columnGap = isWide ? 16 : 8;
      const verticalGap = 12; // gap between player info and board
      const padding = isWide ? 32 : 24; // container padding allowance
      const availableWidth = maxBoardWidth - columnGap - padding - BOARD_FRAME;
      const availableHeight =
        rect.height - topH - bottomH - verticalGap * 2 - padding;
      const size = Math.floor(Math.min(availableWidth, availableHeight));
      setBoardWidth(Math.max(360, Math.min(size, 720)));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    if (topInfoRef.current) observer.observe(topInfoRef.current);
    if (bottomInfoRef.current) observer.observe(bottomInfoRef.current);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const timeOptions = [
    { label: "3+0", initial: 180, increment: 0 },
    { label: "5+0", initial: 300, increment: 0 },
    { label: "5+3", initial: 300, increment: 3 },
    { label: "10+5", initial: 600, increment: 5 },
    { label: "∞", initial: 0, increment: 0 },
  ];

  const startMatch = () =>
    handleStartGame({
      ...matchSettings,
      selectedBot: undefined,
    });

  const quickRematch = () =>
    handleStartGame({
      ...gameSettings,
      selectedBot: undefined,
    });

  const statusLabel = gameOver
    ? "Game over"
    : gameStarted
      ? "In progress"
      : "Not started";

  const quickActions = [
    {
      title: "Quick Match",
      description: "Start a game with your saved settings.",
      icon: Gamepad2,
      accent: "from-teal-500/80 to-emerald-500/80",
      onClick: startMatch,
    },
    {
      title: "Bot Personalities",
      description: "Pick themed engines on the Bots page (coming soon).",
      icon: Bot,
      accent: "from-slate-600/80 to-slate-800/80",
      disabled: true,
    },
    {
      title: "Play a Friend",
      description: "Create a private table from Community.",
      icon: Users,
      accent: "from-sky-500/80 to-indigo-500/80",
      onClick: () => navigate("/community"),
    },
    {
      title: "Train & Learn",
      description: "Jump to lessons and tactics.",
      icon: Brain,
      accent: "from-amber-500/90 to-orange-500/80",
      onClick: () => navigate("/learn"),
    },
    {
      title: "Events & Ladders",
      description: "Check live arenas from your dashboard.",
      icon: Trophy,
      accent: "from-purple-500/80 to-fuchsia-500/80",
      onClick: () => navigate("/"),
    },
  ];

  return (
    <div className="relative h-full w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      <div
        ref={containerRef}
        className="relative h-full w-full flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-4 px-2 sm:px-3 lg:px-4 py-3 lg:py-4 overflow-hidden"
      >
        {/* Game Over Modal */}
        <GameOverModal
          isOpen={showGameOverModal}
          result={gameResult}
          onNewGame={quickRematch}
          savedGameId={savedGameId}
        />

        {/* Main Game Area */}
        <div className="flex flex-col items-start gap-2 sm:gap-3 flex-shrink-0">
          {/* Opponent Info */}
          <div
            ref={topInfoRef}
            className="flex-shrink-0 z-10"
            style={{ width: boardWidth + BOARD_FRAME }}
          >
            <PlayerInfo
              name="Stockfish"
              subtitle={`Engine level ${gameSettings.difficulty}`}
              avatarLetter="S"
              avatarStyle="opponent"
              initialTime={gameSettings.timeControl.initial}
              increment={gameSettings.timeControl.increment}
              isTimerActive={
                gameStarted &&
                !isPlayerTurn &&
                !gameOver &&
                gameSettings.timeControl.initial > 0
              }
              onTimeOut={() => handleTimeOut(false)}
              onTimeChange={setOpponentTime}
            />
          </div>

          {/* Chessboard */}
          <div className="flex-shrink-0">
            <div
              className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-gray-200/60 dark:border-white/5 shadow-xl p-2"
              style={{ width: boardWidth + BOARD_FRAME }} // BOARD_FRAME accounts for p-2 padding (8px each side)
            >
              <GameBoard
                fen={game.fen()}
                boardWidth={boardWidth}
                boardOrientation={gameSettings.playAs}
                onSquareClick={onSquareClick}
                customSquareStyles={{ ...optionSquares, ...preMoveSquares }}
              />
            </div>
          </div>

          {/* Player Info */}
          <div
            ref={bottomInfoRef}
            className="flex-shrink-0 z-10"
            style={{ width: boardWidth + BOARD_FRAME }}
          >
            <PlayerInfo
              name={user?.fullName || "You"}
              subtitle={gameSettings.playAs === "white" ? "White" : "Black"}
              avatarLetter={
                user?.fullName?.substring(0, 2).toUpperCase() || "U"
              }
              avatarImage={user?.avatar}
              avatarStyle="player"
              initialTime={gameSettings.timeControl.initial}
              increment={gameSettings.timeControl.increment}
              isTimerActive={
                gameStarted &&
                isPlayerTurn &&
                !gameOver &&
                gameSettings.timeControl.initial > 0
              }
              onTimeOut={() => handleTimeOut(true)}
              onTimeChange={setPlayerTime}
            />
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:flex-1 lg:h-full min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div className="rounded-3xl border border-white/10 bg-white/70 dark:bg-slate-900/80 shadow-2xl backdrop-blur-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-600 dark:text-teal-300 font-semibold">
                  Play
                </p>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-teal-500" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Play Chess
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pick a mode or tune settings, then start your match.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  gameOver
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : gameStarted
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`w-full text-left rounded-2xl border border-white/10 bg-gradient-to-r ${action.accent} p-[1px] shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="rounded-[14px] bg-white/80 dark:bg-slate-950/80 px-4 py-3 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-white/5 shadow-inner">
                      <action.icon className="w-5 h-5 text-gray-800 dark:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {action.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {action.description}
                      </div>
                    </div>
                    {!action.disabled && (
                      <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-300">
                        Go
                      </span>
                    )}
                    {action.disabled && (
                      <span className="text-[11px] font-semibold text-amber-500">
                        Soon
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/70 dark:bg-slate-900/80 shadow-2xl backdrop-blur-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-teal-600 dark:text-teal-300 font-semibold">
                  Match setup
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Customize & start
                </h3>
              </div>
              <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Engine lvl {matchSettings.difficulty}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                Time control
              </div>
              <div className="grid grid-cols-3 gap-2">
                {timeOptions.map((opt) => {
                  const isActive =
                    matchSettings.timeControl.initial === opt.initial &&
                    matchSettings.timeControl.increment === opt.increment;
                  return (
                    <button
                      key={opt.label}
                      onClick={() =>
                        setMatchSettings((prev) => ({
                          ...prev,
                          timeControl: {
                            initial: opt.initial,
                            increment: opt.increment,
                          },
                        }))
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                        isActive
                          ? "bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20"
                          : "bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-white/40 dark:border-white/10 hover:border-teal-500/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                Color
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["white", "black"] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() =>
                      setMatchSettings((prev) => ({ ...prev, playAs: side }))
                    }
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border transition-all ${
                      matchSettings.playAs === side
                        ? "border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-500/20"
                        : "border-white/30 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:border-teal-500/50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border ${
                        side === "white"
                          ? "bg-white border-gray-300"
                          : "bg-gray-900 border-gray-700"
                      }`}
                    />
                    {side === "white" ? "Play White" : "Play Black"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                  Engine strength
                </div>
                <span className="text-sm font-semibold text-teal-500 dark:text-teal-300">
                  {matchSettings.difficulty}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={matchSettings.difficulty}
                onChange={(e) =>
                  setMatchSettings((prev) => ({
                    ...prev,
                    difficulty: Number(e.target.value),
                  }))
                }
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Relaxed</span>
                <span>Challenging</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startMatch}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/30 hover:translate-y-[-1px] transition-transform"
              >
                <Zap className="w-4 h-4" />
                Start / Restart
              </button>
              <button
                onClick={handleResign}
                disabled={!gameStarted || gameOver}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/20 bg-white/60 dark:bg-white/5 text-gray-800 dark:text-gray-200 font-semibold hover:border-rose-400/60 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resign
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Status: {statusLabel}. Timers start when you hit “Start”.
            </div>
          </div>

          <GameSidebar
            moves={moves}
            gameStarted={gameStarted}
            gameOver={gameOver}
            opening={opening}
            openingLoading={openingLoading}
          />
        </div>
      </div>
    </div>
  );
}
