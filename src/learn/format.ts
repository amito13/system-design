import type { HudMetricDef, HudValues, Step, StepChange } from '../content/types';

/** Format a HUD value for display (PRD §6.5 HUD). */
export function formatMetric(
  def: HudMetricDef,
  value: number | string | null | undefined,
  lang = 'en',
): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  const n = (x: number, digits = 0) =>
    new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(x);
  switch (def.format) {
    case 'ms':
      return `${n(Math.round(value))} ms`;
    case 'pct':
      return `${n(value, 1)}%`;
    case 'bytes': {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let v = value;
      let u = 0;
      while (v >= 1000 && u < units.length - 1) {
        v /= 1000;
        u++;
      }
      return `${n(v, v < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
    }
    case 'text':
      return String(value);
    default:
      return def.unit ? `${n(value)} ${def.unit}` : n(value);
  }
}

export interface MetricChange {
  id: string;
  label: string;
  from: string;
  to: string;
  direction: 'up' | 'down';
  tone: 'good' | 'bad' | 'neutral';
}

/** "What changed" lines derived from the HUD difference between two steps. */
export function deriveChanges(
  defs: HudMetricDef[],
  prev: HudValues | undefined,
  cur: HudValues,
  lang = 'en',
): MetricChange[] {
  if (!prev) return [];
  const out: MetricChange[] = [];
  for (const d of defs) {
    const a = prev[d.id];
    const b = cur[d.id];
    if (typeof b !== 'number') continue;
    // A metric appearing for the first time (— → 70 ms) is listed too, neutrally.
    if (a === null || a === undefined) {
      out.push({
        id: d.id,
        label: d.label,
        from: '—',
        to: formatMetric(d, b, lang),
        direction: 'up',
        tone: 'neutral',
      });
      continue;
    }
    if (typeof a !== 'number' || a === b) continue;
    const direction = b > a ? 'up' : 'down';
    const tone =
      d.better === 'none'
        ? 'neutral'
        : (d.better === 'lower') === (direction === 'down')
          ? 'good'
          : 'bad';
    out.push({
      id: d.id,
      label: d.label,
      from: formatMetric(d, a, lang),
      to: formatMetric(d, b, lang),
      direction,
      tone,
    });
  }
  return out;
}

/** Screen-reader summary for a step (PRD §6.8 live region). `head` is e.g. "Step 3 of 10". */
export function announceStep(
  step: Step,
  head: string,
  changes: MetricChange[],
  extra: StepChange[] | undefined,
): string {
  const deltas = changes.map((c) => `${c.label} ${c.from} → ${c.to}`);
  const authored = (extra ?? []).map((c) => c.text);
  return [`${head}: ${step.title}.`, ...[...deltas, ...authored].map((s) => `${s}.`)].join(' ');
}
