import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsValues {
  language: "en" | "mn";

  theme: "dark" | "dim" | "amoled";
  accentColor: "teal" | "purple" | "blue";
  boardTheme: string;
  pieceStyle: string;
  reducedMotion: boolean;

  defaultTimeControl: string;
  autoQueen: boolean;
  moveInput: "click" | "drag" | "both";
  showLegalMoves: boolean;
  confirmMove: boolean;
  premoves: boolean;

  emailNotifications: boolean;
  pushNotifications: boolean;
  challengeRequests: boolean;
  tournamentUpdates: boolean;
  soundEffects: boolean;
  soundVolume: number;

  profileVisibility: "public" | "friends" | "private";
  showOnlineStatus: boolean;
  showLastSeen: boolean;

  enableAiExplanations: boolean;
  explanationLevel: "brief" | "normal" | "deep";
  postGameAnalysis: boolean;
  engineStrength: number;
}

export const defaultSettings: SettingsValues = {
  language: "en",
  theme: "dark",
  accentColor: "teal",
  boardTheme: "green",
  pieceStyle: "neo",
  reducedMotion: false,

  defaultTimeControl: "rapid",
  autoQueen: true,
  moveInput: "both",
  showLegalMoves: true,
  confirmMove: false,
  premoves: true,

  emailNotifications: true,
  pushNotifications: true,
  challengeRequests: true,
  tournamentUpdates: true,
  soundEffects: true,
  soundVolume: 75,

  profileVisibility: "public",
  showOnlineStatus: true,
  showLastSeen: true,

  enableAiExplanations: true,
  explanationLevel: "normal",
  postGameAnalysis: true,
  engineStrength: 10,
};

interface SettingsState {
  settings: SettingsValues;
  savedSettings: SettingsValues;
  update: <K extends keyof SettingsValues>(
    key: K,
    value: SettingsValues[K],
  ) => void;
  setLanguage: (language: SettingsValues["language"]) => void;
  save: () => void;
  reset: () => void;
  isDirty: () => boolean;

  enableAiExplanations: boolean;
  setEnableAiExplanations: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...defaultSettings },
      savedSettings: { ...defaultSettings },

      update: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
          enableAiExplanations:
            key === "enableAiExplanations"
              ? (value as boolean)
              : state.enableAiExplanations,
        })),

      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language },
          savedSettings: { ...state.savedSettings, language },
        })),

      save: () =>
        set((state) => ({
          savedSettings: { ...state.settings },
        })),

      reset: () =>
        set((state) => ({
          settings: { ...state.savedSettings },
          enableAiExplanations: state.savedSettings.enableAiExplanations,
        })),

      isDirty: () => {
        const { settings, savedSettings } = get();
        return JSON.stringify(settings) !== JSON.stringify(savedSettings);
      },

      enableAiExplanations: defaultSettings.enableAiExplanations,
      setEnableAiExplanations: (enabled) =>
        set((state) => ({
          enableAiExplanations: enabled,
          settings: { ...state.settings, enableAiExplanations: enabled },
        })),
    }),
    {
      name: "settings-storage",
      partialize: (state) => ({
        settings: state.settings,
        savedSettings: state.savedSettings,
        enableAiExplanations: state.enableAiExplanations,
      }),
      merge: (persisted, current) => {
        const typedPersisted = persisted as Partial<SettingsState>;
        const mergedSettings = {
          ...defaultSettings,
          ...(typedPersisted.settings ?? {}),
        };
        const mergedSavedSettings = {
          ...defaultSettings,
          ...(typedPersisted.savedSettings ?? {}),
        };

        return {
          ...current,
          ...typedPersisted,
          settings: mergedSettings,
          savedSettings: mergedSavedSettings,
          enableAiExplanations:
            typedPersisted.enableAiExplanations ??
            mergedSettings.enableAiExplanations,
        };
      },
    },
  ),
);
