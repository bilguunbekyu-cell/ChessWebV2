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

export interface CastlingState {
  k: boolean;
  q: boolean;
}

export type CastlingRights = Record<FourPlayerColor, CastlingState>;

export interface EnPassantState {
  target: Square;
  pawn: Square;
  color: FourPlayerColor;
  availableFor: FourPlayerColor;
}

export interface FourPlayerMove {
  from: Square;
  to: Square;
  piece: FourPlayerPiece;
  captured?: FourPlayerPiece | null;
  promoted?: FourPlayerPieceType;
  castlingSide?: "k" | "q";
  enPassant?: boolean;
  eliminated?: FourPlayerColor | null;
}

export type FourPlayerBoard = (FourPlayerPiece | null)[][];

export interface FourPlayerState {
  board: FourPlayerBoard;
  turn: FourPlayerColor;
  winner: FourPlayerColor | null;
  eliminated: FourPlayerColor[];
  castlingRights: CastlingRights;
  enPassant: EnPassantState | null;
  moves: FourPlayerMove[];
}
