import { z } from 'zod';
import { CATALOG } from '../canvas/catalog';
import { overlaps, rectAt } from '../canvas/layout';
import { resolveLesson } from './resolve';
import { termsIn } from './richtext';
import type { Curriculum, Glossary, Lesson, RawLesson } from './types';

/**
 * Content validation (PRD §12.5, AC-L1). Used by the test suite / CI only — never shipped in the
 * app bundle. Returns human-readable problems; an empty list means the lesson is valid.
 */

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const id = z.string().regex(ID, 'ids are lowercase-kebab');
const vec = z.object({ x: z.number(), y: z.number() }).strict();
const nodeState = z.enum([
  'idle',
  'active',
  'busy',
  'overloaded',
  'down',
  'recovering',
  'highlighted',
  'dimmed',
]);
const packetKind = z.enum(['request', 'response', 'event', 'error', 'handshake', 'heavy']);
const hudValue = z.union([z.number(), z.string(), z.null()]);

const rawNode = z
  .object({
    id,
    kind: z.string().optional(),
    label: z.string().min(1).max(32).optional(),
    pos: vec.optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    state: nodeState.optional(),
    load: z.number().min(0).max(1).optional(),
    badge: z.string().max(24).optional(),
    count: z.number().int().min(1).max(24).optional(),
  })
  .strict();

const rawEdge = z
  .object({
    id,
    from: z.string().optional(),
    to: z.string().optional(),
    style: z.enum(['orthogonal', 'straight', 'curved']).optional(),
    dashed: z.boolean().optional(),
    arrow: z.enum(['none', 'end', 'both']).optional(),
    label: z.string().max(24).optional(),
    status: z.enum(['normal', 'degraded', 'cut']).optional(),
  })
  .strict();

const hop = z.union([
  z.string().regex(/^[a-z0-9$][a-z0-9-]*>[a-z0-9$][a-z0-9-]*$/, 'hop must look like "a>b"'),
  z
    .object({
      from: z.string(),
      to: z.array(z.string()).min(1),
      algo: z.enum(['roundRobin', 'leastConn', 'random', 'hash']),
    })
    .strict(),
]);

const flow = z
  .object({
    id,
    hops: z.array(hop).min(1),
    packet: z.union([packetKind, z.array(packetKind).min(1)]),
    rate: z.number().positive().max(40),
    speed: z.number().positive().optional(),
    dwellMs: z.number().min(0).max(5000).optional(),
  })
  .strict();

const callout = z
  .object({
    id: id.optional(),
    anchor: z.string(),
    offset: vec,
    icon: z.string().optional(),
    text: z.string().min(1).max(48),
    tone: z.enum(['neutral', 'ok', 'warn', 'bad']).optional(),
  })
  .strict();

const frame = z
  .object({ id, label: z.string().min(1).max(24), members: z.array(z.string()).min(1) })
  .strict();

const panel = z
  .object({
    id,
    anchor: z.string().optional(),
    offset: vec.optional(),
    pos: vec.optional(),
    title: z.string().min(1).max(40),
    rows: z
      .array(z.tuple([z.string(), z.string()]))
      .min(1)
      .max(10),
    highlightRow: z.number().int().min(0).optional(),
    note: z.string().max(80).optional(),
  })
  .strict();

const rawScene = z
  .object({
    nodes: z.array(rawNode).optional(),
    edges: z.array(rawEdge).optional(),
    flows: z.array(flow).optional(),
    callouts: z.array(callout).optional(),
    frames: z.array(frame).optional(),
    panels: z.array(panel).optional(),
    hud: z.record(z.string(), hudValue).optional(),
    focus: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional(),
  })
  .strict();

const step = z
  .object({
    id,
    type: z.enum(['setup', 'problem', 'solution', 'technique', 'tradeoff', 'insight', 'recap']),
    title: z.string().min(1).max(60),
    body: z.string().min(1).max(900),
    callout: z
      .object({
        kind: z.enum(['insight', 'warn', 'tip', 'next']),
        text: z.string().min(1).max(260),
      })
      .strict()
      .optional(),
    changes: z
      .array(
        z
          .object({
            text: z.string().min(1).max(90),
            tone: z.enum(['good', 'bad', 'neutral']).optional(),
          })
          .strict(),
      )
      .optional(),
    takeaways: z.array(z.string().min(1).max(140)).min(2).max(6).optional(),
    extends: id.optional(),
    scene: rawScene,
  })
  .strict();

const lessonSchema = z
  .object({
    id,
    module: id,
    title: z.string().min(1).max(48),
    subtitle: z.string().min(1).max(140),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    minutes: z.number().int().min(5).max(20),
    objectives: z
      .array(z.object({ id, text: z.string().min(1).max(80), coveredAt: id }).strict())
      .min(2)
      .max(6),
    hud: z
      .array(
        z
          .object({
            id,
            label: z.string().min(1).max(24),
            unit: z.string().max(8).optional(),
            better: z.enum(['lower', 'higher', 'none']),
            emphasis: z.boolean().optional(),
            format: z.enum(['int', 'ms', 'pct', 'bytes', 'text']).optional(),
          })
          .strict(),
      )
      .max(6),
    steps: z.array(step).min(8).max(14),
  })
  .strict();

function zodProblems(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

export interface ValidateOptions {
  fileName?: string;
  curriculum?: Curriculum;
  glossary?: Glossary;
}

export function validateLesson(
  raw: unknown,
  opts: ValidateOptions = {},
): { problems: string[]; lesson?: Lesson } {
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) return { problems: zodProblems(parsed.error) };
  const rawLesson = parsed.data as RawLesson;
  const problems: string[] = [];
  const p = (msg: string) => problems.push(msg);

  if (opts.fileName && opts.fileName !== `${rawLesson.id}.json`)
    p(`file name should be ${rawLesson.id}.json`);
  if (opts.curriculum) {
    const mod = opts.curriculum.modules.find((m) => m.id === rawLesson.module);
    if (!mod) p(`module "${rawLesson.module}" is not in curriculum.json`);
    else if (!mod.lessons.some((l) => l.id === rawLesson.id))
      p(`lesson is not listed under module "${mod.id}" in curriculum.json`);
  }

  const stepIds = rawLesson.steps.map((s) => s.id);
  new Set(stepIds).size !== stepIds.length && p('step ids must be unique');
  const seen = new Set<string>();
  for (const s of rawLesson.steps) {
    if (s.extends && !seen.has(s.extends))
      p(`step ${s.id}: extends "${s.extends}", which is unknown or later`);
    seen.add(s.id);
  }
  const last = rawLesson.steps[rawLesson.steps.length - 1]!;
  if (last.type !== 'recap') p('the last step must be a recap');
  if (!last.takeaways) p('the recap step needs takeaways');
  rawLesson.steps
    .slice(0, -1)
    .forEach((s) => s.type === 'recap' && p(`step ${s.id}: only the last step may be a recap`));

  const objIds = rawLesson.objectives.map((o) => o.id);
  new Set(objIds).size !== objIds.length && p('objective ids must be unique');
  rawLesson.objectives.forEach(
    (o) =>
      !stepIds.includes(o.coveredAt) &&
      p(`objective ${o.id}: coveredAt "${o.coveredAt}" is not a step`),
  );

  if (problems.length) return { problems };

  let lesson: Lesson;
  try {
    lesson = resolveLesson(rawLesson);
  } catch (e) {
    return { problems: [(e as Error).message] };
  }

  const hudIds = new Set(lesson.hud.map((h) => h.id));
  for (const s of lesson.steps) {
    const where = `step ${s.id}`;
    const sc = s.scene;
    const nodeIds = new Set<string>();
    for (const n of sc.nodes) {
      if (nodeIds.has(n.id)) p(`${where}: duplicate node "${n.id}"`);
      nodeIds.add(n.id);
      if (!n.kind || !CATALOG[n.kind]) p(`${where}: node "${n.id}" has unknown kind "${n.kind}"`);
      if (!n.label) p(`${where}: node "${n.id}" needs a label`);
      if (!n.pos) p(`${where}: node "${n.id}" needs a pos`);
    }
    const pairs = new Set<string>();
    for (const e of sc.edges ?? []) {
      if (!e.from || !e.to) p(`${where}: edge "${e.id}" needs from and to`);
      else pairs.add(`${e.from}>${e.to}`).add(`${e.to}>${e.from}`);
    }
    const linked = (a: string, b: string) => pairs.has(`${a}>${b}`);
    for (const f of sc.flows ?? []) {
      let picked = false;
      f.hops.forEach((h, i) => {
        if (typeof h === 'string') {
          const [a = '', b = ''] = h.split('>');
          for (const end of [a, b]) {
            if (end === '$' && !picked)
              p(`${where}: flow "${f.id}" hop ${i} uses "$" before any group hop`);
            if (end !== '$' && !nodeIds.has(end))
              p(`${where}: flow "${f.id}" hop ${i} names unknown node "${end}"`);
          }
          if (a !== '$' && b !== '$' && !linked(a, b))
            p(`${where}: flow "${f.id}" hop ${i} "${h}" has no edge`);
        } else {
          if (h.from !== '$' && !nodeIds.has(h.from))
            p(`${where}: flow "${f.id}" hop ${i} names unknown node "${h.from}"`);
          for (const t of h.to) {
            if (!nodeIds.has(t)) p(`${where}: flow "${f.id}" hop ${i} names unknown node "${t}"`);
            else if (h.from !== '$' && !linked(h.from, t))
              p(`${where}: flow "${f.id}" hop ${i} has no edge ${h.from}→${t}`);
          }
          picked = true;
        }
      });
      if (Array.isArray(f.packet) && f.packet.length > f.hops.length)
        p(`${where}: flow "${f.id}" lists more packet kinds than hops`);
    }
    for (const c of sc.callouts ?? [])
      if (!nodeIds.has(c.anchor)) p(`${where}: callout anchor "${c.anchor}" is not a node`);
    for (const fr of sc.frames ?? [])
      fr.members.forEach(
        (m) => !nodeIds.has(m) && p(`${where}: frame "${fr.id}" member "${m}" is not a node`),
      );
    for (const pn of sc.panels ?? []) {
      if (pn.anchor && !nodeIds.has(pn.anchor))
        p(`${where}: panel "${pn.id}" anchor "${pn.anchor}" is not a node`);
      if (!pn.anchor && !pn.pos) p(`${where}: panel "${pn.id}" needs an anchor or a pos`);
      if (pn.highlightRow !== undefined && pn.highlightRow >= pn.rows.length)
        p(`${where}: panel "${pn.id}" highlightRow is out of range`);
    }
    for (const fid of sc.focus ?? [])
      if (!nodeIds.has(fid)) p(`${where}: focus "${fid}" is not a node`);
    for (const k of Object.keys(sc.hud))
      if (!hudIds.has(k)) p(`${where}: hud key "${k}" is not defined in lesson.hud`);

    // Authored blocks must not overlap (they'd be unreadable before anyone drags them).
    const rects = sc.nodes
      .filter((n) => n.pos && n.kind)
      .map((n) => ({ id: n.id, r: rectAt(n, n.pos) }));
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        if (overlaps(rects[i]!.r, rects[j]!.r))
          p(`${where}: blocks "${rects[i]!.id}" and "${rects[j]!.id}" overlap`);

    if (opts.glossary) {
      const texts = [s.body, s.callout?.text ?? '', ...(s.takeaways ?? [])];
      for (const term of texts.flatMap(termsIn))
        if (!opts.glossary[term]) p(`${where}: glossary term "${term}" is not defined`);
    }
  }
  return { problems, lesson };
}

export function validateCurriculum(c: Curriculum): string[] {
  const problems: string[] = [];
  const mods = c.modules.map((m) => m.id);
  if (new Set(mods).size !== mods.length) problems.push('module ids must be unique');
  const lessons = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
  if (new Set(lessons).size !== lessons.length)
    problems.push('lesson ids must be unique across modules');
  for (const l of c.modules.flatMap((m) => m.lessons))
    if (!ID.test(l.id)) problems.push(`bad lesson id "${l.id}"`);
  return problems;
}
