import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildThemeBootScript } from './boot';

/** Runs the exact inline script Vite injects into index.html, against a jsdom document. */
function runBoot() {
  // eslint-disable-next-line no-new-func
  new Function(buildThemeBootScript())();
  const root = document.documentElement;
  return {
    theme: root.getAttribute('data-theme'),
    motion: root.getAttribute('data-motion'),
    lang: root.getAttribute('lang'),
    dir: root.getAttribute('dir'),
    color: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  };
}

function mockMedia({ dark = false, reduced = false } = {}) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('dark') ? dark : q.includes('reduce') ? reduced : false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

describe('theme boot script (no-flash)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
    document.head.innerHTML = '<meta name="theme-color" content="">';
    mockMedia();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('defaults to scheduled: dark at 20:00', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 20, 0));
    expect(runBoot()).toMatchObject({ theme: 'dark', color: '#000000', motion: 'full' });
  });

  it('defaults to scheduled: light at 19:59', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 19, 59));
    expect(runBoot()).toMatchObject({ theme: 'light', color: '#f4f6fa' });
  });

  it('honours a stored fixed mode', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 23, 0));
    localStorage.setItem(
      'sc:theme',
      JSON.stringify({ mode: 'light', darkFrom: '20:00', darkTo: '06:00' }),
    );
    expect(runBoot().theme).toBe('light');
  });

  it('honours system mode', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12, 0));
    mockMedia({ dark: true });
    localStorage.setItem('sc:theme', JSON.stringify({ mode: 'system' }));
    expect(runBoot().theme).toBe('dark');
  });

  it('survives corrupt storage', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12, 0));
    localStorage.setItem('sc:theme', '{not json');
    localStorage.setItem('sc:lang', '"<script>"');
    expect(runBoot()).toMatchObject({ theme: 'light', lang: 'en', dir: 'ltr' });
  });

  it('sets language, RTL direction and motion before paint', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12, 0));
    localStorage.setItem('sc:lang', '"ar"');
    mockMedia({ reduced: true });
    expect(runBoot()).toMatchObject({ lang: 'ar', dir: 'rtl', motion: 'reduced' });
    localStorage.setItem('sc:lang', '"hi"');
    localStorage.setItem('sc:motion', '"off"');
    expect(runBoot()).toMatchObject({ lang: 'hi', dir: 'ltr', motion: 'off' });
  });
});
