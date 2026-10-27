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
  const performanceChecks=await page.evaluate(()=>{
    const lazy=PostFX.composer===null;
    const position=aimLine.geometry.attributes.position,distance=aimLine.geometry.attributes.lineDistance;
    const objectPosition=objLine.geometry.attributes.position,deflectPosition=defLine.geometry.attributes.position;
    const direction=new THREE.Vector3(1,0,0);
    for(let i=0;i<1000;i++)updateAimGuide(direction,i%2?'full':'cue');
    const guideReuse=position===aimLine.geometry.attributes.position&&distance===aimLine.geometry.attributes.lineDistance&&
      objectPosition===objLine.geometry.attributes.position&&deflectPosition===defLine.geometry.attributes.position;
    camera.position.set(0,1.07,3.5);camera.lookAt(0,.86,ROOM_FZ);camera.updateMatrixWorld(true);
    const project=object=>object.position.clone().project(camera).x;
    const before=[windowExterior.near,windowExterior.far,windowExterior.moon].map(project);
    camera.position.x+=.35;camera.updateMatrixWorld(true);
    const shifts=[windowExterior.near,windowExterior.far,windowExterior.moon].map((object,i)=>Math.abs(project(object)-before[i]));
    return {lazy,guideReuse,shifts};
  });
  assert.equal(performanceChecks.lazy,true,'Low quality must not allocate unused postprocessing buffers');
  assert.equal(performanceChecks.guideReuse,true,'Aiming must retain its GPU attributes across updates');
  assert.ok(performanceChecks.shifts[0]>performanceChecks.shifts[1]&&performanceChecks.shifts[1]>performanceChecks.shifts[2],'Near roofs must move faster than skyline and moon');
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
  await page.waitForFunction(()=>Models.has('dartcab'),null,{timeout:90000});
  const dartMaps=await page.evaluate(()=>{
    const maps=new Map();Models.cache.dartcab.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.map)maps.set(m.name,m.map.image.width);}});return Array.from(maps.values());
  });
  assert.equal(dartMaps.length,4);assert.ok(dartMaps.every(width=>width===1024),'Original dartboard color maps must retain their resolution');
  for(const view of ['room','painting','cue','pocket','return','clock','window','window-left','window-right','dartboard','portraits','lamps']){
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
      if(view==='window-left'||view==='window-right'){camera.position.set(view==='window-left'?-.35:.35,1.07,ROOM_FZ-1.9);camera.lookAt(0,.86,ROOM_FZ);}
      if(view==='dartboard'){camera.position.set(-2.25,.65,2.95);camera.lookAt(-2.25,.65,ROOM_FZ-.2);}
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
  const qualityChecks=await page.evaluate(()=>{
    Profile.data.quality='medium';Graphics.apply('medium');
    const available=PostFX.enabled()&&!!PostFX.composer;
    const ratios=[1.5,2].map(ratio=>{
      renderer.setPixelRatio(ratio);PostFX.setSize(800,480);
      return {ratio,width:PostFX.composer.renderTarget1.width,depth:PostFX.bokeh.renderTargetDepth.width,
        bloom:PostFX.bloom.renderTargetBright.width,fxaa:PostFX.fxaa.uniforms.resolution.value.x};
    });
    renderer.setPixelRatio(1);PostFX.setSize(innerWidth,innerHeight);Profile.data.dof='normal';
    PostFX.render();return {available,ratios};
  });
  assert.equal(qualityChecks.available,true,'Switching to medium must create the complete visual pipeline');
  qualityChecks.ratios.forEach(({ratio,width,depth,bloom,fxaa})=>{
    assert.equal(width,800*ratio);assert.equal(depth,width);assert.equal(bloom,width/2);assert.equal(fxaa,1/width);
  });
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result,performanceChecks,qualityChecks,dartMaps,errors,missing},null,2));
}finally{await browser.close();}
