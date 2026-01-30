import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

interface ReplayBoardProps {
  position: string;
  orientation: "white" | "black";
  lastMove: { from: string; to: string } | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
}

export function ReplayBoard({
  position,
  orientation,
  lastMove,
  isCheck,
  isCheckmate,
  isStalemate,
}: ReplayBoardProps) {
  const [boardWidth, setBoardWidth] = useState<number>(480);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calc = () => {
      const available = (containerRef.current?.offsetWidth ?? window.innerWidth) - 32; // padding guard
      const size = Math.min(Math.max(available, 260), 520);
      setBoardWidth(size);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(calc)
        : null;

    calc();
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", calc);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, []);

  const squareStyles = lastMove
    ? {
        [lastMove.from]: { background: "rgba(59, 130, 246, 0.4)" },
        [lastMove.to]: { background: "rgba(16, 185, 129, 0.5)" },
      }
    : {};

  return (
    <div className="relative w-full flex justify-center" ref={containerRef}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800 shadow-lg">
        <Chessboard
          id="replay-board"
          position={position}
          boardOrientation={orientation}
          animationDuration={200}
          boardWidth={boardWidth}
          customSquareStyles={squareStyles}
          arePiecesDraggable={false}
          customBoardStyle={{
            borderRadius: "8px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Status Badge */}
      {(isCheck || isCheckmate || isStalemate) && (
        <div
          className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg ${
            isCheckmate
              ? "bg-red-500"
              : isStalemate
                ? "bg-yellow-500"
                : "bg-amber-500"
          }`}
        >
          {isCheckmate ? "Checkmate!" : isStalemate ? "Stalemate" : "Check!"}
        </div>
      )}
    </div>
  );
}
