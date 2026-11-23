import { roundTrip } from './flows';
import type { Flow, Scene, SceneEdge, SceneNode } from './types';

/**
 * Canvas playground (M1 demo). Four steps that grow from one server to a 20-block system, so
 * every engine feature can be exercised: entering/exiting blocks, glides, group routing,
 * down nodes, cut edges, async edges, frames, callouts, and ~150 live packets in step 4.
 */

export interface DemoStep {
  title: string;
  body: string;
  scene: Scene;
}

const users: SceneNode = {
  id: 'users',
  kind: 'users',
  label: 'users',
  pos: { x: 0, y: 240 },
  count: 12,
};
const lb: SceneNode = { id: 'lb', kind: 'lb', label: 'Load balancer', pos: { x: 260, y: 240 } };
const appA: SceneNode = { id: 'app-a', kind: 'server', label: 'app-a', pos: { x: 520, y: 100 } };
const appB: SceneNode = { id: 'app-b', kind: 'server', label: 'app-b', pos: { x: 520, y: 240 } };
const appC: SceneNode = { id: 'app-c', kind: 'server', label: 'app-c', pos: { x: 520, y: 380 } };
const cache: SceneNode = { id: 'cache', kind: 'cache', label: 'cache', pos: { x: 780, y: 170 } };
const db: SceneNode = { id: 'db', kind: 'sql', label: 'orders-db', pos: { x: 1040, y: 240 } };

const e = (from: string, to: string, extra: Partial<SceneEdge> = {}): SceneEdge => ({
  id: `${from}--${to}`,
  from,
  to,
  ...extra,
});

const group = (to: string[], algo: 'roundRobin' | 'leastConn' = 'roundRobin') => ({
  from: 'lb',
  to,
  algo,
});

// ---------- step 1: one server ----------

const step1: Scene = {
  nodes: [users, { ...appA, pos: { x: 300, y: 240 }, load: 0.45 }],
  edges: [e('users', 'app-a')],
  flows: [roundTrip('direct', ['users', 'app-a'], 1.6)],
  callouts: [{ anchor: 'users', offset: { x: 0, y: -78 }, text: '200,000 users' }],
};

// ---------- step 2: load balancer + three servers ----------

const threeApps = ['app-a', 'app-b', 'app-c'];
const step2: Scene = {
  nodes: [users, lb, { ...appA, load: 0.4 }, { ...appB, load: 0.38 }, { ...appC, load: 0.41 }],
  edges: [e('users', 'lb'), e('lb', 'app-a'), e('lb', 'app-b'), e('lb', 'app-c')],
  flows: [
    {
      id: 'balanced',
      hops: ['users>lb', group(threeApps), '$>lb', 'lb>users'],
      packet: ['request', 'request', 'response', 'response'],
      rate: 4,
    },
  ],
  frames: [
    { id: 'zone-a', label: 'zone a', members: ['app-a', 'app-b'] },
    { id: 'zone-b', label: 'zone b', members: ['app-c'] },
  ],
  callouts: [{ anchor: 'lb', offset: { x: 0, y: -74 }, text: 'round robin', tone: 'ok' }],
};

// ---------- step 3: cache in front of the database ----------

const step3: Scene = {
  nodes: [
    users,
    lb,
    { ...appA, load: 0.32 },
    { ...appB, load: 0.3 },
    { ...appC, load: 0.33 },
    { ...cache, load: 0.3 },
    { ...db, load: 0.18 },
  ],
  edges: [
    e('users', 'lb'),
    e('lb', 'app-a'),
    e('lb', 'app-b'),
    e('lb', 'app-c'),
    e('app-a', 'cache'),
    e('app-b', 'cache'),
    e('app-c', 'cache'),
    e('cache', 'db', { label: 'miss 10%' }),
  ],
  flows: [
    {
      id: 'hit',
      hops: ['users>lb', group(threeApps), '$>cache', 'cache>$', '$>lb', 'lb>users'],
      packet: ['request', 'request', 'request', 'response', 'response', 'response'],
      rate: 4.5,
    },
    {
      id: 'miss',
      hops: [
        'users>lb',
        group(threeApps),
        '$>cache',
        'cache>db',
        'db>cache',
        'cache>$',
        '$>lb',
        'lb>users',
      ],
      packet: [
        'request',
        'request',
        'request',
        'heavy',
        'response',
        'response',
        'response',
        'response',
      ],
      rate: 0.6,
      dwellMs: 120,
    },
  ],
  frames: step2.frames,
  callouts: [{ anchor: 'cache', offset: { x: 0, y: -74 }, text: 'hit rate 90%', tone: 'ok' }],
};

// ---------- step 4: stress test, 20 blocks ----------

const fourApps = ['app-a', 'app-b', 'app-c', 'app-d'];
const workers = ['worker-1', 'worker-2', 'worker-3'];
const step4Nodes: SceneNode[] = [
  users,
  { id: 'dns', kind: 'dns', label: 'DNS', pos: { x: 0, y: 40 } },
  { id: 'cdn', kind: 'cdn', label: 'CDN', pos: { x: 260, y: 60 } },
  lb,
  { id: 'auth', kind: 'auth', label: 'auth', pos: { x: 260, y: 440 } },
  { ...appA, load: 0.78, state: 'busy' },
  { ...appB, load: 0.74 },
  { ...appC, state: 'down', load: 0 },
  {
    id: 'app-d',
    kind: 'server',
    label: 'app-d',
    pos: { x: 520, y: 520 },
    load: 0.81,
    state: 'busy',
  },
  { ...cache, load: 0.55 },
  { ...db, load: 0.62, state: 'active' },
  { id: 'replica-1', kind: 'replica', label: 'replica-1', pos: { x: 1300, y: 140 }, load: 0.35 },
  {
    id: 'replica-2',
    kind: 'replica',
    label: 'replica-2',
    pos: { x: 1300, y: 340 },
    state: 'dimmed',
  },
  { id: 'queue', kind: 'queue', label: 'jobs', pos: { x: 780, y: 440 }, badge: 'backlog 120' },
  { id: 'worker-1', kind: 'worker', label: 'worker-1', pos: { x: 1040, y: 420 } },
  { id: 'worker-2', kind: 'worker', label: 'worker-2', pos: { x: 1040, y: 520 } },
  {
    id: 'worker-3',
    kind: 'worker',
    label: 'worker-3',
    pos: { x: 1040, y: 620 },
    state: 'recovering',
  },
  { id: 'objects', kind: 'objectstore', label: 'object store', pos: { x: 1300, y: 540 } },
  { id: 'metrics', kind: 'metrics', label: 'metrics', pos: { x: 780, y: 640 } },
  { id: 'search', kind: 'search', label: 'search', pos: { x: 1300, y: -40 } },
];

const step4Edges: SceneEdge[] = [
  e('users', 'dns'),
  e('users', 'cdn'),
  e('users', 'lb'),
  e('lb', 'auth', { dashed: true }),
  ...fourApps.map((a) => e('lb', a)),
  ...fourApps.map((a) => e(a, 'cache')),
  e('cache', 'db', { label: 'miss 10%' }),
  e('db', 'replica-1', { dashed: true }),
  e('db', 'replica-2', { dashed: true, status: 'cut', label: 'partition' }),
  e('db', 'search', { dashed: true }),
  e('app-a', 'queue', { dashed: true }),
  ...workers.map((w) => e('queue', w, { dashed: true })),
  ...workers.map((w) => e(w, 'objects')),
  e('app-b', 'metrics', { dashed: true, style: 'curved' }),
];

const step4Flows: Flow[] = [
  {
    id: 'main',
    hops: ['users>lb', group(fourApps), '$>cache', 'cache>$', '$>lb', 'lb>users'],
    packet: ['request', 'request', 'request', 'response', 'response', 'response'],
    rate: 12,
  },
  {
    id: 'miss',
    hops: [
      'users>lb',
      group(fourApps, 'leastConn'),
      '$>cache',
      'cache>db',
      'db>cache',
      'cache>$',
      '$>lb',
      'lb>users',
    ],
    packet: [
      'request',
      'request',
      'request',
      'heavy',
      'response',
      'response',
      'response',
      'response',
    ],
    rate: 2.6,
  },
  { id: 'dns', hops: ['users>dns', 'dns>users'], packet: ['request', 'response'], rate: 1.2 },
  { id: 'static', hops: ['users>cdn', 'cdn>users'], packet: ['request', 'heavy'], rate: 3.2 },
  { id: 'auth', hops: ['lb>auth', 'auth>lb'], packet: 'handshake', rate: 1 },
  { id: 'repl-1', hops: ['db>replica-1'], packet: 'event', rate: 2 },
  { id: 'repl-2', hops: ['db>replica-2'], packet: 'event', rate: 1 },
  { id: 'index', hops: ['db>search'], packet: 'event', rate: 0.8 },
  {
    id: 'jobs',
    hops: ['app-a>queue', { from: 'queue', to: workers, algo: 'roundRobin' }, '$>objects'],
    packet: 'event',
    rate: 5,
    dwellMs: 250,
  },
  { id: 'telemetry', hops: ['app-b>metrics'], packet: 'event', rate: 1.5 },
];

const step4: Scene = {
  nodes: step4Nodes,
  edges: step4Edges,
  flows: step4Flows,
  frames: [
    { id: 'zone-a', label: 'zone a', members: ['app-a', 'app-b'] },
    { id: 'zone-b', label: 'zone b', members: ['app-c', 'app-d'] },
    { id: 'workers', label: 'workers', members: workers },
  ],
  callouts: [
    { anchor: 'app-c', offset: { x: 128, y: 0 }, text: 'health check failing', tone: 'bad' },
    { anchor: 'replica-2', offset: { x: 0, y: -70 }, text: 'unreachable', tone: 'warn' },
  ],
};

export const DEMO_KEY = 'playground';

export const DEMO_STEPS: DemoStep[] = [
  {
    title: 'One server',
    body: 'Every user talks to a single app server. Drag it somewhere else — the line and the requests follow.',
    scene: step1,
  },
  {
    title: 'Add a load balancer',
    body: 'Three servers behind one entry point, picked in turn (round robin). app-a glides to its new spot unless you already moved it.',
    scene: step2,
  },
  {
    title: 'Put a cache in front of the database',
    body: 'Most reads are answered by the cache. The heavy orange squares are the misses that reach the database.',
    scene: step3,
  },
  {
    title: 'Stress test: 20 blocks',
    body: 'A busier system: a dead server, a cut replica link, async jobs and telemetry. Around 150 packets are in flight.',
    scene: step4,
  },
];

export const DEMO_SCENES: Scene[] = DEMO_STEPS.map((s) => s.scene);
