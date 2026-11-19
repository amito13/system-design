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
