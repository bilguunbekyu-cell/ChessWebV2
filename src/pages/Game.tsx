import { useState, useEffect, useRef } from "react";
import { useStockfishGame } from "../hooks/useStockfishGame";
import {
  GameSetupModal,
  GameOverModal,
  PlayerInfo,
  GameBoard,
  GameSidebar,
} from "../components/game";

export default function Game() {
  const {
    // Game state
    game,
    moves,
    gameSettings,
    gameStarted,
    gameOver,
    gameResult,
    isPlayerTurn,
    savedGameId,
    opening,
    openingLoading,

    // UI state
    showSetupModal,
    showGameOverModal,
    optionSquares,
    preMoveSquares,
    setPlayerTime,
    setOpponentTime,

    // Handlers
    onSquareClick,
    handleStartGame,
    handleNewGame,
    handleResign,
    handleTimeOut,
  } = useStockfishGame();

  // Responsive board width based on available viewport and layout
  const [boardWidth, setBoardWidth] = useState(520);
  const containerRef = useRef<HTMLDivElement>(null);
  const topInfoRef = useRef<HTMLDivElement>(null);
  const bottomInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const isWide = window.innerWidth >= 1024;
      const topH = topInfoRef.current?.getBoundingClientRect().height ?? 0;
      const bottomH = bottomInfoRef.current?.getBoundingClientRect().height ?? 0;
      const sidebarWidth = isWide ? 420 : 0;
      const columnGap = isWide ? 8 : 12;
      const availableWidth = rect.width - sidebarWidth - columnGap;
      const availableHeight = rect.height - topH - bottomH - columnGap * 2;
      const size = Math.floor(Math.min(availableWidth, availableHeight));
      setBoardWidth(Math.max(260, size));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    if (topInfoRef.current) observer.observe(topInfoRef.current);
    if (bottomInfoRef.current) observer.observe(bottomInfoRef.current);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col lg:flex-row gap-2 px-3 pt-2 pb-3 overflow-hidden"
    >
      {/* Game Setup Modal */}
      <GameSetupModal isOpen={showSetupModal} onStart={handleStartGame} />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        result={gameResult}
        onNewGame={handleNewGame}
        savedGameId={savedGameId}
      />

      {/* Main Game Area */}
      <div
        className="min-h-0 flex flex-col items-start gap-3 sm:gap-4"
        style={{ width: boardWidth }}
      >
        {/* Opponent Info */}
        <div
          ref={topInfoRef}
          className="w-full flex justify-start px-2 sm:px-0"
        >
          <PlayerInfo
            name={
              gameSettings.selectedBot
                ? `${gameSettings.selectedBot.avatar} ${gameSettings.selectedBot.name}`
                : "Stockfish"
            }
            subtitle={
              gameSettings.selectedBot
                ? `${gameSettings.selectedBot.title ? gameSettings.selectedBot.title + " • " : ""}${gameSettings.selectedBot.rating} ELO`
                : `Level ${gameSettings.difficulty}`
            }
            avatarLetter={
              gameSettings.selectedBot ? gameSettings.selectedBot.name[0] : "S"
            }
            avatarStyle="opponent"
            initialTime={gameSettings.timeControl.initial}
            increment={gameSettings.timeControl.increment}
            isTimerActive={
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
        <div className="flex-1 min-h-0 w-full flex items-center justify-start">
          <GameBoard
            fen={game.fen()}
            boardWidth={boardWidth}
            boardOrientation={gameSettings.playAs}
            onSquareClick={onSquareClick}
            customSquareStyles={{ ...optionSquares, ...preMoveSquares }}
          />
        </div>

        {/* Player Info */}
        <div
          ref={bottomInfoRef}
          className="w-full flex justify-start px-2 sm:px-0"
        >
          <PlayerInfo
            name="You"
            subtitle={gameSettings.playAs === "white" ? "White" : "Black"}
            avatarLetter="U"
            avatarStyle="player"
            initialTime={gameSettings.timeControl.initial}
            increment={gameSettings.timeControl.increment}
            isTimerActive={
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
      <div className="w-full lg:flex-1 lg:min-w-[420px] h-full min-h-0 p-2">
        <GameSidebar
          moves={moves}
          gameStarted={gameStarted}
          gameOver={gameOver}
          opening={opening}
          openingLoading={openingLoading}
          onResign={handleResign}
          onNewGame={handleNewGame}
        />
      </div>
    </div>
  );
}
