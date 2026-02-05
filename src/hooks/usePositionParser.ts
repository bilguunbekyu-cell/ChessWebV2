import { useMemo } from "react";
import { Chess, Move } from "chess.js";
import { GameHistory } from "../historyTypes";
import { PlyState, MoveRow, PositionData } from "./useGameReplayTypes";

export function usePositionParser(game: GameHistory): PositionData {
  return useMemo(() => {
    const chess = new Chess();
    const verboseMoves: Move[] = [];

    const loadPgn = (pgnText: string) => {
      if (!pgnText) return false;
      try {
        chess.reset();
        const loader =
          (chess as any).load_pgn?.bind(chess) ||
          (chess as any).loadPgn?.bind(chess);
        if (typeof loader !== "function") return false;
        const ok = loader(pgnText, { sloppy: true });
        if (ok === false) return false;
        const hist = chess.history({ verbose: true });
        if (hist.length > 0) {
          verboseMoves.push(...hist);
          return true;
        }
      } catch (e) {
        console.warn("Failed to parse PGN:", e);
      }
      return false;
    };

    const loadMoveText = (moveText: string) => {
      if (!moveText) return false;
      const sanitized = moveText
        .replace(/\{[^}]*\}/g, " ")
        .replace(/\([^)]*\)/g, " ")
        .replace(/\$\d+/g, " ")
        .replace(/\d+\.(\.\.)?/g, " ")
        .replace(/\b1-0\b|\b0-1\b|\b1\/2-1\/2\b|\*/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!sanitized) return false;

      chess.reset();
      for (const token of sanitized.split(" ")) {
        if (!token) continue;
        try {
          const res = chess.move(token, { sloppy: true });
          if (res) verboseMoves.push(res);
        } catch (e) {
          console.warn("Invalid move token:", token, e);
          return false;
        }
      }
      return verboseMoves.length > 0;
    };

    // Try primary source: stored moves array (SAN expected)
    if (game.moves && game.moves.length > 0) {
      chess.reset();
      for (const moveStr of game.moves) {
        try {
          const res = chess.move(moveStr, { sloppy: true });
          if (res) verboseMoves.push(res);
        } catch (e) {
          console.warn("Invalid move:", moveStr, e);
        }
      }
    }

    // Fallback: parse PGN if moves array failed/empty
    if (verboseMoves.length === 0 && game.pgn) {
      loadPgn(game.pgn);
    }

    // Fallback: parse moveText if still empty
    if (verboseMoves.length === 0 && game.moveText) {
      if (!loadPgn(game.moveText)) {
        loadMoveText(game.moveText);
      }
    }

    // If parsing failed, return minimal state to avoid crashes
    if (verboseMoves.length === 0) {
      return {
        positions: [chess.fen()],
        plies: [],
        moveRows: [],
        totalPlies: 0,
      };
    }

    // Rebuild from start to capture all intermediate FENs and captures
    chess.reset();
    const fens: string[] = [chess.fen()];
    const plyStates: PlyState[] = [];

    for (const move of verboseMoves) {
      try {
        let applied = chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });

        if (!applied) {
          applied = chess.move(move.san, { sloppy: true });
        }

        if (applied) {
          const capturedPiece = applied.captured
            ? applied.color === "w"
              ? applied.captured.toLowerCase()
              : applied.captured.toUpperCase()
            : undefined;

          const isCheck =
            typeof (chess as any).inCheck === "function"
              ? (chess as any).inCheck()
              : chess.in_check?.() ?? false;
          const isCheckmate =
            typeof (chess as any).isCheckmate === "function"
              ? (chess as any).isCheckmate()
              : chess.in_checkmate?.() ?? false;
          const isStalemate =
            typeof (chess as any).isStalemate === "function"
              ? (chess as any).isStalemate()
              : chess.in_stalemate?.() ?? false;

          plyStates.push({
            fen: chess.fen(),
            moveSAN: applied.san,
            from: applied.from,
            to: applied.to,
            color: applied.color,
            captured: capturedPiece,
            isCheck,
            isCheckmate,
            isStalemate,
          });

          fens.push(chess.fen());
        } else {
          console.warn("Failed to apply move", move);
        }
      } catch (e) {
        console.warn("Error applying move:", move, e);
      }
    }

    // Build move rows for the table
    const rows: MoveRow[] = [];
    for (let i = 0; i < verboseMoves.length; i += 2) {
      const whiteMove = verboseMoves[i];
      const blackMove = verboseMoves[i + 1];
      rows.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: whiteMove?.san,
        black: blackMove?.san,
        plyWhite: i + 1,
        plyBlack: blackMove ? i + 2 : undefined,
        timeWhite: game.moveTimes?.[i],
        timeBlack: game.moveTimes?.[i + 1],
      });
    }

    return {
      positions: fens,
      plies: plyStates,
      moveRows: rows,
      totalPlies: verboseMoves.length,
    };
  }, [game]);
}
