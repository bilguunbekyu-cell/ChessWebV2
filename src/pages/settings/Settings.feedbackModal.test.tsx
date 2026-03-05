import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Settings from "../Settings";
import { defaultSettings, useSettingsStore } from "../../store/settingsStore";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

const mocks = vi.hoisted(() => ({
  submitFeedbackRequest: vi.fn(),
  toastShow: vi.fn(),
  toastHide: vi.fn(),
}));

vi.mock("../../components/Sidebar", () => ({
  default: function SidebarMock() {
    return <div data-testid="sidebar-mock" />;
  },
}));

vi.mock("../../components/profilePage", () => ({
  ProfileAvatarUpload: function ProfileAvatarUploadMock() {
    return <div data-testid="profile-avatar-upload-mock" />;
  },
}));

vi.mock("../../utils/groqApi", () => ({
  isGroqConfigured: () => true,
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>(
    "react-i18next",
  );
  return {
    ...actual,
    initReactI18next: {
      type: "3rdParty" as const,
      init: () => {},
    },
    useTranslation: () => ({
      t: (value: string, options?: { defaultValue?: string }) =>
        options?.defaultValue || value,
    }),
  };
});

vi.mock("../../components/settings", () => ({
  Toggle: () => <div />,
  SegmentedControl: () => <div />,
  SettingsCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SettingRow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Select: () => <div />,
  Slider: () => <div />,
  ColorSwatchPicker: () => <div />,
  BoardThemePicker: () => <div />,
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    ) : null,
  Toast: () => null,
  useToast: () => ({
    toast: { message: "", type: "success", visible: false },
    show: mocks.toastShow,
    hide: mocks.toastHide,
  }),
}));

vi.mock("./feedbackApi", () => ({
  submitFeedbackRequest: mocks.submitFeedbackRequest,
}));

function resetStores() {
  useSettingsStore.setState({
    settings: { ...defaultSettings },
    savedSettings: { ...defaultSettings },
    enableAiExplanations: defaultSettings.enableAiExplanations,
  });
  useAuthStore.setState({
    user: {
      id: "u-settings-1",
      fullName: "Settings User",
      email: "settings.user@test.dev",
      bulletRating: 1500,
      blitzRating: 1500,
      rapidRating: 1500,
      classicalRating: 1500,
      gamesPlayed: 0,
      gamesWon: 0,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    banReason: null,
  });
  useThemeStore.setState({ isDarkMode: false });
}

describe("Settings feedback modal", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.submitFeedbackRequest.mockReset();
    mocks.toastShow.mockReset();
    mocks.toastHide.mockReset();
    resetStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits feedback and closes modal on success", async () => {
    mocks.submitFeedbackRequest.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Feedback" }));
    expect(screen.getByRole("dialog", { name: "Send Feedback" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "bug" } });
    fireEvent.change(screen.getByPlaceholderText("Describe your issue or suggestion..."), {
      target: { value: "Feedback modal submit flow should work." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Feedback" }));

    await waitFor(() => {
      expect(mocks.submitFeedbackRequest).toHaveBeenCalledWith({
        category: "bug",
        message: "Feedback modal submit flow should work.",
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Send Feedback" }),
      ).not.toBeInTheDocument();
    });

    expect(mocks.toastShow).toHaveBeenCalledWith("Feedback submitted", "success");
  });

  it("shows error toast and keeps modal open on submit failure", async () => {
    mocks.submitFeedbackRequest.mockRejectedValueOnce(new Error("Feedback API failed"));

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Feedback" }));
    expect(screen.getByRole("dialog", { name: "Send Feedback" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Describe your issue or suggestion..."), {
      target: { value: "This should produce an error toast on submit." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Feedback" }));

    await waitFor(() => {
      expect(mocks.submitFeedbackRequest).toHaveBeenCalledTimes(1);
    });
    expect(mocks.toastShow).toHaveBeenCalledWith("Feedback API failed", "error");
    expect(screen.getByRole("dialog", { name: "Send Feedback" })).toBeInTheDocument();
  });
});
