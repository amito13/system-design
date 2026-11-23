import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { IsoBlock } from '../../components/IsoBlock';
import { BLOCK_SIZES, kindDef, nodeBox } from '../catalog';
import { useCanvas, useClockTween } from '../context';
import type { SceneNode } from '../types';

export type NodePhase = 'enter' | 'exit' | 'idle';

export interface IsoData extends Record<string, unknown> {
  node: SceneNode;
  phase: NodePhase;
  /** Touch long-press is holding this node. */
  lifted?: boolean;
  ariaLabel: string;
}

export type IsoRFNode = Node<IsoData, 'iso'>;

const CROWD_COLORS = [
  'var(--cat-compute)',
  'var(--cat-data)',
  'var(--cat-network)',
  'var(--cat-messaging)',
  'var(--cat-observability)',
  'var(--cat-security)',
];

/** Users slab with simple rounded pins (no faces — PRD §6.7). */
function Crowd({ cx, cy, r, count }: { cx: number; cy: number; r: number; count: number }) {
  const n = Math.max(1, Math.min(24, count));
  const side = Math.ceil(Math.sqrt(n));
  const d = r / 2;
  const pins: { x: number; y: number; c: string }[] = [];
  for (let i = 0; i < n; i++) {
    const a = side === 1 ? 0 : -0.62 + (1.24 * (i % side)) / (side - 1);
    const b = side === 1 ? 0 : -0.62 + (1.24 * Math.floor(i / side)) / (side - 1);
    pins.push({
      x: cx + a * (r / 2) * 1.6 - b * (r / 2) * 1.6,
      y: cy - 6 + a * (d / 2) * 1.6 + b * (d / 2) * 1.6,
      c: CROWD_COLORS[i % CROWD_COLORS.length]!,
    });
  }
  pins.sort((p, q) => p.y - q.y);
  return (
    <g>
      <IsoBlock x={cx} y={cy + 4} r={r} h={8} category="client" />
      {pins.map((p, i) => (
        <g key={i} stroke="var(--ink)" strokeWidth={1}>
          <rect x={p.x - 3.2} y={p.y - 9} width={6.4} height={10} rx={3.2} fill={p.c} />
          <circle cx={p.x} cy={p.y - 11.5} r={3.2} fill={p.c} />
        </g>
      ))}
    </g>
  );
}

function IsoNodeImpl({ id, data, selected, dragging }: NodeProps<IsoRFNode>) {
  const { onNodeFocus, onNodeActivate } = useCanvas();
  const { node, phase, lifted, ariaLabel } = data;
  const def = kindDef(node.kind);
  const size = node.size ?? def.size;
  const { r, h } = BLOCK_SIZES[size];
  const box = nodeBox(size, node.kind);
  const state = node.state ?? 'idle';
  const load = useClockTween(node.load ?? 0, 500);
  const Icon = def.icon;
  const isCrowd = node.kind === 'users';
  const cx = box.w / 2;
  const baseY = isCrowd ? box.h - r / 2 - 6 : h + r / 2 + 2;
  const iconSize = r * 0.72;

  const classes = [
    'sc-node',
    `sc-state-${state}`,
    `sc-phase-${phase}`,
    selected ? 'is-selected' : '',
    dragging || lifted ? 'is-lifted' : '',
  ].join(' ');

  return (
    <div className={classes} style={{ width: box.w, height: box.h }} data-sc-node={id}>
      <Handle type="target" position={Position.Top} className="sc-handle" isConnectable={false} />
      <Handle
        type="source"
        position={Position.Bottom}
        className="sc-handle"
        isConnectable={false}
      />

      {(node.badge || node.load !== undefined) && (
        <div className="sc-node-top" aria-hidden="true">
          {node.badge && <span className="sc-badge">{node.badge}</span>}
          {node.load !== undefined && (
            <span
              className="sc-load"
              data-level={load > 0.85 ? 'bad' : load > 0.65 ? 'warn' : 'ok'}
            >
              <span className="sc-load-track">
                <span className="sc-load-fill" style={{ width: `${Math.round(load * 100)}%` }} />
              </span>
              <span className="tabular">{Math.round(load * 100)}%</span>
            </span>
          )}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={selected}
        className="sc-hit"
        onFocus={() => onNodeFocus(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onNodeActivate(id);
          }
        }}
      >
        <svg
          className="sc-block"
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          aria-hidden="true"
        >
          {isCrowd ? (
            <Crowd cx={cx} cy={baseY} r={r} count={node.count ?? 12} />
          ) : (
            <IsoBlock x={cx} y={baseY} r={r} h={h} category={def.category}>
              <g
                transform={`translate(${cx} ${baseY - h}) matrix(0.7071 0.3536 -0.7071 0.3536 0 0) translate(${-iconSize / 2} ${-iconSize / 2})`}
                style={{ color: 'var(--ink)' }}
              >
                <Icon width={iconSize} height={iconSize} strokeWidth={2.2} absoluteStrokeWidth />
              </g>
            </IsoBlock>
          )}
        </svg>
      </div>

      <div className="sc-label" aria-hidden="true">
        {node.label}
      </div>

      {state === 'down' && (
        <span className="sc-status sc-status-down" aria-hidden="true">
          ✕
        </span>
      )}
      {state === 'recovering' && (
        <span className="sc-status sc-status-recovering" aria-hidden="true" />
      )}
    </div>
  );
}

export const IsoNode = memo(IsoNodeImpl);
