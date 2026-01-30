import { Download } from "lucide-react";
import { GameHistory } from "../../historyTypes";

interface ReplayHeaderProps {
  game: GameHistory;
  onDownloadPgn: () => void;
}

export function ReplayHeader({ game, onDownloadPgn }: ReplayHeaderProps) {
  const resultColor =
    game.result === "1-0"
      ? "text-green-500"
      : game.result === "0-1"
        ? "text-red-500"
        : "text-yellow-500";

  return (
    <div className="flex items-center gap-4">
      <div className="text-right hidden md:block">
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {game.white} vs {game.black}
        </div>
        <div className="text-sm text-gray-500">
          {game.date} • {game.timeControl} •{" "}
          <span className={`font-semibold ${resultColor}`}>{game.result}</span>
        </div>
      </div>

      <button
        onClick={onDownloadPgn}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">PGN</span>
      </button>
    </div>
  );
}
