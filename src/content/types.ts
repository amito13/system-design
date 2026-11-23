import type {
  Callout,
  CanvasPanel,
  Flow,
  Frame,
  NodeCategory,
  Scene,
  SceneEdge,
  SceneNode,
} from '../canvas/types';

/** Lesson content contract (PRD §7, §12.4). */

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type StepType =
  'setup' | 'problem' | 'solution' | 'technique' | 'tradeoff' | 'insight' | 'recap';
export type CalloutKind = 'insight' | 'warn' | 'tip' | 'next';

export interface HudMetricDef {
  id: string;
  label: string;
  unit?: string;
  /** Which direction counts as an improvement (drives green/red flashes and "what changed"). */
  better: 'lower' | 'higher' | 'none';
  emphasis?: boolean;
  format?: 'int' | 'ms' | 'pct' | 'bytes' | 'text';
}

export type HudValues = Record<string, number | string | null>;

export interface StepScene extends Scene {
  hud: HudValues;
}

export interface StepChange {
  text: string;
  tone?: 'good' | 'bad' | 'neutral';
}

export interface Step {
  id: string;
  type: StepType;
  title: string;
  /** Light markup: paragraphs split by a blank line; **bold**, `code`, [[term]] / [[term|label]]. */
  body: string;
  callout?: { kind: CalloutKind; text: string };
  /** Extra "what changed" lines. Metric changes are derived from the HUD automatically. */
  changes?: StepChange[];
  /** Recap only: the takeaways list. */
  takeaways?: string[];
  scene: StepScene;
}

export interface Objective {
  id: string;
  text: string;
  /** Step id at which the objective counts as covered. */
  coveredAt: string;
}

export interface Lesson {
  id: string;
  module: string;
  title: string;
  subtitle: string;
  level: Level;
  minutes: number;
  objectives: Objective[];
  hud: HudMetricDef[];
  steps: Step[];
}

// ---------- raw (authored) shapes: steps may `extend` an earlier step ----------

type Keyed<T extends { id: string }> = Partial<T> & { id: string };

export interface RawScene {
  nodes?: Keyed<SceneNode>[];
  edges?: Keyed<SceneEdge>[];
  flows?: Flow[];
  /** Replaces the inherited list when present. */
  callouts?: Callout[];
  frames?: Frame[];
  panels?: CanvasPanel[];
  /** Merged over the inherited values. */
  hud?: HudValues;
  /** Replaces the inherited focus when present. */
  focus?: string[];
  /** Ids of nodes / edges / flows / frames / panels to drop from the inherited scene. */
  remove?: string[];
}

export interface RawStep extends Omit<Step, 'scene'> {
  /** Start from this earlier step's resolved scene. */
  extends?: string;
  scene: RawScene;
}

export interface RawLesson extends Omit<Lesson, 'steps'> {
  steps: RawStep[];
}

// ---------- curriculum ----------

export interface CurriculumLesson {
  id: string;
  title: string;
}

export interface Module {
  id: string;
  num: string;
  title: string;
  color: NodeCategory;
  lessons: CurriculumLesson[];
}

export interface Curriculum {
  modules: Module[];
}

export interface GlossaryEntry {
  term: string;
  short: string;
}

export type Glossary = Record<string, GlossaryEntry>;
