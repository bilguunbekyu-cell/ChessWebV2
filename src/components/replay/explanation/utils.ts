import { Chess } from "chess.js";

/**
 * Convert UCI move notation to SAN using chess.js
 */
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move?.san || uci;
  } catch {
    return uci;
  }
}

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
