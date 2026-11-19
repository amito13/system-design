import { RTL_LANGS } from '../app/theme/boot';

export interface LanguageDef {
  id: string;
  /** Short code shown in the header button. */
  code: string;
  /** Name in its own language. */
  native: string;
  /** Name in English (also used as an accessible description). */
  english: string;
  dir: 'ltr' | 'rtl';
}

/** v1 ships English + Hindi (PRD §11.3). Add a language here plus its JSON files. */
export const LANGUAGES: LanguageDef[] = [
  { id: 'en', code: 'EN', native: 'English', english: 'English', dir: 'ltr' },
  { id: 'hi', code: 'HI', native: 'हिन्दी', english: 'Hindi', dir: 'ltr' },
];

export const DEFAULT_LANG = 'en';

export function getLanguage(id: string): LanguageDef {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]!;
}

export function dirFor(id: string): 'ltr' | 'rtl' {
  return RTL_LANGS.includes(id.split('-')[0] ?? '') ? 'rtl' : 'ltr';
}
