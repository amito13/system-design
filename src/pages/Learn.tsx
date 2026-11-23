import { ArrowRight, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigateReplace } from '../app/router';
import { Chip, Panel } from '../components/Panel';
import type { Lesson } from '../content/types';
import { authoredLessonIds, FIRST_LESSON_ID, lessonPlace, loadLesson } from '../learn/data';
import { LessonPlayer } from '../learn/LessonPlayer';
import { useProgress } from '../store/progress';
import { NotFound } from './NotFound';

/** `#/learn[/:lessonId[/:step]]` (PRD §3). */
export function Learn({ lessonId, step }: { lessonId: string | null; step: number }) {
  const { t } = useTranslation();
  const last = useProgress((s) => s.last);
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);

  // `#/learn` → where you left off, or lesson 1.
  useEffect(() => {
    if (lessonId) return;
    const target =
      last && authoredLessonIds.has(last.lessonId) ? last : { lessonId: FIRST_LESSON_ID, step: 1 };
    navigateReplace(`#/learn/${target.lessonId}/${target.step}`);
  }, [lessonId, last]);

  useEffect(() => {
    let alive = true;
    setLesson(undefined);
    if (lessonId) void loadLesson(lessonId).then((l) => alive && setLesson(l));
    return () => {
      alive = false;
    };
  }, [lessonId]);

  // A step past the end goes to the last step.
  useEffect(() => {
    if (lesson && step > lesson.steps.length)
      navigateReplace(`#/learn/${lesson.id}/${lesson.steps.length}`);
  }, [lesson, step]);

  if (!lessonId) return <div className="min-h-[calc(100dvh-3.5rem)]" aria-busy="true" />;
  const place = lessonPlace(lessonId);
  if (!place) return <NotFound path={`/learn/${lessonId}`} />;

  if (!authoredLessonIds.has(lessonId)) {
    return (
      <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-10">
        <Panel className="glass animate-pop-in w-full max-w-lg p-6 sm:p-8">
          <Chip tone="warn">
            {place.module.num}. {place.module.title}
          </Chip>
          <h1 className="mt-4 text-3xl font-bold">{place.meta.title}</h1>
          <p className="mt-2 font-semibold">{t('learn.comingTitle')}</p>
          <p className="mt-1 text-ink-muted">{t('learn.comingBody')}</p>
          <a
            href={`#/learn/${FIRST_LESSON_ID}/1`}
            className="sc-btn sc-btn-primary mt-6 inline-flex"
          >
            <BookOpen size={16} aria-hidden="true" /> {t('learn.startFirst')}
            <ArrowRight size={16} aria-hidden="true" className="rtl:rotate-180" />
          </a>
        </Panel>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center" aria-busy="true">
        <p className="text-ink-muted">{t('learn.loading')}</p>
      </div>
    );
  }

  const index = Math.min(Math.max(step, 1), lesson.steps.length) - 1;
  return <LessonPlayer lesson={lesson} stepIndex={index} />;
}
