import { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Clock, Timer, Shuffle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BOARD_FRAME, TIME_OPTIONS } from "./types";

type MatchVariant = "standard" | "chess960";

interface QuickMatchSetupProps {
  timeControl: { initial: number; increment: number };
  onTimeControlChange: (value: { initial: number; increment: number }) => void;
  variant: MatchVariant;
  onVariantChange: (variant: MatchVariant) => void;
  onStart: () => void;
  isSearching: boolean;
  isConnected: boolean;
  onCancel: () => void;
}

export function QuickMatchSetup({
  timeControl,
  onTimeControlChange,
  variant,
  onVariantChange,
  onStart,
  isSearching,
  isConnected,
  onCancel,
}: QuickMatchSetupProps) {
  const { user } = useAuthStore();

  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isSearching) {
      setSearchElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setSearchElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      setSearchElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isSearching]);

  // Responsive board width
  const [boardWidth, setBoardWidth] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = leftRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const padding = 8;
      const headerH = topBarRef.current?.offsetHeight ?? 40;
      const footerH = bottomBarRef.current?.offsetHeight ?? 36;
      const availableWidth = rect.width - padding - BOARD_FRAME;
      const availableHeight =
        Math.min(rect.height, window.innerHeight) - headerH - footerH - padding;
      const size = Math.floor(Math.min(availableWidth, availableHeight));
      setBoardWidth(Math.max(320, Math.min(size, 720)));
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

  // Group time options by category
  const groupedTimeOptions = TIME_OPTIONS.reduce(
    (acc, opt) => {
      if (!acc[opt.category]) {
        acc[opt.category] = [];
      }
      acc[opt.category].push(opt);
      return acc;
    },
    {} as Record<string, typeof TIME_OPTIONS>,
  );

  // Get selected time control label
  const selectedTimeOption = TIME_OPTIONS.find(
    (opt) =>
      opt.initial === timeControl.initial &&
      opt.increment === timeControl.increment,
  );
  const variantLabel = variant === "chess960" ? "Chess960" : "";
  const searchingGameText = selectedTimeOption
    ? `Searching ${selectedTimeOption.label} ${selectedTimeOption.category}${variantLabel ? " " + variantLabel : ""} Game`
    : "Searching Game";
  const categoryOrder = ["Bullet", "Blitz", "Rapid", "Classical"];

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3 p-2 lg:p-3">
        {/* Left Side - Board Preview with Player Info */}
        <div
          ref={leftRef}
          className="flex flex-col items-center justify-center p-4 lg:p-5 gap-3 lg:gap-4"
        >
          {/* Top Opponent Info Bar */}
          <div
            ref={topBarRef}
            className="w-full max-w-[900px] flex items-center gap-2 px-2"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">?</span>
              </div>
            </div>
            <div className="flex-1">
              {isSearching ? (
                <div className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
                  Searching...
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    Opponent
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    (Waiting...)
                  </span>
                </div>
              )}
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
            className="w-full max-w-[900px] flex items-center gap-2 px-2 justify-start"
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
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                {user?.fullName || "You"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Quick Match Panel */}
        <div className="w-full rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/95 border border-gray-200/60 dark:border-white/10 flex flex-col min-h-0">
          {isSearching ? (
            <>
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-5 lg:inset-6 rounded-2xl border border-gray-200/60 dark:border-white/5 bg-gray-50/30 dark:bg-slate-800/30" />

                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <div className="w-full max-w-[300px] rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-7 text-center shadow-lg">
                    <Timer className="w-10 h-10 mx-auto text-gray-700 dark:text-gray-200" />
                    <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                      {searchElapsedSeconds} sec
                    </p>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                      {searchingGameText}
                    </p>
                    <button
                      type="button"
                      onClick={onCancel}
                      className="mt-7 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Panel Header */}
              <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-500" />
                    <h2 className="font-bold text-base text-gray-900 dark:text-white">
                      Quick Match{variant === "chess960" ? " — Chess960" : ""}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 px-2 py-0.5 text-[11px] font-semibold">
                      {selectedTimeOption?.label || "Select Time"}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {selectedTimeOption?.category || ""}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Find an opponent and start playing instantly.
                </p>
              </div>

              <div className="flex-1 flex flex-col gap-3 px-4 py-3">
                {/* Time Control */}
                <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Timer className="w-4 h-4 text-teal-500" />
                    <span>Time Control</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {categoryOrder.map((category) => {
                      const options = groupedTimeOptions[category] || [];
                      if (options.length === 0) return null;

                      return (
                        <div key={category}>
                          <div className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {category}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {options.map((opt) => {
                              const isSelected =
                                timeControl.initial === opt.initial &&
                                timeControl.increment === opt.increment;
                              return (
                                <button
                                  key={opt.label}
                                  onClick={() =>
                                    onTimeControlChange({
                                      initial: opt.initial,
                                      increment: opt.increment,
                                    })
                                  }
                                  className={`py-2 px-3 rounded-lg text-center text-sm font-semibold transition-all ${
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
                      );
                    })}
                  </div>
                </div>

                {/* Variant Selector */}
                <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Shuffle className="w-4 h-4 text-teal-500" />
                    <span>Variant</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onVariantChange("standard")}
                      className={`py-2 px-3 rounded-lg text-center text-sm font-semibold transition-all ${
                        variant === "standard"
                          ? "bg-teal-500 text-white ring-2 ring-teal-500"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => onVariantChange("chess960")}
                      className={`py-2 px-3 rounded-lg text-center text-sm font-semibold transition-all ${
                        variant === "chess960"
                          ? "bg-teal-500 text-white ring-2 ring-teal-500"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-gray-300 dark:hover:ring-slate-600"
                      }`}
                    >
                      Chess960
                    </button>
                  </div>
                  {variant === "chess960" && (
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Fischer Random — pieces are shuffled on the back rank.
                      Castling lands king on g1/c1 and rook on f1/d1 as normal.
                    </p>
                  )}
                </div>

              </div>

              {/* Play Button */}
              <div className="p-4 pt-2 border-t border-gray-200/60 dark:border-white/10">
                <button
                  onClick={onStart}
                  disabled={isSearching || !isConnected}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSearching ? "Searching..." : isConnected ? "Play" : "Server Offline"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
