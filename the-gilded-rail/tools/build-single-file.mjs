/* Builds dist/ for deployment: one HTML file with the CSS and engine inlined, plus
   external asset folders (audio, 3D models, menu art) copied alongside it and the
   paths rewritten. Keeping the heavy audio external keeps the HTML small and lets the
   browser stream/cache it. Run: npm run build */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => readFileSync(join(root, ...p), 'utf8');

const css = r('src', 'styles', 'main.css');
const engineDir = join(root, 'src', 'engine');
const engineFiles = readdirSync(engineDir).filter(f => f.endsWith('.js')).sort();
const engine = engineFiles.map(f => r('src', 'engine', f)).join('\n\n');

let html = r('index.html');
html = html.replace('<link rel="stylesheet" href="src/styles/main.css">', `<style>\n${css}\n</style>`);
html = html.replace(/(?:\s*<script src="src\/engine\/[^"]+"><\/script>)+/, `\n<script>\n${engine}\n</script>`);

/* inline the locally-vendored three.js example scripts (post-processing for DoF + bloom,
   GLTFLoader) in place, so the deployed file carries them itself and never depends on a CDN.
   Order is preserved - each must run after three.min.js and before the engine. */
const vendorOrder = ['three.min','CopyShader','BokehShader','EffectComposer','RenderPass','ShaderPass',
  'MaskPass','BokehPass','LuminosityHighPassShader','UnrealBloomPass','GLTFLoader','supabase'];
for (const name of vendorOrder) {
  html = html.replace(`<script src="vendor/${name}.js"></script>`,
    `<script>\n/* vendored: ${name} */\n${r('vendor', name + '.js')}\n</script>`);
}

mkdirSync(join(root, 'dist'), { recursive: true });

/* copy an external asset folder under public/assets into dist/assets and rewrite the
   public/assets/<name>/ paths in the HTML to the relative assets/<name>/ */
function externalize(name) {
  const src = join(root, 'public', 'assets', name);
  if (!existsSync(src)) return;
  cpSync(src, join(root, 'dist', 'assets', name), { recursive: true });
  html = html.replace(new RegExp('public/assets/' + name + '/', 'g'), 'assets/' + name + '/');
}

externalize('audio');   // soundtrack, SFX, one-shots (kept external so the HTML stays light)
externalize('models');  // GLB props
externalize('ui');      // menu artwork
/* the build also tolerates server-root /assets/ui paths from the CSS */
html = html.replace(/\/assets\/ui\//g, 'assets/ui/');

/* the secret "original build" easter egg is a standalone page loaded in an iframe;
   copy it alongside the main HTML so easter-egg.html resolves in the deploy */
if (existsSync(join(root, 'public', 'easter-egg.html')))
  copyFileSync(join(root, 'public', 'easter-egg.html'), join(root, 'dist', 'easter-egg.html'));

writeFileSync(join(root, 'dist', 'the-gilded-rail.html'), html);
writeFileSync(join(root, 'dist', 'index.html'), html);
console.log(`Built dist/ (${(html.length / 1e6).toFixed(2)} MB HTML + external assets, ${engineFiles.length} engine files)`);
