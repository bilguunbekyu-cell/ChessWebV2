import { useCallback, useState } from "react";
import { Chess, Square } from "chess.js";
import { OptionSquares } from "./useStockfishGameTypes";

/**
 * Extract a single-char promotion key ("q", "r", "b", "n") from the piece
 * string that react-chessboard passes (e.g. "wQ", "bN") or from an already
 * lowercase char.  Falls back to "q".
 */
function extractPromotion(piece?: string): "q" | "r" | "b" | "n" {
  if (!piece) return "q";
  // react-chessboard format: "wQ", "bR", etc.
  const ch = piece.length === 2 ? piece[1].toLowerCase() : piece[0].toLowerCase();
  if (ch === "q" || ch === "r" || ch === "b" || ch === "n") return ch;
  return "q";
}

/** Check whether moving `from → to` is a pawn promotion. */
function isPromotionMove(game: Chess, from: Square, to: Square): boolean {
  const piece = game.get(from);
  if (!piece || piece.type !== "p") return false;
  return (piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1");
}

export function useSquareClickHandler(
  gameRef: React.MutableRefObject<Chess>,
  gameStarted: boolean,
  gameOver: boolean,
  playerColor: "w" | "b",
  moveFrom: Square | null,
  setMoveFrom: React.Dispatch<React.SetStateAction<Square | null>>,
  setOptionSquares: React.Dispatch<React.SetStateAction<OptionSquares>>,
  setGame: React.Dispatch<React.SetStateAction<Chess>>,
  setMoves: React.Dispatch<React.SetStateAction<string[]>>,
  getMoveOptions: (square: Square) => boolean,
  setPreMove: (from: string, to: string, promotion?: string) => void,
  clearPreMove: () => void,
  setLastMove?: React.Dispatch<
    React.SetStateAction<{ from: Square; to: Square } | null>
  >,
) {
  // ---------- promotion dialog state (click-to-move) ----------
  const [promotionToSquare, setPromotionToSquare] = useState<Square | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromoFrom, setPendingPromoFrom] = useState<Square | null>(null);

  const clearSelection = useCallback(() => {
    setMoveFrom(null);
    setOptionSquares({});
  }, [setMoveFrom, setOptionSquares]);

  const commitMove = useCallback(
    (from: Square, to: Square, promotion: "q" | "r" | "b" | "n" = "q") => {
      const currentGame = gameRef.current;

      try {
        const result = currentGame.move({
          from,
          to,
          promotion,
        });
        if (!result) return false;

        gameRef.current = currentGame;
        setGame(new Chess(currentGame.fen()));
        setMoves(currentGame.history());
        clearPreMove();
        setLastMove?.({ from, to });
        clearSelection();
        return true;
      } catch {
        return false;
      }
    },
    [clearPreMove, clearSelection, gameRef, setGame, setLastMove, setMoves],
  );

  // ---------- promotion piece select handler ----------
  const onPromotionPieceSelect = useCallback(
    (piece?: string, _fromSquare?: Square, _toSquare?: Square) => {
      const from = pendingPromoFrom;
      const to = promotionToSquare;

      // Reset dialog state first
      setShowPromotionDialog(false);
      setPromotionToSquare(null);
      setPendingPromoFrom(null);

      if (!piece || !from || !to) {
        // User cancelled (clicked backdrop)
        return false;
      }

      const promo = extractPromotion(piece);
      return commitMove(from, to, promo);
    },
    [commitMove, pendingPromoFrom, promotionToSquare],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!gameStarted || gameOver) return;

      const currentGame = gameRef.current;
      const turn = currentGame.turn();

      // If engine's turn: allow setting a premove with player's piece
      if (turn !== playerColor) {
        if (!moveFrom) {
          const piece = currentGame.get(square);
          if (piece && piece.color === playerColor) {
            getMoveOptions(square);
            setMoveFrom(square);
          }
          return;
        }

        const moves = currentGame.moves({ square: moveFrom, verbose: true });
        const legal = moves.find((m) => m.to === square);
        if (legal) {
          setPreMove(moveFrom, square, legal.promotion as any);
        }
        clearSelection();
        return;
      }

      // Player turn: normal move flow
      if (!moveFrom) {
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor) {
          getMoveOptions(square);
          setMoveFrom(square);
        }
        return;
      }

      if (moveFrom === square) {
        clearSelection();
        return;
      }

      // Check if this is a promotion move → show the dialog instead of auto-queen
      const isLegal = currentGame
        .moves({ square: moveFrom, verbose: true })
        .some((m) => m.to === square);

      if (isLegal && isPromotionMove(currentGame, moveFrom, square)) {
        setPendingPromoFrom(moveFrom);
        setPromotionToSquare(square);
        setShowPromotionDialog(true);
        clearSelection();
        return;
      }

      if (commitMove(moveFrom, square)) {
        return;
      }

      const piece = currentGame.get(square);
      if (piece && piece.color === playerColor) {
        getMoveOptions(square);
        setMoveFrom(square);
        return;
      }

      clearSelection();
    },
    [
      clearSelection,
      commitMove,
      gameRef,
      gameStarted,
      gameOver,
      playerColor,
      moveFrom,
      setMoveFrom,
      setOptionSquares,
      getMoveOptions,
      setPreMove,
      setLastMove,
    ],
  );

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece?: string) => {
      if (!gameStarted || gameOver) return false;

      const currentGame = gameRef.current;
      const srcPiece = currentGame.get(sourceSquare);
      if (!srcPiece || srcPiece.color !== playerColor) return false;

      const turn = currentGame.turn();
      if (turn !== playerColor) {
        const premove = currentGame
          .moves({ square: sourceSquare, verbose: true })
          .find((move) => move.to === targetSquare);
        if (!premove) return false;
        setPreMove(sourceSquare, targetSquare, premove.promotion as any);
        clearSelection();
        return false;
      }

      // For drag-and-drop, react-chessboard already showed the promotion dialog
      // and passes the chosen piece (e.g. "bQ") as the third argument.
      const promo = extractPromotion(piece);
      const moved = commitMove(sourceSquare, targetSquare, promo);
      if (moved) return true;

      if (getMoveOptions(sourceSquare)) {
        setMoveFrom(sourceSquare);
      }
      return false;
    },
    [
      clearSelection,
      commitMove,
      gameOver,
      gameRef,
      gameStarted,
      getMoveOptions,
      playerColor,
      setMoveFrom,
      setPreMove,
    ],
  );

  const isDraggablePiece = useCallback(
    (sourceSquare: Square) => {
      if (!gameStarted || gameOver) return false;
      const piece = gameRef.current.get(sourceSquare);
      return !!piece && piece.color === playerColor;
    },
    [gameOver, gameRef, gameStarted, playerColor],
  );

  return {
    onSquareClick,
    onPieceDrop,
    onCancelSelection: clearSelection,
    isDraggablePiece,
    // Promotion dialog state for click-to-move
    promotionToSquare,
    showPromotionDialog,
    onPromotionPieceSelect,
  };
}
