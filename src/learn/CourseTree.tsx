import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgress } from '../store/progress';
import { allLessons, authoredLessonIds, curriculum } from './data';

/** Course outline (PRD §5): modules with progress, lessons with done state. */
export function CourseTree({ currentId }: { currentId: string }) {
  const { t } = useTranslation();
  const done = useProgress((s) => s.done);
  const currentModule = allLessons.find((l) => l.id === currentId)?.module.id;
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(currentModule ? [currentModule] : []),
  );
  const doneSet = new Set(done);
  const totalDone = allLessons.filter((l) => doneSet.has(l.id)).length;

  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label={t('learn.course')} className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <h2 className="text-base font-semibold">{t('learn.course')}</h2>
        <span className="font-mono text-[11px] text-ink-muted">
          {t('learn.lessonsCount', { n: allLessons.length })}
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {curriculum.modules.map((m) => {
          const isOpen = open.has(m.id);
          const modDone = m.lessons.filter((l) => doneSet.has(l.id)).length;
          return (
            <li key={m.id}>
              <button
                type="button"
                className="sc-tree-module"
                aria-expanded={isOpen}
                aria-controls={`tree-${m.id}`}
                onClick={() => toggle(m.id)}
              >
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform rtl:rotate-180 ${isOpen ? 'rotate-90 rtl:rotate-90' : ''}`}
                />
                <span
                  className="sc-tree-swatch"
                  style={{ background: `var(--cat-${m.color})` }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-start">
                  <span className="font-mono text-[11px] text-ink-muted">{m.num}.</span> {m.title}
                </span>
                <span
                  className="font-mono text-[11px] text-ink-muted"
                  aria-label={`${modDone} / ${m.lessons.length}`}
                >
                  {modDone}/{m.lessons.length}
                </span>
              </button>
              <ul
                id={`tree-${m.id}`}
                hidden={!isOpen}
                className="mb-1 ms-5 border-s border-line ps-2"
              >
                {m.lessons.map((l) => {
                  const current = l.id === currentId;
                  const ready = authoredLessonIds.has(l.id);
                  const isDone = doneSet.has(l.id);
                  return (
                    <li key={l.id}>
                      <a
                        href={`#/learn/${l.id}/1`}
                        aria-current={current ? 'page' : undefined}
                        className={`sc-tree-lesson ${current ? 'is-current' : ''} ${ready ? '' : 'is-soon'}`}
                      >
                        <span className={`sc-check ${isDone ? 'is-on' : ''}`} aria-hidden="true">
                          {isDone && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        {!ready && (
                          <span className="font-mono text-[10px] uppercase text-ink-muted">
                            {t('learn.soon')}
                          </span>
                        )}
                        {isDone && <span className="sr-only">({t('learn.completed')})</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono uppercase tracking-wider text-ink-muted">
            {t('learn.progress')}
          </span>
          <span className="tabular font-semibold">
            {totalDone} / {allLessons.length}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t('learn.progress')}
          aria-valuemin={0}
          aria-valuemax={allLessons.length}
          aria-valuenow={totalDone}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(totalDone / allLessons.length) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
