import { useEffect, useRef, type RefObject } from 'react';
import type { Vec } from './types';

export interface TouchHandlers {
  /** Node id under a touch target, or null for empty canvas / non-draggable things. */
  nodeIdAt: (target: EventTarget | null) => string | null;
  canDrag: () => boolean;
  /** Current center position of a node in world units. */
  nodePosition: (id: string) => Vec | null;
  toFlow: (clientX: number, clientY: number) => Vec;
  lift: (id: string, on: boolean) => void;
  moveNode: (id: string, pos: Vec) => void;
  /** Gesture finished: settle (nudge, history, persist). */
  dropNode: (id: string, from: Vec) => void;
  panBy: (dx: number, dy: number) => void;
  /** Zoom by `factor` around a client point. */
  zoomAround: (factor: number, clientX: number, clientY: number, baseZoom: number) => void;
  currentZoom: () => number;
}

export const LONG_PRESS_MS = 300;
const MOVE_SLOP = 8;

type Gesture =
  | { mode: 'pending'; id: string; start: Vec; last: Vec; timer: number }
  | { mode: 'pan'; id: string; last: Vec }
  | { mode: 'drag'; id: string; from: Vec; grab: Vec }
  | { mode: 'pinch'; dist0: number; zoom0: number };

const pt = (t: Touch): Vec => ({ x: t.clientX, y: t.clientY });
const gap = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Touch rules on the canvas (PRD §5, AC-C6):
 *  - one finger on empty canvas pans (React Flow handles it);
 *  - one finger on a block: moving straight away pans; holding still 300 ms lifts the block
 *    and then drags it — so scrolling never moves blocks by accident;
 *  - a second finger turns any of those into a pinch-zoom.
 * Touches that start on a block are taken away from React Flow (capture phase), so its
 * immediate node-drag never fires on touch.
 */
export function useTouchGestures(
  rootRef: RefObject<HTMLElement | null>,
  handlers: TouchHandlers,
): void {
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let g: Gesture | null = null;

    const cancelTimer = () => {
      if (g?.mode === 'pending') window.clearTimeout(g.timer);
    };

    const end = () => {
      if (g?.mode === 'drag') {
        h.current.lift(g.id, false);
        const pos = h.current.nodePosition(g.id);
        if (pos) h.current.dropNode(g.id, g.from);
      }
      cancelTimer();
      g = null;
    };

    const onStart = (e: TouchEvent) => {
      // Second finger while we own the gesture → pinch.
      if (g && e.touches.length === 2) {
        e.stopPropagation();
        if (g.mode === 'drag') h.current.lift(g.id, false);
        if (g.mode === 'drag') h.current.dropNode(g.id, g.from);
        cancelTimer();
        g = {
          mode: 'pinch',
          dist0: gap(e.touches[0]!, e.touches[1]!),
          zoom0: h.current.currentZoom(),
        };
        return;
      }
      if (e.touches.length !== 1) return;
      const id = h.current.nodeIdAt(e.target);
      if (!id) return; // empty canvas: React Flow pans / pinches natively
      e.stopPropagation();
      const start = pt(e.touches[0]!);
      const timer = window.setTimeout(() => {
        if (g?.mode !== 'pending' || !h.current.canDrag()) return;
        const pos = h.current.nodePosition(g.id);
        if (!pos) return;
        const f = h.current.toFlow(g.last.x, g.last.y);
        g = { mode: 'drag', id: g.id, from: pos, grab: { x: pos.x - f.x, y: pos.y - f.y } };
        h.current.lift(g.id, true);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
      g = { mode: 'pending', id, start, last: start, timer };
    };

    const onMove = (e: TouchEvent) => {
      if (!g) return;
      e.preventDefault(); // we own this gesture: no page scroll, no browser zoom
      e.stopPropagation();
      if (g.mode === 'pinch') {
        if (e.touches.length < 2) return;
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        h.current.zoomAround(
          gap(a, b) / g.dist0,
          (a.clientX + b.clientX) / 2,
          (a.clientY + b.clientY) / 2,
          g.zoom0,
        );
        return;
      }
      const p = pt(e.touches[0]!);
      if (g.mode === 'pending') {
        if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > MOVE_SLOP) {
          window.clearTimeout(g.timer);
          h.current.panBy(p.x - g.last.x, p.y - g.last.y);
          g = { mode: 'pan', id: g.id, last: p };
        } else {
          g.last = p;
        }
        return;
      }
      if (g.mode === 'pan') {
        h.current.panBy(p.x - g.last.x, p.y - g.last.y);
        g.last = p;
        return;
      }
      const f = h.current.toFlow(p.x, p.y);
      h.current.moveNode(g.id, { x: f.x + g.grab.x, y: f.y + g.grab.y });
    };

    const onEnd = (e: TouchEvent) => {
      if (!g) return;
      if (g.mode === 'pinch' && e.touches.length > 0) return;
      e.stopPropagation();
      end();
    };

    root.addEventListener('touchstart', onStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onMove, { capture: true, passive: false });
    window.addEventListener('touchend', onEnd, { capture: true });
    window.addEventListener('touchcancel', onEnd, { capture: true });
    return () => {
      cancelTimer();
      root.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', onEnd, { capture: true });
    };
  }, [rootRef]);
}
