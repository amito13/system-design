import type { Node, NodeProps } from '@xyflow/react';
import { memo } from 'react';

export interface FrameData extends Record<string, unknown> {
  label: string;
}

export type FrameRFNode = Node<FrameData, 'frame'>;

/** Region / zone frame (PRD §6.6): dashed box auto-sized around its members, behind them. */
function FrameNodeImpl({ data, width, height }: NodeProps<FrameRFNode>) {
  return (
    <div className="sc-frame" style={{ width, height }} aria-hidden="true">
      <span className="sc-frame-label">{data.label}</span>
    </div>
  );
}

export const FrameNode = memo(FrameNodeImpl);
