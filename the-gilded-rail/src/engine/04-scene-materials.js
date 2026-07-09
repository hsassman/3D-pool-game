/* The Gilded Rail - RENDERER / SCENE
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= RENDERER / SCENE ================= */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.21;   /* eased back so the lit cloth reads warm, not blown-out white; +5% then +10% room brightness */
renderer.physicallyCorrectLights = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x020203, 0.132);   /* deeper black; folds the room smoothly into shadow */

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.01, 60);
camera.position.set(0, 1.7, 2.6);

addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); if(typeof PostFX!=='undefined') PostFX.setSize(innerWidth,innerHeight); });

/* ---- handheld flashlight (Settings → Gameplay → "Flashlight"). A warm PointLight floats
   just ahead of the camera and genuinely lights whatever you look at; the "beam" framing
   is a soft DOM vignette (#flashlight-overlay, concentric rings darkening the edges) - NO
   bright sprite blob in the middle. Inspired by github.com/sickdyd/react-flashlight (a
   radial-gradient overlay). Enabled in Settings, then toggled in game with F. ---- */
const Flashlight = {
  light:null, on:false, _dir:null,
  available(){ return typeof Profile!=='undefined' && Profile.data && !!Profile.data.flashlightEnabled; },
  ensure(){
    if(this.light) return;
    this.light=new THREE.PointLight(0xfff1d4, 0, 7.0, 1.5); this.light.castShadow=false; scene.add(this.light);
    this._dir=new THREE.Vector3();
  },
  _vignette(on){
    if(typeof document!=='undefined' && document.body && document.body.classList)
      document.body.classList.toggle('flashlight-on', !!on);
  },
  set(on){
    this.on=!!on; this.ensure(); this._vignette(this.on && this.available());
    if(typeof Profile!=='undefined'){ Profile.data.flashlight=this.on; if(Profile.save) Profile.save(); }
    if(typeof UI!=='undefined' && UI.sync) UI.sync();
  },
  toggle(){ if(this.available()) this.set(!this.on); },
  update(){
    if(!this.light) return;
    const want = this.on && this.available();
    this.light.intensity += ((want?2.4:0) - this.light.intensity)*0.16;
    if(this.light.intensity<0.002 && !want) return;                      // fully off: skip placing
    camera.getWorldDirection(this._dir);
    this.light.position.copy(camera.position).addScaledVector(this._dir, 0.5).add(new THREE.Vector3(0,-0.04,0));
  }
};

/* ---- lighting: brass billiard lamp over the table ---- */
const flickerLights=[];
scene.add(new THREE.HemisphereLight(0x20242c, 0x080604, 0.30));   /* soft cool/warm ambient fill, dimmed */
const lampPositions = [-0.72, 0, 0.72];
lampPositions.forEach((x,i)=>{
  /* warm tungsten amber (not orange), eased intensity so the felt isn't washed white */
  const s = new THREE.SpotLight(0xffc274, i===1?1.20:0.98, 7, 0.82, 0.62, 1.7);
  s.position.set(x, 1.62, 0); s.target.position.set(x*0.8, 0, 0);
  scene.add(s); scene.add(s.target);
  flickerLights.push(s);
  /* all three lamps cast soft shadows for layered, realistic shadowing */
  s.castShadow=true; s.shadow.mapSize.set(2048,2048); s.shadow.radius=5; s.shadow.blurSamples=16;
  s.shadow.bias=-0.0004; s.shadow.camera.near=0.4; s.shadow.camera.far=5;
});
const amb1 = new THREE.PointLight(0xc9743a, 0.38, 9, 2); amb1.position.set(-3.4, 1.1, -2.2); scene.add(amb1);
const amb2 = new THREE.PointLight(0x3a5cc9, 0.20, 9, 2); amb2.position.set( 3.2, 0.9,  2.4); scene.add(amb2);
flickerLights.push(amb1, amb2);

/* ---- graphics quality (Settings → Graphics) ----
   EASY TO EDIT: tune the three presets. Applied live where possible; pixel ratio,
   shadow on/off and shadow-map resolution all take effect immediately. */
const Graphics = {
  levels:{
    low:    {pr:1,                              shadows:false, map:512},
    medium: {pr:Math.min(devicePixelRatio,1.5), shadows:true,  map:1024},
    high:   {pr:Math.min(devicePixelRatio,2),   shadows:true,  map:2048},
  },
  apply(q){
    q=q||(Profile.data&&Profile.data.quality)||'high';
    const L=this.levels[q]||this.levels.high;
    renderer.setPixelRatio(L.pr);
    renderer.shadowMap.enabled=L.shadows;
    flickerLights.forEach(l=>{ if(l.shadow && l.castShadow){
      l.shadow.mapSize.set(L.map,L.map);
      if(l.shadow.map){ l.shadow.map.dispose(); l.shadow.map=null; }   // force a rebuild at the new size
    }});
    renderer.shadowMap.needsUpdate=true;
    renderer.setSize(innerWidth, innerHeight);
    this.floorTone(q);
  },
  /* In HIGH quality lift the floor + rug base colour so the plank/mat textures
     actually read - still dark, just no longer near-black. Low/medium stay murky. */
  floorTone(q){
    q=q||(Profile.data&&Profile.data.quality)||'high';
    const hi = q==='high';
    /* kept deep so the background falls smoothly into shadow (no bright floor halo) */
    if(typeof floorMat!=='undefined' && floorMat) floorMat.color.setHex(hi?0x1d160e:0x0c0906);
    if(typeof rugMat!=='undefined'  && rugMat)  rugMat.color.setHex(hi?0x331a20:0x160a0e);
  }
};

/* ---- materials helpers ---- */
/* rich felt: dense nap noise + directional brushing; bed variant carries regulation markings */
function makeFeltTexture(felt, markings){
  const Wc=1024, Hc=512;
  const cv=document.createElement('canvas'); cv.width=Wc; cv.height=Hc; const x=cv.getContext('2d');
  x.fillStyle=felt.bed; x.fillRect(0,0,Wc,Hc);
  /* fine nap */
  for(let i=0;i<14000;i++){
    const l=Math.random();
    x.fillStyle = l>0.5 ? 'rgba('+felt.hi+','+(Math.random()*0.05)+')' : 'rgba(0,0,0,'+(Math.random()*0.07)+')';
    x.fillRect(Math.random()*Wc, Math.random()*Hc, 1.3, 1.3);
  }
  /* directional brushing strokes */
  for(let i=0;i<420;i++){
    x.strokeStyle='rgba('+felt.hi+','+(0.012+Math.random()*0.02)+')';
    x.lineWidth=0.7;
    const y=Math.random()*Hc, x0=Math.random()*Wc, len=30+Math.random()*90;
    x.beginPath(); x.moveTo(x0,y); x.lineTo(x0+len, y+(Math.random()-0.5)*4); x.stroke();
  }
  /* soft lamp-side vignette */
  const vg=x.createRadialGradient(Wc/2,Hc/2,Hc*0.35,Wc/2,Hc/2,Hc*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.22)');
  x.fillStyle=vg; x.fillRect(0,0,Wc,Hc);
  if(markings){
    /* regulation cloth markings: head string across the kitchen, head/centre/foot spots */
    const bw=TABLE.W+0.20, bh=TABLE.H+0.20;
    const u=v=>((v+bw/2)/bw)*Wc;
    const headU=u(-TABLE.W/4), spotR=5;
    x.strokeStyle='rgba(238,228,205,0.30)'; x.lineWidth=3;
    x.beginPath(); x.moveTo(headU, Hc*0.052); x.lineTo(headU, Hc*0.948); x.stroke();
    [[-TABLE.W/4],[0],[TABLE.W/4]].forEach(([sx])=>{
      x.fillStyle='rgba(238,228,205,0.42)';
      x.beginPath(); x.arc(u(sx), Hc/2, spotR, 0, 7); x.fill();
    });
  }
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.encoding=THREE.sRGBEncoding;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return t;
}
/* procedural environment for reflections: the three warm hanging lamps overhead,
   dark wood-toned walls around, a hint of green felt below. Higher res so the glints
   on the polished balls and chrome read crisply. */
const envMap=(function(){
  const S=256;
  const face=(top,mid,bot)=>{
    const cv=document.createElement('canvas'); cv.width=cv.height=S; const x=cv.getContext('2d');
    const g=x.createLinearGradient(0,0,0,S);
    g.addColorStop(0,top); g.addColorStop(0.55,mid); g.addColorStop(1,bot);
    x.fillStyle=g; x.fillRect(0,0,S,S);
    return cv;
  };
  const side=()=>face('#4a3826','#16110c','#070605');
  /* +y : the three lamps as distinct bright pools so balls catch three real glints */
  const lamp=(function(){
    const cv=document.createElement('canvas'); cv.width=cv.height=S; const x=cv.getContext('2d');
    x.fillStyle='#241a10'; x.fillRect(0,0,S,S);
    [0.30,0.5,0.70].forEach(fx=>{
      const cx=fx*S, cy=S*0.5, r=S*0.20;
      const g=x.createRadialGradient(cx,cy,1,cx,cy,r);
      g.addColorStop(0,'#fffaf0'); g.addColorStop(0.35,'#ffe6bc'); g.addColorStop(1,'rgba(40,30,18,0)');
      x.fillStyle=g; x.fillRect(cx-r,cy-r,2*r,2*r);
    });
    return cv;
  })();
  /* -y : near-black floor with a faint warm reflection */
  const floor=face('#0d0a07','#080605','#050404');
  /* the felt glows up a touch onto the underside of the balls */
  const cube=new THREE.CubeTexture([side(),side(), lamp, floor, side(),side()]);
  cube.encoding=THREE.sRGBEncoding;
  cube.needsUpdate=true;
  return cube;
})();
/* image-based lighting: every PBR surface reflects the room */
scene.environment = envMap;

/* a soft round sprite for point particles (dust motes) so they aren't square */
const roundParticleTex=(function(){
  const cv=document.createElement('canvas'); cv.width=cv.height=32; const x=cv.getContext('2d');
  const g=x.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.5,'rgba(255,255,255,0.6)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(cv);
})();
const feltMat = new THREE.MeshStandardMaterial({color:0x0f5036, roughness:0.97, metalness:0});
const feltCushMat = new THREE.MeshStandardMaterial({color:0x0f5036, roughness:0.96});
const bedTopMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.97, metalness:0});
const chromeMat = new THREE.MeshStandardMaterial({color:0xc2c8d0, roughness:0.16, metalness:1.0,
  envMap:envMap, envMapIntensity:1.6});
const steelMat = new THREE.MeshStandardMaterial({color:0x565b63, roughness:0.28, metalness:1.0,
  envMap:envMap, envMapIntensity:1.1});
/* Rich warm walnut: deep base, broad plank figure, long continuous grain lines and
   fine pores. The RAIL finishes tint this with woodMat.color. */
const woodTex = (function(){
  const Wd=2048, Hd=512;
  const cv=document.createElement('canvas'); cv.width=Wd; cv.height=Hd; const x=cv.getContext('2d');
  const g=x.createLinearGradient(0,0,Wd,0);
  g.addColorStop(0,'#3c2517'); g.addColorStop(0.25,'#462c1a'); g.addColorStop(0.5,'#503321');
  g.addColorStop(0.75,'#452a18'); g.addColorStop(1,'#3a2415');
  x.fillStyle=g; x.fillRect(0,0,Wd,Hd);
  // broad tonal bands (plank figure)
  for(let yy=0; yy<Hd; yy++){
    const v = Math.sin(yy*0.045)*0.5 + Math.sin(yy*0.013+1.7)*0.5;
    x.fillStyle = v>0 ? 'rgba(255,205,150,'+(v*0.05)+')' : 'rgba(15,8,4,'+(-v*0.07)+')';
    x.fillRect(0,yy,Wd,1);
  }
  // long continuous grain lines (smooth summed sines)
  for(let i=0;i<110;i++){
    const y0=Math.random()*Hd, amp1=1.2+Math.random()*2.6, amp2=0.5+Math.random()*1.2;
    const f1=0.004+Math.random()*0.004, f2=0.013+Math.random()*0.01;
    const p1=Math.random()*6.28, p2=Math.random()*6.28;
    const dark=Math.random()<0.75;
    x.strokeStyle=dark?'rgba(22,11,5,'+(0.10+Math.random()*0.16)+')'
                      :'rgba(230,185,135,'+(0.05+Math.random()*0.07)+')';
    x.lineWidth=dark?(0.7+Math.random()*1.4):0.6;
    x.beginPath();
    for(let xx=0; xx<=Wd; xx+=2){
      const y=y0 + Math.sin(xx*f1+p1)*amp1 + Math.sin(xx*f2+p2)*amp2;
      xx===0 ? x.moveTo(xx,y) : x.lineTo(xx,y);
    }
    x.stroke();
  }
  // fine pore streaks for close-range detail
  for(let i=0;i<1800;i++){
    const px=Math.random()*Wd, py=Math.random()*Hd, len=4+Math.random()*18;
    x.fillStyle='rgba(18,9,4,'+(0.04+Math.random()*0.06)+')';
    x.fillRect(px,py,len,0.8);
  }
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  t.minFilter=THREE.LinearMipmapLinearFilter;
  return t; })();
const woodMat  = new THREE.MeshStandardMaterial({color:0x6b4226, map:woodTex, roughness:0.4, metalness:0.12});
const brassMat = new THREE.MeshStandardMaterial({color:0xc9a35c, roughness:0.24, metalness:0.95, envMap:envMap, envMapIntensity:1.15});
const darkMat  = new THREE.MeshStandardMaterial({color:0x0c0c10, roughness:0.85});
const leatherMat = new THREE.MeshStandardMaterial({color:0x17110c, roughness:0.7});

/* hardwood plank floor - varied tone per plank, fine grain, seams */
function makePlankTexture(){
  const Wc=1024, Hc=1024, cv=document.createElement('canvas');
  cv.width=Wc; cv.height=Hc; const x=cv.getContext('2d');
  x.fillStyle='#1a140e'; x.fillRect(0,0,Wc,Hc);
  const ph=64;
  for(let r=0; r<Hc/ph; r++){
    let xx = (r%2)*-180;
    while(xx<Wc){
      const pw=260+Math.random()*240;
      const tone=0.8+Math.random()*0.45;
      x.fillStyle='rgb('+(34*tone|0)+','+(25*tone|0)+','+(17*tone|0)+')';
      x.fillRect(xx, r*ph, pw-3, ph-2);
      for(let i=0;i<14;i++){
        x.strokeStyle='rgba(12,8,4,'+(0.1+Math.random()*0.16)+')'; x.lineWidth=0.8;
        const gy=r*ph+Math.random()*ph;
        x.beginPath(); x.moveTo(xx,gy);
        for(let gx=xx; gx<xx+pw; gx+=24) x.lineTo(gx, gy+Math.sin(gx*0.02+i)*1.5);
        x.stroke();
      }
      x.fillStyle='rgba(0,0,0,0.55)'; x.fillRect(xx+pw-3, r*ph, 3, ph);
      xx+=pw;
    }
    x.fillStyle='rgba(0,0,0,0.5)'; x.fillRect(0, r*ph+ph-2, Wc, 2);
  }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(7,7); t.encoding=THREE.sRGBEncoding;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return t;
}
/* burgundy rug with a woven border */
function makeRugTexture(){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=512; const x=cv.getContext('2d');
  x.fillStyle='#2a1419'; x.fillRect(0,0,512,512);
  for(let i=0;i<9000;i++){ x.fillStyle='rgba('+(Math.random()<0.5?'60,28,34':'14,6,8')+','+(Math.random()*0.35)+')';
    x.fillRect(Math.random()*512,Math.random()*512,1.4,1.4); }
  x.strokeStyle='rgba(201,163,92,0.5)'; x.lineWidth=5; x.strokeRect(16,16,480,480);
  x.strokeStyle='rgba(201,163,92,0.28)'; x.lineWidth=2; x.strokeRect(30,30,452,452);
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t;
}
/* Pocket net: thin twine strands woven into a diamond mesh with OPEN holes, so the
   material reads as real netting (you see the dark throat through the gaps) rather
   than a printed panel. Returns {tex, bump} - tex carries the strand + alpha, bump
   gives the strands a bit of round relief. */
function makeNetTexture(){
  const Sz=256, step=38, lw=5.2;
  const cv=document.createElement('canvas'); cv.width=cv.height=Sz; const x=cv.getContext('2d');
  const bv=document.createElement('canvas'); bv.width=bv.height=Sz; const b=bv.getContext('2d');
  b.fillStyle='#000'; b.fillRect(0,0,Sz,Sz);                       // bump base = flat (recessed)
  x.clearRect(0,0,Sz,Sz);                                         // colour base = transparent holes
  x.lineCap=b.lineCap='round';
  const diag=(ctx,style,w)=>{ ctx.strokeStyle=style; ctx.lineWidth=w;
    for(let i=-9;i<18;i++){
      ctx.beginPath(); ctx.moveTo(i*step,0); ctx.lineTo(i*step+Sz,Sz); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i*step,0); ctx.lineTo(i*step-Sz,Sz); ctx.stroke();
    }
  };
  /* twine: a darker core with a lighter highlight gives each strand some roundness */
  diag(x,'rgba(196,186,162,1)', lw);
  diag(x,'rgba(238,230,210,1)', lw*0.5);
  diag(b,'#fff', lw);                                             // strands raised in the bump map
  /* knots where strands cross */
  x.fillStyle='rgba(246,240,224,1)'; b.fillStyle='#fff';
  for(let gy=0; gy<=Sz; gy+=step){ for(let gx=((gy/step)%2)*step/2; gx<=Sz; gx+=step){
    x.beginPath(); x.arc(gx,gy,2.4,0,7); x.fill();
    b.beginPath(); b.arc(gx,gy,2.4,0,7); b.fill();
  }}
  const mk=c=>{ const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(6,2); return t; };
  const tex=mk(cv); tex.encoding=THREE.sRGBEncoding;
  return { tex, bump:mk(bv) };
}
