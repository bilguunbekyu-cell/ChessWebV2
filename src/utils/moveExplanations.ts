import { MoveQuality, MoveQualityInfo } from "./moveQuality";

export interface MoveExplanation {
  title: string;
  description: string;
  details: string;
  suggestion?: string;
  evalChange: string;
}

/**
 * Convert centipawn to human-readable eval string
 */
function cpToString(cp: number): string {
  const sign = cp >= 0 ? "+" : "";
  return `${sign}${(cp / 100).toFixed(2)}`;
}

/**
 * Convert expected points to percentage for display
 */
function epToPercent(ep: number): number {
  return Math.round(ep * 100);
}

/**
 * Get color name from mover
 */
function colorName(mover: "w" | "b"): string {
  return mover === "w" ? "White" : "Black";
}

/**
 * Generate explanations based on move quality
 */
const qualityExplanations: Record<MoveQuality, {
  title: string;
  getDescription: (info: MoveQualityInfo, san: string) => string;
  getDetails: (info: MoveQualityInfo, san: string) => string;
  getSuggestion?: (info: MoveQualityInfo) => string;
}> = {
  Brilliant: {
    title: "Brilliant Move! ✨",
    getDescription: (info, san) =>
      `${san} is a brilliant sacrifice! This move demonstrates deep calculation and turns the position decisively in ${colorName(info.mover)}'s favor.`,
    getDetails: (info) =>
      `This move improved the position significantly (${epToPercent(info.epGain)}% swing) through a tactical sacrifice that the opponent cannot easily refute.`,
    getSuggestion: () =>
      "This is exactly the kind of move that separates strong players!",
  },

  Great: {
    title: "Great Move! ⭐",
    getDescription: (info, san) =>
      `${san} is a great move that significantly improved ${colorName(info.mover)}'s position.`,
    getDetails: (info) =>
      `Win probability shifted from ${epToPercent(info.epBefore)}% to ${epToPercent(info.epAfter)}% — a ${epToPercent(info.epGain)}% improvement.`,
    getSuggestion: () =>
      "This move found a critical resource in the position.",
  },

  Best: {
    title: "Best Move ✓",
    getDescription: (info, san) =>
      `${san} is the best move in this position, maintaining or improving the evaluation.`,
    getDetails: (info) =>
      `Position evaluation stayed strong at ${epToPercent(info.epAfter)}% win probability.`,
  },

  Excellent: {
    title: "Excellent Move",
    getDescription: (info, san) =>
      `${san} is an excellent move, very close to the engine's top choice.`,
    getDetails: (info) =>
      `Only a tiny ${(info.epLoss * 100).toFixed(1)}% loss compared to the absolute best move.`,
  },

  Good: {
    title: "Good Move",
    getDescription: (info, san) =>
      `${san} is a good, solid move that keeps the position playable.`,
    getDetails: (info) =>
      `About ${(info.epLoss * 100).toFixed(1)}% accuracy loss — not perfect but reasonable.`,
  },

  Book: {
    title: "Book Move 📖",
    getDescription: (info, san) =>
      `${san} is a standard opening move, following established theory.`,
    getDetails: () =>
      `This move is part of well-known opening theory. Both sides are following established lines.`,
  },

  Inaccuracy: {
    title: "Inaccuracy ⚠️",
    getDescription: (info, san) =>
      `${san} is an inaccuracy — not the best choice in this position.`,
    getDetails: (info) =>
      `Win probability dropped from ${epToPercent(info.epBefore)}% to ${epToPercent(info.epAfter)}% (${(info.epLoss * 100).toFixed(1)}% loss).`,
    getSuggestion: (info) =>
      `Look for moves that maintain piece activity and don't give your opponent free tempos.`,
  },

  Mistake: {
    title: "Mistake ❌",
    getDescription: (info, san) =>
      `${san} is a mistake that significantly hurts ${colorName(info.mover)}'s position.`,
    getDetails: (info) =>
      `Win probability dropped from ${epToPercent(info.epBefore)}% to ${epToPercent(info.epAfter)}% — that's a ${(info.epLoss * 100).toFixed(1)}% swing!`,
    getSuggestion: () =>
      `Before moving, check for tactics: captures, checks, and threats. Ask yourself what your opponent wants to do.`,
  },

  Miss: {
    title: "Missed Opportunity",
    getDescription: (info, san) =>
      `${san} missed a chance to capitalize on the opponent's previous error.`,
    getDetails: () =>
      `Your opponent made a mistake, but this move didn't punish it effectively. The advantage wasn't fully converted.`,
    getSuggestion: () =>
      `When your opponent blunders, slow down and look for the tactical punishment!`,
  },

  Blunder: {
    title: "Blunder ❌❌",
    getDescription: (info, san) =>
      `${san} is a serious blunder that dramatically changes the game.`,
    getDetails: (info) =>
      `Win probability crashed from ${epToPercent(info.epBefore)}% to ${epToPercent(info.epAfter)}% — a devastating ${(info.epLoss * 100).toFixed(1)}% loss.`,
    getSuggestion: () =>
      `Always check for hanging pieces and tactical threats before finalizing your move. "Is my piece safe? What can my opponent capture or attack?"`,
  },

  Unknown: {
    title: "Move",
    getDescription: (_, san) => `${san} was played.`,
    getDetails: () => `Analysis not available for this move.`,
  },
};

/**
 * Generate a complete move explanation
 */
export function generateMoveExplanation(
  qualityInfo: MoveQualityInfo | undefined,
  san: string,
  cpBefore?: number,
  cpAfter?: number,
): MoveExplanation {
  if (!qualityInfo) {
    return {
      title: "Move Analysis",
      description: `${san} was played.`,
      details: "No analysis data available for this move.",
      evalChange: "—",
    };
  }

  const template = qualityExplanations[qualityInfo.label];

  // Build eval change string
  let evalChange = "";
  if (cpBefore !== undefined && cpAfter !== undefined) {
    evalChange = `${cpToString(cpBefore)} → ${cpToString(cpAfter)}`;
  } else {
    const beforePct = epToPercent(qualityInfo.epBefore);
    const afterPct = epToPercent(qualityInfo.epAfter);
    evalChange = `${beforePct}% → ${afterPct}%`;
  }

  return {
    title: template.title,
    description: template.getDescription(qualityInfo, san),
    details: template.getDetails(qualityInfo, san),
    suggestion: template.getSuggestion?.(qualityInfo),
    evalChange,
  };
}

/**
 * Get color for quality badge
 */
export function getQualityColor(quality: MoveQuality): string {
  const colors: Record<MoveQuality, string> = {
    Brilliant: "text-cyan-400",
    Great: "text-blue-400",
    Best: "text-green-500",
    Excellent: "text-green-400",
    Good: "text-green-300",
    Book: "text-gray-400",
    Inaccuracy: "text-yellow-500",
    Mistake: "text-orange-500",
    Miss: "text-orange-400",
    Blunder: "text-red-500",
    Unknown: "text-gray-400",
  };
  return colors[quality] || "text-gray-400";
}

/**
 * Get background color for quality
 */
export function getQualityBgColor(quality: MoveQuality): string {
  const colors: Record<MoveQuality, string> = {
    Brilliant: "bg-cyan-500/20 border-cyan-500/50",
    Great: "bg-blue-500/20 border-blue-500/50",
    Best: "bg-green-500/20 border-green-500/50",
    Excellent: "bg-green-500/15 border-green-500/40",
    Good: "bg-green-500/10 border-green-500/30",
    Book: "bg-gray-500/10 border-gray-500/30",
    Inaccuracy: "bg-yellow-500/20 border-yellow-500/50",
    Mistake: "bg-orange-500/20 border-orange-500/50",
    Miss: "bg-orange-500/15 border-orange-500/40",
    Blunder: "bg-red-500/20 border-red-500/50",
    Unknown: "bg-gray-500/10 border-gray-500/30",
  };
  return colors[quality] || "bg-gray-500/10 border-gray-500/30";
}
