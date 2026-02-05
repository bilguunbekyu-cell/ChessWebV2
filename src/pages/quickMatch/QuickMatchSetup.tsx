import { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Clock, Timer } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BOARD_FRAME, TIME_OPTIONS } from "./types";

interface TimeCategory {
  key: string;
  label: string;
  icon: string;
}

const TIME_CATEGORIES: TimeCategory[] = [
  { key: "Bullet", label: "Bullet", icon: "⚡" },
  { key: "Blitz", label: "Blitz", icon: "🔥" },
  { key: "Rapid", label: "Rapid", icon: "🚀" },
  { key: "Classical", label: "Classical", icon: "🏛️" },
];

interface QuickMatchSetupProps {
  timeControl: { initial: number; increment: number };
  onTimeControlChange: (value: { initial: number; increment: number }) => void;
  onStart: () => void;
}

export function QuickMatchSetup({
  timeControl,
  onTimeControlChange,
  onStart,
}: QuickMatchSetupProps) {
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<string>("Blitz");

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

  const activeOptions = groupedTimeOptions[activeCategory] || [];

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-slate-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden"
    >
      <div className="h-full grid grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        {/* Left Side - Board Preview with Player Info */}
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
              <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">?</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 dark:text-white text-[13px]">
                  Opponent
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  (Waiting...)
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

        {/* Right Side - Time Format Selection Panel */}
        <div className="min-w-0 w-full bg-white/90 dark:bg-slate-900/95 border-l border-gray-200/60 dark:border-white/10 flex flex-col h-full overflow-hidden">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <h2 className="font-bold text-[15px] text-gray-900 dark:text-white">
                  Quick Match
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 px-2.5 py-0.5 text-[11px] font-semibold">
                  {selectedTimeOption?.label || "Select Time"}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {selectedTimeOption?.category || ""}
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Find an opponent and start playing instantly.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3 px-3 py-3 overflow-hidden min-h-0">
            {/* Time Control */}
            <div className="flex-1 min-h-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3 flex flex-col">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 dark:text-white mb-2">
                <Timer className="w-4 h-4 text-teal-500" />
                <span>Time Control</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {TIME_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                        isActive
                          ? "bg-teal-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200"
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 auto-rows-min">
                {activeOptions.map((opt) => {
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
                      className={`py-2 px-3 rounded-xl text-center text-[13px] font-semibold transition-all ${
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

          </div>

          {/* Play Button */}
          <div className="p-3 border-t border-gray-200/60 dark:border-white/10 flex-shrink-0">
            <button
              onClick={onStart}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-[15px] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
