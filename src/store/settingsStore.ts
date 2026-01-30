import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  groqApiKey: string;
  enableAiExplanations: boolean;
  setGroqApiKey: (key: string) => void;
  setEnableAiExplanations: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      groqApiKey: "",
      enableAiExplanations: false,
      setGroqApiKey: (key) => set({ groqApiKey: key }),
      setEnableAiExplanations: (enabled) =>
        set({ enableAiExplanations: enabled }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
