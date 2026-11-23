import { describe, expect, it } from 'vitest';
import { DEATH_MS, FlowEngine, roundTrip, type EngineEnv } from './flows';
import type { Flow, SceneEdge } from './types';

const edges: SceneEdge[] = [
  { id: 'u-lb', from: 'users', to: 'lb' },
  { id: 'lb-a', from: 'lb', to: 'a' },
  { id: 'lb-b', from: 'lb', to: 'b' },
  { id: 'lb-c', from: 'lb', to: 'c' },
  { id: 'a-db', from: 'a', to: 'db' },
  { id: 'b-db', from: 'b', to: 'db' },
  { id: 'c-db', from: 'c', to: 'db' },
];

/** Every edge is 100 units; at speed 100 a hop takes exactly 1 s. */
const env = (extra: Partial<EngineEnv> = {}): EngineEnv => ({ edgeLength: () => 100, ...extra });

function run(engine: FlowEngine, ms: number, e: EngineEnv, tick = 50) {
  for (let t = 0; t < ms; t += tick) engine.step(tick, e);
}

describe('FlowEngine spawning', () => {
  it('spawns at the flow rate', () => {
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 4, speed: 10 };
    const eng = new FlowEngine([flow], edges);
    run(eng, 1000, env());
    // first packet leaves immediately, then 4 per second
    expect(eng.packets.length).toBeGreaterThanOrEqual(4);
    expect(eng.packets.length).toBeLessThanOrEqual(5);
  });

  it('density scales the rate (reduced motion = 0.5)', () => {
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 4, speed: 1 };
    const full = new FlowEngine([flow], edges);
    const half = new FlowEngine([flow], edges, { density: 0.5 });
    run(full, 2000, env(), 125); // 125 ms ticks: per-tick amounts are exact in binary
    run(half, 2000, env(), 125);
    // full ≈ 1 + 8, half ≈ 1 + 4
    expect(Math.abs(full.packets.length - 1 - 2 * (half.packets.length - 1))).toBeLessThanOrEqual(
      1,
    );
  });

  it('a new flow sends its first packet immediately', () => {
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 0.2, speed: 1 };
    const eng = new FlowEngine([flow], edges);
    eng.step(16, env());
    expect(eng.packets).toHaveLength(1);
  });

  it('never exceeds the packet cap', () => {
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 1000, speed: 1 };
    const eng = new FlowEngine([flow], edges, { maxPackets: 300 });
    run(eng, 2000, env());
    expect(eng.packets.length).toBe(300);
  });
});

describe('FlowEngine movement', () => {
  it('travels hops in order and reverses on the way back', () => {
    const flow = roundTrip('rt', ['users', 'lb', 'a'], 1, { speed: 100 });
    const eng = new FlowEngine([flow], edges);
    eng.step(1000, env()); // spawns one packet at t=0 then advances it a full hop... (spawn happens first)
    const p = eng.packets[0]!;
    expect(p.edgeId).toBe('lb-a');
    expect(p.kind).toBe('request');
    run(eng, 1000, env());
    const q = eng.packets.find((x) => x.id === p.id)!;
    expect(q.edgeId).toBe('lb-a');
    expect(q.reverse).toBe(true); // a → lb travels lb-a backwards
    expect(q.kind).toBe('response');
  });

  it('removes packets after the last hop and reports arrivals', () => {
    const arrivals: string[] = [];
    const flow: Flow = {
      id: 'f',
      hops: ['users>lb', 'lb>a'],
      packet: 'request',
      rate: 1,
      speed: 100,
    };
    const eng = new FlowEngine([flow], edges);
    eng.step(1, env({ onArrive: (n) => arrivals.push(n) }));
    eng.setScene([{ ...flow, rate: 0 }], edges); // stop spawning more
    run(eng, 2100, env({ onArrive: (n) => arrivals.push(n) }));
    expect(arrivals).toEqual(['lb', 'a']);
    expect(eng.packets).toHaveLength(0);
  });

  it('dwells at intermediate nodes', () => {
    const flow: Flow = {
      id: 'f',
      hops: ['users>lb', 'lb>a'],
      packet: 'request',
      rate: 1,
      speed: 100,
      dwellMs: 500,
    };
    const eng = new FlowEngine([flow], edges);
    eng.step(1, env());
    eng.setScene([{ ...flow, rate: 0 }], edges);
    run(eng, 1100, env());
    expect(eng.packets[0]!.phase).toBe('dwell');
    run(eng, 500, env());
    expect(eng.packets[0]!.phase).toBe('moving');
    expect(eng.packets[0]!.edgeId).toBe('lb-a');
  });

  it('packets stop at a cut edge and fade out as errors', () => {
    const cutEdges = edges.map((e) => (e.id === 'u-lb' ? { ...e, status: 'cut' as const } : e));
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 1, speed: 100 };
    const eng = new FlowEngine([flow], cutEdges);
    eng.step(1, env());
    eng.setScene([{ ...flow, rate: 0 }], cutEdges);
    run(eng, 600, env());
    const p = eng.packets[0]!;
    expect(p).toMatchObject({ phase: 'dying', kind: 'error', t: 0.5 });
    run(eng, DEATH_MS + 50, env());
    expect(eng.packets).toHaveLength(0);
  });

  it('packets heading to a down node fail just short of it', () => {
    const flow: Flow = { id: 'f', hops: ['lb>a'], packet: 'request', rate: 1, speed: 100 };
    const eng = new FlowEngine([flow], edges);
    const e = env({ isNodeDown: (n) => n === 'a' });
    eng.step(1, e);
    eng.setScene([{ ...flow, rate: 0 }], edges);
    run(eng, 1000, e);
    expect(eng.packets[0]).toMatchObject({ phase: 'dying', t: 0.85 });
  });
});

describe('group hops', () => {
  const groupFlow = (algo: 'roundRobin' | 'hash' | 'leastConn' | 'random'): Flow => ({
    id: `g-${algo}`,
    hops: [{ from: 'lb', to: ['a', 'b', 'c'], algo }, '$>db'],
    packet: 'request',
    rate: 10,
    speed: 1,
  });

  it('round robin cycles through targets', () => {
    const eng = new FlowEngine([groupFlow('roundRobin')], edges);
    run(eng, 600, env(), 100);
    expect(eng.packets.map((p) => p.toNode).slice(0, 6)).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('hash routing is stable per client key', () => {
    const eng = new FlowEngine([groupFlow('hash')], edges);
    run(eng, 1200, env(), 100);
    const byKey = new Map<number, Set<string>>();
    for (const p of eng.packets) byKey.set(p.key, (byKey.get(p.key) ?? new Set()).add(p.toNode));
    for (const targets of byKey.values()) expect(targets.size).toBe(1);
  });

  it('least connections skips down targets and balances load', () => {
    const eng = new FlowEngine([groupFlow('leastConn')], edges);
    run(eng, 600, env({ isNodeDown: (n) => n === 'b' }), 100);
    const counts = { a: 0, b: 0, c: 0 } as Record<string, number>;
    for (const p of eng.packets) counts[p.toNode]!++;
    expect(counts.b).toBe(0);
    expect(Math.abs(counts.a! - counts.c!)).toBeLessThanOrEqual(1);
  });

  it('"$" continues from the picked node', () => {
    const eng = new FlowEngine([{ ...groupFlow('roundRobin'), speed: 100, rate: 1 }], edges);
    eng.step(1, env());
    eng.setScene([{ ...groupFlow('roundRobin'), speed: 100, rate: 0 }], edges);
    run(eng, 1050, env());
    const p = eng.packets[0]!;
    expect(p.fromNode).toBe('a');
    expect(p.edgeId).toBe('a-db');
  });

  it('is deterministic for a given seed', () => {
    const a = new FlowEngine([groupFlow('random')], edges, { seed: 7 });
    const b = new FlowEngine([groupFlow('random')], edges, { seed: 7 });
    run(a, 1000, env(), 100);
    run(b, 1000, env(), 100);
    expect(a.packets.map((p) => p.toNode)).toEqual(b.packets.map((p) => p.toNode));
  });
});

describe('scene changes', () => {
  it('keeps packets on edges that still exist and drops the rest', () => {
    const flow: Flow = { id: 'f', hops: ['users>lb'], packet: 'request', rate: 2, speed: 1 };
    const eng = new FlowEngine([flow], edges);
    run(eng, 1000, env());
    const n = eng.packets.length;
    expect(n).toBeGreaterThanOrEqual(2);
    eng.setScene([flow], edges); // same edges → packets survive
    expect(eng.packets.length).toBe(n);
    eng.setScene(
      [flow],
      edges.filter((e) => e.id !== 'u-lb'),
    );
    expect(eng.packets.length).toBe(0);
  });
});
