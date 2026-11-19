import { IsoBlock, type BlockCategory } from './IsoBlock';

interface Node {
  id: string;
  x: number;
  y: number;
  r: number;
  h: number;
  cat: BlockCategory;
  label: string;
}

const NODES: Node[] = [
  { id: 'users', x: 80, y: 240, r: 40, h: 12, cat: 'client', label: 'users' },
  { id: 'lb', x: 210, y: 175, r: 34, h: 26, cat: 'network', label: 'LB' },
  { id: 'a', x: 340, y: 105, r: 30, h: 30, cat: 'compute', label: 'app-a' },
  { id: 'b', x: 360, y: 190, r: 30, h: 30, cat: 'compute', label: 'app-b' },
  { id: 'c', x: 340, y: 275, r: 30, h: 30, cat: 'compute', label: 'app-c' },
  { id: 'db', x: 470, y: 190, r: 34, h: 34, cat: 'data', label: 'db' },
];

const at = (id: string) => NODES.find((n) => n.id === id)!;
const pt = (id: string) => `${at(id).x} ${at(id).y}`;

const EDGES: [string, string][] = [
  ['users', 'lb'],
  ['lb', 'a'],
  ['lb', 'b'],
  ['lb', 'c'],
  ['a', 'db'],
  ['b', 'db'],
  ['c', 'db'],
];

/** One round trip per app server: request out (accent), response back (ok). */
const ROUTES = ['a', 'b', 'c'].map((s) => `M${pt('users')} L${pt('lb')} L${pt(s)} L${pt('db')}`);
const RETURNS = ['a', 'b', 'c'].map((s) => `M${pt('db')} L${pt(s)} L${pt('lb')} L${pt('users')}`);

/**
 * Decorative live mini-scene for the home hero. In M4 it becomes a real draggable canvas
 * (PRD §11.5); in M0 it proves out the tokens, block geometry and packet motion.
 */
export function HeroScene() {
  const sorted = [...NODES].sort((p, q) => p.y - q.y);
  return (
    <svg viewBox="0 0 540 330" className="h-auto w-full" aria-hidden="true" focusable="false">
      <style>{`
        .pk { offset-rotate: 0deg; animation: pk-move 3.6s linear infinite; }
        @keyframes pk-move { from { offset-distance: 0%; } to { offset-distance: 100%; } }
      `}</style>
      {EDGES.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={at(from).x}
          y1={at(from).y}
          x2={at(to).x}
          y2={at(to).y}
          stroke="var(--ink-muted)"
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeDasharray="4 5"
        />
      ))}
      {ROUTES.map((d, i) => (
        <circle
          key={`req-${i}`}
          className="pk"
          r={5}
          fill="var(--accent)"
          style={{ offsetPath: `path('${d}')`, animationDelay: `${i * 1.2}s` }}
        />
      ))}
      {RETURNS.map((d, i) => (
        <circle
          key={`res-${i}`}
          className="pk"
          r={4.5}
          fill="var(--ok)"
          style={{ offsetPath: `path('${d}')`, animationDelay: `${i * 1.2 + 1.8}s` }}
        />
      ))}
      {sorted.map((n) => (
        <IsoBlock key={n.id} x={n.x} y={n.y} r={n.r} h={n.h} category={n.cat} label={n.label} />
      ))}
    </svg>
  );
}
