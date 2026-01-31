import { useMemo } from "react";
import { Flag, RotateCcw, Compass } from "lucide-react";
import { OpeningMatch } from "../../utils/openingExplorer";

interface GameSidebarProps {
  moves: string[];
  gameStarted: boolean;
  gameOver: boolean;
  opening: OpeningMatch | null;
  openingLoading?: boolean;
  onResign: () => void;
  onNewGame: () => void;
}

export function GameSidebar({
  moves,
  gameStarted,
  gameOver,
  opening,
  openingLoading,
  onResign,
  onNewGame,
}: GameSidebarProps) {
  // Format moves for display
  const formattedMoves = useMemo(() => {
    const pairs: { white: string; black: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        white: moves[i] || "",
        black: moves[i + 1] || "",
      });
    }
    return pairs;
  }, [moves]);

  return (
    <div className="w-full h-full min-h-0 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button className="flex-1 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-teal-500 bg-gray-100 dark:bg-gray-800/50">
          Moves
        </button>
        <button className="flex-1 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
          Info
        </button>
      </div>

      {/* Opening recognition */}
      <div className="px-4 py-3 bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300">
          <Compass className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Opening
            </div>
            {openingLoading && (
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            )}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {opening
              ? opening.variation
                ? `${opening.name}: ${opening.variation}`
                : opening.name
              : gameStarted
                ? "Detecting..."
                : "Make a move to detect"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {opening?.eco ? `ECO ${opening.eco}` : "—"}
            {opening?.nextMoves?.length
              ? ` • Book hint: ${opening.nextMoves.join(" • ")}`
              : ""}
          </div>
          {opening?.line && (
            <div className="text-xs text-gray-400 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {opening.line}
            </div>
          )}
        </div>
      </div>

      {/* Move List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white dark:bg-gray-900/50">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0">
            <tr>
              <th className="px-4 py-2 w-12">#</th>
              <th className="px-4 py-2">White</th>
              <th className="px-4 py-2">Black</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {formattedMoves.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  {gameStarted
                    ? "Make your first move!"
                    : "Start a game to play"}
                </td>
              </tr>
            ) : (
              formattedMoves.map((move, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50 dark:bg-gray-800/30"
                  }
                >
                  <td className="px-4 py-2 text-gray-500 font-mono">
                    {i + 1}.
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                    {move.white}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                    {move.black}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onResign}
            disabled={!gameStarted || gameOver}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            <Flag className="w-4 h-4" />
            <span>Resign</span>
          </button>
          <button
            onClick={onNewGame}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
