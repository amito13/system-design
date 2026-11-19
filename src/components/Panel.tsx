import type { HTMLAttributes, ReactNode } from 'react';

/** Floating card that sits over the blueprint canvas. */
export function Panel({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn';
}) {
  const tones = {
    neutral: 'border-line bg-surface-2 text-ink-muted',
    accent: 'border-transparent bg-accent-soft text-ink',
    ok: 'border-transparent bg-[color-mix(in_oklab,var(--ok),transparent_85%)] text-ink',
    warn: 'border-transparent bg-[color-mix(in_oklab,var(--warn),transparent_85%)] text-ink',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
