import type { Flow, GroupAlgo, Hop, PacketKind, SceneEdge } from './types';

/**
 * Packet simulation (PRD §6.5). Pure and deterministic (seeded RNG) so it can be unit tested;
 * the PacketLayer only reads `packets` and turns (edgeId, reverse, t) into screen positions.
 */

export type PacketPhase = 'moving' | 'dwell' | 'dying';

export interface Packet {
  id: number;
  flowId: string;
  hop: number;
  edgeId: string;
  /** true when travelling the edge from its `to` end to its `from` end. */
  reverse: boolean;
  /** Progress along the current edge in the travel direction, 0..1. */
  t: number;
  kind: PacketKind;
  phase: PacketPhase;
  /** ms left in the current dwell / death fade. */
  timer: number;
  fromNode: string;
  toNode: string;
  /** Node chosen by the most recent group hop ("$" in later hops). */
  picked: string | null;
  /** Stable "client" key used by hash routing. */
  key: number;
}

export interface EngineEnv {
  /** Current length of an edge in world units (changes as blocks are dragged). */
  edgeLength: (edgeId: string) => number;
  isNodeDown?: (nodeId: string) => boolean;
  /** Called when a packet reaches a node (drives the load-ring pulse). */
  onArrive?: (nodeId: string, kind: PacketKind) => void;
}

export interface EngineOptions {
  maxPackets?: number;
  /** Multiplies every flow's spawn rate (reduced motion uses 0.5). */
  density?: number;
  seed?: number;
  defaultSpeed?: number;
}

export const DEATH_MS = 600;
const CLIENT_KEYS = 6;

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashInt(n: number): number {
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export class FlowEngine {
  packets: Packet[] = [];
  private flows = new Map<string, Flow>();
  private edgeByPair = new Map<string, SceneEdge>();
  private edgeIds = new Set<string>();
  private cut = new Set<string>();
  private acc = new Map<string, number>();
  private rr = new Map<string, number>();
  private spawned = new Map<string, number>();
  private nextId = 1;
  private rand: () => number;
  private maxPackets: number;
  private density: number;
  private defaultSpeed: number;

  constructor(flows: Flow[], edges: SceneEdge[], opts: EngineOptions = {}) {
    this.maxPackets = opts.maxPackets ?? 300;
    this.density = opts.density ?? 1;
    this.defaultSpeed = opts.defaultSpeed ?? 220;
    this.rand = mulberry32(opts.seed ?? 1);
    this.setScene(flows, edges);
  }

  /** Swap in a new step's flows/edges. Packets on edges that still exist keep flying. */
  setScene(flows: Flow[], edges: SceneEdge[]): void {
    this.flows = new Map(flows.map((f) => [f.id, f]));
    this.edgeByPair = new Map();
    this.edgeIds = new Set(edges.map((e) => e.id));
    this.cut = new Set(edges.filter((e) => e.status === 'cut').map((e) => e.id));
    for (const e of edges) this.edgeByPair.set(`${e.from}>${e.to}`, e);
    this.packets = this.packets.filter(
      (p) => this.flows.has(p.flowId) && this.edgeIds.has(p.edgeId),
    );
    // A flow that just appeared sends its first packet immediately, so a step shows motion at once.
    for (const id of this.flows.keys()) if (!this.acc.has(id)) this.acc.set(id, 1);
    for (const id of [...this.acc.keys()]) if (!this.flows.has(id)) this.acc.delete(id);
  }

  setDensity(density: number): void {
    this.density = density;
  }

  clear(): void {
    this.packets = [];
    this.acc.clear();
  }

  step(dtMs: number, env: EngineEnv): void {
    if (dtMs <= 0) return;
    // 1. spawn
    for (const flow of this.flows.values()) {
      const a = (this.acc.get(flow.id) ?? 0) + (flow.rate * this.density * dtMs) / 1000;
      let acc = a;
      while (acc >= 1) {
        acc -= 1;
        if (this.packets.length >= this.maxPackets) continue; // skip, never queue
        this.spawn(flow, env);
      }
      this.acc.set(flow.id, acc);
    }

    // 2. advance
    const keep: Packet[] = [];
    for (const p of this.packets) {
      if (this.advance(p, dtMs, env)) keep.push(p);
    }
    this.packets = keep;
  }

  // ---------- internals ----------

  private kindFor(flow: Flow, hop: number): PacketKind {
    if (!Array.isArray(flow.packet)) return flow.packet;
    return flow.packet[Math.min(hop, flow.packet.length - 1)] ?? 'request';
  }

  private spawn(flow: Flow, env: EngineEnv): void {
    const n = this.spawned.get(flow.id) ?? 0;
    this.spawned.set(flow.id, n + 1);
    const p: Packet = {
      id: this.nextId++,
      flowId: flow.id,
      hop: -1,
      edgeId: '',
      reverse: false,
      t: 0,
      kind: this.kindFor(flow, 0),
      phase: 'moving',
      timer: 0,
      fromNode: '',
      toNode: '',
      picked: null,
      key: n % CLIENT_KEYS,
    };
    if (this.enterHop(p, flow, 0, env)) this.packets.push(p);
  }

  /** Resolve hop `index` for packet `p`. Returns false if the hop can't be travelled. */
  private enterHop(p: Packet, flow: Flow, index: number, env: EngineEnv): boolean {
    const hop: Hop | undefined = flow.hops[index];
    if (hop === undefined) return false;
    const sub = (id: string) => (id === '$' ? (p.picked ?? '') : id);
    let from: string;
    let to: string;
    if (typeof hop === 'string') {
      const [a = '', b = ''] = hop.split('>');
      from = sub(a.trim());
      to = sub(b.trim());
    } else {
      from = sub(hop.from);
      const target = this.pick(p, flow, index, hop.to, hop.algo, env);
      if (!target) return false;
      to = target;
      p.picked = target;
    }
    const fwd = this.edgeByPair.get(`${from}>${to}`);
    const back = fwd ? undefined : this.edgeByPair.get(`${to}>${from}`);
    const edge = fwd ?? back;
    if (!edge) return false;
    p.hop = index;
    p.edgeId = edge.id;
    p.reverse = !fwd;
    p.t = 0;
    p.phase = 'moving';
    p.fromNode = from;
    p.toNode = to;
    p.kind = this.kindFor(flow, index);
    return true;
  }

  private pick(
    p: Packet,
    flow: Flow,
    index: number,
    targets: string[],
    algo: GroupAlgo,
    env: EngineEnv,
  ): string | null {
    if (targets.length === 0) return null;
    switch (algo) {
      case 'roundRobin': {
        const k = `${flow.id}#${index}`;
        const i = this.rr.get(k) ?? 0;
        this.rr.set(k, i + 1);
        return targets[i % targets.length]!;
      }
      case 'random':
        return targets[Math.floor(this.rand() * targets.length)]!;
      case 'hash':
        return targets[hashInt(p.key) % targets.length]!;
      case 'leastConn': {
        const load = new Map(targets.map((t) => [t, 0]));
        for (const q of this.packets) {
          if (q === p) continue;
          for (const t of [q.toNode, q.picked]) {
            if (t && load.has(t)) load.set(t, load.get(t)! + 1);
          }
        }
        let best = targets[0]!;
        for (const t of targets) {
          if (env.isNodeDown?.(t)) continue;
          if (load.get(t)! < load.get(best)! || env.isNodeDown?.(best)) best = t;
        }
        return best;
      }
    }
  }

  /** Returns false when the packet should be removed. */
  private advance(p: Packet, dtMs: number, env: EngineEnv): boolean {
    const flow = this.flows.get(p.flowId);
    if (!flow) return false;

    if (p.phase === 'dying') {
      p.timer -= dtMs;
      return p.timer > 0;
    }

    if (p.phase === 'dwell') {
      p.timer -= dtMs;
      if (p.timer > 0) return true;
      return this.enterHop(p, flow, p.hop + 1, env);
    }

    const speed = flow.speed ?? this.defaultSpeed;
    const len = Math.max(1, env.edgeLength(p.edgeId));
    p.t += (speed * dtMs) / 1000 / len;

    // Cut edge: the packet stops at the break and fails.
    if (this.cut.has(p.edgeId) && p.t >= 0.5) {
      p.t = 0.5;
      return this.die(p);
    }
    // Down node: the packet stops just short of it and fails.
    if (env.isNodeDown?.(p.toNode) && p.t >= 0.85) {
      p.t = 0.85;
      return this.die(p);
    }
    if (p.t < 1) return true;

    p.t = 1;
    env.onArrive?.(p.toNode, p.kind);
    const isLast = p.hop >= flow.hops.length - 1;
    if (isLast) return false;
    if (flow.dwellMs && flow.dwellMs > 0) {
      p.phase = 'dwell';
      p.timer = flow.dwellMs;
      return true;
    }
    return this.enterHop(p, flow, p.hop + 1, env);
  }

  private die(p: Packet): boolean {
    p.phase = 'dying';
    p.kind = 'error';
    p.timer = DEATH_MS;
    return true;
  }
}

/** Authoring helper: a request along `path` and a response back the same way. */
export function roundTrip(
  id: string,
  path: string[],
  rate: number,
  extra: Partial<Flow> = {},
): Flow {
  const out: string[] = [];
  for (let i = 0; i < path.length - 1; i++) out.push(`${path[i]}>${path[i + 1]}`);
  const back: string[] = [];
  for (let i = path.length - 1; i > 0; i--) back.push(`${path[i]}>${path[i - 1]}`);
  return {
    id,
    hops: [...out, ...back],
    packet: [...out.map(() => 'request' as const), ...back.map(() => 'response' as const)],
    rate,
    ...extra,
  };
}
