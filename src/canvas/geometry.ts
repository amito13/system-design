import type { EdgeStyle } from './types';

/**
 * Edge geometry (PRD §6.4). Edges and packets share the SAME polyline, so a packet is always
 * exactly on its line — even while a block is being dragged and the route is changing.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Axis-aligned rectangle, top-left origin, world units. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = 'n' | 'e' | 's' | 'w';
export interface Port extends Pt {
  side: Side;
}

export interface PathGeom {
  pts: Pt[];
  /** Cumulative length at each point (cum[0] = 0). */
  cum: number[];
  length: number;
  /** SVG path data. */
  d: string;
  mid: Pt;
}

export const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function portOf(r: Rect, side: Side): Port {
  const c = center(r);
  switch (side) {
    case 'e':
      return { x: r.x + r.w, y: c.y, side };
    case 'w':
      return { x: r.x, y: c.y, side };
    case 'n':
      return { x: c.x, y: r.y, side };
    case 's':
      return { x: c.x, y: r.y + r.h, side };
  }
}

/** Pick the two closest facing ports (recomputed on every move). */
export function choosePorts(a: Rect, b: Rect): { from: Port; to: Port } {
  const ca = center(a);
  const cb = center(b);
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  // Compare the gaps between the boxes rather than raw center distance, so wide blocks that sit
  // side by side connect horizontally even when they are slightly offset vertically.
  const gapX = Math.abs(dx) - (a.w + b.w) / 2;
  const gapY = Math.abs(dy) - (a.h + b.h) / 2;
  if (gapX >= gapY) {
    return dx >= 0
      ? { from: portOf(a, 'e'), to: portOf(b, 'w') }
      : { from: portOf(a, 'w'), to: portOf(b, 'e') };
  }
  return dy >= 0
    ? { from: portOf(a, 's'), to: portOf(b, 'n') }
    : { from: portOf(a, 'n'), to: portOf(b, 's') };
}

const dist = (p: Pt, q: Pt) => Math.hypot(q.x - p.x, q.y - p.y);

function roundCorners(pts: Pt[], radius: number): Pt[] {
  if (pts.length < 3 || radius <= 0) return pts;
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1]!;
    const c = pts[i]!;
    const n = pts[i + 1]!;
    const rr = Math.min(radius, dist(p, c) / 2, dist(c, n) / 2);
    if (rr < 0.5) {
      out.push(c);
      continue;
    }
    const lp = dist(p, c);
    const ln = dist(c, n);
    const a = { x: c.x + ((p.x - c.x) / lp) * rr, y: c.y + ((p.y - c.y) / lp) * rr };
    const b = { x: c.x + ((n.x - c.x) / ln) * rr, y: c.y + ((n.y - c.y) / ln) * rr };
    // quadratic Bézier a → (c) → b, sampled
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      });
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

const NORMALS: Record<Side, Pt> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  e: { x: 1, y: 0 },
  w: { x: -1, y: 0 },
};

/** Route an edge between two node boxes as a polyline. */
export function routeEdge(
  a: Rect,
  b: Rect,
  style: EdgeStyle = 'orthogonal',
  cornerRadius = 12,
): Pt[] {
  const { from, to } = choosePorts(a, b);
  if (style === 'straight') return [from, to];

  if (style === 'curved') {
    const k = Math.max(40, dist(from, to) * 0.4);
    const c1 = { x: from.x + NORMALS[from.side].x * k, y: from.y + NORMALS[from.side].y * k };
    const c2 = { x: to.x + NORMALS[to.side].x * k, y: to.y + NORMALS[to.side].y * k };
    const out: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const u = 1 - t;
      out.push({
        x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
        y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
      });
    }
    return out;
  }

  // orthogonal (elbow) route
  const horizontal = from.side === 'e' || from.side === 'w';
  if (horizontal) {
    if (Math.abs(from.y - to.y) < 1) return [from, to];
    const midX = (from.x + to.x) / 2;
    return roundCorners([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to], cornerRadius);
  }
  if (Math.abs(from.x - to.x) < 1) return [from, to];
  const midY = (from.y + to.y) / 2;
  return roundCorners([from, { x: from.x, y: midY }, { x: to.x, y: midY }, to], cornerRadius);
}

export function buildPath(pts: Pt[]): PathGeom {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  const length = cum[cum.length - 1] ?? 0;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const geom: PathGeom = { pts, cum, length, d, mid: pts[0] ?? { x: 0, y: 0 } };
  geom.mid = pointAt(geom, 0.5);
  return geom;
}

/** Point at ratio t (0..1) along the path, by arc length. */
export function pointAt(g: PathGeom, t: number): Pt {
  const { pts, cum, length } = g;
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1 || length === 0) return pts[0]!;
  const target = Math.min(Math.max(t, 0), 1) * length;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const m = (lo + hi) >> 1;
    if (cum[m]! <= target) lo = m;
    else hi = m;
  }
  const seg = cum[hi]! - cum[lo]!;
  const f = seg === 0 ? 0 : (target - cum[lo]!) / seg;
  const p = pts[lo]!;
  const q = pts[hi]!;
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
}

export function edgeGeometry(a: Rect, b: Rect, style: EdgeStyle = 'orthogonal'): PathGeom {
  return buildPath(routeEdge(a, b, style));
}
