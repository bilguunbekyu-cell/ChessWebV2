import { useRef, useEffect } from "react";
import { StockfishEngine } from "../chess";
import { BotPersonality } from "../data/botPersonalities";

export function useStockfishEngine(
  difficulty: number,
  selectedBot?: BotPersonality,
) {
  const engineRef = useRef<StockfishEngine | null>(null);

  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.quit();
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      if (selectedBot) {

        engineRef.current.configureBotPersonality({
          skillLevel: selectedBot.skillLevel,
          playStyle: selectedBot.playStyle,
          depth: selectedBot.depth,
          thinkTimeMs: selectedBot.thinkTimeMs,
          blunderChance: selectedBot.blunderChance,
          aggressiveness: selectedBot.aggressiveness,
        });
      } else {

        const skillLevel = Math.max(0, (difficulty - 1) * 2.2);
        engineRef.current.setSkillLevel(Math.round(skillLevel));
      }
    }
  }, [difficulty, selectedBot]);

  return engineRef;
}
