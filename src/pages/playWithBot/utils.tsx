import { Flame, Shield, Shuffle, Zap } from "lucide-react";
import { BotPersonality } from "../../data/botPersonalities";

export function getPlayStyleIcon(style: BotPersonality["playStyle"]) {
  switch (style) {
    case "aggressive":
      return <Flame className="w-3.5 h-3.5 text-red-500" />;
    case "defensive":
      return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    case "random":
      return <Shuffle className="w-3.5 h-3.5 text-purple-500" />;
    default:
      return <Zap className="w-3.5 h-3.5 text-yellow-500" />;
  }
}

export function getCategoryColor(category: BotPersonality["category"]) {
  switch (category) {
    case "beginner":
      return "bg-green-500/20 text-green-600 dark:text-green-400";
    case "casual":
      return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    case "intermediate":
      return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
    case "advanced":
      return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
    case "master":
      return "bg-red-500/20 text-red-600 dark:text-red-400";
    default:
      return "bg-gray-500/20 text-gray-600 dark:text-gray-400";
  }
}
