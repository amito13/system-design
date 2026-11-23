import curriculumJson from '../../content/curriculum.json';
import glossaryJson from '../../content/glossary.json';
import { resolveLesson } from '../content/resolve';
import type {
  Curriculum,
  CurriculumLesson,
  Glossary,
  Lesson,
  Module,
  RawLesson,
} from '../content/types';

export const curriculum = curriculumJson as Curriculum;
export const glossary = glossaryJson as Glossary;

/** One lazy chunk per lesson file (PRD §12.5: lessons are code-split). */
const loaders = import.meta.glob<RawLesson>('../../content/lessons/*.json', { import: 'default' });
const loaderById = new Map(
  Object.entries(loaders).map(([path, load]) => [
    path
      .split('/')
      .pop()!
      .replace(/\.json$/, ''),
    load,
  ]),
);

export const authoredLessonIds = new Set(loaderById.keys());

const cache = new Map<string, Lesson>();

export async function loadLesson(id: string): Promise<Lesson | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const load = loaderById.get(id);
  if (!load) return null;
  const lesson = resolveLesson(await load());
  cache.set(id, lesson);
  return lesson;
}

export const allLessons: (CurriculumLesson & { module: Module })[] = curriculum.modules.flatMap(
  (m) => m.lessons.map((l) => ({ ...l, module: m })),
);

export interface LessonPlace {
  module: Module;
  /** 0-based position inside its module. */
  indexInModule: number;
  meta: CurriculumLesson;
  prev: CurriculumLesson | null;
  next: CurriculumLesson | null;
}

export function lessonPlace(id: string): LessonPlace | null {
  const i = allLessons.findIndex((l) => l.id === id);
  if (i < 0) return null;
  const entry = allLessons[i]!;
  return {
    module: entry.module,
    indexInModule: entry.module.lessons.findIndex((l) => l.id === id),
    meta: { id: entry.id, title: entry.title },
    prev: i > 0 ? allLessons[i - 1]! : null,
    next: i < allLessons.length - 1 ? allLessons[i + 1]! : null,
  };
}

export const FIRST_LESSON_ID =
  allLessons.find((l) => authoredLessonIds.has(l.id))?.id ?? allLessons[0]!.id;
