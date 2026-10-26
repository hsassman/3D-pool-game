/* Review the actual shared SVG factory at different screen sizes and pixel ratios. */
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const scope={};new Script(readFileSync(new URL('../src/engine/14a-ui-art.js',import.meta.url),'utf8')+';globalThis.art=UIArt;').runInNewContext(scope);
const icons=Object.keys(scope.art.paths).map(name=>({name,small:scope.art.icon(name,'small'),normal:scope.art.icon(name)}));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const [width,dpr] of [[320,1],[390,3],[1280,1.25]]){
    const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:dpr});
    await page.setContent('<style>*{box-sizing:border-box}body{margin:0;background:#101d16;color:#dfd2ad;font:12px/1.4 system-ui;padding:16px}h1{font:24px Georgia;margin:0 0 8px}p{color:#9eb09c}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(62px,1fr));gap:8px}article{padding:10px 3px;text-align:center;background:#17291d;border:1px solid #bba97133;border-radius:8px}article>div{height:32px;display:flex;align-items:center;justify-content:center;gap:8px}svg{width:24px;height:24px;flex:none}.small{width:16px;height:16px}span{display:block;font-size:10px;overflow-wrap:anywhere;margin-top:7px}</style><h1>Club iconography</h1><p>16px / 24px · '+dpr+'× pixel ratio</p><main>'+icons.map(i=>'<article><div>'+i.small+i.normal+'</div><span>'+i.name+'</span></article>').join('')+'</main>');
    const invalid=await page.locator('svg').evaluateAll(nodes=>nodes.filter(svg=>{
      const p=svg.querySelector('path'),b=p.getBBox(),s=Number(svg.getAttribute('stroke-width'))/2;
      return !p.getAttribute('d')||b.x-s<0||b.y-s<0||b.x+b.width+s>24||b.y+b.height+s>24||svg.getAttribute('focusable')!=='false'||svg.getAttribute('aria-hidden')!=='true';
    }).map(svg=>svg.dataset.icon));
    assert.deepEqual(invalid,[],'Invalid or clipped SVG geometry');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'tools/_shot_icons_'+width+'_'+dpr+'.png',fullPage:true});
    console.log(width+'px / '+dpr+'×: '+icons.length+' icons passed');await page.close();
  }
}finally{await browser.close();}
