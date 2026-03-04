import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../store/themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ isDarkMode: true });
  });

  it("defaults to dark mode", () => {
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it("toggleTheme flips isDarkMode", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(false);

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });
});
