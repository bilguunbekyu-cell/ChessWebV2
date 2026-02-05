import { Chess } from "chess.js";

/**
 * Check if the played SAN move matches the engine's best UCI move
 */
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

/**
 * Calculate move score based on expected points loss
 */
export function calculateMoveScore(epLoss: number): number {
  if (epLoss <= 0) return 1.0; // Perfect move
  if (epLoss < 0.02) return 0.95; // Excellent
  if (epLoss < 0.05) return 0.85; // Good
  if (epLoss < 0.1) return 0.65; // Inaccuracy
  if (epLoss < 0.2) return 0.4; // Mistake
  return 0.1; // Blunder
}

/**
 * Calculate position weight for accuracy calculation
 */
export function calculatePositionWeight(epBefore: number): number {
  return 1 + Math.max(0, epBefore - 0.5) * 2;
}
