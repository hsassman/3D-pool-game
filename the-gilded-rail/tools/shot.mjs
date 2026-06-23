/* Dev-only visual capture: drives headless Edge to screenshot the WebGL scene so
   geometry/lighting changes can actually be inspected. Not part of the build.
   Usage: node tools/shot.mjs <view> [url]
   views: menu | sidepocket | corner | ashtray | bar | lounge | break */
import { chromium } from 'playwright-core';

const view = process.argv[2] || 'menu';
const url  = process.argv[3] || 'http://localhost:5174/';

/* camera presets: focus (x,y,z), yaw, pitch, dist  - applied via the engine's Input */
const VIEWS = {
  menu:      null,                                              // leave the menu auto-orbit
  break:     {focus:[0,0,0],      yaw:0.6,  pitch:0.7, dist:1.6},
  sidepocket:{focus:[0,0,0.55],   yaw:-1.5708, pitch:0.62, dist:0.62},
  sidetop:   {focus:[0,0,0.606],  yaw:-1.5708, pitch:1.02, dist:0.4},
  corner:    {focus:[1.134,0,0.574],yaw:-0.78, pitch:0.92, dist:0.34},
  cornerout: {focus:[1.05,-0.05,0.55],yaw:-0.7, pitch:0.34, dist:0.95},
  cornercap: {focus:[1.16,0.02,0.60],yaw:-0.5, pitch:0.42, dist:0.42},
  cornertop: {focus:[1.18,0.05,0.62],yaw:-2.3, pitch:0.78, dist:0.5},
  cabinet:   {focus:[1.10,-0.16,0.54],yaw:-0.62, pitch:0.22, dist:1.05},
  cornerlow: {focus:[1.13,-0.02,0.57],yaw:-0.78, pitch:0.12, dist:0.66},
  cabcorner: {focus:[1.27,-0.10,0.71],yaw:-0.7, pitch:0.18, dist:0.42},
  ballreturn:{focus:[-1.26,-0.13,-0.30],yaw:Math.PI, pitch:0.12, dist:0.6},
  window:    {focus:[0,1.5,5.4],yaw:-Math.PI/2, pitch:0.05, dist:4.2},
  dartcab:   {focus:[-2.25,0.52,4.8],yaw:-Math.PI/2, pitch:0.05, dist:2.7},
  dartcabang:{focus:[-2.0,0.5,4.65],yaw:-2.3, pitch:0.12, dist:3.0},
  windowwide:{focus:[0,1.4,5.4],yaw:-Math.PI/2-0.5, pitch:0.06, dist:4.8},
  door:      {focus:[-6.5,0.35,-0.2],yaw:0, pitch:0.10, dist:2.7},
  coatstand: {focus:[-6.25,0.55,0.55],yaw:0.35, pitch:0.12, dist:1.7},
  cuerack:   {focus:[6.5,0.6,0],yaw:Math.PI, pitch:0.06, dist:2.3},
  wallclock: {focus:[6.5,2.0,-0.1],yaw:Math.PI, pitch:0.04, dist:1.7},
  fan:       {focus:[0,2.55,2.6],yaw:0.4, pitch:-0.42, dist:2.4},
  chalk:     {focus:[0.62,0.07,0.69],yaw:0.7, pitch:0.5, dist:0.26},
  ashtray:   {focus:[0.874,0.066,-0.6775], yaw:1.4, pitch:0.62, dist:0.17},
  bar:       {focus:[0.3,0.62,-3.25], yaw:1.55, pitch:0.30, dist:2.0},
  barcounter:{focus:[0.3,0.42,-3.35], yaw:1.55, pitch:0.34, dist:1.05},
  floor:     {focus:[0,-0.55,0.6], yaw:0.7, pitch:0.48, dist:3.1},
  stool:     {focus:[0.32,-0.05,-2.78], yaw:0.5, pitch:0.18, dist:0.7},
  room:      {focus:[0.2,0.5,-1.4], yaw:0.85, pitch:0.16, dist:5.6},
  lounge:    {focus:[2.85,0.26,-2.0], yaw:0.9, pitch:0.42, dist:1.15},
};

const cam = VIEWS[view];

const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl']
});
const page = await browser.newPage({ viewport: { width: +process.env.VW||1000, height: +process.env.VH||680 },
  hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
page.on('console', m => { if (m.type()==='error') console.log('PAGE ERROR:', m.text()); });
page.on('pageerror', e => console.log('PAGE THROW:', e.message));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(+process.env.WAIT || 14000);          // engine init + background model loading + textures (WAIT= to override)
/* WAITFOR=<js expr>: poll until true before capturing (e.g. a slow prop has loaded) */
if (process.env.WAITFOR) await page.waitForFunction(process.env.WAITFOR, { timeout: 150000 }).catch(e=>console.log('WAITFOR timeout:', e.message));
if (process.env.TOUCH) await page.evaluate(()=>document.body.classList.add('touch'));

if (view==='menu') {
  /* leave the menu showing as-is */
} else if (view==='quick') {
  await page.evaluate(()=>{ try{ document.getElementById('quick-overlay').classList.remove('hidden'); }catch(e){ console.error('quick setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='profile') {
  await page.evaluate(()=>{ try{ UI.profileModal();
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('profile setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='customize') {
  await page.evaluate(()=>{ try{ Profile.data.xp=999999; UI.customizeModal();
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('customize setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='settings2') {
  await page.evaluate(()=>{ try{ UI.settingsModal();
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('settings setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='campaign') {
  await page.evaluate(()=>{ try{ UI.campaignModal();
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('campaign setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='league') {
  await page.evaluate(()=>{ try{ UI.leagueModal('backroom');
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('league setup failed', e); } });
  await page.waitForTimeout(500);
} else if (view==='settings') {
  await page.evaluate(()=>{ try{ UI.settingsModal();
    document.getElementById('menu-overlay').classList.add('hidden'); }catch(e){ console.error('settings setup failed', e); } });
  await page.waitForTimeout(800);
} else if (view==='hud') {
  await page.evaluate(()=>{
    try{
      Profile.data.tutorialSeen=true;
      Game.ruleset='8ball'; Game.mode='cpu'; Game.newGame();
      Game.phase='AIM'; Input.enterShootMode(true); Input.mode='FINE'; UI.sync();   // show power + spin
      document.getElementById('menu-overlay').classList.add('hidden');
      document.getElementById('tutorial-overlay').classList.add('hidden');
    }catch(e){ console.error('hud setup failed', e); }
  });
  await page.waitForTimeout(1500);
} else if (view==='firstperson' || view==='flashlight') {
  await page.evaluate((useFlash) => {
    try {
      Profile.data.tutorialSeen=true;
      Game.ruleset='8ball'; Game.mode='cpu'; Game.newGame();
      Game.phase='AIM'; Input.enterOrbit();                 // free-cam = first person
      if(useFlash){ Input.walkPos.set(2.7,0.45,2.0); Input.orbitYaw=2.5; Input.lookPitch=-0.5; }   // dark corner / floor
      else { Input.walkPos.set(0.0,0.5,2.4); Input.orbitYaw=-Math.PI/2; Input.lookPitch=-0.16; }   // stand & look at the table
      for(let i=0;i<60;i++) Input.updateCamera(0.05);       // settle the eye deterministically
      if(useFlash && typeof Flashlight!=='undefined'){
        Profile.data.codes.flashlight=true; Flashlight.set(true);
        Flashlight.update(); Flashlight.light.intensity=2.6;
      }
      ['menu-overlay','tutorial-overlay','gameover-overlay','modal-overlay'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.classList.add('hidden'); });
      document.body.classList.add('ui-hidden');
    } catch(e){ console.error('fp setup failed', e); }
  }, view==='flashlight');
  await page.waitForTimeout(1200);
} else if (view==='shoot') {
  await page.evaluate(() => {
    try {
      Profile.data.tutorialSeen=true;
      Game.ruleset='8ball'; Game.mode='cpu'; Game.newGame();
      Game.phase='AIM'; Input.enterShootMode(true);     // down on the shot → DoF active
      Input.aimYaw=0; Input.sDist=0.7; Input.sH=0.32;   // look down the table at the rack
      ['menu-overlay','tutorial-overlay','gameover-overlay','modal-overlay'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.classList.add('hidden');
      });
      document.body.classList.add('ui-hidden');
    } catch(e){ console.error('shoot setup failed', e); }
  });
  await page.waitForTimeout(2200);
} else if (cam) {
  await page.evaluate(({focus,yaw,pitch,dist}) => {
    try {
      Profile.data.tutorialSeen=true;
      Game.ruleset='8ball'; Game.mode='cpu'; Game.newGame();
      Game.phase='AIM'; Input.mode='ORBIT';
      Input.focus.set(focus[0],focus[1],focus[2]);
      Input.orbitYaw=yaw; Input.orbitPitch=pitch; Input.orbitDist=dist;
      ['menu-overlay','tutorial-overlay','gameover-overlay','modal-overlay'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.classList.add('hidden');
      });
      document.body.classList.add('ui-hidden');
    } catch(e){ console.error('view setup failed', e); }
  }, cam);
  await page.waitForTimeout(2200);                              // let the camera lerp settle
}

if (process.env.HIDE) {
  await page.evaluate((expr)=>{ try{ (0,eval)(expr); }catch(e){ console.error('HIDE failed', e); } }, process.env.HIDE);
  await page.waitForTimeout(200);
}

const out = `tools/_shot_${view}${process.env.TAG?('_'+process.env.TAG):''}.png`;
/* DOM capture: hide the (animating) canvas and use page.screenshot so HTML overlays
   - the Bento menu, HUD - are visible. (Framebuffer capture below only grabs WebGL.) */
if (process.env.DOM) {
  await page.evaluate(()=>{ window.requestAnimationFrame=()=>0;     /* halt the render loop so screenshot doesn't hang */
    const c=document.getElementById('gl'); if(c) c.style.visibility='hidden'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, timeout: 20000 });
  console.log('wrote', out);
  await browser.close();
  process.exit(0);
}
/* Read the WebGL framebuffer directly (force a render, then toDataURL in the same
   tick). Playwright's page.screenshot tends to hang on the continuously-animating
   canvas under swiftshader; this is reliable. */
const usePost = !process.env.RAW;
const dataUrl = await page.evaluate(([cam, usePost])=>{
  try {
    /* For posed views, set the camera DIRECTLY here (the in-engine orbit lerp/clamps
       don't always settle to tight distances) so framing is exact, then render in the
       same tick. */
    if (cam) {
      const f=cam.focus, cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
      camera.position.set(
        f[0] + Math.cos(cam.yaw)*cp*cam.dist,
        f[1] + sp*cam.dist,
        f[2] + Math.sin(cam.yaw)*cp*cam.dist);
      camera.lookAt(f[0], f[1], f[2]);
      camera.updateMatrixWorld();
    }
    /* render through post-processing (DoF + bloom) when available so captures match
       what players see; fall back to a plain render */
    if (usePost && typeof PostFX!=='undefined' && PostFX.enabled && PostFX.enabled()) {
      try { PostFX.render(); } catch(e){ renderer.render(scene, camera); }
    } else { renderer.render(scene, camera); }
    return renderer.domElement.toDataURL('image/png');
  } catch(e){ return 'ERR:'+e.message; }
}, [cam, usePost]);
await browser.close();
if (dataUrl.startsWith('ERR:')) { console.error('capture failed:', dataUrl); process.exit(1); }
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', out);
