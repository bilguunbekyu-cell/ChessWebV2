import { useState, useEffect, useMemo } from "react";
import { GameHistory } from "../historyTypes";
import {
  MoveQualityInfo,
  classifyByExpectedPointsLoss,
  evalToExpectedPoints,
  maybeMarkGreatMove,
  maybeMarkBook,
  maybeMarkMiss,
} from "../utils/moveQuality";
import {
  AnalysisEntry,
  MoveRow,
  MoveQuality,
  QualityCounts,
} from "./useGameReplayTypes";

export function useMoveAnalysis(
  game: GameHistory,
  positions: string[],
  moveRows: MoveRow[],
  totalPlies: number,
) {
  const [analysis, setAnalysis] = useState<AnalysisEntry[]>(
    game.analysis || [],
  );

  // sync external analysis if present
  useEffect(() => {
    if (game.analysis && game.analysis.length > 0) {
      setAnalysis(game.analysis);
    }
  }, [game]);

  // Compute evaluations locally when none provided
  useEffect(() => {
    if ((game.analysis && game.analysis.length > 0) || positions.length === 0) {
      return;
    }

    let cancelled = false;
    let idx = 0;
    const worker =
      typeof Worker !== "undefined" ? new Worker("/stockfish.js") : null;
    if (!worker) return;

    worker.postMessage("uci");
    worker.postMessage("isready");
    worker.postMessage("setoption name Threads value 1");

    const evalNext = () => {
      if (cancelled || idx >= positions.length) {
        worker.postMessage("quit");
        worker.terminate();
        return;
      }

      const fen = positions[idx];
      const plyIndex = idx; // align with positions array
      let best: AnalysisEntry | null = null;

      worker.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        const match = line.match(/score (cp|mate) (-?\d+)/);
        if (match) {
          const type = match[1];
          const raw = parseInt(match[2], 10);
          const sideToMove = fen.split(" ")[1] === "b" ? -1 : 1; // convert to White POV
          if (type === "cp") {
            best = { ply: plyIndex, cp: raw * sideToMove };
          } else {
            best = { ply: plyIndex, mate: raw * sideToMove };
          }
        }

        if (line.startsWith("bestmove")) {
          if (best) {
            setAnalysis((prev) => {
              if (prev.some((a) => a.ply === best!.ply)) return prev;
              return [...prev, best!].sort((a, b) => a.ply - b.ply);
            });
          }
          idx += 1;
          evalNext();
        }
      };

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage("go depth 12");
    };

    evalNext();

    return () => {
      cancelled = true;
      worker.postMessage("quit");
      worker.terminate();
    };
  }, [game.analysis, positions]);

  const analysisByPly = useMemo(() => {
    const map = new Map<number, AnalysisEntry>();
    analysis.forEach((a) => map.set(a.ply, a));
    return map;
  }, [analysis]);

  const analysisSeries = useMemo(() => {
    const max = Math.max(totalPlies, positions.length - 1);
    const series: Array<{ cp?: number; mate?: number } | undefined> = [];
    for (let i = 0; i <= max; i++) {
      series.push(analysisByPly.get(i));
    }
    return series;
  }, [analysisByPly, positions.length, totalPlies]);

  const moveQualities = useMemo<MoveQualityInfo[]>(() => {
    if (totalPlies === 0) return [];

    const list: MoveQualityInfo[] = [];
    const prevLabels = new Map<number, MoveQuality>();

    for (let i = 1; i <= totalPlies; i++) {
      const mover: "w" | "b" = i % 2 === 1 ? "w" : "b";
      const before = analysisByPly.get(i - 1);
      const after = analysisByPly.get(i);

      // Special case: last move ends the game (mate/stalemate) — always "Best"
      const isLastMove = i === totalPlies;
      const gameEndedAfterMove = !after || after?.mate === 0;
      if (isLastMove && gameEndedAfterMove) {
        const epBefore = before
          ? evalToExpectedPoints(before.cp, before.mate, mover)
          : 0.5;
        list.push({
          ply: i,
          mover,
          label: "Best",
          epBefore,
          epAfter: 1.0,
          epLoss: 0,
          epGain: Math.max(0, 1 - epBefore),
        });
        continue;
      }

      if (!after) continue; // need post-move eval to classify

      const epBefore = evalToExpectedPoints(before?.cp, before?.mate, mover);
      const epAfter = evalToExpectedPoints(after.cp, after.mate, mover);
      const epLoss = Math.max(0, epBefore - epAfter);
      const epGain = Math.max(0, epAfter - epBefore);

      let label = classifyByExpectedPointsLoss(epLoss);
      label = maybeMarkGreatMove(label, epGain);
      label = maybeMarkBook(label, i, after.cp);
      label = maybeMarkMiss(label, prevLabels.get(i - 1), epLoss);

      prevLabels.set(i, label);

      list.push({
        ply: i,
        mover,
        label,
        epBefore,
        epAfter,
        epLoss,
        epGain,
      });
    }

    return list;
  }, [analysisByPly, totalPlies]);

  const moveRowsWithQuality = useMemo<MoveRow[]>(() => {
    if (moveQualities.length === 0) return moveRows;

    const lookup = new Map<number, MoveQuality>();
    moveQualities.forEach((q) => lookup.set(q.ply, q.label));

    return moveRows.map((row) => ({
      ...row,
      whiteQuality: lookup.get(row.plyWhite),
      blackQuality: row.plyBlack ? lookup.get(row.plyBlack) : undefined,
    }));
  }, [moveRows, moveQualities]);

  const qualityCounts = useMemo(() => {
    const initCounts = (): QualityCounts =>
      ({
        Best: 0,
        Excellent: 0,
        Good: 0,
        Book: 0,
        Inaccuracy: 0,
        Mistake: 0,
        Miss: 0,
        Blunder: 0,
        Great: 0,
        Brilliant: 0,
        Unknown: 0,
      }) as QualityCounts;

    const white = initCounts();
    const black = initCounts();

    moveQualities.forEach((q) => {
      const bucket = q.mover === "w" ? white : black;
      bucket[q.label] = (bucket[q.label] || 0) + 1;
    });

    return { white, black };
  }, [moveQualities]);

  const accuracy = useMemo(() => {
    const calc = (mover: "w" | "b") => {
      const subset = moveQualities.filter((q) => q.mover === mover);
      if (subset.length === 0) return null;

      // Use a weighted accuracy formula that penalizes bad moves more heavily
      // This gives a more realistic picture of how well someone played
      let totalWeight = 0;
      let weightedScore = 0;

      subset.forEach((q) => {
        // Weight each move - early game moves matter less, critical positions matter more
        const positionWeight = 1 + Math.max(0, q.epBefore - 0.5) * 2; // Higher weight when you have advantage

        // Calculate move score (0-1) based on expected points loss
        // More aggressive penalties for bad moves
        let moveScore: number;
        if (q.epLoss <= 0) {
          moveScore = 1.0; // Perfect move
        } else if (q.epLoss < 0.02) {
          moveScore = 0.95; // Excellent
        } else if (q.epLoss < 0.05) {
          moveScore = 0.85; // Good
        } else if (q.epLoss < 0.1) {
          moveScore = 0.65; // Inaccuracy
        } else if (q.epLoss < 0.2) {
          moveScore = 0.4; // Mistake
        } else {
          moveScore = 0.1; // Blunder
        }

        totalWeight += positionWeight;
        weightedScore += moveScore * positionWeight;
      });

      const score = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
      return Number(Math.max(0, Math.min(100, score)).toFixed(1));
    };
    return { white: calc("w"), black: calc("b") };
  }, [moveQualities]);

  return {
    analysis,
    analysisByPly,
    analysisSeries,
    moveQualities,
    moveRowsWithQuality,
    qualityCounts,
    accuracy,
  };
}
