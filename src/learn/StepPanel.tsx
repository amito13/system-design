import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalloutKind, Lesson, StepType } from '../content/types';
import type { LessonPlace } from './data';
import { authoredLessonIds } from './data';
import type { MetricChange } from './format';
import { RichInline, RichText } from './RichText';

const CALLOUT_ICON: Record<CalloutKind, LucideIcon> = {
  insight: Sparkles,
  warn: TriangleAlert,
  tip: Lightbulb,
  next: ArrowRight,
};

export const STEP_TONE: Record<StepType, string> = {
  setup: 'var(--ink-muted)',
  problem: 'var(--bad)',
  solution: 'var(--ok)',
  technique: 'var(--accent)',
  tradeoff: 'var(--warn)',
  insight: 'var(--info)',
  recap: 'var(--ink)',
};

export function StepBadge({ type }: { type: StepType }) {
  const { t } = useTranslation();
  return (
    <span className="sc-step-badge" style={{ ['--tone' as string]: STEP_TONE[type] }}>
      {t(`learn.type.${type}`)}
    </span>
  );
}

/** Step dots (PRD §5 timeline). Lives at the top of the step panel; see DECISIONS D33. */
export function Timeline({
  lesson,
  index,
  onGo,
}: {
  lesson: Lesson;
  index: number;
  onGo: (i: number) => void;
}) {
  const { t } = useTranslation();
  const total = lesson.steps.length;
  return (
    <nav aria-label={t('learn.inThisLesson')} className="sc-timeline">
      <ol>
        {lesson.steps.map((s, i) => (
          <li key={s.id} className={i < index ? 'is-past' : i === index ? 'is-current' : undefined}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`${t('learn.stepOf', { n: i + 1, total })}: ${s.title}`}
              title={s.title}
            >
              <span aria-hidden="true">{i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface StepPanelProps {
  lesson: Lesson;
  index: number;
  place: LessonPlace;
  changes: MetricChange[];
  done: boolean;
  onGo: (i: number) => void;
  /** Rendered in a phone bottom sheet: no checklist, compact footer. */
  compact?: boolean;
}

export function StepBody({ lesson, index, place, changes, done, onGo, compact }: StepPanelProps) {
  const { t } = useTranslation();
  const step = lesson.steps[index]!;
  const total = lesson.steps.length;
  const isRecap = step.type === 'recap';
  const CalloutIcon = step.callout ? CALLOUT_ICON[step.callout.kind] : null;
  const extra = step.changes ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-semibold tracking-wider text-ink-muted">
          {t('learn.stepOf', { n: index + 1, total }).toUpperCase()}
        </p>
        <StepBadge type={step.type} />
      </div>
      <Timeline lesson={lesson} index={index} onGo={onGo} />

      <h2 className="mt-3 text-[1.35rem] font-bold" id="sc-step-title">
        {step.title}
      </h2>
      <RichText text={step.body} className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted" />

      {step.callout && CalloutIcon && (
        <aside
          className={`sc-callout-box sc-callout-${step.callout.kind}`}
          aria-label={t(`learn.callout.${step.callout.kind}`)}
        >
          <span className="sc-callout-icon" aria-hidden="true">
            <CalloutIcon size={15} />
          </span>
          <div>
            <p className="sc-callout-title">{t(`learn.callout.${step.callout.kind}`)}</p>
            <p className="mt-0.5 text-sm text-ink">
              <RichInline text={step.callout.text} />
            </p>
          </div>
        </aside>
      )}

      {(changes.length > 0 || extra.length > 0) && (
        <section className="mt-4" aria-labelledby="sc-changes">
          <h3 id="sc-changes" className="sc-mini-head">
            {t('learn.whatChanged')}
          </h3>
          <ul className="mt-1.5 space-y-1 text-sm">
            {extra.map((c) => (
              <li key={c.text} className={`sc-change tone-${c.tone ?? 'neutral'}`}>
                <span className="sc-change-dot" aria-hidden="true" />
                {c.text}
              </li>
            ))}
            {changes.map((c) => {
              const Arrow = c.direction === 'up' ? ArrowUpRight : ArrowDownRight;
              return (
                <li key={c.id} className={`sc-change tone-${c.tone}`}>
                  <Arrow size={14} aria-hidden="true" className="shrink-0" />
                  <span>
                    {c.label} <span className="tabular">{c.from}</span> →{' '}
                    <span className="tabular font-semibold">{c.to}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isRecap && step.takeaways && (
        <section className="mt-4" aria-labelledby="sc-takeaways">
          <h3 id="sc-takeaways" className="sc-mini-head">
            {t('learn.takeaways')}
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-sm text-ink">
            {step.takeaways.map((k) => (
              <li key={k} className="flex gap-2">
                <CircleCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ok" />
                <span>
                  <RichInline text={k} />
                </span>
              </li>
            ))}
          </ul>
          {done && (
            <p className="mt-3 text-sm font-semibold text-ok" role="status">
              {t('learn.lessonDone')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`#/practice/lesson/${lesson.id}`} className="sc-btn sc-btn-quiet">
              <GraduationCap size={15} aria-hidden="true" /> {t('learn.quiz')}
            </a>
            <a href="#/lab/new" className="sc-btn sc-btn-quiet" data-seed-lesson={lesson.id}>
              <FlaskConical size={15} aria-hidden="true" /> {t('learn.openLab')}
            </a>
          </div>
        </section>
      )}

      {!compact && <StepNav lesson={lesson} index={index} place={place} onGo={onGo} />}
    </>
  );
}

export function StepNav({
  lesson,
  index,
  place,
  onGo,
  sticky = true,
}: {
  lesson: Lesson;
  index: number;
  place: LessonPlace;
  onGo: (i: number) => void;
  sticky?: boolean;
}) {
  const { t } = useTranslation();
  const total = lesson.steps.length;
  const last = index === total - 1;
  const next = lesson.steps[index + 1];
  const nextLesson = place.next;
  const nextLessonReady = nextLesson && authoredLessonIds.has(nextLesson.id);

  return (
    <div className={sticky ? 'sc-step-nav' : 'mt-4'}>
      <div className="flex gap-2">
        <button
          type="button"
          className="sc-btn sc-btn-quiet"
          disabled={index === 0}
          onClick={() => onGo(index - 1)}
        >
          <ArrowLeft size={15} aria-hidden="true" className="rtl:rotate-180" />
          {t('learn.back')}
        </button>
        {!last ? (
          <button
            type="button"
            className="sc-btn sc-btn-primary flex-1"
            onClick={() => onGo(index + 1)}
            data-next
          >
            <span className="truncate">{t('learn.nextStep', { title: next!.title })}</span>
            <ArrowRight size={15} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
          </button>
        ) : nextLesson ? (
          <a href={`#/learn/${nextLesson.id}/1`} className="sc-btn sc-btn-primary flex-1" data-next>
            <span className="truncate">
              {t('learn.nextLesson', { title: nextLesson.title })}
              {!nextLessonReady && ` (${t('learn.soon')})`}
            </span>
            <ArrowRight size={15} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
          </a>
        ) : (
          <a href="#/" className="sc-btn sc-btn-primary flex-1">
            {t('learn.finish')}
          </a>
        )}
      </div>
      <p className="mt-2 hidden items-center gap-1.5 text-[11px] text-ink-muted sm:flex">
        <kbd>←</kbd>
        <kbd>→</kbd> {t('learn.shortcutHint')} · <kbd>R</kbd> {t('learn.replayHint')} ·{' '}
        <kbd>Space</kbd> {t('learn.pauseHint')} · <kbd>?</kbd> {t('learn.moreHint')}
      </p>
    </div>
  );
}

export function Objectives({
  lesson,
  index,
  done,
}: {
  lesson: Lesson;
  index: number;
  done: boolean;
}) {
  const { t } = useTranslation();
  const at = (stepId: string) => lesson.steps.findIndex((s) => s.id === stepId);
  return (
    <section aria-labelledby="sc-objectives">
      <h3 id="sc-objectives" className="sc-mini-head">
        {t('learn.youllLearn')}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {lesson.objectives.map((o) => {
          const covered = done || index >= at(o.coveredAt);
          return (
            <li key={o.id} className={`flex gap-2 ${covered ? 'text-ink' : 'text-ink-muted'}`}>
              <span className={`sc-check ${covered ? 'is-on' : ''}`} aria-hidden="true">
                {covered ? '✓' : ''}
              </span>
              <span>
                {o.text}
                <span className="sr-only">{covered ? ` (${t('learn.completed')})` : ''}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
