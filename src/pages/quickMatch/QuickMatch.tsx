import { useState } from "react";
import { useStockfishGame } from "../../hooks/useStockfishGame";
import type { GameSettings } from "../../components/game";
import { defaultGameSettings } from "../../hooks/useStockfishGameTypes";
import { QuickMatchSetup } from "./QuickMatchSetup";
import { QuickMatchGameView } from "./QuickMatchGameView";

export default function QuickMatch() {
  const {
    game,
    lastMove,
    moves,
    gameSettings,
    gameStarted,
    gameOver,
    gameResult,
    isPlayerTurn,
    savedGameId,
    showGameOverModal,
    optionSquares,
    preMoveSquares,
    setPlayerTime,
    setOpponentTime,
    onSquareClick,
    handleStartGame,
    handleResign,
    handleTimeOut,
  } = useStockfishGame();

  const [timeControl, setTimeControl] = useState({
    initial: 300,
    increment: 0,
  });
  const difficulty = 5;

  const handleStartMatch = () => {
    const actualPlayAs = Math.random() < 0.5 ? "white" : "black";

    const settings: GameSettings = {
      ...defaultGameSettings,
      playAs: actualPlayAs,
      difficulty,
      timeControl,
    };

    handleStartGame(settings);
  };

  const handleRematch = () => {
    handleStartGame({ ...gameSettings });
  };

  // If game started, show the game board
  if (gameStarted) {
    return (
      <QuickMatchGameView
        game={game}
        lastMove={lastMove}
        moves={moves}
        gameSettings={gameSettings}
        gameStarted={gameStarted}
        gameOver={gameOver}
        gameResult={gameResult}
        isPlayerTurn={isPlayerTurn}
        savedGameId={savedGameId}
        showGameOverModal={showGameOverModal}
        optionSquares={optionSquares}
        preMoveSquares={preMoveSquares}
        onSquareClick={onSquareClick}
        setOpponentTime={setOpponentTime}
        setPlayerTime={setPlayerTime}
        onTimeOut={handleTimeOut}
        onResign={handleResign}
        onRematch={handleRematch}
      />
    );
  }

  // Setup screen
  return (
    <QuickMatchSetup
      timeControl={timeControl}
      onTimeControlChange={setTimeControl}
      onStart={handleStartMatch}
    />
  );
}
