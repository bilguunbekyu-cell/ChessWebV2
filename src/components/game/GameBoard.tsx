import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";
import { useEffect } from "react";
import type { CSSProperties } from "react";

interface GameBoardProps {
  fen: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  onSquareClick: (square: Square) => void;
  onPieceDrop?: (
    sourceSquare: Square,
    targetSquare: Square,
    piece?: string,
  ) => boolean;
  onCancelSelection?: () => void;
  isDraggablePiece?: (sourceSquare: Square) => boolean;
  customSquareStyles: Record<string, CSSProperties>;
  lastMove?: { from: string; to: string } | null;
  /** Square where the promotion dialog should appear (click-to-move) */
  promotionToSquare?: Square | null;
  /** Whether the promotion dialog is visible (click-to-move) */
  showPromotionDialog?: boolean;
  /** Handler for when a promotion piece is selected */
  onPromotionPieceSelect?: (
    piece?: string,
    fromSquare?: Square,
    toSquare?: Square,
  ) => boolean;
}

export function GameBoard({
  fen,
  boardWidth,
  boardOrientation,
  onSquareClick,
  onPieceDrop,
  onCancelSelection,
  isDraggablePiece,
  customSquareStyles,
  lastMove,
  promotionToSquare,
  showPromotionDialog,
  onPromotionPieceSelect,
}: GameBoardProps) {
  useEffect(() => {
    if (!onCancelSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancelSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancelSelection]);

  const lastMoveStyles = lastMove
    ? {
        [lastMove.from]: {
          backgroundColor: "rgba(250, 204, 21, 0.55)",
        },
        [lastMove.to]: {
          backgroundColor: "rgba(74, 222, 128, 0.55)",
        },
      }
    : {};

  return (
    <div className="relative">
      <Chessboard
        id="PlayVsStockfish"
        animationDuration={200}
        arePiecesDraggable={!!onPieceDrop}
        boardWidth={boardWidth}
        position={fen}
        onSquareClick={onSquareClick}
        onSquareRightClick={() => onCancelSelection?.()}
        onPieceDrop={(sourceSquare, targetSquare, piece) => {
          if (!onPieceDrop) return false;
          return onPieceDrop(
            sourceSquare as Square,
            targetSquare as Square,
            piece,
          );
        }}
        isDraggablePiece={({ sourceSquare }) => {
          if (!onPieceDrop) return false;
          if (!isDraggablePiece) return true;
          return isDraggablePiece(sourceSquare as Square);
        }}
        boardOrientation={boardOrientation}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        customSquareStyles={{ ...customSquareStyles, ...lastMoveStyles }}
        customDarkSquareStyle={{ backgroundColor: "#779556" }}
        customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
        promotionToSquare={promotionToSquare ?? null}
        showPromotionDialog={showPromotionDialog ?? false}
        onPromotionPieceSelect={
          onPromotionPieceSelect
            ? (piece, fromSquare, toSquare) =>
                onPromotionPieceSelect(
                  piece as string | undefined,
                  fromSquare as Square | undefined,
                  toSquare as Square | undefined,
                )
            : undefined
        }
      />
    </div>
  );
}
