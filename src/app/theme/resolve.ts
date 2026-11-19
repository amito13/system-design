export type ThemeMode = 'light' | 'dark' | 'system' | 'scheduled';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePref {
  mode: ThemeMode;
  /** "HH:MM" local time the night theme starts (PRD default 20:00). */
  darkFrom: string;
  /** "HH:MM" local time the night theme ends (PRD default 06:00). */
  darkTo: string;
}

export const DEFAULT_THEME_PREF: ThemePref = {
  mode: 'scheduled',
  darkFrom: '20:00',
  darkTo: '06:00',
};

export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f4f6fa', dark: '#000000' };

/**
 * Decide light or dark.
 *
 * IMPORTANT: this function must stay fully self-contained (no imports, no references to
 * anything outside its body). Vite serialises it with `Function.prototype.toString()` into the
 * inline boot script in index.html, so the very first paint already has the right theme.
 *
 * @param pref        stored preference (may be partial, null, or garbage from storage)
 * @param nowMinutes  minutes since local midnight (0–1439)
 * @param systemDark  whether the OS prefers a dark color scheme
 */
export function resolveTheme(
  pref: Partial<ThemePref> | null | undefined,
  nowMinutes: number,
  systemDark: boolean,
): ResolvedTheme {
  var parse = function (value: unknown, fallback: number): number {
    if (typeof value !== 'string') return fallback;
    var match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) return fallback;
    var h = Number(match[1]);
    var m = Number(match[2]);
    if (h > 23 || m > 59) return fallback;
    return h * 60 + m;
  };
  var p = pref && typeof pref === 'object' ? pref : {};
  var mode = p.mode;
  if (mode === 'light' || mode === 'dark') return mode;
  if (mode === 'system') return systemDark ? 'dark' : 'light';
  // 'scheduled' and anything unknown fall back to the schedule (the default mode).
  var from = parse(p.darkFrom, 20 * 60);
  var to = parse(p.darkTo, 6 * 60);
  if (from === to) return 'light';
  var dark =
    from < to ? nowMinutes >= from && nowMinutes < to : nowMinutes >= from || nowMinutes < to;
  return dark ? 'dark' : 'light';
}

/** Minutes since local midnight for a Date. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Milliseconds from `now` until the next scheduled switch (used to schedule a precise re-check). */
export function msUntilNextSwitch(pref: ThemePref, now: Date): number | null {
  if (pref.mode !== 'scheduled') return null;
  const targets = [pref.darkFrom, pref.darkTo]
    .map((t) => /^(\d{1,2}):(\d{2})$/.exec(t))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => {
      const d = new Date(now);
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
      return d.getTime() - now.getTime();
    });
  return targets.length ? Math.min(...targets) : null;
}
