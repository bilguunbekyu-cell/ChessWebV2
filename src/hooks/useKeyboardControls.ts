import { useEffect } from "react";

export function useKeyboardControls(
  ply: number,
  totalPlies: number,
  jumpTo: (target: number) => void,
  togglePlay: () => void,
  flipBoard: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          jumpTo(ply - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          jumpTo(ply + 1);
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "Home":
          e.preventDefault();
          jumpTo(0);
          break;
        case "End":
          e.preventDefault();
          jumpTo(totalPlies);
          break;
        case "f":
        case "F":
          e.preventDefault();
          flipBoard();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ply, totalPlies, jumpTo, togglePlay, flipBoard]);
}
