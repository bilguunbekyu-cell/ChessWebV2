import { FourPlayerColor, FourPlayerPieceType } from "./types";

const PIECE_COLORS: Record<FourPlayerColor, string> = {
  red: "#f43f5e",
  blue: "#38bdf8",
  yellow: "#f59e0b",
  green: "#10b981",
};

interface PieceIconProps {
  type: FourPlayerPieceType;
  color: FourPlayerColor;
  className?: string;
}

function PieceGlyph({ type }: { type: FourPlayerPieceType }) {
  if (type === "p") {
    return (
      <>
        <circle cx="32" cy="18" r="7" />
        <path d="M22 46c0-7 4-12 10-13-4-2-6-5-6-9 0-3 3-7 6-7s6 4 6 7c0 4-2 7-6 9 6 1 10 6 10 13v4H22v-4Z" />
        <rect x="18" y="50" width="28" height="6" rx="2" />
      </>
    );
  }

  if (type === "r") {
    return (
      <>
        <rect x="18" y="14" width="6" height="8" rx="1" />
        <rect x="29" y="14" width="6" height="8" rx="1" />
        <rect x="40" y="14" width="6" height="8" rx="1" />
        <rect x="20" y="24" width="24" height="22" rx="2.5" />
        <rect x="16" y="48" width="32" height="8" rx="2" />
      </>
    );
  }

  if (type === "n") {
    return (
      <>
        <path d="M42 48H20c0-10 6-13 10-17-2-4-1-8 2-12 2-3 7-4 10-2-3 3-4 6-3 10 3 2 5 7 3 13Z" />
        <circle cx="34" cy="23" r="1.8" fill="#0f172a" stroke="none" />
        <path d="M27 33c3 1 8 1 12-1" fill="none" />
        <rect x="16" y="50" width="32" height="6" rx="2" />
      </>
    );
  }

  if (type === "b") {
    return (
      <>
        <path d="M32 12c5 0 8 4 8 9 0 5-4 9-8 14-4-5-8-9-8-14 0-5 3-9 8-9Z" />
        <path d="M30 16h4" fill="none" />
        <path d="M24 39c2-2 14-2 16 0 2 2 4 5 4 10H20c0-5 2-8 4-10Z" />
        <rect x="18" y="50" width="28" height="6" rx="2" />
      </>
    );
  }

  if (type === "q") {
    return (
      <>
        <circle cx="17" cy="18" r="3" />
        <circle cx="26" cy="14" r="3" />
        <circle cx="38" cy="14" r="3" />
        <circle cx="47" cy="18" r="3" />
        <path d="M16 25l6 18h20l6-18-9 8-7-14-7 14-9-8Z" />
        <rect x="18" y="44" width="28" height="6" rx="2" />
        <rect x="16" y="51" width="32" height="5" rx="2" />
      </>
    );
  }

  return (
    <>
      <rect x="30" y="8" width="4" height="9" rx="1" />
      <rect x="26" y="11" width="12" height="4" rx="1" />
      <path d="M23 44c0-8 4-14 9-16-3-2-5-5-5-9 0-3 2-7 5-7s5 4 5 7c0 4-2 7-5 9 5 2 9 8 9 16v4H23v-4Z" />
      <rect x="18" y="50" width="28" height="6" rx="2" />
    </>
  );
}

export function PieceIcon({ type, color, className }: PieceIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={{ color: PIECE_COLORS[color] }}
      aria-hidden="true"
    >
      <g
        fill="currentColor"
        stroke="#0f172a"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <PieceGlyph type={type} />
      </g>
      <path
        d="M18 50h28"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
