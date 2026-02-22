export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface PuzzleItem {
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
  mateIn?: number;
  timesPlayed?: number;
  timesSolved?: number;
}

export interface PuzzleUserStats {
  rating: number;
  bestRating: number;
  attempts: number;
  solved: number;
  failed: number;
  skipped: number;
  solvedToday: number;
  streak: number;
  provisional: boolean;
}

export type PuzzleCollection = "all" | "mate" | "tactics" | "endgame" | "openings";
export type MateBucket = "all" | "1" | "2" | "3" | "4+";

export const COLLECTION_OPTIONS: Array<{
  id: PuzzleCollection;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "mate", label: "Mate" },
  { id: "tactics", label: "Tactics" },
  { id: "endgame", label: "Endgame" },
  { id: "openings", label: "Openings" },
];

export const MATE_BUCKET_OPTIONS: Array<{
  id: MateBucket;
  label: string;
}> = [
  { id: "all", label: "All Mates" },
  { id: "1", label: "Mate in 1" },
  { id: "2", label: "Mate in 2" },
  { id: "3", label: "Mate in 3" },
  { id: "4+", label: "Mate in 4+" },
];

export const TACTIC_MOTIFS = [
  "Fork",
  "Pin",
  "Skewer",
  "Discovery",
  "Deflection",
  "Clearance",
] as const;

export const ENDGAME_MOTIFS = [
  "Pawn Endgame",
  "Rook Endgame",
  "King and Pawn",
  "Opposition",
  "Promotion",
] as const;

const TACTIC_KEYWORDS = [
  "fork",
  "pin",
  "skewer",
  "discover",
  "deflection",
  "clearance",
  "zwischenzug",
  "double attack",
  "tactic",
] as const;

const ENDGAME_KEYWORDS = [
  "endgame",
  "pawn endgame",
  "rook endgame",
  "king and pawn",
  "opposition",
  "promotion",
  "lucena",
  "philidor",
] as const;

const OPENING_KEYWORDS = [
  "opening",
  "eco",
  "sicilian",
  "french",
  "caro",
  "ruy",
  "italian game",
  "queen's gambit",
  "opening trap",
] as const;

function puzzleTextBlob(puzzle: PuzzleItem): string {
  return [
    puzzle.title,
    puzzle.description,
    ...(puzzle.themes || []),
  ]
    .join(" ")
    .toLowerCase();
}

export function getMateDepth(puzzle: PuzzleItem): number | null {
  if (Number.isFinite(Number(puzzle.mateIn)) && Number(puzzle.mateIn) > 0) {
    return Number(puzzle.mateIn);
  }

  const combined = puzzleTextBlob(puzzle);
  const matched = combined.match(/mate\s*in\s*(\d+)/i);
  if (!matched) return null;
  const depth = Number(matched[1]);
  return Number.isFinite(depth) && depth > 0 ? depth : null;
}

export function getMateBucket(puzzle: PuzzleItem): MateBucket | null {
  const depth = getMateDepth(puzzle);
  if (!depth) return null;
  if (depth === 1) return "1";
  if (depth === 2) return "2";
  if (depth === 3) return "3";
  return "4+";
}

export function detectPuzzleCollection(puzzle: PuzzleItem): PuzzleCollection {
  const text = puzzleTextBlob(puzzle);
  const mateDepth = getMateDepth(puzzle);
  if (mateDepth != null || text.includes("checkmate") || text.includes("mate")) {
    return "mate";
  }

  if (ENDGAME_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "endgame";
  }

  if (OPENING_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "openings";
  }

  if (TACTIC_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "tactics";
  }

  return "all";
}

export function puzzleMatchesMotif(puzzle: PuzzleItem, motif: string): boolean {
  if (!motif || motif === "All") return true;
  const text = puzzleTextBlob(puzzle);
  return text.includes(motif.toLowerCase());
}

export function puzzleMatchesQuery(puzzle: PuzzleItem, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return puzzleTextBlob(puzzle).includes(trimmed);
}

export function getDifficultyColor(diff: string): string {
  switch (diff) {
    case "Easy":
      return "text-green-500 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800";
    case "Medium":
      return "text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800";
    case "Hard":
      return "text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800";
    default:
      return "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
  }
}
