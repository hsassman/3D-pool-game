/* Browser regression checks for the members' collection UI.
   Start Vite, then: node tools/ui-review.mjs [url]
   Uses installed Edge and playwright-core; captures go to ignored tools/_shot_*.
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const url=process.argv[2]||'http://127.0.0.1:5173/';
const hudOnly=process.argv.includes('--hud-only');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
const errors=[],missing=[],results=[];
try {
  for(const viewport of [{width:1440,height:1000},{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
    const page=await browser.newPage({viewport,hasTouch:viewport.width<900,isMobile:viewport.width<900});
    page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR:',e.message);});
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))missing.push(r.url());});
    console.log('Loading',viewport);
    await page.route('https://js.hcaptcha.com/**',route=>route.abort());
    await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    console.log('DOM ready');
    console.log(await page.evaluate(()=>({ui:typeof UI,art:typeof UIArt,profile:typeof Profile==='undefined'?null:Profile.data.gfxReset1,phase:typeof Game==='undefined'?null:Game.phase})));
    await page.waitForFunction(()=>typeof UI!=='undefined'&&typeof UIArt!=='undefined'&&Profile.data.gfxReset1,null,{timeout:60000,polling:100});
    await page.evaluate(()=>{
      window.requestAnimationFrame=()=>0;
      document.getElementById('boot-loader')?.remove();
      document.getElementById('gl').style.display='none';
      Profile.data.tutorialSeen=true;
    });
    console.log('Engine ready');
    await page.waitForTimeout(400);
    await page.evaluate(()=>{renderer.dispose();renderer.forceContextLoss();});
    const tag=viewport.width+'x'+viewport.height;
    const capture=async name=>{
      console.log('Capture',tag,name);
      await page.evaluate(async()=>{await Promise.race([new Promise(r=>setTimeout(r,3000)),Promise.all(Array.from(document.images).filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{})))]);});
      await page.screenshot({path:'tools/_shot_review_'+tag+'_'+name+'.png',timeout:30000,animations:'disabled'});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,`${name} horizontal page overflow at ${tag}`);
      const cardOverflow=await page.evaluate(()=>Array.from(document.querySelectorAll('.overlay:not(.hidden)>div')).filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.id));
      assert.deepEqual(cardOverflow,[],`${name} horizontal card overflow at ${tag}`);
    };
    if(!hudOnly){
    await capture('menu');
    await page.locator('#btn-quick').click();
    await capture('quick');
    assert.equal(await page.locator('.difficulty-chip img').count(),3);
    await page.locator('#quick-close').click();
    await page.evaluate(()=>UI.campaignModal());
    assert.equal(await page.locator('.lg-card').count(),5);
    await capture('career');
    await page.evaluate(()=>UI.leagueModal('gilded'));
    assert.equal(await page.locator('.opponent-portrait img').count(),5);
    await capture('roster');
    await page.evaluate(()=>UI.customizeModal('felt'));
    assert.equal(await page.locator('[data-felt]').count(),18);
    await capture('atelier');
    await page.locator('[data-atelier="cue"]').click();
    assert.equal(await page.locator('[data-cue]').count(),16);
    await page.locator('[data-atelier="rail"]').click();
    assert.equal(await page.locator('[data-rail]').count(),10);
    await page.locator('[data-rail="mahogany"]').click();
    assert.equal(await page.evaluate(()=>Profile.data.rail),'mahogany');
    assert.equal(await page.locator('[data-rail="mahogany"]').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>UI.trickshotModal());
    assert.equal(await page.locator('.layout-preview').count(),7);
    await capture('tricks');
    await page.evaluate(()=>UI.challengesModal());
    await capture('challenges');
    await page.evaluate(()=>UI.settingsModal());
    await capture('settings');
    await page.evaluate(()=>UI.profileModal());
    await capture('profile');
    }
    await page.evaluate(()=>{
      document.getElementById('modal-overlay').classList.add('hidden');
      document.getElementById('menu-overlay').classList.add('hidden');
      Game.mode='cpu';Game.diff=2;Game.ruleset='8ball';Game.newGame();
      Input.mode='FINE';UI.sync();UI.gauge(.65);
    });
    await capture('hud');
    assert.match(await page.locator('#p1av').evaluate(el=>el.style.backgroundImage),/portrait-cpu-shark/);
    const collisions=await page.evaluate(()=>{
      const ids=['power-wrap','spin-wrap','status','stick','mode-controls'];
      const bad=[];
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const a=document.getElementById(ids[i]),b=document.getElementById(ids[j]);
        if(!a.getClientRects().length||!b.getClientRects().length)continue;
        const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
        if(x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top)bad.push(ids[i]+' / '+ids[j]);
      }
      return bad;
    });
    assert.deepEqual(collisions,[],'Shot controls and status must not overlap');
    await page.evaluate(()=>UI.settingsModal());
    const inputMode=await page.evaluate(()=>Input.mode);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>Input.mode),inputMode,'Dialog Tab must not change game camera');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.classList.contains('hidden')),true);
    results.push({viewport:tag,checks:hudOnly?'HUD collisions and dialog keyboard controls':'menu, setup, 5 leagues, 25-rival gallery, 44-item equipment, 7 layouts, challenges, settings, profile, HUD'});
    await page.close();
  }
  assert.deepEqual(errors,[],'Browser runtime errors');
  assert.deepEqual(missing,[],'Missing local assets');
  console.log(JSON.stringify({results,errors,missing},null,2));
} finally {await browser.close();}
