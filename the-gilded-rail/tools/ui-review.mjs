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
  for(const viewport of [{width:1440,height:1000},{width:1280,height:720},{width:390,height:844},{width:844,height:390}].filter(v=>(!process.argv.includes('--phone-only')||v.width===390)&&(!process.argv.includes('--compact-only')||v.width<900)&&(!process.argv.includes('--readme')||v.width===1440))){
    const page=await browser.newPage({viewport,hasTouch:viewport.width<900,isMobile:viewport.width<900,reducedMotion:'reduce'});
    await page.addInitScript(()=>{
      const raf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>{
        if(callback.name==='loop'){window.__reviewLoopHeld=true;return 0;}
        return raf(callback);
      };
    });
    page.on('pageerror',e=>{const message=e.stack||e.message;if(!errors.includes(message)){errors.push(message);console.log('PAGE ERROR:',message);}});
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))missing.push(r.url());});
    console.log('Loading',viewport);
    await page.route('https://js.hcaptcha.com/**',route=>route.abort());
    await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    console.log('DOM ready');
    console.log(await page.evaluate(()=>({ui:typeof UI,art:typeof UIArt,profile:typeof Profile==='undefined'?null:Profile.data.gfxReset1,phase:typeof Game==='undefined'?null:Game.phase})));
    await page.waitForFunction(()=>typeof UI!=='undefined'&&typeof UIArt!=='undefined'&&Profile.data.gfxReset1&&window.__reviewLoopHeld,null,{timeout:60000,polling:100});
    await page.evaluate(()=>{
      document.getElementById('boot-loader')?.remove();
      document.getElementById('gl').style.display='none';
      Profile.data.tutorialSeen=true;
    });
    console.log('Engine ready');
    await page.waitForFunction(()=>Object.keys(WorldMaterials.textures).length===11,null,{timeout:60000});
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
      const action={profile:'prof-save',victory:'go-rematch',defeat:'go-rematch'}[name];
      if(action){
        const bounds=await page.locator('#'+action).boundingBox();
        assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=viewport.height,`${name} primary action must stay visible at ${tag}`);
      }
      if(await page.locator('#modal-overlay').evaluate(el=>!el.classList.contains('hidden'))){
        const close=await page.locator('#modal-close').boundingBox();
        assert.ok(close&&close.y>=0&&close.y+close.height<=viewport.height,`${name} close button must stay visible at ${tag}`);
      }
    };
    const tourReview=async()=>{
      const previous=await page.evaluate(()=>({phase:Game.phase,mode:Input.mode,paused:Game.paused}));
      await page.evaluate(()=>UI.tutorialOpen(true));
      const count=await page.evaluate(()=>TUTORIAL_STEPS.length);
      for(let step=0;step<count;step++){
        await page.locator('.driver-popover').waitFor({state:'visible'});
        assert.equal(await page.evaluate(()=>Onboarding.tour.getActiveIndex()),step);
        const bounds=await page.locator('.driver-popover').boundingBox();
        assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,'Driver popover must fit the viewport');
        if(step===0||step===3||step===4)await capture('tour-'+step);
        await page.locator('.driver-popover-next-btn').click();
      }
      assert.equal(await page.evaluate(()=>Onboarding.active),false);
      assert.deepEqual(await page.evaluate(()=>({phase:Game.phase,mode:Input.mode,paused:Game.paused})),previous);
    };
    if(process.argv.includes('--tutorial-only')){
      await tourReview();
      results.push({viewport:tag,checks:'all Driver.js steps, placement and frame restoration'});
      await page.close();continue;
    }
    if(!hudOnly){
    await capture('menu');
    if(process.argv.includes('--readme')){
      await page.evaluate(()=>{Profile.data.cue='founders';UI.customizeModal('cue');});
      await capture('founders-cue');results.push({viewport:tag,checks:'README menu and equipment captures'});
      await page.close();continue;
    }
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
    assert.equal(await page.locator('[data-felt]').count(),21);
    assert.equal(await page.locator('.swatch [data-part="bed"]').first().evaluate(el=>el.getBBox().width/el.getBBox().height),2);
    await page.locator('[data-felt="billiardroom"]').click();
    assert.equal(await page.evaluate(()=>Profile.data.felt),'billiardroom');
    await capture('atelier');
    await page.locator('#equipment-search').fill('gilded');
    assert.equal(await page.locator('.swatch:visible').count(),1);
    await page.locator('#equipment-search').fill('');
    await page.locator('#equipment-available').click();
    assert.equal(await page.locator('.swatch:visible').count(),3);
    await page.locator('[data-atelier="cue"]').click();
    assert.equal(await page.locator('[data-cue]').count(),19);
    const proportions=await page.locator('.swatch .item-cue').first().evaluate(el=>{
      const butt=el.querySelector('[data-part="butt"]').getBBox(),shaft=el.querySelector('[data-part="shaft"]').getBBox();
      return {ratio:shaft.width/butt.width,slender:butt.width/butt.height};
    });
    assert.ok(proportions.ratio>2.5&&proportions.ratio<3&&proportions.slender>14,'Cue proportions should match the in-game model');
    await capture('cues');
    await page.locator('[data-cue="founders"]').click();
    assert.equal(await page.evaluate(()=>Profile.data.cue),'founders');
    await capture('founders-cue');
    await page.locator('[data-atelier="rail"]').click();
    assert.equal(await page.locator('[data-rail]').count(),12);
    await capture('wood');
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
    await page.locator('[data-settings-tab="access"]').click();
    await page.locator('#a11y-balls').check();
    assert.equal(await page.evaluate(()=>Profile.data.a11y),true);
    await page.locator('#a11y-balls').uncheck();
    await page.locator('[data-settings-tab="graphics"]').click();
    await page.locator('[data-q="medium"]').click();
    assert.equal(await page.evaluate(()=>Profile.data.quality),'medium');
    await capture('settings-graphics');
    await page.locator('[data-settings-tab="sound"]').click();
    await page.locator('#vol-music').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>Profile.data.vol.music),.35);
    await page.evaluate(()=>UI.profileModal());
    await capture('profile');
    await page.locator('#prof-name').fill('Juniper');
    await page.locator('[data-ban="noir"]').click();
    assert.equal(await page.locator('#prof-name').inputValue(),'Juniper','Cosmetics must preserve an edited name');
    await page.locator('#prof-save').click();
    assert.equal(await page.evaluate(()=>Profile.data.name),'Juniper');
    await page.evaluate(()=>{window.hcaptcha={render:el=>{el.innerHTML='<div class="verification-preview">Security verification</div>';return 1;},remove(){},reset(){}};AccountUI.accountModal();});
    await capture('account');
    await page.locator('#tab-up').click();
    assert.equal(await page.locator('label[for="ac-email2"]').count(),1);
    await capture('signup');
    await page.evaluate(()=>UI.$('btn-rules').click());
    await capture('rules');
    await page.evaluate(()=>AccountUI.recoveryModal());
    assert.equal(await page.locator('label[for="rec-pass"]').count(),1);
    await capture('recovery');
    await page.evaluate(()=>{LobbyUI.view='idle';LobbyUI.render();});
    await capture('online');
    await page.locator('#mp-join').click();
    await page.locator('#join-code').fill('ab12cd');
    assert.equal(await page.locator('#join-code').inputValue(),'AB12CD');
    await capture('join');
    await page.evaluate(()=>{Net.code='ABC234';Net.seat=0;Net.peerHere=false;LobbyUI.view='hosting';LobbyUI.render();});
    assert.equal(await page.locator('#room-start').isDisabled(),true);
    await capture('room');
    await page.evaluate(()=>{Net.code=null;Net.seat=-1;UI.$('modal-overlay').classList.add('hidden');});
    await tourReview();
    await page.evaluate(()=>UI.gameOver(true,'A well-earned frame',120,14,7));
    await capture('victory');
    await page.evaluate(()=>UI.gameOver(false,'The next frame is yours to write',18,12,4));
    await capture('defeat');
    await page.evaluate(()=>UI.$('gameover-overlay').classList.add('hidden'));
    }
    await page.evaluate(()=>{
      document.getElementById('modal-overlay').classList.add('hidden');
      document.getElementById('menu-overlay').classList.add('hidden');
      Game.mode='cpu';Game.diff=2;Game.ruleset='8ball';Profile.data.tutorialSeen=false;Game.newGame();
    });
    assert.equal(await page.evaluate(()=>Onboarding.active),true,'First-play onboarding should start automatically');
    await page.keyboard.press('h');await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>Game.frameShots),0,'Tour keys must not strike a ball');
    assert.equal(await page.evaluate(()=>document.body.classList.contains('ui-hidden')),false);
    assert.equal(await page.evaluate(()=>Onboarding.active),true,'Shot key must not activate the focused tour button');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>Onboarding.active),false);
    assert.equal(await page.evaluate(()=>Game.paused),false);
    await page.evaluate(()=>{Input.mode='FINE';UI.sync();UI.gauge(.65);});
    await capture('hud');
    const hudSize=await page.evaluate(()=>({score:document.getElementById('scoreboard').getBoundingClientRect().height,power:document.getElementById('power-wrap').getBoundingClientRect().height}));
    assert.ok(hudSize.score<=62&&hudSize.power<=90,'Match instruments should stay compact');
    await page.locator('#spin-ball').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>Input.spin.x),.05);
    await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>Input.spin.x),0);
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
    await page.evaluate(()=>{Game.groups=['solid','stripe'];Game.openTable=false;Profile.data.a11y=true;UI.applyA11y();UI.refreshScoreboard();});
    await capture('hud-groups');
    const headerOverlap=await page.evaluate(()=>{
      const a=document.getElementById('scoreboard').getBoundingClientRect(),b=document.getElementById('profile').getBoundingClientRect();
      return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    });
    assert.equal(headerOverlap,false,'Scoreboard and player level must remain separate');
    await page.evaluate(()=>{Profile.data.a11y=false;UI.applyA11y();Game.fire(Input.aimDir(),.3,0,0);UI.pauseMenu();});
    assert.equal(await page.evaluate(()=>Game.paused),true);
    assert.equal(await page.evaluate(()=>{const before=cueBall.pos.clone();physicsFrame(.1);return before.distanceTo(cueBall.pos);}),0);
    await capture('pause');
    await page.locator('#pause-settings').click();
    assert.equal(await page.evaluate(()=>Game.paused),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>Game.paused),false);
    assert.equal(await page.evaluate(()=>Game.phase),'SIM');
    await page.evaluate(()=>UI.settingsModal());
    const inputMode=await page.evaluate(()=>Input.mode);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>Input.mode),inputMode,'Dialog Tab must not change game camera');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.classList.contains('hidden')),true);
    results.push({viewport:tag,checks:hudOnly?'HUD, pause/resume, keyboard controls':'all screens, settings persistence, profile drafts, equipment filters, account forms, room UI, tutorial, results, HUD, pause/resume'});
    await page.close();
  }
  assert.deepEqual(errors,[],'Browser runtime errors');
  assert.deepEqual(missing,[],'Missing local assets');
  console.log(JSON.stringify({results,errors,missing},null,2));
} finally {await browser.close();}
