import type { ReactNode } from 'react';

export type BlockCategory =
  'client' | 'network' | 'compute' | 'data' | 'messaging' | 'security' | 'observability';

interface IsoBlockProps {
  /** Base-center x/y in SVG units. */
  x: number;
  y: number;
  /** Half the block's width (the diamond's horizontal radius). Depth is half of it (2:1 iso). */
  r: number;
  /** Extruded height. */
  h: number;
  category: BlockCategory;
  label?: string;
  children?: ReactNode;
}

/**
 * Static isometric block (PRD §4.1 / §6.7): flat faces, top lighter, sides darkened 12% / 24%,
 * 1.5 px ink outline. M1 replaces this with the interactive canvas node; the geometry stays.
 */
export function IsoBlock({ x, y, r, h, category, label, children }: IsoBlockProps) {
  const d = r / 2;
  const top = `${x},${y - h - d} ${x + r},${y - h} ${x},${y - h + d} ${x - r},${y - h}`;
  const left = `${x - r},${y - h} ${x},${y - h + d} ${x},${y + d} ${x - r},${y}`;
  const right = `${x},${y - h + d} ${x + r},${y - h} ${x + r},${y} ${x},${y + d}`;
  const base = `var(--cat-${category})`;
  const stroke = { stroke: 'var(--ink)', strokeWidth: 1.5, strokeLinejoin: 'round' as const };
  return (
    <g>
      <ellipse
        cx={x}
        cy={y + d * 0.9}
        rx={r * 1.05}
        ry={d * 0.7}
        fill="var(--ink)"
        opacity={0.08}
      />
      <polygon
        points={left}
        style={{ fill: `color-mix(in oklab, ${base}, black 12%)`, ...stroke }}
      />
      <polygon
        points={right}
        style={{ fill: `color-mix(in oklab, ${base}, black 24%)`, ...stroke }}
      />
      <polygon points={top} style={{ fill: base, ...stroke }} />
      {children}
      {label && (
        <text
          x={x}
          y={y - h + 4}
          textAnchor="middle"
          className="font-mono"
          style={{ fontSize: r * 0.3, fontWeight: 600, fill: 'var(--ink)' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
