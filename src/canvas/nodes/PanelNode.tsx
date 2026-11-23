import type { Node, NodeProps } from '@xyflow/react';
import { GripHorizontal } from 'lucide-react';
import { memo } from 'react';
import type { CanvasPanel } from '../types';

export interface PanelData extends Record<string, unknown> {
  panel: CanvasPanel;
}

export type PanelRFNode = Node<PanelData, 'panel'>;

export const PANEL_WIDTH = 280;

/** Height is computed from the content so the node has a size before DOM measurement. */
export function panelHeight(p: CanvasPanel): number {
  return 46 + p.rows.length * 27 + (p.note ? 26 : 0) + 10;
}

/** A card on the canvas, e.g. a time-budget table (PRD §6.6). Draggable by its whole body. */
function PanelNodeImpl({ data }: NodeProps<PanelRFNode>) {
  const { panel } = data;
  return (
    <section
      className="sc-panel"
      style={{ width: PANEL_WIDTH, height: panelHeight(panel) }}
      aria-label={panel.title}
    >
      <header className="sc-panel-head">
        <span>{panel.title}</span>
        <GripHorizontal size={14} aria-hidden="true" className="sc-panel-grip" />
      </header>
      <table className="sc-panel-table">
        <tbody>
          {panel.rows.map(([k, v], i) => (
            <tr key={`${k}-${i}`} className={i === panel.highlightRow ? 'is-highlight' : undefined}>
              <th scope="row">{k}</th>
              <td className="tabular">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {panel.note && <p className="sc-panel-note">{panel.note}</p>}
    </section>
  );
}

export const PanelNode = memo(PanelNodeImpl);
