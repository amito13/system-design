import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    storage.clearAll();
  });
  afterEach(() => vi.restoreAllMocks());

  it('namespaces keys with sc: and round-trips JSON', () => {
    storage.set('done', ['a', 'b']);
    expect(localStorage.getItem('sc:done')).toBe('["a","b"]');
    expect(storage.get('done', [])).toEqual(['a', 'b']);
  });

  it('returns the fallback for missing or corrupt values', () => {
    expect(storage.get('missing', 42)).toBe(42);
    localStorage.setItem('sc:bad', '{oops');
    expect(storage.get('bad', 'fallback')).toBe('fallback');
  });

  it('ignores keys it does not own', () => {
    localStorage.setItem('other-app', '1');
    storage.set('mine', 1);
    expect(storage.keys()).toEqual(['mine']);
    storage.clearAll();
    expect(localStorage.getItem('other-app')).toBe('1');
  });

  it('keeps working in memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    storage.set('theme', { mode: 'dark' });
    expect(storage.get('theme', null)).toEqual({ mode: 'dark' });
  });

  it('exports and imports (merge and replace)', () => {
    storage.set('done', ['x']);
    storage.set('lang', 'hi');
    const backup = storage.exportAll();
    expect(backup).toMatchObject({
      app: 'scalecanvas',
      version: 1,
      data: { done: ['x'], lang: 'hi' },
    });

    storage.clearAll();
    storage.set('motion', 'off');
    expect(storage.importAll(backup, 'merge')).toBe(2);
    expect(storage.keys().sort()).toEqual(['done', 'lang', 'motion']);

    storage.importAll(backup, 'replace');
    expect(storage.keys().sort()).toEqual(['done', 'lang']);
  });

  it('rejects files that are not ScaleCanvas exports', () => {
    expect(() => storage.importAll({ hello: 1 }, 'merge')).toThrow();
    expect(() => storage.importAll(null, 'merge')).toThrow();
  });
});
