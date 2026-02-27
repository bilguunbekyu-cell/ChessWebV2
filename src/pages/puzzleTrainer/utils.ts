import { Chess } from "chess.js";

export function normalizeFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 6) {
    const halfmove = Number.isNaN(parseInt(parts[4], 10))
      ? 0
      : parseInt(parts[4], 10);
    let fullmove = parseInt(parts[5], 10);
    if (Number.isNaN(fullmove) || fullmove < 1) fullmove = 1;
    parts[4] = String(halfmove);
    parts[5] = String(fullmove);
    return parts.slice(0, 6).join(" ");
  }

  if (parts.length === 2 || parts.length === 3 || parts.length === 4) {
    const padded = [
      parts[0],
      parts[1] || "w",
      parts[2] || "-",
      parts[3] || "-",
      "0",
      "1",
    ];
    return padded.join(" ");
  }
  return fen;
}

export function fenStartsWithWhite(fen: string, fallback = true): boolean {
  const normalized = normalizeFen(fen);
  const side = normalized.trim().split(/\s+/)[1];
  if (side === "w") return true;
  if (side === "b") return false;
  return fallback;
}

export function safeLoadGame(
  fen: string,
  setFenError: (error: string | null) => void,
): Chess {
  setFenError(null);
  try {
    return new Chess(fen);
  } catch {

    try {
      return new Chess(normalizeFen(fen));
    } catch {
      try {
        return new Chess(); 
      } catch {
        setFenError("Invalid FEN for this puzzle");
        return new Chess();
      }
    }
  }
}

export function normalizeSolution(moves: string[]): string[] {
  return moves
    .map((m) => m.trim())
    .filter(
      (m) =>
        m.length > 0 &&
        m !== "*" &&
        m !== "..." &&
        m !== ".." &&
        !/^(1-0|0-1|1\/2-1\/2)$/.test(m),
    )
    .map((m) => m.replace(/[?!]+$/g, ""));
}

export function isUciMove(move: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);
}

export function applyMoveString(
  chess: Chess,
  moveStr: string,
): ReturnType<typeof chess.move> {
  if (isUciMove(moveStr)) {
    const from = moveStr.slice(0, 2);
    const to = moveStr.slice(2, 4);
    const promotion = moveStr.length === 5 ? moveStr[4] : undefined;
    return chess.move({ from, to, promotion });
  }
  return chess.move(moveStr);
}

export function moveStringToMove(
  fen: string,
  moveStr: string,
): { from: string; to: string; promotion?: string } | null {
  const tempGame = new Chess(fen);
  const move = applyMoveString(tempGame, moveStr);
  return move
    ? { from: move.from, to: move.to, promotion: move.promotion }
    : null;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
