import { useState, useEffect, useCallback } from "react";
import { GameHistory } from "../historyTypes";
import { clamp } from "./useGameReplayTypes";

export function usePlaybackControls(game: GameHistory, totalPlies: number) {
  const [ply, setPly] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [orientation, setOrientation] = useState<"white" | "black">(
    game.playAs === "black" ? "black" : "white",
  );

  const atEnd = ply >= totalPlies;

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || atEnd) {
      if (atEnd && isPlaying) setIsPlaying(false);
      return;
    }

    const delay = 1000 / speed; // adjustable speed
    const handle = setTimeout(() => {
      setPly((p) => Math.min(p + 1, totalPlies));
    }, delay);

    return () => clearTimeout(handle);
  }, [isPlaying, ply, totalPlies, atEnd, speed]);

  const jumpTo = useCallback(
    (target: number) => {
      setPly(clamp(target, 0, totalPlies));
      setIsPlaying(false);
    },
    [totalPlies],
  );

  const togglePlay = useCallback(() => {
    if (atEnd) {
      setPly(0);
    }
    setIsPlaying((p) => !p);
  }, [atEnd]);

  const flipBoard = useCallback(() => {
    setOrientation((o) => (o === "white" ? "black" : "white"));
  }, []);

  return {
    ply,
    isPlaying,
    speed,
    orientation,
    atEnd,
    jumpTo,
    togglePlay,
    setSpeed,
    flipBoard,
  };
}
