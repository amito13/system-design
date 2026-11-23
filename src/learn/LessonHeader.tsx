import { Clock, ListTree, Signal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Lesson } from '../content/types';
import type { LessonPlace } from './data';

interface Props {
  lesson: Lesson;
  place: LessonPlace;
  compact: boolean;
  treeOpen: boolean;
  onToggleTree: () => void;
}

/** Floating lesson header (PRD §7.2); shrinks to one line after the first canvas interaction. */
export function LessonHeader({ lesson, place, compact, treeOpen, onToggleTree }: Props) {
  const { t } = useTranslation();
  return (
    <header className={`sc-lesson-head panel glass ${compact ? 'is-compact' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggleTree}
          aria-expanded={treeOpen}
          aria-keyshortcuts="["
          aria-label={t('learn.toggleTree')}
          title={`${t('learn.toggleTree')} ([)`}
          className="sc-icon-btn mt-0.5"
        >
          <ListTree size={16} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] text-ink-muted">
            {place.module.num}. {place.module.title} /{' '}
            {t('learn.lessonOf', {
              n: place.indexInModule + 1,
              total: place.module.lessons.length,
            })}
          </p>
          <h1
            className={`truncate font-bold ${compact ? 'text-lg' : 'text-[1.6rem] leading-tight'}`}
          >
            {lesson.title}
          </h1>
          {!compact && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="sc-chip">
                  <Clock size={12} aria-hidden="true" /> {t('learn.minutes', { n: lesson.minutes })}
                </span>
                <span className="sc-chip">
                  <Signal size={12} aria-hidden="true" /> {t(`learn.level.${lesson.level}`)}
                </span>
                <span className="sc-chip">{t('learn.steps', { n: lesson.steps.length })}</span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{lesson.subtitle}</p>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
