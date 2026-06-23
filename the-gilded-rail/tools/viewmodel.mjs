/* dev-only: render a single prop GLB on a neutral lit stage for inspection.
   Usage: node tools/viewmodel.mjs <name> [yaw] [az] [el]
   writes tools/_view_<name>.png */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2] || 'dartcab';
const yaw = parseFloat(process.argv[3] || '0');
const az  = parseFloat(process.argv[4] || '0.7');
const el  = parseFloat(process.argv[5] || '0.35');
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
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport:{ width:780, height:620 } });
page.on('pageerror', e => console.log('THROW:', e.message));
await page.goto(`${base}/tools/_viewmodel.html`, { waitUntil:'load', timeout:60000 });
await page.waitForFunction('window.__ready===true', { timeout:30000 });
const dataUrl = await page.evaluate(([u,o]) => window.__view(u,o),
  [`${base}/public/assets/models/${name}.glb`, { yaw, az, el }]);
const out = `tools/_view_${name}.png`;
writeFileSync(join(root, out), Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', out);
await browser.close();
server.close();
