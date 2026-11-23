/** Scene contract between content (lessons, practice, lab) and the canvas engine (PRD §12.4). */

export type NodeCategory =
  'client' | 'network' | 'compute' | 'data' | 'messaging' | 'security' | 'observability';

export type NodeState =
  'idle' | 'active' | 'busy' | 'overloaded' | 'down' | 'recovering' | 'highlighted' | 'dimmed';

export type PacketKind = 'request' | 'response' | 'event' | 'error' | 'handshake' | 'heavy';

export interface Vec {
  x: number;
  y: number;
}

export interface SceneNode {
  /** Stable across steps; user layout overrides are keyed by it. */
  id: string;
  /** Catalog kind: 'lb' | 'server' | 'sql' | 'cache' | 'users' | … (see catalog.ts). */
  kind: string;
  label: string;
  /** Authored world position of the block's center (React Flow nodeOrigin 0.5/0.5). */
  pos: Vec;
  size?: 'sm' | 'md' | 'lg';
  state?: NodeState;
  /** 0..1 utilization bar. */
  load?: number;
  /** Small pill above the block, e.g. "4 active". */
  badge?: string;
  /** Crowd size for 'users' nodes. */
  count?: number;
}

export type EdgeStyle = 'orthogonal' | 'straight' | 'curved';

export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  style?: EdgeStyle;
  dashed?: boolean;
  arrow?: 'none' | 'end' | 'both';
  label?: string;
  status?: 'normal' | 'degraded' | 'cut';
}

/**
 * A hop is either "a>b" (travel the edge between a and b, from a to b) or a group hop that
 * picks one target per packet. In later hops "$" means "the node the last group hop picked",
 * so a return trip can be written as "$>lb".
 */
export type GroupAlgo = 'roundRobin' | 'leastConn' | 'random' | 'hash';
export type Hop = string | { from: string; to: string[]; algo: GroupAlgo };

export interface Flow {
  id: string;
  hops: Hop[];
  /** One kind for all hops, or one per hop (the last entry repeats if shorter). */
  packet: PacketKind | PacketKind[];
  /** Packets per second. */
  rate: number;
  /** World units per second (default 220). */
  speed?: number;
  /** Time a packet "processes" at each intermediate node. */
  dwellMs?: number;
}

export interface Callout {
  id?: string;
  anchor: string;
  offset: Vec;
  icon?: string;
  text: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad';
}

export interface Frame {
  id: string;
  label: string;
  members: string[];
}

export interface Scene {
  nodes: SceneNode[];
  edges?: SceneEdge[];
  flows?: Flow[];
  callouts?: Callout[];
  frames?: Frame[];
  /** Node ids to fit the camera to when the step opens. */
  focus?: string[];
}

export type LayoutOverrides = Record<string, Vec>;
