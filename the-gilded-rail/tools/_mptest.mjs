/* Dev-only: end-to-end ONLINE MULTIPLAYER protocol test (temporary file).
   Two headless browsers run the real engine; this harness relays Net messages
   between them exactly as Supabase Realtime broadcast would, and advances the
   host's physics by calling the engine's physicsFrame() directly (headless
   software WebGL renders ~1 frame / 3s, far too slow to settle a shot via rAF).
   Verifies: host break -> state streaming -> settle sync -> guest turn ->
   guest shot applied on host -> position/turn parity on both screens. */
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:5199/';
const mkBrowser = () => chromium.launch({ channel:'msedge', args:['--use-gl=angle','--use-angle=swiftshader'] });

async function mkPage(name){
  const browser = await mkBrowser();
  const page = await browser.newPage({ viewport:{ width:480, height:320 } });
  /* hermetic: everything the game needs is served from localhost; external hosts
     (fonts, supabase - unused here, the transport is stubbed) are cut off so a
     degraded internet connection can't stall the load */
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  page.on('pageerror', e => console.log(name+' PAGEERROR:', e.message));
  await page.goto(URL, { waitUntil:'domcontentloaded', timeout:180000 });
  await page.waitForFunction(() => typeof Net!=='undefined' && typeof Game!=='undefined' && Game.phase==='MENU', null, { timeout:180000 });
  await page.evaluate(() => { Profile.data.quality='low'; Profile.data.dof='off'; Graphics.apply(); });
  return page;
}
const host = await mkPage('HOST'), guest = await mkPage('GUEST');

/* stub the transport: Net.send -> outbox; we relay to the peer's handlers */
const stub = (seat, myName, otherName) => {
  window.__out = [];
  Net.send = (event, payload) => window.__out.push({ event, payload });
  Net.channel = { stub:true };
  Net.seat = seat; Net.code = 'TEST42'; Net.peerHere = true;
  Net.names = seat===0 ? [myName, otherName] : [otherName, myName];
  window.__recv = (event, payload) => {
    const H = { start:'_onStart', again:'_onStart', shot:'_onShot', bih:'_onBih',
                state:'_onState', sync:'_onSync', over:'_onOver', ready:'_onReady' };
    if(H[event]) Net[H[event]](payload);
  };
};
await host.evaluate(`(${stub})(0,'Hosty','Guesty')`);
await guest.evaluate(`(${stub})(1,'Guesty','Hosty')`);

/* pump: relay each side's outbox into the other (like the realtime socket) */
let pumping = true;
const pump = async () => {
  while(pumping){
    for(const [from,to] of [[host,guest],[guest,host]]){
      const msgs = await from.evaluate(() => window.__out.splice(0)).catch(()=>[]);
      if(msgs.length) await to.evaluate(list => list.forEach(mm => window.__recv(mm.event, mm.payload)), msgs).catch(()=>{});
    }
    await new Promise(r=>setTimeout(r,40));
  }
};
const pumpP = pump();

/* advance host physics in chunks; the 85ms stream interval fires between chunks */
const settle = async () => {
  for(let i=0;i<600;i++){
    const ph = await host.evaluate(() => {
      for(let k=0;k<40 && Game.phase==='SIM';k++) physicsFrame(1/60);
      return Game.phase;
    });
    if(ph!=='SIM') return ph;
    await new Promise(r=>setTimeout(r,30));
  }
  throw new Error('shot never settled');
};

/* wait until the relayed queue is fully delivered before comparing screens */
const drain = async () => {
  for(let i=0;i<200;i++){
    const n = await host.evaluate(() => window.__out.length) + await guest.evaluate(() => window.__out.length);
    if(!n) break;
    await new Promise(r=>setTimeout(r,50));
  }
  await new Promise(r=>setTimeout(r,600));
};

const snap = p => p.evaluate(() => ({
  mode:Game.mode, phase:Game.phase, turn:Game.turn, open:Game.openTable,
  groups:Game.groups, names:[Game.playerName(0),Game.playerName(1)],
  active:balls.filter(b=>b.active).length,
  sum:+balls.filter(b=>b.active).reduce((s,b)=>s+b.pos.x+b.pos.z,0).toFixed(3)
}));

/* 1 - host starts the match */
await host.evaluate(() => Net.startMatch());
await new Promise(r=>setTimeout(r,1500));
console.log('AFTER START  host:', JSON.stringify(await snap(host)));
console.log('AFTER START guest:', JSON.stringify(await snap(guest)));

/* 2 - host breaks; confirm the guest sees balls MOVING mid-shot (state stream) */
await host.evaluate(() => Game.fire(Input.aimDir(), 0.55, 0, 0));
await host.evaluate(() => { for(let k=0;k<50 && Game.phase==='SIM';k++) physicsFrame(1/60); });
await new Promise(r=>setTimeout(r,900));
const gMid = await snap(guest);
console.log('MID-SIM     guest:', JSON.stringify(gMid), '| stream moved balls:', Math.abs(gMid.sum-9.642)>0.01, '| phase SIM:', gMid.phase==='SIM');
await settle();
await drain();
const h1 = await snap(host), g1 = await snap(guest);
console.log('AFTER BREAK  host:', JSON.stringify(h1));
console.log('AFTER BREAK guest:', JSON.stringify(g1));
console.log('CHECK pos match:', Math.abs(h1.sum-g1.sum)<0.05, '| turn match:', h1.turn===g1.turn, '| groups match:', JSON.stringify(h1.groups)===JSON.stringify(g1.groups));

/* 3 - host keeps shooting until the turn passes to the guest */
let hs = h1;
for(let i=0; i<10 && hs.turn===0 && hs.phase!=='OVER'; i++){
  if(hs.phase==='BIH') await host.evaluate(() => { Input.tryPlaceBIH({clientX:innerWidth/2, clientY:innerHeight/2}); Game.phase='AIM'; Input.enterShootMode(true); });
  await host.evaluate(() => Game.fire(Input.aimDir(), 0.5, 0, 0));
  await settle();
  await drain();
  hs = await snap(host);
}
await drain();
const g2 = await snap(guest);
console.log('HANDOFF      host:', JSON.stringify(hs));
console.log('HANDOFF     guest:', JSON.stringify(g2));

/* 4 - guest shoots (relayed to the host, host simulates, both re-sync) */
if(g2.turn===1 && g2.phase!=='OVER' && hs.phase!=='OVER'){
  if(g2.phase==='BIH'){
    await guest.evaluate(() => { Net.send('bih', { x:-0.4, z:0.1 }); Game.phase='AIM'; Input.enterShootMode(true); });
    await new Promise(r=>setTimeout(r,600));
  }
  await guest.evaluate(() => Game.fire(Input.aimDir(), 0.55, 0, 0));
  await new Promise(r=>setTimeout(r,600));
  console.log('GUEST SHOT applied on host (phase should be SIM):', await host.evaluate(() => Game.phase));
  await settle();
  await drain();
  const h3 = await snap(host), g3 = await snap(guest);
  console.log('AFTER GUEST SHOT  host:', JSON.stringify(h3));
  console.log('AFTER GUEST SHOT guest:', JSON.stringify(g3));
  console.log('CHECK pos match:', Math.abs(h3.sum-g3.sum)<0.05, '| turn match:', h3.turn===g3.turn);
} else {
  console.log('SKIP guest shot (guest state:', JSON.stringify(g2), ')');
}

pumping = false; await pumpP;
await host.context().browser().close(); await guest.context().browser().close();
console.log('MP PROTOCOL TEST DONE');
