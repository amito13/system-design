import type { SceneEdge, SceneNode } from '../canvas/types';
import type { Lesson, RawLesson, RawScene, Step, StepScene } from './types';

/**
 * Flatten `extends` chains into complete scenes (PRD §7.3, §12.5).
 *
 *  - nodes / edges: upsert by id; a partial entry is merged over the inherited one
 *  - flows / frames / panels: upsert by id (whole object replaced)
 *  - callouts, focus: replaced when the step provides them, otherwise inherited
 *  - hud: merged key by key
 *  - remove: drops nodes/edges/flows/frames/panels by id; edges touching a removed node go too
 *
 * Throws on an unknown or forward `extends`.
 */
export function resolveLesson(raw: RawLesson): Lesson {
  const done = new Map<string, StepScene>();
  const steps: Step[] = raw.steps.map((rs) => {
    let base: StepScene = {
      nodes: [],
      edges: [],
      flows: [],
      callouts: [],
      frames: [],
      panels: [],
      hud: {},
    };
    if (rs.extends) {
      const parent = done.get(rs.extends);
      if (!parent)
        throw new Error(`Step "${rs.id}" extends "${rs.extends}", which is unknown or comes later`);
      base = structuredClone(parent);
    }
    const scene = applyScene(base, rs.scene);
    done.set(rs.id, scene);
    const { extends: _ignored, scene: _raw, ...rest } = rs;
    void _ignored;
    void _raw;
    return { ...rest, scene };
  });
  return { ...raw, steps };
}

function upsert<T extends { id: string }>(
  list: T[],
  patch: (Partial<T> & { id: string })[] | undefined,
  merge: boolean,
): T[] {
  if (!patch) return list;
  const out = [...list];
  for (const p of patch) {
    const i = out.findIndex((x) => x.id === p.id);
    if (i >= 0) out[i] = (merge ? { ...out[i], ...p } : p) as T;
    else out.push(p as T);
  }
  return out;
}

export function applyScene(base: StepScene, raw: RawScene): StepScene {
  const removed = new Set(raw.remove ?? []);
  const keep = <T extends { id?: string }>(xs: T[]) =>
    xs.filter((x) => !x.id || !removed.has(x.id));

  let nodes = upsert<SceneNode>(keep(base.nodes), raw.nodes, true);
  nodes = keep(nodes);
  const nodeIds = new Set(nodes.map((n) => n.id));

  let edges = upsert<SceneEdge>(keep(base.edges ?? []), raw.edges, true);
  edges = keep(edges).filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

  return {
    nodes,
    edges,
    flows: keep(upsert(base.flows ?? [], raw.flows, false)),
    frames: keep(upsert(base.frames ?? [], raw.frames, false)),
    panels: keep(upsert(base.panels ?? [], raw.panels, false)),
    callouts: (raw.callouts ?? base.callouts ?? []).filter((c) => nodeIds.has(c.anchor)),
    hud: { ...base.hud, ...(raw.hud ?? {}) },
    focus: raw.focus ?? base.focus,
  };
}
