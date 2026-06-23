/* dev-only: downscale + JPEG-encode the supplied card art (images/*.png) into the
   lean UI slots (public/assets/ui/*.jpg) via a headless browser canvas, matching the
   existing 8ball/career/english tiles. Run: node tools/_convimg.mjs */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const proj = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = proj; /* supplied card art lives in the-gilded-rail/images/ */
const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.html':'text/html', '.svg':'image/svg+xml' };

const server = createServer((req, res) => {
  try {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') { res.setHeader('Content-Type','text/html'); return res.end('<!doctype html><meta charset=utf8><body>'); }
    const data = readFileSync(join(root, p));
    res.setHeader('Content-Type', MIME[extname(p).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(data);
  } catch (e) { res.statusCode = 404; res.end('404'); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;

/* [src under repo root, out jpg, target longest-side px] */
const jobs = [
  ['images/Trick shot.png', 'trickshot.jpg', 900],
  ['images/Practice.png',   'practice.jpg',  900],
];

const browser = await chromium.launch({ channel:'msedge', headless:true });
const page = await browser.newPage();
await page.goto(base + '/', { waitUntil:'load' });
for (const [src, out, max] of jobs) {
  const b64 = await page.evaluate(async ([url, max]) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error('fetch ' + r.status + ' ' + url);
    const blob = await r.blob();
    const img = new Image();
    const obj = URL.createObjectURL(blob);
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('decode fail ' + blob.type + ' ' + blob.size)); img.src = obj; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * s), h = Math.round(img.height * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.86).split(',')[1];
  }, [base + '/' + encodeURI(src), max]);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(proj, 'public', 'assets', 'ui', out), buf);
  console.log(`wrote ${out} ${(buf.length/1e3).toFixed(0)} KB`);
}
/* the supplied 8-ball favicon is a 1.8 MB SVG (embedded raster). Render it down to a
   couple of lean PNGs so the favicon + landing logo mark stay tiny in the inlined build. */
const iconJobs = [
  ['images/8-ball favicon.svg', 'favicon-32.png',  32],
  ['images/8-ball favicon.svg', 'favicon-180.png', 180],
  ['images/8-ball favicon.svg', 'logo-mark.png',   160],
];
for (const [src, out, size] of iconJobs) {
  const b64 = await page.evaluate(async ([url, size]) => {
    const r = await fetch(url);
    const blob = await r.blob();
    const img = new Image();
    const obj = URL.createObjectURL(blob);
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('decode ' + blob.type)); img.src = obj; });
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const x = c.getContext('2d');
    const s = Math.min(size / img.width, size / img.height);
    const w = img.width * s, h = img.height * s;
    x.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return c.toDataURL('image/png').split(',')[1];
  }, [base + '/' + encodeURI(src), size]);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(proj, 'public', 'assets', 'ui', out), buf);
  console.log(`wrote ${out} ${(buf.length/1e3).toFixed(0)} KB`);
}

await browser.close();
server.close();
