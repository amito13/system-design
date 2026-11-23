import { describe, expect, it } from 'vitest';
import { buildPath, choosePorts, edgeGeometry, pointAt, routeEdge, type Rect } from './geometry';

const box = (cx: number, cy: number, w = 80, h = 60): Rect => ({
  x: cx - w / 2,
  y: cy - h / 2,
  w,
  h,
});

describe('choosePorts', () => {
  it('connects side by side blocks horizontally, facing each other', () => {
    const { from, to } = choosePorts(box(0, 0), box(300, 40));
    expect(from).toMatchObject({ side: 'e', x: 40, y: 0 });
    expect(to).toMatchObject({ side: 'w', x: 260, y: 40 });
  });

  it('flips direction when the target is on the left', () => {
    const { from, to } = choosePorts(box(300, 0), box(0, 0));
    expect(from.side).toBe('w');
    expect(to.side).toBe('e');
  });

  it('connects stacked blocks vertically', () => {
    const { from, to } = choosePorts(box(0, 0), box(30, 300));
    expect(from).toMatchObject({ side: 's', x: 0, y: 30 });
    expect(to).toMatchObject({ side: 'n', x: 30, y: 270 });
  });

  it('re-chooses ports when a block moves (live re-routing)', () => {
    expect(choosePorts(box(0, 0), box(300, 0)).from.side).toBe('e');
    expect(choosePorts(box(0, 0), box(0, 300)).from.side).toBe('s');
  });
});

describe('routeEdge', () => {
  it('orthogonal route starts and ends on the ports with an elbow in between', () => {
    const pts = routeEdge(box(0, 0), box(300, 100), 'orthogonal');
    expect(pts[0]).toEqual({ x: 40, y: 0, side: 'e' });
    expect(pts[pts.length - 1]).toEqual({ x: 260, y: 100, side: 'w' });
    expect(pts.length).toBeGreaterThan(4); // rounded corners add samples
    // every point stays within the bounding box of the two ports
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(40 - 0.001);
      expect(p.x).toBeLessThanOrEqual(260 + 0.001);
    }
  });

  it('collapses to a straight segment when ports are aligned', () => {
    expect(routeEdge(box(0, 0), box(300, 0), 'orthogonal')).toHaveLength(2);
  });

  it('straight and curved styles', () => {
    expect(routeEdge(box(0, 0), box(300, 100), 'straight')).toHaveLength(2);
    expect(routeEdge(box(0, 0), box(300, 100), 'curved')).toHaveLength(25);
  });
});

describe('pointAt', () => {
  it('walks by arc length', () => {
    const g = buildPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(g.length).toBe(200);
    expect(pointAt(g, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAt(g, 0.25)).toEqual({ x: 50, y: 0 });
    expect(pointAt(g, 0.5)).toEqual({ x: 100, y: 0 });
    expect(pointAt(g, 0.75)).toEqual({ x: 100, y: 50 });
    expect(pointAt(g, 1)).toEqual({ x: 100, y: 100 });
    expect(pointAt(g, 7)).toEqual({ x: 100, y: 100 });
    expect(g.mid).toEqual({ x: 100, y: 0 });
  });

  it('a packet at the same ratio follows the edge when a node moves (AC-C1)', () => {
    const before = edgeGeometry(box(0, 0), box(300, 0));
    const after = edgeGeometry(box(0, 0), box(300, 200));
    const p0 = pointAt(before, 0.5);
    const p1 = pointAt(after, 0.5);
    // still on the new path: the point is one of the path's sampled positions (within float noise)
    const onPath = after.pts.some((_, i) => {
      if (i === 0) return false;
      const a = after.pts[i - 1]!;
      const b = after.pts[i]!;
      const cross = (b.x - a.x) * (p1.y - a.y) - (b.y - a.y) * (p1.x - a.x);
      const within =
        p1.x >= Math.min(a.x, b.x) - 0.01 &&
        p1.x <= Math.max(a.x, b.x) + 0.01 &&
        p1.y >= Math.min(a.y, b.y) - 0.01 &&
        p1.y <= Math.max(a.y, b.y) + 0.01;
      return Math.abs(cross) < 0.5 && within;
    });
    expect(onPath).toBe(true);
    expect(p1).not.toEqual(p0);
  });

  it('handles degenerate paths', () => {
    expect(pointAt(buildPath([]), 0.5)).toEqual({ x: 0, y: 0 });
    expect(pointAt(buildPath([{ x: 3, y: 4 }]), 0.5)).toEqual({ x: 3, y: 4 });
  });
});
