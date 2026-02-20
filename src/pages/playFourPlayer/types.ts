export type FourPlayerColor = "red" | "blue" | "yellow" | "green";
export type FourPlayerPieceType = "k" | "q" | "r" | "b" | "n" | "p";

export interface FourPlayerPiece {
  color: FourPlayerColor;
  type: FourPlayerPieceType;
}

export interface FourPlayerPlayerInfo {
  userId?: string | null;
  name: string;
}

export type FourPlayerPlayers = Record<FourPlayerColor, FourPlayerPlayerInfo>;

export interface Square {
  row: number;
  col: number;
}

export interface FourPlayerMove {
  from: Square;
  to: Square;
  piece: FourPlayerPiece;
  captured?: FourPlayerPiece | null;
  promoted?: FourPlayerPieceType;
  eliminated?: FourPlayerColor | null;
}

export type FourPlayerBoard = (FourPlayerPiece | null)[][];

export interface FourPlayerState {
  board: FourPlayerBoard;
  turn: FourPlayerColor;
  winner: FourPlayerColor | null;
  eliminated: FourPlayerColor[];
  moves: FourPlayerMove[];
}
