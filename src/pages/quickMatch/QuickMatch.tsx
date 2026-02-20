import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

function getTimeControlFromSearch(
  search: string,
): { initial: number; increment: number } | null {
  const params = new URLSearchParams(search);
  const initial = Number(params.get("initial"));
  const increment = Number(params.get("increment"));

  if (Number.isFinite(initial) && Number.isFinite(increment)) {
    return { initial, increment };
  }

  return null;
}

function getAutoStartFromState(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  return (state as { autoStart?: unknown }).autoStart === true;
}

function getAutoStartFromSearch(search: string): boolean {
  const value = new URLSearchParams(search).get("autostart");
  return value === "1" || value === "true";
}

export default function QuickMatch() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
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
      getTimeControlFromState(location.state) ||
      getTimeControlFromSearch(location.search) || {
        initial: 300,
        increment: 0,
      }
    );
  });

  useEffect(() => {
    const selectedTimeControl =
      getTimeControlFromState(location.state) ||
      getTimeControlFromSearch(location.search);
    if (selectedTimeControl) {
      setTimeControl(selectedTimeControl);
    }
  }, [location.state, location.search]);

  const autoStartRequested =
    getAutoStartFromState(location.state) || getAutoStartFromSearch(location.search);
  const autoStartHandledRef = useRef(false);
  const [pendingAutoStart, setPendingAutoStart] = useState(autoStartRequested);

  useEffect(() => {
    autoStartHandledRef.current = false;
    setPendingAutoStart(autoStartRequested);
  }, [autoStartRequested, location.key]);

  useEffect(() => {
    if (!pendingAutoStart || autoStartHandledRef.current) return;
    if (gameStarted || isSearching) {
      setPendingAutoStart(false);
      autoStartHandledRef.current = true;
      return;
    }
    if (!isConnected) return;

    autoStartHandledRef.current = true;
    startMatch(timeControl, user?.fullName || "Player");
  }, [
    gameStarted,
    isConnected,
    isSearching,
    pendingAutoStart,
    startMatch,
    timeControl,
    user?.fullName,
  ]);

  useEffect(() => {
    if (!pendingAutoStart) return;
    if (isSearching || gameStarted) {
      setPendingAutoStart(false);
      return;
    }
    if (queueStatus && /offline|unable to connect|disconnected/i.test(queueStatus)) {
      setPendingAutoStart(false);
    }
  }, [gameStarted, isSearching, pendingAutoStart, queueStatus]);

  const handleCancelMatch = () => {
    setPendingAutoStart(false);
    cancelMatch();
  };

  const handleStartMatch = () => {
    navigate(
      `/play/quick?initial=${timeControl.initial}&increment=${timeControl.increment}`,
      {
        replace: true,
        state: {
          initial: timeControl.initial,
          increment: timeControl.increment,
        },
      },
    );
    setPendingAutoStart(false);
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
      isSearching={isSearching || pendingAutoStart}
      isConnected={isConnected}
      onCancel={handleCancelMatch}
    />
  );
}
