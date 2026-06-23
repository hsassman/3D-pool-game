# ES-Module Migration Plan (ready to execute)

The engine currently runs as **ordered global-scope scripts** (see `index.html` and
the numeric file prefixes). That architecture is proven and 110 headless tests
guard it. Moving to ES modules is a **single structural cutover** - worth doing
when you want modern Three.js add-ons (post-processing, GLTF/Draco loaders,
`OrbitControls`) or a Three.js version bump, since those ship as ESM and are
painful to consume from the old UMD global.

This file is the recipe. It is **not yet applied** - the live game still uses the
global scripts.

> **Keep Three.js pinned to r128 during the migration.** `three@0.128.0` is already
> a dependency. Importing the *same* version as a module (instead of the CDN UMD
> global) keeps all rendering code byte-for-byte identical, so the migration is
> behaviour-preserving. Bump Three.js *afterwards*, as its own separate step.

## Step 1 - one entry module, imports in load order
Create `src/engine/main.js`:
```js
import * as THREE from 'three';
// (optional during transition) expose globally so un-migrated files still work:
// window.THREE = THREE;
import './01-config.js';
import './02-profile.js';
// …through…
import './23-init.js';
```
Then in `index.html`, replace the Three.js CDN tag **and** all the numbered
`<script src=…>` tags with a single:
```html
<script type="module" src="/src/engine/main.js"></script>
```

## Step 2 - convert each file to import/export
Per file: `export` the symbols it defines, `import` the ones it uses from earlier
files, and `import * as THREE from 'three'` if it touches THREE. The numeric
prefixes already give you the dependency order to follow.

**Worked example - `01-config.js`:**
```js
import * as THREE from 'three';

export const TABLE = { W: 2.24, H: 1.12, /* … */ };
export const BALL  = { R: 0.028575, M: 0.170 };
export const PHYS  = { /* … */ };
export const MAX_BREAK_SPEED = 8.8;
export const W2 = TABLE.W/2, H2 = TABLE.H/2;
export const UP = new THREE.Vector3(0,1,0);
export const KITCHEN_X = -TABLE.W/4;
export const FOOT_SPOT = new THREE.Vector3(TABLE.W/4, BALL.R, 0);
export const BALL_COLORS = { /* … */ };
export const DIFFS = [ /* … */ ];
```
…and e.g. `15-physics.js` starts with:
```js
import * as THREE from 'three';
import { BALL, PHYS, W2, H2, POCKETS, SEGS } from './01-config.js'; // (+ wherever each lives)
import { balls } from './06-balls.js';
import { Game } from './18-game-rules.js';
import { Trough } from './09-decor-ball-return.js';
import { Sfx, Haptics } from './03-audio.js';
export function stepBall(b, dt){ /* … unchanged … */ }
export function physicsFrame(elapsed){ /* … unchanged … */ }
```
Tip: a quick way to find each symbol's home is `grep -rn "^const NAME\|^function NAME\|^let NAME" src/engine`.

## Step 3 - fix the soundtrack path for a bundled build
`window.__SONG` is set to `public/assets/audio/…`. That works for the current
static/dev setup, but under `vite build` the `public/` folder is copied to the
site **root**, so the URL must be `/assets/audio/put-your-head-on-my-shoulder.mp3`
(no `public/` prefix). Either change `index.html`, or `import songUrl from
'/assets/audio/…?url'` and assign it. (The single-file build is unaffected - it
inlines the MP3 as a data: URL.)

## Step 4 - switch the build to Vite
Change `package.json`:
```json
"build": "vite build"
```
Vite bundles + tree-shakes from `main.js`. Output lands in `dist-vite/` (see
`vite.config.js`). Update `vercel.json`'s `outputDirectory` accordingly, or keep
`tools/build-single-file.mjs` for the portable single-file artifact (it can be
adapted to inline Vite's bundled output).

## Step 5 - rewrite the test harness (the important part)
`tools/smoke-test.cjs` currently concatenates the files and `eval`s them as one
global script - incompatible with `import`/`export`. Replace it with an **ESM**
harness (`smoke-test.mjs`) that:
1. installs the same DOM/Audio/`window.storage` stubs on `globalThis` **first**,
2. imports the real `three` and monkey-patches `THREE.WebGLRenderer` with the stub
   **before** importing the engine (so the renderer-creating modules see the stub),
3. `await import('../src/engine/main.js')` to boot, then runs the existing
   assertions against the exported singletons.

Because `import` is cached, patching `three` before importing `main.js` makes every
engine module use the patched copy. Keep the 110 assertions; only the bootstrap
changes.

## Suggested order of operations
1. Branch.
2. Convert files **bottom-up** (`01` first), running a quick `vite` dev check often.
3. Rewrite the test harness; get all 110 green again.
4. Switch the build; verify `dist`.
5. Only then consider bumping Three.js (separate PR) to unlock new rendering.
