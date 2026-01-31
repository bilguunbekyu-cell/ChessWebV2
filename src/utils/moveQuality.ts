export type MoveQuality =
  | "Best"
  | "Excellent"
  | "Good"
  | "Book"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder"
  | "Great"
  | "Brilliant"
  | "Miss"
  | "Unknown";

export type MoveQualityInfo = {
  ply: number;
  mover: "w" | "b";
  label: MoveQuality;
  epBefore: number;
  epAfter: number;
  epLoss: number;
  epGain: number;
};

// Convert centipawn (white POV) or mate eval to expected points for a given mover.
export function evalToExpectedPoints(
  cp?: number,
  mate?: number,
  mover: "w" | "b" = "w",
): number {
  if (mate !== undefined) {
    // Stockfish reports mate 0 in the position *after* the winning move.
    if (mate === 0) {
      return 0.99;
    }
    // Any forced mate counts as decisive; sign indicates winner.
    const whiteWins = mate > 0;
    return mover === "w" ? (whiteWins ? 0.99 : 0.01) : whiteWins ? 0.01 : 0.99;
  }

  if (cp === undefined) return 0.5; // unknown eval → neutral

  const povCp = mover === "w" ? cp : -cp;
  const clamped = Math.max(-1200, Math.min(1200, povCp));

  // Logistic mapping similar to win-probability curves used in practice.
  return 1 / (1 + Math.exp(-0.004 * clamped));
}

export function classifyByExpectedPointsLoss(
  epLoss: number,
  playedBestMove: boolean = true,
): MoveQuality {
  const loss = Math.max(0, epLoss);

  // Chess.com Expected Points cutoffs (inclusive upper bounds)
  // Only classify as "Best" if the player actually played the engine's best move
  if (loss <= 0.0 && playedBestMove) return "Best";
  if (loss <= 0.02) return "Excellent";
  if (loss <= 0.05) return "Good";
  if (loss <= 0.1) return "Inaccuracy";
  if (loss <= 0.2) return "Mistake";
  return "Blunder";
}

export function maybeMarkGreatMove(
  label: MoveQuality,
  epGain: number,
  epBefore: number,
  epAfter: number,
): MoveQuality {
  if (label !== "Best" && label !== "Excellent") return label;

  // Chess.com-style: Great = a rare, critical swing from roughly equal/worse to clearly winning.
  const swungTheGame = epBefore <= 0.55 && epAfter >= 0.75 && epGain >= 0.25;

  if (swungTheGame) return "Great";
  return label;
}

export function maybeMarkBook(
  label: MoveQuality,
  ply: number,
  cpAfter?: number,
): MoveQuality {
  if (ply <= 12 && Math.abs(cpAfter ?? 0) < 40 && label === "Excellent") {
    return "Book";
  }
  return label;
}

export function maybeMarkMiss(
  current: MoveQuality,
  opponentPrev: MoveQuality | undefined,
  epGain: number,
  playedBestMove: boolean = false,
): MoveQuality {
  // If opponent just blundered/mistaked but we failed to increase EP meaningfully.
  // Never mark as Miss if:
  // - Player played the engine's best move (they capitalized optimally)
  // - Move is already classified as Best/Excellent (minimal or no loss)
  // - Move is a Blunder (different category of mistake)
  if (
    (opponentPrev === "Mistake" || opponentPrev === "Blunder") &&
    epGain < 0.1 &&
    current !== "Blunder" &&
    current !== "Best" &&
    current !== "Excellent" &&
    !playedBestMove
  ) {
    return "Miss";
  }
  return current;
}

export function maybeMarkBrilliant(
  label: MoveQuality,
  epGain: number,
  epAfter: number,
  san?: string,
): MoveQuality {
  // Simple proxy for a "good sacrifice": strong result plus a forcing/capture move.
  const isCaptureOrSac =
    san?.includes("x") ||
    san?.includes("!!") ||
    san?.toLowerCase()?.includes("ep");

  if (
    (label === "Best" || label === "Excellent" || label === "Great") &&
    epGain >= 0.25 &&
    epAfter >= 0.55 &&
    isCaptureOrSac
  ) {
    return "Brilliant";
  }

  return label;
}
