import {
  FourPlayerBoard,
  FourPlayerColor,
  FourPlayerMove,
  FourPlayerPiece,
  FourPlayerPieceType,
  FourPlayerState,
  Square,
} from "./types";

export const FOUR_PLAYER_BOARD_SIZE = 14;
const CORNER_CUT_SIZE = 3;
const PLAYER_ORDER: FourPlayerColor[] = ["red", "blue", "yellow", "green"];
const BACK_RANK_ORDER: FourPlayerPieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

const KNIGHT_OFFSETS = [
  { dr: -2, dc: -1 },
  { dr: -2, dc: 1 },
  { dr: -1, dc: -2 },
  { dr: -1, dc: 2 },
  { dr: 1, dc: -2 },
  { dr: 1, dc: 2 },
  { dr: 2, dc: -1 },
  { dr: 2, dc: 1 },
];

const KING_OFFSETS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < FOUR_PLAYER_BOARD_SIZE && col >= 0 && col < FOUR_PLAYER_BOARD_SIZE;
}

export function isPlayableSquare(row: number, col: number): boolean {
  if (!inBounds(row, col)) return false;

  const topLeftCut = row < CORNER_CUT_SIZE && col < CORNER_CUT_SIZE;
  const topRightCut =
    row < CORNER_CUT_SIZE && col >= FOUR_PLAYER_BOARD_SIZE - CORNER_CUT_SIZE;
  const bottomLeftCut =
    row >= FOUR_PLAYER_BOARD_SIZE - CORNER_CUT_SIZE && col < CORNER_CUT_SIZE;
  const bottomRightCut =
    row >= FOUR_PLAYER_BOARD_SIZE - CORNER_CUT_SIZE &&
    col >= FOUR_PLAYER_BOARD_SIZE - CORNER_CUT_SIZE;

  return !(topLeftCut || topRightCut || bottomLeftCut || bottomRightCut);
}

function emptyBoard(): FourPlayerBoard {
  return Array.from({ length: FOUR_PLAYER_BOARD_SIZE }, () =>
    Array.from({ length: FOUR_PLAYER_BOARD_SIZE }, () => null),
  );
}

function placePiece(
  board: FourPlayerBoard,
  row: number,
  col: number,
  piece: FourPlayerPiece,
) {
  if (!isPlayableSquare(row, col)) return;
  board[row][col] = piece;
}

function setupRed(board: FourPlayerBoard) {
  const backRow = 13;
  const pawnRow = 12;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const col = 3 + i;
    placePiece(board, backRow, col, { color: "red", type: BACK_RANK_ORDER[i] });
    placePiece(board, pawnRow, col, { color: "red", type: "p" });
  }
}

function setupYellow(board: FourPlayerBoard) {
  const backRow = 0;
  const pawnRow = 1;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const col = 3 + i;
    placePiece(board, backRow, col, {
      color: "yellow",
      type: BACK_RANK_ORDER[i],
    });
    placePiece(board, pawnRow, col, { color: "yellow", type: "p" });
  }
}

function setupBlue(board: FourPlayerBoard) {
  const backCol = 0;
  const pawnCol = 1;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const row = 3 + i;
    placePiece(board, row, backCol, { color: "blue", type: BACK_RANK_ORDER[i] });
    placePiece(board, row, pawnCol, { color: "blue", type: "p" });
  }
}

function setupGreen(board: FourPlayerBoard) {
  const backCol = 13;
  const pawnCol = 12;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const row = 3 + i;
    placePiece(board, row, backCol, {
      color: "green",
      type: BACK_RANK_ORDER[i],
    });
    placePiece(board, row, pawnCol, { color: "green", type: "p" });
  }
}

function cloneBoard(board: FourPlayerBoard): FourPlayerBoard {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function createInitialFourPlayerState(): FourPlayerState {
  const board = emptyBoard();
  setupRed(board);
  setupBlue(board);
  setupYellow(board);
  setupGreen(board);

  return {
    board,
    turn: "red",
    winner: null,
    eliminated: [],
    moves: [],
  };
}

function isEnemy(piece: FourPlayerPiece | null, color: FourPlayerColor): boolean {
  return !!piece && piece.color !== color;
}

function isFriendly(piece: FourPlayerPiece | null, color: FourPlayerColor): boolean {
  return !!piece && piece.color === color;
}

function getForwardData(color: FourPlayerColor) {
  if (color === "red") {
    return {
      dr: -1,
      dc: 0,
      captures: [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
      ],
      isStart: (row: number, col: number) => row === 12 && col >= 3 && col <= 10,
      isPromotion: (row: number) => row === 0,
    };
  }

  if (color === "yellow") {
    return {
      dr: 1,
      dc: 0,
      captures: [
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 },
      ],
      isStart: (row: number, col: number) => row === 1 && col >= 3 && col <= 10,
      isPromotion: (row: number) => row === 13,
    };
  }

  if (color === "blue") {
    return {
      dr: 0,
      dc: 1,
      captures: [
        { dr: -1, dc: 1 },
        { dr: 1, dc: 1 },
      ],
      isStart: (row: number, col: number) => col === 1 && row >= 3 && row <= 10,
      isPromotion: (_row: number, col: number) => col === 13,
    };
  }

  return {
    dr: 0,
    dc: -1,
    captures: [
      { dr: -1, dc: -1 },
      { dr: 1, dc: -1 },
    ],
    isStart: (row: number, col: number) => col === 12 && row >= 3 && row <= 10,
    isPromotion: (_row: number, col: number) => col === 0,
  };
}

function addSlidingMoves(
  board: FourPlayerBoard,
  from: Square,
  color: FourPlayerColor,
  directions: Array<{ dr: number; dc: number }>,
  moves: Square[],
) {
  directions.forEach(({ dr, dc }) => {
    let row = from.row + dr;
    let col = from.col + dc;

    while (isPlayableSquare(row, col)) {
      const target = board[row][col];
      if (isFriendly(target, color)) {
        break;
      }

      moves.push({ row, col });

      if (target) {
        break;
      }

      row += dr;
      col += dc;
    }
  });
}

function getPseudoLegalMoves(
  board: FourPlayerBoard,
  from: Square,
  piece: FourPlayerPiece,
): Square[] {
  const moves: Square[] = [];

  if (piece.type === "p") {
    const forward = getForwardData(piece.color);
    const oneStepRow = from.row + forward.dr;
    const oneStepCol = from.col + forward.dc;

    if (
      isPlayableSquare(oneStepRow, oneStepCol) &&
      board[oneStepRow][oneStepCol] === null
    ) {
      moves.push({ row: oneStepRow, col: oneStepCol });

      const twoStepRow = oneStepRow + forward.dr;
      const twoStepCol = oneStepCol + forward.dc;
      if (
        forward.isStart(from.row, from.col) &&
        isPlayableSquare(twoStepRow, twoStepCol) &&
        board[twoStepRow][twoStepCol] === null
      ) {
        moves.push({ row: twoStepRow, col: twoStepCol });
      }
    }

    forward.captures.forEach(({ dr, dc }) => {
      const row = from.row + dr;
      const col = from.col + dc;
      if (!isPlayableSquare(row, col)) return;
      if (isEnemy(board[row][col], piece.color)) {
        moves.push({ row, col });
      }
    });

    return moves;
  }

  if (piece.type === "n") {
    KNIGHT_OFFSETS.forEach(({ dr, dc }) => {
      const row = from.row + dr;
      const col = from.col + dc;
      if (!isPlayableSquare(row, col)) return;
      if (!isFriendly(board[row][col], piece.color)) {
        moves.push({ row, col });
      }
    });
    return moves;
  }

  if (piece.type === "k") {
    KING_OFFSETS.forEach(({ dr, dc }) => {
      const row = from.row + dr;
      const col = from.col + dc;
      if (!isPlayableSquare(row, col)) return;
      if (!isFriendly(board[row][col], piece.color)) {
        moves.push({ row, col });
      }
    });
    return moves;
  }

  if (piece.type === "b" || piece.type === "q") {
    addSlidingMoves(
      board,
      from,
      piece.color,
      [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 },
      ],
      moves,
    );
  }

  if (piece.type === "r" || piece.type === "q") {
    addSlidingMoves(
      board,
      from,
      piece.color,
      [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ],
      moves,
    );
  }

  return moves;
}

export function getLegalMoves(state: FourPlayerState, from: Square): Square[] {
  if (state.winner) return [];
  if (!isPlayableSquare(from.row, from.col)) return [];

  const piece = state.board[from.row][from.col];
  if (!piece || piece.color !== state.turn) return [];

  return getPseudoLegalMoves(state.board, from, piece);
}

function removeAllPiecesOfColor(
  board: FourPlayerBoard,
  color: FourPlayerColor,
): FourPlayerBoard {
  const nextBoard = cloneBoard(board);
  for (let row = 0; row < FOUR_PLAYER_BOARD_SIZE; row += 1) {
    for (let col = 0; col < FOUR_PLAYER_BOARD_SIZE; col += 1) {
      if (nextBoard[row][col]?.color === color) {
        nextBoard[row][col] = null;
      }
    }
  }
  return nextBoard;
}

function nextActiveColor(current: FourPlayerColor, eliminated: FourPlayerColor[]) {
  const eliminatedSet = new Set(eliminated);
  let index = PLAYER_ORDER.indexOf(current);

  for (let step = 0; step < PLAYER_ORDER.length; step += 1) {
    index = (index + 1) % PLAYER_ORDER.length;
    const candidate = PLAYER_ORDER[index];
    if (!eliminatedSet.has(candidate)) {
      return candidate;
    }
  }

  return current;
}

function alivePlayers(eliminated: FourPlayerColor[]): FourPlayerColor[] {
  const eliminatedSet = new Set(eliminated);
  return PLAYER_ORDER.filter((color) => !eliminatedSet.has(color));
}

export function applyMove(
  state: FourPlayerState,
  from: Square,
  to: Square,
): FourPlayerState {
  if (state.winner) return state;
  if (!isPlayableSquare(from.row, from.col) || !isPlayableSquare(to.row, to.col)) {
    return state;
  }

  const piece = state.board[from.row][from.col];
  if (!piece || piece.color !== state.turn) return state;

  const legalMoves = getPseudoLegalMoves(state.board, from, piece);
  const isLegal = legalMoves.some((sq) => sq.row === to.row && sq.col === to.col);
  if (!isLegal) return state;

  const board = cloneBoard(state.board);
  const captured = board[to.row][to.col];
  board[from.row][from.col] = null;

  let promoted: FourPlayerPieceType | undefined;
  if (piece.type === "p") {
    const forward = getForwardData(piece.color);
    const shouldPromote = forward.isPromotion(to.row, to.col);
    if (shouldPromote) {
      promoted = "q";
      board[to.row][to.col] = { color: piece.color, type: "q" };
    } else {
      board[to.row][to.col] = { ...piece };
    }
  } else {
    board[to.row][to.col] = { ...piece };
  }

  let eliminated = [...state.eliminated];
  let eliminatedColor: FourPlayerColor | null = null;
  let nextBoard = board;
  if (captured?.type === "k") {
    eliminatedColor = captured.color;
    if (!eliminated.includes(captured.color)) {
      eliminated = [...eliminated, captured.color];
      nextBoard = removeAllPiecesOfColor(board, captured.color);
    }
  }

  const survivors = alivePlayers(eliminated);
  const winner = survivors.length === 1 ? survivors[0] : null;
  const nextTurn = winner ? state.turn : nextActiveColor(state.turn, eliminated);

  const move: FourPlayerMove = {
    from,
    to,
    piece,
    captured: captured || null,
    promoted,
    eliminated: eliminatedColor,
  };

  return {
    board: nextBoard,
    turn: nextTurn,
    winner,
    eliminated,
    moves: [...state.moves, move],
  };
}

export function squareToText(square: Square): string {
  const file = String.fromCharCode("a".charCodeAt(0) + square.col);
  const rank = String(FOUR_PLAYER_BOARD_SIZE - square.row);
  return `${file}${rank}`;
}

export function formatMoveText(move: FourPlayerMove): string {
  const pieceLabel =
    move.piece.type === "p" ? "" : move.piece.type.toUpperCase();
  const captureMark = move.captured ? "x" : "-";
  const promo = move.promoted ? `=${move.promoted.toUpperCase()}` : "";
  const eliminated = move.eliminated ? ` (eliminated ${move.eliminated})` : "";

  return `${pieceLabel}${squareToText(move.from)}${captureMark}${squareToText(move.to)}${promo}${eliminated}`;
}
