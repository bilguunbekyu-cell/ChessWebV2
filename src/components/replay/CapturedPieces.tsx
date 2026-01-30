import { Flag } from "lucide-react";

interface CapturedPiecesProps {
  capturedByWhite: string[];
  capturedByBlack: string[];
}

const pieceGlyph: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
};

function PieceList({ pieces, label }: { pieces: string[]; label: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
      <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-1">
        <Flag className="w-3 h-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1 text-xl min-h-[28px]">
        {pieces.length === 0 ? (
          <span className="text-gray-400 text-sm">None</span>
        ) : (
          pieces.map((p, i) => (
            <span key={i} className="text-gray-700 dark:text-gray-300">
              {pieceGlyph[p] || pieceGlyph[p.toLowerCase()] || p}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function CapturedPieces({
  capturedByWhite,
  capturedByBlack,
}: CapturedPiecesProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <PieceList pieces={capturedByWhite} label="Captured by White" />
      <PieceList pieces={capturedByBlack} label="Captured by Black" />
    </div>
  );
}
