import { useMemo } from "react";
import { GameHistory } from "../historyTypes";
import {
  MoveQuality,
  MoveRow,
  QualityCounts,
  AnalysisEntry,
  PlyState,
  CaptureTimeline,
} from "./useGameReplayTypes";
import { usePositionParser } from "./usePositionParser";
import { useCaptureTimeline } from "./useCaptureTimeline";
import { useMoveAnalysis } from "./useMoveAnalysis";
import { usePlaybackControls } from "./usePlaybackControls";
import { useKeyboardControls } from "./useKeyboardControls";
import { useEvaluation } from "./useEvaluation";
import { useDownloadPgn } from "./useDownloadPgn";

export type {
  MoveQuality,
  MoveRow,
  QualityCounts,
  AnalysisEntry,
  PlyState,
  CaptureTimeline,
};

export function useGameReplay960(game: GameHistory) {
  const { positions, plies, moveRows, totalPlies } = usePositionParser(game);

  const sanMoves = useMemo(() => {
    if (game.moves && game.moves.length > 0) return game.moves;
    const fromRows: string[] = [];
    moveRows.forEach((row) => {
      if (row.white) fromRows.push(row.white);
      if (row.black) fromRows.push(row.black);
    });
    return fromRows;
  }, [game.moves, moveRows]);

  const captureTimeline = useCaptureTimeline(plies);

  const {
    analysis,
    analysisByPly,
    analysisSeries,
    moveQualities,
    moveRowsWithQuality,
    qualityCounts,
    accuracy,
    isAnalyzing,
    analysisProgress,
  } = useMoveAnalysis(game, positions, moveRows, totalPlies);

  const {
    ply,
    isPlaying,
    speed,
    orientation,
    atEnd,
    jumpTo,
    togglePlay,
    setSpeed,
    flipBoard,
  } = usePlaybackControls(game, totalPlies);

  useKeyboardControls(ply, totalPlies, jumpTo, togglePlay, flipBoard);

  const { evalPercent, evalLabel } = useEvaluation(analysis, ply);
  const downloadPgn = useDownloadPgn(game);

  const current = plies[ply - 1];
  const currentFen = positions[ply] || positions[0];
  const lastMove =
    current?.from && current?.to
      ? { from: current.from, to: current.to }
      : null;
  const currentMoveSan = current?.moveSAN || "Start";
  const isCheck = current?.isCheck || false;
  const isCheckmate = current?.isCheckmate || false;
  const isStalemate = current?.isStalemate || false;
  const captureIndex = Math.min(ply, captureTimeline.white.length - 1);
  const capturedByWhite = captureTimeline.white[captureIndex] || [];
  const capturedByBlack = captureTimeline.black[captureIndex] || [];

  return {
    ply,
    totalPlies,
    isPlaying,
    speed,
    orientation,
    atEnd,

    currentFen,
    positions,
    lastMove,
    currentMoveSan,
    isCheck,
    isCheckmate,
    isStalemate,

    capturedByWhite,
    capturedByBlack,

    moveRows: moveRowsWithQuality,
    moveRowsWithQuality,
    moveQualities,
    qualityCounts,
    accuracy,
    sanMoves,
    analysisSeries,
    analysisByPly,
    opening: null,

    isAnalyzing,
    analysisProgress,

    evalPercent,
    evalLabel,

    jumpTo,
    togglePlay,
    setSpeed,
    flipBoard,
    downloadPgn,
  };
}
