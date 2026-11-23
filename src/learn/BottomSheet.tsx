import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type SheetSnap = 'peek' | 'half' | 'full';

const HEIGHT: Record<SheetSnap, number> = { peek: 0.3, half: 0.55, full: 0.88 };
const ORDER: SheetSnap[] = ['peek', 'half', 'full'];

/**
 * Phone step panel (PRD §5 < 768 px): a bottom sheet with three heights. Drag the handle,
 * or tap / use ↑ ↓ on it. Reports its height so the canvas can fit around it.
 */
export function BottomSheet({
  children,
  footer,
  onHeight,
}: {
  children: ReactNode;
  footer: ReactNode;
  onHeight: (px: number) => void;
}) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number } | null>(null);
  const vh = () => window.innerHeight - 56;
  const height = drag ?? HEIGHT[snap] * vh();

  useEffect(() => {
    if (drag === null) onHeight(HEIGHT[snap] * vh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, drag]);

  const nearest = (h: number): SheetSnap =>
    ORDER.reduce(
      (best, s) => (Math.abs(HEIGHT[s] * vh() - h) < Math.abs(HEIGHT[best] * vh() - h) ? s : best),
      'peek' as SheetSnap,
    );

  const step = (dir: 1 | -1) =>
    setSnap((s) => ORDER[Math.max(0, Math.min(2, ORDER.indexOf(s) + dir))]!);

  return (
    <section className="sc-sheet" style={{ height }} aria-label={t('learn.togglePanel')}>
      <button
        type="button"
        className="sc-sheet-handle"
        aria-label={t('learn.resizeSheet')}
        aria-expanded={snap !== 'peek'}
        onPointerDown={(e) => {
          start.current = { y: e.clientY, h: height };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const h = Math.min(
            vh() * 0.92,
            Math.max(vh() * 0.18, start.current.h + (start.current.y - e.clientY)),
          );
          setDrag(h);
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          const moved = Math.abs(e.clientY - start.current.y);
          if (moved < 6) step(snap === 'full' ? -1 : 1);
          else if (drag !== null) setSnap(nearest(drag));
          start.current = null;
          setDrag(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        <span aria-hidden="true" />
      </button>
      <div className="sc-sheet-body">{children}</div>
      <div className="sc-sheet-foot">{footer}</div>
    </section>
  );
}
