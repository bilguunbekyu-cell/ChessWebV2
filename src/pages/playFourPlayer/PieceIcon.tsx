import { useMemo } from "react";
import { FourPlayerColor, FourPlayerPieceType } from "./types";
import pawnSvg from "../../assets/pieces/cburnett/pawn.svg?raw";
import rookSvg from "../../assets/pieces/cburnett/rook.svg?raw";
import knightSvg from "../../assets/pieces/cburnett/knight.svg?raw";
import bishopSvg from "../../assets/pieces/cburnett/bishop.svg?raw";
import queenSvg from "../../assets/pieces/cburnett/queen.svg?raw";
import kingSvg from "../../assets/pieces/cburnett/king.svg?raw";

const PIECE_SVGS: Record<FourPlayerPieceType, string> = {
  p: pawnSvg,
  r: rookSvg,
  n: knightSvg,
  b: bishopSvg,
  q: queenSvg,
  k: kingSvg,
};

const PIECE_COLORS: Record<FourPlayerColor, { fill: string; stroke: string }> = {
  red: { fill: "#ef476f", stroke: "#4a0c1d" },
  blue: { fill: "#38bdf8", stroke: "#082f49" },
  yellow: { fill: "#f8cc46", stroke: "#5c4300" },
  green: { fill: "#4fc97a", stroke: "#064e3b" },
};

function tintPieceSvg(svg: string, fill: string, stroke: string): string {
  return svg
    .replace(
      "<svg ",
      '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ',
    )
    .replace(/fill="#fff"/gi, `fill="${fill}"`)
    .replace(/fill="#ffffff"/gi, `fill="${fill}"`)
    .replace(/fill="white"/gi, `fill="${fill}"`)
    .replace(/stroke="#000"/gi, `stroke="${stroke}"`)
    .replace(/stroke="#000000"/gi, `stroke="${stroke}"`);
}

interface PieceIconProps {
  type: FourPlayerPieceType;
  color: FourPlayerColor;
  className?: string;
}

export function PieceIcon({ type, color, className }: PieceIconProps) {
  const svgMarkup = useMemo(() => {
    const pieceSvg = PIECE_SVGS[type];
    const palette = PIECE_COLORS[color];
    return tintPieceSvg(pieceSvg, palette.fill, palette.stroke);
  }, [color, type]);

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
