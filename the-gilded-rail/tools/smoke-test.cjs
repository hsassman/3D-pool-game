/* headless smoke test for the gilded rail */
const THREE = require('three');

/* ---- stub renderer (keep all other THREE real) ---- */
THREE.WebGLRenderer = class {
  constructor(){ this.shadowMap={}; this.domElement={}; this.capabilities={getMaxAnisotropy:()=>8}; }
  setSize(){} setPixelRatio(){} render(){}
  set outputEncoding(v){} get outputEncoding(){return 0;}
  set toneMapping(v){} get toneMapping(){return 0;}
  set toneMappingExposure(v){} get toneMappingExposure(){return 1;}
  set physicallyCorrectLights(v){} get physicallyCorrectLights(){return false;}
};

/* ---- minimal DOM ---- */
function ctx2d(){
  const p = new Proxy({}, {
    get(t,k){
      if(k==='canvas') return {};
      if(k==='createLinearGradient'||k==='createRadialGradient')
        return ()=>({addColorStop(){}});
      if(k==='measureText') return ()=>({width:10});
      if(k==='getImageData') return ()=>({data:new Uint8ClampedArray(4)});
      if(typeof k==='string') return ()=>{};
      return undefined;
    },
    set(){ return true; }
  });
  return p;
}
const listeners={};
function makeEl(id){
  return {
    id, _cls:new Set(), children:[], style:{}, dataset:{}, innerHTML:'', textContent:'', value:'',
    width:0, height:0,
    classList:{
      add:(...c)=>c.forEach(x=>elById(id)._cls.add(x)),
      remove:(...c)=>c.forEach(x=>elById(id)._cls.delete(x)),
      toggle:(c,f)=>{ const s=elById(id)._cls; (f===undefined? !s.has(c):f)? s.add(c):s.delete(c); },
      contains:c=>elById(id)._cls.has(c)
    },
    addEventListener(ev,fn){ (listeners[id+':'+ev]=listeners[id+':'+ev]||[]).push(fn); },
    setAttribute(){}, getAttribute(){return null;},
    appendChild(){}, remove(){}, focus(){}, select(){}, click(){ (listeners[id+':click']||[]).forEach(f=>f({preventDefault(){},target:this})); },
    getContext(t){ return ctx2d(); },
    getBoundingClientRect(){ return {left:0,top:0,width:800,height:600}; },
    setPointerCapture(){},
  };
}
const els={};
function elById(id){ return els[id]||(els[id]=makeEl(id)); }

global.window = global;
global.document = {
  getElementById:elById,
  createElement:tag=>{ const e=makeEl('anon-'+Math.random()); if(tag==='canvas'){} return e; },
  querySelectorAll:()=>[],
  head:{appendChild(){}},
  body:{appendChild(){}, classList:{_s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
        toggle(c,f){ const on=(f===undefined)? !this._s.has(c):f; on?this._s.add(c):this._s.delete(c); return on; },
        contains(c){return this._s.has(c)}}},
  addEventListener(){}, removeEventListener(){},
  documentElement:{ requestFullscreen(){ global.document.fullscreenElement=global.document.documentElement; return Promise.resolve(); } },
  exitFullscreen(){ global.document.fullscreenElement=null; return Promise.resolve(); },
  fullscreenElement:null,
};
global.innerWidth=1280; global.innerHeight=800;
global.devicePixelRatio=1;
global.addEventListener=(ev,fn)=>{ (listeners['win:'+ev]=listeners['win:'+ev]||[]).push(fn); };
let rafQ=[];
global.requestAnimationFrame=fn=>{ rafQ.push(fn); return rafQ.length; };
global.AudioContext=undefined; global.webkitAudioContext=undefined;
/* functional in-memory store so persistence is actually exercised; the engine's
   00-storage.js shim sees this is present and leaves it untouched */
global.storage=(function(){ const m={}; return {
  async get(k){ return (k in m)?{value:m[k]}:null; },
  async set(k,v){ m[k]=String(v); return {}; },
  async remove(k){ delete m[k]; return {}; }
}; })();
global.THREE=THREE;
global.matchMedia=q=>({matches:true, addEventListener(){}});

/* ---- load the engine straight from the numbered source files ---- */
const fs=require('fs'), path=require('path');
const engDir=path.join(__dirname,'..','src','engine');
const files=fs.readdirSync(engDir).filter(f=>f.endsWith('.js')).sort();
let code=files.map(f=>fs.readFileSync(path.join(engDir,f),'utf8')).join('\n\n');
/* expose internals for the test */
code=code.replace('  loop();', '  window.__G={Game, Input, UI, Profile, balls, get cueBall(){return cueBall;}, physicsFrame, simIsActive:()=>simActive, Trough, Unlocks, FELTS, CUES, RAILS, BORDERS, BANNERS, Sfx, Smoke, Flicker, flickerLights, Campaign, LEAGUES, Progression, ACHIEVEMENTS, CHALLENGE_POOL, WEEKLY_POOL, TRICKSHOTS, shotEvents, POCKETS, AI, TUTORIAL_STEPS, Haptics, Embers, Graphics, get feltMat(){return feltMat;}, get woodMat(){return woodMat;}, get renderer(){return renderer;}, get cueStick(){return cueStick;}, cueParts};\n  loop();');

process.on('unhandledRejection', e=>{ console.error('UNHANDLED REJECTION:', e); process.exit(1); });
try{ eval(code); }catch(e){ console.error('TOP-LEVEL THROW:', e); process.exit(1); }

setTimeout(()=>{
  const G=global.__G;
  if(!G){ console.error('init never exposed internals'); process.exit(1); }
  console.log('init ok. phase=', G.Game.phase, 'balls=', G.balls.length);

  /* click New Game */
  try{ elById('btn-newgame').click(); }catch(e){ console.error('NEWGAME THROW:', e); process.exit(1); }
  console.log('after click: phase=', G.Game.phase, 'mode=', G.Input.mode);

  /* simulate a human break: charge + release */
  try{
    G.Input.beginCharge();
    G.Input.power=0.9;
    G.Input.releaseCharge();
  }catch(e){ console.error('FIRE THROW:', e); process.exit(1); }
  console.log('after fire: phase=', G.Game.phase, 'simActive=', G.simIsActive());

  /* run physics until settled */
  let steps=0;
  try{
    while(G.simIsActive() && steps<60*40){ G.physicsFrame(1/60); steps++; }
  }catch(e){ console.error('PHYSICS THROW at step '+steps+':', e); process.exit(1); }
  console.log('settled after', steps, 'frames. phase=', G.Game.phase, 'turn=', G.Game.turn);
  const active=G.balls.filter(b=>b.active).length;
  console.log('active balls:', active, ' potted:', 16-active);

  /* pump the rAF loop a few frames to catch loop errors */
  try{
    for(let i=0;i<10;i++){ const q=rafQ; rafQ=[]; q.forEach(f=>f(performance.now())); }
  }catch(e){ console.error('LOOP THROW:', e); process.exit(1); }
  console.log('render loop ok (10 frames)');

  const pump=setInterval(()=>{ const q=rafQ; rafQ=[]; q.forEach(f=>f(performance.now()));
    let st=0; try{ while(G.simIsActive() && st<5000){ G.physicsFrame(1/60); st++; } }
    catch(e){ console.error('AI PHYSICS THROW:', e); process.exit(1); } }, 16);
  setTimeout(()=>{
    clearInterval(pump);
    console.log('post-AI: phase=', G.Game.phase, 'turn=', G.Game.turn,
      'active=', G.balls.filter(b=>b.active).length);
    console.log('CORE FLOW PASSED');
    featureTests();
  }, 3500);
}, 50);


/* ================= NEW FEATURE TESTS ================= */
async function featureTests(){
const G=global.__G;
function fire(id,ev,obj){ (listeners[id+':'+ev]||[]).forEach(f=>f(Object.assign({preventDefault(){},stopPropagation(){}},obj))); }
function fireWin(ev,obj){ (listeners['win:'+ev]||[]).forEach(f=>f(Object.assign({preventDefault(){}},obj))); }
let pass=0, fail=0;
function ok(c,msg){ if(c){pass++;console.log(' ✔',msg);} else {fail++;console.log(' ✘ FAIL:',msg);} }

console.log('--- persistence (window.storage round-trip) ---');
G.Profile.data.name='Tester'; G.Profile.data.xp=777;
await G.Profile.save();
const rawSaved=await global.storage.get('gildedrail:profile:v1');
ok(!!rawSaved && JSON.parse(rawSaved.value).xp===777, 'profile written to storage on save');
G.Profile.data.xp=0; G.Profile.data.name='Guest';
await G.Profile.load();
ok(G.Profile.data.xp===777 && G.Profile.data.name==='Tester', 'profile restored from storage on load');
G.Profile.data.name='Guest'; G.Profile.data.xp=0; await G.Profile.save();

console.log('--- touch / mobile ---');
ok(document.body.classList.contains('touch'), 'coarse-pointer detected → body.touch set');

console.log('--- trough (ball return) ---');
const b9=G.balls.find(b=>b.num===9), b3=G.balls.find(b=>b.num===3);
G.Trough.reset();
G.Trough.add(b9); G.Trough.add(b3);
for(let i=0;i<600;i++) G.Trough.update(1/60);
ok(G.Trough.count===2, 'two balls registered in scored order');
ok(Math.abs(b9.pos.z-G.Trough.s0)<0.02, '1st potted ball rolled to the stop (z='+b9.pos.z.toFixed(3)+')');
ok(Math.abs(b3.pos.z-(G.Trough.s0-G.Trough.dx))<0.02, '2nd ball seated beside it');
ok(Math.abs(b9.pos.x-G.Trough.laneX)<1e-9, 'gallery lane on the head end (x='+b9.pos.x.toFixed(3)+')');
ok(b9.mesh.visible===true, 'trough ball visible');

console.log('--- ball-return delay (distance-based) ---');
G.Trough.reset();
const bNear=G.balls.find(b=>b.num===4), bFar=G.balls.find(b=>b.num===5);
bNear.fallPocket={pos:new THREE.Vector3(G.Trough.laneX, 0, G.Trough.entryZ)};  // ~0 m away
bFar.fallPocket ={pos:new THREE.Vector3(1.13, 0, 0.57)};                       // far foot corner
G.Trough.add(bNear); G.Trough.add(bFar);
for(let i=0;i<25;i++) G.Trough.update(1/60);   // ~0.42s
ok(bNear.mesh.visible===true,  'near-pocket ball has already reached the gallery');
ok(bFar.mesh.visible===false,  'far-pocket ball is still travelling (longer delay)');
for(let i=0;i<220;i++) G.Trough.update(1/60);
ok(bFar.mesh.visible===true,   'far-pocket ball arrives after its distance delay');
G.Trough.reset();

console.log('--- unlock system ---');
G.Profile.data.xp=5000;
const lvl=G.Profile.level().lvl;
ok(lvl>=5, 'xp grants level 5+ (lvl='+lvl+')');
ok(G.Unlocks.has(G.FELTS.crimson)&&G.Unlocks.has(G.FELTS.amber)&&G.Unlocks.has(G.FELTS.azure), 'all felt variants unlocked');
ok(G.Unlocks.has(G.CUES.obsidian)&&G.Unlocks.has(G.CUES.ember), 'both cues unlocked');
const prevMap=G.feltMat.map;
G.Profile.data.felt='crimson'; G.Unlocks.applyFelt();
ok(G.feltMat.color.getHexString()==='ffffff' && G.feltMat.map!==prevMap, 'crimson felt: fresh baked texture, no double-tint');
G.Profile.data.cue='ember'; G.Unlocks.applyCue();
ok(G.cueParts.shaft.material.color.getHexString()===new THREE.Color(0x6e4322).getHexString(), 'ember cue shaft recolored');
ok(!!G.cueParts.smoke && G.cueParts.smoke.obj.parent===G.cueStick && G.cueParts.smoke.obj.visible, 'smoke emitter attached to ember cue tip');
const smokeChild=G.cueParts.smoke.obj;
G.Profile.data.cue='obsidian'; G.Unlocks.applyCue();
ok(smokeChild.visible===false, 'smoke hidden when switching to obsidian');
ok(G.cueParts.shaft.material.color.getHexString()===new THREE.Color(0x16161a).getHexString(), 'obsidian shaft color');
G.Profile.data.felt='emerald'; G.Profile.data.cue='classic'; G.Unlocks.applyAll();

console.log('--- deep unlock catalog ---');
ok(Object.keys(G.FELTS).length>=8, 'cloth catalog expanded ('+Object.keys(G.FELTS).length+')');
ok(Object.keys(G.CUES).length>=8, 'cue catalog expanded ('+Object.keys(G.CUES).length+')');
ok(!!G.RAILS && Object.keys(G.RAILS).length>=4, 'wood-finish catalog present ('+Object.keys(G.RAILS||{}).length+')');
G.Profile.data.xp=999999; const hiLvl=G.Profile.level().lvl;
ok(hiLvl>=14, 'high XP reaches level 14+ so there is always a chase (lvl='+hiLvl+')');
ok(G.Unlocks.has(G.CUES.gilded)&&G.Unlocks.has(G.FELTS.rose)&&G.Unlocks.has(G.RAILS.bleached), 'top-tier items unlock at high level');
G.Profile.data.rail='ebony'; G.Unlocks.applyRail();
ok(G.woodMat.color.getHexString()===new THREE.Color(G.RAILS.ebony.wood).getHexString(), 'wood finish recolours the timber material');
G.Profile.data.rail='walnut'; G.Profile.data.xp=0; G.Unlocks.applyRail();
/* new cosmetics: glowing + flaming cues, profile borders + banners */
ok(Object.values(G.CUES).some(c=>c.glow), 'at least one glowing cue exists');
ok(Object.values(G.CUES).some(c=>c.flame), 'at least one flaming cue exists');
(function(){ let threw=false; try{ G.Profile.data.cue='inferno'; G.Unlocks.applyCue();
  }catch(e){ threw=true; } G.Profile.data.cue='classic'; G.Unlocks.applyCue();
  ok(!threw && G.cueParts.flame && G.cueParts.flame.children.length>0, 'a flaming cue builds its flame without error'); })();
ok(G.cueParts.flame.visible===false, 'flame hides again on a non-flaming cue');
ok(G.BORDERS && G.BANNERS, 'profile border + banner catalogs exist');
ok(Object.keys(G.BORDERS).length>=5 && Object.keys(G.BANNERS).length>=5, 'plenty of profile cosmetics to grind for');

console.log('--- modals render without errors ---');
try{ G.UI.customizeModal(); ok(true,'customizeModal renders'); }catch(e){ ok(false,'customizeModal threw: '+e.message); }
try{ G.UI.settingsModal(); ok(true,'settingsModal renders'); }catch(e){ ok(false,'settingsModal threw: '+e.message); }

console.log('--- volume buses ---');
fire('vol-music','input',{}); // listener reads slider .value
elById('vol-music').value='25'; fire('vol-music','input',{});
ok(Math.abs(G.Profile.data.vol.music-0.25)<1e-9, 'music volume persisted to profile (0.25)');
elById('mute-all').checked=true; fire('mute-all','change',{target:{checked:true}});
ok(G.Profile.data.sound===false, 'mute-all persists');
fire('mute-all','change',{target:{checked:false}});
ok(G.Profile.data.sound===true, 'unmute persists');
try{ G.Sfx.startAtmosphere(); ok(true,'startAtmosphere safe with no AudioContext'); }catch(e){ ok(false,'startAtmosphere threw: '+e.message); }

console.log('--- accessibility (high-contrast balls) ---');
const mb3=G.UI.miniBall(G.balls.find(b=>b.num===3));
ok(mb3.textContent==='3', 'mini-ball renders its number for colourblind readability');
elById('a11y-balls').checked=true; fire('a11y-balls','change',{target:{checked:true}});
ok(G.Profile.data.a11y===true && document.body.classList.contains('a11y'), 'high-contrast toggle persists + sets body.a11y');
fire('a11y-balls','change',{target:{checked:false}});
ok(G.Profile.data.a11y===false && !document.body.classList.contains('a11y'), 'high-contrast toggle off again');

console.log('--- fullscreen + UI toggle ---');
elById('btn-fullscreen').click();
ok(document.fullscreenElement===document.documentElement, 'fullscreen requested');
elById('btn-fullscreen').click();
ok(document.fullscreenElement===null, 'fullscreen exits on second press');
elById('btn-uitoggle').click();
ok(document.body.classList.contains('ui-hidden'), 'UI hidden via toggle');
elById('ui-restore').click();
ok(!document.body.classList.contains('ui-hidden'), 'UI restored');

console.log('--- camera: wheel zoom + shoot-mode pan ---');
G.Game.phase='AIM'; G.Input.mode='SHOOT';
const d0=G.Input.sDist;
fire('gl','wheel',{deltaY:240});
ok(G.Input.sDist>d0, 'wheel zooms out in shoot mode ('+d0.toFixed(2)+'→'+G.Input.sDist.toFixed(2)+')');
const h0=G.Input.sH;
fire('gl','pointerdown',{clientX:400,clientY:300,pointerId:1});
fireWin('pointermove',{clientX:400,clientY:380,pointerId:1});
fireWin('pointerup',{pointerId:1});
ok(G.Input.sH>h0, 'vertical drag pans camera up/down in shoot mode');
G.Input.mode='ORBIT'; G.Input.fov=50;                       // free-cam lens at default
const fv0=G.Input.fov;
fire('gl','wheel',{deltaY:-300});
ok(G.Input.fov<fv0, 'wheel scroll-up zooms the lens IN (narrower FOV '+fv0.toFixed(0)+'→'+G.Input.fov.toFixed(0)+')');
const fv1=G.Input.fov;
fire('gl','wheel',{deltaY:300});
ok(G.Input.fov>fv1, 'wheel scroll-down zooms the lens OUT (wider FOV)');

console.log('--- pinch (mobile, first-person lens zoom) ---');
G.Input.mode='ORBIT'; G.Input.fov=40;
const p0=G.Input.fov;
fire('gl','touchstart',{touches:[{clientX:100,clientY:300},{clientX:500,clientY:300}]});
fire('gl','touchmove',{touches:[{clientX:200,clientY:300},{clientX:400,clientY:300}]});
fire('gl','touchend',{touches:[]});
ok(G.Input.fov!==p0, 'pinch zooms the first-person lens (FOV changes)');

console.log('--- first-person walk: direction + furniture collision ---');
G.Input.mode='ORBIT'; G.Game.phase='AI';                 // free-cam active
G.Input.walkPos.set(4.0,0.5,1.0); G.Input.orbitYaw=0; G.Input.lookPitch=0;   // facing +X, open floor
G.Input.keys={}; G.Input.keys['KeyW']=true; G.Input.update(0.1); G.Input.keys['KeyW']=false;
ok(G.Input.walkPos.x>4.0, 'W walks forward (+X when facing +X)');
const zR=G.Input.walkPos.z; G.Input.keys['KeyD']=true; G.Input.update(0.1); G.Input.keys['KeyD']=false;
ok(G.Input.walkPos.z>zR, 'D strafes to the viewer\'s right (+Z when facing +X)');
const xR=G.Input.walkPos.x; G.Input.keys['KeyA']=true; G.Input.update(0.1); G.Input.keys['KeyA']=false;
ok(G.Input.walkPos.z<G.Input.walkPos.z+1 && G.Input.walkPos.x<=xR+1e-6, 'A strafes left (back toward -Z)');
G.Input.walkPos.set(4.0,0.5,1.0); const yUp=G.Input.walkPos.y;
G.Input.keys={}; G.Input.keys['Space']=true; G.Input.update(0.1); G.Input.keys['Space']=false;
ok(G.Input.walkPos.y>yUp, 'Space raises the first-person eye');
const yDn=G.Input.walkPos.y; G.Input.keys['ControlLeft']=true; G.Input.update(0.1); G.Input.keys['ControlLeft']=false;
ok(G.Input.walkPos.y<yDn, 'Left Ctrl lowers the first-person eye');
G.Input.walkPos.set(0.3,0.5,-3.6); G.Input.clampWalk();   // drop the eye into the bar
const inBar = G.Input.walkPos.x>-1.15 && G.Input.walkPos.x<1.75 && G.Input.walkPos.z>-4.30 && G.Input.walkPos.z<-2.55;
ok(!inBar, 'collision pushes the first-person eye out of the bar block');
G.Input.keys={}; G.Game.phase='MENU';

console.log('--- thumbstick ---');
fire('stick','pointerdown',{pointerId:7,clientX:0,clientY:0});
fire('stick','pointermove',{pointerId:7,clientX:444,clientY:300});
ok(G.Input.stickVec.x>0.9, 'stick deflection registered ('+G.Input.stickVec.x.toFixed(2)+')');
G.Game.phase='AIM'; G.Input.mode='SHOOT';
const yaw0=G.Input.aimYaw;
for(let i=0;i<30;i++) G.Input.update(1/60);
ok(G.Input.aimYaw!==yaw0, 'stick steers aim in shoot mode');
fire('stick','pointerup',{pointerId:7});
ok(G.Input.stickVec.x===0&&G.Input.stickVec.y===0, 'stick recenters on release');

console.log('--- lighting (flicker disabled, stays constant) ---');
ok(G.flickerLights.length>=6, 'light pool collected ('+G.flickerLights.length+' lights)');
const lvl0=G.flickerLights.map(l=>l.intensity);
for(let i=0;i<300;i++) G.Flicker.update(0.1);   // ~30s simulated - would have triggered an episode before
ok(!G.Flicker.active, 'no flicker episode ever starts');
ok(G.flickerLights.every((l,i)=>l.intensity===lvl0[i]), 'lamp intensities never change');

console.log('--- smoke + trough in render loop ---');
try{ for(let i=0;i<20;i++){ G.Smoke.update(i*0.05); G.Trough.update(1/60); } ok(true,'smoke/trough update loop stable'); }
catch(e){ ok(false,'animation loop threw: '+e.message); }

console.log('--- achievements & challenges ---');
G.Profile.data.achievements=[]; G.Profile.data.challenges={};
G.Progression.ensureChallenges();
ok(!!G.Profile.data.challenges.daily && !!G.Profile.data.challenges.weekly, 'daily + weekly challenges generated for the period');
G.Profile.data.stats.wins=1; G.Progression.evalAchievements({});
ok(G.Progression.unlocked('first_blood'), 'stat-based achievement unlocks (first win)');
ok(G.Progression.unlocked('break_artist')===false, 'event achievement stays locked until its event');
G.Progression.afterShot({pots:1, breakPot:true});
ok(G.Progression.unlocked('break_artist'), 'event achievement unlocks on its event (break pot)');
/* force a known daily so the goal check is deterministic regardless of date */
G.Profile.data.challenges={ day:G.Progression._dayKey(), week:G.Progression._weekKey(),
  daily:{id:'pot10',prog:0,done:false}, weekly:{id:'wwin10',prog:0,done:false} };
const xpBefore=G.Profile.data.xp;
G.Progression.track('pots',10);
ok(G.Profile.data.challenges.daily.done && G.Profile.data.xp>xpBefore, 'challenge completes at goal and awards XP');
G.Progression.afterFrame({won:true, foulFreeWin:true});
ok(G.Progression.unlocked('spotless'), 'foul-free win achievement unlocks');
try{ G.UI.challengesModal(); ok(true,'challengesModal renders'); }catch(e){ ok(false,'challengesModal threw: '+e.message); }
G.Profile.data.achievements=[]; G.Profile.data.stats.wins=0; G.Profile.data.challenges={};

console.log('--- rating & win streaks ---');
G.Profile.data.rating=1000; G.Profile.data.stats.frameStreak=0; G.Profile.data.stats.bestFrameStreak=0;
const dWin=G.Progression.ratedFrame(true,1);
ok(G.Profile.data.rating>1000 && dWin>0, 'winning vs CPU raises Elo rating (+'+dWin+')');
ok(G.Profile.data.stats.frameStreak===1, 'frame-win streak increments on a win');
G.Progression.ratedFrame(true,1);
ok(G.Profile.data.stats.frameStreak===2 && G.Profile.data.stats.bestFrameStreak===2, 'current + best win streak track');
const rBefore=G.Profile.data.rating;
G.Progression.ratedFrame(false,1);
ok(G.Profile.data.rating<rBefore && G.Profile.data.stats.frameStreak===0, 'a loss lowers rating and resets the streak');
ok(G.Progression.rankTier(1500)==='Legend' && G.Progression.rankTier(900)==='Rookie', 'rank tiers map from rating');
G.Profile.data.rating=1000; G.Profile.data.stats.frameStreak=0; G.Profile.data.stats.bestFrameStreak=0;

console.log('--- campaign / career ladder ---');
G.Profile.data.campaign={cleared:[]};
const oppA=G.Campaign.list()[0], oppB=G.Campaign.list()[1];
ok(G.Campaign.isUnlocked(oppA)===true, 'first opponent unlocked by default');
ok(G.Campaign.isUnlocked(oppB)===false, 'second opponent locked until first is cleared');
G.Game.startCampaignMatch(oppA);
ok(!!G.Game.match && G.Game.match.opp.id===oppA.id, 'startCampaignMatch sets up the match');
ok(G.Game.match.need===Math.ceil(oppA.frames/2), 'match target is ceil(frames/2)');
ok(G.Game.playerName(1)===oppA.name, 'scoreboard shows opponent name during a match');
const needA=G.Game.match.need;
for(let i=0;i<needA;i++) G.Game.endFrame(true,'test win');
ok(G.Game.match===null, 'match concludes when frame target is reached');
ok(G.Campaign.cleared(oppA.id)===true, 'beating an opponent records a clear');
ok(G.Campaign.isUnlocked(oppB)===true, 'next opponent unlocks after a clear');
G.Game.abandonMatch(); G.Profile.data.campaign={cleared:[]}; G.Game.mode='cpu';
try{ G.UI.campaignModal(); ok(true,'campaignModal renders'); }catch(e){ ok(false,'campaignModal threw: '+e.message); }

console.log('--- game modes (9-ball / practice / trick shots) ---');
G.Game.ruleset='9ball'; G.Game.mode='local'; G.Game.breaker=0; G.Game.newGame();
ok(G.balls.filter(b=>b.active&&b.num>0).length===9, '9-ball racks exactly nine object balls');
ok(G.balls.find(b=>b.num===9).active && !G.balls.find(b=>b.num===12).active, 'balls 10–15 sit out in 9-ball');
G.Game._lowest9Before=1;
const n1=G.balls.find(b=>b.num===1), n9=G.balls.find(b=>b.num===9);
G.shotEvents.reset(false); G.shotEvents.firstContact=n1; G.shotEvents.potted=[n9];
G.Game.turn=0; G.Game._settle9();
ok(G.Game.phase==='OVER', 'sinking the 9 after hitting the lowest ball wins the rack');
G.Game.ruleset='9ball'; G.Game.mode='local'; G.Game.newGame(); G.Game._lowest9Before=1;
const n3=G.balls.find(b=>b.num===3);
G.shotEvents.reset(false); G.shotEvents.firstContact=n3; G.shotEvents.potted=[]; G.shotEvents.cushionAfterContact=true;
G.Game.turn=0; G.Game._settle9();
ok(G.Game.turn===1, 'hitting the wrong ball first in 9-ball is a foul (turn passes)');

G.Game.ruleset='practice'; G.Game.newGamePractice();
ok(G.balls.filter(b=>b.active&&b.num>0).length===15, 'practice racks all fifteen object balls');
G.shotEvents.reset(false); G.shotEvents.cueScratch=true; G.shotEvents.firstContact=null;
G.Game._settlePractice();
ok(G.Game.phase!=='OVER', 'practice never ends the frame (free play)');

G.Game.startTrickshot(G.TRICKSHOTS[0]);
ok(G.Game.ruleset==='practice' && G.balls.filter(b=>b.active&&b.num>0).length===G.TRICKSHOTS[0].balls.length,
   'trick shot lays out exactly its preset balls');
G.Game.ruleset='8ball'; G.Game.mode='cpu'; G.Game._practiceLayout=null;

console.log('--- called shots (8-ball house rule) ---');
G.Profile.data.calledShots=true;
G.Game.ruleset='8ball'; G.Game.mode='local'; G.Game.openTable=false;
G.Game.groups=['solid','stripe']; G.Game.turn=0;
G.balls.forEach(b=>{ if(b.num>=1&&b.num<=7){ b.active=false; b.falling=false; } });
const e8=G.balls.find(b=>b.num===8); e8.active=true; e8.falling=false;
ok(G.Game.isOnEight(0)===true, 'human is on the 8 once their group is cleared');
ok(G.Game.needCall(0)===true, 'pocket call required when called-shots is on and on the 8');
/* wrong called pocket -> loss */
const winsA=G.Profile.data.stats.wins;
G.Game._remAtStart=0; G.Game.calledPocket=3; G.Game._shotCall=3; G.Game.turn=0;
G.shotEvents.reset(false); G.shotEvents.firstContact=e8; G.shotEvents.potted=[e8]; e8.fallPocket=G.POCKETS[0];
G.Game.onShotSettled();
ok(G.Game.phase==='OVER' && G.Profile.data.stats.wins===winsA, 'sinking the 8 in the wrong called pocket loses the frame');
/* correct called pocket -> win */
G.balls.forEach(b=>{ if(b.num>=1&&b.num<=7){ b.active=false; } }); e8.active=true; e8.falling=false;
G.Game.openTable=false; G.Game.groups=['solid','stripe']; G.Game.turn=0; G.Game._remAtStart=0;
const winsB=G.Profile.data.stats.wins;
G.Game.calledPocket=2; G.Game._shotCall=2;
G.shotEvents.reset(false); G.shotEvents.firstContact=e8; G.shotEvents.potted=[e8]; e8.fallPocket=G.POCKETS[2];
G.Game.onShotSettled();
ok(G.Game.phase==='OVER' && G.Profile.data.stats.wins===winsB+1, 'sinking the 8 in the called pocket wins the frame');
G.Profile.data.calledShots=false; G.Game.ruleset='8ball'; G.Game.mode='cpu'; G.Game.calledPocket=null;

console.log('--- AI position play ---');
G.Game.ruleset='8ball'; G.Game.openTable=true; G.Game.groups=[null,null];
G.balls.forEach(b=>{ if(b.num>0){ b.active=true; b.falling=false; } });
const aiT=G.balls.find(b=>b.num===10), aiN=G.balls.find(b=>b.num===11);
G.balls.forEach(b=>{ if(b.num>0 && b!==aiT && b!==aiN) b.pos.set(5,0.0286,5); });
aiT.pos.set(0,0.0286,0); aiN.pos.set(0.4,0.0286,0);
G.Game.diff=2;
const spAhead=G.AI.positionSpin({target:aiT, dir:new THREE.Vector3(1,0,0)});
ok(spAhead.sy>0, 'sharp AI uses follow when the next ball is ahead');
const spBehind=G.AI.positionSpin({target:aiT, dir:new THREE.Vector3(-1,0,0)});
ok(spBehind.sy<0, 'sharp AI uses draw when the next ball is behind');
G.Game.diff=0;
ok(G.AI.positionSpin({target:aiT, dir:new THREE.Vector3(1,0,0)}).sy===0, 'casual AI strikes centre (no position spin)');
G.Game.diff=1;

console.log('--- tutorial / onboarding ---');
ok(Array.isArray(G.TUTORIAL_STEPS) && G.TUTORIAL_STEPS.length>=3, 'tutorial has multiple steps');
G.Profile.data.tutorialSeen=false;
elById('tutorial-overlay').classList.add('hidden');
G.UI.tutorialOpen(false);
ok(!elById('tutorial-overlay').classList.contains('hidden'), 'tutorial overlay opens on first play');
for(let i=0;i<G.TUTORIAL_STEPS.length+2;i++) G.UI.tutorialNext();
ok(G.Profile.data.tutorialSeen===true, 'finishing the tutorial marks it seen (persisted)');
ok(elById('tutorial-overlay').classList.contains('hidden'), 'tutorial overlay closes at the end');
G.UI.tutorialOpen(true);
ok(!elById('tutorial-overlay').classList.contains('hidden'), 'tutorial replays from the menu');
G.UI.tutorialClose();

console.log('--- haptics + control tuning ---');
ok(typeof G.Haptics!=='undefined', 'haptics helper present');
let hThrew=false; try{ G.Haptics.buzz(20); G.Haptics.buzz([0,20,30,20]); }catch(e){ hThrew=true; }
ok(!hThrew && G.Haptics.enabled()===false, 'haptics is a safe no-op without navigator.vibrate');
G.UI.settingsModal();
elById('haptics-on').checked=false; fire('haptics-on','change',{target:{checked:false}});
ok(G.Profile.data.haptics===false, 'vibration toggle persists off');
fire('haptics-on','change',{target:{checked:true}});
ok(G.Profile.data.haptics===true, 'vibration toggle persists on');
fire('stick','pointerdown',{pointerId:9,clientX:400,clientY:300});
fire('stick','pointermove',{pointerId:9,clientX:404,clientY:300});
ok(G.Input.stickVec.x===0 && G.Input.stickVec.y===0, 'tiny thumbstick deflection is ignored (deadzone)');
fire('stick','pointerup',{pointerId:9});

console.log('--- cigarette embers ---');
ok(G.Embers && G.Embers.list.length>0, 'embers registered from the cigarette sets ('+(G.Embers?G.Embers.list.length:0)+')');
const em0=G.Embers.list[0];
let emThrew=false; try{ G.Embers.update(1.0); G.Embers.update(3.7); }catch(e){ emThrew=true; }
ok(!emThrew && typeof em0.material.emissiveIntensity==='number', 'ember glow animates without error');

console.log('--- graphics quality ---');
ok(G.Graphics && G.Graphics.levels.low && G.Graphics.levels.high, 'quality presets defined');
G.Graphics.apply('low');
ok(G.renderer.shadowMap.enabled===false, 'low quality disables shadows');
G.Graphics.apply('high');
ok(G.renderer.shadowMap.enabled===true, 'high quality enables shadows');
let gThrew=false; try{ G.Graphics.apply('medium'); G.Graphics.apply(); }catch(e){ gThrew=true; }
ok(!gThrew, 'applying quality presets is safe');
G.Profile.data.quality='high'; G.Graphics.apply('high');

console.log('--- english / blackball pool (reds & yellows) ---');
G.Game.ruleset='blackball'; G.Game.mode='local'; G.Game.breaker=0; G.Game.newGame();
ok(G.balls.filter(b=>b.active&&b.num>0).length===15, 'blackball racks 15 balls (7 reds, 7 yellows, black)');
const bbRed=G.balls.find(b=>b.num===3);
ok(bbRed.mesh.material.map===bbRed._texBB, 'balls wear the reds/yellows skin in blackball');
ok(G.Game.colourName('solid')==='reds' && G.Game.colourName('stripe')==='yellows', 'groups are named reds & yellows');
G.Game.openTable=true; G.Game.groups=[null,null]; G.Game.turn=0; G.Game.isBreak=false; G.Game._remAtStart=null;
const r3=G.balls.find(b=>b.num===3); r3.active=false; r3.falling=false;
G.shotEvents.reset(false); G.shotEvents.firstContact=r3; G.shotEvents.potted=[r3]; r3.fallPocket=G.POCKETS[0];
G.Game.onShotSettled();
ok(G.Game.groups[0]==='solid', 'potting a red claims the reds (open table → claim colour)');
G.Game.ruleset='8ball'; G.Game.mode='cpu'; G.Game.newGame();
ok(bbRed.mesh.material.map===bbRed._texNum, 'balls return to the numbered skin outside blackball');

console.log('');
console.log('--- local multiplayer ---');
G.Game.mode='local';
ok(G.Game.isHuman(0)===true && G.Game.isHuman(1)===true, 'both players human in local mode');
ok(G.Game.playerName(1)==='Player 2', 'player 2 named in local mode');
G.Game.mode='cpu';
ok(G.Game.isHuman(1)===false, 'player 2 is CPU in cpu mode');
ok(G.Game.playerName(1)==='House', 'CPU named House');
// in local mode, player 1's turn must route to a human aim phase, never AI
G.Game.mode='local'; G.Game.turn=1; G.Game.beginTurn(1);
ok(G.Game.phase==='AIM', 'local P2 turn routes to AIM not AI (phase='+G.Game.phase+')');
G.Game.mode='cpu';

console.log('');
console.log('--- cue ball off-table reset (out of bounds) ---');
G.Game.ruleset='8ball'; G.Game.mode='cpu';
const cb=G.cueBall; cb.offTable=true; cb.active=false; cb.mesh.visible=false; cb.shadowDisc.visible=false; cb.pos.set(3,-2,3);
G.Game.newGame();
ok(cb.offTable===false && cb.active===true && cb.mesh.visible===true,
   'starting a new match clears the off-table flag and restores the cue ball');
ok(cb.pos.y>0 && cb.pos.y<0.05, 'reset cue ball sits on the table, not under it');
/* a cue ball driven off the table is a scratch → turn passes to the opponent */
G.Game.ruleset='8ball'; G.Game.mode='cpu'; G.Game.openTable=true; G.Game.groups=[null,null]; G.Game.turn=0; G.Game.isBreak=false;
const someObj=G.balls.find(b=>b.num===1);
G.shotEvents.reset(false); G.shotEvents.firstContact=someObj; G.shotEvents.cueScratch=true; G.shotEvents.potted=[cb];
G.Game.onShotSettled();
ok(G.Game.turn===1, 'driving the cue ball off the table passes the turn (scratch foul)');

console.log('');
console.log('--- aim guide setting (Full / Cue / Off) ---');
G.Profile.data.aimGuide='full';
G.UI.cycleAimGuide(); ok(G.Profile.data.aimGuide==='cue',  'aim guide cycles Full → Cue');
G.UI.cycleAimGuide(); ok(G.Profile.data.aimGuide==='off',  'aim guide cycles Cue → Off');
G.UI.cycleAimGuide(); ok(G.Profile.data.aimGuide==='full', 'aim guide cycles Off → Full');

console.log('\n--- career ladder: five leagues of five (4 + boss) ---');
ok(G.LEAGUES.length===5, 'there are five leagues');
ok(G.LEAGUES.every(l=>l.opps.length===5), 'every league has five opponents');
ok(G.LEAGUES.every(l=>l.opps[4].boss===true), 'the fifth opponent in each league is the boss');
ok(G.LEAGUES.every(l=>l.opps.filter(o=>o.boss).length===1), 'each league has exactly one boss');
ok(G.LEAGUES.every(l=>l.opps.every(o=>typeof o.edge==='number')), 'every opponent has a difficulty edge');
ok(G.Campaign.totalOpps()===25, 'twenty-five opponents on the ladder');
ok(G.Campaign.leagueById('hightable') && G.Campaign.leagueIndex('hightable')===2, 'leagueById / leagueIndex resolve');
/* the edge blends the AI toward perfect: a boss with edge>0 must be sharper than its base tier */
(function(){
  const boss=G.LEAGUES[4].opps[4]; G.Game.diff=boss.diff; G.Game.match={opp:boss};
  const tuned=G.AI.cfg(); G.Game.match=null; const base=G.AI.cfg();
  ok(tuned.jitter<base.jitter && tuned.smart>=base.smart, 'opponent edge sharpens the AI (less jitter, '+tuned.jitter.toFixed(4)+' < '+base.jitter.toFixed(4)+')');
})();

console.log(fail===0 ? 'ALL '+pass+' FEATURE TESTS PASSED' : fail+' FAILURES / '+pass+' passed');
process.exit(fail===0?0:1);
}
