import { useMemo } from "react";
import { PlyState, CaptureTimeline } from "./useGameReplayTypes";

export function useCaptureTimeline(plies: PlyState[]): CaptureTimeline {
  return useMemo(() => {
    const white: string[][] = [[]];
    const black: string[][] = [[]];

    plies.forEach((plyState) => {
      const nextWhite = white[white.length - 1].slice();
      const nextBlack = black[black.length - 1].slice();

      if (plyState.captured) {
        if (plyState.color === "w") {
          nextWhite.push(plyState.captured);
        } else {
          nextBlack.push(plyState.captured);
        }
      }

      white.push(nextWhite);
      black.push(nextBlack);
    });

    return { white, black };
  }, [plies]);
}
