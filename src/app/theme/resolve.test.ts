import { describe, expect, it } from 'vitest';
import { msUntilNextSwitch, resolveTheme, type ThemePref } from './resolve';

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};
const scheduled = (darkFrom = '20:00', darkTo = '06:00'): ThemePref => ({
  mode: 'scheduled',
  darkFrom,
  darkTo,
});

describe('resolveTheme — default 20:00 → 06:00 schedule (PRD §14)', () => {
  it.each([
    ['19:59', 'light'],
    ['20:00', 'dark'],
    ['23:30', 'dark'],
    ['00:00', 'dark'],
    ['05:59', 'dark'],
    ['06:00', 'light'],
    ['12:00', 'light'],
  ])('%s → %s', (time, expected) => {
    expect(resolveTheme(scheduled(), at(time), false)).toBe(expected);
  });
});

describe('resolveTheme — custom ranges', () => {
  it('handles a range that does not cross midnight', () => {
    const pref = scheduled('13:00', '15:00');
    expect(resolveTheme(pref, at('12:59'), false)).toBe('light');
    expect(resolveTheme(pref, at('13:00'), false)).toBe('dark');
    expect(resolveTheme(pref, at('14:59'), false)).toBe('dark');
    expect(resolveTheme(pref, at('15:00'), false)).toBe('light');
  });

  it('handles a late-night range that crosses midnight', () => {
    const pref = scheduled('22:30', '07:15');
    expect(resolveTheme(pref, at('22:29'), false)).toBe('light');
    expect(resolveTheme(pref, at('22:30'), false)).toBe('dark');
    expect(resolveTheme(pref, at('07:14'), false)).toBe('dark');
    expect(resolveTheme(pref, at('07:15'), false)).toBe('light');
  });

  it('treats equal start and end as "never dark"', () => {
    expect(resolveTheme(scheduled('20:00', '20:00'), at('21:00'), true)).toBe('light');
  });
});

describe('resolveTheme — other modes and bad input', () => {
  it('fixed modes ignore the clock and the OS', () => {
    expect(resolveTheme({ mode: 'light' }, at('23:00'), true)).toBe('light');
    expect(resolveTheme({ mode: 'dark' }, at('12:00'), false)).toBe('dark');
  });

  it('system mode follows the OS', () => {
    expect(resolveTheme({ mode: 'system' }, at('12:00'), true)).toBe('dark');
    expect(resolveTheme({ mode: 'system' }, at('23:00'), false)).toBe('light');
  });

  it('falls back to the default schedule for missing or garbage preferences', () => {
    expect(resolveTheme(null, at('21:00'), false)).toBe('dark');
    expect(resolveTheme(undefined, at('10:00'), true)).toBe('light');
    expect(
      resolveTheme({ mode: 'nope' as never, darkFrom: '25:99', darkTo: 'x' }, at('20:30'), false),
    ).toBe('dark');
  });
});

describe('msUntilNextSwitch', () => {
  it('returns the time to the nearest boundary', () => {
    const now = new Date(2026, 10, 19, 19, 0, 0);
    expect(msUntilNextSwitch(scheduled(), now)).toBe(60 * 60 * 1000);
  });

  it('rolls over to tomorrow', () => {
    const now = new Date(2026, 10, 19, 20, 0, 0);
    expect(msUntilNextSwitch(scheduled(), now)).toBe(10 * 60 * 60 * 1000);
  });

  it('is null outside scheduled mode', () => {
    expect(
      msUntilNextSwitch({ mode: 'dark', darkFrom: '20:00', darkTo: '06:00' }, new Date()),
    ).toBeNull();
  });
});
