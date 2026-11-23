import { useViewport, ViewportPortal } from '@xyflow/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { kindDef, nodeBox } from './catalog';
import type { Guides } from './layout';
import type { IsoRFNode } from './nodes/IsoNode';
import type { Callout, Vec } from './types';

interface Props {
  nodes: IsoRFNode[];
  callouts: Callout[];
  guides: Guides;
  /** Authored positions to ghost while those nodes are being dragged. */
  ghosts: { id: string; pos: Vec }[];
  inspectId: string | null;
  hoverId: string | null;
  connections: Map<string, string[]>;
  onCloseInspect: () => void;
}

/** Everything that lives in world space above the blocks (PRD §6.2, §6.6). */
export function Overlays({
  nodes,
  callouts,
  guides,
  ghosts,
  inspectId,
  hoverId,
  connections,
  onCloseInspect,
}: Props) {
  const { t } = useTranslation();
  const { zoom } = useViewport();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const inv = 1 / zoom;

  const card = (id: string | null, compact: boolean) => {
    const n = id ? byId.get(id) : undefined;
    if (!n) return null;
    const sn = n.data.node;
    const def = kindDef(sn.kind);
    const box = nodeBox(sn.size ?? def.size, sn.kind);
    const state = sn.state ?? 'idle';
    const links = (connections.get(sn.id) ?? []).map((c) => byId.get(c)?.data.node.label ?? c);
    return (
      <div
        key={compact ? 'hover' : 'inspect'}
        className={compact ? 'sc-tip' : 'sc-info'}
        role={compact ? 'tooltip' : 'dialog'}
        aria-label={compact ? undefined : sn.label}
        style={{
          transform: `translate(${n.position.x}px, ${n.position.y - box.h / 2 - (sn.badge || sn.load !== undefined ? 34 : 12)}px) translate(-50%, -100%) scale(${inv})`,
          transformOrigin: '50% 100%',
        }}
      >
        <div className="sc-info-head">
          <span className="sc-info-swatch" style={{ background: `var(--cat-${def.category})` }} />
          <strong>{sn.label}</strong>
          {!compact && (
            <button
              type="button"
              className="sc-info-close nodrag nopan"
              onClick={onCloseInspect}
              aria-label={t('canvas.close')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        {(def.role.toLowerCase() !== sn.label.toLowerCase() || state !== 'idle') && (
          <div className="sc-info-row">
            {def.role.toLowerCase() !== sn.label.toLowerCase() && def.role}
            {state !== 'idle' && (
              <span className={`sc-info-state sc-info-state-${state}`}>
                {t(`canvas.state.${state}`)}
              </span>
            )}
          </div>
        )}
        {!compact && (
          <>
            {sn.load !== undefined && (
              <div className="sc-info-row">
                {t('canvas.load')}: <span className="tabular">{Math.round(sn.load * 100)}%</span>
              </div>
            )}
            {links.length > 0 && (
              <div className="sc-info-row">
                {t('canvas.connectedTo')}: {links.join(', ')}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <ViewportPortal>
      {ghosts.map((g) => {
        const n = byId.get(g.id);
        if (!n) return null;
        const box = nodeBox(n.data.node.size ?? kindDef(n.data.node.kind).size, n.data.node.kind);
        return (
          <div
            key={`ghost-${g.id}`}
            className="sc-ghost"
            aria-hidden="true"
            style={{
              transform: `translate(${g.pos.x - box.w / 2}px, ${g.pos.y - box.h / 2}px)`,
              width: box.w,
              height: box.h,
            }}
          />
        );
      })}

      {guides.x !== null && (
        <div
          className="sc-guide sc-guide-v"
          aria-hidden="true"
          style={{ transform: `translateX(${guides.x}px)`, width: inv }}
        />
      )}
      {guides.y !== null && (
        <div
          className="sc-guide sc-guide-h"
          aria-hidden="true"
          style={{ transform: `translateY(${guides.y}px)`, height: inv }}
        />
      )}

      {callouts.map((c, i) => {
        const n = byId.get(c.anchor);
        if (!n || n.data.phase === 'exit') return null;
        return (
          <div
            key={c.id ?? `${c.anchor}-${i}`}
            className={`sc-callout sc-callout-${c.tone ?? 'neutral'}`}
            style={{
              transform: `translate(${n.position.x + c.offset.x}px, ${n.position.y + c.offset.y}px) translate(-50%, -50%)`,
            }}
          >
            {c.text}
          </div>
        );
      })}

      {card(inspectId, false)}
      {hoverId !== inspectId && card(hoverId, true)}
    </ViewportPortal>
  );
}
