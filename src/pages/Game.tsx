import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { Flag, RotateCcw, Play } from "lucide-react";
import { StockfishEngine } from "../chess";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface GameSettings {
  timeControl: { initial: number; increment: number };
  playAs: "white" | "black";
  difficulty: number;
}

// Timer Component
function ChessTimer({
  initialTime,
  increment,
  isActive,
  onTimeOut,
  onTimeChange,
}: {
  initialTime: number;
  increment: number;
  isActive: boolean;
  onTimeOut: () => void;
  onTimeChange: (time: number) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when initialTime changes
  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    onTimeChange(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (isActive && initialTime > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onTimeOut();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, initialTime, onTimeOut]);

  // Add increment
  const addIncrement = useCallback(() => {
    if (increment > 0) {
      setTimeLeft((prev) => prev + increment);
    }
  }, [increment]);

  // Expose addIncrement
  useEffect(() => {
    (window as any).__addIncrement = addIncrement;
  }, [addIncrement]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "0:00";
    if (seconds < 10) {
      return `0:0${seconds.toFixed(1)}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft < 30 && timeLeft > 0;

  return (
    <div
      className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
        isActive
          ? isLowTime
            ? "bg-red-500 text-white animate-pulse"
            : "bg-teal-600 text-white"
          : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      }`}
    >
      {formatTime(timeLeft)}
    </div>
  );
}

// Game Setup Modal
function GameSetupModal({
  isOpen,
  onStart,
}: {
  isOpen: boolean;
  onStart: (settings: GameSettings) => void;
}) {
  const [timeControl, setTimeControl] = useState({
    initial: 300,
    increment: 0,
  });
  const [playAs, setPlayAs] = useState<"white" | "black">("white");
  const [difficulty, setDifficulty] = useState(3);

  const timeOptions = [
    { label: "1 min", initial: 60, increment: 0 },
    { label: "3 min", initial: 180, increment: 0 },
    { label: "5 min", initial: 300, increment: 0 },
    { label: "10 min", initial: 600, increment: 0 },
    { label: "3+2", initial: 180, increment: 2 },
    { label: "5+3", initial: 300, increment: 3 },
    { label: "15+10", initial: 900, increment: 10 },
    { label: "∞", initial: 0, increment: 0 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          New Game
        </h2>

        {/* Time Control */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Time Control
          </label>
          <div className="grid grid-cols-4 gap-2">
            {timeOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() =>
                  setTimeControl({
                    initial: opt.initial,
                    increment: opt.increment,
                  })
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeControl.initial === opt.initial &&
                  timeControl.increment === opt.increment
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Play As */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Play As
          </label>
          <div className="flex gap-2">
            {(["white", "black"] as const).map((color) => (
              <button
                key={color}
                onClick={() => setPlayAs(color)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  playAs === color
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full ${color === "white" ? "bg-white border-2 border-gray-300" : "bg-gray-900"}`}
                />
                {color.charAt(0).toUpperCase() + color.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Difficulty: Level {difficulty}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </div>

        <button
          onClick={() => onStart({ timeControl, playAs, difficulty })}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Game
        </button>
      </motion.div>
    </div>
  );
}

// Game Over Modal
function GameOverModal({
  isOpen,
  result,
  onNewGame,
}: {
  isOpen: boolean;
  result: string | null;
  onNewGame: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {result}
        </h2>
        <button
          onClick={onNewGame}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium"
        >
          New Game
        </button>
      </motion.div>
    </div>
  );
}

export default function Game() {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [game, setGame] = useState(() => new Chess());
  const gameRef = useRef<Chess>(game);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<
    Record<string, { background: string; borderRadius?: string }>
  >({});
  const [moves, setMoves] = useState<string[]>([]);

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    timeControl: { initial: 300, increment: 0 },
    playAs: "white",
    difficulty: 3,
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [boardWidth, setBoardWidth] = useState(520);
  const [playerTime, setPlayerTime] = useState(300);
  const [opponentTime, setOpponentTime] = useState(300);

  const historySavedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const isEngineThinking = useRef(false);
  const playerColor = gameSettings.playAs === "white" ? "w" : "b";
  const isPlayerTurn = game.turn() === playerColor;

  // Initialize Stockfish engine
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.quit();
    };
  }, []);

  // Set engine difficulty when settings change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSkillLevel(gameSettings.difficulty * 2);
    }
  }, [gameSettings.difficulty]);

  // Board width responsive
  useEffect(() => {
    const getBoardWidth = () => {
      const w = window.innerWidth;
      return w < 600 ? 280 : w < 960 ? 400 : 520;
    };
    setBoardWidth(getBoardWidth());
    const handleResize = () => setBoardWidth(getBoardWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getMoveOptions = useCallback((square: Square) => {
    const currentGame = gameRef.current;
    const movesForSquare = currentGame.moves({ square, verbose: true });
    if (movesForSquare.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<
      string,
      { background: string; borderRadius?: string }
    > = {};
    movesForSquare.forEach((move) => {
      newSquares[move.to] = {
        background:
          currentGame.get(move.to) &&
          currentGame.get(move.to)!.color !== currentGame.get(square)!.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }, []);

  // Persist a finished game to backend
  const saveGameHistory = useCallback(
    async (payload: {
      // PGN headers
      event?: string;
      site?: string;
      date?: string;
      round?: string;
      white: string;
      black: string;
      result: string;
      currentPosition?: string;
      timeControl?: string;
      utcDate?: string;
      utcTime?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      whiteElo?: number;
      blackElo?: number;
      eco?: string;
      ecoUrl?: string;
      timezone?: string;
      link?: string;
      whiteUrl?: string;
      whiteCountry?: string;
      whiteTitle?: string;
      blackUrl?: string;
      blackCountry?: string;
      blackTitle?: string;
      termination?: string;
      moves: string[];
      moveText?: string;
      pgn?: string;
      playAs: "white" | "black";
      opponent?: string;
      opponentLevel?: number;
      durationMs?: number;
    }) => {
      try {
        await fetch(`${API_URL}/api/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Save history failed:", err);
      }
    },
    [],
  );

  // Make Stockfish play
  const makeEngineMove = useCallback(() => {
    if (!engineRef.current || isEngineThinking.current || gameOver) return;

    const currentGame = gameRef.current;
    if (currentGame.turn() === playerColor || currentGame.game_over()) return;

    isEngineThinking.current = true;
    const moveNumber = Math.floor(currentGame.history().length / 2) + 1;
    engineRef.current.evaluatePosition(
      currentGame.fen(),
      gameSettings.difficulty + 2,
      moveNumber,
    );
  }, [playerColor, gameSettings.difficulty, gameOver]);

  // Single Stockfish listener; applies best move when engine responds
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.onMessage(({ bestMove }) => {
      if (!bestMove || !isEngineThinking.current) return;

      const currentGame = gameRef.current;
      // Engine should only move when it's its turn
      if (currentGame.turn() === playerColor) return;

      setTimeout(
        () => {
          const from = bestMove.substring(0, 2) as Square;
          const to = bestMove.substring(2, 4) as Square;
          const promotion = bestMove.substring(4, 5) as
            | "q"
            | "r"
            | "b"
            | "n"
            | undefined;

          try {
            const move = currentGame.move({
              from,
              to,
              promotion: promotion || "q",
            });
            if (move) {
              gameRef.current = currentGame;
              setGame(new Chess(currentGame.fen()));
              setMoves(currentGame.history());
            }
          } catch (e) {
            console.error("Engine move error:", e);
          }

          isEngineThinking.current = false;
        },
        300 + Math.random() * 500,
      ); // Random delay for natural feel
    });
  }, [playerColor]);

  // Check game state and trigger engine
  useEffect(() => {
    const currentGame = gameRef.current;

    // Check for game over
    if (currentGame.game_over()) {
      let result = "Draw";
      if (currentGame.in_checkmate()) {
        result =
          currentGame.turn() === playerColor ? "Stockfish Wins!" : "You Win!";
      } else if (currentGame.in_stalemate()) {
        result = "Stalemate - Draw";
      } else if (currentGame.in_threefold_repetition()) {
        result = "Threefold Repetition - Draw";
      } else if (currentGame.insufficient_material()) {
        result = "Insufficient Material - Draw";
      }
      setGameResult(result);
      setGameOver(true);
      setShowGameOverModal(true);
      return;
    }

    // Trigger engine move if it's engine's turn
    if (
      gameStarted &&
      currentGame.turn() !== playerColor &&
      !isEngineThinking.current
    ) {
      const timer = setTimeout(() => makeEngineMove(), 200);
      return () => clearTimeout(timer);
    }
  }, [game, gameStarted, playerColor, makeEngineMove]);

  // If playing as black, engine moves first
  useEffect(() => {
    if (
      gameStarted &&
      gameSettings.playAs === "black" &&
      game.history().length === 0
    ) {
      const timer = setTimeout(() => makeEngineMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, gameSettings.playAs, game, makeEngineMove]);

  // Save history once when game ends
  useEffect(() => {
    if (!gameOver || !gameResult || historySavedRef.current) return;
    historySavedRef.current = true;

    const currentGame = gameRef.current;
    const durationMs = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : undefined;

    // Build termination string
    const terminationReason = currentGame.in_checkmate()
      ? "checkmate"
      : currentGame.in_stalemate()
        ? "stalemate"
        : currentGame.insufficient_material()
          ? "insufficient material"
          : currentGame.in_threefold_repetition()
            ? "threefold repetition"
            : gameResult.toLowerCase().includes("time")
              ? "time forfeit"
              : gameResult.toLowerCase().includes("resigned")
                ? "resignation"
                : "normal";

    // Determine winner for termination text
    // Player wins if: "You Win" in result OR opponent lost on time
    const isPlayerWin = gameResult.includes("You Win") || 
                        (gameResult.toLowerCase().includes("time") && !gameResult.toLowerCase().includes("stockfish wins"));
    // Stockfish wins if: "Stockfish Wins" in result OR player resigned OR player lost on time
    const isStockfishWin = gameResult.includes("Stockfish Wins") || 
                           gameResult.toLowerCase().includes("resigned") ||
                           (gameResult.toLowerCase().includes("time") && gameResult.toLowerCase().includes("stockfish"));
    
    const winner = isPlayerWin
      ? gameSettings.playAs === "white"
        ? "White"
        : "Black"
      : isStockfishWin
        ? gameSettings.playAs === "white"
          ? "Black"
          : "White"
        : null;

    const terminationText = winner
      ? `${winner} won by ${terminationReason}`
      : `Game drawn by ${terminationReason}`;

    // PGN result format
    const pgnResult = isPlayerWin
      ? gameSettings.playAs === "white"
        ? "1-0"
        : "0-1"
      : isStockfishWin
        ? gameSettings.playAs === "white"
          ? "0-1"
          : "1-0"
        : "1/2-1/2";

    // Date/time formatting
    const now = new Date();
    const startDate = startTimeRef.current
      ? new Date(startTimeRef.current)
      : now;
    const formatDate = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    const formatTime = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

    // Time control string
    const tc = gameSettings.timeControl;
    const timeControlStr =
      tc.initial === 0
        ? "-"
        : tc.increment > 0
          ? `${tc.initial}+${tc.increment}`
          : `${tc.initial}`;

    // Metadata placeholders
    const timezone = "UTC";
    const eco = "";
    const ecoUrl = "";
    const link = "";
    const whiteUrl = "";
    const whiteCountry = "";
    const whiteTitle = "";
    const blackUrl = "";
    const blackCountry = "";
    const blackTitle = "";

    // Player names
    const playerName = "Player"; // Could be fetched from authStore
    const whiteName =
      gameSettings.playAs === "white" ? playerName : "Stockfish";
    const blackName =
      gameSettings.playAs === "black" ? playerName : "Stockfish";

    // Build full PGN string
    const pgnHeaders = [
      `[Event "Live Chess"]`,
      `[Site "ChessFlow"]`,
      `[Date "${formatDate(startDate)}"]`,
      `[Round "-"]`,
      `[White "${whiteName}"]`,
      `[Black "${blackName}"]`,
      `[Result "${pgnResult}"]`,
      `[CurrentPosition "${game.fen()}"]`,
      `[Timezone "${timezone}"]`,
      `[ECO "${eco}"]`,
      `[ECOUrl "${ecoUrl}"]`,
      `[TimeControl "${timeControlStr}"]`,
      `[UTCDate "${formatDate(startDate)}"]`,
      `[UTCTime "${formatTime(startDate)}"]`,
      `[WhiteElo "1200"]`,
      `[BlackElo "1200"]`,
      `[Termination "${terminationText}"]`,
      `[StartTime "${formatTime(startDate)}"]`,
      `[EndDate "${formatDate(now)}"]`,
      `[EndTime "${formatTime(now)}"]`,
      `[Link "${link}"]`,
      `[WhiteUrl "${whiteUrl}"]`,
      `[WhiteCountry "${whiteCountry}"]`,
      `[WhiteTitle "${whiteTitle}"]`,
      `[BlackUrl "${blackUrl}"]`,
      `[BlackCountry "${blackCountry}"]`,
      `[BlackTitle "${blackTitle}"]`,
    ].join("\n");

    // Use currentGame which has the full move history (game state loses history when recreated from FEN)
    const moveText = currentGame.pgn();
    const fullPgn = `${pgnHeaders}\n\n${moveText} ${pgnResult}`;

    saveGameHistory({
      event: "Live Chess",
      site: "ChessFlow",
      date: formatDate(startDate),
      round: "-",
      white: whiteName,
      black: blackName,
      result: pgnResult,
      currentPosition: currentGame.fen(),
      timeControl: timeControlStr,
      utcDate: formatDate(startDate),
      utcTime: formatTime(startDate),
      startTime: formatTime(startDate),
      endDate: formatDate(now),
      endTime: formatTime(now),
      whiteElo: 1200,
      blackElo: 1200,
      timezone,
      eco,
      ecoUrl,
      link,
      whiteUrl,
      whiteCountry,
      whiteTitle,
      blackUrl,
      blackCountry,
      blackTitle,
      termination: terminationText,
      moves: currentGame.history(),
      moveText,
      pgn: fullPgn,
      playAs: gameSettings.playAs,
      opponent: "Stockfish",
      opponentLevel: gameSettings.difficulty,
      durationMs,
    });
  }, [gameOver, gameResult, gameSettings, saveGameHistory]);

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!gameStarted || gameOver) return;

      const currentGame = gameRef.current;

      // Only allow moves on player's turn
      if (currentGame.turn() !== playerColor) return;

      // If no piece selected, try to select one
      if (!moveFrom) {
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor) {
          getMoveOptions(square);
          setMoveFrom(square);
        }
        return;
      }

      // If clicking same square, deselect
      if (moveFrom === square) {
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }

      // Try to make a move
      try {
        const result = currentGame.move({
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        if (result) {
          gameRef.current = currentGame;
          setGame(new Chess(currentGame.fen()));
          setMoves(currentGame.history());
        }
      } catch {
        // Invalid move, try selecting new piece
        const piece = currentGame.get(square);
        if (piece && piece.color === playerColor) {
          getMoveOptions(square);
          setMoveFrom(square);
          return;
        }
      }

      setMoveFrom(null);
      setOptionSquares({});
    },
    [gameStarted, gameOver, getMoveOptions, moveFrom, playerColor],
  );

  const handleStartGame = (settings: GameSettings) => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setGameSettings(settings);
    setShowSetupModal(false);
    setGameStarted(true);
    setGameOver(false);
    setMoves([]);
    setMoveFrom(null);
    setOptionSquares({});
    setPlayerTime(settings.timeControl.initial);
    setOpponentTime(settings.timeControl.initial);
    isEngineThinking.current = false;
    historySavedRef.current = false;
    startTimeRef.current = Date.now();
  };

  const handleNewGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setMoves([]);
    setMoveFrom(null);
    setOptionSquares({});
    setGameStarted(false);
    setShowSetupModal(true);
    setShowGameOverModal(false);
    setGameOver(false);
    setGameResult(null);
    isEngineThinking.current = false;
    historySavedRef.current = false;
    startTimeRef.current = null;
  }, []);

  const handleTimeOut = useCallback((isPlayer: boolean) => {
    setGameResult(isPlayer ? "Stockfish Wins on Time!" : "You Win on Time!");
    setGameOver(true);
    setShowGameOverModal(true);
  }, []);

  const handleResign = useCallback(() => {
    setGameResult("You Resigned");
    setGameOver(true);
    setShowGameOverModal(true);
  }, []);

  // Format moves for display
  const formattedMoves = useMemo(() => {
    const pairs: { white: string; black: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        white: moves[i] || "",
        black: moves[i + 1] || "",
      });
    }
    return pairs;
  }, [moves]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full p-4">
      {/* Game Setup Modal */}
      <GameSetupModal isOpen={showSetupModal} onStart={handleStartGame} />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        result={gameResult}
        onNewGame={handleNewGame}
      />

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-[500px]">
        {/* Opponent Info */}
        <div className="w-full max-w-[560px] flex items-center justify-between mb-4 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Stockfish
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Level {gameSettings.difficulty}
              </div>
            </div>
          </div>
          <ChessTimer
            initialTime={gameSettings.timeControl.initial}
            increment={gameSettings.timeControl.increment}
            isActive={
              gameStarted &&
              !isPlayerTurn &&
              !gameOver &&
              gameSettings.timeControl.initial > 0
            }
            onTimeOut={() => handleTimeOut(false)}
            onTimeChange={setOpponentTime}
          />
        </div>

        {/* Chessboard */}
        <div className="relative">
          <Chessboard
            id="PlayVsStockfish"
            animationDuration={200}
            arePiecesDraggable={false}
            boardWidth={boardWidth}
            position={game.fen()}
            onSquareClick={onSquareClick}
            boardOrientation={gameSettings.playAs}
            customBoardStyle={{
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            }}
            customSquareStyles={optionSquares}
            customDarkSquareStyle={{ backgroundColor: "#779556" }}
            customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
          />
        </div>

        {/* Player Info */}
        <div className="w-full max-w-[560px] flex items-center justify-between mt-4 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">U</span>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                You
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {gameSettings.playAs === "white" ? "White" : "Black"}
              </div>
            </div>
          </div>
          <ChessTimer
            initialTime={gameSettings.timeControl.initial}
            increment={gameSettings.timeControl.increment}
            isActive={
              gameStarted &&
              isPlayerTurn &&
              !gameOver &&
              gameSettings.timeControl.initial > 0
            }
            onTimeOut={() => handleTimeOut(true)}
            onTimeChange={setPlayerTime}
          />
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col rounded-lg lg:rounded-none">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button className="flex-1 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-teal-500 bg-gray-100 dark:bg-gray-800/50">
            Moves
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
            Info
          </button>
        </div>

        {/* Move List */}
        <div className="flex-1 overflow-y-auto p-0 bg-white dark:bg-gray-900/50 max-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">White</th>
                <th className="px-4 py-2">Black</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {formattedMoves.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    {gameStarted
                      ? "Make your first move!"
                      : "Start a game to play"}
                  </td>
                </tr>
              ) : (
                formattedMoves.map((move, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50 dark:bg-gray-800/30"
                    }
                  >
                    <td className="px-4 py-2 text-gray-500 font-mono">
                      {i + 1}.
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                      {move.white}
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                      {move.black}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleResign}
              disabled={!gameStarted || gameOver}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              <Flag className="w-4 h-4" />
              <span>Resign</span>
            </button>
            <button
              onClick={handleNewGame}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
