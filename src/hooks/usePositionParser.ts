import { useMemo } from "react";
import { Chess, Move } from "chess.js";
import { GameHistory } from "../historyTypes";
import { PlyState, MoveRow, PositionData } from "./useGameReplayTypes";

export function usePositionParser(game: GameHistory): PositionData {
  return useMemo(() => {
    const chess = new Chess();
    const verboseMoves: Move[] = [];

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
      try {
        chess.reset();
        // chess.js uses load_pgn
        // @ts-ignore
        chess.load_pgn
          ? chess.load_pgn(game.pgn, { sloppy: true })
          : chess.loadPgn?.(game.pgn);
        const hist = chess.history({ verbose: true });
        verboseMoves.push(...hist);
      } catch (e) {
        console.warn("Failed to parse PGN:", e);
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

          plyStates.push({
            fen: chess.fen(),
            moveSAN: applied.san,
            from: applied.from,
            to: applied.to,
            color: applied.color,
            captured: capturedPiece,
            isCheck: chess.in_check?.() ?? false,
            isCheckmate: chess.in_checkmate?.() ?? false,
            isStalemate: chess.in_stalemate?.() ?? false,
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
