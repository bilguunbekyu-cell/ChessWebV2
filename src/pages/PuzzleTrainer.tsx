import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  RotateCcw,
  Lightbulb,
  ChevronRight,
  Check,
  X,
  ChevronLeft,
  Eye,
  Sparkles,
  Loader2,
  Settings,
} from "lucide-react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Sidebar from "../components/Sidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface PuzzleItem {
  _id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  themes: string[];
  description: string;
  icon: string;
  fen: string;
  solution: string[];
  rating: number;
  isWhiteToMove: boolean;
}

type PuzzleStatus = "solving" | "correct" | "wrong" | "showingSolution";

export default function PuzzleTrainer() {
  const navigate = useNavigate();
  const { puzzleId } = useParams<{ puzzleId?: string }>();

  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PuzzleStatus>("solving");
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [boardSize, setBoardSize] = useState(560);

  // Timer
  useEffect(() => {
    if (status !== "solving") return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  // Responsive board size to avoid scrollbars
  useEffect(() => {
    const updateSize = () => {
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      // Leave room for sidebar (256px), info panel (320px) and padding
      const maxBoardW = Math.max(360, viewportW - 256 - 320 - 48);
      const maxBoardH = Math.max(360, viewportH - 80); // header + padding
      const size = Math.min(720, maxBoardW, maxBoardH);
      setBoardSize(Math.max(360, size));
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch puzzles
  useEffect(() => {
    fetch(`${API_URL}/api/puzzles`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setPuzzles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch puzzles:", err);
        setLoading(false);
      });
  }, []);

  const currentPuzzle = useMemo(() => {
    if (puzzles.length === 0) return null;
    if (puzzleId) {
      const found = puzzles.find((p) => p._id === puzzleId);
      if (found) return found;
    }
    return puzzles[0];
  }, [puzzleId, puzzles]);

  const currentPuzzleIndex = useMemo(() => {
    if (!currentPuzzle) return 0;
    return puzzles.findIndex((p) => p._id === currentPuzzle._id);
  }, [currentPuzzle, puzzles]);

  useEffect(() => {
    if (!currentPuzzle) return;
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setStatus("solving");
    setShowHint(false);
    setHintsUsed(0);
    setAttemptCount(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setCurrentMoveIndex(0);
    setLastMove(null);
  }, [currentPuzzle?._id]);

  const updatePuzzleStats = (solved: boolean) => {
    if (!currentPuzzle) return;
    fetch(`${API_URL}/api/puzzles/${currentPuzzle._id}/stats`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ solved }),
    }).catch(console.error);
  };

  const handlePuzzleSolved = useCallback(() => {
    setStatus("correct");
    setStreak((s) => s + 1);
    updatePuzzleStats(true);
  }, [currentPuzzle]);

  const handleWrongMove = useCallback(() => {
    setStatus("wrong");
    setAttemptCount((c) => c + 1);
    setStreak(0);
  }, []);

  const sanToMove = (fen: string, san: string) => {
    const tempGame = new Chess(fen);
    const move = tempGame.move(san);
    return move
      ? { from: move.from, to: move.to, promotion: move.promotion }
      : null;
  };

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!currentPuzzle || status !== "solving") return false;

      const expectedSan = currentPuzzle.solution[currentMoveIndex];
      if (!expectedSan) return false;

      const expectedMove = sanToMove(game.fen(), expectedSan);
      if (!expectedMove) return false;

      if (
        sourceSquare === expectedMove.from &&
        targetSquare === expectedMove.to
      ) {
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: expectedMove.promotion || "q",
        });

        if (move) {
          setGame(gameCopy);
          setLastMove({ from: sourceSquare, to: targetSquare });

          const nextMoveIndex = currentMoveIndex + 1;
          setCurrentMoveIndex(nextMoveIndex);

          if (nextMoveIndex >= currentPuzzle.solution.length) {
            handlePuzzleSolved();
          } else {
            setTimeout(() => {
              const opponentSan = currentPuzzle.solution[nextMoveIndex];
              if (opponentSan) {
                const opponentGame = new Chess(gameCopy.fen());
                const opponentMove = opponentGame.move(opponentSan);
                if (opponentMove) {
                  setGame(opponentGame);
                  setLastMove({ from: opponentMove.from, to: opponentMove.to });
                  setCurrentMoveIndex(nextMoveIndex + 1);

                  if (nextMoveIndex + 1 >= currentPuzzle.solution.length) {
                    handlePuzzleSolved();
                  }
                }
              }
            }, 400);
          }
          return true;
        }
      }

      handleWrongMove();
      return false;
    },
    [
      currentPuzzle,
      status,
      currentMoveIndex,
      game,
      handlePuzzleSolved,
      handleWrongMove,
    ],
  );

  const nextPuzzle = () => {
    if (!currentPuzzle || puzzles.length === 0) return;
    const nextIdx = (currentPuzzleIndex + 1) % puzzles.length;
    navigate(`/puzzles/train/${puzzles[nextIdx]._id}`);
  };

  const prevPuzzle = () => {
    if (!currentPuzzle || puzzles.length === 0) return;
    const prevIdx =
      currentPuzzleIndex === 0 ? puzzles.length - 1 : currentPuzzleIndex - 1;
    navigate(`/puzzles/train/${puzzles[prevIdx]._id}`);
  };

  const retryPuzzle = () => {
    if (!currentPuzzle) return;
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setStatus("solving");
    setShowHint(false);
    setCurrentMoveIndex(0);
    setLastMove(null);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const useHint = () => {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  };

  const showSolution = () => {
    setStatus("showingSolution");
  };

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      styles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }
    return styles;
  }, [lastMove]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0b0f19] text-white flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
        </main>
      </div>
    );
  }

  if (!currentPuzzle) {
    return (
      <div className="h-screen bg-[#0b0f19] text-white flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col items-center justify-center gap-4">
          <Brain className="w-16 h-16 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-300">Puzzle not found</h2>
          <button
            onClick={() => navigate("/puzzles")}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
          >
            Back to Puzzles
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0b0f19] text-white flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-64 flex min-h-0 overflow-hidden">
        {/* Board Area - takes remaining space */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0b0f19] p-4">
          <div style={{ width: boardSize, height: boardSize }}>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={currentPuzzle.isWhiteToMove ? "white" : "black"}
              customSquareStyles={customSquareStyles}
              arePiecesDraggable={status === "solving"}
              customDarkSquareStyle={{ backgroundColor: "#779952" }}
              customLightSquareStyle={{ backgroundColor: "#edeed1" }}
              boardWidth={boardSize}
            />
          </div>
        </div>

        {/* Right Panel - Fixed width, no scroll */}
        <div className="w-[320px] flex-shrink-0 bg-[#111521] flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f2633]">
            <button
              onClick={() => navigate("/puzzles")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">🧩</span>
              </div>
              <span className="text-lg font-bold">Puzzles</span>
            </div>
            <div className="w-5" /> {/* Spacer */}
          </div>

          {/* Puzzle Info Card */}
          <div className="p-3">
            <div className="bg-[#161b25] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
                  {currentPuzzle.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded border-2 ${currentPuzzle.isWhiteToMove ? "bg-white border-gray-300" : "bg-gray-800 border-gray-500"}`}
                    />
                    <span className="font-semibold text-xs">
                      {currentPuzzle.isWhiteToMove ? "White" : "Black"} to move
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                    {currentPuzzle.description ||
                      `Find the best move! Rating: ${currentPuzzle.rating}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white">{streak}</span>
              <div className="flex-1 mx-3 h-1.5 bg-[#1f2633] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(streak * 20, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-amber-500 text-lg">🏆</span>
                <span className="font-bold text-sm">5</span>
              </div>
            </div>
          </div>

          {/* Status Area */}
          <div className="flex-1 px-3 py-2 flex flex-col justify-center min-h-0">
            {status === "correct" && (
              <div className="bg-emerald-900/40 border border-emerald-600 rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check size={18} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                    Correct! <Sparkles size={14} />
                  </h3>
                  <p className="text-emerald-500 text-xs">
                    Solved in {formatTime(elapsedTime)}
                  </p>
                </div>
              </div>
            )}

            {status === "wrong" && (
              <div className="bg-red-900/40 border border-red-600 rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <X size={18} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-red-400 text-sm">Wrong move</h3>
                  <p className="text-red-500 text-xs">
                    Try again or view solution
                  </p>
                </div>
              </div>
            )}

            {status === "showingSolution" && (
              <div className="bg-blue-900/40 border border-blue-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1">
                  <Eye size={16} /> Solution
                </div>
                <div className="flex flex-wrap gap-1">
                  {currentPuzzle.solution.map((move, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-blue-800 rounded font-mono text-xs"
                    >
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {status === "solving" && showHint && (
              <div className="bg-yellow-900/40 border border-yellow-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm mb-1">
                  <Lightbulb size={16} /> Hint
                </div>
                <p className="text-yellow-500 text-xs">
                  First move:{" "}
                  <span className="font-mono font-bold">
                    {currentPuzzle.solution[0]?.slice(0, 2)}...
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="px-3 py-2 flex items-center gap-2 text-gray-300">
            <div className="w-3 h-3 rounded-full border-2 border-gray-500" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>

          {/* Action Button */}
          <div className="p-3">
            {status === "wrong" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={retryPuzzle}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-sm bg-[#161b25] hover:bg-[#1f222e] transition-colors"
                >
                  <RotateCcw size={16} /> Retry
                </button>
                <button
                  onClick={showSolution}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  <Eye size={16} /> Solution
                </button>
              </div>
            ) : status === "correct" || status === "showingSolution" ? (
              <button
                onClick={nextPuzzle}
                className="w-full flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-sm bg-teal-600 hover:bg-teal-500 transition-colors"
              >
                Next Puzzle <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={useHint}
                disabled={showHint}
                className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                  showHint
                    ? "bg-[#1f2633] text-gray-500 cursor-not-allowed"
                    : "bg-[#161b25] hover:bg-[#1f222e] text-white"
                }`}
              >
                <Lightbulb
                  size={16}
                  className={showHint ? "" : "text-yellow-400"}
                />
                {showHint ? "Hint Used" : "Hint"}
              </button>
            )}
          </div>

          {/* Bottom Nav */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#1f2633]">
            <button className="text-gray-500 hover:text-white transition-colors">
              <Settings size={18} />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={prevPuzzle}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextPuzzle}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
