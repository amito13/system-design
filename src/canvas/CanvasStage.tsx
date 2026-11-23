import '@xyflow/react/dist/base.css';
import './canvas.css';

import {
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type NodeChangeset,
  type OnNodeDrag,
  type Viewport,
  getViewportForBounds,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { CanvasToolbar } from './CanvasToolbar';
import { kindDef, nodeBox } from './catalog';
import { AnimationClock } from './clock';
import { CanvasContext, useMotionLevel, type CanvasCtx } from './context';
import { DiagramAsText } from './DiagramAsText';
import { DataEdge, type DataRFEdge } from './edges/DataEdge';
import { FlowEngine } from './flows';
import { MoveHistory } from './history';
import { IsoGrid } from './IsoGrid';
import {
  alignmentGuides,
  findFreeSpot,
  layoutFor,
  loadCamera,
  loadOverrides,
  rectAt,
  saveCamera,
  saveOverrides,
  type Guides,
} from './layout';
import { FrameNode, type FrameRFNode } from './nodes/FrameNode';
import { IsoNode, type IsoRFNode } from './nodes/IsoNode';
import { Overlays } from './Overlays';
import { PacketLayer } from './PacketLayer';
import type { LayoutOverrides, Scene, SceneEdge, SceneNode, Vec } from './types';
import { useTouchGestures } from './useTouchGestures';

type AnyNode = IsoRFNode | FrameRFNode;

const nodeTypes = { iso: IsoNode, frame: FrameNode };
const edgeTypes = { data: DataEdge };
const NODE_ORIGIN: [number, number] = [0.5, 0.5];
const SNAP: [number, number] = [20, 20];
const NO_GUIDES: Guides = { x: null, y: null };

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
/** The toolbar sits along the bottom edge. */
const DEFAULT_SAFE_AREA: SafeArea = { top: 16, right: 16, bottom: 64, left: 16 };

export interface CanvasStageProps {
  /** Persistence key for layout + camera (the lesson id). */
  sceneKey: string;
  scenes: Scene[];
  stepIndex: number;
  /** Short summary announced to screen readers when the step changes. */
  announce?: string;
  showFps?: boolean;
  /** Screen pixels covered by floating UI; the camera fits blocks into the rest. */
  safeArea?: Partial<SafeArea>;
  className?: string;
  /** Extra floating UI (lesson panels, HUD…) rendered over the canvas. */
  children?: ReactNode;
}

export function CanvasStage(props: CanvasStageProps) {
  return (
    <ReactFlowProvider>
      <StageInner {...props} />
    </ReactFlowProvider>
  );
}

const near = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
const round = (v: Vec): Vec => ({ x: Math.round(v.x), y: Math.round(v.y) });

function connectionsOf(scene: Scene | undefined): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of scene?.edges ?? []) {
    m.set(e.from, [...(m.get(e.from) ?? []), e.to]);
    m.set(e.to, [...(m.get(e.to) ?? []), e.from]);
  }
  return m;
}

function StageInner({
  sceneKey,
  scenes,
  stepIndex,
  announce,
  showFps,
  safeArea,
  className = '',
  children,
}: CanvasStageProps) {
  const { t, i18n } = useTranslation();
  const rf = useReactFlow<AnyNode, DataRFEdge>();
  const { zoom } = useViewport();
  const motion = useMotionLevel();
  const scene = scenes[stepIndex];

  const clock = useMemo(() => new AnimationClock(), []);
  useEffect(() => () => clock.dispose(), [clock]);
  const engine = useMemo(() => new FlowEngine([], [], { maxPackets: 300 }), []);

  const [nodes, setNodes] = useState<IsoRFNode[]>([]);
  const [edges, setEdges] = useState<DataRFEdge[]>([]);
  const [locked, setLocked] = useState(false);
  const [snap, setSnap] = useState(true);
  const [altHeld, setAltHeld] = useState(false);
  const [minimap, setMinimap] = useState(true);
  const [showText, setShowText] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [guides, setGuidesRaw] = useState<Guides>(NO_GUIDES);
  /** Skip the re-render when the guides didn't change (most pointer moves). */
  const setGuides = useCallback(
    (g: Guides) => setGuidesRaw((cur) => (cur.x === g.x && cur.y === g.y ? cur : g)),
    [],
  );
  const [ghostIds, setGhostIds] = useState<string[]>([]);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState('');
  const [follow, setFollow] = useState(() => loadCamera(sceneKey)?.follow ?? true);
  const [resetOpen, setResetOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [, bumpHistory] = useReducer((x: number) => x + 1, 0);

  const rootRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const followRef = useRef(follow);
  followRef.current = follow;
  const live = useRef({ scenes, stepIndex, sceneKey, scene });
  live.current = { scenes, stepIndex, sceneKey, scene };
  const overridesRef = useRef<LayoutOverrides>({});
  const history = useRef(new MoveHistory());
  const edgesById = useRef(new Map<string, SceneEdge>());
  const downRef = useRef(new Set<string>());
  const dragStart = useRef(new Map<string, Vec>());
  const keyRef = useRef<string | null>(null);
  const space = useRef({ down: false, used: false });
  const hoverTimer = useRef<number>(0);
  const touchLast = useRef<Vec | null>(null);
  const safeAreaRef = useRef(safeArea);
  safeAreaRef.current = safeArea;

  useEffect(() => clock.setPaused(paused), [clock, paused]);
  useEffect(() => clock.setSpeed(speed), [clock, speed]);
  useEffect(() => engine.setDensity(motion === 'reduced' ? 0.5 : 1), [engine, motion]);

  const connections = useMemo(() => connectionsOf(scene), [scene]);
  const sceneNodeById = useMemo(() => new Map((scene?.nodes ?? []).map((n) => [n.id, n])), [scene]);

  // ---------- helpers ----------

  const ariaFor = useCallback(
    (sn: SceneNode, conns: Map<string, string[]>, labels: Map<string, string>) => {
      const def = kindDef(sn.kind);
      const parts = [sn.label];
      if (def.role.toLowerCase() !== sn.label.toLowerCase()) parts.push(def.role);
      if (sn.state && sn.state !== 'idle') parts.push(t(`canvas.state.${sn.state}`));
      if (sn.load !== undefined)
        parts.push(t('canvas.text.loadPct', { pct: Math.round(sn.load * 100) }));
      const links = (conns.get(sn.id) ?? []).map((id) => labels.get(id) ?? id);
      if (links.length) {
        let list = links.join(', ');
        try {
          list = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(links);
        } catch {
          /* older browsers */
        }
        parts.push(t('canvas.connectedToList', { list }));
      }
      return parts.join(', ');
    },
    [t, i18n.language],
  );

  /** Set node positions, optionally tweened on the canvas clock (pauses with it). */
  const setPositions = useCallback(
    (targets: Map<string, Vec>, ms = 0) => {
      if (targets.size === 0) return;
      const instant = ms <= 0 || motion !== 'full' || clock.paused;
      if (instant) {
        setNodes((ns) =>
          ns.map((n) => (targets.has(n.id) ? { ...n, position: targets.get(n.id)! } : n)),
        );
        return;
      }
      const from = new Map(
        nodesRef.current.filter((n) => targets.has(n.id)).map((n) => [n.id, n.position]),
      );
      let elapsed = 0;
      const unsub = clock.subscribe((dt) => {
        elapsed = Math.min(ms, elapsed + dt);
        const k = 1 - Math.pow(1 - elapsed / ms, 3);
        setNodes((ns) =>
          ns.map((n) => {
            const to = targets.get(n.id);
            const f = from.get(n.id);
            if (!to || !f) return n;
            return { ...n, position: { x: f.x + (to.x - f.x) * k, y: f.y + (to.y - f.y) * k } };
          }),
        );
        if (elapsed >= ms) unsub();
      });
    },
    [clock, motion],
  );

  /** Persist overrides for `ids`; a node back at its default position loses its override. */
  const commitOverrides = useCallback((ids: string[], positions: Map<string, Vec>) => {
    const { scenes: sc, stepIndex: si, sceneKey: key } = live.current;
    const ov = { ...overridesRef.current };
    for (const id of ids) {
      const p = positions.get(id);
      if (!p) continue;
      const without = { ...ov };
      delete without[id];
      const def = layoutFor(sc, si, without).get(id);
      if (def && near(def, p)) delete ov[id];
      else ov[id] = round(p);
    }
    overridesRef.current = ov;
    saveOverrides(key, ov);
  }, []);

  const labelOf = (id: string) => sceneNodeById.get(id)?.label ?? id;

  /** After a drag/touch/keyboard move: nudge off overlaps, record undo, persist. */
  const settle = useCallback(
    /** `tag` merges rapid repeats into one undo step — only keyboard nudges pass one. */
    (
      ids: string[],
      start: Map<string, Vec>,
      tag?: string,
      nudge = true,
      known?: Map<string, Vec>,
    ) => {
      const moving = new Set(ids);
      const current = nodesRef.current.filter((n) => n.data.phase !== 'exit');
      // `known` carries positions React hasn't committed yet (touch drags update our state only).
      const posNow = new Map(
        current.map((n) => [n.id, known?.get(n.id) ?? rf.getNode(n.id)?.position ?? n.position]),
      );
      const others = current
        .filter((n) => !moving.has(n.id))
        .map((n) => rectAt(n.data.node, posNow.get(n.id)!));
      const finals = new Map<string, Vec>();
      for (const id of ids) {
        const n = current.find((m) => m.id === id);
        const p = posNow.get(id);
        if (!n || !p) continue;
        const spot = nudge ? findFreeSpot(rectAt(n.data.node, p), others) : p;
        finals.set(id, spot);
        others.push(rectAt(n.data.node, spot));
      }
      const nudged = new Map([...finals].filter(([id, v]) => !near(v, posNow.get(id)!)));
      if (nudged.size) setPositions(nudged, 150);
      history.current.push(
        ids
          .filter((id) => start.has(id) && finals.has(id))
          .map((id) => ({ id, from: start.get(id)!, to: finals.get(id)! })),
        tag,
      );
      commitOverrides(ids, finals);
      bumpHistory();
      if (ids.length === 1) setLiveMsg(t('canvas.moved', { name: labelOf(ids[0]!) }));
      else setLiveMsg(t('canvas.movedMany', { count: ids.length }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rf, setPositions, commitOverrides, t, sceneNodeById],
  );

  /**
   * Fit the camera to the step's focus blocks (or all), using their *target* positions plus room
   * for labels/pills, inside the stage minus the safe area claimed by floating panels.
   * If the stage hasn't been laid out yet, the fit is retried by the ResizeObserver below.
   */
  const pendingFit = useRef<{ ids?: string[] } | null>(null);
  const fit = useCallback(
    (ids?: string[], animate = true) => {
      const root = rootRef.current;
      const { scenes: sc, stepIndex: si, scene: s } = live.current;
      if (!root || !s) return;
      const { width, height } = root.getBoundingClientRect();
      const sa = { ...DEFAULT_SAFE_AREA, ...safeAreaRef.current };
      const w = width - sa.left - sa.right;
      const h = height - sa.top - sa.bottom;
      if (w < 80 || h < 80) {
        pendingFit.current = { ids };
        return;
      }
      pendingFit.current = null;
      const pos = layoutFor(sc, si, overridesRef.current);
      const chosen = s.nodes.filter((n) => !ids?.length || ids.includes(n.id));
      if (!chosen.length) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of chosen) {
        const r = rectAt(n, pos.get(n.id) ?? n.pos);
        minX = Math.min(minX, r.x - 30);
        maxX = Math.max(maxX, r.x + r.w + 30);
        minY = Math.min(minY, r.y - (n.load !== undefined || n.badge ? 46 : 12));
        maxY = Math.max(maxY, r.y + r.h + 30);
      }
      const vp = getViewportForBounds(
        { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        w,
        h,
        0.25,
        1.25,
        0.08,
      );
      void rf.setViewport(
        { x: vp.x + sa.left, y: vp.y + sa.top, zoom: vp.zoom },
        { duration: animate && motion === 'full' ? 600 : 0 },
      );
    },
    [rf, motion],
  );

  // Refit when a floating panel claims a different part of the screen.
  useEffect(() => {
    if (followRef.current) fit(live.current.scene?.focus, false);
  }, [fit, safeArea?.top, safeArea?.right, safeArea?.bottom, safeArea?.left]);

  // Refit when the stage size changes (first layout, window resize, panel toggles) while following.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let t = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (pendingFit.current) fit(pendingFit.current.ids, false);
        else if (followRef.current) fit(live.current.scene?.focus, false);
      }, 60);
    });
    ro.observe(root);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [fit]);

  // ---------- apply a scene step ----------

  useEffect(() => {
    if (!scene) return;
    const keyChanged = keyRef.current !== sceneKey;
    if (keyChanged) {
      keyRef.current = sceneKey;
      overridesRef.current = loadOverrides(sceneKey);
      history.current.clear();
      bumpHistory();
      engine.clear();
    }
    const prevNodes = keyChanged ? [] : nodesRef.current;
    const prev = new Map(prevNodes.filter((n) => n.data.phase !== 'exit').map((n) => [n.id, n]));
    const prevEdgeIds = new Set(keyChanged ? [] : edgesById.current.keys());
    const positions = layoutFor(scenes, stepIndex, overridesRef.current);
    const nextIds = new Set(scene.nodes.map((n) => n.id));
    const conns = connectionsOf(scene);
    const labels = new Map(scene.nodes.map((n) => [n.id, n.label]));

    const built: IsoRFNode[] = scene.nodes.map((sn) => {
      const box = nodeBox(sn.size ?? kindDef(sn.kind).size, sn.kind);
      const old = prev.get(sn.id);
      return {
        id: sn.id,
        type: 'iso',
        position: old ? old.position : positions.get(sn.id)!,
        width: box.w,
        height: box.h,
        // Size and handles are declared up front, so edges, drags and the centre origin are
        // correct before (or without) DOM measurement — e.g. in a background tab or SSR.
        measured: { width: box.w, height: box.h },
        handles: [
          {
            id: null,
            type: 'target',
            position: Position.Top,
            x: box.w / 2,
            y: 0,
            width: 1,
            height: 1,
          },
          {
            id: null,
            type: 'source',
            position: Position.Bottom,
            x: box.w / 2,
            y: box.h,
            width: 1,
            height: 1,
          },
        ],
        zIndex: 1,
        selected: old?.selected ?? false,
        data: { node: sn, phase: old ? 'idle' : 'enter', ariaLabel: ariaFor(sn, conns, labels) },
      };
    });
    const exiting: IsoRFNode[] = prevNodes
      .filter((n) => !nextIds.has(n.id) && n.data.phase !== 'exit')
      .map((n) => ({
        ...n,
        selected: false,
        draggable: false,
        selectable: false,
        data: { ...n.data, phase: 'exit' },
      }));

    setNodes([...built, ...exiting]);
    // Existing nodes glide to new authored positions (only when not user-placed).
    const glide = new Map(
      built
        .filter((n) => prev.has(n.id) && !near(n.position, positions.get(n.id)!))
        .map((n) => [n.id, positions.get(n.id)!]),
    );
    if (glide.size) setPositions(glide, 400);
    let exitTimer = 0;
    if (exiting.length) {
      const gone = new Set(exiting.map((n) => n.id));
      exitTimer = window.setTimeout(
        () => setNodes((ns) => ns.filter((n) => !(gone.has(n.id) && n.data.phase === 'exit'))),
        motion === 'full' ? 220 : 0,
      );
    }

    const sceneEdges = scene.edges ?? [];
    edgesById.current = new Map(sceneEdges.map((e) => [e.id, e]));
    setEdges(
      sceneEdges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        type: 'data',
        selectable: false,
        focusable: false,
        data: { edge: e, enter: !prevEdgeIds.has(e.id) },
      })),
    );
    downRef.current = new Set(scene.nodes.filter((n) => n.state === 'down').map((n) => n.id));
    engine.setScene(scene.flows ?? [], sceneEdges);
    setInspectId(null);
    if (announce) setLiveMsg(announce);

    // Camera: restore a hand-set camera once per lesson; otherwise follow the step's focus.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const saved = keyChanged ? loadCamera(sceneKey) : null;
        if (saved && !saved.follow) {
          void rf.setViewport({ x: saved.x, y: saved.y, zoom: saved.zoom });
        } else if (followRef.current) {
          fit(scene.focus, !keyChanged);
        }
      }),
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey, stepIndex, scenes]);

  // Re-label nodes when the language changes.
  useEffect(() => {
    if (!scene) return;
    const labels = new Map(scene.nodes.map((n) => [n.id, n.label]));
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: { ...n.data, ariaLabel: ariaFor(n.data.node, connections, labels) },
      })),
    );
  }, [ariaFor, connections, scene]);

  // ---------- frames (derived from member positions) ----------

  // Frame objects are reused while their geometry is unchanged, so dragging a block outside a
  // zone doesn't make React Flow re-adopt every frame on every pointer move.
  const frameCache = useRef(new Map<string, FrameRFNode>());
  const frameNodes = useMemo<FrameRFNode[]>(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return (scene?.frames ?? []).flatMap((f) => {
      const rects = f.members
        .map((id) => byId.get(id))
        .filter((n): n is IsoRFNode => !!n && n.data.phase !== 'exit')
        .map((n) => rectAt(n.data.node, n.position));
      if (!rects.length) return [];
      const pad = 36;
      const minX = Math.min(...rects.map((r) => r.x)) - pad;
      const minY = Math.min(...rects.map((r) => r.y)) - pad - 28;
      const maxX = Math.max(...rects.map((r) => r.x + r.w)) + pad;
      const maxY = Math.max(...rects.map((r) => r.y + r.h)) + pad + 18;
      const id = `frame:${f.id}`;
      const prev = frameCache.current.get(id);
      if (
        prev &&
        prev.position.x === minX &&
        prev.position.y === minY &&
        prev.width === maxX - minX &&
        prev.height === maxY - minY &&
        prev.data.label === f.label
      ) {
        return [prev];
      }
      const next: FrameRFNode = {
        id,
        type: 'frame',
        position: { x: minX, y: minY },
        origin: [0, 0],
        width: maxX - minX,
        height: maxY - minY,
        measured: { width: maxX - minX, height: maxY - minY },
        zIndex: -1,
        draggable: false,
        selectable: false,
        focusable: false,
        data: { label: f.label },
      };
      frameCache.current.set(id, next);
      return [next];
    });
  }, [nodes, scene]);
  const frameIds = useRef<string[]>([]);
  frameIds.current = frameNodes.map((f) => f.id);
  const allNodes = useMemo<AnyNode[]>(() => [...frameNodes, ...nodes], [frameNodes, nodes]);

  // Snap block *centres* to the grid while dragging (React Flow would snap the top-left corner,
  // so blocks of different sizes could never line up). Alt drags freely.
  const snapRef = useRef(true);
  snapRef.current = snap && !altHeld;
  const onNodesChange = useCallback((changes: NodeChangeset<AnyNode>) => {
    for (const id of frameIds.current) changes.removeForNode(id);
    if (snapRef.current) {
      for (const c of changes) {
        // React Flow only emits position changes for user drags (our own moves bypass this).
        if (c.type === 'position' && c.position) {
          c.position = {
            x: Math.round(c.position.x / SNAP[0]) * SNAP[0],
            y: Math.round(c.position.y / SNAP[1]) * SNAP[1],
          };
        }
      }
    }
    setNodes((ns) => changes.applyTo(ns as AnyNode[]) as IsoRFNode[]);
  }, []);

  // ---------- pointer drag ----------

  const onNodeDragStart: OnNodeDrag<AnyNode> = useCallback((_e, _n, dragged) => {
    const isos = dragged.filter((n) => n.type === 'iso');
    dragStart.current = new Map(isos.map((n) => [n.id, { ...n.position }]));
    setGhostIds(isos.map((n) => n.id));
    setInspectId(null);
    setHoverId(null);
  }, []);

  const onNodeDrag: OnNodeDrag<AnyNode> = useCallback((_e, node, dragged) => {
    const ids = new Set(dragged.map((n) => n.id));
    const others = nodesRef.current
      .filter((n) => !ids.has(n.id) && n.data.phase !== 'exit')
      .map((n) => n.position);
    setGuides(alignmentGuides(node.position, others));
  }, []);

  const onNodeDragStop: OnNodeDrag<AnyNode> = useCallback(
    (_e, _n, dragged) => {
      setGuides(NO_GUIDES);
      setGhostIds([]);
      settle(
        dragged.filter((n) => n.type === 'iso').map((n) => n.id),
        dragStart.current,
      );
    },
    [settle],
  );

  // ---------- history / layout commands ----------

  const applyHistory = useCallback(
    (m: Map<string, Vec> | null, msg: string) => {
      if (!m) return;
      setPositions(m, 150);
      commitOverrides([...m.keys()], m);
      bumpHistory();
      setLiveMsg(msg);
    },
    [setPositions, commitOverrides],
  );
  const undo = useCallback(
    () => applyHistory(history.current.undo(), t('canvas.undone')),
    [applyHistory, t],
  );
  const redo = useCallback(
    () => applyHistory(history.current.redo(), t('canvas.redone')),
    [applyHistory, t],
  );

  const resetLayout = useCallback(() => {
    const { scenes: sc, stepIndex: si, sceneKey: key } = live.current;
    const defaults = layoutFor(sc, si, {});
    const moves = nodesRef.current
      .filter(
        (n) =>
          n.data.phase !== 'exit' && defaults.has(n.id) && !near(n.position, defaults.get(n.id)!),
      )
      .map((n) => ({ id: n.id, from: n.position, to: defaults.get(n.id)! }));
    overridesRef.current = {};
    saveOverrides(key, {});
    history.current.push(moves);
    bumpHistory();
    setPositions(new Map(moves.map((m) => [m.id, m.to])), 400);
    setLiveMsg(t('canvas.layoutReset'));
  }, [setPositions, t]);

  const keyboardMove = useCallback(
    (dx: number, dy: number) => {
      let sel = nodesRef.current.filter((n) => n.selected && n.data.phase !== 'exit');
      if (!sel.length) {
        // Nothing selected but a block has keyboard focus: move that one.
        const focusedId = (document.activeElement as HTMLElement | null)
          ?.closest('.react-flow__node-iso')
          ?.getAttribute('data-id');
        sel = nodesRef.current.filter((n) => n.id === focusedId && n.data.phase !== 'exit');
      }
      if (!sel.length || locked) return false;
      const start = new Map(sel.map((n) => [n.id, n.position]));
      const next = new Map(sel.map((n) => [n.id, { x: n.position.x + dx, y: n.position.y + dy }]));
      setPositions(next);
      history.current.push(
        sel.map((n) => ({ id: n.id, from: start.get(n.id)!, to: next.get(n.id)! })),
        `key:${sel.map((n) => n.id).join(',')}`,
      );
      commitOverrides([...next.keys()], next);
      bumpHistory();
      setLiveMsg(
        sel.length === 1
          ? t('canvas.moved', { name: labelOf(sel[0]!.id) })
          : t('canvas.movedMany', { count: sel.length }),
      );
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, setPositions, commitOverrides, t, sceneNodeById],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const vp = rf.getViewport();
      void rf.setViewport({ x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom });
      setFollow(false);
    },
    [rf],
  );

  const replay = useCallback(() => {
    engine.clear();
    const s = live.current.scene;
    if (s) engine.setScene(s.flows ?? [], s.edges ?? []);
  }, [engine]);

  const selectOnly = useCallback((id: string) => {
    setNodes((ns) =>
      ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
    );
  }, []);

  // ---------- keyboard (PRD §6.2, §7.5) ----------

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [role="dialog"]')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;

    if (k.startsWith('Arrow')) {
      const step = e.shiftKey ? 100 : e.altKey ? 1 : 20;
      const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0;
      const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
      e.preventDefault();
      if (!keyboardMove(dx, dy)) panBy(-dx * 3, -dy * 3);
      return;
    }
    if (mod && k.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && k.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && k.toLowerCase() === 'a') {
      e.preventDefault();
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.data.phase !== 'exit' })));
      return;
    }
    if (mod || e.altKey) return;
    switch (k) {
      case '+':
      case '=':
        void rf.zoomIn({ duration: 150 });
        setFollow(false);
        break;
      case '-':
      case '_':
        void rf.zoomOut({ duration: 150 });
        setFollow(false);
        break;
      case '0':
        void rf.zoomTo(1, { duration: 150 });
        setFollow(false);
        break;
      case '1':
        fit(undefined);
        break;
      case 'R':
        if (e.shiftKey) setResetOpen(true);
        break;
      case 'r':
        replay();
        break;
      case 'l':
      case 'L':
        setLocked((v) => !v);
        break;
      case 'm':
      case 'M':
        setMinimap((v) => !v);
        break;
      case 't':
      case 'T':
        setShowText((v) => !v);
        break;
      case ' ':
        e.preventDefault();
        if (!space.current.down) space.current = { down: true, used: false };
        break;
      case 'Escape':
        setInspectId(null);
        setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
        break;
      default:
        return;
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && space.current.down) {
      if (!space.current.used) setPaused((p) => !p);
      space.current = { down: false, used: false };
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === 'Alt' && setAltHeld(true);
    const up = (e: KeyboardEvent) => e.key === 'Alt' && setAltHeld(false);
    const blur = () => setAltHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // ---------- touch ----------

  useTouchGestures(rootRef, {
    nodeIdAt: (target) => {
      const el = (target as Element | null)?.closest?.('.react-flow__node-iso');
      const id = el?.getAttribute('data-id');
      if (!id) return null;
      return nodesRef.current.some((n) => n.id === id && n.data.phase !== 'exit') ? id : null;
    },
    canDrag: () => !locked,
    nodePosition: (id) => nodesRef.current.find((n) => n.id === id)?.position ?? null,
    toFlow: (x, y) => rf.screenToFlowPosition({ x, y }),
    lift: (id, on) => {
      setNodes((ns) =>
        ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, lifted: on } } : n)),
      );
      if (on) {
        dragStart.current = new Map([[id, nodesRef.current.find((n) => n.id === id)!.position]]);
        setGhostIds([id]);
        setInspectId(null);
      } else {
        setGhostIds([]);
        setGuides(NO_GUIDES);
      }
    },
    moveNode: (id, pos) => {
      const p = snap
        ? { x: Math.round(pos.x / SNAP[0]) * SNAP[0], y: Math.round(pos.y / SNAP[1]) * SNAP[1] }
        : pos;
      touchLast.current = p;
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, position: p } : n)));
      const others = nodesRef.current
        .filter((n) => n.id !== id && n.data.phase !== 'exit')
        .map((n) => n.position);
      setGuides(alignmentGuides(p, others));
    },
    dropNode: (id, from) => {
      const to = touchLast.current;
      touchLast.current = null;
      settle([id], new Map([[id, from]]), undefined, true, to ? new Map([[id, to]]) : undefined);
    },
    panBy,
    zoomAround: (factor, cx, cy, baseZoom) => {
      const vp = rf.getViewport();
      const rect = rootRef.current!.getBoundingClientRect();
      const nextZoom = Math.min(3, Math.max(0.25, baseZoom * factor));
      const wx = (cx - rect.left - vp.x) / vp.zoom;
      const wy = (cy - rect.top - vp.y) / vp.zoom;
      void rf.setViewport({
        x: cx - rect.left - wx * nextZoom,
        y: cy - rect.top - wy * nextZoom,
        zoom: nextZoom,
      });
      setFollow(false);
    },
    currentZoom: () => rf.getViewport().zoom,
  });

  // ---------- camera persistence ----------

  const onMoveStart = useCallback((event: MouseEvent | TouchEvent | null) => {
    if (space.current.down) space.current.used = true;
    if (event) setFollow(false);
  }, []);

  const onMoveEnd = useCallback((_e: MouseEvent | TouchEvent | null, vp: Viewport) => {
    saveCamera(live.current.sceneKey, { ...vp, follow: followRef.current });
  }, []);

  useEffect(() => {
    const vp = rf.getViewport();
    saveCamera(sceneKey, { ...vp, follow });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow]);

  // ---------- dev handle for tests / debugging (never in production builds) ----------

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __sc?: unknown }).__sc = {
      clock,
      engine,
      rf,
      overrides: () => overridesRef.current,
      history: history.current,
    };
    return () => {
      delete (window as unknown as { __sc?: unknown }).__sc;
    };
  }, [clock, engine, rf]);

  // ---------- FPS meter (dev) ----------

  useEffect(() => {
    if (!showFps) return;
    let frames = 0;
    let acc = 0;
    return clock.subscribe(
      (dt) => {
        frames++;
        acc += dt;
        if (acc >= 500) {
          setFps(Math.round((frames * 1000) / acc));
          frames = 0;
          acc = 0;
        }
      },
      { always: true },
    );
  }, [clock, showFps]);

  // ---------- context ----------

  const ctx = useMemo<CanvasCtx>(
    () => ({
      clock,
      motion,
      isDown: (id) => downRef.current.has(id),
      onNodeFocus: (id) => {
        if (!nodesRef.current.find((n) => n.id === id)?.selected) selectOnly(id);
      },
      onNodeActivate: (id) => setInspectId((cur) => (cur === id ? null : id)),
    }),
    [clock, motion, selectOnly],
  );

  const ghosts = useMemo(() => {
    const defaults = scene ? layoutFor(scenes, stepIndex, {}) : new Map<string, Vec>();
    return ghostIds.filter((id) => defaults.has(id)).map((id) => ({ id, pos: defaults.get(id)! }));
  }, [ghostIds, scenes, stepIndex, scene]);

  if (!scene) return null;

  return (
    <CanvasContext.Provider value={ctx}>
      <div
        ref={rootRef}
        className={`sc-stage ${paused ? 'sc-paused' : ''} ${locked ? 'is-locked' : ''} ${className}`}
        role="region"
        aria-roledescription={t('canvas.roleDescription')}
        aria-label={t('canvas.label')}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <defs>
            <marker
              id="sc-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10 z" style={{ fill: 'var(--ink-muted)' }} />
            </marker>
            <marker
              id="sc-arrow-start"
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M10 0 L0 5 L10 10 z" style={{ fill: 'var(--ink-muted)' }} />
            </marker>
          </defs>
        </svg>

        <IsoGridHost />

        <ReactFlow<AnyNode, DataRFEdge>
          nodes={allNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, n) =>
            n.type === 'iso' && setInspectId((cur) => (cur === n.id ? null : n.id))
          }
          onNodeMouseEnter={(_e, n) => {
            window.clearTimeout(hoverTimer.current);
            if (n.type === 'iso')
              hoverTimer.current = window.setTimeout(() => setHoverId(n.id), 350);
          }}
          onNodeMouseLeave={() => {
            window.clearTimeout(hoverTimer.current);
            setHoverId(null);
          }}
          onPaneClick={() => setInspectId(null)}
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}
          nodeOrigin={NODE_ORIGIN}
          nodesDraggable={!locked}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          disableKeyboardA11y
          deleteKeyCode={null}
          panOnScroll
          zoomActivationKeyCode={['Control', 'Meta']}
          multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
          selectionKeyCode="Shift"
          panActivationKeyCode="Space"
          zoomOnDoubleClick={false}
          minZoom={0.25}
          maxZoom={3}
          elevateNodesOnSelect={false}
          proOptions={{ hideAttribution: true }}
          className="sc-flow"
        >
          <PacketLayer engine={engine} edgesById={edgesById} rootRef={rootRef} />
          <Overlays
            nodes={nodes}
            callouts={scene.callouts ?? []}
            guides={guides}
            ghosts={ghosts}
            inspectId={inspectId}
            hoverId={hoverId}
            connections={connections}
            onCloseInspect={() => setInspectId(null)}
          />
          {minimap && (
            <MiniMap<AnyNode>
              className="sc-minimap"
              position="bottom-left"
              pannable
              zoomable
              ariaLabel={t('canvas.minimap')}
              nodeClassName={(n) =>
                n.type === 'frame'
                  ? 'sc-mm-frame'
                  : `sc-mm-${kindDef((n as IsoRFNode).data.node.kind).category}`
              }
            />
          )}
        </ReactFlow>

        <CanvasToolbar
          zoom={zoom}
          follow={follow}
          locked={locked}
          snap={snap}
          minimap={minimap}
          showText={showText}
          canUndo={history.current.canUndo}
          canRedo={history.current.canRedo}
          paused={paused}
          speed={speed}
          onZoomIn={() => {
            void rf.zoomIn({ duration: 150 });
            setFollow(false);
          }}
          onZoomOut={() => {
            void rf.zoomOut({ duration: 150 });
            setFollow(false);
          }}
          onZoomReset={() => {
            void rf.zoomTo(1, { duration: 150 });
            setFollow(false);
          }}
          onFit={() => fit(undefined)}
          onFollow={() => {
            setFollow((f) => !f);
            if (!follow) fit(scene.focus);
          }}
          onUndo={undo}
          onRedo={redo}
          onReset={resetLayout}
          onLock={() => setLocked((v) => !v)}
          onSnap={() => setSnap((v) => !v)}
          onMinimap={() => setMinimap((v) => !v)}
          onText={() => setShowText((v) => !v)}
          onPause={() => setPaused((p) => !p)}
          onReplay={replay}
          onSpeed={setSpeed}
          resetOpen={resetOpen}
          setResetOpen={setResetOpen}
        />

        {showText && <DiagramAsText scene={scene} onClose={() => setShowText(false)} />}
        {showFps && (
          <div className="sc-fps tabular" aria-hidden="true">
            {fps} fps · {engine.packets.length} pk
          </div>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {liveMsg}
        </div>
        {children}
      </div>
    </CanvasContext.Provider>
  );
}

/** The grid must sit inside the provider (it reads the viewport) but behind React Flow. */
function IsoGridHost() {
  return <IsoGrid />;
}
