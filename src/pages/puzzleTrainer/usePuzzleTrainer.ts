import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Chess } from "chess.js";
import { useAuthStore } from "../../store/authStore";
import { PuzzleItem, PuzzleStatus, API_URL } from "./types";
import {
  normalizeFen,
  safeLoadGame,
  normalizeSolution,
  applyMoveString,
  moveStringToMove,
} from "./utils";

export function usePuzzleTrainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { puzzleId } = useParams<{ puzzleId?: string }>();
  const { user, setUser } = useAuthStore();

  // Check if puzzle was passed via navigation state (from Dashboard)
  const initialPuzzle = (location.state as { puzzle?: PuzzleItem })?.puzzle;

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
  const [fenError, setFenError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [moveSquares, setMoveSquares] = useState<
    Record<string, React.CSSProperties>
  >({});

  // Timer
  useEffect(() => {
    if (status !== "solving") return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

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
    if (initialPuzzle) return initialPuzzle;
    if (puzzles.length === 0) return null;
    if (puzzleId) {
      const found = puzzles.find((p) => p._id === puzzleId);
      if (found) return found;
    }
    return puzzles[0];
  }, [initialPuzzle, puzzleId, puzzles]);

  const puzzleFen = useMemo(
    () => (currentPuzzle ? normalizeFen(currentPuzzle.fen) : ""),
    [currentPuzzle],
  );

  const solutionMoves = useMemo(
    () => (currentPuzzle ? normalizeSolution(currentPuzzle.solution) : []),
    [currentPuzzle],
  );

  const puzzleElo = user?.puzzleElo ?? 1200;

  const submitPuzzleAttemptResult = useCallback(
    async (
      result: "SOLVED" | "FAILED" | "SKIPPED",
      payload: {
        movesPlayed?: string[];
        timeMs?: number;
        usedHint?: boolean;
      } = {},
    ) => {
      if (!currentPuzzle || !user) return;
      try {
        const res = await fetch(
          `${API_URL}/api/puzzles/${currentPuzzle._id}/attempt`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              result,
              movesPlayed: payload.movesPlayed ?? [],
              timeMs: payload.timeMs ?? 0,
              usedHint: payload.usedHint === true,
            }),
          },
        );
        const data = await res.json();
        if (res.ok && data?.user?.puzzleElo !== undefined) {
          setUser({
            ...user,
            puzzleElo: data.user.puzzleElo,
            puzzleBestElo: data.user.puzzleBestElo,
            puzzleAttempts: data.user.puzzleAttempts,
            puzzleSolved: data.user.puzzleSolved,
            puzzleFailed: data.user.puzzleFailed,
            puzzleSkipped: data.user.puzzleSkipped,
          });
        }
      } catch (err) {
        console.error("Failed to submit puzzle attempt:", err);
      }
    },
    [currentPuzzle, setUser, user],
  );

  const resetPuzzleState = useCallback(() => {
    if (!currentPuzzle) return;
    const newGame = safeLoadGame(puzzleFen, setFenError);
    setGame(newGame);
    setStatus("solving");
    setShowHint(false);
    setCurrentMoveIndex(0);
    setLastMove(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setMoveFrom(null);
    setMoveSquares({});
  }, [currentPuzzle, puzzleFen]);

  const currentPuzzleIndex = useMemo(() => {
    if (!currentPuzzle) return 0;
    return puzzles.findIndex((p) => p._id === currentPuzzle._id);
  }, [currentPuzzle, puzzles]);

  // Initialize puzzle on change
  useEffect(() => {
    if (!currentPuzzle) return;
    const newGame = safeLoadGame(puzzleFen, setFenError);
    if (
      !newGame ||
      newGame
        .board()
        .flat()
        .every((sq) => sq === null)
    ) {
      setFenError("Puzzle FEN is invalid or empty");
    }
    setGame(newGame);
    setStatus("solving");
    setShowHint(false);
    setHintsUsed(0);
    setAttemptCount(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setCurrentMoveIndex(0);
    setLastMove(null);
    setMoveFrom(null);
    setMoveSquares({});
  }, [currentPuzzle?._id, puzzleFen]);

  // Auto-restart after a wrong move
  useEffect(() => {
    if (status !== "wrong") return;
    const timer = setTimeout(() => resetPuzzleState(), 600);
    return () => clearTimeout(timer);
  }, [status, resetPuzzleState]);

  const handlePuzzleSolved = useCallback(
    (movesPlayed: string[]) => {
      setStatus("correct");
      setStreak((s) => s + 1);
      void submitPuzzleAttemptResult("SOLVED", {
        movesPlayed,
        timeMs: Math.max(0, Date.now() - startTime),
        usedHint: hintsUsed > 0,
      });
    },
    [hintsUsed, startTime, submitPuzzleAttemptResult],
  );

  const handleWrongMove = useCallback(
    (movesPlayed: string[]) => {
      setStatus("wrong");
      setAttemptCount((c) => c + 1);
      setStreak(0);
      void submitPuzzleAttemptResult("FAILED", {
        movesPlayed,
        timeMs: Math.max(0, Date.now() - startTime),
        usedHint: hintsUsed > 0,
      });
    },
    [hintsUsed, startTime, submitPuzzleAttemptResult],
  );

  const markPuzzleSkipped = useCallback(() => {
    if (status !== "solving") return;
    void submitPuzzleAttemptResult("SKIPPED", {
      movesPlayed: game.history(),
      timeMs: Math.max(0, Date.now() - startTime),
      usedHint: hintsUsed > 0,
    });
  }, [game, hintsUsed, startTime, status, submitPuzzleAttemptResult]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!currentPuzzle || status !== "solving") return false;

      const expectedMoveStr = solutionMoves[currentMoveIndex];
      if (!expectedMoveStr) return false;

      const expectedMove = moveStringToMove(game.fen(), expectedMoveStr);
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

          if (nextMoveIndex >= solutionMoves.length) {
            handlePuzzleSolved(solutionMoves.slice(0, nextMoveIndex));
          } else {
            setTimeout(() => {
              const opponentMoveStr = solutionMoves[nextMoveIndex];
              if (opponentMoveStr) {
                const opponentGame = new Chess(gameCopy.fen());
                const opponentMove = applyMoveString(
                  opponentGame,
                  opponentMoveStr,
                );
                if (opponentMove) {
                  setGame(opponentGame);
                  setLastMove({ from: opponentMove.from, to: opponentMove.to });
                  setCurrentMoveIndex(nextMoveIndex + 1);

                  if (nextMoveIndex + 1 >= solutionMoves.length) {
                    handlePuzzleSolved(solutionMoves.slice(0, nextMoveIndex + 1));
                  }
                }
              }
            }, 400);
          }
          return true;
        }
      }

      handleWrongMove([...game.history(), `${sourceSquare}${targetSquare}`]);
      return false;
    },
    [
      currentPuzzle,
      status,
      currentMoveIndex,
      game,
      solutionMoves,
      handlePuzzleSolved,
      handleWrongMove,
    ],
  );

  const nextPuzzle = () => {
    if (!currentPuzzle || puzzles.length === 0) return;
    markPuzzleSkipped();
    const nextIdx = (currentPuzzleIndex + 1) % puzzles.length;
    navigate(`/puzzles/train/${puzzles[nextIdx]._id}`);
  };

  const prevPuzzle = () => {
    if (!currentPuzzle || puzzles.length === 0) return;
    markPuzzleSkipped();
    const prevIdx =
      currentPuzzleIndex === 0 ? puzzles.length - 1 : currentPuzzleIndex - 1;
    navigate(`/puzzles/train/${puzzles[prevIdx]._id}`);
  };

  const retryPuzzle = () => {
    if (!currentPuzzle) return;
    resetPuzzleState();
  };

  const useHint = () => {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  };

  const showSolution = () => {
    setStatus("showingSolution");
  };

  const highlightMoves = (from: string) => {
    const moves = game
      .moves({ square: from, verbose: true })
      .map((m) => m.to)
      .reduce<Record<string, React.CSSProperties>>((acc, sq) => {
        acc[sq] = {
          boxShadow:
            "inset 0 0 0 3px rgba(20,184,166,0.8), inset 0 0 0 6px rgba(20,184,166,0.18)",
          background:
            "radial-gradient(circle, rgba(20,184,166,0.45) 38%, rgba(0,0,0,0) 60%)",
        };
        return acc;
      }, {});
    setMoveSquares({
      [from]: { backgroundColor: "rgba(20,184,166,0.25)" },
      ...moves,
    });
  };

  const handleSquareClick = useCallback(
    (square: string) => {
      if (status !== "solving") return;
      if (!moveFrom) {
        const moves = game.moves({ square, verbose: true });
        if (moves.length === 0) return;
        setMoveFrom(square);
        highlightMoves(square);
        return;
      }
      if (moveFrom === square) {
        setMoveFrom(null);
        setMoveSquares({});
        return;
      }
      const moved = onDrop(moveFrom, square);
      if (!moved) return;
      setMoveFrom(null);
      setMoveSquares({});
    },
    [game, moveFrom, onDrop, status],
  );

  const handleSquareRightClick = useCallback(() => {
    setMoveFrom(null);
    setMoveSquares({});
  }, []);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...moveSquares };
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      styles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }
    return styles;
  }, [lastMove, moveSquares]);

  return {
    // State
    loading,
    status,
    streak,
    showHint,
    hintsUsed,
    attemptCount,
    elapsedTime,
    game,
    fenError,
    currentPuzzle,
    solutionMoves,
    puzzleElo,
    customSquareStyles,
    // Actions
    onDrop,
    handleSquareClick,
    handleSquareRightClick,
    nextPuzzle,
    prevPuzzle,
    retryPuzzle,
    useHint,
    showSolution,
    navigate,
  };
}
