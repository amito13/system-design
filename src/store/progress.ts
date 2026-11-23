import { create } from 'zustand';
import { storage } from '../lib/storage';

/** Learning progress (PRD §11.2): sc:done, sc:last, sc:recent. Steps are 1-based, like URLs. */

export interface Visit {
  lessonId: string;
  step: number;
}

interface ProgressState {
  done: string[];
  last: Visit | null;
  recent: Visit[];
  markDone: (lessonId: string) => void;
  visit: (lessonId: string, step: number) => void;
  reload: () => void;
}

const isVisit = (v: unknown): v is Visit =>
  !!v &&
  typeof (v as Visit).lessonId === 'string' &&
  Number.isInteger((v as Visit).step) &&
  (v as Visit).step >= 1;

function load() {
  const done = storage.get<unknown>('done', []);
  const last = storage.get<unknown>('last', null);
  const recent = storage.get<unknown>('recent', []);
  return {
    done: Array.isArray(done) ? done.filter((x): x is string => typeof x === 'string') : [],
    last: isVisit(last) ? last : null,
    recent: Array.isArray(recent) ? recent.filter(isVisit).slice(0, 10) : [],
  };
}

export const useProgress = create<ProgressState>()((set, get) => ({
  ...load(),
  markDone: (lessonId) => {
    if (get().done.includes(lessonId)) return;
    const done = [...get().done, lessonId];
    storage.set('done', done);
    set({ done });
  },
  visit: (lessonId, step) => {
    const last = { lessonId, step };
    const recent = [last, ...get().recent.filter((r) => r.lessonId !== lessonId)].slice(0, 10);
    storage.set('last', last);
    storage.set('recent', recent);
    set({ last, recent });
  },
  reload: () => set(load()),
}));
