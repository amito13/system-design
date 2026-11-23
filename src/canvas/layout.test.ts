import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '../lib/storage';
import { MoveHistory } from './history';
import {
  alignmentGuides,
  findFreeSpot,
  layoutFor,
  loadOverrides,
  overlaps,
  rectAt,
  saveOverrides,
} from './layout';
import type { Scene } from './types';

const scenes: Scene[] = [
  {
    nodes: [
      { id: 'users', kind: 'users', label: 'users', pos: { x: 0, y: 0 } },
      { id: 'lb', kind: 'lb', label: 'LB', pos: { x: 200, y: 0 } },
    ],
    edges: [{ id: 'e1', from: 'users', to: 'lb' }],
  },
  {
    nodes: [
      { id: 'users', kind: 'users', label: 'users', pos: { x: 0, y: 0 } },
      { id: 'lb', kind: 'lb', label: 'LB', pos: { x: 200, y: 0 } },
      { id: 'srv', kind: 'server', label: 'srv', pos: { x: 400, y: 0 } },
    ],
    edges: [
      { id: 'e1', from: 'users', to: 'lb' },
      { id: 'e2', from: 'lb', to: 'srv' },
    ],
  },
  {
    nodes: [
      { id: 'users', kind: 'users', label: 'users', pos: { x: 0, y: 0 } },
      { id: 'lb', kind: 'lb', label: 'LB', pos: { x: 200, y: 0 } },
      { id: 'srv', kind: 'server', label: 'srv', pos: { x: 400, y: 0 } },
      { id: 'db', kind: 'sql', label: 'db', pos: { x: 600, y: 0 } },
    ],
    edges: [
      { id: 'e1', from: 'users', to: 'lb' },
      { id: 'e2', from: 'lb', to: 'srv' },
      { id: 'e3', from: 'srv', to: 'db' },
    ],
  },
];

describe('layoutFor', () => {
  it('uses authored positions with no overrides', () => {
    expect(layoutFor(scenes, 1, {}).get('srv')).toEqual({ x: 400, y: 0 });
  });

  it('overrides win in every step', () => {
    const ov = { lb: { x: 220, y: 300 } };
    expect(layoutFor(scenes, 0, ov).get('lb')).toEqual({ x: 220, y: 300 });
    expect(layoutFor(scenes, 2, ov).get('lb')).toEqual({ x: 220, y: 300 });
  });

  it('a node introduced later follows its moved neighbours (PRD §6.3)', () => {
    const ov = { lb: { x: 220, y: 300 } }; // lb moved by (+20, +300)
    expect(layoutFor(scenes, 1, ov).get('srv')).toEqual({ x: 420, y: 300 });
    // …and keeps that offset in later steps, so it never jumps back
    expect(layoutFor(scenes, 2, ov).get('srv')).toEqual({ x: 420, y: 300 });
  });

  it('measures a neighbour’s move from where the user first saw it, even if the lesson later re-authors it', () => {
    const moving: Scene[] = [
      { nodes: [{ id: 'a', kind: 'server', label: 'a', pos: { x: 0, y: 0 } }] },
      {
        nodes: [
          { id: 'a', kind: 'server', label: 'a', pos: { x: 500, y: 0 } }, // lesson moves a
          { id: 'b', kind: 'server', label: 'b', pos: { x: 300, y: 0 } },
        ],
        edges: [{ id: 'ab', from: 'a', to: 'b' }],
      },
    ];
    // user dragged a by (+0, +200) from its first position
    expect(layoutFor(moving, 1, { a: { x: 0, y: 200 } }).get('b')).toEqual({ x: 300, y: 200 });
  });

  it('nudges a shifted block off any block it would land on', () => {
    const crowded: Scene[] = [
      {
        nodes: [
          { id: 'a', kind: 'server', label: 'a', pos: { x: 0, y: 0 } },
          { id: 'c', kind: 'server', label: 'c', pos: { x: 100, y: 100 } },
        ],
      },
      {
        nodes: [
          { id: 'a', kind: 'server', label: 'a', pos: { x: 0, y: 0 } },
          { id: 'c', kind: 'server', label: 'c', pos: { x: 100, y: 100 } },
          { id: 'b', kind: 'server', label: 'b', pos: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'ab', from: 'a', to: 'b' }],
      },
    ];
    // a moved down by 100 → b would land exactly on c
    const pos = layoutFor(crowded, 1, { a: { x: 0, y: 100 } });
    const b = rectAt({ kind: 'server' }, pos.get('b')!);
    const c = rectAt({ kind: 'server' }, pos.get('c')!);
    expect(overlaps(b, c, 8)).toBe(false);
  });

  it('nodes present from step 1 do not follow neighbours', () => {
    const ov = { lb: { x: 220, y: 300 } };
    expect(layoutFor(scenes, 2, ov).get('users')).toEqual({ x: 0, y: 0 });
  });
});

describe('findFreeSpot / overlaps', () => {
  const a = { x: 0, y: 0, w: 80, h: 60 };
  it('detects overlap with padding', () => {
    expect(overlaps(a, { x: 85, y: 0, w: 80, h: 60 })).toBe(false);
    expect(overlaps(a, { x: 85, y: 0, w: 80, h: 60 }, 8)).toBe(true);
  });

  it('keeps a free position and nudges an overlapping one to the nearest free grid spot', () => {
    expect(findFreeSpot(a, [{ x: 300, y: 300, w: 80, h: 60 }])).toEqual({ x: 40, y: 30 });
    const spot = findFreeSpot(a, [{ x: 10, y: 10, w: 80, h: 60 }]);
    const moved = { x: spot.x - 40, y: spot.y - 30, w: 80, h: 60 };
    expect(overlaps(moved, { x: 10, y: 10, w: 80, h: 60 }, 8)).toBe(false);
    expect(Math.hypot(spot.x - 40, spot.y - 30)).toBeLessThan(200);
  });
});

describe('alignmentGuides', () => {
  it('finds the nearest aligned centre within tolerance', () => {
    expect(
      alignmentGuides({ x: 103, y: 50 }, [
        { x: 100, y: 400 },
        { x: 500, y: 52 },
      ]),
    ).toEqual({
      x: 100,
      y: 52,
    });
    expect(alignmentGuides({ x: 0, y: 0 }, [{ x: 50, y: 50 }])).toEqual({ x: null, y: null });
  });
});

describe('overrides persistence', () => {
  beforeEach(() => storage.clearAll());
  it('round-trips and drops garbage', () => {
    saveOverrides('demo', { lb: { x: 1, y: 2 } });
    expect(loadOverrides('demo')).toEqual({ lb: { x: 1, y: 2 } });
    storage.set('layout:bad', { lb: { x: 'no', y: 2 }, ok: { x: 3, y: 4 } });
    expect(loadOverrides('bad')).toEqual({ ok: { x: 3, y: 4 } });
    saveOverrides('demo', {});
    expect(storage.keys()).not.toContain('layout:demo');
  });
});

describe('MoveHistory', () => {
  it('undoes and redoes at least 50 moves (AC-C4)', () => {
    const h = new MoveHistory();
    for (let i = 0; i < 60; i++)
      h.push([{ id: 'n', from: { x: i, y: 0 }, to: { x: i + 1, y: 0 } }]);
    let last = null;
    for (let i = 0; i < 60; i++) last = h.undo();
    expect(last?.get('n')).toEqual({ x: 0, y: 0 });
    expect(h.undo()).toBeNull();
    expect(h.redo()?.get('n')).toEqual({ x: 1, y: 0 });
  });

  it('coalesces rapid keyboard nudges and ignores no-op moves', () => {
    const h = new MoveHistory();
    h.push([{ id: 'n', from: { x: 0, y: 0 }, to: { x: 20, y: 0 } }], 'key', 1000);
    h.push([{ id: 'n', from: { x: 20, y: 0 }, to: { x: 40, y: 0 } }], 'key', 1200);
    h.push([{ id: 'n', from: { x: 40, y: 0 }, to: { x: 40, y: 0 } }], 'key', 1300);
    expect(h.undo()?.get('n')).toEqual({ x: 0, y: 0 });
    expect(h.canUndo).toBe(false);
  });

  it('a new move clears the redo stack', () => {
    const h = new MoveHistory();
    h.push([{ id: 'n', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }]);
    h.undo();
    h.push([{ id: 'n', from: { x: 0, y: 0 }, to: { x: 5, y: 0 } }]);
    expect(h.canRedo).toBe(false);
  });
});
