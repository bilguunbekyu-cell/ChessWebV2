const FOUR_PLAYER_BOARD_SIZE = 14;
const CORNER_CUT_SIZE = 3;
export const FOUR_PLAYER_COLORS = ["red", "blue", "yellow", "green"];
const BACK_RANK_ORDER = ["r", "n", "b", "q", "k", "b", "n", "r"];

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

function inBounds(row, col) {
  return row >= 0 && row < FOUR_PLAYER_BOARD_SIZE && col >= 0 && col < FOUR_PLAYER_BOARD_SIZE;
}

export function isPlayableFourPlayerSquare(row, col) {
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

function emptyBoard() {
  return Array.from({ length: FOUR_PLAYER_BOARD_SIZE }, () =>
    Array.from({ length: FOUR_PLAYER_BOARD_SIZE }, () => null),
  );
}

function placePiece(board, row, col, piece) {
  if (!isPlayableFourPlayerSquare(row, col)) return;
  board[row][col] = piece;
}

function setupRed(board) {
  const backRow = 13;
  const pawnRow = 12;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const col = 3 + i;
    placePiece(board, backRow, col, { color: "red", type: BACK_RANK_ORDER[i] });
    placePiece(board, pawnRow, col, { color: "red", type: "p" });
  }
}

function setupYellow(board) {
  const backRow = 0;
  const pawnRow = 1;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const col = 3 + i;
    placePiece(board, backRow, col, { color: "yellow", type: BACK_RANK_ORDER[i] });
    placePiece(board, pawnRow, col, { color: "yellow", type: "p" });
  }
}

function setupBlue(board) {
  const backCol = 0;
  const pawnCol = 1;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const row = 3 + i;
    placePiece(board, row, backCol, { color: "blue", type: BACK_RANK_ORDER[i] });
    placePiece(board, row, pawnCol, { color: "blue", type: "p" });
  }
}

function setupGreen(board) {
  const backCol = 13;
  const pawnCol = 12;
  for (let i = 0; i < BACK_RANK_ORDER.length; i += 1) {
    const row = 3 + i;
    placePiece(board, row, backCol, { color: "green", type: BACK_RANK_ORDER[i] });
    placePiece(board, row, pawnCol, { color: "green", type: "p" });
  }
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function createInitialFourPlayerState() {
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

function isEnemy(piece, color) {
  return !!piece && piece.color !== color;
}

function isFriendly(piece, color) {
  return !!piece && piece.color === color;
}

function getForwardData(color) {
  if (color === "red") {
    return {
      dr: -1,
      dc: 0,
      captures: [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
      ],
      isStart: (row, col) => row === 12 && col >= 3 && col <= 10,
      isPromotion: (row) => row === 0,
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
      isStart: (row, col) => row === 1 && col >= 3 && col <= 10,
      isPromotion: (row) => row === 13,
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
      isStart: (row, col) => col === 1 && row >= 3 && row <= 10,
      isPromotion: (_row, col) => col === 13,
    };
  }

  return {
    dr: 0,
    dc: -1,
    captures: [
      { dr: -1, dc: -1 },
      { dr: 1, dc: -1 },
    ],
    isStart: (row, col) => col === 12 && row >= 3 && row <= 10,
    isPromotion: (_row, col) => col === 0,
  };
}

function addSlidingMoves(board, from, color, directions, moves) {
  directions.forEach(({ dr, dc }) => {
    let row = from.row + dr;
    let col = from.col + dc;

    while (isPlayableFourPlayerSquare(row, col)) {
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

function getPseudoLegalMoves(board, from, piece) {
  const moves = [];

  if (piece.type === "p") {
    const forward = getForwardData(piece.color);
    const oneStepRow = from.row + forward.dr;
    const oneStepCol = from.col + forward.dc;

    if (
      isPlayableFourPlayerSquare(oneStepRow, oneStepCol) &&
      board[oneStepRow][oneStepCol] === null
    ) {
      moves.push({ row: oneStepRow, col: oneStepCol });

      const twoStepRow = oneStepRow + forward.dr;
      const twoStepCol = oneStepCol + forward.dc;
      if (
        forward.isStart(from.row, from.col) &&
        isPlayableFourPlayerSquare(twoStepRow, twoStepCol) &&
        board[twoStepRow][twoStepCol] === null
      ) {
        moves.push({ row: twoStepRow, col: twoStepCol });
      }
    }

    forward.captures.forEach(({ dr, dc }) => {
      const row = from.row + dr;
      const col = from.col + dc;
      if (!isPlayableFourPlayerSquare(row, col)) return;
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
      if (!isPlayableFourPlayerSquare(row, col)) return;
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
      if (!isPlayableFourPlayerSquare(row, col)) return;
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

function removeAllPiecesOfColor(board, color) {
  const nextBoard = cloneBoard(board);
  for (let row = 0; row < FOUR_PLAYER_BOARD_SIZE; row += 1) {
    for (let col = 0; col < FOUR_PLAYER_BOARD_SIZE; col += 1) {
      if (nextBoard[row][col] && nextBoard[row][col].color === color) {
        nextBoard[row][col] = null;
      }
    }
  }
  return nextBoard;
}

function nextActiveColor(current, eliminated) {
  const eliminatedSet = new Set(eliminated);
  let index = FOUR_PLAYER_COLORS.indexOf(current);

  for (let step = 0; step < FOUR_PLAYER_COLORS.length; step += 1) {
    index = (index + 1) % FOUR_PLAYER_COLORS.length;
    const candidate = FOUR_PLAYER_COLORS[index];
    if (!eliminatedSet.has(candidate)) {
      return candidate;
    }
  }

  return current;
}

function alivePlayers(eliminated) {
  const eliminatedSet = new Set(eliminated);
  return FOUR_PLAYER_COLORS.filter((color) => !eliminatedSet.has(color));
}

export function applyFourPlayerMove(state, from, to, moverColor) {
  if (!state || state.winner) {
    return { ok: false, reason: "Game is over." };
  }

  if (
    !from ||
    !to ||
    !isPlayableFourPlayerSquare(from.row, from.col) ||
    !isPlayableFourPlayerSquare(to.row, to.col)
  ) {
    return { ok: false, reason: "Invalid square." };
  }

  const piece = state.board[from.row]?.[from.col];
  if (!piece) return { ok: false, reason: "No piece on source square." };
  if (piece.color !== moverColor) return { ok: false, reason: "Not your piece." };
  if (state.turn !== moverColor) return { ok: false, reason: "Not your turn." };

  const legalMoves = getPseudoLegalMoves(state.board, from, piece);
  const isLegal = legalMoves.some((sq) => sq.row === to.row && sq.col === to.col);
  if (!isLegal) return { ok: false, reason: "Illegal move." };

  const board = cloneBoard(state.board);
  const captured = board[to.row][to.col];
  board[from.row][from.col] = null;

  let promoted;
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
  let eliminatedColor = null;
  let nextBoard = board;
  if (captured && captured.type === "k") {
    eliminatedColor = captured.color;
    if (!eliminated.includes(captured.color)) {
      eliminated = [...eliminated, captured.color];
      nextBoard = removeAllPiecesOfColor(board, captured.color);
    }
  }

  const survivors = alivePlayers(eliminated);
  const winner = survivors.length === 1 ? survivors[0] : null;
  const nextTurn = winner ? moverColor : nextActiveColor(state.turn, eliminated);

  const move = {
    from,
    to,
    piece,
    captured: captured || null,
    promoted,
    eliminated: eliminatedColor,
  };

  return {
    ok: true,
    state: {
      board: nextBoard,
      turn: nextTurn,
      winner,
      eliminated,
      moves: [...state.moves, move],
    },
    move,
  };
}

export function eliminateFourPlayerColor(state, color) {
  if (!state || state.winner) return state;
  if (!FOUR_PLAYER_COLORS.includes(color)) return state;
  if (state.eliminated.includes(color)) return state;

  const eliminated = [...state.eliminated, color];
  const board = removeAllPiecesOfColor(state.board, color);
  const survivors = alivePlayers(eliminated);
  const winner = survivors.length === 1 ? survivors[0] : null;

  let nextTurn = state.turn;
  if (!winner && state.turn === color) {
    nextTurn = nextActiveColor(state.turn, eliminated);
  }
  if (winner) {
    nextTurn = winner;
  }

  return {
    ...state,
    board,
    eliminated,
    winner,
    turn: nextTurn,
  };
}
