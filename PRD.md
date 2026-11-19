# ScaleCanvas — Product Requirements Document

> **Working title:** ScaleCanvas (rename freely; the name lives in one config constant).
> **Version:** 1.0 · **Date:** 2026-11-19 · **Owner:** Amit Dewangan
> **Status:** Ready to build
> **Reference product:** an existing interactive system-design course (step-through animated isometric diagrams). We use its *format* as inspiration. Every lesson text, illustration, color, font and name in ScaleCanvas must be **original**. Do not copy the reference's copy, artwork or branding.

---

## 0. How to use this document (for coding agents)

- Build **in the milestone order in §15**. Each milestone has a Definition of Done (DoD). Do not start a milestone until the previous DoD passes.
- Sections marked **MUST** are required for v1. **SHOULD** is expected unless it blocks a milestone. **COULD** is optional polish.
- All data shapes are given as TypeScript interfaces (§12.4). Treat them as the contract between the content, the engine and the UI.
- When this PRD is silent, choose the simplest option that meets the acceptance criteria and write the decision down in `DECISIONS.md`.
- No backend in v1. Everything runs client-side and deploys as a static site.

### Glossary

| Term | Meaning |
|---|---|
| **Canvas** | The infinite, pannable, zoomable surface where diagrams live. Used in Learn, Practice and Design Lab. |
| **Node** | A component on the canvas (Load Balancer, Server, Database…). Rendered as an isometric block. |
| **Edge** | A connection between two nodes. Packets travel along edges. |
| **Packet** | An animated dot or shape moving along an edge (request, response, event, error…). |
| **Scene** | The full canvas state at one lesson step: nodes, edges, node states, flows, callouts, metrics. |
| **Step** | One beat of a lesson: a scene plus the explanation text. |
| **HUD** | The metric strip floating over the canvas (latency, RPS, error rate…). |
| **Flow** | A repeating packet animation along a path of edges (e.g. client → LB → server → DB and back). |
| **Layout override** | Where the user dragged a node. It is stored per lesson and replaces the authored position. |

---

## 1. Summary

ScaleCanvas is an interactive course that teaches system design through **live, animated diagrams you can touch**. Each lesson is a sequence of steps. Each step changes the diagram (new components, traffic, failures) and the explanation beside it.

What makes it different from the reference product:

1. **The diagram is a real canvas.** Users pan, zoom and **drag any block anywhere**, like Excalidraw. Edges, packets, labels and callouts follow the block while the animation keeps running. The canvas fills the whole screen; panels float above it.
2. **Practice is real:** quizzes, estimation drills, "fix this diagram" canvas exercises, spaced review and timed interview drills.
3. **Design Lab is real:** a free-form system-design sandbox with a component palette, a traffic simulator, failure injection and graded challenges.
4. **Cheatsheets are real:** printable one-page references with built-in calculators.
5. **New visual identity:** new fonts and a new "Blueprint" theme, plus an automatic night theme that switches on at **8 PM** local time.

### 1.1 Keep / Change / New

| Area | Reference behavior | ScaleCanvas |
|---|---|---|
| Lesson format | Step-through animated scenes, typed steps, callouts, recap | **Keep** (original content) |
| Diagram | Fixed layout, not interactive | **Change** → full-screen interactive canvas, draggable nodes |
| Layout | 3 fixed columns | **Change** → canvas fills the viewport; sidebar and step panel float and collapse |
| Live metrics strip | Yes | **Keep**, as a floating HUD |
| Search (Ctrl K) | Concepts, lessons, steps | **Keep** and extend to cheatsheets, practice and lab templates |
| Progress | localStorage | **Keep**, add export/import |
| Languages | 23, RTL | **Keep architecture**; ship EN + HI first (§11.3) |
| Light/dark | Manual toggle | **Change** → Light / Dark / Auto (system) / **Scheduled (8 PM–6 AM)** |
| Fonts & colors | Warm sand, monospace everywhere | **Change** → new identity (§4) |
| Practice / Design Lab / Cheatsheets | "Coming soon" placeholders | **New**, fully built |

---

## 2. Users and goals

| Persona | Need | Success looks like |
|---|---|---|
| **Student / junior dev** | Understand the basics visually | Finishes the Foundations and Scaling modules; passes their quizzes |
| **Interview candidate** | Practice designs under time pressure | Completes 3 Design Lab challenges and 2 timed drills |
| **Working engineer** | Quick reference and refreshers | Uses cheatsheets and calculators weekly |
| **Content creator / teacher** | Clean, rearrangeable diagrams to screen-record | Drags nodes into a custom layout, exports PNG/SVG, records the animation |

### Product goals (v1)

- G1: All 40 lessons playable on the interactive canvas, desktop and mobile.
- G2: Practice has at least 5 items per lesson (200+ items).
- G3: Design Lab has 20+ components, a working simulator, and 8+ graded challenges.
- G4: 16+ cheatsheets with print styles and 5 calculators.
- G5: Lighthouse ≥ 90 for Performance, Accessibility and Best Practices on the lesson page.

### Non-goals (v1)

User accounts, cloud sync, multiplayer editing, payments, AI tutor, video export. See §16.

---

## 3. Information architecture and routes

Hash routing (static hosting, deep links work everywhere).

| Route | Screen |
|---|---|
| `#/` | Home: continue card, module map, today's review count, quick links |
| `#/learn/:lessonId/:step` | Lesson player (step is 1-based) |
| `#/practice` | Practice hub |
| `#/practice/review` | Daily spaced-review session |
| `#/practice/lesson/:lessonId` | Lesson quiz |
| `#/practice/module/:moduleId` | Module test |
| `#/practice/drill/:drillId` | Timed interview drill |
| `#/lab` | Design Lab home (my designs, templates, challenges) |
| `#/lab/new` · `#/lab/:designId` | Lab editor |
| `#/lab/challenge/:challengeId` | Graded challenge in the Lab editor |
| `#/lab/share/:payload` | Read-only shared design (lz-string compressed JSON) |
| `#/cheatsheets` | Cheatsheet library |
| `#/cheatsheets/:sheetId` | A single sheet |
| `#/settings` | Theme, schedule, language, motion, data export/import/reset |

Top nav: **Learn · Practice · Design Lab · Cheatsheets**, then Search, Language, Theme, Settings.

---

## 4. Visual identity (new)

### 4.1 Direction: "Blueprint"

The product should feel like an engineer's drafting table: precise grid, crisp blocks, glowing signal colors on the data paths. It must look clearly different from the reference's warm sand notebook.

- **Light theme — "Drafting Paper":** cool off-white paper, faint blue grid, ink-navy text.
- **Dark theme — "Night Blueprint" (default after 8 PM):** pure black background with neutral grey surfaces and grid, glowing cyan packets.
- Isometric 2.5D blocks with flat faces (top lighter, two side faces darker), a 1.5 px ink outline and a soft drop shadow on the grid.
- Motion: springy and quick (180–320 ms UI; packets at a constant world speed). Respect `prefers-reduced-motion` (§13).

### 4.2 Typography (Google Fonts)

| Role | Font | Use |
|---|---|---|
| Display | **Bricolage Grotesque** 600/700 | Lesson titles, page headers, big numbers in recaps |
| UI / body | **Geist** 400/500/600 | Panels, explanations, buttons |
| Mono / data | **Geist Mono** 400/500 | HUD values, node labels, code, keyboard hints, step counter |
| Devanagari fallback | **Noto Sans Devanagari** | Hindi |
| Arabic/Hebrew fallback | **Noto Sans Arabic / Noto Sans Hebrew** | RTL languages (later) |

Scale (rem): 0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25. Body line-height 1.55. Use `font-variant-numeric: tabular-nums` for every metric.

All font names live in CSS variables (`--font-display`, `--font-ui`, `--font-mono`) so they can be swapped in one place.

### 4.3 Color tokens

Define in `:root` (light) and `[data-theme="dark"]`. Components use tokens only and never raw hex values.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4F6FA` | `#000000` | App and canvas background |
| `--grid` | `#D9E2F0` | `#121212` | Minor grid |
| `--grid-strong` | `#C3D1E8` | `#1C1C1C` | Major grid (every 5th line) |
| `--surface` | `#FFFFFF` | `#0A0A0A` | Floating panels |
| `--surface-2` | `#EEF2F8` | `#141414` | Inset areas, inputs |
| `--ink` | `#0E1A2E` | `#F2F2F2` | Primary text, outlines |
| `--ink-muted` | `#5A6A85` | `#A1A1A1` | Secondary text |
| `--line` | `#D3DCEA` | `#262626` | Borders, dividers |
| `--accent` | `#2563EB` | `#38BDF8` | Primary actions, focus ring, selection |
| `--accent-ink` | `#FFFFFF` | `#000000` | Text on accent |
| `--ok` | `#16A34A` | `#4ADE80` | Healthy, solved, responses |
| `--warn` | `#D97706` | `#FBBF24` | Warning, trade-off |
| `--bad` | `#DC2626` | `#F87171` | Errors, failures, problem |
| `--info` | `#7C3AED` | `#A78BFA` | Insight |

**Node category colors** (block top face; sides derived by darkening 12% and 24%):

| Category | Light | Dark | Examples |
|---|---|---|---|
| Client | `#CBD5E1` | `#64748B` | Browser, Mobile, Users crowd |
| Network / Edge | `#FCD34D` | `#F59E0B` | DNS, CDN, Gateway, Load Balancer |
| Compute | `#7DD3FC` | `#0EA5E9` | Server, Worker, Function |
| Data | `#C4B5FD` | `#8B5CF6` | SQL, NoSQL, Cache, Object store, Search |
| Messaging | `#FDBA74` | `#F97316` | Queue, Topic, Stream |
| Security | `#FDA4AF` | `#F43F5E` | Auth, Vault, WAF |
| Observability | `#86EFAC` | `#22C55E` | Metrics, Logs, Tracing |

**Packet colors:** request `--accent`, response `--ok`, async event messaging orange, error `--bad`, handshake = dashed `--ink-muted` ring, heavy request = larger square in `--warn`.

**Step-type badges:** Setup (slate), Problem (`--bad`), Solution (`--ok`), Technique (`--accent`), Trade-off (`--warn`), Insight (`--info`), Recap (ink on surface).

### 4.4 Theme modes and the 8 PM schedule (MUST)

Settings → Appearance → Theme: **Light · Dark · System · Scheduled**.

- **Scheduled** is the default for new users. Dark from **20:00 to 06:00** local time, light otherwise. Both times are editable (HH:MM pickers).
- Re-check every 60 s and on `visibilitychange`. When the scheme changes, cross-fade the theme over 400 ms (none when reduced motion is on).
- The header toggle cycles Light → Dark → Scheduled. A tooltip shows "Night theme at 20:00".
- Stored as `sc:theme = { mode, darkFrom: "20:00", darkTo: "06:00" }`.
- No flash of the wrong theme: an inline script in `index.html` sets `data-theme` before first paint.

---

## 5. App shell: canvas-first layout

The canvas is the stage. It fills the whole viewport behind everything. UI floats above it in panels.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡] ScaleCanvas   Learn  Practice  Design Lab  Cheatsheets   ⌕  EN ◐ ⚙ │  ← top bar (56px, translucent)
├──────────────────────────────────────────────────────────────────────┤
│┌────────────┐  ┌─ HUD: p95 140ms │ RPS 6,000 │ errors 0% ─┐ ┌────────┐│
││ Course     │  └───────────────────────────────────────────┘ │ Step   ││
││ tree       │                                                 │ 5 / 12 ││
││ (floating, │        ◇ LB ───► ◇ Server A                     │ TECH.  ││
││ collapsible│         │  ╲───► ◇ Server B   (drag anything)   │ Title  ││
││ )          │         │   ╲──► ◇ Server C                     │ Text   ││
││            │       ◇ users                                   │ Callout││
│└────────────┘                                                 │ [Back] ││
│ ┌ minimap ┐  [− 100% + ⤢ fit ⟲ reset layout]  [⏸ ⟳]            │ [Next] ││
│ └─────────┘  ●─●─●─●─◉─○─○─○─○─○─○─○  Least connections        └────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---|---|
| **Top bar** | Fixed. Translucent `--surface` at 80% opacity with backdrop blur. |
| **Course tree panel** (left, 280 px) | Floating card. Collapse with `[`. Auto-collapses below 1200 px wide. |
| **Step panel** (right, 360 px) | Floating card. Collapse with `]`. When collapsed, a slim pill shows "Step 5/12 · Next →". |
| **HUD** | Top center, floating chips. Scrolls horizontally on overflow. |
| **Canvas toolbar** | Bottom left: zoom −/+, zoom %, Fit, Reset layout, Lock layout, Minimap toggle. |
| **Playback** | Pause/Play, Replay step, speed (0.5× / 1× / 2×). |
| **Timeline** | Bottom center: step dots and the current step's title. Click a dot to jump. |
| **Minimap** | Bottom left, 180×120. Toggle with `M`. |
| **Focus mode** | `F` hides every panel except the HUD and a slim step pill. `Esc` exits. |

**Responsive behavior**

- **≥ 1200 px:** both panels open by default.
- **768–1199 px:** course tree collapsed; step panel open.
- **< 768 px:** the canvas takes the top ~55% of the viewport; the step panel becomes a **bottom sheet** (drag between peek/half/full). The course tree becomes a drawer from the ≡ button. A sticky Back/Next bar sits at the bottom. Pinch-zoom and one-finger pan on the canvas; long-press (300 ms) then drag moves a node, so scrolling doesn't move blocks by accident.
- No horizontal page scroll at any width ≥ 320 px. Side gutters 16 px on mobile.

---

## 6. Canvas engine (core feature)

One engine, used by Learn, Practice and Design Lab. Different modes switch features on and off (§6.9).

### 6.1 Coordinate model

- **World space:** 2D plane in "units". 1 unit = 1 px at 100% zoom. Node positions are stored in world space as the node's *ground anchor* (center of the block's base).
- **Camera:** `{ x, y, zoom }`. Zoom range 0.25–3.0. Wheel zoom centers on the cursor; pinch zoom centers on the pinch midpoint.
- **Isometric look without isometric math pain:** nodes are positioned in plain 2D world space. Each node *draws itself* as an isometric block inside its own bounding box, and the background grid is an isometric diamond pattern. Dragging is plain 2D, which is predictable for users. Edges are drawn between the nodes' port points.
- **Snap:** positions snap to a 20-unit grid by default. Hold `Alt` to drag without snapping. Snapping can be turned off in the toolbar.

### 6.2 Interactions (MUST)

| Action | Mouse / trackpad | Touch | Keyboard |
|---|---|---|---|
| Pan | Drag empty space · Space + drag · two-finger scroll | One-finger drag on empty space | Arrow keys when the canvas is focused and nothing is selected |
| Zoom | Ctrl/⌘ + wheel · pinch | Pinch | `+` / `-`, `0` = 100%, `1` = fit |
| Select node | Click | Tap | `Tab` / `Shift+Tab` cycles nodes |
| Multi-select | Shift + click · marquee drag on empty space with Shift | Two-finger tap toggles | `Ctrl/⌘ + A` |
| Move node(s) | Drag | Long-press 300 ms, then drag | Arrows move 20 u (Shift = 100 u, Alt = 1 u) |
| Inspect | Hover shows a tooltip (name, role, current state); click opens the info popover | Tap opens the popover | `Enter` |
| Undo / redo moves | `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z` | Toolbar buttons | Same |
| Reset layout | Toolbar "⟲ Reset layout" (with confirm) | Same | `Shift+R` |
| Lock layout | Toolbar lock (prevents accidental drags) | Same | `L` |
| Fit to content | Toolbar ⤢ | Double-tap empty space | `1` |

**While dragging:**
- The node lifts (shadow grows, +4 px) and shows a faint ghost of the authored position.
- Connected edges re-route live. Packets in flight **stay on their edge** and follow the new geometry. Packet progress is a ratio from 0 to 1 along the path, so moving a node never teleports a packet.
- Callouts, labels and load bars attached to the node move with it.
- Smart guides show when the node lines up with another node's center (magenta 1 px lines).
- Nodes may overlap. When released over another node, nudge it to the nearest free spot (150 ms ease).

### 6.3 Layout persistence (MUST)

- Authored positions come from the lesson content. User moves are stored as **overrides**: `sc:layout:<lessonId> = { [nodeId]: {x, y} }`.
- Overrides apply across **all steps** of that lesson, because node ids are stable across steps. If a node first appears in a later step and has no override, it uses its authored position *relative to the moved nodes it connects to*: offset it by the average displacement of its connected, moved neighbors. This keeps new blocks next to the cluster the user built.
- "Reset layout" clears the overrides for the lesson and animates nodes back (400 ms).
- The camera (pan/zoom) is stored per lesson. When the user hasn't touched the camera, each step change auto-fits to the step's `focus` nodes (600 ms ease). Once the user pans or zooms manually, auto-fit stops until they press Fit. A small "Auto-follow" toggle turns it back on.

### 6.4 Edges and routing

- Each node has 4 logical ports (N, E, S, W) in world space. An edge connects the two closest facing ports, recalculated on every move.
- Edge styles: `straight`, `orthogonal` (default; elbow route with 12 u rounded corners), `curved` (cubic Bézier).
- Edge decorations: arrowheads (none / end / both), a dashed style for async or optional paths, a label pill at the middle (e.g. "GET /products", "15 ms"), and a status color (normal, degraded, cut). A cut edge shows a red ✕ at its midpoint and packets stop at the break.
- Edge paths are SVG paths. Use `getTotalLength` / `getPointAtLength` (or an equivalent cached polyline) to place packets.

### 6.5 Animation engine

A single `requestAnimationFrame` loop owned by `AnimationClock`. It pauses when the tab is hidden and when the user presses Pause.

- **Flows:** a flow is an ordered list of edge hops, e.g. `[client→lb, lb→srvA, srvA→db, db→srvA (reverse), srvA→lb, lb→client]`. It has a packet type for each direction, a spawn rate (packets/s), a speed (world units/s, default 220), and an optional per-hop dwell time (the node "processes" the packet; its load ring pulses).
- **Load balancing in flows:** a hop can target a group (`lb→[srvA,srvB,srvC]`) with an algorithm: `roundRobin | leastConn | random | hash(key)`. The engine picks the target per packet, so the diagram shows the real behavior.
- **Node visual states:** `idle | active | busy | overloaded | down | recovering | highlighted | dimmed`. Each has a defined look: load ring color, pulse, desaturation, a red ✕ badge for down, a spinner for recovering.
- **Load bars:** each node can show a utilization bar (0–100%) with a number. The value tweens over 500 ms.
- **HUD metrics** tween numerically over 500–800 ms (count-up). A change is flashed: green when it improved, red when it got worse. Each metric declares which direction is better.
- **Step transitions:** diff the previous and next scenes (§7.3). Added nodes pop in (scale 0.6 → 1, 240 ms, spring); removed nodes fade and sink (200 ms); changed states cross-fade; edges draw in with a stroke-dash animation (300 ms). Positions never animate on a step change unless the authored position changed *and* there is no user override.
- **Packet cap:** at most 300 packets alive. Spawning is skipped when over the cap. Render packets on one `<canvas>` overlay or a single SVG `<g>` with transforms; never one React component per packet.
- **Speed control:** 0.5× / 1× / 2× scales the clock.

### 6.6 Annotations

- **Callouts:** anchored to a node (or an edge midpoint) with an offset. A pill with an icon and text, e.g. "4 active · 50%". They follow the anchor while dragging.
- **Panels on canvas:** larger cards anchored to the canvas (e.g. a "Where the time went" table, an idempotency log). They can be dragged themselves and their position is stored as a layout override with id `panel:<id>`.
- **Region / zone frames:** dashed rounded rectangles behind nodes with a label ("us-east-1a"). In Learn they auto-size to contain their member nodes plus 40 u of padding. In the Lab they can be resized by hand.

### 6.7 Rendering stack

- **@xyflow/react (React Flow v12)** for the viewport, pan/zoom, node dragging, selection, minimap and the background grid. Write custom node types (isometric SVG blocks) and custom edge types (orthogonal or curved paths with an animated packet layer).
- A packet layer of a custom overlay `<svg>` (or `<canvas>` if profiling shows > 150 packets cause jank) that is transformed with the viewport.
- The isometric block component takes `{ category, icon, label, size: 'sm'|'md'|'lg', state, load }` and draws it with an SVG `<polygon>` for each face. Icons are Lucide (MIT), centered on the top face and skewed with a matrix transform.
- Crowds ("users") are a special node type: a slab with N small person-pins (no faces or toy characters; simple rounded pins). N scales with the user count, up to 24 pins.

### 6.8 Accessibility on the canvas (MUST)

- Every node is a focusable element with `role="button"` and an `aria-label` like "Load balancer, busy, 72 percent load, connected to Server A, B and C".
- A visually hidden live region announces each step's summary and metric changes.
- **"Diagram as text"** toggle (`T`): a structured list of nodes, edges and current flows for screen-reader users and for anyone else.
- Keyboard moving of nodes (§6.2). The focus ring is 2 px `--accent` with a 2 px offset.

### 6.9 Engine modes

| Feature | Learn | Practice (canvas items) | Lab |
|---|---|---|---|
| Pan / zoom | ✅ | ✅ | ✅ |
| Move nodes | ✅ | ✅ | ✅ |
| Add / delete nodes | ❌ | Only when the item allows it (limited palette) | ✅ |
| Connect edges | ❌ | When the item allows it | ✅ |
| Edit node properties | ❌ | When the item allows it | ✅ |
| Annotation tools (text, sticky, frame, arrow, pen) | ❌ | ❌ | ✅ |
| Scripted steps | ✅ | ❌ | ❌ (challenges have a brief only) |
| Simulator-driven metrics | ❌ (authored values) | ✅ | ✅ |

### 6.10 Acceptance criteria (canvas)

- [ ] AC-C1: In any lesson step, dragging any node keeps every connected edge attached and packets keep moving along the new path without jumping.
- [ ] AC-C2: Moving a node, going to the next step, then reloading the page keeps the node where the user put it.
- [ ] AC-C3: "Reset layout" restores the authored positions with an animation, and only for the current lesson.
- [ ] AC-C4: Undo/redo works for at least 50 move operations.
- [ ] AC-C5: 60 fps on a mid-range laptop (e.g. 4-core, integrated GPU) with 20 nodes and 150 packets; ≥ 45 fps on a mid-range phone.
- [ ] AC-C6: Mobile: one-finger drag pans; long-press then drag moves a node; pinch zooms. The page itself never scrolls while interacting with the canvas.
- [ ] AC-C7: A keyboard-only user can select a node, move it, and return it to its original position.
- [ ] AC-C8: Pause freezes every packet and tween; Play continues exactly where they stopped.

---

## 7. Learn: the lesson player

### 7.1 Step panel (right)

From top to bottom:

1. `STEP 5 / 12` (mono) and the step-type badge.
2. Step title (display font, 1.375 rem).
3. Body: short paragraphs. Supports `**bold**`, `` `code` ``, and `[[term]]` links that open a glossary popover.
4. Optional callout box: `insight | warn | tip | next`, each with its own icon and color.
5. Optional **"What changed"** list: deltas with arrows, e.g. "↑ p95 140 → 540 ms" (colored by better/worse).
6. Back / Next buttons. Next shows the next step's title ("Next: Health checks →"). On the last step it becomes "Next lesson: <title> →".
7. A shortcut hint row: `← → step · R replay · Space pause · F focus`.

Below the step panel, a **"You'll learn"** checklist (lesson objectives). Each objective is ticked when the step that covers it is reached.

### 7.2 Lesson header

Floats at the top left of the canvas area: breadcrumb (`02 Scaling / Lesson 2 of 5`), title, chips (duration, level, step count), and a one-line subtitle. It shrinks to a single line after the first interaction with the canvas.

### 7.3 Scene model and diffs

Each step declares a **complete scene** (not a patch). This makes authoring simpler and makes jumping to any step deterministic. The engine diffs consecutive scenes to animate (§6.5). A `extends: "<stepId>"` field lets an author reuse the previous scene and override parts of it. It is resolved at build time to a full scene.

### 7.4 Recap step (MUST in every lesson)

- Recap card: 3–5 bullet takeaways.
- An optional summary table on the canvas (e.g. a latency breakdown).
- A "Coming up" box linking the next lesson.
- Buttons: **Take the quiz (5 questions)** → `#/practice/lesson/:id`, **Open in Design Lab** (copies the final scene into a new Lab design), and **Next lesson**.
- Marks the lesson as done (`sc:done`). A small confetti burst in category colors (skipped under reduced motion).

### 7.5 Keyboard (lesson page)

`→` / `←` next/previous step (mirrored in RTL), `R` replay step, `Space` pause/play, `F` focus mode, `[` / `]` toggle panels, `M` minimap, `T` diagram as text, `Shift+R` reset layout, `L` lock layout, `Ctrl/⌘+K` search, `?` shortcut sheet.

### 7.6 Curriculum (40 lessons, 9 modules)

Lesson content is **original writing**. The outlines below are the beats each lesson must cover (step titles are suggestions). Duration 8–15 minutes, 8–14 steps. Every lesson follows the arc **baseline → pressure → fix → new problem → better fix → edge case → recap**, and has at least one real-world case with numbers.

**01 Foundations**
1. `request-journey` — **The Life of a Request** (Beginner): typing a URL · name lookup & caching · TCP+TLS round trips · server work · DB query · response & download · extra assets · a slow query case · a far-away user case · recap with a time budget table.
2. `latency-throughput` — **Latency vs Throughput** (Beginner): two different questions · load rising · the utilization curve · percentiles beat averages · adding capacity · speed-of-light floor · Little's Law · fan-out tail latency · batching · recap.
3. `back-of-envelope` — **Back-of-Envelope Estimates** (Beginner): from DAU to RPS · peak factor · servers needed · storage per year · bandwidth · cache memory · numbers to remember · recap.

**02 Scaling**
4. `scale-up-out` — **Scale Up or Scale Out** (Beginner): one box · traffic spike · bigger box · its ceiling · single point of failure · many boxes · daily cycle · autoscaling · pre-scaling for events · who distributes traffic? · recap.
5. `load-balancers` — **Load Balancers** (Beginner): uneven load · one entry point · round robin · uneven requests · least connections · health checks · the LB as a SPOF · active/passive pair · failover · L7 path routing · rolling deploys · recap.
6. `stateless` — **Stateless Services** (Beginner): session in memory · logged out after a hop · sticky sessions · a sticky server dies · shared session store · signed tokens · local uploads problem · object storage · recap.
7. `caching` — **Caching** (Beginner): DB under read load · repeated reads · cache-aside · hit ratio math · stale data · invalidation · TTL & eviction · stampede · single-flight · negative caching & Bloom filters · cache layers · recap.
8. `cdn` — **CDNs & the Edge** (Beginner): distant users · static bytes · edge PoPs · cold edge · stale assets · versioned filenames · traffic spike shielding · private content · origin shield · recap.

**03 Data & Storage**
9. `sql-nosql` — **Choosing a Database** (Beginner): relational tables & joins · transactions · scaling strain · documents · key-value · wide-column · trade-offs · polyglot persistence · search engines · specialized stores · recap.
10. `indexes` — **Indexes** (Beginner): full scan · the B-tree idea · tree depth · write cost · composite order · leading wildcards · selectivity · reading a query plan · covering indexes · recap.
11. `storage-engines` — **Inside a Storage Engine** (Intermediate): memory vs disk · crash loses data · write-ahead log · fsync & group commit · checkpoints · B-tree pages · write-heavy loads · LSM: memtable & SSTables · reads with Bloom filters · compaction · row vs column storage · choosing · recap.
12. `replication` — **Replication** (Beginner): one DB · leader & followers · read replicas · replication lag · read-your-writes · leader failure · failover · analytics replica · replicas are not backups · sync vs async vs multi-leader · recap.
13. `sharding` — **Sharding** (Intermediate): data outgrows one node · range keys · hot ranges · hash keys · hot keys · key splitting · cross-shard queries · resharding · recap.
14. `consistent-hashing` — **Consistent Hashing** (Intermediate): modulo reshuffle · the ring · key ownership · adding a node · removing a node · uneven arcs · virtual nodes · replicas on the ring · cache clusters · recap.
15. `unique-ids` — **IDs at Scale** (Intermediate): auto-increment · shards collide · ticket server · ID blocks · UUIDv4 · random keys & index pain · time-ordered IDs · Snowflake layout · clock skew · what IDs reveal · choosing · recap.
16. `cap-consistency` — **CAP & Consistency** (Intermediate): two regions · partition · choose consistency · choose availability · healing & conflicts · clocks & versions · CAP stated properly · quorums W+R>N · per-operation choice · consistency models · recap.
17. `consensus` — **Consensus & Leader Election** (Advanced): one leader · split brain · majority · elections & terms · commit rule · healing · cluster sizes · paused leader · fencing tokens · cost of consensus · real systems · recap.
18. `transactions` — **Transactions & Isolation** (Intermediate): last seat · race condition · check-then-act fails · row locks · atomic updates · MVCC · isolation levels · phantoms & write skew · deadlocks · constraints as a safety net · long locks · reservations with expiry · recap.
19. `blob-storage` — **Files & Media** (Intermediate): blobs in the DB · DB chokes · object storage · uploads through servers · presigned URLs · multipart · async processing · CDN delivery · adaptive video · metadata in sync · lifecycle tiers · public bucket leak · recap.

**04 Communication**
20. `api-styles` — **REST, gRPC & GraphQL** (Beginner): what a contract is · REST resources · mobile over-fetching · GraphQL · its costs · RPC internally · pagination · versioning · choosing · recap.
21. `queues` — **Message Queues** (Beginner): slow work in a request · add a queue · spikes become backlog · more workers · worker crash · acks & redelivery · poison messages & DLQ · ordering · partitions · backpressure · recap.
22. `pubsub` — **Pub/Sub & Events** (Beginner): calling every service · one down breaks all · publish an event · queue vs topic · adding a subscriber · catching up · trade-offs · transactional outbox · replay · recap.
23. `realtime` — **Real-time Updates** (Beginner): HTTP can't push · short polling · polling at scale · long polling · SSE · WebSockets · many socket servers · offline users · presence · recap.

**05 Reliability**
24. `redundancy` — **Redundancy & Failover** (Intermediate): counting nines · single points of failure · two of everything · one building · availability zones · zone outage · RTO & RPO · chaos testing · bad deploys · canaries · multi-region · recap.
25. `rate-limiting` — **Rate Limiting** (Intermediate): one runaway client · a limit · token bucket · other algorithms · many gateways · 429 & back-off · per-tenant quotas · load shedding · recap.
26. `timeouts-retries` — **Timeouts, Retries & Circuit Breakers** (Intermediate): one slow dependency · timeouts & fallbacks · retries · retry storms · exponential back-off + jitter · circuit breaker states · idempotency keys · deadlines · bulkheads · recap.
27. `observability` — **Observability** (Intermediate): "it's slow" · metrics (RED/USE) · SLO-based alerts · structured logs · distributed traces · the fix · incident roles · blameless post-mortem · recap.

**06 Architecture**
28. `monolith-microservices` — **Monolith vs Microservices** (Intermediate): monolith strengths · growing pains · split by capability · data ownership · the network tax · distributed monolith · cross-service queries · local read models · contract tests · choosing · strangler migration · recap.
29. `service-discovery` — **Service Discovery & Gateways** (Intermediate): hard-coded addresses · churn · registry & heartbeats · client- vs server-side discovery · DNS-based · readiness & slow start · draining · registry outage · service mesh · API gateway · recap.
30. `sagas` — **Sagas & Distributed Transactions** (Advanced): partial booking · two-phase commit · blocking · sagas & compensations · orchestration · choreography · intermediate states · resuming · failed compensation · unknown outcomes · recap.
31. `batch-stream` — **Batch & Stream Processing** (Intermediate): analytics on prod DB · data lake & batch · map/reduce · skew & salting · streams · windows · late events & watermarks · consumer lag · partitions · approximate counts (HLL, CMS) · lambda/kappa · recap.

**07 Security**
32. `authentication` — **Authentication** (Intermediate): plaintext passwords · slow salted hashes · sessions · safe resets · credential stuffing · rate limits & lockouts · MFA · phishing · passkeys · identity providers · short-lived tokens & refresh · recap.
33. `authorization` — **Authorization** (Intermediate): changing an ID in the URL (BOLA) · ownership checks · mass assignment · row-level security · RBAC · relationship-based access · central policy engine · admin keys · least privilege · confused deputy · delegated access · audit logs · recap.
34. `encryption` — **Encryption & Secrets** (Intermediate): open Wi-Fi sniffing · TLS · expired certs · internal mTLS · stolen backup · encryption at rest & KMS · key rotation · leaked key in git · secret managers · tokenization · end-to-end encryption · recap.

**08 Shipping**
35. `testing` — **Testing Strategy** (Beginner): is it safe to ship? · manual testing · unit tests · test doubles · integration tests · contract tests · end-to-end · the pyramid · flaky tests · load & failure tests · recap.
36. `cicd` — **CI/CD & Deployments** (Intermediate): manual deploys · Friday incident · CI on every push · build once, promote · continuous delivery · blue-green · canary · expand/contract migrations · feature flags · DORA metrics · recap.

**09 Whole Systems**
37. `hld-lld` — **High-Level vs Low-Level Design** (Beginner): two zoom levels · the system map · HLD trade-offs · zooming in · LLD decisions (schemas, state machines) · contracts · working top-down · recap.
38. `design-url-shortener` — **Design: URL Shortener** (Intermediate): requirements · estimates · first draft · hashing collisions · counter + base62 · enumeration risk · read cache · 301 vs 302 · storage choice · click analytics off the hot path · abuse controls · recap.
39. `design-news-feed` — **Design: News Feed** (Intermediate): requirements · estimates · fan-out on read · read cost · fan-out on write · store IDs only · celebrity problem · hybrid · inactive users · cursor pagination · rebuilding lost caches · recap.
40. `design-chat` — **Design: Chat System** (Advanced): requirements · connection math · single server · locating the recipient · connection registry · persist then deliver · offline sync · dedupe with client IDs · group fan-out · presence · gateway crash recovery · recap.

### 7.7 Worked example (authoring reference)

Agents should build lesson 1 first from this example and use it as the template for the rest.

```jsonc
{
  "id": "request-journey",
  "module": "foundations",
  "title": "The Life of a Request",
  "subtitle": "Trace one page load across the network and see which hop costs the most.",
  "level": "beginner",
  "minutes": 10,
  "objectives": [
    { "id": "o1", "text": "Why name lookups are cached", "coveredAt": "s2" },
    { "id": "o2", "text": "Why new connections cost round trips", "coveredAt": "s3" },
    { "id": "o3", "text": "The browser → server → database path", "coveredAt": "s5" },
    { "id": "o4", "text": "Where page-load time really goes", "coveredAt": "s7" },
    { "id": "o5", "text": "How one slow query or a long distance changes the total", "coveredAt": "s9" }
  ],
  "hud": [
    { "id": "dns", "label": "Name lookup", "unit": "ms", "better": "lower" },
    { "id": "conn", "label": "Connect", "unit": "ms", "better": "lower" },
    { "id": "server", "label": "Server", "unit": "ms", "better": "lower" },
    { "id": "dl", "label": "Download", "unit": "ms", "better": "lower" },
    { "id": "total", "label": "Total", "unit": "ms", "better": "lower", "emphasis": true }
  ],
  "steps": [
    {
      "id": "s1",
      "type": "setup",
      "title": "\"The store feels slow\"",
      "body": "Before speeding anything up, measure where the time goes. Let's follow one page load from the moment you press Enter.",
      "callout": { "kind": "insight", "text": "A web request is a chain of conversations between machines. Every link adds time." },
      "scene": {
        "nodes": [
          { "id": "you", "kind": "laptop", "label": "you", "pos": { "x": 0, "y": 0 } }
        ],
        "callouts": [{ "anchor": "you", "offset": { "x": 0, "y": -90 }, "icon": "globe", "text": "https://store.example" }],
        "hud": { "dns": null, "conn": null, "server": null, "dl": null, "total": null },
        "focus": ["you"]
      }
    },
    {
      "id": "s2",
      "type": "technique",
      "title": "Find the address",
      "body": "Computers route by IP, not by name. A **resolver** turns `store.example` into an address. The answer is cached, so the next lookup is almost free.",
      "extends": "s1",
      "scene": {
        "nodes": [{ "id": "dns", "kind": "dns", "label": "Resolver", "pos": { "x": 260, "y": -180 } }],
        "edges": [{ "id": "e-you-dns", "from": "you", "to": "dns", "label": "20 ms" }],
        "flows": [{ "id": "f-dns", "hops": ["you>dns", "dns>you"], "packet": ["request", "response"], "rate": 1.2 }],
        "hud": { "dns": 20, "total": 20 },
        "focus": ["you", "dns"]
      },
      "changes": [{ "metric": "total", "from": 0, "to": 20 }]
    }
    // … s3–s10 follow the same shape
  ]
}
```

### 7.8 Acceptance criteria (Learn)

- [ ] AC-L1: All 40 lessons load from content files and pass schema validation in CI.
- [ ] AC-L2: Jumping to any step by URL renders the correct scene with no animation glitches. `#/learn/caching/9` works on a cold load.
- [ ] AC-L3: HUD values match each step's authored values after their tweens finish.
- [ ] AC-L4: Finishing the recap marks the lesson done; the module counter and global progress update immediately.
- [ ] AC-L5: The last viewed lesson and step are restored on Home ("Continue where you left off").

---

## 8. Practice (new)

### 8.1 Hub (`#/practice`)

- **Today:** "N cards due for review" → Start review. Streak counter (days in a row with ≥ 1 review). XP total.
- **By lesson:** grid of lesson quizzes. Each shows best score and a lock icon if the lesson isn't done yet (soft lock: the user can still open it with a "Haven't finished the lesson" warning).
- **Module tests:** unlocked when ≥ 60% of the module's lessons are done.
- **Interview drills:** timed, open-ended design drills that use the Lab canvas (§8.5).
- **Mastery map:** a heatmap of concept tags (e.g. `caching.invalidation`), colored by mastery (0–100).

### 8.2 Item types (MUST support all)

| Type | What the user does | Grading |
|---|---|---|
| `mcq` | Pick one option | Exact |
| `multi` | Pick all correct options | All-or-nothing; partial credit shown |
| `numeric` | Enter an estimate (e.g. "RPS for 50M DAU, 20 req/user/day") | Within `tolerance` (percent) or within the same order of magnitude (`tolerance: "oom"`) |
| `order` | Drag cards into the right order (e.g. request hops) | Exact order; partial credit = longest correct subsequence / n |
| `match` | Match pairs (problem ↔ technique) | Per-pair |
| `spot` | Click the bottleneck node on a live canvas | The correct node id |
| `fix` | Change a canvas (add / move / connect / configure components from a limited palette) until the simulator meets the target | Validator runs the simulator (§9.4) and checks constraints, e.g. `p95 < 200 ms AND errors < 1%` |
| `tradeoff` | A scenario with 2–4 designs; pick one | Correct choice; every option has an explanation |

Every item has: `id`, `lessonId`, `tags[]`, `difficulty 1–3`, `prompt`, type-specific fields, `explanation` (shown after answering), and an optional `hint` (costs half the XP).

### 8.3 Sessions

- **Lesson quiz:** 5 items from the lesson's pool (always one `numeric` or `spot`/`fix` when available). Result screen: score, per-item review, "Review this step" links that deep-link into the lesson.
- **Module test:** 12 items across the module, 15-minute soft timer.
- **Daily review:** spaced repetition (§8.4). Up to 20 items; the user can continue past that.
- Feedback right after each answer: correct/incorrect animation, explanation, link to the step that teaches it.

### 8.4 Spaced repetition

Leitner system with 5 boxes. Intervals: 1, 2, 4, 8, 16 days. Correct → next box; wrong → box 1. An item enters the system the first time it's answered. Stored in `sc:srs = { [itemId]: { box, due: ISODate, history: [{date, correct}] } }`.

Concept mastery = a weighted average over the tag's items (box/5, with more weight on recent answers).

### 8.5 Interview drills

- Choose a brief (URL shortener, news feed, chat, rate limiter, file storage, notification system, ride matching, search autocomplete).
- 45-minute timer with phase prompts: **Requirements (5 min) → Estimates (5) → High-level design (15) → Deep dive (15) → Wrap-up (5)**.
- Requirements and estimates are text boxes with a checklist of points a strong answer covers (self-graded).
- The design happens in an embedded Lab canvas. At the end the simulator runs the brief's load profile and shows the automatic rubric (§9.6) next to a self-review checklist.
- History of attempts with time per phase.

### 8.6 XP and streaks

- XP: correct = 10 × difficulty, first-try bonus +5, hint = half. Lesson done = 50. Challenge passed = 100.
- Streak = consecutive local days with any review or quiz. One "freeze" is earned per 7-day streak.
- No leaderboards in v1.

### 8.7 Content volume

At least **5 items per lesson** (200+), with at least one `spot` or `fix` item for every lesson in modules 02, 03 and 05. Items are authored in `content/practice/<lessonId>.json`.

### 8.8 Acceptance criteria (Practice)

- [ ] AC-P1: Every item type works with mouse, touch and keyboard.
- [ ] AC-P2: `fix` items: the validator result matches what the Lab simulator shows for the same graph.
- [ ] AC-P3: Due counts are correct across midnight and time zones (use local dates).
- [ ] AC-P4: Explanations link back to the right lesson step.

---

## 9. Design Lab (new)

A free-form system-design canvas with a simulator. Think "Excalidraw meets a capacity planner".

### 9.1 Editor layout

- **Left:** component palette (searchable, grouped by category, drag onto the canvas or click to add at the center).
- **Center:** canvas (engine in Lab mode).
- **Right:** inspector (properties of the selected node, edge, or the whole design when nothing is selected).
- **Top:** design name (editable), Undo/Redo, Run/Stop simulation, Traffic profile, Failure injection, Share, Export, and template/challenge info.
- **Bottom:** results drawer (metrics, per-node table, rubric). It can be collapsed.

### 9.2 Component palette (MUST, 24 components)

| Category | Components |
|---|---|
| Client | Users (crowd), Web client, Mobile client |
| Network / Edge | DNS, CDN, Load balancer (L4/L7), API gateway, WAF |
| Compute | App server, Worker, Serverless function, Cron/scheduler |
| Data | SQL database (primary), Read replica, NoSQL (KV/document), Cache, Object storage, Search index, Data warehouse |
| Messaging | Queue, Topic (pub/sub), Stream (log) |
| Security | Auth / identity provider, Secrets vault |
| Observability | Metrics/logs/traces collector (decorative; adds overhead to nothing) |

Each component has a default property set (§9.3) and a default size.

### 9.3 Properties (inspector)

Common: `label`, `region` (us-east, us-west, eu-west, ap-south, ap-southeast), `zone` (a/b/c), `instances` (1–100), `capacityPerInstance` (RPS), `baseLatencyMs`, `availability` (e.g. 99.9%), `costPerInstanceHour` (USD).

Type-specific:
- **Load balancer:** algorithm (round robin / least connections / hash), health checks on/off.
- **Cache / CDN:** hit ratio (0–1), TTL, eviction policy (informational).
- **SQL primary:** max write RPS, replicas (link to replica nodes), sync/async replication.
- **Queue / Topic / Stream:** partitions, retention, delivery (at-least-once / at-most-once).
- **Worker:** consumes from a queue/topic; processing time.
- **Autoscaling** (app servers, workers): min/max instances, target utilization.
- **Edge:** `kind` sync / async; `readRatio` split (for paths that fork reads and writes); `network` override.

### 9.4 Simulator (MUST)

Runs in a **Web Worker** so the UI stays smooth. Two parts: a steady-state analytic solver (instant numbers) and a visual tick loop (packets and backlog growth).

**Inputs**
- Graph (nodes, edges, properties).
- Traffic profile: entry node(s), `rps` (constant, or a 24-hour curve, or a spike: base → peak over a duration), `readRatio`, request mix (light/heavy), and client region distribution.
- Failure injections (§9.5).

**Steady-state model** (per node `n`, recomputed whenever anything changes)
- Incoming rate `λn` is propagated from the entry points along the edges:
  - Load balancer: splits `λ` across *healthy* targets. Round robin = equal shares; least connections and hash = capacity-weighted shares; hash gets ±15% deterministic skew per target to show hot spots.
  - Cache / CDN: forwards `(1 − h)·λ` downstream on a miss; a hit returns with `cacheLatency`.
  - SQL primary with replicas: writes go to the primary; reads are split equally across replicas (+ the primary if "read from primary" is on).
  - Async edges (to a queue or topic): the user-facing path ends there. Downstream consumers see `λ` as their incoming rate.
  - Topic: every subscriber receives the full `λ`.
- Capacity `cn = instances × capacityPerInstance`. Utilization `ρ = λn / cn`.
- **Latency (M/M/1 approximation per instance):** mean response `W = S / (1 − ρ)` where `S = baseLatencyMs`. Response time is exponential, so `p50 = 0.693·W`, `p95 = 3.0·W`, `p99 = 4.6·W`. For display, clamp `ρ` to 0.98.
- **Overload (`ρ ≥ 1`):**
  - Synchronous node: excess `λn − cn` is rejected → errors. Latency shows the clamped value with a red "saturated" badge.
  - Queue: backlog grows at `λin − λout` per second (visible in the tick loop); oldest-message age is shown.
- **Network latency per edge:** same zone 0.5 ms, cross-zone 1.5 ms, cross-region from a fixed RTT table (us-east↔us-west 65, us-east↔eu-west 80, us-east↔ap-south 190, eu-west↔ap-south 120, ap-south↔ap-southeast 60, us-west↔ap-southeast 160 ms; symmetric).
- **End-to-end latency:** for each path from the client to the deepest synchronous node and back, sum node `W` and edge network latency. Weight paths by their traffic share. Report p50, p95 and p99 of the mixture (compute them by sampling 10 000 requests through the path probabilities in the worker).
- **Availability:** series = product of availabilities; parallel (n healthy instances or replicas behind a LB) = `1 − Π(1 − a)`. Report the overall design availability and the equivalent monthly downtime.
- **Cost:** `Σ instances × costPerInstanceHour × 730` per month, plus a simple egress estimate (CDN hits are charged at the CDN rate).
- **Autoscaling:** each tick, if `ρ > target` and below max, add one instance after a 30-second simulated delay. Remove instances when `ρ < target/2`, above min.

**Outputs:** per node (λ, ρ, p95, errors/s, backlog, instances, cost), global (throughput, p50/p95/p99, error rate, availability, $/month), and a warnings list ("DB primary at 97% — consider read replicas or a cache", "Single point of failure: Load balancer").

**SPOF detection:** any node whose removal disconnects the entry point from every sink, and that has `instances = 1` and no standby, gets flagged.

**Visual tick loop:** 10 Hz simulated time, 1–10× speed. Packets are spawned in proportion to λ (scaled so at most ~300 are on screen). Node load rings show ρ. Overloaded nodes glow red and shake slightly (2 px, unless reduced motion).

### 9.5 Failure injection

Click a node or edge → "Inject failure": **Kill** (down), **Slow** (latency × N), **Error rate** (x%), **Partition** (cut an edge or isolate a zone/region), **Spike** (traffic × N for T seconds). Failures can be scheduled on a small timeline ("at t=30 s kill zone a"). The simulator shows failover behavior: LB health checks drop dead targets after 3 s of sim time; a replica is promoted after 10 s if failover is on.

### 9.6 Challenges (MUST, ≥ 8)

Each challenge has: brief, functional requirements, non-functional targets, traffic profile, budget, allowed palette (optional), a starting graph (optional), a rubric, and hints.

| Challenge | Key targets |
|---|---|
| Survive the launch | 200 → 20 000 RPS spike; p95 < 300 ms; errors < 1% |
| Read-heavy catalog | 50k RPS, 95% reads; p95 < 100 ms; budget $8k/mo |
| URL shortener | 100k redirects/s; p99 < 50 ms; 99.95% availability |
| News feed | 200M DAU; feed p95 < 200 ms; handle a celebrity post |
| Chat | 20M connections; ordered delivery; survive a gateway crash |
| Global audience | Users in 4 regions; p95 < 150 ms for everyone |
| Zone outage | Kill zone a at t=60 s; availability ≥ 99.9% during the run |
| Video upload pipeline | 5k uploads/min; API p95 < 200 ms; processing backlog drains within 10 min |

**Rubric (auto-graded):** each target is pass/fail from simulator output, plus structural checks (e.g. "no single points of failure", "writes and reads separated", "async path for slow work"). Score 0–100. Pass ≥ 70. Show which checks failed and link the lessons that teach them.

### 9.7 Annotation tools (SHOULD)

Excalidraw-style tools in the Lab only: **Select (V)**, **Hand (H)**, **Text (T)**, **Sticky note (N)**, **Frame / zone (F)**, **Arrow (A)** (free arrow, not a data edge), **Pen (P)** (freehand, smoothed with `perfect-freehand`), **Eraser (E)**. Annotations are ignored by the simulator.

### 9.8 Persistence, sharing and export

- Designs are saved to **IndexedDB** (`idb-keyval`), autosaved 1 s after the last change. "My designs" grid with thumbnail, name and last edit.
- **Share link:** `#/lab/share/<lz-string compressed JSON>`. It opens read-only with a "Duplicate to my designs" button. If the payload is over ~8 KB, offer "Download .json" instead.
- **Export:** PNG (2×, transparent or theme background), SVG, JSON. **Import:** JSON (validated against the schema).
- **Templates:** the final scene of each lesson ("Open in Design Lab") plus 6 starter templates (3-tier web app, read-heavy with cache, event-driven, global CDN, chat gateway, data pipeline).

### 9.9 Acceptance criteria (Design Lab)

- [ ] AC-D1: Build client → LB → 3 servers → DB, run 3 000 RPS with servers at 1 500 RPS each: ρ ≈ 0.67 per server, and the numbers update within 100 ms of changing any property.
- [ ] AC-D2: Adding a cache with h = 0.9 in front of the DB cuts the DB's λ by 90% and lowers p95.
- [ ] AC-D3: Killing one of 3 servers moves its traffic to the other two after the health-check delay.
- [ ] AC-D4: A queue with consumers below the arrival rate shows a growing backlog and oldest-message age.
- [ ] AC-D5: Share link round-trips: open the link in a private window and get an identical graph.
- [ ] AC-D6: Undo/redo covers add, delete, connect, move and property edits (≥ 100 steps).
- [ ] AC-D7: The simulator never blocks the main thread longer than 16 ms.

---

## 10. Cheatsheets (new)

### 10.1 Library (`#/cheatsheets`)

A grid of sheet cards (title, module color, a 1-line summary), filters by module, a pin/favorite star, and search.

### 10.2 Sheet layout

Designed to fit **one A4 page** when printed (print CSS: no nav, black-on-white, 2 columns, 10 pt mono for numbers).

Each sheet contains some of these blocks:
- **Key numbers** table
- **Decision table** ("Use X when…")
- **Formulas** (rendered with KaTeX)
- **Patterns & pitfalls** (2 columns: do / avoid)
- **Mini diagram** (a static canvas snapshot; "Open in Design Lab" button)
- **Interview phrases** (2–4 crisp sentences to say out loud)
- **Related lessons** links

Actions: Copy as Markdown, Print / Save as PDF, Pin.

### 10.3 Sheets (MUST, 16)

1. Latency numbers every engineer should know (memory, SSD, network, cross-region)
2. Powers of two & data sizes; estimation shortcuts (seconds per day ≈ 86 400 ≈ 10⁵)
3. Availability nines → downtime per year/month/week
4. Caching patterns (cache-aside, read-through, write-through, write-back, write-around) & invalidation
5. Load balancing algorithms & L4 vs L7
6. Database choice matrix (relational, document, KV, wide-column, graph, time-series, search, warehouse)
7. Indexing rules of thumb & reading query plans
8. Replication & sharding strategies
9. Consistency models, CAP/PACELC, quorums
10. Messaging: queue vs topic vs stream; delivery guarantees
11. API styles: REST vs gRPC vs GraphQL vs WebSocket vs SSE
12. Reliability patterns: timeouts, retries, back-off + jitter, circuit breaker, bulkhead, idempotency
13. Rate limiting algorithms compared
14. Security essentials: authN vs authZ, OWASP API top risks, token types, encryption at rest/in transit
15. Deployment strategies: rolling, blue-green, canary, feature flags, expand/contract migrations
16. Interview framework: a 45-minute plan, requirement questions, estimate template, and deep-dive menu

### 10.4 Calculators (MUST, 5)

Embedded in the relevant sheets and also listed on their own:

| Calculator | Inputs → Outputs |
|---|---|
| **Traffic** | DAU, actions/user/day, peak factor, read:write → avg & peak RPS, read & write RPS |
| **Storage** | Writes/day, bytes/record, replication factor, years → total storage, per-day growth |
| **Bandwidth** | RPS, response size → ingress/egress Mbps & TB/month |
| **Availability** | Components in series/parallel with their SLAs → combined availability & downtime |
| **Servers** | Peak RPS, RPS per instance, target utilization, N+1 → instance count |

All outputs use human units (K/M/B, KB/MB/GB/TB) and update live.

### 10.5 Acceptance criteria (Cheatsheets)

- [ ] AC-S1: Every sheet prints on a single A4 page in Chrome with default margins.
- [ ] AC-S2: Calculators are correct against a unit-tested reference (e.g. 10M DAU × 10 actions ÷ 86 400 ≈ 1 157 RPS average).
- [ ] AC-S3: Sheets are searchable from Ctrl K, down to individual table rows.

---

## 11. Cross-cutting features

### 11.1 Search / command palette (Ctrl/⌘ K)

- Built with `cmdk` and a `MiniSearch` index built at build time (`search-index.json`), lazy-loaded the first time the palette opens.
- Result groups: **Concepts** (glossary terms), **Lessons**, **Steps**, **Cheatsheets**, **Practice**, **Lab templates & challenges**, **Commands** ("Toggle theme", "Reset layout", "Go to settings").
- Matches are highlighted, with snippets of ±60 characters around the match. ↑↓ to move, Enter to open, Esc to close. Typo tolerance (fuzzy 0.2) and prefix search.

### 11.2 Progress and data

| Key (localStorage, `sc:` prefix) | Content |
|---|---|
| `sc:done` | Completed lesson ids |
| `sc:last` | `{ lessonId, step }` |
| `sc:recent` | Last 10 visited `{ lessonId, step }` |
| `sc:layout:<lessonId>` | Node position overrides |
| `sc:camera:<lessonId>` | Camera |
| `sc:srs`, `sc:xp`, `sc:streak` | Practice state |
| `sc:theme`, `sc:lang`, `sc:motion`, `sc:panels` | Preferences |

Lab designs live in IndexedDB. **Settings → Data:** Export everything (one JSON file), Import (merge or replace), Reset all (confirm by typing "RESET"). Every storage read/write is wrapped in try/catch; the app works without storage (private mode).

### 11.3 Internationalization

- `i18next` with JSON namespaces: `ui`, `glossary`, and one per lesson. Lesson content is keyed so translations never touch scene geometry.
- v1 ships **English and Hindi**. The architecture supports RTL (`dir` on `<html>`, CSS logical properties everywhere, mirrored arrow-key navigation, canvas content not mirrored).
- Diagram labels are translated, but technical identifiers (`GET /products`, `Idempotency-Key`) stay in English.
- The language menu shows the native name, the English name and a 2-letter code.

### 11.4 Settings page

Appearance (theme mode, schedule times, accent preview), Motion (full / reduced / off), Canvas (snap to grid, edge style, packet density low/normal/high, auto-follow camera), Language, Keyboard shortcuts reference, Data (export/import/reset), About (version, credits, licenses).

### 11.5 Home page

- Hero: product name, one-line pitch, a live mini canvas (a small looping scene the user can drag).
- **Continue** card (last lesson and step with a progress ring).
- Module map: 9 module cards with progress bars.
- Today: due reviews, streak, a suggested next challenge.
- Quick links: cheatsheets pinned by the user.

### 11.6 PWA (SHOULD)

`vite-plugin-pwa`: installable, offline for every lesson, cheatsheet and the Lab. A "New version available — Reload" toast on update.

---

## 12. Technical architecture

### 12.1 Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Framework | React 18 + Vite 5 |
| Canvas | @xyflow/react 12 (custom nodes/edges) + custom packet overlay |
| State | Zustand (+ `immer`), `zundo` for undo/redo |
| Styling | CSS variables for tokens + Tailwind CSS 3 (configured to read the tokens) |
| UI primitives | Radix UI (Dialog, Popover, DropdownMenu, Tooltip, Tabs, Slider) |
| Motion (UI) | `motion` (Framer Motion successor) for panels & step transitions |
| Icons | `lucide-react` |
| Search | `minisearch` + `cmdk` |
| i18n | `i18next` + `react-i18next` |
| Storage | localStorage + `idb-keyval` |
| Share links | `lz-string` |
| Export | `html-to-image` (PNG), native SVG serialization |
| Freehand | `perfect-freehand` |
| Math | `katex` |
| Validation | `zod` (content schemas, imports) |
| Simulator | Web Worker via `comlink` |
| Tests | Vitest + Testing Library; Playwright for end-to-end and visual checks |
| Lint/format | ESLint (typescript-eslint), Prettier |
| Hosting | Vercel (static) |

### 12.2 Folder structure

```
scalecanvas/
├─ index.html                  # inline theme script (no flash)
├─ public/ (og.png, icons, fonts preconnect)
├─ content/
│  ├─ curriculum.json          # modules → lesson ids, order
│  ├─ lessons/<id>.json        # lesson + steps + scenes (§7.7)
│  ├─ practice/<lessonId>.json
│  ├─ challenges/<id>.json
│  ├─ cheatsheets/<id>.mdx|json
│  ├─ glossary.json
│  └─ i18n/<lang>/{ui,glossary,<lessonId>}.json
├─ scripts/
│  ├─ validate-content.ts      # zod-validates everything (CI)
│  ├─ resolve-extends.ts       # flattens step "extends" into full scenes
│  └─ build-search-index.ts
├─ src/
│  ├─ app/ (router, shell, providers, theme scheduler)
│  ├─ canvas/
│  │  ├─ CanvasStage.tsx        # React Flow wrapper, modes
│  │  ├─ nodes/IsoBlock.tsx, Crowd.tsx, Laptop.tsx, Frame.tsx, Note.tsx
│  │  ├─ edges/DataEdge.tsx
│  │  ├─ packets/PacketLayer.tsx, AnimationClock.ts, flows.ts
│  │  ├─ layout/overrides.ts, autoFit.ts, guides.ts
│  │  └─ a11y/DiagramAsText.tsx
│  ├─ learn/ (LessonPlayer, StepPanel, Timeline, Hud, Recap, sceneDiff.ts)
│  ├─ practice/ (Hub, items/*, srs.ts, Drill)
│  ├─ lab/ (Editor, Palette, Inspector, Results, Challenges, sim/worker.ts, sim/model.ts)
│  ├─ cheatsheets/ (Library, Sheet, calculators/*)
│  ├─ search/ (CommandPalette)
│  ├─ settings/
│  ├─ store/ (progress, prefs, layout, lab)
│  ├─ styles/ (tokens.css, fonts.css, print.css)
│  └─ lib/ (storage.ts, i18n.ts, format.ts)
└─ tests/ (unit, e2e)
```

### 12.3 State stores

- `usePrefs`: theme mode and schedule, language, motion, canvas settings, panels.
- `useProgress`: done, last, recent, xp, streak.
- `useLessonView`: current lesson, step, playback, camera, and overrides (persisted per lesson).
- `useLab`: the design graph, selection and tools, with `zundo` undo history.
- `useSim`: worker proxy, last results, running flag.

### 12.4 Core types

```ts
type Level = 'beginner' | 'intermediate' | 'advanced';
type StepType = 'setup' | 'problem' | 'solution' | 'technique' | 'tradeoff' | 'insight' | 'recap';
type NodeCategory = 'client' | 'network' | 'compute' | 'data' | 'messaging' | 'security' | 'observability';
type NodeState = 'idle' | 'active' | 'busy' | 'overloaded' | 'down' | 'recovering' | 'highlighted' | 'dimmed';
type PacketKind = 'request' | 'response' | 'event' | 'error' | 'handshake' | 'heavy';

interface Vec { x: number; y: number }

interface Module { id: string; num: string; title: string; color: NodeCategory; lessons: string[] }

interface Lesson {
  id: string; module: string; title: string; subtitle: string;
  level: Level; minutes: number;
  objectives: { id: string; text: string; coveredAt: string }[];
  hud: HudMetricDef[];
  steps: Step[];
  next?: string;
}

interface HudMetricDef { id: string; label: string; unit?: string; better: 'lower' | 'higher' | 'none'; emphasis?: boolean; format?: 'int' | 'ms' | 'pct' | 'bytes' | 'text' }

interface Step {
  id: string; type: StepType; title: string; body: string;
  callout?: { kind: 'insight' | 'warn' | 'tip' | 'next'; text: string };
  changes?: { metric?: string; text?: string; from?: number | string; to?: number | string }[];
  extends?: string;              // resolved at build time
  scene: Scene;
}

interface Scene {
  nodes: SceneNode[];
  edges?: SceneEdge[];
  flows?: Flow[];
  callouts?: Callout[];
  panels?: CanvasPanel[];
  frames?: Frame[];
  hud: Record<string, number | string | null>;
  focus?: string[];              // node ids for auto-fit
  remove?: string[];             // only valid with extends
}

interface SceneNode {
  id: string;                    // stable across steps
  kind: string;                  // 'lb' | 'server' | 'sql' | 'cache' | 'crowd' | 'laptop' | ...
  label: string;
  pos: Vec;                      // authored world position
  size?: 'sm' | 'md' | 'lg';
  state?: NodeState;
  load?: number;                 // 0..1 utilization bar
  badge?: string;                // e.g. '4 active'
  count?: number;                // crowd size
}

interface SceneEdge {
  id: string; from: string; to: string;
  style?: 'orthogonal' | 'straight' | 'curved';
  dashed?: boolean; arrow?: 'none' | 'end' | 'both';
  label?: string; status?: 'normal' | 'degraded' | 'cut';
}

interface Flow {
  id: string;
  hops: (string | { from: string; to: string[]; algo: 'roundRobin' | 'leastConn' | 'random' | 'hash' })[]; // "a>b" = forward along edge a→b
  packet: PacketKind | PacketKind[];   // per direction or per hop
  rate: number;                        // packets per second
  speed?: number;                      // world units per second
  dwellMs?: number;
}

interface Callout { id?: string; anchor: string; offset: Vec; icon?: string; text: string; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }
interface CanvasPanel { id: string; anchor?: string; pos?: Vec; title: string; rows: [string, string][]; highlightRow?: number }
interface Frame { id: string; label: string; members: string[] }

interface LayoutOverrides { [nodeOrPanelId: string]: Vec }

// Practice
type PracticeItem =
  | { type: 'mcq'; options: string[]; answer: number }
  | { type: 'multi'; options: string[]; answer: number[] }
  | { type: 'numeric'; unit: string; answer: number; tolerance: number | 'oom' }
  | { type: 'order'; cards: string[] }                 // authored in correct order, shuffled at runtime
  | { type: 'match'; left: string[]; right: string[]; pairs: [number, number][] }
  | { type: 'spot'; scene: Scene; answer: string }
  | { type: 'fix'; graph: LabGraph; palette: string[]; profile: TrafficProfile; targets: Target[] }
  | { type: 'tradeoff'; scenario: string; options: { text: string; why: string }[]; answer: number };

type PracticeItemBase = { id: string; lessonId: string; stepRef?: string; tags: string[]; difficulty: 1 | 2 | 3; prompt: string; explanation: string; hint?: string };

// Lab
interface LabNode { id: string; type: string; label: string; pos: Vec; props: Record<string, number | string | boolean> }
interface LabEdge { id: string; from: string; to: string; kind: 'sync' | 'async'; props?: Record<string, number | string> }
interface Annotation { id: string; tool: 'text' | 'sticky' | 'frame' | 'arrow' | 'pen'; data: unknown }
interface LabGraph { version: 1; nodes: LabNode[]; edges: LabEdge[]; annotations: Annotation[] }

interface TrafficProfile {
  entry: string[]; rps: number | { curve: number[] } | { base: number; peak: number; rampS: number; holdS: number };
  readRatio: number; heavyShare?: number; regions?: Record<string, number>;
}
interface Target { metric: 'p50' | 'p95' | 'p99' | 'errorRate' | 'availability' | 'costMonthly' | 'backlogAge'; op: '<' | '<=' | '>' | '>='; value: number }
interface FailureInjection { at: number; target: string; kind: 'kill' | 'slow' | 'errors' | 'partition' | 'spike'; value?: number; durationS?: number }
```

### 12.5 Content pipeline

1. Authors write `content/lessons/<id>.json` (JSONC allowed).
2. `resolve-extends.ts` flattens `extends`/`remove` into full scenes.
3. `validate-content.ts` (zod) checks: unique ids, edges reference existing nodes, flow hops reference existing edges, HUD keys exist, `coveredAt` refers to a real step, the last step is `recap`, step count is 8–14.
4. `build-search-index.ts` emits `search-index.<lang>.json`.
5. Lesson JSON is code-split and lazy-loaded per lesson.

---

## 13. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | First load ≤ 200 KB JS gzipped for the shell; each lesson chunk ≤ 40 KB. LCP ≤ 2.0 s on fast 4G. Canvas at 60 fps (desktop) / 45 fps (mid phone) at 20 nodes + 150 packets. |
| Accessibility | WCAG 2.2 AA: contrast ≥ 4.5:1 for text in both themes, full keyboard support, visible focus, aria labels on every canvas node, live regions for step changes, "Diagram as text". |
| Reduced motion | When `prefers-reduced-motion` is on or Motion = reduced: no shake, confetti or camera easing; packets move at half density; step transitions cross-fade only. Motion = off: packets hidden, flow direction shown as static arrows. |
| Browsers | Last 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari 16+; Android Chrome. |
| Responsiveness | 320 px to 2560 px; no horizontal page scroll. |
| Privacy | No trackers, no cookies, no third-party requests except Google Fonts (self-hosted fonts preferred via `@fontsource`). |
| Reliability | All storage access is try/catch guarded; the app works with storage blocked. |
| SEO / sharing | Per-route `<title>` and description, Open Graph image (original artwork), `lang` attribute. |
| Licensing | Only MIT/Apache/OFL dependencies and fonts. All illustrations and lesson text are original. |

---

## 14. Testing strategy

- **Unit (Vitest):** scene diffing, layout override placement for new nodes, flow target selection (round robin cycles, hash stability), simulator math (utilization, M/M/1 percentiles, cache reduction, availability in series/parallel, cost), SRS scheduling across dates, calculators, theme scheduler (19:59 → light, 20:00 → dark, 05:59 → dark, 06:00 → light, custom ranges that cross midnight).
- **Content (CI):** `validate-content.ts` must pass. Fail the build on any schema error.
- **Component:** StepPanel, HUD tweens, item types, inspector forms.
- **End-to-end (Playwright):**
  - Complete lesson 1 with the keyboard; progress = 1/40.
  - Drag a node in lesson 5, go to step 8, reload → the node is still moved; Reset layout → it returns.
  - Mobile viewport: long-press drag moves a node; a one-finger swipe pans.
  - Practice: answer a `fix` item correctly by adding a cache.
  - Lab: build the AC-D1 graph, run it, kill a server, read the metrics.
  - Share link round-trip.
  - Theme: mock the clock to 20:00 → dark is applied.
- **Visual regression:** Playwright screenshots of 5 key screens × 2 themes × 2 viewports.

---

## 15. Milestones (build order)

| # | Milestone | Scope | Definition of Done |
|---|---|---|---|
| M0 | Foundations | Repo, tooling, tokens, fonts, themes + 8 PM scheduler, app shell, routing, storage helpers, i18n scaffold | Shell renders in all 4 theme modes with no flash; Lighthouse a11y ≥ 95 on the empty shell |
| M1 | Canvas engine | React Flow stage, IsoBlock nodes, edges, packet layer, flows, drag/pan/zoom, overrides, undo, minimap, fit, mobile gestures, a11y | AC-C1 to AC-C8 pass on a demo scene |
| M2 | Lesson player | Schema, content pipeline, StepPanel, HUD, timeline, scene diffing, recap, progress, keyboard; **lesson 1 fully authored** | AC-L1 to AC-L5 pass for lesson 1 |
| M3 | Curriculum | Author lessons 2–40 (can be parallelized by module) | All 40 validate; manual review checklist per lesson |
| M4 | Search & Home | Command palette, search index, Home dashboard | Ctrl K finds steps, terms and commands |
| M5 | Design Lab | Palette, inspector, simulator worker, failure injection, results, persistence, share/export, templates | AC-D1 to AC-D7 pass |
| M6 | Lab challenges | 8 challenges + rubric engine | Every challenge has a reference solution that passes and a naive one that fails |
| M7 | Practice | Item types, quizzes, module tests, SRS, XP/streaks, drills (embedding the Lab) | AC-P1 to AC-P4; 200+ items validate |
| M8 | Cheatsheets | 16 sheets, 5 calculators, print CSS | AC-S1 to AC-S3 |
| M9 | Polish | Hindi translation, PWA, OG images, performance pass, visual regression, docs | NFRs in §13 are met; e2e suite green |

M5 does not depend on M3 or M4 and can run in parallel with them once M1 is done.

---

## 16. Out of scope for v1 (future)

- Accounts and cloud sync of progress and designs.
- Real-time collaborative Lab editing (CRDT, e.g. Yjs).
- An AI reviewer that comments on Lab designs.
- Recording a lesson's animation to MP4/GIF directly from the canvas (useful for Shorts; later).
- More languages beyond EN/HI.
- Community-shared designs gallery.

---

## 17. Open questions

1. Final product name and domain.
2. Should the reference's look (isometric 2.5D) stay, or should a flat 2D "blueprint line" node style be offered as a toggle? (This PRD assumes isometric, with the new palette.)
3. Hindi at launch — full lesson translation or UI only first?
4. Should Lab challenges ship with visible reference solutions after a pass, or never?
