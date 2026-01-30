import { useState, useEffect } from "react";
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

  // Responsive board width
  const [boardWidth, setBoardWidth] = useState(520);

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

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full p-4">
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
      <div className="flex-1 flex flex-col justify-center items-center min-h-[500px] gap-4 sm:gap-6">
        {/* Opponent Info */}
        <div className="w-full flex justify-center px-2 sm:px-0">
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
        <GameBoard
          fen={game.fen()}
          boardWidth={boardWidth}
          boardOrientation={gameSettings.playAs}
          onSquareClick={onSquareClick}
          customSquareStyles={{ ...optionSquares, ...preMoveSquares }}
        />

        {/* Player Info */}
        <div className="w-full flex justify-center px-2 sm:px-0">
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
  );
}
