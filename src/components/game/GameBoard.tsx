import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";
import type { CSSProperties } from "react";

interface GameBoardProps {
  fen: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  onSquareClick: (square: Square) => void;
  customSquareStyles: Record<string, CSSProperties>;
  lastMove?: { from: string; to: string } | null;
}

export function GameBoard({
  fen,
  boardWidth,
  boardOrientation,
  onSquareClick,
  customSquareStyles,
  lastMove,
}: GameBoardProps) {
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
        arePiecesDraggable={false}
        boardWidth={boardWidth}
        position={fen}
        onSquareClick={onSquareClick}
        boardOrientation={boardOrientation}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        customSquareStyles={{ ...customSquareStyles, ...lastMoveStyles }}
        customDarkSquareStyle={{ backgroundColor: "#779556" }}
        customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
      />
    </div>
  );
}
