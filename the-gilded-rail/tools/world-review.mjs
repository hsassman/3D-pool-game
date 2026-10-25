/* Actual WebGL material, lifecycle and visual review. Run against the dist server. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[],missing=[];
  await page.addInitScript(()=>{
    const raf=requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>callback.name==='loop'?0:raf(callback);
  });
  page.on('pageerror',e=>errors.push(e.message));
  const url=process.argv[2]||'http://127.0.0.1:5175/';
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))missing.push(r.url());});
  await page.route('https://js.hcaptcha.com/**',route=>route.abort());
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>typeof WorldMaterials!=='undefined'&&Object.keys(WorldMaterials.textures).length===11&&typeof UI!=='undefined'&&Profile.data.gfxReset1,null,{timeout:90000});
  const result=await page.evaluate(()=>{
    Graphics.apply('low');Profile.data.tutorialSeen=true;
    const original={felt:Profile.data.felt,cue:Profile.data.cue,rail:Profile.data.rail};
    Profile.data.cue='founders';Unlocks.applyCue();renderer.render(scene,camera);
    const baseline=renderer.info.memory.textures;
    let disposals=0;bedTopMat.map.addEventListener('dispose',()=>disposals++);feltMat.map.addEventListener('dispose',()=>disposals++);
    for(const key of ['billiardroom','petrol','claret','emerald','crimson','forest']){
      Profile.data.felt=key;Unlocks.applyFelt();renderer.render(scene,camera);
    }
    const after=renderer.info.memory.textures;
    const same=bedTopMat.map;Unlocks.applyFelt();
    const stable=same===bedTopMat.map;
    const inlaid=cueParts.butt.material.map===WorldMaterials.textures['deco-cue-wrap'];
    Profile.data.cue='classic';Unlocks.applyCue();const plain=cueParts.butt.material.map===null;
    const worldMeshes=[];ClubWorld.group.traverse(o=>{if(o.isMesh)worldMeshes.push(o);});
    const nets=tableGroup.children.filter(o=>o.name.startsWith('Pocket twine'));
    const netGeometryCount=new Set(nets.map(o=>o.geometry)).size;
    const netOpaque=nets.every(o=>!o.material.transparent&&!o.material.alphaMap);
    const netFinite=nets.every(o=>Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
    Object.assign(Profile.data,original);Unlocks.applyAll();
    return {baseline,after,disposals,stable,inlaid,plain,worldMeshes:worldMeshes.length,
      nets:nets.length,netGeometryCount,netOpaque,netFinite,materials:Object.keys(WorldMaterials.textures)};
  });
  assert.equal(result.disposals,2,'Replaced felt textures must be disposed');
  assert.equal(result.stable,true,'Reapplying equipped felt must reuse its textures');
  assert.ok(result.after<=result.baseline,'Equipment cycling must not grow GPU texture usage');
  assert.ok(result.inlaid&&result.plain,'Marquetry must appear only on inlaid cues');
  assert.equal(result.worldMeshes,6);
  assert.equal(result.nets,6);assert.equal(result.netGeometryCount,2);
  assert.ok(result.netOpaque&&result.netFinite,'Pocket nets must be finite open geometry without transparency');
  for(const view of ['room','painting','cue','pocket','return','clock','window','portraits','lamps']){
    const data=await page.evaluate(view=>{
      cueStick.visible=false;
      if(view==='room'){camera.position.set(3.6,1.4,2.5);camera.lookAt(0,.35,-1.1);}
      if(view==='painting'){camera.position.set(-4.9,1.46,-1.65);camera.lookAt(-6.55,1.46,-1.65);}
      if(view==='pocket'){camera.position.set(.1,.32,.72);camera.lookAt(0,-.06,H2+.016);}
      if(view==='return'){
        Trough.reset();balls.filter(b=>b.num>0).forEach(b=>{b.fallPocket=null;Trough.add(b);});
        for(let i=0;i<1400;i++)Trough.update(1/60);
        camera.position.set(Trough.laneX-.65,.04,.54);camera.lookAt(Trough.laneX,-.145,0);
      }
      if(view==='clock'){
        const angles={hour:-Math.PI/6*10,minute:-Math.PI/30*10,second:-Math.PI/30*36};
        Object.keys(angles).forEach(key=>clockHands[key].rotation.z=angles[key]);
        camera.position.set(ROOM_RX-1.05,2.05,0);camera.lookAt(ROOM_RX-.05,2.05,0);
      }
      if(view==='window'){camera.position.set(.4,1.07,ROOM_FZ-1.9);camera.lookAt(0,.86,ROOM_FZ);}
      if(view==='portraits'){camera.position.set(ROOM_RX-1.8,1.5,-1.7);camera.lookAt(ROOM_RX-.045,1.5,-1.7);}
      if(view==='lamps'){camera.position.set(1.1,1.45,1.5);camera.lookAt(0,1.57,0);}
      if(view==='cue'){
        Profile.data.cue='founders';Unlocks.applyCue();cueStick.visible=true;
        cueStick.position.set(-.8,.12,0);cueStick.quaternion.identity();cueStick.rotation.z=Math.PI/2;
        camera.position.set(0,.75,1.3);camera.lookAt(0,.12,0);
      }
      camera.updateMatrixWorld();renderer.render(scene,camera);
      return renderer.domElement.toDataURL('image/png');
    },view);
    writeFileSync('tools/_shot_world_'+view+'.png',Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log(JSON.stringify({result,errors,missing},null,2));
}finally{await browser.close();}
