# ScaleCanvas

An interactive system-design course on a live, draggable canvas. Full spec: [PRD.md](PRD.md). Choices made along the way: [DECISIONS.md](DECISIONS.md).

## Status

| Milestone | State |
|---|---|
| **M0 Foundations** — tooling, tokens, fonts, Light/Dark/System/Scheduled themes (night at 20:00), app shell, routing, storage, i18n (EN + HI), Settings | ✅ Done |
| **M1 Canvas engine** — draggable isometric blocks, live floating edges, packet animation, undo/redo, layout memory, snap + guides, minimap, touch gestures, keyboard + screen-reader support | ✅ Done — try it at `#/playground` |
| M2 Lesson player | Next |
| M3–M9 | Not started |

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://127.0.0.1:5173.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest + jsdom) |
| `npm run typecheck` | TypeScript only |
| `npm run format` | Prettier |

## Where things live

```
index.html                 <!--theme-boot--> is replaced by the no-flash script at build time
vite.config.ts             React, Tailwind 4, theme-boot plugin, Vitest config
src/
  main.tsx                 fonts, styles, i18n, mount
  config.ts                product name, milestone map
  app/
    App.tsx                shell + route → page
    router.ts              hash routes from PRD §3 (parseHash / href / useRoute)
    theme/                 resolve.ts (pure theme logic), boot.ts (pre-paint script), useThemeController.ts
    shell/                 TopBar, MobileNav, LanguageMenu, ThemeToggle, CommandDialog, BrandMark
  components/              Panel, Chip, IsoBlock, HeroScene
  canvas/                  the canvas engine (M1)
    CanvasStage.tsx        React Flow wrapper: steps, layout memory, drag/keyboard/touch, camera
    geometry.ts            ports, edge routing, point-at-distance (shared by edges + packets)
    flows.ts               pure packet simulation (hops, group routing, dwell, failures)
    layout.ts              overrides, new-block placement, overlap nudge, guides, persistence
    history.ts             undo/redo
    clock.ts               one rAF loop per canvas; pause/speed; advance() for tests
    PacketLayer.tsx        pooled SVG packets, written every frame without React
    nodes/ edges/          isometric block, zone frame, floating data edge
    demoScenes.ts          the 4-step playground scene
  pages/                   Home, Settings, Playground, SectionPlaceholder, NotFound
  store/prefs.ts           theme, language, motion, panel preferences (zustand, persisted)
  lib/                     storage.ts (sc: keys, try/catch, export/import), i18n.ts, languages.ts
  i18n/{en,hi}/ui.json     UI strings
  styles/                  tokens.css (both themes), app.css (Tailwind mapping, base, background)
```

## Canvas shortcuts (when the canvas has focus)

| Keys | Action |
|---|---|
| Drag / long-press then drag (touch) | Move a block (snaps to 20; hold Alt to move freely) |
| Arrow keys | Move the selected/focused block 20 (Shift = 100, Alt = 1); with nothing selected, pan |
| Shift + drag on empty space | Select several blocks |
| Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z | Undo / redo moves |
| Shift + R | Reset layout (asks first, can be undone) |
| `+` `-` `0` `1` | Zoom in / out / 100% / fit |
| Space | Pause / play (hold Space and drag to pan) |
| R · L · M · T | Replay traffic · lock layout · minimap · diagram as text |
| Enter / Esc | Open / close the block's info card |

## Theme rules

- Modes: **Light**, **Dark**, **System** (follows the OS), **Scheduled** (default: dark 20:00–06:00 local, editable in Settings).
- The header button cycles Light → Dark → Scheduled. System is in Settings and in Ctrl/⌘ K.
- Components use tokens only (`bg-surface`, `text-ink`, `border-line`, `var(--accent)`…), never raw hex.
- To change a font, edit the `@theme` block in `src/styles/app.css`.

## Adding a language

1. Add it to `LANGUAGES` in `src/lib/languages.ts`.
2. Add `src/i18n/<id>/ui.json` and register it in `src/lib/i18n.ts`.
3. Right-to-left languages (`ar`, `he`, `fa`, `ur`) get `dir="rtl"` automatically. Use logical classes (`ms-`, `me-`, `start-`, `end-`) in layouts.
