# Club world and equipment fidelity

Eleven assets were generated with the built-in imagegen tool. Exact prompts are in
`world-art-prompts.json` and `fidelity-art-prompts.json`; final WebP dimensions and bytes are in
`public/assets/world/manifest.json`. Source PNGs are not shipped.

The 963,028-byte collection includes neutral walnut grain, leather, a Persian-style
club rug, worsted cloth weave, Art Deco cue marquetry, a harbor nocturne and a
billiards still life, two vertical oil paintings, rain relief and aged clock enamel.
Wood is normalized to a neutral albedo before export so
catalog colors remain distinguishable. Textures are 256–1024 pixels; paintings
are 768 × 512 (landscape) and 448 × 672 (portrait). Images use mipmaps and anisotropy capped at 8.

`04a-world-materials.js` loads each image once and binds shared textures to native
Three.js materials. Existing procedural maps remain usable on load failure. The
boot curtain waits for materials with the existing watchdog. Generated worsted
weave is composited subtly into felt at fibre scale, with regulation markings
drawn afterwards. The bed remains clear for gameplay.

New equipment: Founders’ Green, Harbor Petrol, Reserve Claret, The Founders’ Cue,
The Harbormaster, The Midnight Regent, Smoked Oak and Reserve Palisander. Stable
existing catalog IDs and saves are retained. Three introductory items are available
at level 1; the rest use the existing progression. Inlaid cues share one marquetry
map; plain cues remove it. Equipped-item descriptions connect equipment to the club.

`12a-club-world.js` adds three framed club notices: the founding charter, members’
rooms and table etiquette. They add six static meshes, no new lights or shadows,
and no animation-loop callbacks. Existing sconces light the generated paintings.
Softer fog and adjusted existing ambient lights keep the surrounding room readable.

Felt replacement disposes the old bed and shared cushion maps exactly once.
Reapplying the same felt reuses its textures. Run the actual WebGL lifecycle and
image review against a built application:

```sh
npm test
node tools/pause-test.cjs
npm run build
python -m http.server 5175 --bind 127.0.0.1 --directory dist
# Another terminal:
node tools/world-review.mjs http://127.0.0.1:5175/
node tools/ui-review.mjs http://127.0.0.1:5175/ --compact-only
```

The world review checks image loading, material switching, texture disposal and
bounded GPU texture counts over repeated equipment changes. It captures the room,
painting and inlaid cue. This is a resource-lifecycle check, not an FPS benchmark.
Screenshots remain ignored development artifacts under `tools/_shot_world_*.png`.

## Table and room craftsmanship pass

`04c-craft.js` builds real cotton twine nets from merged tubes, shared as one corner
and one side-pocket geometry. Forty crossing strands form each open pouch, with
continuous upper and lower cords; six opaque meshes replace the old alpha-textured
surfaces. Throats clear the ball diameter. Net geometry adds no shadow casters.

The rail has a small bevel, sRGB-correct finish tint, 1024-pixel wood grain,
clearcoat and 18 flush sights in one instanced mesh. Turned timber legs and slim
satin-nickel corner caps replace the basic cylinders and thick chrome plates.

The return cabinet has an aligned chute aperture, supported twin rods, a padded
stop at ball height, a leather-textured liner and restrained glazing. A FIFO feed
waits for both the internal transit delay and entrance clearance. The 141-feature
suite verifies a full rack cannot overtake, overlap or remain queued indefinitely.

Lathed enamel lamp shades use separate exterior and interior material groups.
Wall sconces use opal globes with brass holders. The clock uses a generated enamel
base with deterministic numerals, minute marks and tapered moving hands. The
rain image is sampled in linear space for opacity and relief, with slow scrolling,
normal blending and visibility from inside the room.

Future exports use `python tools/optimize-world-art.py input.json`, where input is
an array of `{ "name": "asset-name", "source": "path/to/generated.png" }` entries.
