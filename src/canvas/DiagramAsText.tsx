import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { kindDef } from './catalog';
import type { Flow, Scene } from './types';

function listFormat(
  lang: string,
  items: string[],
  type: 'conjunction' | 'disjunction' = 'conjunction',
) {
  try {
    return new Intl.ListFormat(lang, { style: 'long', type }).format(items);
  } catch {
    return items.join(', ');
  }
}

/**
 * Structured text version of the diagram (PRD §6.8): every component, connection and traffic
 * path, for screen-reader users and anyone who prefers reading.
 */
export function DiagramAsText({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const label = new Map(scene.nodes.map((n) => [n.id, n.label]));
  const name = (id: string) => label.get(id) ?? id;

  const describeFlow = (f: Flow) => {
    const parts: string[] = [];
    for (const hop of f.hops) {
      if (typeof hop === 'string') {
        const [a = '', b = ''] = hop.split('>');
        if (parts.length === 0) parts.push(a === '$' ? '…' : name(a));
        parts.push(b === '$' ? t('canvas.text.chosen') : name(b));
      } else {
        if (parts.length === 0) parts.push(name(hop.from));
        parts.push(
          t('canvas.text.oneOf', {
            list: listFormat(i18n.language, hop.to.map(name), 'disjunction'),
            algo: t(`canvas.algo.${hop.algo}`),
          }),
        );
      }
    }
    return parts.join(' → ');
  };

  return (
    <aside className="sc-astext" aria-label={t('canvas.asText')}>
      <div className="sc-astext-head">
        <h2>{t('canvas.asText')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('canvas.close')}
          className="sc-info-close"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <h3>{t('canvas.text.components')}</h3>
      <ul>
        {scene.nodes.map((n) => (
          <li key={n.id}>
            <strong>{n.label}</strong> — {kindDef(n.kind).role}
            {n.state && n.state !== 'idle' && <>, {t(`canvas.state.${n.state}`)}</>}
            {n.load !== undefined && (
              <>, {t('canvas.text.loadPct', { pct: Math.round(n.load * 100) })}</>
            )}
          </li>
        ))}
      </ul>

      {(scene.edges?.length ?? 0) > 0 && (
        <>
          <h3>{t('canvas.text.connections')}</h3>
          <ul>
            {scene.edges!.map((e) => (
              <li key={e.id}>
                {name(e.from)} → {name(e.to)}
                {e.label && <> ({e.label})</>}
                {e.status === 'cut' && <>, {t('canvas.text.cut')}</>}
                {e.dashed && <>, {t('canvas.text.async')}</>}
              </li>
            ))}
          </ul>
        </>
      )}

      {(scene.flows?.length ?? 0) > 0 && (
        <>
          <h3>{t('canvas.text.traffic')}</h3>
          <ul>
            {scene.flows!.map((f) => (
              <li key={f.id}>
                {describeFlow(f)}{' '}
                <span className="text-ink-muted">
                  ({t('canvas.text.perSecond', { n: f.rate })})
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
