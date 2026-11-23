import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigateReplace } from '../app/router';
import { CanvasStage, type CanvasHandle, type SafeArea } from '../canvas/CanvasStage';
import { APP_NAME } from '../config';
import type { Lesson } from '../content/types';
import { useMedia } from '../lib/useMedia';
import { usePrefs } from '../store/prefs';
import { useProgress } from '../store/progress';
import { BottomSheet } from './BottomSheet';
import { Confetti } from './Confetti';
import { CourseTree } from './CourseTree';
import { lessonPlace } from './data';
import { announceStep, deriveChanges } from './format';
import { Hud } from './Hud';
import { LessonHeader } from './LessonHeader';
import { ShortcutSheet } from './ShortcutSheet';
import { Objectives, StepBody, StepNav } from './StepPanel';
import './learn.css';

const TREE_W = 280;
const PANEL_W = 360;
const GAP = 12;

/** Keys the canvas handles itself when focus is on a block or the pane. */
const CANVAS_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  ' ',
  'r',
  'R',
  'l',
  'L',
  'm',
  'M',
  't',
  'T',
  'Enter',
  'Escape',
  '+',
  '=',
  '-',
  '_',
  '0',
  '1',
]);

export function LessonPlayer({ lesson, stepIndex }: { lesson: Lesson; stepIndex: number }) {
  const { t, i18n } = useTranslation();
  const place = lessonPlace(lesson.id)!;
  const wide = useMedia('(min-width: 1200px)');
  const tablet = useMedia('(min-width: 768px)');
  const panels = usePrefs((s) => s.panels);
  const setPanels = usePrefs((s) => s.setPanels);
  const isDone = useProgress((s) => s.done.includes(lesson.id));
  const markDone = useProgress((s) => s.markDone);
  const visit = useProgress((s) => s.visit);

  const [focus, setFocus] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [compactHead, setCompactHead] = useState(false);
  const [help, setHelp] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [railH, setRailH] = useState(120);
  const [confetti, setConfetti] = useState(0);
  const canvas = useRef<CanvasHandle>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex]!;
  const scenes = useMemo(() => lesson.steps.map((s) => s.scene), [lesson]);
  const changes = useMemo(
    () =>
      deriveChanges(
        lesson.hud,
        lesson.steps[stepIndex - 1]?.scene.hud,
        step.scene.hud,
        i18n.language,
      ),
    [lesson, stepIndex, step, i18n.language],
  );

  const treeDocked = wide && panels.left && !focus;
  const stepDocked = tablet && panels.right && !focus;

  const go = useCallback(
    (i: number) => {
      const c = Math.max(0, Math.min(total - 1, i));
      navigateReplace(`#/learn/${lesson.id}/${c + 1}`);
    },
    [lesson.id, total],
  );

  // Progress: remember the place; finishing the recap completes the lesson (AC-L4, AC-L5).
  useEffect(() => {
    visit(lesson.id, stepIndex + 1);
    if (step.type === 'recap' && !useProgress.getState().done.includes(lesson.id)) {
      markDone(lesson.id);
      setConfetti((n) => n + 1);
    }
  }, [lesson.id, stepIndex, step.type, visit, markDone]);

  useEffect(() => {
    document.title = `${step.title} · ${lesson.title} · ${APP_NAME}`;
  }, [step.title, lesson.title]);

  const toggleTree = useCallback(() => {
    if (wide) setPanels({ left: !usePrefs.getState().panels.left });
    else setDrawer((d) => !d);
  }, [wide, setPanels]);

  // Page-level shortcuts (PRD §7.5). Keys aimed at the canvas are left to the canvas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('input, textarea, select, [role="dialog"], [role="menu"]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const inCanvas = !!el?.closest('.sc-flow');
      const k = e.key;
      if (k === '?') return setHelp(true);
      if (k === 'f' || k === 'F') return setFocus((f) => !f);
      if (k === '[') return toggleTree();
      if (k === ']') return tablet && setPanels({ right: !usePrefs.getState().panels.right });
      if (k === 'Escape' && focus) return setFocus(false);
      if (inCanvas && CANVAS_KEYS.has(k)) return;
      // Buttons and links keep their own Space / Enter.
      const onControl = !!el?.closest('button, a, [role="button"]');
      const rtl = document.documentElement.dir === 'rtl';
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        e.preventDefault();
        go(stepIndex + ((k === 'ArrowRight') !== rtl ? 1 : -1));
      } else if (k === ' ' && !onControl) {
        e.preventDefault();
        canvas.current?.togglePause();
      } else if (k === 'r') canvas.current?.replay();
      else if (k === 'R' && e.shiftKey) canvas.current?.requestReset();
      else if (k === 'm' || k === 'M') canvas.current?.toggleMinimap();
      else if (k === 't' || k === 'T') canvas.current?.toggleText();
      else if (k === 'l' || k === 'L') canvas.current?.toggleLock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, stepIndex, focus, tablet, setPanels, toggleTree]);

  // The header/HUD rail height decides where the canvas may draw.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRailH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const leftDock = treeDocked ? TREE_W + GAP * 2 : 0;
  const rightDock = stepDocked ? PANEL_W + GAP * 2 : 0;
  const safeArea: Partial<SafeArea> = {
    left: leftDock + 16,
    right: rightDock + 16,
    top: railH + GAP * 2,
    bottom: (tablet ? 0 : sheetH) + 64,
  };
  const chromeInsets = { left: leftDock, right: rightDock, bottom: tablet ? 0 : sheetH };

  const announce = announceStep(
    step,
    t('learn.stepOf', { n: stepIndex + 1, total }),
    changes,
    step.changes,
  );
  const stepProps = { lesson, index: stepIndex, place, changes, done: isDone, onGo: go };

  return (
    <div className="fixed inset-x-0 bottom-0 top-14">
      <CanvasStage
        sceneKey={lesson.id}
        scenes={scenes}
        stepIndex={stepIndex}
        announce={announce}
        safeArea={safeArea}
        chromeInsets={chromeInsets}
        controlRef={canvas}
        onInteract={() => setCompactHead(true)}
      >
        <div
          ref={railRef}
          className="sc-rail"
          style={{ insetInlineStart: leftDock + GAP, insetInlineEnd: rightDock + GAP }}
        >
          {!focus && (
            <LessonHeader
              lesson={lesson}
              place={place}
              compact={compactHead || !tablet}
              treeOpen={wide ? panels.left : drawer}
              onToggleTree={toggleTree}
            />
          )}
          <Hud defs={lesson.hud} values={step.scene.hud} />
        </div>

        {treeDocked && (
          <aside className="sc-dock sc-dock-left panel glass" style={{ width: TREE_W }}>
            <CourseTree currentId={lesson.id} />
          </aside>
        )}

        {stepDocked && (
          <aside
            className="sc-dock sc-dock-right panel glass"
            style={{ width: PANEL_W }}
            aria-labelledby="sc-step-title"
          >
            <div className="sc-dock-scroll">
              <StepBody {...stepProps} />
              <hr className="my-4 border-line" />
              <Objectives lesson={lesson} index={stepIndex} done={isDone} />
            </div>
          </aside>
        )}

        {tablet && !stepDocked && (
          <div className="sc-pill panel glass">
            <button
              type="button"
              className="sc-pill-step"
              onClick={() => (focus ? setFocus(false) : setPanels({ right: true }))}
            >
              <Maximize2 size={14} aria-hidden="true" />
              <span className="tabular">
                {stepIndex + 1}/{total}
              </span>
              <span className="max-w-[16rem] truncate">{step.title}</span>
              {/* Name = visible text + what the button does (WCAG 2.5.3). */}
              <span className="sr-only">
                , {focus ? t('learn.exitFocus') : t('learn.showStep', { n: stepIndex + 1, total })}
              </span>
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary"
              disabled={stepIndex === total - 1}
              onClick={() => go(stepIndex + 1)}
            >
              {t('learn.next')}{' '}
              <ArrowRight size={14} aria-hidden="true" className="rtl:rotate-180" />
            </button>
          </div>
        )}

        {!tablet && (
          <BottomSheet onHeight={setSheetH} footer={<StepNav {...stepProps} sticky={false} />}>
            <StepBody {...stepProps} compact />
            <hr className="my-4 border-line" />
            <Objectives lesson={lesson} index={stepIndex} done={isDone} />
          </BottomSheet>
        )}

        <Confetti fire={confetti} />
      </CanvasStage>

      {!wide && (
        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
            <Dialog.Content
              aria-describedby={undefined}
              className="animate-drawer-in fixed inset-y-0 start-0 z-50 w-[min(86vw,320px)] border-e border-line bg-surface shadow-pop"
              onClick={(e) => (e.target as Element).closest('a') && setDrawer(false)}
            >
              <Dialog.Title className="sr-only">{t('learn.course')}</Dialog.Title>
              <Dialog.Close
                className="sc-icon-btn absolute end-2 top-2 z-10"
                aria-label={t('canvas.close')}
              >
                <X size={16} aria-hidden="true" />
              </Dialog.Close>
              <CourseTree currentId={lesson.id} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <ShortcutSheet open={help} onOpenChange={setHelp} />
    </div>
  );
}
