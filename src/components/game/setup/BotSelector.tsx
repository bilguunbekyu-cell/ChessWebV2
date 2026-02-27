import { motion } from "framer-motion";
import {
  BotPersonality,
  getBotsByCategory,
} from "../../../data/botPersonalities";
import {
  BotCategory,
  categories,
  categoryLabels,
  categoryColors,
} from "./constants";

interface BotSelectorProps {
  selectedCategory: BotCategory;
  setSelectedCategory: (cat: BotCategory) => void;
  selectedBot: BotPersonality | null;
  setSelectedBot: (bot: BotPersonality) => void;
}

export function BotSelector({
  selectedCategory,
  setSelectedCategory,
  selectedBot,
  setSelectedBot,
}: BotSelectorProps) {
  const botsInCategory = getBotsByCategory(selectedCategory);

  return (
    <motion.div
      key="bots"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      {}
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

      {}
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
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                  {bot.avatarUrl ? (
                    <img src={bot.avatarUrl} alt={bot.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{bot.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
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
                    className={`text-xs ${
                      selectedBot?.id === bot.id
                        ? "text-teal-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Rating: {bot.rating}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {}
      {selectedBot && <BotInfoCard bot={selectedBot} />}
    </motion.div>
  );
}

function BotInfoCard({ bot }: { bot: BotPersonality }) {
  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
          {bot.avatarUrl ? (
            <img src={bot.avatarUrl} alt={bot.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <span className="text-white font-bold">{bot.name.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {bot.title && (
              <span className="text-teal-600 dark:text-teal-400 mr-1">
                {bot.title}
              </span>
            )}
            {bot.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-1">
            "{bot.personality}"
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {bot.description}
          </p>
          <div className="flex gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[bot.category]} text-white`}
            >
              {bot.rating} ELO
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
              {bot.playStyle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
