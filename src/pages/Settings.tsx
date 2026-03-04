import { useEffect, useMemo, useState } from "react";
import {
  User,
  Bell,
  Save,
  Sparkles,
  CheckCircle,
  XCircle,
  Shield,
  Gamepad2,
  Palette,
  RotateCcw,
  Key,
  Download,
  FileText,
  AlertTriangle,
  Trash2,
  LogOut,
  Zap,
  MessageCircle,
  Unlock,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useThemeStore } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { ProfileAvatarUpload } from "../components/profilePage";
import { isGroqConfigured } from "../utils/groqApi";
import {
  Toggle,
  SegmentedControl,
  SettingsCard,
  SettingRow,
  Select,
  Slider,
  ColorSwatchPicker,
  BoardThemePicker,
  Modal,
  Toast,
  useToast,
} from "../components/settings";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface BlockedUserItem {
  id: string;
  name: string;
  email?: string;
  blockedAt?: string;
}

export default function Settings() {
  const { t } = useTranslation();
  const tr = (value: string) => t(value, { defaultValue: value });
  const { isDarkMode } = useThemeStore();
  const { settings, update, save, reset, isDirty, setLanguage } = useSettingsStore();
  const { user } = useAuthStore();
  const groqConfigured = isGroqConfigured();

  const dirty = useMemo(() => isDirty(), [settings]);

  const [passwordModal, setPasswordModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [pwFields, setPwFields] = useState({
    current: "",
    newPw: "",
    confirm: "",
  });

  const { toast, show: showToast, hide: hideToast } = useToast();

  const handleSave = () => {
    save();
    showToast(tr("Settings saved successfully!"));
  };

  const handleReset = () => {
    reset();
    showToast(tr("Settings reset to last saved state"), "success");
  };

  const loadBlockedUsers = async () => {
    try {
      setLoadingBlockedUsers(true);
      const res = await fetch(`${API_URL}/api/friends/blocks/list`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch block list");
      const data = await res.json();
      setBlockedUsers(Array.isArray(data.blockedUsers) ? data.blockedUsers : []);
    } catch {
      showToast(tr("Failed to load blocked users"), "error");
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  useEffect(() => {
    if (blockModal) {
      void loadBlockedUsers();
    }
  }, [blockModal]);

  const handleUnblockUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/friends/block/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unblock user");
      setBlockedUsers((prev) => prev.filter((entry) => entry.id !== userId));
      showToast(tr("User unblocked"), "success");
    } catch {
      showToast(tr("Failed to unblock user"), "error");
    }
  };

  const handleSubmitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (message.length < 10) {
      showToast(tr("Feedback message must be at least 10 characters"), "error");
      return;
    }

    try {
      setSendingFeedback(true);
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: feedbackCategory,
          message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send feedback");
      }
      setFeedbackMessage("");
      setFeedbackCategory("general");
      setFeedbackModal(false);
      showToast(tr("Feedback submitted"), "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : tr("Failed to submit feedback"),
        "error",
      );
    } finally {
      setSendingFeedback(false);
    }
  };

  const boardThemes = [
    {
      value: "green",
      light: "bg-[#eeeed2]",
      dark: "bg-[#769656]",
      label: "Green",
    },
    {
      value: "brown",
      light: "bg-[#f0d9b5]",
      dark: "bg-[#b58863]",
      label: "Brown",
    },
    {
      value: "blue",
      light: "bg-[#dee3e6]",
      dark: "bg-[#8ca2ad]",
      label: "Blue",
    },
    {
      value: "purple",
      light: "bg-[#e8daf4]",
      dark: "bg-[#9b72cf]",
      label: "Purple",
    },
    {
      value: "gray",
      light: "bg-[#e8e8e8]",
      dark: "bg-[#a0a0a0]",
      label: "Gray",
    },
    {
      value: "neon",
      light: "bg-[#1a1a2e]",
      dark: "bg-[#0f3460]",
      label: "Neon",
    },
  ];

  const accentOptions = [
    { value: "teal", bg: "bg-teal-500", label: "Teal" },
    { value: "purple", bg: "bg-purple-500", label: "Purple" },
    { value: "blue", bg: "bg-blue-500", label: "Blue" },
  ];

  const pieceStyles = [
    { label: "Neo", value: "neo" },
    { label: "Classic", value: "classic" },
    { label: "Alpha", value: "alpha" },
    { label: "Merida", value: "merida" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-72 min-h-screen">
        {}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#f5f5f7]/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Manage your account &amp; preferences
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={!dirty}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${
                  dirty
                    ? "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/25"
                    : "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
                }`}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {}
            <div className="flex-1 min-w-0 space-y-6">
              {}
              <SettingsCard
                icon={<User className="w-5 h-5 text-teal-500" />}
                title="Profile & Account"
                subtitle="Your personal information and security"
                accent="bg-teal-500"
              >
                {}
                <div className="flex items-start gap-6 py-2">
                  <ProfileAvatarUpload
                    currentAvatar={user?.avatar}
                    userName={user?.fullName}
                    size="md"
                  />
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                          Username
                        </label>
                        <input
                          type="text"
                          defaultValue={user?.fullName || ""}
                          className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue={user?.email || ""}
                          disabled
                          className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <SettingRow
                  label="Change Password"
                  helper="Update your account password"
                >
                  <button
                    onClick={() => setPasswordModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Change
                  </button>
                </SettingRow>

                <SettingRow
                  label="Linked Accounts"
                  helper="Connect third-party services"
                  last
                >
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                      Google
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
                      GitHub
                    </button>
                  </div>
                </SettingRow>
              </SettingsCard>

              {}
              <SettingsCard
                icon={<Palette className="w-5 h-5 text-purple-500" />}
                title="Appearance"
                subtitle="Customize how NeonGambit looks"
                accent="bg-purple-500"
              >
                <SettingRow
                  label="Language"
                  helper="Choose your interface language"
                >
                  <SegmentedControl
                    options={[
                      { label: "English", value: "en" },
                      { label: "Mongolian", value: "mn" },
                    ]}
                    value={settings.language}
                    onChange={(v) => setLanguage(v as "en" | "mn")}
                  />
                </SettingRow>

                <SettingRow
                  label="Theme"
                  helper="Choose your preferred color scheme"
                >
                  <SegmentedControl
                    options={[
                      { label: "Dark", value: "dark" },
                      { label: "Dim", value: "dim" },
                      { label: "AMOLED", value: "amoled" },
                    ]}
                    value={settings.theme}
                    onChange={(v) =>
                      update("theme", v as "dark" | "dim" | "amoled")
                    }
                  />
                </SettingRow>

                <SettingRow
                  label="Accent Color"
                  helper="Primary highlight color"
                >
                  <ColorSwatchPicker
                    options={accentOptions}
                    value={settings.accentColor}
                    onChange={(v) =>
                      update("accentColor", v as "teal" | "purple" | "blue")
                    }
                  />
                </SettingRow>

                <SettingRow
                  label="Board Theme"
                  helper="Choose board color scheme"
                >
                  <BoardThemePicker
                    options={boardThemes}
                    value={settings.boardTheme}
                    onChange={(v) => update("boardTheme", v)}
                  />
                </SettingRow>

                <SettingRow
                  label="Piece Style"
                  helper="Visual style of chess pieces"
                >
                  <SegmentedControl
                    options={pieceStyles}
                    value={settings.pieceStyle}
                    onChange={(v) => update("pieceStyle", v)}
                  />
                </SettingRow>

                <SettingRow
                  label="Reduced Motion"
                  helper="Minimize animations"
                  last
                >
                  <Toggle
                    enabled={settings.reducedMotion}
                    onChange={(v) => update("reducedMotion", v)}
                    ariaLabel="Reduced motion"
                  />
                </SettingRow>
              </SettingsCard>

              {}
              <SettingsCard
                icon={<Gamepad2 className="w-5 h-5 text-emerald-500" />}
                title="Gameplay"
                subtitle="Tweak your playing experience"
                accent="bg-emerald-500"
              >
                <SettingRow
                  label="Default Time Control"
                  helper="Starting time format for new games"
                >
                  <Select
                    value={settings.defaultTimeControl}
                    onChange={(v) => update("defaultTimeControl", v)}
                    options={[
                      { label: "⚡ Bullet", value: "bullet" },
                      { label: "🔥 Blitz", value: "blitz" },
                      { label: "🚀 Rapid", value: "rapid" },
                      { label: "🏛️ Classical", value: "classical" },
                      { label: "⚙️ Custom", value: "custom" },
                    ]}
                  />
                </SettingRow>

                <SettingRow
                  label="Auto-Queen"
                  helper="Automatically promote pawns to queen"
                >
                  <Toggle
                    enabled={settings.autoQueen}
                    onChange={(v) => update("autoQueen", v)}
                    ariaLabel="Auto-queen"
                  />
                </SettingRow>

                <SettingRow
                  label="Move Input"
                  helper="How you make moves on the board"
                >
                  <SegmentedControl
                    options={[
                      { label: "Click", value: "click" },
                      { label: "Drag", value: "drag" },
                      { label: "Both", value: "both" },
                    ]}
                    value={settings.moveInput}
                    onChange={(v) =>
                      update("moveInput", v as "click" | "drag" | "both")
                    }
                  />
                </SettingRow>

                <SettingRow
                  label="Show Legal Moves"
                  helper="Highlight available squares"
                >
                  <Toggle
                    enabled={settings.showLegalMoves}
                    onChange={(v) => update("showLegalMoves", v)}
                    ariaLabel="Show legal moves"
                  />
                </SettingRow>

                <SettingRow
                  label="Confirm Move"
                  helper="Require explicit confirmation before moving"
                >
                  <Toggle
                    enabled={settings.confirmMove}
                    onChange={(v) => update("confirmMove", v)}
                    ariaLabel="Confirm move"
                  />
                </SettingRow>

                <SettingRow
                  label="Premoves"
                  helper="Queue your next move while waiting"
                  last
                >
                  <Toggle
                    enabled={settings.premoves}
                    onChange={(v) => update("premoves", v)}
                    ariaLabel="Premoves"
                  />
                </SettingRow>
              </SettingsCard>

              {}
              <SettingsCard
                icon={<Bell className="w-5 h-5 text-amber-500" />}
                title="Notifications"
                subtitle="Control what alerts you receive"
                accent="bg-amber-500"
              >
                <SettingRow
                  label="Email Notifications"
                  helper="Receive emails about activity"
                >
                  <Toggle
                    enabled={settings.emailNotifications}
                    onChange={(v) => update("emailNotifications", v)}
                    ariaLabel="Email notifications"
                  />
                </SettingRow>

                <SettingRow
                  label="Push Notifications"
                  helper="Browser push alerts"
                >
                  <Toggle
                    enabled={settings.pushNotifications}
                    onChange={(v) => update("pushNotifications", v)}
                    ariaLabel="Push notifications"
                  />
                </SettingRow>

                <SettingRow
                  label="Challenge Requests"
                  helper="Get notified when someone challenges you"
                >
                  <Toggle
                    enabled={settings.challengeRequests}
                    onChange={(v) => update("challengeRequests", v)}
                    ariaLabel="Challenge requests"
                  />
                </SettingRow>

                <SettingRow
                  label="Tournament Updates"
                  helper="Upcoming events and results"
                >
                  <Toggle
                    enabled={settings.tournamentUpdates}
                    onChange={(v) => update("tournamentUpdates", v)}
                    ariaLabel="Tournament updates"
                  />
                </SettingRow>

                <SettingRow
                  label="Sound Effects"
                  helper="In-game sounds and alerts"
                >
                  <Toggle
                    enabled={settings.soundEffects}
                    onChange={(v) => update("soundEffects", v)}
                    ariaLabel="Sound effects"
                  />
                </SettingRow>

                <SettingRow
                  label="Sound Volume"
                  helper="Adjust effect volume"
                  last
                >
                  <Slider
                    min={0}
                    max={100}
                    value={settings.soundVolume}
                    onChange={(v) => update("soundVolume", v)}
                    label={`${settings.soundVolume}%`}
                  />
                </SettingRow>
              </SettingsCard>

              {}
              <SettingsCard
                icon={<Shield className="w-5 h-5 text-blue-500" />}
                title="Privacy & Safety"
                subtitle="Control who sees your information"
                accent="bg-blue-500"
              >
                <SettingRow
                  label="Profile Visibility"
                  helper="Who can see your profile"
                >
                  <SegmentedControl
                    options={[
                      { label: "Public", value: "public" },
                      { label: "Friends", value: "friends" },
                      { label: "Private", value: "private" },
                    ]}
                    value={settings.profileVisibility}
                    onChange={(v) =>
                      update(
                        "profileVisibility",
                        v as "public" | "friends" | "private",
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  label="Show Online Status"
                  helper="Let others see when you're online"
                >
                  <Toggle
                    enabled={settings.showOnlineStatus}
                    onChange={(v) => update("showOnlineStatus", v)}
                    ariaLabel="Show online status"
                  />
                </SettingRow>

                <SettingRow
                  label="Show Last Seen"
                  helper="Display when you were last active"
                >
                  <Toggle
                    enabled={settings.showLastSeen}
                    onChange={(v) => update("showLastSeen", v)}
                    ariaLabel="Show last seen"
                  />
                </SettingRow>

                <SettingRow
                  label="Blocked Users"
                  helper="Manage your block list"
                  last
                >
                  <button
                    onClick={() => setBlockModal(true)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Manage
                  </button>
                </SettingRow>
              </SettingsCard>

              {}
              <SettingsCard
                icon={<Sparkles className="w-5 h-5 text-violet-500" />}
                title="AI & Analysis"
                subtitle="Configure AI-powered features"
                accent="bg-violet-500"
              >
                <SettingRow
                  label="AI Move Explanations"
                  helper="Get detailed move analysis powered by Llama 3"
                >
                  <Toggle
                    enabled={settings.enableAiExplanations}
                    onChange={(v) => update("enableAiExplanations", v)}
                    color="bg-violet-500"
                    ariaLabel="AI explanations"
                  />
                </SettingRow>

                {}
                <div className="py-2">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                    {groqConfigured ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          Groq API connected
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-red-500 dark:text-red-400">
                          VITE_GROQ_API_KEY missing — add it to .env
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <SettingRow
                  label="Explanation Level"
                  helper="How detailed AI commentary should be"
                >
                  <SegmentedControl
                    options={[
                      { label: "Brief", value: "brief" },
                      { label: "Normal", value: "normal" },
                      { label: "Deep", value: "deep" },
                    ]}
                    value={settings.explanationLevel}
                    onChange={(v) =>
                      update(
                        "explanationLevel",
                        v as "brief" | "normal" | "deep",
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  label="Post-Game Analysis"
                  helper="Allow engine analysis after games"
                >
                  <Toggle
                    enabled={settings.postGameAnalysis}
                    onChange={(v) => update("postGameAnalysis", v)}
                    color="bg-violet-500"
                    ariaLabel="Post-game analysis"
                  />
                </SettingRow>

                <SettingRow
                  label="Engine Strength"
                  helper="Stockfish difficulty level"
                  last
                >
                  <Slider
                    min={1}
                    max={20}
                    value={settings.engineStrength}
                    onChange={(v) => update("engineStrength", v)}
                    label={`Lvl ${settings.engineStrength}`}
                  />
                </SettingRow>
              </SettingsCard>
            </div>

            {}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
              {}
              <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm overflow-hidden">
                <div className="relative p-6 text-center">
                  {}
                  <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-900/20 ring-4 ring-white dark:ring-gray-900 overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.fullName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {user?.fullName?.substring(0, 2).toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-bold">
                      {user?.fullName || "User"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {user?.email || ""}
                    </p>

                    {}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        {
                          label: "Bullet",
                          value: user?.bulletRating ?? 1500,
                          icon: "⚡",
                        },
                        {
                          label: "Blitz",
                          value: user?.blitzRating ?? 1500,
                          icon: "🔥",
                        },
                        {
                          label: "Rapid",
                          value: user?.rapidRating ?? 1500,
                          icon: "🚀",
                        },
                        {
                          label: "Classical",
                          value: user?.classicalRating ?? 1500,
                          icon: "🏛️",
                        },
                      ].map((r) => (
                        <div
                          key={r.label}
                          className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-center"
                        >
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {r.icon} {r.label}
                          </span>
                          <div className="text-sm font-bold mt-0.5">
                            {r.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Games Played</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {user?.gamesPlayed ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span>Games Won</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {user?.gamesWon ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <SettingsCard
                icon={<Zap className="w-5 h-5 text-amber-500" />}
                title="Quick Actions"
              >
                <div className="space-y-2 py-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Export Games (PGN)</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left">
                    <Download className="w-4 h-4 text-gray-500" />
                    <span>Download Account Data</span>
                  </button>
                  <button
                    onClick={() => setFeedbackModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-left"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span>Send Feedback</span>
                  </button>
                </div>
              </SettingsCard>

              {}
              <div className="rounded-2xl border border-red-200/40 dark:border-red-900/30 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-red-100/60 dark:border-red-900/20">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
                      Danger Zone
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Irreversible actions
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-2.5">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out All Devices</span>
                  </button>
                  <button
                    onClick={() => setDeleteModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {}
      <Modal
        open={passwordModal}
        onClose={() => {
          setPasswordModal(false);
          setPwFields({ current: "", newPw: "", confirm: "" });
        }}
        title="Change Password"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              value={pwFields.current}
              onChange={(e) =>
                setPwFields((p) => ({ ...p, current: e.target.value }))
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              value={pwFields.newPw}
              onChange={(e) =>
                setPwFields((p) => ({ ...p, newPw: e.target.value }))
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              value={pwFields.confirm}
              onChange={(e) =>
                setPwFields((p) => ({ ...p, confirm: e.target.value }))
              }
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              placeholder="Confirm new password"
            />
          </div>
          <button
            disabled={
              !pwFields.current ||
              !pwFields.newPw ||
              pwFields.newPw !== pwFields.confirm
            }
            onClick={() => {
              showToast(tr("Password changed successfully!"));
              setPasswordModal(false);
              setPwFields({ current: "", newPw: "", confirm: "" });
            }}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-sm transition-all"
          >
            Update Password
          </button>
        </div>
      </Modal>

      {}
      <Modal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setDeleteConfirmText("");
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              This action is permanent and cannot be undone. All your games,
              ratings, and data will be lost.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Type{" "}
              <span className="text-red-500 font-bold">
                {user?.fullName || "username"}
              </span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
              placeholder={user?.fullName || "username"}
            />
          </div>
          <button
            disabled={deleteConfirmText !== (user?.fullName || "username")}
            onClick={() => {
              showToast(tr("Account deletion requested"), "error");
              setDeleteModal(false);
              setDeleteConfirmText("");
            }}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-sm transition-all"
          >
            Permanently Delete Account
          </button>
        </div>
      </Modal>

      <Modal
        open={blockModal}
        onClose={() => setBlockModal(false)}
        title="Blocked Users"
      >
        <div className="space-y-3">
          {loadingBlockedUsers ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No blocked users.
            </div>
          ) : (
            blockedUsers.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {entry.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {entry.email || ""}
                  </div>
                </div>
                <button
                  onClick={() => handleUnblockUser(entry.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={feedbackModal}
        onClose={() => {
          if (sendingFeedback) return;
          setFeedbackModal(false);
        }}
        title="Send Feedback"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Category
            </label>
            <select
              value={feedbackCategory}
              onChange={(e) => setFeedbackCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
            >
              <option value="general">General</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              Message
            </label>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={5}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm resize-none"
              placeholder="Describe your issue or suggestion..."
            />
          </div>
          <button
            onClick={() => void handleSubmitFeedback()}
            disabled={sendingFeedback}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-sm transition-all"
          >
            {sendingFeedback ? "Sending..." : "Submit Feedback"}
          </button>
        </div>
      </Modal>

      {}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
