import { useEffect, useRef } from 'react';

const COLORS = [
  'var(--cat-compute)',
  'var(--cat-data)',
  'var(--cat-network)',
  'var(--cat-messaging)',
  'var(--cat-observability)',
  'var(--cat-security)',
];

/**
 * Small one-shot burst when a lesson is completed (PRD §7.4). Plain DOM + Web Animations,
 * cleaned up after itself; does nothing when motion is reduced or off.
 */
export function Confetti({ fire }: { fire: number }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fire || !host.current) return;
    if (document.documentElement.getAttribute('data-motion') !== 'full') return;
    const el = host.current;
    const bits: HTMLSpanElement[] = [];
    for (let i = 0; i < 28; i++) {
      const b = document.createElement('span');
      b.className = 'sc-confetti-bit';
      b.style.background = COLORS[i % COLORS.length]!;
      el.appendChild(b);
      bits.push(b);
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 90;
      b.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 60}px) rotate(${360 + Math.random() * 360}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 900 + Math.random() * 400,
          easing: 'cubic-bezier(.2,.7,.3,1)',
          fill: 'forwards',
        },
      );
    }
    const t = window.setTimeout(() => bits.forEach((b) => b.remove()), 1500);
    return () => {
      window.clearTimeout(t);
      bits.forEach((b) => b.remove());
    };
  }, [fire]);

  return <div ref={host} className="sc-confetti" aria-hidden="true" />;
}
