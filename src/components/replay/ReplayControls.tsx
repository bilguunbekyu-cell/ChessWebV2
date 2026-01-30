import {
  Play,
  Pause,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface ReplayControlsProps {
  ply: number;
  totalPlies: number;
  isPlaying: boolean;
  speed: number;
  currentMoveSan: string;
  onJumpTo: (ply: number) => void;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onFlipBoard: () => void;
}

export function ReplayControls({
  ply,
  totalPlies,
  isPlaying,
  speed,
  currentMoveSan,
  onJumpTo,
  onTogglePlay,
  onSetSpeed,
  onFlipBoard,
}: ReplayControlsProps) {
  const atEnd = ply >= totalPlies;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Navigation */}
        <div className="flex items-center">
          <button
            onClick={() => onJumpTo(0)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Start"
          >
            <ChevronFirst className="w-4 h-4" />
          </button>
          <button
            onClick={() => onJumpTo(ply - 1)}
            disabled={ply <= 0}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-1.5 mx-0.5 rounded-md bg-teal-600 text-white hover:bg-teal-500 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onJumpTo(ply + 1)}
            disabled={ply >= totalPlies}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onJumpTo(totalPlies)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="End"
          >
            <ChevronLast className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Timeline */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalPlies}
            value={ply}
            onChange={(e) => onJumpTo(Number(e.target.value))}
            className="flex-1 accent-teal-600 h-1.5 cursor-pointer"
          />
          <span className="text-xs font-mono text-gray-500 min-w-[50px] text-right">
            {ply}/{totalPlies}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Speed */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                speed === s
                  ? "bg-teal-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Flip */}
        <button
          onClick={onFlipBoard}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="Flip Board"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Current Move */}
        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
          {currentMoveSan}
        </div>
      </div>
    </div>
  );
}
