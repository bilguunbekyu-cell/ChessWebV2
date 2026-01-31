import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Brain, BarChart3, Zap } from "lucide-react";
import { GameHistory } from "../historyTypes";
import {
  ReplayBoard,
  ReplayControls,
  ReplayMoveList,
  ReplayEvalBar,
  CapturedPieces,
  GameSummary,
  MoveExplanationPanel,
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
      <div className="flex items-center justify-center min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white">
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

  // Show loading overlay while analysis is in progress
  if (replay.isAnalyzing) {
    return (
      <div className="h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          {/* Animated chess analysis icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-teal-500/30">
              <Brain className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center animate-bounce">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Analyzing Your Game
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Stockfish is evaluating each position to calculate accuracy and move
            quality
          </p>

          {/* Progress bar */}
          <div className="w-80 mx-auto mb-4">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{replay.analysisProgress}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${replay.analysisProgress}%` }}
              />
            </div>
          </div>

          {/* Analysis steps */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <BarChart3
                className={`w-4 h-4 ${replay.analysisProgress > 0 ? "text-teal-500" : ""}`}
              />
              <span>Evaluating positions</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2
                className={`w-4 h-4 ${replay.analysisProgress > 50 ? "text-teal-500 animate-spin" : "animate-spin"}`}
              />
              <span>Calculating accuracy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col overflow-hidden pt-4">
      {/* Back Button */}
      <div className="flex-shrink-0 px-4 sm:px-6 mb-2">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Main Content - 3 columns in one row */}
      <div className="flex-1 min-h-0 w-full px-4 sm:px-6 py-2">
        <div className="flex gap-3 w-full h-full min-h-0">
          {/* Left - Game Summary */}
          <div
            className="flex-shrink-0 flex flex-col gap-2 h-full overflow-auto pr-1"
            style={{ flexBasis: "30%", maxWidth: "30%" }}
          >
            <GameSummary
              game={game}
              accuracy={replay.accuracy}
              qualityCounts={replay.qualityCounts}
              moveQualities={replay.moveQualities}
              cpSeries={replay.analysisSeries}
              opening={replay.opening}
            />
          </div>

          {/* Center - Board section (sized by height) */}
          <div
            className="flex flex-col gap-1.5 h-full min-h-0"
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
            <div className="flex-1 min-h-0 flex items-center gap-2 overflow-hidden">
              <div className="flex-1 flex items-center justify-center min-h-0">
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

          {/* Right - Move Explanation + Move List */}
          <div
            className="flex-shrink-0 flex flex-col gap-2 h-full min-h-0"
            style={{ flexBasis: "30%", maxWidth: "30%" }}
          >
            {/* Move Explanation */}
            <div className="flex-shrink-0">
              <MoveExplanationPanel
                currentPly={replay.ply}
                currentMoveSan={replay.currentMoveSan}
                moveQualities={replay.moveQualities}
                analysisByPly={replay.analysisByPly}
                positions={replay.positions}
                sanMoves={replay.sanMoves}
                gameId={game._id}
              />
            </div>

            {/* Move list */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <ReplayMoveList
                  moveRows={replay.moveRows}
                  currentPly={replay.ply}
                  onJumpTo={replay.jumpTo}
                  opening={replay.opening?.name}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
