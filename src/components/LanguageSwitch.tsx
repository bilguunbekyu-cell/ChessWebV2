import { useSettingsStore } from "../store/settingsStore";

export default function LanguageSwitch({
  className = "",
}: {
  className?: string;
}) {
  const language = useSettingsStore((state) => state.settings.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const buttonBase =
    "px-3 py-2 text-xs font-bold rounded-lg transition-colors min-w-[44px]";

  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ${className}`}
      title="Language"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`${buttonBase} ${
          language === "en"
            ? "bg-teal-600 text-white"
            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        aria-pressed={language === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("mn")}
        className={`${buttonBase} ${
          language === "mn"
            ? "bg-teal-600 text-white"
            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        aria-pressed={language === "mn"}
      >
        MN
      </button>
    </div>
  );
}
