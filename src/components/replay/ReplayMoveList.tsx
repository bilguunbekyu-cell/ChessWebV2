import { useEffect, useRef } from "react";
import { MoveRow } from "../../hooks/useGameReplay";
import { MoveQualityPill } from "./MoveQualityPill";

interface ReplayMoveListProps {
  moveRows: MoveRow[];
  currentPly: number;
  onJumpTo: (ply: number) => void;
}

const formatMs = (ms?: number) => {
  if (ms === undefined) return null;
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function ReplayMoveList({
  moveRows,
  currentPly,
  onJumpTo,
}: ReplayMoveListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const setRowRef =
    (whitePly: number, blackPly?: number) =>
    (el: HTMLTableRowElement | null) => {
      if (!el) {
        rowRefs.current.delete(whitePly);
        if (blackPly) rowRefs.current.delete(blackPly);
      } else {
        rowRefs.current.set(whitePly, el);
        if (blackPly) rowRefs.current.set(blackPly, el);
      }
    };

  // Auto-scroll to active move (or nearest) whenever ply changes
  useEffect(() => {
    const target =
      rowRefs.current.get(currentPly) ||
      rowRefs.current.get(currentPly - 1) ||
      rowRefs.current.get(currentPly + 1);

    if (target && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      });
    }
  }, [currentPly, moveRows]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto no-scrollbar">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase text-xs">
          <tr>
            <th className="px-3 py-2 w-12 text-left">#</th>
            <th className="px-3 py-2 text-left">White</th>
            <th className="px-3 py-2 text-left">Black</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {moveRows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                No moves recorded
              </td>
            </tr>
          ) : (
            moveRows.map((row) => (
              <tr
                key={row.moveNumber}
                ref={setRowRef(row.plyWhite, row.plyBlack)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-3 py-2 font-mono text-gray-400">
                  {row.moveNumber}.
                </td>
                <td
                  className={`px-3 py-2 cursor-pointer transition-all font-mono ${
                    currentPly === row.plyWhite
                      ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => onJumpTo(row.plyWhite)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.white || "—"}</span>
                    <div className="flex items-center gap-2">
                      {row.whiteQuality && (
                        <MoveQualityPill quality={row.whiteQuality} />
                      )}
                      {row.timeWhite !== undefined && (
                        <span className="text-xs text-gray-400">
                          {formatMs(row.timeWhite)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td
                  className={`px-3 py-2 cursor-pointer transition-all font-mono ${
                    row.plyBlack && currentPly === row.plyBlack
                      ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold"
                      : row.black
                        ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                        : ""
                  }`}
                  onClick={() => row.plyBlack && onJumpTo(row.plyBlack)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.black || "—"}</span>
                    <div className="flex items-center gap-2">
                      {row.blackQuality && (
                        <MoveQualityPill quality={row.blackQuality} />
                      )}
                      {row.timeBlack !== undefined && (
                        <span className="text-xs text-gray-400">
                          {formatMs(row.timeBlack)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
