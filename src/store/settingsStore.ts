import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  enableAiExplanations: boolean;
  setEnableAiExplanations: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      enableAiExplanations: true, // AI explanations enabled by default
      setEnableAiExplanations: (enabled) =>
        set({ enableAiExplanations: enabled }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
