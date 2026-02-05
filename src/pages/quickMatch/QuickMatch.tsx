import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useOnlineQuickMatch } from "../../hooks/useOnlineQuickMatch";
import { QuickMatchSetup } from "./QuickMatchSetup";
import { QuickMatchGameView } from "./QuickMatchGameView";

export default function QuickMatch() {
  const { user } = useAuthStore();
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
    opponentName,
    isSearching,
    queueStatus,
    startMatch,
    cancelMatch,
    resign,
    timeOut,
    rematch,
    leaveGame,
  } = useOnlineQuickMatch();

  const [timeControl, setTimeControl] = useState({
    initial: 300,
    increment: 0,
  });
  const handleStartMatch = () => {
    startMatch(timeControl, user?.fullName || "Player");
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
        opponentName={opponentName}
        setOpponentTime={setOpponentTime}
        setPlayerTime={setPlayerTime}
        onTimeOut={timeOut}
        onResign={resign}
        onRematch={rematch}
        onLeave={leaveGame}
      />
    );
  }

  // Setup screen
  return (
    <QuickMatchSetup
      timeControl={timeControl}
      onTimeControlChange={setTimeControl}
      onStart={handleStartMatch}
      isSearching={isSearching}
      queueStatus={queueStatus}
      onCancel={cancelMatch}
    />
  );
}
