import { describe, expect, it } from 'vitest';
import curriculum from '../../content/curriculum.json';
import glossary from '../../content/glossary.json';
import { resolveLesson } from './resolve';
import { parseRich, plainText, termsIn } from './richtext';
import type { Curriculum, Glossary, RawLesson } from './types';
import { validateCurriculum, validateLesson } from './validate';

const lessonFiles = import.meta.glob('../../content/lessons/*.json', {
  eager: true,
  import: 'default',
});

describe('content files (AC-L1 — runs in CI)', () => {
  it('curriculum is valid and lists 40 lessons in 9 modules', () => {
    const c = curriculum as Curriculum;
    expect(validateCurriculum(c)).toEqual([]);
    expect(c.modules).toHaveLength(9);
    expect(c.modules.flatMap((m) => m.lessons)).toHaveLength(40);
  });

  it('there is at least one lesson file', () => {
    expect(Object.keys(lessonFiles).length).toBeGreaterThan(0);
  });

  for (const [path, raw] of Object.entries(lessonFiles)) {
    const fileName = path.split('/').pop()!;
    it(`${fileName} passes schema + semantic validation`, () => {
      const { problems } = validateLesson(raw, {
        fileName,
        curriculum: curriculum as Curriculum,
        glossary: glossary as Glossary,
      });
      expect(problems).toEqual([]);
    });
  }
});

describe('lesson 1 numbers add up', () => {
  const raw = lessonFiles['../../content/lessons/request-journey.json'] as RawLesson;
  const lesson = resolveLesson(raw);
  it('total = sum of the parts at every step that has all parts', () => {
    for (const s of lesson.steps) {
      const { dns, conn, server, dl, total } = s.scene.hud as Record<string, number | null>;
      const parts = [dns, conn, server, dl].filter((v): v is number => typeof v === 'number');
      if (total == null) continue;
      expect(total, `step ${s.id}`).toBe(parts.reduce((a, b) => a + b, 0));
    }
  });
});

describe('resolveLesson', () => {
  const base: RawLesson = {
    id: 'x',
    module: 'foundations',
    title: 'X',
    subtitle: 'x',
    level: 'beginner',
    minutes: 5,
    objectives: [],
    hud: [{ id: 'a', label: 'A', better: 'lower' }],
    steps: [
      {
        id: 's1',
        type: 'setup',
        title: 'one',
        body: 'b',
        scene: {
          nodes: [
            { id: 'u', kind: 'users', label: 'u', pos: { x: 0, y: 0 } },
            { id: 'w', kind: 'server', label: 'w', pos: { x: 300, y: 0 } },
          ],
          edges: [{ id: 'uw', from: 'u', to: 'w' }],
          flows: [{ id: 'f', hops: ['u>w'], packet: 'request', rate: 1 }],
          callouts: [{ anchor: 'w', offset: { x: 0, y: -50 }, text: 'hi' }],
          hud: { a: 1 },
          focus: ['u'],
        },
      },
      {
        id: 's2',
        type: 'technique',
        title: 'two',
        body: 'b',
        extends: 's1',
        scene: { nodes: [{ id: 'w', state: 'busy', load: 0.5 }], hud: { a: 2 } },
      },
      {
        id: 's3',
        type: 'recap',
        title: 'three',
        body: 'b',
        extends: 's2',
        scene: { remove: ['w'], callouts: [] },
      },
    ],
  };

  it('inherits, merges partial nodes and merges the HUD', () => {
    const l = resolveLesson(base);
    const s2 = l.steps[1]!.scene;
    expect(s2.nodes.find((n) => n.id === 'w')).toMatchObject({
      kind: 'server',
      label: 'w',
      state: 'busy',
      load: 0.5,
    });
    expect(s2.hud).toEqual({ a: 2 });
    expect(s2.callouts).toHaveLength(1);
    expect(s2.focus).toEqual(['u']);
    expect(l.steps[0]!.scene.nodes.find((n) => n.id === 'w')?.state).toBeUndefined(); // parent untouched
  });

  it('removing a node also removes its edges and anchored callouts', () => {
    const s3 = resolveLesson(base).steps[2]!.scene;
    expect(s3.nodes.map((n) => n.id)).toEqual(['u']);
    expect(s3.edges).toEqual([]);
    expect(s3.callouts).toEqual([]);
  });

  it('rejects unknown or forward extends', () => {
    const bad = structuredClone(base);
    bad.steps[1]!.extends = 's3';
    expect(() => resolveLesson(bad)).toThrow(/extends "s3"/);
  });
});

describe('validateLesson catches broken content', () => {
  const good = lessonFiles['../../content/lessons/request-journey.json'] as RawLesson;
  const broken = (mutate: (l: RawLesson) => void) => {
    const l = structuredClone(good);
    mutate(l);
    return validateLesson(l, {
      curriculum: curriculum as Curriculum,
      glossary: glossary as Glossary,
    }).problems;
  };

  it('schema errors', () => {
    expect(broken((l) => ((l as unknown as { level: string }).level = 'expert')).join()).toMatch(
      /level/,
    );
    expect(broken((l) => (l.steps = l.steps.slice(0, 3))).join()).toMatch(/steps/);
  });

  it('edges and hops must point at real nodes / edges', () => {
    expect(
      broken((l) =>
        l.steps[1]!.scene.flows!.push({
          id: 'bad',
          hops: ['you>ghost'],
          packet: 'request',
          rate: 1,
        }),
      ).join(),
    ).toMatch(/unknown node "ghost"/);
    expect(
      broken((l) =>
        l.steps[2]!.scene.flows!.push({
          id: 'bad2',
          hops: ['resolver>web'],
          packet: 'request',
          rate: 1,
        }),
      ).join(),
    ).toMatch(/has no edge/);
  });

  it('glossary, recap and objectives', () => {
    expect(broken((l) => (l.steps[0]!.body += ' [[nope]]')).join()).toMatch(/glossary term "nope"/);
    expect(broken((l) => (l.steps[l.steps.length - 1]!.type = 'insight')).join()).toMatch(
      /last step must be a recap/,
    );
    expect(broken((l) => (l.objectives[0]!.coveredAt = 'zzz')).join()).toMatch(/coveredAt/);
  });

  it('overlapping authored blocks', () => {
    expect(broken((l) => (l.steps[1]!.scene.nodes![0]!.pos = { x: 10, y: 200 })).join()).toMatch(
      /overlap/,
    );
  });
});

describe('rich text', () => {
  it('parses bold, code, terms and paragraphs', () => {
    const p = parseRich('Ask **the** [[dns]] for `a.b`.\n\nSecond [[rtt|round trip]].');
    expect(p).toHaveLength(2);
    expect(p[0]).toEqual([
      { t: 'text', v: 'Ask ' },
      { t: 'bold', v: 'the' },
      { t: 'text', v: ' ' },
      { t: 'term', id: 'dns', v: 'dns' },
      { t: 'text', v: ' for ' },
      { t: 'code', v: 'a.b' },
      { t: 'text', v: '.' },
    ]);
    expect(p[1]).toContainEqual({ t: 'term', id: 'rtt', v: 'round trip' });
  });

  it('never produces HTML and has a plain-text form', () => {
    expect(plainText('<b>x</b> **y**')).toBe('<b>x</b> y');
    expect(termsIn('a [[tcp]] b [[tls|TLS]]')).toEqual(['tcp', 'tls']);
  });
});
