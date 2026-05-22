import en from "@/locales/en.json";
import de from "@/locales/de.json";
import { useSettingsStore, type AppLanguage } from "@/stores/settingsStore";

type Dictionary = Record<string, string>;

const dictionaries: Record<AppLanguage, Dictionary> = { en, de };

export function translate(key: string, language?: AppLanguage): string {
  const lang = language ?? useSettingsStore.getState().general.language;
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

export function useI18n() {
  const language = useSettingsStore((s) => s.general.language);
  return {
    language,
    t: (key: string) => translate(key, language),
  };
}
