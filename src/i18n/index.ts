import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { mnTranslations } from "./mn";

type LanguageCode = "en" | "mn";

const DEFAULT_LANGUAGE: LanguageCode = "en";

const parseStoredLanguage = (): LanguageCode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("settings-storage");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: {
        settings?: { language?: LanguageCode };
        savedSettings?: { language?: LanguageCode };
      };
    };

    const savedLanguage = parsed?.state?.savedSettings?.language;
    if (savedLanguage === "en" || savedLanguage === "mn") {
      return savedLanguage;
    }

    const draftLanguage = parsed?.state?.settings?.language;
    if (draftLanguage === "en" || draftLanguage === "mn") {
      return draftLanguage;
    }
  } catch {
    return null;
  }

  return null;
};

const detectInitialLanguage = (): LanguageCode => {
  const stored = parseStoredLanguage();
  if (stored) return stored;

  if (typeof navigator !== "undefined") {
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith("mn")) {
      return "mn";
    }
  }

  return DEFAULT_LANGUAGE;
};

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {} },
    mn: { translation: mnTranslations },
  },
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
});

export default i18n;
