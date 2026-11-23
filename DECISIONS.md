# Decisions log

Decisions made where the PRD was silent or had to be adjusted. Newest first within each milestone.

## M0 — Foundations (2026-11-19)

| # | Decision | Why |
|---|---|---|
| D1 | **Current stable versions instead of the PRD's pinned majors:** React 19, Vite 8, Tailwind CSS 4, TypeScript 7, Vitest 5. React Flow will be `@xyflow/react` 13 in M1. | The PRD (§12.1) named React 18 / Vite 5 / Tailwind 3 / React Flow 12; by Nov 2026 those are a major or two behind. Same libraries, same architecture. |
| D2 | **Tailwind 4 CSS-first config** (`src/styles/app.css`): raw tokens live in `tokens.css` (`--bg`, `--ink`, …) and `@theme inline` maps them to utilities (`bg-surface`, `text-ink-muted`, …). Fonts are declared in `@theme`, which emits `--font-display` / `--font-ui` / `--font-mono` exactly as PRD §4.2 names them. | Tailwind 4 has no JS config by default; this keeps one source of truth for tokens and makes both themes work with plain utilities. |
| D3 | **Dark variant follows `data-theme`, not the OS** (`@custom-variant dark`). | Scheduled / manual modes must win over the OS setting. |
| D4 | **One theme function, serialised into the boot script.** `resolveTheme()` in `src/app/theme/resolve.ts` is self-contained; a Vite plugin injects `resolveTheme.toString()` into `<head>` via `<!--theme-boot-->`. | Guarantees the pre-paint script and the runtime controller can never disagree. Verified by running the *built* `dist/index.html` script in jsdom at 19:59 / 20:00 / 05:59 / 06:00. |
| D5 | **Theme re-checks:** every 60 s, on `visibilitychange`, on OS scheme `change`, plus a precise timer to the next scheduled boundary (+1 s). | PRD §4.4 asks for 60 s + visibility; the precise timer makes the 20:00 switch land on time rather than up to a minute late. The 60 s tick also covers browsers/emulators that change `prefers-color-scheme` without firing `change`. |
| D6 | **Equal start/end times mean "never dark"** in Scheduled mode. | Avoids an ambiguous "always dark" interpretation; users who want always-dark pick Dark. |
| D7 | **Two light-theme tokens darkened for contrast:** `--warn` `#D97706 → #B45309`, `--ink-muted` `#5A6A85 → #56667F`. | Keeps warning text and muted text at ≥ 4.5:1 on `--surface-2` (WCAG AA). |
| D8 | **Self-hosted fonts via `@fontsource-variable/*`** (Bricolage Grotesque, Geist, Geist Mono) and `@fontsource/noto-sans-devanagari` (Devanagari subset only, 400/500/600). | PRD §13 privacy (no third-party requests) and §4.2 fallbacks. `unicode-range` means Devanagari downloads only when Hindi is on screen. |
| D9 | **Custom ~150-line hash router** (`src/app/router.ts`) rather than a routing library. | Static hosting + a fixed route table (PRD §3); `parseHash`/`href` are pure and unit-tested, including round-trips and rejection of malformed ids. |
| D10 | **Placeholder screens show the parsed route** (lesson id, step, design id…) and the milestone that builds them. | Lets every deep link in PRD §3 be checked now, and is honest about what isn't built yet. |
| D11 | **M0 command menu** (Ctrl/⌘ K) covers navigation, theme and language only, as an ARIA combobox + listbox. | PRD puts full-text search in M4; the shortcut and dialog shell exist now so M4 only swaps the data source. |
| D12 | **Settings → Data (export / import / reset) built in M0.** Import validates `app: "scalecanvas"`, merge or replace; reset requires typing `RESET`. | Small, and it exercises the storage helpers end to end. |
| D13 | **Header search and language buttons use their visible text as the accessible name** ("Search or jump to… Ctrl K", "Language: EN (English)"). | axe `label-content-name-mismatch` (WCAG 2.5.3, label in name). |
| D14 | **Shared component styles live in `@layer components` / `@layer base`.** | Unlayered CSS beats Tailwind utilities in v4; this bit us once (`kbd { display }` overrode `hidden`). |
| D15 | **Accessibility gate = axe-core (WCAG 2.2 AA + best-practice) with zero violations** on every route in both themes, plus with the command menu and mobile drawer open. | No Chrome/Lighthouse binary on the build machine. Lighthouse's accessibility score is computed from axe-core, so zero axe violations is the stricter equivalent. Run real Lighthouse in CI when one is set up. |

## Post-M0 changes

| # | Decision | Why |
|---|---|---|
| D16 | **Dark theme is pure black with neutral greys** (2026-11-19): `--bg #000000`, `--surface #0A0A0A`, `--surface-2 #141414`, `--grid #121212`, `--grid-strong #1C1C1C`, `--line #262626`, `--ink #F2F2F2`, `--ink-muted #A1A1A1`, `--accent-ink #000000`. The cyan accent and signal colors are unchanged. PRD §4.3 updated to match. | Owner asked for a completely black dark mode instead of navy. |

## M1 — Canvas engine (2026-11-23)

| # | Decision | Why |
|---|---|---|
| D17 | **React Flow 13** (`@xyflow/react`) instead of the PRD's v12. Changes are applied with `changes.applyTo(nodes)`; the old `applyNodeChanges` / `useStore` are gone. | Current major at build time. Same model: custom nodes/edges, viewport, minimap. |
| D18 | **A block's position is its centre** (`nodeOrigin [0.5, 0.5]`), matching scene content. Zone frames override with `origin [0, 0]`. | Authors place blocks by their centre; centres are what line up visually. |
| D19 | **Every node declares `width`, `height`, `measured` and its two handles up front.** | React Flow otherwise waits for DOM measurement before drawing edges and uses size 0 when dragging, which makes blocks jump by half their size. This also makes first paint correct (and SSR-ready). Found in a background tab, where measurement never happens. |
| D20 | **Grid snapping is ours: block centres snap to 20 u in `onNodesChange`;** React Flow's `snapToGrid` is off. Alt drags freely. | React Flow snaps the top-left corner, so blocks of different sizes could never line up. |
| D21 | **Floating edges + shared geometry.** `geometry.ts` picks the closest facing ports and routes orthogonal (rounded), straight or curved polylines. The edge `<path>` and the packet layer use the *same* polyline. | Packets stay exactly on the line while blocks are dragged (measured max deviation 0.09 u during a drag). |
| D22 | **Packet engine is pure and seeded** (`flows.ts`); the render layer writes into a fixed pool of 300 SVG `<rect>`s each frame without React. Hops are `"a>b"`, group hops pick a target per packet (round robin, least connections, random, hash), and `"$"` means "the node the last group hop picked". A new flow sends its first packet at once. | Testable, deterministic, cheap: about 0.6 ms per frame at ~130 packets on the dev build. |
| D23 | **One `AnimationClock` per canvas** drives packets *and* JS tweens (load bars, glides, nudges). Pause = clock paused + `.sc-paused` freezes CSS animations. `clock.advance(ms)` steps it by hand for tests. | Satisfies AC-C8 ("pause freezes every packet and tween") with a single switch. |
| D24 | **Layout rule refinement:** a block introduced in a later step is shifted by its moved neighbours' displacement *measured from where the user first saw them*, then nudged off any overlap. | Measuring against the neighbour's authored position *in the new step* threw blocks far away whenever a lesson re-authored a position (seen in the demo's step 2). |
| D25 | **Undo merges only rapid keyboard nudges** (same blocks, within 600 ms). Drags, touch drops, nudges-off-overlap and resets are each their own step; resets are undoable. | A first version tagged drags too and merged 52 quick drags into one undo step. |
| D26 | **Touch:** touches that start on a block are taken from React Flow in the capture phase. A move within 300 ms pans; a 300 ms hold lifts the block and drags it; a second finger becomes a pinch. Empty canvas is left to React Flow. | React Flow drags immediately on touch, so scrolling would move blocks by accident (PRD §5, AC-C6). |
| D27 | **Camera fit is ours** (`getViewportForBounds` over the blocks' *target* positions plus label/pill room), inside a **`safeArea`** that floating panels claim. It retries via ResizeObserver until the stage has a size. | `fitView` ran before layout (blocks ended up behind the step card) and knows nothing about floating panels. |
| D28 | **Canvas pages are lazy-loaded** (`React.lazy`). The shell is 138 KB gz; the canvas chunk (React Flow + engine) is 107 KB gz. | PRD §13: first load ≤ 200 KB gz. Bundling React Flow into the shell made it 243 KB. |
| D29 | **Page error boundary** around routes (resets on navigation). | One render error used to blank the whole app. |
| D30 | **`#/playground`** route: a 4-step demo scene (1 → 20 blocks, ~130–150 packets) used to verify M1. Demo copy is English-only. It's reachable from Home and Ctrl/⌘ K. | PRD M1 DoD asks for "a demo scene". M2 replaces it with real lessons; the route can stay as a dev page. |
| D31 | **Dev-only handle `window.__sc`** (clock, engine, React Flow instance, overrides, history), stripped from production builds. | Lets tests drive the canvas deterministically, e.g. in a background tab where `requestAnimationFrame` doesn't run. Playwright e2e (M9) will use it. |
