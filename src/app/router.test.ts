import { describe, expect, it } from 'vitest';
import { href, parseHash, routeSection, type Route } from './router';

describe('parseHash', () => {
  it.each<[string, Route]>([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/learn', { name: 'learn', lessonId: null, step: 1 }],
    ['#/learn/caching/9', { name: 'learn', lessonId: 'caching', step: 9 }],
    ['#/learn/caching', { name: 'learn', lessonId: 'caching', step: 1 }],
    ['#/practice', { name: 'practice' }],
    ['#/practice/review', { name: 'practice-review' }],
    ['#/practice/lesson/indexes', { name: 'practice-lesson', lessonId: 'indexes' }],
    ['#/practice/module/scaling', { name: 'practice-module', moduleId: 'scaling' }],
    ['#/practice/drill/chat', { name: 'practice-drill', drillId: 'chat' }],
    ['#/lab', { name: 'lab' }],
    ['#/lab/new', { name: 'lab-new' }],
    ['#/lab/d-123', { name: 'lab-design', designId: 'd-123' }],
    ['#/lab/challenge/zone-outage', { name: 'lab-challenge', challengeId: 'zone-outage' }],
    ['#/lab/share/N4IgdghgtgpiBcIDKA', { name: 'lab-share', payload: 'N4IgdghgtgpiBcIDKA' }],
    ['#/cheatsheets', { name: 'cheatsheets' }],
    ['#/cheatsheets/latency-numbers', { name: 'cheatsheet', sheetId: 'latency-numbers' }],
    ['#/settings', { name: 'settings' }],
    ['#/playground', { name: 'playground' }],
  ])('%s', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected);
  });

  it.each([
    '#/nope',
    '#/learn/caching/0',
    '#/learn/caching/abc',
    '#/learn/Bad_Id/1',
    '#/settings/x',
    '#/practice/lesson',
  ])('rejects %s', (hash) => {
    expect(parseHash(hash).name).toBe('not-found');
  });

  it('round-trips with href()', () => {
    const routes = [
      { name: 'learn', lessonId: 'request-journey', step: 3 },
      { name: 'practice-drill', drillId: 'chat' },
      { name: 'lab-challenge', challengeId: 'global-audience' },
      { name: 'cheatsheet', sheetId: 'nines' },
    ] as const;
    for (const r of routes) expect(parseHash(href(r))).toEqual(r);
  });

  it('maps routes to their nav section', () => {
    expect(routeSection(parseHash('#/lab/new'))).toBe('lab');
    expect(routeSection(parseHash('#/practice/review'))).toBe('practice');
    expect(routeSection(parseHash('#/cheatsheets/x'))).toBe('cheatsheets');
    expect(routeSection(parseHash('#/zzz'))).toBeNull();
  });
});
