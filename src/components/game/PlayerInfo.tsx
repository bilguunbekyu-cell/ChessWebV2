import { useEffect, useState } from "react";
import { ChessTimer } from "./ChessTimer";

interface PlayerInfoProps {
  name: string;
  subtitle: string;
  avatarLetter: string;
  avatarImage?: string;
  avatarStyle: "opponent" | "player";
  initialTime: number;
  increment: number;
  isTimerActive: boolean;
  onTimeOut: () => void;
  onTimeChange: (time: number) => void;
}

export function PlayerInfo({
  name,
  subtitle,
  avatarLetter,
  avatarImage,
  avatarStyle,
  initialTime,
  increment,
  isTimerActive,
  onTimeOut,
  onTimeChange,
}: PlayerInfoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [avatarImage]);

  return (
    <div className="w-full bg-white/70 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 backdrop-blur">
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold text-white shadow-sm overflow-hidden flex-shrink-0 ${
            avatarStyle === "opponent"
              ? "bg-gradient-to-br from-gray-600 to-gray-700 ring-1 ring-white/10"
              : "bg-gradient-to-br from-teal-500 to-emerald-500 ring-2 ring-teal-200/60 dark:ring-emerald-500/50 shadow-teal-500/30"
          }`}
        >
          {avatarImage && !hasImageError ? (
            <img
              src={avatarImage}
              alt={name}
              className="w-full h-full object-cover"
              onError={() => setHasImageError(true)}
            />
          ) : (
            avatarLetter
          )}
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
            {name}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
        {increment > 0 && (
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/40 border border-teal-100 dark:border-teal-800">
            +{increment}s
          </span>
        )}
        <div className="flex-shrink-0">
          <ChessTimer
            initialTime={initialTime}
            increment={increment}
            isActive={isTimerActive}
            onTimeOut={onTimeOut}
            onTimeChange={onTimeChange}
          />
        </div>
      </div>
    </div>
  );
}
