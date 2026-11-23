import { storage } from '../lib/storage';
import { nodeBox, kindDef } from './catalog';
import type { Rect } from './geometry';
import type { LayoutOverrides, Scene, SceneNode, Vec } from './types';

/**
 * Layout rules (PRD §6.3):
 *  - a node the user moved uses its override in every step;
 *  - a node first introduced in a later step, with no override, keeps its authored position
 *    shifted by the average displacement of the moved nodes it connects to in that step, so it
 *    appears next to the cluster the user built (and stays there in later steps);
 *  - otherwise the authored position.
 */
export function layoutFor(
  scenes: Scene[],
  stepIndex: number,
  overrides: LayoutOverrides,
): Map<string, Vec> {
  const scene = scenes[stepIndex];
  const out = new Map<string, Vec>();
  if (!scene) return out;

  const firstSeen = new Map<string, number>();
  scenes.forEach((s, i) => s.nodes.forEach((n) => !firstSeen.has(n.id) && firstSeen.set(n.id, i)));

  // Where the user first saw a node: overrides are measured against that position.
  const firstAuthored = (id: string): Vec | null => {
    const i = firstSeen.get(id);
    return i === undefined ? null : (scenes[i]?.nodes.find((m) => m.id === id)?.pos ?? null);
  };
  const derived: SceneNode[] = [];

  for (const node of scene.nodes) {
    const ov = overrides[node.id];
    if (ov) {
      out.set(node.id, ov);
      continue;
    }
    const intro = firstSeen.get(node.id) ?? stepIndex;
    if (intro === 0) {
      out.set(node.id, node.pos);
      continue;
    }
    const introScene = scenes[intro]!;
    const neighbours = new Set<string>();
    for (const e of introScene.edges ?? []) {
      if (e.from === node.id) neighbours.add(e.to);
      if (e.to === node.id) neighbours.add(e.from);
    }
    let dx = 0;
    let dy = 0;
    let n = 0;
    for (const id of neighbours) {
      const moved = overrides[id];
      const authored = firstAuthored(id);
      if (moved && authored) {
        dx += moved.x - authored.x;
        dy += moved.y - authored.y;
        n++;
      }
    }
    if (n) {
      out.set(node.id, { x: node.pos.x + dx / n, y: node.pos.y + dy / n });
      derived.push(node);
    } else {
      out.set(node.id, node.pos);
    }
  }

  // A shifted block must not land on top of another one: nudge it to the nearest free spot.
  for (const node of derived) {
    const others = scene.nodes
      .filter((m) => m.id !== node.id)
      .map((m) => rectAt(m, out.get(m.id)!));
    out.set(node.id, findFreeSpot(rectAt(node, out.get(node.id)!), others, 20, 8, 400));
  }
  return out;
}

/** World-space hit box of a node centred at `pos`. */
export function rectAt(node: Pick<SceneNode, 'kind' | 'size'>, pos: Vec): Rect {
  const { w, h } = nodeBox(node.size ?? kindDef(node.kind).size, node.kind);
  return { x: pos.x - w / 2, y: pos.y - h / 2, w, h };
}

export function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
  );
}

/**
 * Nearest grid position (by distance) where `rect` no longer overlaps any of `others`.
 * Returns the original position when it's already free.
 */
export function findFreeSpot(rect: Rect, others: Rect[], grid = 20, pad = 8, maxRadius = 400): Vec {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const free = (x: number, y: number) =>
    !others.some((o) =>
      overlaps({ x: x - rect.w / 2, y: y - rect.h / 2, w: rect.w, h: rect.h }, o, pad),
    );
  if (free(cx, cy)) return { x: cx, y: cy };
  const candidates: { x: number; y: number; d: number }[] = [];
  const steps = Math.ceil(maxRadius / grid);
  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      if (i === 0 && j === 0) continue;
      const x = cx + i * grid;
      const y = cy + j * grid;
      candidates.push({ x, y, d: Math.hypot(i, j) });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const c of candidates) if (free(c.x, c.y)) return { x: c.x, y: c.y };
  return { x: cx, y: cy };
}

export interface Guides {
  /** World x of a vertical guide line (centres aligned horizontally), if any. */
  x: number | null;
  /** World y of a horizontal guide line, if any. */
  y: number | null;
}

/** Smart guides: does the dragged centre line up with another node's centre? */
export function alignmentGuides(center: Vec, others: Vec[], tolerance = 6): Guides {
  let x: number | null = null;
  let y: number | null = null;
  let bestX = tolerance + 1;
  let bestY = tolerance + 1;
  for (const o of others) {
    const ddx = Math.abs(o.x - center.x);
    const ddy = Math.abs(o.y - center.y);
    if (ddx <= tolerance && ddx < bestX) {
      bestX = ddx;
      x = o.x;
    }
    if (ddy <= tolerance && ddy < bestY) {
      bestY = ddy;
      y = o.y;
    }
  }
  return { x, y };
}

// ---------- persistence (sc:layout:<key>, sc:camera:<key>) ----------

export function loadOverrides(key: string): LayoutOverrides {
  const raw = storage.get<LayoutOverrides>(`layout:${key}`, {});
  const out: LayoutOverrides = {};
  for (const [id, v] of Object.entries(raw ?? {})) {
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) out[id] = { x: v.x, y: v.y };
  }
  return out;
}

export function saveOverrides(key: string, overrides: LayoutOverrides): void {
  if (Object.keys(overrides).length === 0) storage.remove(`layout:${key}`);
  else storage.set(`layout:${key}`, overrides);
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  /** false once the user has panned/zoomed by hand. */
  follow: boolean;
}

export function loadCamera(key: string): Camera | null {
  const c = storage.get<Camera | null>(`camera:${key}`, null);
  return c && [c.x, c.y, c.zoom].every(Number.isFinite) ? c : null;
}

export function saveCamera(key: string, camera: Camera): void {
  storage.set(`camera:${key}`, camera);
}
