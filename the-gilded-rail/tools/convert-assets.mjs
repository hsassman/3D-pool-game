/* One-off, dev-only: convert the supplied source models (glTF / FBX) into
   self-contained binary GLBs in public/assets/models/ using the local three.js
   (node_modules) in a headless browser. Already-GLB assets are just copied.
   Run: node tools/convert-assets.mjs */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = 'pool game assets';
const A2 = '3D assets';
const outDir = join(root, 'public', 'assets', 'models');
mkdirSync(outDir, { recursive: true });

const MIME = {'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json',
  '.gltf':'model/gltf+json','.bin':'application/octet-stream','.fbx':'application/octet-stream',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.tga':'image/x-tga','.glb':'model/gltf-binary'};

const server = createServer((req, res) => {
  try {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const fp = join(root, p);
    const data = readFileSync(fp);
    res.setHeader('Content-Type', MIME[extname(fp).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(data);
  } catch (e) { res.statusCode = 404; res.end('404'); }
});

await new Promise(r => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;

/* convert jobs: [outName, urlPath, kind]. Loading + re-exporting also downscales the
   textures (longest side -> 512px), which is why the heavy props (vintage ashtray's
   3.7 MB, the dartboard cabinet's 12 MB of 4K/2K maps) go here rather than copies -
   they're small background objects and the big maps just bloat load time + deploy. */
const jobs = [
  ['redcup',    `/${A}/uploads_files_3000411_Red+Cup/glTF/scene.gltf`, 'gltf'],
  ['ashtray',   `/${A2}/vintage_metal_ashtray.glb`, 'glb'],   /* vintage metal ashtray (replaces the old glass one) */
  ['dartcab',   `/${A2}/dartboard_cabinet.glb`, 'glb'],
];
/* already-GLB + already lean: just copy */
const copies = [
  ['jackdaniels', `${A}/uploads_files_5765521_JACK_DANIELS.glb`],
  ['bottles',     `${A}/uploads_files_6142309_Bottles.glb`],
  ['stool',       `${A2}/bar_stool.glb`],
  ['chalk',       `${A2}/billiard_chalk.glb`],
];

const browser = await chromium.launch({ channel:'msedge', headless:true,
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('console', m => { if (m.type()==='error') console.log('PAGE:', m.text()); });
page.on('pageerror', e => console.log('THROW:', e.message));
await page.goto(`${base}/tools/_convert.html`, { waitUntil:'load', timeout:60000 });
await page.waitForFunction('window.__ready===true', { timeout:30000 });

for (const [name, url, kind] of jobs) {
  process.stdout.write(`converting ${name} (${kind})... `);
  try {
    const b64 = await page.evaluate(([u,k]) => window.__convert(u,k), [base+encodeURI(url), kind]);
    const buf = Buffer.from(b64, 'base64');
    writeFileSync(join(outDir, `${name}.glb`), buf);
    console.log(`ok ${(buf.length/1e6).toFixed(2)} MB`);
  } catch (e) { console.log('FAILED:', e); }
}
for (const [name, rel] of copies) {
  copyFileSync(join(root, rel), join(outDir, `${name}.glb`));
  const sz = readFileSync(join(outDir, `${name}.glb`)).length;
  console.log(`copied ${name}.glb ${(sz/1e6).toFixed(2)} MB`);
}

await browser.close();
server.close();
console.log('done ->', outDir);
