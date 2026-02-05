import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Clock, Shuffle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BOARD_FRAME } from "../quickMatch/types";

interface VariantOption {
  key: string;
  label: string;
  description: string;
  icon: string;
}

const VARIANTS: VariantOption[] = [
  {
    key: "chess960",
    label: "Chess960",
    description: "Randomized back-rank pieces.",
    icon: "🎲",
  },
  {
    key: "kingOfHill",
    label: "King of the Hill",
    description: "Get your king to the center.",
    icon: "👑",
  },
  {
    key: "threeCheck",
    label: "Three-Check",
    description: "Win by giving three checks.",
    icon: "⚡",
  },
  {
    key: "atomic",
    label: "Atomic",
    description: "Explosions on capture.",
    icon: "💥",
  },
];

const TIME_OPTIONS = [
  { label: "3+0", initial: 180, increment: 0 },
  { label: "5+0", initial: 300, increment: 0 },
  { label: "5+3", initial: 300, increment: 3 },
  { label: "10+0", initial: 600, increment: 0 },
  { label: "10+5", initial: 600, increment: 5 },
  { label: "15+10", initial: 900, increment: 10 },
];

export default function PlayVariants() {
  const { user } = useAuthStore();
  const [selectedVariant, setSelectedVariant] = useState(VARIANTS[0]);
  const [timeControl, setTimeControl] = useState({
    initial: 300,
    increment: 0,
  });

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

  const handleStart = () => {
    // Placeholder for starting a variant game
  };

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
          {/* Top Variant Info Bar */}
          <div
            ref={topBarRef}
            className="w-full max-w-[900px] flex items-center gap-1.5 px-2"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 dark:text-white text-[13px]">
                  {selectedVariant.label}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  (Variant)
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

        {/* Right Side - Variants Panel */}
        <div className="min-w-0 w-full bg-white/90 dark:bg-slate-900/95 border-l border-gray-200/60 dark:border-white/10 flex flex-col h-full overflow-hidden">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-teal-500" />
              <h2 className="font-bold text-[15px] text-gray-900 dark:text-white">
                Chess Variants
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Pick a ruleset and jump into a match.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3 px-3 py-3 overflow-hidden min-h-0">
            {/* Variant Options */}
            <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3">
              <div className="text-[12px] font-semibold text-gray-900 dark:text-white mb-2">
                Variants
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VARIANTS.map((variant) => {
                  const isSelected = selectedVariant.key === variant.key;
                  return (
                    <button
                      key={variant.key}
                      onClick={() => setSelectedVariant(variant)}
                      className={`rounded-xl p-2.5 text-left transition-all border ${
                        isSelected
                          ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
                          : "bg-gray-100 dark:bg-slate-800 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{variant.icon}</span>
                        <span className="text-[12px] font-semibold">
                          {variant.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {variant.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Control */}
            <div className="flex-1 min-h-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-3 flex flex-col">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 dark:text-white mb-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <span>Time Control</span>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-min">
                {TIME_OPTIONS.map((opt) => {
                  const isSelected =
                    timeControl.initial === opt.initial &&
                    timeControl.increment === opt.increment;
                  return (
                    <button
                      key={opt.label}
                      onClick={() =>
                        setTimeControl({
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
              onClick={handleStart}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-[15px] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              Start Variant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
