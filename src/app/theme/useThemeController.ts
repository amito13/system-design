import { useEffect } from 'react';
import { create } from 'zustand';
import { usePrefs } from '../../store/prefs';
import {
  minutesOfDay,
  msUntilNextSwitch,
  resolveTheme,
  THEME_COLORS,
  type ResolvedTheme,
} from './resolve';

/** The theme actually on screen right now (read by UI such as the header toggle). */
export const useResolvedTheme = create<{ resolved: ResolvedTheme }>()(() => ({
  resolved: (document.documentElement.getAttribute('data-theme') as ResolvedTheme) ?? 'light',
}));

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');
const reducedQuery = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');

function applyTheme(next: ResolvedTheme, animate: boolean) {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === next) return;
  if (animate) {
    root.classList.add('theme-fade');
    window.setTimeout(() => root.classList.remove('theme-fade'), 450);
  }
  root.setAttribute('data-theme', next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[next]);
  useResolvedTheme.setState({ resolved: next });
}

/**
 * Keeps <html data-theme> and <html data-motion> in sync with preferences, the OS, and the clock
 * (PRD §4.4): re-checks every 60 s, on tab visibility, at the exact next scheduled switch, and
 * when the OS color scheme changes.
 */
export function useThemeController(): void {
  const theme = usePrefs((s) => s.theme);
  const motion = usePrefs((s) => s.motion);

  // Motion attribute
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const osReduced = reducedQuery()?.matches ?? false;
      root.setAttribute(
        'data-motion',
        motion === 'off' ? 'off' : motion === 'reduced' || osReduced ? 'reduced' : 'full',
      );
    };
    sync();
    const mq = reducedQuery();
    mq?.addEventListener('change', sync);
    return () => mq?.removeEventListener('change', sync);
  }, [motion]);

  // Theme attribute
  useEffect(() => {
    let precise: number | undefined;
    const animateAllowed = () => document.documentElement.getAttribute('data-motion') === 'full';

    const evaluate = (animate: boolean) => {
      const now = new Date();
      applyTheme(
        resolveTheme(theme, minutesOfDay(now), darkQuery()?.matches ?? false),
        animate && animateAllowed(),
      );
      window.clearTimeout(precise);
      const wait = msUntilNextSwitch(theme, now);
      // +1 s so the clock is safely past the boundary minute.
      if (wait !== null && wait < 2 ** 31 - 1)
        precise = window.setTimeout(() => evaluate(true), wait + 1000);
    };

    evaluate(true);
    const tick = window.setInterval(() => evaluate(true), 60_000);
    const onVisible = () => document.visibilityState === 'visible' && evaluate(false);
    const mq = darkQuery();
    const onScheme = () => evaluate(true);
    document.addEventListener('visibilitychange', onVisible);
    mq?.addEventListener('change', onScheme);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(precise);
      document.removeEventListener('visibilitychange', onVisible);
      mq?.removeEventListener('change', onScheme);
    };
  }, [theme]);
}
