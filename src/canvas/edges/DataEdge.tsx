import {
  EdgeLabelRenderer,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react';
import { memo, useMemo } from 'react';
import { useCanvas } from '../context';
import { edgeGeometry, type Rect } from '../geometry';
import type { SceneEdge } from '../types';

export interface DataEdgeData extends Record<string, unknown> {
  edge: SceneEdge;
  enter: boolean;
}

export type DataRFEdge = Edge<DataEdgeData, 'data'>;

export function internalRect(n: InternalNode): Rect {
  return {
    x: n.internals.positionAbsolute.x,
    y: n.internals.positionAbsolute.y,
    w: n.measured.width ?? n.width ?? 0,
    h: n.measured.height ?? n.height ?? 0,
  };
}

/**
 * Floating edge: re-routes between the two closest facing ports on every move (PRD §6.4).
 * Uses the same geometry as the packet layer.
 */
function DataEdgeImpl({ id, source, target, data }: EdgeProps<DataRFEdge>) {
  const { motion } = useCanvas();
  const a = useInternalNode(source);
  const b = useInternalNode(target);
  const edge = data?.edge;
  const style = edge?.style ?? 'orthogonal';

  const ra = a ? internalRect(a) : null;
  const rb = b ? internalRect(b) : null;
  const geom = useMemo(
    () => (ra && rb ? edgeGeometry(ra, rb, style) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ra?.x, ra?.y, ra?.w, ra?.h, rb?.x, rb?.y, rb?.w, rb?.h, style],
  );
  if (!geom || !edge) return null;

  // With motion off, packets are hidden, so arrows show the direction of flow instead.
  const arrow = edge.arrow ?? (motion === 'off' ? 'end' : 'none');
  const status = edge.status ?? 'normal';
  const classes = [
    'sc-edge',
    `sc-edge-${status}`,
    edge.dashed ? 'is-dashed' : '',
    data?.enter && !edge.dashed ? 'sc-edge-enter' : '',
  ].join(' ');

  return (
    <>
      <path
        id={id}
        d={geom.d}
        className={classes}
        style={{ ['--len' as string]: geom.length }}
        markerEnd={arrow === 'end' || arrow === 'both' ? 'url(#sc-arrow)' : undefined}
        markerStart={arrow === 'both' ? 'url(#sc-arrow-start)' : undefined}
        fill="none"
      />
      {status === 'cut' && (
        <g transform={`translate(${geom.mid.x} ${geom.mid.y})`} className="sc-edge-cut-mark">
          <circle r={9} />
          <path d="M-3.8 -3.8 L3.8 3.8 M3.8 -3.8 L-3.8 3.8" />
        </g>
      )}
      {edge.label && (
        <EdgeLabelRenderer>
          <div
            className="sc-edge-label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${geom.mid.x}px, ${geom.mid.y}px)`,
            }}
          >
            {edge.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DataEdge = memo(DataEdgeImpl);
