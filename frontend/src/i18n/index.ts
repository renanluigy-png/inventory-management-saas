import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt';
import en from './locales/en';
import es from './locales/es';

const STORAGE_KEY = 'erp-language';

const savedLanguage = typeof window !== 'undefined'
  ? localStorage.getItem(STORAGE_KEY) ?? 'pt'
  : 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: pt,
      en: en,
      es: es,
    },
    lng: savedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false, // React já escapa por padrão
    },
  });

/** Troca o idioma e persiste a preferência. */
export function setLanguage(lang: 'pt' | 'en' | 'es'): void {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
] as const;

export type SupportedLanguage = 'pt' | 'en' | 'es';

export default i18n;
