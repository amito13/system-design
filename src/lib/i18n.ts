import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUi from '../i18n/en/ui.json';
import hiUi from '../i18n/hi/ui.json';
import { DEFAULT_LANG, dirFor, LANGUAGES } from './languages';
import { storage } from './storage';

export function initialLanguage(): string {
  const stored = storage.get<string | null>('lang', null);
  if (stored && LANGUAGES.some((l) => l.id === stored)) return stored;
  const nav = (globalThis.navigator?.language ?? '').split('-')[0] ?? '';
  return LANGUAGES.some((l) => l.id === nav) ? nav : DEFAULT_LANG;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { ui: enUi },
    hi: { ui: hiUi },
  },
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANG,
  defaultNS: 'ui',
  ns: ['ui'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Applies lang + dir to <html>; called whenever the language changes. */
export function applyDocumentLanguage(lang: string): void {
  const root = document.documentElement;
  root.setAttribute('lang', lang);
  root.setAttribute('dir', dirFor(lang));
}

export default i18n;
