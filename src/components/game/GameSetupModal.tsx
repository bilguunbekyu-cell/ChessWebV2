import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { GameSettings } from "./types";

interface GameSetupModalProps {
  isOpen: boolean;
  onStart: (settings: GameSettings) => void;
}

export function GameSetupModal({ isOpen, onStart }: GameSetupModalProps) {
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
