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

export function classifyByExpectedPointsLoss(epLoss: number): MoveQuality {
  if (epLoss <= 0.0) return "Best";
  if (epLoss < 0.02) return "Excellent";
  if (epLoss < 0.05) return "Good";
  if (epLoss < 0.1) return "Inaccuracy";
  if (epLoss < 0.2) return "Mistake";
  return "Blunder";
}

export function maybeMarkGreatMove(
  label: MoveQuality,
  epGain: number,
  ): MoveQuality {
  // Heuristic: big swing in your favor while playing one of the top choices.
  if (epGain >= 0.2 && (label === "Best" || label === "Excellent")) {
    return "Great";
  }
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
  epLoss: number,
): MoveQuality {
  // If opponent just blundered/mistaked but we didn't capitalize (we also lose EP)
  if (
    (opponentPrev === "Mistake" || opponentPrev === "Blunder") &&
    epLoss >= 0.05 &&
    epLoss < 0.2 &&
    current !== "Blunder"
  ) {
    return "Miss";
  }
  return current;
}
