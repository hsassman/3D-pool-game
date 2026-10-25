/* Serve the pinned npm package locally in both dev and portable builds. */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=join(root,'node_modules','driver.js');
mkdirSync(join(root,'vendor'),{recursive:true});
for(const name of ['driver.js.iife.js','driver.css']) copyFileSync(join(pkg,'dist',name),join(root,'vendor',name));
copyFileSync(join(pkg,'license'),join(root,'vendor','driver-LICENSE.txt'));
const version=JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')).version;
console.log('Synced Driver.js '+version+' locally');
