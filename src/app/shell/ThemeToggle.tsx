import { Clock, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NEXT_THEME_MODE, usePrefs } from '../../store/prefs';
import type { ThemeMode } from '../theme/resolve';
import { useResolvedTheme } from '../theme/useThemeController';

export const THEME_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  scheduled: Clock,
};

/** Header toggle: Light → Dark → Scheduled → Light (PRD §4.4). */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = usePrefs((s) => s.theme);
  const cycleTheme = usePrefs((s) => s.cycleTheme);
  const resolved = useResolvedTheme((s) => s.resolved);
  const Icon = THEME_ICONS[theme.mode];
  const label = t('theme.toggle', {
    current: t(`theme.${theme.mode}`),
    next: t(`theme.${NEXT_THEME_MODE[theme.mode]}`),
  });
  const tip =
    theme.mode === 'scheduled'
      ? `${t('theme.nightAt', { from: theme.darkFrom, to: theme.darkTo })} · ${t('theme.showing', { theme: t(`theme.${resolved}`) })}`
      : label;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={tip}
      className="relative grid size-9 place-items-center rounded-[10px] border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
    >
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
      {theme.mode === 'scheduled' && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-surface"
          style={{ background: resolved === 'dark' ? 'var(--info)' : 'var(--warn)' }}
        />
      )}
    </button>
  );
}
