/* dev-only: report native bounding box + mesh names of the model GLBs so the
   placement code can be tuned. Run: node tools/probe.mjs */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json',
  '.glb':'model/gltf-binary','.bin':'application/octet-stream','.png':'image/png','.jpg':'image/jpeg'};

const server = createServer((req, res) => {
  try { const p = decodeURIComponent(req.url.split('?')[0]); const data = readFileSync(join(root, p));
    res.setHeader('Content-Type', MIME[extname(p).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*'); res.end(data);
  } catch { res.statusCode = 404; res.end('404'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ channel:'msedge', headless:true,
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('THROW:', e.message));
await page.goto(`${base}/tools/_probe.html`, { waitUntil:'load', timeout:60000 });
await page.waitForFunction('window.__ready===true', { timeout:30000 });

const models = ['ashtray','stool','chalk','dartcab'];
for (const m of models) {
  try {
    const r = await page.evaluate(u => window.__probe(u), `${base}/public/assets/models/${m}.glb`);
    const f = n => n.map(v => v.toFixed(3)).join(', ');
    console.log(`\n=== ${m}.glb ===`);
    console.log(`  size   (x,y,z): ${f(r.size)}`);
    console.log(`  center (x,y,z): ${f(r.center)}`);
    console.log(`  meshes: ${r.meshes}  names: ${r.names.join(' | ')}`);
  } catch (e) { console.log(`\n=== ${m}.glb === FAILED:`, e); }
}
await browser.close();
server.close();
