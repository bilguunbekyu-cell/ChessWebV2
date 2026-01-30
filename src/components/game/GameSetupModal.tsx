import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { GameSettings } from "./types";
import {
  botPersonalities,
  BotPersonality,
  getBotsByCategory,
} from "../../data/botPersonalities";

interface GameSetupModalProps {
  isOpen: boolean;
  onStart: (settings: GameSettings) => void;
}

type TabType = "bots" | "custom";
type BotCategory = BotPersonality["category"];

const categoryLabels: Record<BotCategory, string> = {
  beginner: "Beginner",
  casual: "Casual",
  intermediate: "Intermediate",
  advanced: "Advanced",
  master: "Master",
};

const categoryColors: Record<BotCategory, string> = {
  beginner: "bg-green-500",
  casual: "bg-blue-500",
  intermediate: "bg-yellow-500",
  advanced: "bg-orange-500",
  master: "bg-red-500",
};

export function GameSetupModal({ isOpen, onStart }: GameSetupModalProps) {
  const [timeControl, setTimeControl] = useState({
    initial: 300,
    increment: 0,
  });
  const [playAs, setPlayAs] = useState<"white" | "black">("white");
  const [difficulty, setDifficulty] = useState(3);
  const [activeTab, setActiveTab] = useState<TabType>("bots");
  const [selectedBot, setSelectedBot] = useState<BotPersonality | null>(
    botPersonalities[0],
  );
  const [selectedCategory, setSelectedCategory] =
    useState<BotCategory>("beginner");

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

  const categories: BotCategory[] = [
    "beginner",
    "casual",
    "intermediate",
    "advanced",
    "master",
  ];

  const botsInCategory = getBotsByCategory(selectedCategory);

  const handleStart = () => {
    if (activeTab === "bots" && selectedBot) {
      onStart({
        timeControl,
        playAs,
        difficulty: Math.ceil(selectedBot.skillLevel / 2),
        selectedBot,
      });
    } else {
      onStart({ timeControl, playAs, difficulty });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          New Game
        </h2>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("bots")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "bots"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            🤖 Play vs Bot
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "custom"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            ⚙️ Custom Level
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "bots" ? (
            <motion.div
              key="bots"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Category Selector */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Difficulty Category
                </label>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedBot(getBotsByCategory(cat)[0]);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? `${categoryColors[cat]} text-white`
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Choose Your Opponent
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {botsInCategory.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => setSelectedBot(bot)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedBot?.id === bot.id
                          ? "bg-teal-600 text-white ring-2 ring-teal-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{bot.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {bot.title && (
                              <span className="text-xs opacity-75 mr-1">
                                {bot.title}
                              </span>
                            )}
                            {bot.name}
                          </div>
                          <div
                            className={`text-xs ${selectedBot?.id === bot.id ? "text-teal-100" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            Rating: {bot.rating}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Bot Info */}
              {selectedBot && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{selectedBot.avatar}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {selectedBot.title && (
                          <span className="text-teal-600 dark:text-teal-400 mr-1">
                            {selectedBot.title}
                          </span>
                        )}
                        {selectedBot.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-1">
                        "{selectedBot.personality}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {selectedBot.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[selectedBot.category]} text-white`}
                        >
                          {selectedBot.rating} ELO
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {selectedBot.playStyle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Custom Difficulty */}
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
            </motion.div>
          )}
        </AnimatePresence>

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

        <button
          onClick={handleStart}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {activeTab === "bots" && selectedBot
            ? `Play vs ${selectedBot.name}`
            : "Start Game"}
        </button>
      </motion.div>
    </div>
  );
}
