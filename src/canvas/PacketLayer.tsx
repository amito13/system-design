import { useReactFlow, ViewportPortal } from '@xyflow/react';
import { useEffect, useRef, type RefObject } from 'react';
import { useCanvas } from './context';
import { internalRect } from './edges/DataEdge';
import { DEATH_MS, type EngineEnv, type FlowEngine } from './flows';
import { edgeGeometry, pointAt, type PathGeom } from './geometry';
import type { PacketKind, SceneEdge } from './types';

const POOL = 300;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Packet look per kind: square size and corner radius (a rect with rx = size/2 is a circle). */
const SHAPE: Record<PacketKind, { s: number; rx: number }> = {
  request: { s: 10, rx: 5 },
  response: { s: 9, rx: 4.5 },
  event: { s: 9, rx: 4.5 },
  error: { s: 10, rx: 5 },
  heavy: { s: 13, rx: 2.5 },
  handshake: { s: 13, rx: 6.5 },
};

interface Props {
  engine: FlowEngine;
  edgesById: RefObject<Map<string, SceneEdge>>;
  rootRef: RefObject<HTMLElement | null>;
}

/**
 * Renders the FlowEngine's packets. One rAF callback per frame: step the engine (unless paused),
 * then write positions straight into a fixed pool of SVG rects — no React re-render per packet
 * (PRD §6.5). Positions are recomputed from the *current* edge geometry every frame, so packets
 * stay on their edge while blocks are dragged, even when paused.
 */
export function PacketLayer({ engine, edgesById, rootRef }: Props) {
  const { clock, isDown, motion } = useCanvas();
  const rf = useReactFlow();
  const groupRef = useRef<SVGGElement>(null);
  const isDownRef = useRef(isDown);
  isDownRef.current = isDown;
  const motionRef = useRef(motion);
  motionRef.current = motion;

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const pool: SVGRectElement[] = [];
    for (let i = 0; i < POOL; i++) {
      const el = document.createElementNS(SVG_NS, 'rect');
      el.style.display = 'none';
      g.appendChild(el);
      pool.push(el);
    }
    const shown = new Array<string>(POOL).fill('');
    const cache = new Map<string, { key: string; geom: PathGeom }>();
    const lastPulse = new Map<string, number>();

    const geomFor = (edgeId: string): PathGeom | null => {
      const e = edgesById.current?.get(edgeId);
      if (!e) return null;
      const a = rf.getInternalNode(e.from);
      const b = rf.getInternalNode(e.to);
      if (!a || !b) return null;
      const ra = internalRect(a);
      const rb = internalRect(b);
      const key = `${ra.x}|${ra.y}|${ra.w}|${ra.h}|${rb.x}|${rb.y}|${rb.w}|${rb.h}|${e.style ?? ''}`;
      const hit = cache.get(edgeId);
      if (hit && hit.key === key) return hit.geom;
      const geom = edgeGeometry(ra, rb, e.style ?? 'orthogonal');
      cache.set(edgeId, { key, geom });
      return geom;
    };

    const pulse = (nodeId: string) => {
      if (motionRef.current !== 'full' || document.hidden) return;
      const now = performance.now();
      if (now - (lastPulse.get(nodeId) ?? 0) < 140) return;
      lastPulse.set(nodeId, now);
      const el = rootRef.current?.querySelector<SVGElement>(
        `[data-sc-node="${CSS.escape(nodeId)}"] .sc-block`,
      );
      el?.animate(
        [
          { transform: 'none' },
          { transform: 'translateY(-2px) scale(1.035)' },
          { transform: 'none' },
        ],
        { duration: 220, easing: 'ease-out' },
      );
    };

    const env: EngineEnv = {
      edgeLength: (id) => geomFor(id)?.length ?? 1,
      isNodeDown: (id) => isDownRef.current(id),
      onArrive: (id) => pulse(id),
    };

    const render = () => {
      const packets = engine.packets;
      let i = 0;
      for (; i < packets.length && i < POOL; i++) {
        const p = packets[i]!;
        const el = pool[i]!;
        const geom = geomFor(p.edgeId);
        if (!geom) {
          el.style.display = 'none';
          continue;
        }
        const pt = pointAt(geom, p.reverse ? 1 - p.t : p.t);
        const { s, rx } = SHAPE[p.kind];
        const cls = `sc-pk sc-pk-${p.kind}`;
        if (shown[i] !== cls) {
          el.setAttribute('class', cls);
          el.setAttribute('width', String(s));
          el.setAttribute('height', String(s));
          el.setAttribute('rx', String(rx));
          shown[i] = cls;
        }
        el.setAttribute('x', (pt.x - s / 2).toFixed(1));
        el.setAttribute('y', (pt.y - s / 2).toFixed(1));
        const opacity =
          p.phase === 'dying' ? Math.max(0, p.timer / DEATH_MS) : p.phase === 'dwell' ? 0.55 : 1;
        el.style.opacity = String(opacity);
        el.style.display = '';
      }
      for (; i < POOL; i++) {
        if (pool[i]!.style.display !== 'none') pool[i]!.style.display = 'none';
      }
    };

    const unsub = clock.subscribe(
      (rawDt) => {
        if (motionRef.current === 'off') {
          if (g.style.display !== 'none') g.style.display = 'none';
          return;
        }
        if (g.style.display === 'none') g.style.display = '';
        if (!clock.paused) engine.step(rawDt * clock.speed, env);
        render();
      },
      { always: true },
    );

    return () => {
      unsub();
      pool.forEach((el) => el.remove());
    };
  }, [clock, engine, edgesById, rf, rootRef]);

  return (
    <ViewportPortal>
      <svg className="sc-packets" aria-hidden="true">
        <g ref={groupRef} />
      </svg>
    </ViewportPortal>
  );
}
