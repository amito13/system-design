import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CanvasStage, type SafeArea } from '../canvas/CanvasStage';
import { DEMO_KEY, DEMO_SCENES, DEMO_STEPS } from '../canvas/demoScenes';
import { storage } from '../lib/storage';

/** M1 demo: the canvas engine on a four-step scene (PRD §15 M1 DoD). */
export function Playground() {
  const { t } = useTranslation();
  const [step, setStep] = useState(() => {
    const s = storage.get<number>('playground:step', 0);
    return Number.isInteger(s) && s >= 0 && s < DEMO_STEPS.length ? s : 0;
  });
  const [showFps, setShowFps] = useState(false);
  // On phones the card starts collapsed so the diagram gets the screen.
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [safeArea, setSafeArea] = useState<Partial<SafeArea>>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const current = DEMO_STEPS[step]!;

  // Tell the canvas which part of the screen the step card covers, so the camera fits around it.
  useEffect(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;
    if (!card || !wrap) return;
    const measure = () => {
      const c = card.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      setSafeArea(
        c.width < w.width * 0.55 ? { left: c.right - w.left + 16 } : { top: c.bottom - w.top + 16 },
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => storage.set('playground:step', step), [step]);

  // ← / → change step when focus is outside the canvas (inside it, arrows move blocks).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('.sc-stage, input, textarea, select, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') setStep((s) => Math.min(DEMO_STEPS.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={wrapRef} className="fixed inset-x-0 bottom-0 top-14">
      <CanvasStage
        sceneKey={DEMO_KEY}
        scenes={DEMO_SCENES}
        stepIndex={step}
        announce={`${t('playground.step', { n: step + 1, total: DEMO_STEPS.length })}: ${current.title}. ${current.body}`}
        showFps={showFps}
        safeArea={safeArea}
      >
        <section
          ref={cardRef}
          className={`panel glass absolute start-3 top-3 z-[6] w-[min(360px,calc(100%-24px))] ${collapsed ? 'p-3' : 'p-4'}`}
          aria-label={t('playground.title')}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                {t('playground.title')} ·{' '}
                {t('playground.step', { n: step + 1, total: DEMO_STEPS.length })}
              </p>
              <h1 className={`mt-1 font-bold ${collapsed ? 'truncate text-base' : 'text-xl'}`}>
                {current.title}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls="playground-details"
              aria-label={collapsed ? t('playground.expand') : t('playground.collapse')}
              className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              {collapsed ? (
                <ChevronDown size={16} aria-hidden="true" />
              ) : (
                <ChevronUp size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <div id="playground-details" hidden={collapsed}>
            <p className="mt-1 text-sm text-ink-muted">{current.body}</p>
          </div>

          <ol
            className={`mt-3 items-center gap-1.5 ${collapsed ? 'hidden' : 'flex'}`}
            aria-label={t('playground.steps')}
          >
            {DEMO_STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? 'step' : undefined}
                  aria-label={`${i + 1}. ${s.title}`}
                  className={`grid size-7 place-items-center rounded-full border font-mono text-xs transition-colors ${
                    i === step
                      ? 'border-accent bg-accent text-accent-ink'
                      : i < step
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line bg-surface-2 text-ink-muted'
                  }`}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          <div className={`flex gap-2 ${collapsed ? 'mt-2' : 'mt-3'}`}>
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-3 text-sm font-semibold text-ink disabled:opacity-40"
            >
              <ArrowLeft size={15} aria-hidden="true" className="rtl:rotate-180" />{' '}
              {t('playground.back')}
            </button>
            <button
              type="button"
              disabled={step === DEMO_STEPS.length - 1}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-40"
            >
              {t('playground.next')}{' '}
              <ArrowRight size={15} aria-hidden="true" className="rtl:rotate-180" />
            </button>
          </div>

          {!collapsed && (
            <>
              <p className="mt-3 hidden text-xs text-ink-muted sm:block">{t('playground.hint')}</p>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={showFps}
                  onChange={(e) => setShowFps(e.target.checked)}
                />
                {t('playground.fps')}
              </label>
            </>
          )}
        </section>
      </CanvasStage>
    </div>
  );
}
