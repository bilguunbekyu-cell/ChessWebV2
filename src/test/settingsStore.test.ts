import { beforeEach, describe, expect, it } from "vitest";
import { defaultSettings, useSettingsStore } from "../store/settingsStore";

function resetSettingsStore() {
  useSettingsStore.setState({
    settings: { ...defaultSettings },
    savedSettings: { ...defaultSettings },
    enableAiExplanations: defaultSettings.enableAiExplanations,
  });
}

describe("settingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsStore();
  });

  it("starts with default settings and clean state", () => {
    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(defaultSettings);
    expect(state.savedSettings).toEqual(defaultSettings);
    expect(state.isDirty()).toBe(false);
  });

  it("marks store dirty after update and clean after save", () => {
    const store = useSettingsStore.getState();

    store.update("soundVolume", 62);
    expect(useSettingsStore.getState().settings.soundVolume).toBe(62);
    expect(useSettingsStore.getState().isDirty()).toBe(true);

    useSettingsStore.getState().save();
    expect(useSettingsStore.getState().savedSettings.soundVolume).toBe(62);
    expect(useSettingsStore.getState().isDirty()).toBe(false);
  });

  it("reset restores unsaved edits to saved snapshot", () => {
    const store = useSettingsStore.getState();

    store.update("moveInput", "drag");
    store.update("challengeRequests", false);
    expect(useSettingsStore.getState().isDirty()).toBe(true);

    useSettingsStore.getState().reset();
    expect(useSettingsStore.getState().settings).toEqual(
      useSettingsStore.getState().savedSettings,
    );
    expect(useSettingsStore.getState().settings.moveInput).toBe(
      defaultSettings.moveInput,
    );
    expect(useSettingsStore.getState().settings.challengeRequests).toBe(
      defaultSettings.challengeRequests,
    );
    expect(useSettingsStore.getState().isDirty()).toBe(false);
  });

  it("setLanguage updates both current and saved language", () => {
    useSettingsStore.getState().setLanguage("mn");
    const state = useSettingsStore.getState();

    expect(state.settings.language).toBe("mn");
    expect(state.savedSettings.language).toBe("mn");
    expect(state.isDirty()).toBe(false);
  });
});
