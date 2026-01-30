import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { GameHistory } from "../historyTypes";
import {
  ReplayBoard,
  ReplayControls,
  ReplayMoveList,
  ReplayEvalBar,
  ReplayHeader,
  CapturedPieces,
  GameSummary,
} from "../components/replay";
import { useGameReplay } from "../hooks/useGameReplay";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Analyze() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGame() {
      if (!gameId) {
        setError("No game ID provided");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/history/${gameId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch game");
        const data = await res.json();
        setGame(data.game || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
      } finally {
        setLoading(false);
      }
    }
    fetchGame();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
        <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
        <p className="text-gray-500 mb-6">{error || "Unable to load game"}</p>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500"
        >
          <ArrowLeft size={18} />
          Back to Profile
        </button>
      </div>
    );
  }

  return <ReplayContent game={game} />;
}

function ReplayContent({ game }: { game: GameHistory }) {
  const navigate = useNavigate();
  const replay = useGameReplay(game);

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <ReplayHeader game={game} onDownloadPgn={replay.downloadPgn} />
        </div>
      </div>

      {/* Main Content - 3 columns in one row */}
      <div className="flex-1 min-h-0 w-full px-2 sm:px-3 py-2 overflow-hidden">
        <div className="h-full flex gap-3 w-full">
          {/* Left - Game Summary */}
          <div
            className="flex-shrink-0 flex flex-col gap-2 h-full"
            style={{ flexBasis: "30%", maxWidth: "30%" }}
          >
            <GameSummary
              game={game}
              accuracy={replay.accuracy}
              qualityCounts={replay.qualityCounts}
              moveQualities={replay.moveQualities}
              cpSeries={replay.analysisSeries}
            />
          </div>

          {/* Center - Board section (sized by height) */}
          <div
            className="h-full flex flex-col gap-1.5"
            style={{ flexBasis: "40%", maxWidth: "40%" }}
          >
            {/* Captured pieces */}
            <div className="flex-shrink-0">
              <CapturedPieces
                capturedByWhite={replay.capturedByWhite}
                capturedByBlack={replay.capturedByBlack}
              />
            </div>

            {/* Board - fill remaining height */}
            <div className="flex-1 min-h-0 flex items-center gap-2">
              <div className="flex-1 flex items-center justify-center">
                <ReplayBoard
                  position={replay.currentFen}
                  orientation={replay.orientation}
                  lastMove={replay.lastMove}
                  isCheck={replay.isCheck}
                  isCheckmate={replay.isCheckmate}
                  isStalemate={replay.isStalemate}
                />
              </div>
              <div className="w-8 md:w-10 h-full flex items-stretch">
                <ReplayEvalBar
                  orientation="vertical"
                  evalPercent={replay.evalPercent}
                  evalLabel={replay.evalLabel}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0">
              <ReplayControls
                ply={replay.ply}
                totalPlies={replay.totalPlies}
                isPlaying={replay.isPlaying}
                speed={replay.speed}
                currentMoveSan={replay.currentMoveSan}
                onJumpTo={replay.jumpTo}
                onTogglePlay={replay.togglePlay}
                onSetSpeed={replay.setSpeed}
                onFlipBoard={replay.flipBoard}
              />
            </div>
          </div>

          {/* Right - Eval + Move List */}
          <div
            className="flex-shrink-0 flex flex-col gap-2 h-full"
            style={{ flexBasis: "30%", maxWidth: "30%" }}
          >
            {/* Move list */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <span className="font-semibold text-xs text-gray-900 dark:text-white">
                  Moves
                </span>
              </div>
              <div className="flex-1">
                <ReplayMoveList
                  moveRows={replay.moveRows}
                  currentPly={replay.ply}
                  onJumpTo={replay.jumpTo}
                />
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="flex-shrink-0 text-[10px] text-gray-400 text-center">
              ← → Navigate • Space Play • F Flip
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
