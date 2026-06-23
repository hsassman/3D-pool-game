# The Gilded Rail

A 1920s private–billiards-club styled **3D 8-ball pool game** that runs in the
browser on [Three.js](https://threejs.org/). Full WPA-style 8-ball rules,
simulated physics (regulation 57.15 mm / 170 g balls, slide→roll friction,
cushion compression, throw and english), orbit + WASD camera, a shoot mode with
spin control and a power meter, XP/level progression with unlockable cloths and
cues, three AI difficulties **and** local two-player on one device.

---

## Quick start

```bash
npm install        # install three + vite (dev only)
npm run dev        # serve at http://localhost:5173 with hot reload
```

> A static server is required (not `file://`) so the soundtrack asset can be
> fetched and decoded by WebAudio. Any static server works - e.g.
> `python3 -m http.server` then open `index.html`.

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (serves the multi-file source as-is). |
| `npm run build` | Bundles everything - CSS, all engine files, and the soundtrack (base64) - into one portable `dist/the-gilded-rail.html`. |
| `npm test` | Runs the headless smoke/feature suite (110 checks) against `src/engine/`. |

---

## Project structure

```
the-gilded-rail/
├── index.html                  # page shell: fonts, CSS link, HUD markup, ordered <script> tags
├── package.json
├── vite.config.js
├── public/
│   └── assets/audio/
│       └── put-your-head-on-my-shoulder.mp3   # in-game soundtrack
├── src/
│   ├── styles/
│   │   └── main.css            # all UI / HUD styling (extracted from the old inline <style>)
│   └── engine/                 # the game engine, split into numbered load-order files
│       ├── 01-config.js          CONFIG, DIFFS, TABLE, BALL, PHYS constants
│       ├── 02-profile.js         Profile + localStorage-style persistence
│       ├── 03-audio.js           Sfx: synthesized impacts, ambience, soundtrack chain
│       ├── 04-scene-materials.js renderer, scene, lights, textures, materials, envMap
│       ├── 05-table.js           buildTable(): bed, cushions, rails, pockets, nets, caps, floor
│       ├── 06-balls.js           ball meshes + racking
│       ├── 07-decor-smoke.js     looping smoke-wisp particle system
│       ├── 08-decor-cigarette.js glass ashtray + smouldering cigarette
│       ├── 09-decor-ball-return.js  the in-cabinet ball-return gallery
│       ├── 10-decor-furniture.js stools, glasses, decanters, bottle archetypes
│       ├── 11-decor-lounge.js    the lounge corner
│       ├── 12-decor-bar.js       the back bar (mirror, shelves, bottles, lights)
│       ├── 13-flicker.js         the random light-flicker system
│       ├── 14-unlocks.js         FELTS / CUES definitions + apply logic
│       ├── 15-physics.js         stepBall, collisions, cushions, pocket capture
│       ├── 16-cue-stick.js       the cue mesh + placement
│       ├── 17-aim-guide.js       aim line / ghost-ball guide
│       ├── 18-game-rules.js      Game state machine + full 8-ball rules
│       ├── 19-ai-opponent.js     AI: shot assessment, lookahead, banks, safeties
│       ├── 20-input-camera.js    Input: pointer/keys/touch, camera, thumbstick
│       ├── 21-ui.js              UI: HUD, scoreboard, menus, modals
│       ├── 22-loop.js            the render/update loop
│       └── 23-init.js            boot sequence (builds the world, wires it up)
└── tools/
    ├── build-single-file.mjs   produces the portable dist/ build
    └── smoke-test.cjs          headless feature suite
```

## How the engine is wired (important)

The engine is **plain global-scope script**, not ES modules - every file shares
one global namespace. The **numeric file prefixes are the load order**, declared
by the `<script>` tags at the bottom of `index.html`. A later file freely uses
symbols defined in an earlier one (e.g. `15-physics.js` uses `BALL`, `balls`,
`Game`, `Trough` defined earlier). The decor files (07–14) load **after** the
table/material setup (needs `BALL`, `chromeMat`, `woodMat`, `envMap`) and
**before** physics/rules/loop (which reference `Trough`, `Unlocks`, `Smoke`).

This was a deliberate, behaviour-preserving split of the original single file -
concatenating `src/engine/*.js` in numeric order reproduces the original engine
exactly (verified against the smoke suite).

### Migrating to ES modules / a framework

A full, ready-to-execute recipe lives in [`MIGRATION.md`](MIGRATION.md). In short:
`export`/`import` per file, `import * as THREE from 'three'` (keep r128 pinned so
it stays behaviour-preserving), a single `main.js` entry, switch the build to
`vite build`, and rewrite the test harness to import the modules. Do it as its own
reviewed step - it's a structural cutover, not an incremental edit.

## Deploying online (Vercel)

The shippable artifact is the **single-file build** - `npm run build` now emits
`dist/index.html` (everything inlined: CSS, all engine files, and the soundtrack as
a `data:` URL; Three.js still loads from its CDN). A `vercel.json` is included.

1. Push this repo to GitHub and "Add New Project" in Vercel.
2. Set the project's **Root Directory** to `the-gilded-rail`.
3. Vercel reads `vercel.json`: it runs `npm run build` and serves `dist/`.

Any other static host works too - serve `dist/index.html`, or the multi-file
source as-is (a static server, not `file://`, so the soundtrack can be fetched).

> ⚠ **Soundtrack licensing:** the bundled track is a well-known copyrighted
> recording. Publishing it to public users is a legal risk - before going live,
> swap `public/assets/audio/…` (and `window.__SONG` in `index.html`) for a
> royalty-free / licensed / public-domain track.

## Controls

- **Drag / ← →** aim · **Space** hold to charge, release to strike · **E** fine-tune spin
- **Tab** walk & orbit the room · **WASD + drag** look around · **scroll / pinch** zoom
- **H** hide the interface · **⛶** fullscreen (**Esc** exits)
- Touch: on-screen thumbstick + drag to aim

## Soundtrack

`03-audio.js` reads `window.__SONG` (set in `index.html`). It accepts either a
fetchable URL (the repo default, pointing at the bundled MP3) **or** an inlined
`data:` URL (what the single-file build uses). All other sound - ball impacts,
cushions, ambience - is synthesized at runtime with the WebAudio API.

## Roadmap

- Online multiplayer rooms (host/guest via room code).
- More unlockable cues, cloths and rail finishes.
- A playable darts mini-game.
