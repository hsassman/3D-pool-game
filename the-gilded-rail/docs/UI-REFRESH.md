# Members' collection UI

The bento menu keeps the club's green, ivory and brass identity, with a shared visual
system for setup, career, equipment, challenges, profile, settings and the HUD.

## Artwork

- `public/assets/ui/collection/`: 42 selected AI-generated WebP images: 14 editorial
  scenes/covers and 28 portraits (25 campaign rivals plus three quick-match CPUs).
- `docs/ui-art-prompts.json`: final prompts from the built-in imagegen tool,
  including corrections for the rack, full-length cues and literal character identities.
- `public/assets/ui/collection/manifest.json`: dimensions and exact byte counts.
- `src/engine/14a-ui-art.js`: shared SVG icons, all 44 equipment previews and all
  seven trick-shot diagrams. Equipment colors come from the actual catalogs;
  diagrams use the actual starting ball coordinates.

Scenes are bounded to 768 × 512; portraits to 448 × 448. The 42 WebP files total
1,088,512 bytes (about 1.04 MiB). Only the six main-menu covers are included in the
artwork boot preload. Portraits and collection headers use lazy loading and async
decoding. The artwork adds no meshes, lights, shaders or work to the 3D render loop.
There are no new runtime dependencies.

To export future imagegen outputs, install Pillow and run:

```sh
python tools/optimize-ui-art.py input.json
```

The input is a JSON array of `{ "name": "portrait-bk1", "source": "path/to/image.png" }`.
Use a full asset list when rebuilding the complete manifest. Keep raw generator
outputs outside the shipped assets.

## Implementation

`src/styles/collection.css` is the final style layer after `main.css`. The custom
production builder inlines both stylesheets and the new artwork helper in load
order. The helper also provides dialog focus trapping, Escape handling, focus
return, consistent icons and accessible selected states.

Equipment selection remembers its category and scroll position. Late-league
descriptions and portraits share a darker character direction; Shark opponents
are anthropomorphic sharks, Specter is ghostly, and profession-based characters
wear appropriate period attire. Stable opponent IDs, unlock requirements and AI
difficulty values are preserved.

The shot power meter is displayed horizontally by rotating the original vertical
gauge. Its fill continues using the existing `height = power` contract.

## Verification

```sh
npm test
npm run build
python -m http.server 5175 --bind 127.0.0.1 --directory dist
# In another terminal:
node tools/ui-review.mjs http://127.0.0.1:5175/
```

The browser review uses installed Edge through the existing `playwright-core`
dependency. It checks four viewports, including touch portrait and landscape,
equipment selection, dialog keyboard controls, CPU avatars, asset responses and
layout collisions. It saves ignored `tools/_shot_review_*.png` captures. It stops
WebGL rendering to inspect the DOM; it is not a frame-rate benchmark or a live
Supabase multiplayer test. hCaptcha is blocked only in the review browser.
