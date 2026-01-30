interface ReplayEvalBarProps {
  evalPercent: number; // 0 = black wins, 100 = white wins
  evalLabel: string;
  orientation?: "horizontal" | "vertical";
}

export function ReplayEvalBar({
  evalPercent,
  evalLabel,
  orientation = "horizontal",
}: ReplayEvalBarProps) {
  const isWhiteAdvantage = evalPercent > 50;
  const displayLabel = evalLabel === "—" ? "0.00" : evalLabel;

  if (orientation === "vertical") {
    return (
      <div className="flex flex-col items-center h-full">
        <div
          className={`text-[10px] font-bold px-1.5 py-1 rounded mb-1 text-center ${
            isWhiteAdvantage
              ? "bg-white text-black border border-gray-300"
              : "bg-gray-900 text-white"
          }`}
        >
          {displayLabel}
        </div>
        <div className="relative w-4 flex-1 rounded overflow-hidden border border-gray-300 dark:border-gray-600">
          <div
            className="absolute left-0 right-0 bottom-0 bg-white transition-all duration-300 ease-out"
            style={{ height: `${evalPercent}%` }}
          />
          <div
            className="absolute left-0 right-0 top-0 bg-gray-900 transition-all duration-300 ease-out"
            style={{ height: `${100 - evalPercent}%` }}
          />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-400/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`text-xs font-bold px-2 py-1 rounded min-w-[45px] text-center ${
          isWhiteAdvantage
            ? "bg-white text-black border border-gray-300"
            : "bg-gray-900 text-white"
        }`}
      >
        {displayLabel}
      </div>

      <div className="flex-1 relative h-4 rounded overflow-hidden border border-gray-300 dark:border-gray-600">
        <div
          className="absolute top-0 bottom-0 left-0 bg-gray-900 transition-all duration-300 ease-out"
          style={{ width: `${100 - evalPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-white transition-all duration-300 ease-out"
          style={{ width: `${evalPercent}%` }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400/70 -translate-x-1/2" />
      </div>
    </div>
  );
}
