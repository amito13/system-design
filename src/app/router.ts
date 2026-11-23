import { useSyncExternalStore } from 'react';

/** Every screen in the app (PRD §3). Hash routing keeps deep links working on static hosting. */
export type Route =
  | { name: 'home' }
  | { name: 'learn'; lessonId: string | null; step: number }
  | { name: 'practice' }
  | { name: 'practice-review' }
  | { name: 'practice-lesson'; lessonId: string }
  | { name: 'practice-module'; moduleId: string }
  | { name: 'practice-drill'; drillId: string }
  | { name: 'lab' }
  | { name: 'lab-new' }
  | { name: 'lab-design'; designId: string }
  | { name: 'lab-challenge'; challengeId: string }
  | { name: 'lab-share'; payload: string }
  | { name: 'cheatsheets' }
  | { name: 'cheatsheet'; sheetId: string }
  | { name: 'settings' }
  | { name: 'playground' }
  | { name: 'not-found'; path: string };

export type Section = 'home' | 'learn' | 'practice' | 'lab' | 'cheatsheets' | 'settings' | null;

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function decode(part: string | undefined): string | null {
  if (part === undefined) return null;
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (path === '') return { name: 'home' };
  const parts = path.split('/');
  const [head, a, b, c] = parts;
  const notFound: Route = { name: 'not-found', path: `/${path}` };
  const id = (v: string | undefined) => {
    const d = decode(v);
    return d !== null && ID.test(d) ? d : null;
  };

  switch (head) {
    case 'learn': {
      if (parts.length === 1) return { name: 'learn', lessonId: null, step: 1 };
      const lessonId = id(a);
      if (!lessonId || parts.length > 3) return notFound;
      const step = b === undefined ? 1 : Number(b);
      if (!Number.isInteger(step) || step < 1 || step > 99) return notFound;
      return { name: 'learn', lessonId, step };
    }
    case 'practice': {
      if (parts.length === 1) return { name: 'practice' };
      if (a === 'review' && parts.length === 2) return { name: 'practice-review' };
      const target = id(b);
      if (!target || parts.length !== 3) return notFound;
      if (a === 'lesson') return { name: 'practice-lesson', lessonId: target };
      if (a === 'module') return { name: 'practice-module', moduleId: target };
      if (a === 'drill') return { name: 'practice-drill', drillId: target };
      return notFound;
    }
    case 'lab': {
      if (parts.length === 1) return { name: 'lab' };
      if (a === 'new' && parts.length === 2) return { name: 'lab-new' };
      if (a === 'share' && parts.length >= 3) {
        // lz-string "URI component" payloads may contain any URL-safe characters
        const payload = parts.slice(2).join('/');
        return payload ? { name: 'lab-share', payload } : notFound;
      }
      if (a === 'challenge') {
        const challengeId = id(b);
        return challengeId && parts.length === 3
          ? { name: 'lab-challenge', challengeId }
          : notFound;
      }
      const designId = id(a);
      return designId && parts.length === 2 ? { name: 'lab-design', designId } : notFound;
    }
    case 'cheatsheets': {
      if (parts.length === 1) return { name: 'cheatsheets' };
      const sheetId = id(a);
      return sheetId && parts.length === 2 ? { name: 'cheatsheet', sheetId } : notFound;
    }
    case 'settings':
      return parts.length === 1 ? { name: 'settings' } : notFound;
    case 'playground':
      return parts.length === 1 ? { name: 'playground' } : notFound;
    default:
      void c;
      return notFound;
  }
}

export function routeSection(route: Route): Section {
  if (route.name === 'home') return 'home';
  if (route.name === 'learn') return 'learn';
  if (route.name.startsWith('practice')) return 'practice';
  if (route.name.startsWith('lab')) return 'lab';
  if (route.name.startsWith('cheatsheet')) return 'cheatsheets';
  if (route.name === 'settings') return 'settings';
  return null;
}

/** Build an href for a route (inverse of parseHash). */
export function href(route: Exclude<Route, { name: 'not-found' }>): string {
  const e = encodeURIComponent;
  switch (route.name) {
    case 'home':
      return '#/';
    case 'learn':
      return route.lessonId ? `#/learn/${e(route.lessonId)}/${route.step}` : '#/learn';
    case 'practice':
      return '#/practice';
    case 'practice-review':
      return '#/practice/review';
    case 'practice-lesson':
      return `#/practice/lesson/${e(route.lessonId)}`;
    case 'practice-module':
      return `#/practice/module/${e(route.moduleId)}`;
    case 'practice-drill':
      return `#/practice/drill/${e(route.drillId)}`;
    case 'lab':
      return '#/lab';
    case 'lab-new':
      return '#/lab/new';
    case 'lab-design':
      return `#/lab/${e(route.designId)}`;
    case 'lab-challenge':
      return `#/lab/challenge/${e(route.challengeId)}`;
    case 'lab-share':
      return `#/lab/share/${route.payload}`;
    case 'cheatsheets':
      return '#/cheatsheets';
    case 'cheatsheet':
      return `#/cheatsheets/${e(route.sheetId)}`;
    case 'settings':
      return '#/settings';
    case 'playground':
      return '#/playground';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

/** Current route; re-renders on hash change. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

export function navigate(to: string): void {
  if (window.location.hash !== to) window.location.hash = to;
}

/** Change the hash without adding a history entry (e.g. stepping through a lesson). */
export function navigateReplace(to: string): void {
  if (window.location.hash === to) return;
  const url = `${window.location.pathname}${window.location.search}${to}`;
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
