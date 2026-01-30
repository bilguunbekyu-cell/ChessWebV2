import { GameHistory } from "../../historyTypes";

interface GameCardDetailsProps {
  game: GameHistory;
}

export function GameCardDetails({ game }: GameCardDetailsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Opening
        </span>
        <p
          className="text-sm font-medium text-gray-900 dark:text-white truncate"
          title={game.eco}
        >
          {game.eco || "Unknown"}
        </p>
      </div>
      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Time Control
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {game.timeControl}
        </p>
      </div>
      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Termination
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {game.termination}
        </p>
      </div>
      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Opponent Level
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {game.opponentLevel || "N/A"}
        </p>
      </div>
    </div>
  );
}
