/* dev-only: smoke-check the easter-egg page boots, and the flashlight lights up in the
   main game. Run: node tools/_verify.mjs */
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5174';
const browser = await chromium.launch({ channel:'msedge', headless:true,
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });

/* (a) easter egg */
{
  const page = await browser.newPage({ viewport:{width:800,height:600} });
  const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.goto(base+'/easter-egg.html', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(()=>({
    three: typeof THREE!=='undefined',
    menu: !!document.getElementById('menu-overlay') && !document.getElementById('menu-overlay').classList.contains('hidden'),
    canvas: !!document.getElementById('gl')
  }));
  console.log('EASTER EGG: three='+r.three+' menuVisible='+r.menu+' canvas='+r.canvas+' pageerrors='+errs.length);
  if(errs.length) console.log('  errors:', errs.slice(0,3).join(' | '));
  await page.close();
}

/* (b) flashlight in main game */
{
  const page = await browser.newPage({ viewport:{width:800,height:600} });
  const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.goto(base+'/', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForTimeout(12000);
  const r = await page.evaluate(async ()=>{
    Profile.data.codes.flashlight=true;
    const before = Flashlight.light ? Flashlight.light.intensity : -1;
    Flashlight.set(true);
    await new Promise(res=>setTimeout(res,1200));   // let the loop fade it in
    return { available:Flashlight.available(), on:Flashlight.on,
      before, after: Flashlight.light?+Flashlight.light.intensity.toFixed(2):-1,
      glow: Flashlight.glow?+Flashlight.glow.material.opacity.toFixed(2):-1 };
  });
  console.log('FLASHLIGHT: available='+r.available+' on='+r.on+' intensity '+r.before+'→'+r.after+' glowOpacity='+r.glow+' pageerrors='+errs.length);
  if(errs.length) console.log('  errors:', errs.slice(0,3).join(' | '));
  await page.close();
}
await browser.close();
