import { describe, expect, it } from 'vitest';
import type { HudMetricDef } from '../content/types';
import { allLessons, authoredLessonIds, FIRST_LESSON_ID, lessonPlace, loadLesson } from './data';
import { deriveChanges, formatMetric } from './format';

const ms: HudMetricDef = { id: 'total', label: 'Total', better: 'lower', format: 'ms' };
const thr: HudMetricDef = { id: 'rps', label: 'Throughput', better: 'higher', unit: 'rps' };

describe('formatMetric', () => {
  it('formats each kind', () => {
    expect(formatMetric(ms, 309.4)).toBe('309 ms');
    expect(formatMetric(ms, null)).toBe('—');
    expect(formatMetric(thr, 6000)).toBe('6,000 rps');
    expect(formatMetric({ ...ms, format: 'pct' }, 12.34)).toBe('12.3%');
    expect(formatMetric({ ...ms, format: 'bytes' }, 600_000)).toBe('600 KB');
    expect(formatMetric({ ...ms, format: 'bytes' }, 1_500_000)).toBe('1.5 MB');
    expect(formatMetric(ms, 'n/a')).toBe('n/a');
  });
});

describe('deriveChanges', () => {
  it('labels improvements and regressions by the metric’s better direction', () => {
    const c = deriveChanges([ms, thr], { total: 141, rps: 100 }, { total: 159, rps: 200 });
    expect(c).toEqual([
      { id: 'total', label: 'Total', from: '141 ms', to: '159 ms', direction: 'up', tone: 'bad' },
      {
        id: 'rps',
        label: 'Throughput',
        from: '100 rps',
        to: '200 rps',
        direction: 'up',
        tone: 'good',
      },
    ]);
  });

  it('ignores unchanged values and the first step', () => {
    expect(deriveChanges([ms], undefined, { total: 1 })).toEqual([]);
    expect(deriveChanges([ms], { total: 24 }, { total: 24 })).toEqual([]);
    expect(deriveChanges([ms], { total: 24 }, { total: null })).toEqual([]);
  });

  it('lists a metric that appears for the first time, neutrally', () => {
    expect(deriveChanges([ms], { total: null }, { total: 24 })).toEqual([
      { id: 'total', label: 'Total', from: '—', to: '24 ms', direction: 'up', tone: 'neutral' },
    ]);
  });
});

describe('curriculum helpers', () => {
  it('finds a lesson’s module, neighbours and the first authored lesson', () => {
    expect(allLessons).toHaveLength(40);
    const p = lessonPlace('request-journey')!;
    expect(p.module.id).toBe('foundations');
    expect(p.prev).toBeNull();
    expect(p.next?.id).toBe('latency-throughput');
    expect(lessonPlace('nope')).toBeNull();
    expect(authoredLessonIds.has('request-journey')).toBe(true);
    expect(FIRST_LESSON_ID).toBe('request-journey');
  });

  it('loads and resolves a lesson, and returns null for unauthored ones', async () => {
    const l = await loadLesson('request-journey');
    expect(l?.steps).toHaveLength(10);
    expect(l?.steps[9]?.scene.panels?.[0]?.id).toBe('budget');
    expect(await loadLesson('caching')).toBeNull();
  });
});
