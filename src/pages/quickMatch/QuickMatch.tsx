import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useOnlineQuickMatch } from "../../hooks/useOnlineQuickMatch";
import { QuickMatchSetup } from "./QuickMatchSetup";
import { QuickMatchGameView } from "./QuickMatchGameView";

function getTimeControlFromState(
  state: unknown,
): { initial: number; increment: number } | null {
  if (!state || typeof state !== "object") return null;
  const maybeState = state as { initial?: unknown; increment?: unknown };

  if (
    typeof maybeState.initial === "number" &&
    typeof maybeState.increment === "number"
  ) {
    return {
      initial: maybeState.initial,
      increment: maybeState.increment,
    };
  }

  return null;
}

export default function QuickMatch() {
  const { user } = useAuthStore();
  const location = useLocation();
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
    isConnected,
    startMatch,
    cancelMatch,
    resign,
    timeOut,
    rematch,
    leaveGame,
  } = useOnlineQuickMatch();

  const [timeControl, setTimeControl] = useState(() => {
    return (
      getTimeControlFromState(location.state) || {
        initial: 300,
        increment: 0,
      }
    );
  });

  useEffect(() => {
    const selectedTimeControl = getTimeControlFromState(location.state);
    if (selectedTimeControl) {
      setTimeControl(selectedTimeControl);
    }
  }, [location.state]);

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
      isConnected={isConnected}
      onCancel={cancelMatch}
    />
  );
}
