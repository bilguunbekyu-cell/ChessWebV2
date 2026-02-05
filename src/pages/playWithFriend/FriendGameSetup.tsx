import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import {
  Check,
  Clock,
  Copy,
  Link2,
  Monitor,
  Play,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BOARD_FRAME, TIME_OPTIONS } from "./types";

interface FriendGameSetupProps {
  gameMode: "local" | "online";
  onGameModeChange: (mode: "local" | "online") => void;
  playAs: "white" | "black" | "random";
  onPlayAsChange: (value: "white" | "black" | "random") => void;
  timeControl: { initial: number; increment: number };
  onTimeControlChange: (value: { initial: number; increment: number }) => void;
  friendName: string;
  onFriendNameChange: (name: string) => void;
  onStart: () => void;
}

export function FriendGameSetup({
  gameMode,
  onGameModeChange,
  playAs,
  onPlayAsChange,
  timeControl,
  onTimeControlChange,
  friendName,
  onFriendNameChange,
  onStart,
}: FriendGameSetupProps) {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Responsive board width
  const [boardWidth, setBoardWidth] = useState(620);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = leftRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const padding = 6;
      const headerH = topBarRef.current?.offsetHeight ?? 36;
      const footerH = bottomBarRef.current?.offsetHeight ?? 32;
      const availableWidth = rect.width - padding - BOARD_FRAME;
      const availableHeight =
        Math.min(rect.height, window.innerHeight) - headerH - footerH - padding;
      const size = Math.floor(Math.min(availableWidth, availableHeight));
      setBoardWidth(Math.max(300, Math.min(size, 700)));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleCopyLink = () => {
    const gameLink = `${window.location.origin}/play/friend?join=ABC123`;
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const opponentLabel = friendName?.trim() || "Friend";

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden"
    >
      <div className="h-full grid grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        {/* Left Side - Board Preview */}
        <div
          ref={leftRef}
          className="min-w-0 flex flex-col items-center justify-center p-2 gap-2 h-full"
        >
          {/* Top Opponent Info Bar */}
          <div
            ref={topBarRef}
            className="w-full max-w-[900px] flex items-center gap-1.5 px-2"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {opponentLabel.substring(0, 1).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 dark:text-white text-[13px]">
                  {opponentLabel}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {gameMode === "online" ? "(Online)" : "(Local)"}
                </span>
              </div>
            </div>
          </div>

          {/* Chess Board Preview */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200/60 dark:border-white/10"
            style={{ width: boardWidth, height: boardWidth }}
          >
            <Chessboard
              boardWidth={boardWidth}
              position="start"
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: "#779556" }}
              customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
            />
          </div>

          {/* Bottom Player Info Bar */}
          <div
            ref={bottomBarRef}
            className="w-full max-w-[900px] flex items-center gap-1.5 px-2 justify-start"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName || "You"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user?.fullName?.substring(0, 1).toUpperCase() || "Y"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-900 dark:text-white text-[13px]">
                {user?.fullName || "You"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Settings Panel */}
        <div className="min-w-0 w-full bg-white/90 dark:bg-slate-900/95 border-l border-gray-200/60 dark:border-white/10 flex flex-col h-full overflow-hidden">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" />
              <h2 className="font-bold text-[15px] text-gray-900 dark:text-white">
                Play with Friend
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Choose local or online and start a match.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3 px-3 py-3 overflow-hidden min-h-0">
            {/* Game Mode */}
            <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3">
              <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-2">
                Game Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onGameModeChange("local")}
                  className={`rounded-xl p-2.5 text-left transition-all border ${
                    gameMode === "local"
                      ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
                      : "bg-gray-100 dark:bg-slate-800 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-[12px] font-semibold">Pass & Play</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    One device
                  </div>
                </button>
                <button
                  onClick={() => onGameModeChange("online")}
                  className={`rounded-xl p-2.5 text-left transition-all border ${
                    gameMode === "online"
                      ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
                      : "bg-gray-100 dark:bg-slate-800 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    <span className="text-[12px] font-semibold">Online</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Share link
                  </div>
                </button>
              </div>
            </div>

            {/* Time Control */}
            <div className="flex-1 min-h-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3 flex flex-col">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 dark:text-white mb-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <span>Time Control</span>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-min">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() =>
                      onTimeControlChange({
                        initial: opt.initial,
                        increment: opt.increment,
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-center text-[13px] font-semibold transition-all ${
                      timeControl.initial === opt.initial &&
                      timeControl.increment === opt.increment
                        ? "bg-teal-500 text-white ring-2 ring-teal-500"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Local / Online Details */}
            {gameMode === "local" ? (
              <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3 flex-shrink-0">
                <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-2">
                  Local Setup
                </div>
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => onFriendNameChange(e.target.value)}
                  placeholder="Friend's name"
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white text-[12px] border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["white", "black", "random"] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => onPlayAsChange(color)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all ${
                        playAs === color
                          ? "bg-teal-500 text-white ring-2 ring-teal-500"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3 flex-shrink-0">
                <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-2">
                  Share Link
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/play/friend?join=ABC123`}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white text-[11px] border border-gray-200 dark:border-white/10"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-xl transition-colors ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-teal-500 hover:bg-teal-600 text-white"
                    }`}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  Send this link to your friend to start playing.
                </p>
              </div>
            )}
          </div>

          {/* Play Button */}
          <div className="p-3 border-t border-gray-200/60 dark:border-white/10 flex-shrink-0">
            {gameMode === "local" ? (
              <button
                onClick={onStart}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-[15px] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-2xl bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-bold text-[15px] cursor-not-allowed flex items-center justify-center gap-2"
              >
                Waiting for friend...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
