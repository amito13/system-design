# ScaleCanvas

An interactive system-design course on a live, draggable canvas. Full spec: [PRD.md](PRD.md). Choices made along the way: [DECISIONS.md](DECISIONS.md).

## Status

| Milestone | State |
|---|---|
| **M0 Foundations** — tooling, tokens, fonts, Light/Dark/System/Scheduled themes (night at 20:00), app shell, routing, storage, i18n (EN + HI), Settings | ✅ Done |
| M1 Canvas engine | Next |
| M2–M9 | Not started |

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
  pages/                   Home, Settings, SectionPlaceholder, NotFound
  store/prefs.ts           theme, language, motion, panel preferences (zustand, persisted)
  lib/                     storage.ts (sc: keys, try/catch, export/import), i18n.ts, languages.ts
  i18n/{en,hi}/ui.json     UI strings
  styles/                  tokens.css (both themes), app.css (Tailwind mapping, base, background)
```

## Theme rules

- Modes: **Light**, **Dark**, **System** (follows the OS), **Scheduled** (default: dark 20:00–06:00 local, editable in Settings).
- The header button cycles Light → Dark → Scheduled. System is in Settings and in Ctrl/⌘ K.
- Components use tokens only (`bg-surface`, `text-ink`, `border-line`, `var(--accent)`…), never raw hex.
- To change a font, edit the `@theme` block in `src/styles/app.css`.

## Adding a language

1. Add it to `LANGUAGES` in `src/lib/languages.ts`.
2. Add `src/i18n/<id>/ui.json` and register it in `src/lib/i18n.ts`.
3. Right-to-left languages (`ar`, `he`, `fa`, `ur`) get `dir="rtl"` automatically. Use logical classes (`ms-`, `me-`, `start-`, `end-`) in layouts.
