# Members' collection UI

The bento menu keeps the club's green, ivory and brass identity, with a shared visual
system for setup, career, equipment, challenges, profile, settings and the HUD.

## Artwork

- `public/assets/ui/collection/`: 52 selected AI-generated WebP assets: 22 editorial
  scenes/covers, 28 portraits (25 campaign rivals plus three quick-match CPUs),
  and two material textures.
- `docs/ui-art-prompts.json`: final prompts from the built-in imagegen tool,
  including corrections for the rack, full-length cues and literal character identities.
- `docs/interface-art-prompts.json`: the ten additional imagegen prompts for settings,
  membership, results, equipment, audio, graphics, the handbook and material textures.
- `public/assets/ui/collection/manifest.json`: dimensions and exact byte counts.
- `src/engine/14a-ui-art.js`: shared SVG icons, all 44 equipment previews and all
  seven trick-shot diagrams. Equipment colors come from the actual catalogs;
  diagrams use the actual starting ball coordinates.

Scenes are bounded to 768 × 512; portraits to 448 × 448; material textures to
384 × 256. The 52 WebP files total 1,390,122 bytes (about 1.33 MiB). The ten new
assets add 301,610 bytes (about 295 KiB). Only the six main-menu covers are included in the
artwork boot preload. Portraits and collection headers use lazy loading and async
decoding. The artwork adds no meshes, lights, shaders or work to the 3D render loop.
There are no new runtime dependencies.

To export future imagegen outputs, install Pillow and run:

```sh
python tools/optimize-ui-art.py input.json
```

The input is a JSON array of `{ "name": "portrait-bk1", "source": "path/to/image.png" }`.
The optimizer merges new entries into the existing manifest. Keep raw generator
outputs outside the shipped assets.

## Implementation

`src/styles/collection.css` and `src/styles/interface.css` layer after `main.css`.
The custom production builder inlines all three stylesheets and the artwork helpers in load
order. The helper also provides dialog focus trapping, Escape handling, focus
return, consistent icons and accessible selected states.

Equipment selection remembers its category and scroll position. Late-league
descriptions and portraits share a darker character direction; Shark opponents
are anthropomorphic sharks, Specter is ghostly, and profession-based characters
wear appropriate period attire. Stable opponent IDs, unlock requirements and AI
difficulty values are preserved.

The complete interface pass adds categorized settings with keyboard-operable tabs,
labeled sliders and switches; a themed player card with progress, stats and cosmetic
previews; equipment search, unlock filtering and an assembled setup preview; labeled
account forms; copyable room invitations; illustrated tutorials; and art-directed
victory/defeat screens. The HUD uses clearer player cards, turn states, group counts
and a consistent SVG icon vocabulary. Closed quick menus are inert to keyboard focus.

Offline frames have a resumable match menu. Opening it cancels a pending human charge,
freezes physics and input updates, and defers CPU thinking/lineup until resume. A turn
ticket invalidates superseded CPU callbacks. Closing the menu or a settings/equipment
dialog opened from it resumes the frame. Leaving the frame returns to the club. Online
matches retain their existing leave-room confirmation and are never paused for a peer.

The shot power meter is displayed horizontally by rotating the original vertical
gauge. Its fill continues using the existing `height = power` contract.

## Verification

```sh
npm test
node tools/pause-test.cjs
npm run build
python -m http.server 5175 --bind 127.0.0.1 --directory dist
# In another terminal:
node tools/ui-review.mjs http://127.0.0.1:5175/
```

The browser review uses installed Edge through the existing `playwright-core`
dependency. It checks four viewports, including touch portrait and landscape,
settings persistence, profile drafts across cosmetic changes, equipment filtering,
account and room interfaces, tutorials, results, CPU avatars, keyboard controls,
pause/resume, asset responses and layout collisions. It saves ignored
`tools/_shot_review_*.png` captures. It stops
WebGL rendering to inspect the DOM; it is not a frame-rate benchmark or a live
Supabase multiplayer test. hCaptcha is blocked and its widget stubbed only in the
review browser. Room interfaces are rendered with local test state; no rooms or
accounts are created. `tools/pause-test.cjs` independently checks the real CPU
scheduler during paused thinking, paused lineup, resume and stale-turn replacement.
