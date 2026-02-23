import { useEffect, useRef } from "react";
import { PlyState } from "./useGameReplayTypes";
import { playChessMoveSound } from "../utils/moveSounds";

export function useReplayMoveSounds(
  ply: number,
  plies: PlyState[],
  playAs: "white" | "black",
) {
  const previousPlyRef = useRef<number>(ply);

  useEffect(() => {
    const previousPly = previousPlyRef.current;
    previousPlyRef.current = ply;

    if (ply <= 0 || ply === previousPly) {
      return;
    }

    const currentPlyState = plies[ply - 1];
    if (!currentPlyState) return;

    const viewerColor = playAs === "black" ? "b" : "w";
    const isOpponentMove =
      currentPlyState.color != null
        ? currentPlyState.color !== viewerColor
        : false;

    playChessMoveSound(
      {
        san: currentPlyState.moveSAN,
        captured: currentPlyState.captured,
        check: currentPlyState.isCheck,
        checkmate: currentPlyState.isCheckmate,
      },
      { isOpponentMove },
    );
  }, [ply, plies, playAs]);
}
