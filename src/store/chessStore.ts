import { create } from "zustand";
import { CSSProperties } from "react";

type Theme = {
  darkSquareStyle: CSSProperties;
  lightSquareStyle: CSSProperties;
};

type ChessStore = {
  theme: Theme;
  moves: string[];
  gameResult: string | null;
  currentFEN: string;
  userName: string;
  profilePhoto: string;
  gameOver: boolean;
  hasPreMove: boolean;
  isPlayerTurn: boolean;
  playerTimeLeft: number;
  opponentTimeLeft: number;
  stockfishLevel: number;
  skillLevel: number;
  playStyle: "aggressive" | "defensive" | "balanced" | "random";
  playAs: "white" | "black";
  timeControl: { initial: number; increment: number };
  playerAddIncrement: () => void;
  opponentAddIncrement: () => void;
  playerResetTimer: () => void;
  opponentResetTimer: () => void;
  onNewGame: () => void;
  clearPreMove: () => void;
  setTheme: (theme: Theme) => void;
  setMoves: (moves: string[]) => void;
  setGameResult: (result: string | null) => void;
  setOnNewGame: (onNewGame: () => void) => void;
  setClearPreMove: (clearPreMove: () => void) => void;
  setCurrentFEN: (fen: string) => void;
  setUserName: (name: string) => void;
  setProfilePhoto: (photo: string) => void;
  setGameOver: (gameOver: boolean) => void;
  setHasPreMove: (has: boolean) => void;
  setIsPlayerTurn: (turn: boolean) => void;
  setStockfishLevel: (level: number) => void;
  setSkillLevel: (level: number) => void;
  setPlayStyle: (
    style: "aggressive" | "defensive" | "balanced" | "random",
  ) => void;
  setPlayAs: (color: "white" | "black") => void;
  setTimeControl: (control: { initial: number; increment: number }) => void;
};

export const useChessStore = create<ChessStore>((set) => ({
  theme: {
    darkSquareStyle: { backgroundColor: "#779952" },
    lightSquareStyle: { backgroundColor: "#edeed1" },
  },
  moves: [],
  gameResult: null,
  currentFEN: "",
  userName: "User",
  profilePhoto: "/images/def_user.jpeg",
  gameOver: false,
  hasPreMove: false,
  isPlayerTurn: true,
  playerTimeLeft: 0,
  opponentTimeLeft: 0,
  stockfishLevel: 3,
  skillLevel: 10,
  playStyle: "balanced",
  playAs: "white",
  timeControl: { initial: 300, increment: 0 }, // 5 min default
  playerAddIncrement: () => {},
  opponentAddIncrement: () => {},
  playerResetTimer: () => {},
  opponentResetTimer: () => {},
  onNewGame: () => {},
  clearPreMove: () => {},
  setTheme: (theme) => set({ theme }),
  setMoves: (moves) => set({ moves }),
  setGameResult: (result) => set({ gameResult: result }),
  setOnNewGame: (onNewGame) => set({ onNewGame }),
  setClearPreMove: (clearPreMove) => set({ clearPreMove }),
  setCurrentFEN: (fen) => set({ currentFEN: fen }),
  setUserName: (name) => set({ userName: name }),
  setProfilePhoto: (photo) => set({ profilePhoto: photo }),
  setGameOver: (gameOver) => set({ gameOver }),
  setHasPreMove: (has) => set({ hasPreMove: has }),
  setIsPlayerTurn: (turn) => set({ isPlayerTurn: turn }),
  setStockfishLevel: (level) => set({ stockfishLevel: level }),
  setSkillLevel: (level) => set({ skillLevel: level }),
  setPlayStyle: (style) => set({ playStyle: style }),
  setPlayAs: (color) => set({ playAs: color }),
  setTimeControl: (control) => set({ timeControl: control }),
}));
