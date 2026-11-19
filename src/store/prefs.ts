import { create } from 'zustand';
import { DEFAULT_THEME_PREF, type ThemeMode, type ThemePref } from '../app/theme/resolve';
import { initialLanguage } from '../lib/i18n';
import { storage } from '../lib/storage';

export type MotionPref = 'full' | 'reduced' | 'off';
export interface PanelsPref {
  left: boolean;
  right: boolean;
}

interface PrefsState {
  theme: ThemePref;
  lang: string;
  motion: MotionPref;
  panels: PanelsPref;
  setTheme: (patch: Partial<ThemePref>) => void;
  /** Header toggle order (PRD §4.4): Light → Dark → Scheduled → Light. */
  cycleTheme: () => void;
  setLang: (lang: string) => void;
  setMotion: (motion: MotionPref) => void;
  setPanels: (patch: Partial<PanelsPref>) => void;
  /** Re-read everything from storage (after an import or reset). */
  reload: () => void;
}

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system', 'scheduled'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function loadTheme(): ThemePref {
  const raw = storage.get<Partial<ThemePref> | null>('theme', null) ?? {};
  return {
    mode: THEME_MODES.includes(raw.mode as ThemeMode)
      ? (raw.mode as ThemeMode)
      : DEFAULT_THEME_PREF.mode,
    darkFrom: TIME_RE.test(raw.darkFrom ?? '') ? raw.darkFrom! : DEFAULT_THEME_PREF.darkFrom,
    darkTo: TIME_RE.test(raw.darkTo ?? '') ? raw.darkTo! : DEFAULT_THEME_PREF.darkTo,
  };
}

function loadMotion(): MotionPref {
  const m = storage.get<string>('motion', 'full');
  return m === 'reduced' || m === 'off' ? m : 'full';
}

function loadPanels(): PanelsPref {
  const p = storage.get<Partial<PanelsPref>>('panels', {});
  return { left: p.left ?? true, right: p.right ?? true };
}

export const NEXT_THEME_MODE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'scheduled',
  scheduled: 'light',
  system: 'light',
};

export const usePrefs = create<PrefsState>()((set, get) => ({
  theme: loadTheme(),
  lang: initialLanguage(),
  motion: loadMotion(),
  panels: loadPanels(),

  setTheme: (patch) => {
    const theme = { ...get().theme, ...patch };
    if (!TIME_RE.test(theme.darkFrom)) theme.darkFrom = get().theme.darkFrom;
    if (!TIME_RE.test(theme.darkTo)) theme.darkTo = get().theme.darkTo;
    storage.set('theme', theme);
    set({ theme });
  },
  cycleTheme: () => get().setTheme({ mode: NEXT_THEME_MODE[get().theme.mode] }),
  setLang: (lang) => {
    storage.set('lang', lang);
    set({ lang });
  },
  setMotion: (motion) => {
    storage.set('motion', motion);
    set({ motion });
  },
  setPanels: (patch) => {
    const panels = { ...get().panels, ...patch };
    storage.set('panels', panels);
    set({ panels });
  },
  reload: () =>
    set({
      theme: loadTheme(),
      lang: initialLanguage(),
      motion: loadMotion(),
      panels: loadPanels(),
    }),
}));
