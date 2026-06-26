# CLAUDE.md — Dani Portfolio ("Noclip Directory")

Guidance for AI agents working on this codebase. This is a personal portfolio site for
**Dani (danixbo)** — a self-taught web developer & UI/UX designer from Purwakarta,
Indonesia. It is an immersive, dark, "editorial" single-page experience built on
React 19 + Vite + Tailwind v4 + GSAP, with a WebGL hero and procedural Web Audio.

> Note: this project was bootstrapped from a GSAP Awwwards template, but `src/` has been
> fully rewritten. Ignore any leftover milk-brand demo content in `README.md` and
> `src/constants/index.js` (`flavorlists`, `nutrientLists`, `cards`) — it is unused.

---

## Tech Stack

- **React 19** (`StrictMode`, function components + hooks)
- **Vite 6** (dev/build/preview)
- **Tailwind CSS v4** — configured via `@theme` tokens in `src/index.css` (no `tailwind.config.js`)
- **GSAP 3** + `@gsap/react` (`useGSAP`) — `ScrollSmoother`, `ScrollTrigger`
- **Three.js** — raw WebGL fragment-shader hero background
- **Web Audio API** — all sound is synthesized at runtime (no audio asset files)
- **lucide-react** — icons
- **react-responsive** — responsive hooks (where needed)

---

## Commands

```bash
npm install      # install deps
npm run dev      # Vite dev server
npm run build    # production build -> dist/
npm run preview  # preview production build
npm run lint     # eslint .
```

Deploy: serve the static `dist/` folder.

---

## Architecture

### Entry
- `src/main.jsx` — React root, imports `index.css`.
- `index.html` — single `#root`, meta/title for SEO ("Dani - Hanya orang yang penasaran").

### `src/App.jsx` — top-level orchestrator
Holds two pieces of global state:
- `entered` — has the user passed the intro `SoundGate`.
- `conceptMode` — `"main"` | `"backrooms"`, toggles between the two experiences.

Registers GSAP plugins once and creates the `ScrollSmoother` instance.
**ScrollSmoother requires the wrapper/content DOM structure** — do not remove
`#smooth-wrapper` / `#smooth-content`:

```jsx
<div id="smooth-wrapper">
  <div id="smooth-content"> ...sections... </div>
</div>
```

When `conceptMode === "backrooms"`, ScrollSmoother is **paused** and the smooth
wrapper is `display:none`; switching back resets scroll and calls
`ScrollTrigger.refresh()`. In backrooms mode `NavBar` and `CustomCursor` are unmounted
for full immersion, and `BackroomsLobby` is rendered inside a `<Suspense>` boundary
(it's lazy-loaded so Three.js only ships when the visitor enters).

### Two modes

**1. `main` — the portfolio.** Sections render in order inside `#smooth-content`:
`HeroSection` → `ShowreelSection` → `AboutSection` → `ProjectsSection` (horizontal
pinned) → `VaultSection` → `SkillsTicker` → `ContactSection` → `FooterSection`.
Plus global `NavBar`, `CustomCursor` (desktop, main mode only), and `SoundGate`.

**2. `backrooms` — creepy "liminal lobby" mode** (`components/BackroomsLobby.jsx`, lazy-loaded):
a self-contained Level-0 lobby — yellow wallpaper corridor with vanishing-point
perspective, film grain + CRT/VHS overlays, a boot/loading sequence, a glitching
"DANI" title, random entity silhouettes, procedural fluorescent-hum + creak/thud audio,
and "clip-through" reality tears. It presents the portfolio as **three wooden doors**
(Room 101 → `#about`, 102 → `#projects`, 103 → `#contact`); clicking one calls
`handleExitToReality(target)` which sets `conceptMode` back to `"main"` and scrolls there.

The lobby doubles as the **BACK2ROOM** game menu. A **blue painter's-tape door
outline** is taped low on the wallpaper (the `noclipDoorRef` element) — a deliberately
easy-to-miss easter egg. Clicking it (`handleNoclipEnter`) plays the noclip rumble and
advances a `phase` state machine: `"lobby" → "cutscene" → "game"`.

- **`cutscene`** (`components/Cutscene.jsx`, lazy): a ~45s non-interactive cold-open
  (Three.js + GSAP) — black → first-person walk → floor glitch → no-clip fall → impact
  flash → wake → stand up → find flashlight → flicker-on → explore → VHS glitch. Skippable
  after the impact (ESC / triple-tap). Spec: `BACK2ROOM_Cutscene_Design.md`. On finish it
  sets `phase = "game"`.
- **`game`** (`components/BackroomsGame.jsx`, lazy): the "emergency upload protocol" —
  first-person horror in a hand-designed maze. **Dark = safe, light = danger.** Carry 4
  data packets (ABOUT/SKILLS/PROJECTS/CONTACT) to upload terminals (hold `E` ~5s) while a
  light-seeking entity hunts you via A*; each upload shows a corrupted found-document
  reveal. Battery drains while the flashlight (`F`) is on; batteries refill it. Forgiving
  fail (respawn at last terminal, packets kept). Win → exit door → "UPLOAD COMPLETE" →
  `onWin()` (sets `conceptMode = "main"`). `onQuit()` returns to the lobby. Spec:
  `thegame.md` and `BACK2ROOM_PLAN.md`.

Game internals live in `components/game/`: `maze.js` (fixed map + parser + packet
metadata), `pathfinding.js` (A* + line-of-sight), `entity.js` (canvas wire-silhouette),
`audio.js` (`GameAudio` — procedural hum/footsteps/chime/static), `quality.js`
(device-tier graphics presets), `render.js` (procedural PBR textures, CRT shader,
quality-aware `EffectComposer` with SSAO + bloom). The maze layout is validated for
reachability by `node`-flood-fill against `parseMaze()` before trusting edits.

### Directory layout
```
src/
  App.jsx                  # orchestrator + ScrollSmoother + mode switch
  main.jsx                 # React root
  index.css                # theme tokens + all custom CSS/animations
  constants/index.js       # LEGACY template data (unused — safe to replace)
  components/
    NavBar.jsx             # global header, receives conceptMode/setConceptMode
    CustomCursor.jsx       # desktop custom cursor (main mode only)
    SoundGate.jsx          # intro gate: sound choice -> 0->100 counter -> "DANI" reveal
    HeroCanvas.jsx         # Three.js fragment-shader fluid background
    BackroomsLobby.jsx     # backrooms mode: creepy liminal lobby + tape-door menu (lazy-loaded)
    Cutscene.jsx           # ~45s BACK2ROOM cold-open (Three.js + GSAP), lazy-loaded
    BackroomsGame.jsx      # BACK2ROOM upload-protocol horror game, lazy-loaded
    game/                  # game internals (maze, pathfinding, entity, audio, quality, render)
  sections/
    HeroSection.jsx        # landing: HeroCanvas + animated headline + marquee
    ShowreelSection.jsx
    AboutSection.jsx
    ProjectsSection.jsx    # horizontal pinned scroll
    VaultSection.jsx
    SkillsTicker.jsx       # infinite CSS ticker
    ContactSection.jsx
    FooterSection.jsx
```

---

## Design System (source of truth: `src/index.css`)

Tailwind v4 `@theme` tokens — use these utility names, not raw hex:

| Token | Value | Use |
|-------|-------|-----|
| `void` | `#0d0d0c` | page background ("obsidian") |
| `void-2` / `surface` | `#161615` | panels / surfaces |
| `ember` | `#e0533c` | **primary accent** (burnt rust-orange) |
| `amber` | `#f59e0b` | **secondary accent** (amber/gold) |
| `rust` | `#f97316` | tertiary accent (orange) |
| `text-primary` | `#f5f5f3` | body text |
| `text-muted` | `#8a8a85` | secondary text |

Fonts (Fontshare, variable `wght`): `font-display` = **Clash Display** (headings),
`font-sans` = **General Sans** (body). `.weight-hover` animates `font-variation-settings`
for no-layout-shift weight transitions; the hero headline runs a load + scroll weight sweep.

Reusable CSS helpers (defined in `index.css`):
- `.iridescent-text` — animated rust→amber gradient text
- `.glass-panel` / `.editorial-panel`, `.editorial-card`, `.iridescent-border`
- `.glow-pulse`, `.draw-underline`, `.marquee-track`, `.ticker` / `.ticker-rev`, `.slow-spin`
- `.weight-hover` — animated variable-font weight on hover; `.focus-ring` — on-brand
  `:focus-visible` keyboard ring (use on interactive controls instead of `focus:outline-none`)
- Backrooms-only: `.crt-overlay`, `.vhs-flicker`, `.vhs-tracking-line`, `.shake-active`,
  `.bg-wallpaper-stripes` (yellow lobby wall), `.bg-hallway-perspective` /
  `.perspective-hallway` (vanishing-point corridor), `.door-frame`,
  `.win95-border` / `.win95-border-inset` (legacy retro borders)

`prefers-reduced-motion` is respected globally — keep new animations behind it where it matters.

---

## Conventions & Gotchas

- **GSAP in React:** always animate inside `useGSAP(() => {...}, { dependencies: [...] })`
  for automatic cleanup. Register plugins before use.
- **ScrollTrigger refresh:** after layout changes, mode switches, or content reveals,
  call `ScrollTrigger.refresh()` (see `App.jsx` / `handleEnter`).
- **Scrolling programmatically:** use `ScrollSmoother.get().scrollTo(target, true)`,
  not `window.scrollTo`, while in main mode (smoother intercepts scroll).
- **Audio is procedural:** there are no sound files. Web Audio graphs live in
  `SoundGate.jsx` (ambient pad), `BackroomsLobby.jsx` (fluorescent hum + door
  creak/thud + no-clip rumble) and `game/audio.js` (`GameAudio`: hum, spatialized
  footsteps, upload chime, static burst, entity sting — used by both `Cutscene.jsx` and
  `BackroomsGame.jsx`). Browsers block autoplay — audio starts/resumes on user gesture
  (the tape-door click / "click to begin").
- **WebGL:** `HeroCanvas.jsx` (GLSL fragment shader, Perlin/fbm domain warping),
  `Cutscene.jsx` and `BackroomsGame.jsx` (3D + `game/render.js` CRT/SSAO/bloom post) all
  use Three.js. They clamp pixel ratio (per `game/quality.js` device tier), and dispose
  renderer/geometry/material on unmount. The cutscene + game are lazy-loaded so Three.js
  post-processing stays out of the main bundle until the visitor noclips in.
- **Two-mode invariant:** anything using ScrollTrigger/ScrollSmoother belongs to main
  mode only. The backrooms pieces (`BackroomsLobby` + its lazy `Cutscene`/`BackroomsGame`)
  are intentionally standalone — own state, own audio. GSAP is used **only** inside the
  self-contained `Cutscene` (timeline), never ScrollTrigger/ScrollSmoother.
- **No TypeScript** — plain JSX.

---

## Editing Checklist

- New section? Add it inside `#smooth-content` in `App.jsx`, give it an `id`, use the
  theme tokens, and wrap animations in `useGSAP`.
- Touching scroll/pin layout? Verify `ScrollTrigger.refresh()` still fires and test the
  main ↔ backrooms toggle.
- New colors/fonts? Add a `@theme` token in `index.css` rather than hardcoding hex.
- Run `npm run lint` and `npm run build` before considering a change done.
