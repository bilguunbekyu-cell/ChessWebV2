import { useState } from "react";
import { useStockfishGame } from "../../hooks/useStockfishGame";
import type { GameSettings } from "../../components/game";
import { defaultGameSettings } from "../../hooks/useStockfishGameTypes";
import { FriendGameSetup } from "./FriendGameSetup";
import { FriendGameView } from "./FriendGameView";

export default function PlayWithFriend() {
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

  const [gameMode, setGameMode] = useState<"local" | "online">("local");
  const [playAs, setPlayAs] = useState<"white" | "black" | "random">("white");
  const [timeControl, setTimeControl] = useState({
    initial: 600,
    increment: 0,
  });
  const [friendName, setFriendName] = useState("Friend");

  const handleStartLocalGame = () => {
    const actualPlayAs =
      playAs === "random" ? (Math.random() < 0.5 ? "white" : "black") : playAs;

    const settings: GameSettings = {
      ...defaultGameSettings,
      playAs: actualPlayAs,
      difficulty: 0, // No AI
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
      <FriendGameView
        friendName={friendName}
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
    <FriendGameSetup
      gameMode={gameMode}
      onGameModeChange={setGameMode}
      playAs={playAs}
      onPlayAsChange={setPlayAs}
      timeControl={timeControl}
      onTimeControlChange={setTimeControl}
      friendName={friendName}
      onFriendNameChange={setFriendName}
      onStart={handleStartLocalGame}
    />
  );
}
