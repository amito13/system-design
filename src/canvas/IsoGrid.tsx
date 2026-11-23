import { useViewport } from '@xyflow/react';
import { useId } from 'react';

const CELL_H = 40;
const CELL_W = CELL_H * Math.sqrt(3); // ±30° lines

/** Isometric blueprint grid that pans and zooms with the canvas (PRD §6.1). */
export function IsoGrid() {
  const { x, y, zoom } = useViewport();
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const minor = `sc-grid-minor-${raw}`;
  const major = `sc-grid-major-${raw}`;
  const tf = `translate(${x} ${y}) scale(${zoom})`;
  const sw = 1 / zoom;

  return (
    <svg className="sc-grid" aria-hidden="true">
      <defs>
        <pattern
          id={minor}
          width={CELL_W}
          height={CELL_H}
          patternUnits="userSpaceOnUse"
          patternTransform={tf}
        >
          <path
            d={`M0 0 L${CELL_W} ${CELL_H} M0 ${CELL_H} L${CELL_W} 0`}
            style={{ stroke: 'var(--grid)' }}
            strokeWidth={sw}
            fill="none"
          />
        </pattern>
        <pattern
          id={major}
          width={CELL_W * 5}
          height={CELL_H * 5}
          patternUnits="userSpaceOnUse"
          patternTransform={tf}
        >
          <path
            d={`M0 0 L${CELL_W * 5} ${CELL_H * 5} M0 ${CELL_H * 5} L${CELL_W * 5} 0`}
            style={{ stroke: 'var(--grid-strong)' }}
            strokeWidth={sw * 1.2}
            fill="none"
          />
        </pattern>
      </defs>
      {zoom >= 0.45 && <rect width="100%" height="100%" fill={`url(#${minor})`} />}
      <rect width="100%" height="100%" fill={`url(#${major})`} />
    </svg>
  );
}
