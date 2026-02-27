import { Chess } from "chess.js";

export function isSameMoveAsBest(
  fen: string | undefined,
  bestMoveUci: string,
  playedSan: string,
): boolean {
  if (!fen || !bestMoveUci || !playedSan) return false;
  try {
    const chess = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move?.san === playedSan;
  } catch {
    return false;
  }
}

export function calculateMoveScore(epLoss: number): number {
  if (epLoss <= 0) return 1.0; 
  if (epLoss < 0.02) return 0.95; 
  if (epLoss < 0.05) return 0.85; 
  if (epLoss < 0.1) return 0.65; 
  if (epLoss < 0.2) return 0.4; 
  return 0.1; 
}

export function calculatePositionWeight(epBefore: number): number {
  return 1 + Math.max(0, epBefore - 0.5) * 2;
}
