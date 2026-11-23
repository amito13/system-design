import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '../lib/storage';
import { useProgress } from './progress';

describe('progress store', () => {
  beforeEach(() => {
    storage.clearAll();
    useProgress.getState().reload();
  });

  it('marks lessons done once and persists', () => {
    useProgress.getState().markDone('request-journey');
    useProgress.getState().markDone('request-journey');
    expect(useProgress.getState().done).toEqual(['request-journey']);
    expect(storage.get('done', [])).toEqual(['request-journey']);
  });

  it('records the last visit and a de-duplicated recent list (max 10)', () => {
    const { visit } = useProgress.getState();
    visit('a', 1);
    visit('b', 3);
    visit('a', 5);
    expect(useProgress.getState().last).toEqual({ lessonId: 'a', step: 5 });
    expect(useProgress.getState().recent).toEqual([
      { lessonId: 'a', step: 5 },
      { lessonId: 'b', step: 3 },
    ]);
    for (let i = 0; i < 15; i++) visit(`l${i}`, 1);
    expect(useProgress.getState().recent).toHaveLength(10);
  });

  it('survives garbage in storage', () => {
    storage.set('done', 'nope');
    storage.set('last', { lessonId: 3 });
    storage.set('recent', [
      { lessonId: 'x', step: 0 },
      { lessonId: 'y', step: 2 },
    ]);
    useProgress.getState().reload();
    expect(useProgress.getState()).toMatchObject({
      done: [],
      last: null,
      recent: [{ lessonId: 'y', step: 2 }],
    });
  });
});
