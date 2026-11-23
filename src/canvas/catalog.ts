import {
  Activity,
  Archive,
  Boxes,
  Cloud,
  Cog,
  Cpu,
  Database,
  DatabaseZap,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  ListOrdered,
  Lock,
  Megaphone,
  Monitor,
  Network,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  SplitSquareHorizontal,
  Users,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { NodeCategory } from './types';

export interface KindDef {
  category: NodeCategory;
  icon: LucideIcon;
  /** Plain-language role, used in accessible labels and the info card. */
  role: string;
  size: 'sm' | 'md' | 'lg';
}

/** Every component the canvas can draw. Lessons, practice and the Lab all pick from this list. */
export const CATALOG: Record<string, KindDef> = {
  users: { category: 'client', icon: Users, role: 'Users', size: 'lg' },
  browser: { category: 'client', icon: Monitor, role: 'Web client', size: 'md' },
  mobile: { category: 'client', icon: Smartphone, role: 'Mobile client', size: 'sm' },
  dns: { category: 'network', icon: Globe, role: 'DNS resolver', size: 'md' },
  cdn: { category: 'network', icon: Cloud, role: 'CDN edge', size: 'md' },
  lb: { category: 'network', icon: SplitSquareHorizontal, role: 'Load balancer', size: 'md' },
  gateway: { category: 'network', icon: Network, role: 'API gateway', size: 'md' },
  waf: { category: 'security', icon: ShieldCheck, role: 'Web application firewall', size: 'sm' },
  server: { category: 'compute', icon: Server, role: 'App server', size: 'md' },
  worker: { category: 'compute', icon: Cog, role: 'Worker', size: 'sm' },
  function: { category: 'compute', icon: Zap, role: 'Serverless function', size: 'sm' },
  cron: { category: 'compute', icon: Cpu, role: 'Scheduler', size: 'sm' },
  sql: { category: 'data', icon: Database, role: 'SQL database', size: 'lg' },
  replica: { category: 'data', icon: Layers, role: 'Read replica', size: 'md' },
  nosql: { category: 'data', icon: Boxes, role: 'NoSQL store', size: 'md' },
  cache: { category: 'data', icon: DatabaseZap, role: 'Cache', size: 'md' },
  objectstore: { category: 'data', icon: HardDrive, role: 'Object storage', size: 'md' },
  search: { category: 'data', icon: Search, role: 'Search index', size: 'md' },
  warehouse: { category: 'data', icon: Archive, role: 'Data warehouse', size: 'lg' },
  queue: { category: 'messaging', icon: ListOrdered, role: 'Queue', size: 'md' },
  topic: { category: 'messaging', icon: Megaphone, role: 'Topic', size: 'md' },
  stream: { category: 'messaging', icon: Waves, role: 'Stream', size: 'md' },
  auth: { category: 'security', icon: KeyRound, role: 'Identity provider', size: 'md' },
  vault: { category: 'security', icon: Lock, role: 'Secrets vault', size: 'sm' },
  metrics: { category: 'observability', icon: Activity, role: 'Telemetry collector', size: 'sm' },
};

export const FALLBACK_KIND: KindDef = {
  category: 'compute',
  icon: Server,
  role: 'Component',
  size: 'md',
};

export function kindDef(kind: string): KindDef {
  return CATALOG[kind] ?? FALLBACK_KIND;
}

/** Block geometry per size: r = diamond half-width, h = extrusion height. */
export const BLOCK_SIZES = {
  sm: { r: 30, h: 22 },
  md: { r: 38, h: 28 },
  lg: { r: 48, h: 34 },
} as const;

/** The node's hit box in world units: the block's bounding box. Labels hang outside it. */
export function nodeBox(size: 'sm' | 'md' | 'lg', kind?: string): { w: number; h: number } {
  const { r, h } = BLOCK_SIZES[size];
  // Crowds are a flat slab: same footprint, almost no height.
  const height = kind === 'users' ? 12 : h;
  return { w: 2 * r + 4, h: height + r + 4 };
}
