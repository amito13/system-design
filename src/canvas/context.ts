import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { AnimationClock } from './clock';

export type MotionLevel = 'full' | 'reduced' | 'off';

export interface CanvasCtx {
  clock: AnimationClock;
  motion: MotionLevel;
  /** Node ids currently down (packets fail before reaching them). */
  isDown: (id: string) => boolean;
  /** Keyboard focus landed on a node: select it. */
  onNodeFocus: (id: string) => void;
  /** Enter / tap on a node: open its info card. */
  onNodeActivate: (id: string) => void;
}

export const CanvasContext = createContext<CanvasCtx | null>(null);

export function useCanvas(): CanvasCtx {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used inside <CanvasStage>');
  return ctx;
}

/** Effective motion level from <html data-motion> (set by the theme controller). */
export function useMotionLevel(): MotionLevel {
  return useSyncExternalStore(
    (cb) => {
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
      return () => mo.disconnect();
    },
    () => (document.documentElement.getAttribute('data-motion') as MotionLevel | null) ?? 'full',
    () => 'full',
  );
}

/** Clock-driven tween: pausing the canvas freezes it (PRD AC-C8). */
export function useClockTween(target: number, ms = 500): number {
  const { clock, motion } = useCanvas();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const current = useRef(target);
  const elapsed = useRef(0);

  useEffect(() => {
    if (motion !== 'full' || ms <= 0) {
      current.current = target;
      setValue(target);
      return;
    }
    from.current = current.current;
    elapsed.current = 0;
    if (from.current === target) return;
    const unsub = clock.subscribe((dt) => {
      elapsed.current = Math.min(ms, elapsed.current + dt);
      const k = elapsed.current / ms;
      const eased = 1 - Math.pow(1 - k, 3);
      current.current = from.current + (target - from.current) * eased;
      setValue(current.current);
      if (k >= 1) unsub();
    });
    return unsub;
  }, [target, ms, clock, motion]);

  return value;
}
