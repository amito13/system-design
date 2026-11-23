import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClockTween } from '../canvas/context';
import type { HudMetricDef, HudValues } from '../content/types';
import { formatMetric } from './format';

function Chip({ def, value }: { def: HudMetricDef; value: number | string | null | undefined }) {
  const { i18n } = useTranslation();
  const numeric = typeof value === 'number';
  // Count-up on the canvas clock (freezes when paused). Non-numbers switch instantly.
  const tweened = useClockTween(numeric ? value : 0, 700);
  const prev = useRef(value);
  const [flash, setFlash] = useState<{ tone: 'good' | 'bad' | 'neutral'; key: number } | null>(
    null,
  );

  useEffect(() => {
    const a = prev.current;
    prev.current = value;
    if (typeof a !== 'number' || typeof value !== 'number' || a === value) return;
    const tone =
      def.better === 'none' ? 'neutral' : (def.better === 'lower') === value < a ? 'good' : 'bad';
    setFlash({ tone, key: Date.now() });
  }, [value, def.better]);

  const shown = numeric
    ? formatMetric(def, tweened, i18n.language)
    : formatMetric(def, value ?? null, i18n.language);
  const final = formatMetric(def, value ?? null, i18n.language);

  return (
    <div
      className={`sc-hud-chip ${def.emphasis ? 'is-emphasis' : ''} ${flash ? `flash-${flash.tone}` : ''}`}
      key={flash?.key}
    >
      <span className="sc-hud-label">{def.label}</span>
      {/* Screen readers get the final value, not every animation frame. */}
      <span className="sc-hud-value tabular" aria-hidden="true">
        {shown}
      </span>
      <span className="sr-only">{final}</span>
    </div>
  );
}

/** Floating live metrics (PRD §5 HUD, §6.5). */
export function Hud({ defs, values }: { defs: HudMetricDef[]; values: HudValues }) {
  const { t } = useTranslation();
  if (!defs.length) return null;
  return (
    // Focusable so keyboard users can scroll it when it overflows on narrow screens.
    <div className="sc-hud" role="group" aria-label={t('learn.metrics')} tabIndex={0}>
      {defs.map((d) => (
        <Chip key={d.id} def={d} value={values[d.id]} />
      ))}
    </div>
  );
}
