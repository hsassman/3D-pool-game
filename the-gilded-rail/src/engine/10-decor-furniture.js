/* The Gilded Rail - LOUNGE FURNITURE HELPERS
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= LOUNGE FURNITURE HELPERS ================= */
/* tooled-leather upholstery: grain speckle + faint creases, for the padded stools */
function makeLeatherTexture(){
  const cv=document.createElement('canvas'); cv.width=256; cv.height=256; const x=cv.getContext('2d');
  x.fillStyle='#33231a'; x.fillRect(0,0,256,256);
  for(let i=0;i<9000;i++){ const a=Math.random()*0.06;
    x.fillStyle=(Math.random()<0.5?'rgba(255,232,205,':'rgba(0,0,0,')+a+')';
    x.fillRect(Math.random()*256, Math.random()*256, 1.6, 1.6); }
  for(let i=0;i<46;i++){ x.strokeStyle='rgba(0,0,0,0.05)'; const y=Math.random()*256;
    x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(64,y+(Math.random()-0.5)*22,192,y+(Math.random()-0.5)*22,256,y); x.stroke(); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,2); return t;
}
const leatherTex = makeLeatherTexture();
const cushionMat = new THREE.MeshStandardMaterial({color:0x6a4630, map:leatherTex, roughness:0.55, metalness:0.05, envMap:envMap, envMapIntensity:0.3});

/* yaw applied to the supplied bar-stool model so its front (the side you sit facing)
   points +z, matching the old procedural stool - existing placements/rotations then
   keep working unchanged. */
const STOOL_YAW = 0;
/* a bar stool: the supplied model (normalised to the same height + facing as the old
   procedural stool), falling back to a chrome-pedestal leather stool when the model
   is unavailable (headless / offline). */
function makeStool(){
  if(typeof Models!=='undefined' && Models.has('stool')){
    const g=new THREE.Group();
    Models.place('stool', g, 0, 0, 0, 1.15, {yaw:STOOL_YAW});   /* base rests at y=0, centred in x/z */
    return g;
  }
  return makeStoolProc();
}
/* a bar stool on a chrome pedestal - a thick, plump rounded leather cushion (a
   flattened dome, like the padded back), with a low padded back */
function makeStoolProc(){
  const ch=new THREE.Group();
  const cbase=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.155,0.02,20), chromeMat); cbase.position.y=0.01; ch.add(cbase);
  const post =new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.024,0.70,12), chromeMat); post.position.y=0.36; ch.add(post);
  const ring =new THREE.Mesh(new THREE.TorusGeometry(0.13,0.008,10,24), chromeMat); ring.rotation.x=Math.PI/2; ring.position.y=0.28; ch.add(ring);
  /* the seat: a thick plump cushion - a flattened sphere, domed on top and rounded all
     round (same construction as the padded back), so it reads as a full seat to sit on */
  const seat=new THREE.Mesh(new THREE.SphereGeometry(0.172,28,20), cushionMat);
  seat.scale.set(1.0,0.55,1.0); seat.position.y=0.80; seat.castShadow=true; seat.receiveShadow=true; ch.add(seat);
  /* a small plate tucking the cushion onto the pedestal */
  const seatBase=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.10,0.03,20), chromeMat); seatBase.position.y=0.715; ch.add(seatBase);
  /* low padded back */
  const back=new THREE.Mesh(new THREE.SphereGeometry(0.150,16,12), cushionMat);
  back.scale.set(1.0,0.80,0.20); back.position.set(0,1.03,-0.158); back.rotation.x=-0.12; back.castShadow=true; ch.add(back);
  const bpost=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.26,8), chromeMat); bpost.position.set(0,0.915,-0.152); ch.add(bpost);
  return ch;
}
const barGlassMat=new THREE.MeshPhysicalMaterial({color:0xffffff, transparent:true, opacity:0.16,
  roughness:0.05, metalness:0, envMap:envMap, envMapIntensity:0.6, side:THREE.DoubleSide});
/* a proper rocks tumbler: straight tapered wall, heavy glass base */
function makeGlass(withWhisky, ice){
  const g=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.0265,0.072,14,1,true), barGlassMat);
  wall.position.y=0.040; g.add(wall);
  const heavyBase=new THREE.Mesh(new THREE.CylinderGeometry(0.0265,0.028,0.014,14), barGlassMat);
  heavyBase.position.y=0.007; g.add(heavyBase);
  if(withWhisky){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.0245,0.023,0.024,14),
      new THREE.MeshStandardMaterial({color:0xb05f17, transparent:true, opacity:0.85,
        roughness:0.15, emissive:0x44210a, emissiveIntensity:0.4}));
    w.position.y=0.026; g.add(w);
  }
  if(ice){   /* three rounded-edge ice blocks resting in the spirit */
    const iceMat=new THREE.MeshPhysicalMaterial({color:0xeaf2ff, transparent:true, opacity:0.55,
      roughness:0.12, metalness:0, envMap:envMap, envMapIntensity:0.9, clearcoat:1, clearcoatRoughness:0.08});
    [[0.006,0.032,0.004,0.5],[-0.007,0.039,-0.003,1.2],[0.003,0.045,-0.008,-0.7]].forEach(([x,y,z,r])=>{
      const cube=new THREE.Mesh(new THREE.BoxGeometry(0.013,0.012,0.013), iceMat);
      cube.position.set(x,y,z); cube.rotation.set(r*0.4,r,r*0.3); g.add(cube);
    });
  }
  return g;
}
/* a cut-crystal whisky decanter: a single smooth lathed body (rounded base →
   belly → sloping shoulder → narrow neck → flared lip), amber spirit inside, and a
   faceted diamond stopper. High-segment lathe for clean glass. */
function makeDecanter(){
  const g=new THREE.Group();
  const P=(r,y)=>new THREE.Vector2(r,y);
  const body=new THREE.Mesh(new THREE.LatheGeometry([
    P(0.000,0.000),P(0.036,0.000),P(0.050,0.012),P(0.055,0.034),P(0.054,0.064),
    P(0.046,0.092),P(0.032,0.112),P(0.020,0.124),P(0.015,0.140),P(0.014,0.156),
    P(0.018,0.166),P(0.015,0.170),P(0.000,0.170)
  ], 40), barGlassMat);
  body.castShadow=true; body.receiveShadow=true; g.add(body);
  const liq=new THREE.Mesh(new THREE.LatheGeometry([
    P(0.000,0.006),P(0.046,0.008),P(0.052,0.034),P(0.050,0.064),P(0.043,0.090),P(0.030,0.108),P(0.000,0.110)
  ], 40), new THREE.MeshStandardMaterial({color:0xa3540f, transparent:true, opacity:0.86,
    roughness:0.12, emissive:0x3c1d08, emissiveIntensity:0.45}));
  g.add(liq);
  /* rounded ball stopper, seated in the neck mouth */
  const stopMat=new THREE.MeshPhysicalMaterial({color:0xffffff, transparent:true, opacity:0.34,
    roughness:0.04, metalness:0, envMap:envMap, envMapIntensity:1.0, clearcoat:1, clearcoatRoughness:0.05, side:THREE.DoubleSide});
  const plug=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.016,16), stopMat);
  plug.position.y=0.172; g.add(plug);                          /* short peg into the mouth */
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.019,20,16), stopMat);
  knob.position.y=0.190; knob.scale.y=0.92; knob.castShadow=true; g.add(knob);
  return g;
}
/* seeded RNG: the bar's bottle collection is "random" but identical every visit */
function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15, 1|seed); t=t+Math.imul(t^t>>>7, 61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

/* five real bottle archetypes, straight off the reference shelf:
   square Tennessee, round Scotch, tall bourbon, flattened blend flask, wine */
function makeBottle(rnd){
  const g=new THREE.Group();
  const kind=(rnd()*5)|0;
  const labelCols=[0xe8e0cc,0x141414,0x5a1620,0xe8e0cc];
  const lblMat=c=>new THREE.MeshStandardMaterial({color:c, roughness:0.85});
  const glassM=(c,o)=>new THREE.MeshPhysicalMaterial({color:c, transparent:true, opacity:o,
    roughness:0.10, metalness:0, envMap:envMap, envMapIntensity:0.5});
  const capM=c=>new THREE.MeshStandardMaterial({color:c, roughness:0.35, metalness:0.5});
  if(kind===0){            /* square Tennessee: dark glass, square shoulders, tall neck, black cap */
    const m=glassM(0x171310,0.95);
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.066,0.185,0.066), m);
    body.position.y=0.0925; g.add(body);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.0455,0.045,4), m);
    sh.rotation.y=Math.PI/4; sh.position.y=0.2075; g.add(sh);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.072,8), m);
    neck.position.y=0.262; g.add(neck);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.022,8), capM(0x101012));
    cap.position.y=0.30; g.add(cap);
    const lbl=new THREE.Mesh(new THREE.BoxGeometry(0.058,0.075,0.002), lblMat(0x141414));
    lbl.position.set(0,0.10,0.0345); g.add(lbl);
    const lbl2=new THREE.Mesh(new THREE.BoxGeometry(0.042,0.05,0.001), lblMat(0xe8e0cc));
    lbl2.position.set(0,0.10,0.0358); g.add(lbl2);
  } else if(kind===1){     /* round Scotch: amber, sloping shoulder, mid neck, red or gold cap */
    const m=glassM(0x7a420e,0.85);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.040,0.040,0.185,14), m);
    body.position.y=0.0925; g.add(body);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.0385,0.058,14), m);
    sh.position.y=0.214; g.add(sh);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.05,8), m);
    neck.position.y=0.268; g.add(neck);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.020,8), capM(rnd()<0.5?0x86131f:0x9a7a2a));
    cap.position.y=0.30; g.add(cap);
    const lbl=new THREE.Mesh(new THREE.CylinderGeometry(0.0408,0.0408,0.075,14,1,true,-0.72,1.44),
      lblMat(labelCols[(rnd()*labelCols.length)|0]));
    lbl.position.y=0.105; g.add(lbl);
  } else if(kind===2){     /* tall bourbon: straight body, short neck, foil capsule */
    const m=glassM(0x8a5212,0.82);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.0345,0.0345,0.225,14), m);
    body.position.y=0.1125; g.add(body);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.033,0.035,14), m);
    sh.position.y=0.2425; g.add(sh);
    const foil=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.055,8), capM(rnd()<0.5?0x86131f:0x2a2a30));
    foil.position.y=0.285; g.add(foil);
    const lbl=new THREE.Mesh(new THREE.CylinderGeometry(0.0353,0.0353,0.09,14,1,true,-0.72,1.44), lblMat(0xe8e0cc));
    lbl.position.y=0.12; g.add(lbl);
  } else if(kind===3){     /* flattened blend flask */
    const m=glassM(0x6e4a16,0.85);
    const inner=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.047,0.047,0.180,16), m);
    body.position.y=0.090; inner.add(body);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.045,0.05,16), m);
    sh.position.y=0.205; inner.add(sh);
    inner.scale.z=0.52; g.add(inner);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.045,8), m);
    neck.position.y=0.252; g.add(neck);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.018,8), capM(0x9a7a2a));
    cap.position.y=0.283; g.add(cap);
    const lbl=new THREE.Mesh(new THREE.BoxGeometry(0.062,0.085,0.002), lblMat(0xe8e0cc));
    lbl.position.set(0,0.095,0.0255); g.add(lbl);
  } else {                 /* wine: slim dark green, long sloping shoulder + long neck */
    const m=glassM(0x16301c,0.9);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.0335,0.0335,0.21,14), m);
    body.position.y=0.105; g.add(body);
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.0105,0.032,0.075,14), m);
    sh.position.y=0.2475; g.add(sh);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.0105,0.0105,0.058,8), m);
    neck.position.y=0.314; g.add(neck);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.0115,0.0115,0.025,8), capM(0x5a1620));
    cap.position.y=0.345; g.add(cap);
    const lbl=new THREE.Mesh(new THREE.CylinderGeometry(0.0343,0.0343,0.07,14,1,true,-0.72,1.44), lblMat(0xe8e0cc));
    lbl.position.y=0.115; g.add(lbl);
  }
  return g;
}

/* ---------------- CANDLES (flame sprite + warm glow) ---------------- */
const Candles = {
  list:[], _tex:null,
  flameTexture(){
    if(this._tex) return this._tex;
    const cv=document.createElement('canvas'); cv.width=64; cv.height=96; const x=cv.getContext('2d');
    const g=x.createRadialGradient(32,64,1,32,58,40);
    g.addColorStop(0,'rgba(255,250,220,1)'); g.addColorStop(0.3,'rgba(255,200,90,0.9)');
    g.addColorStop(0.65,'rgba(240,120,30,0.35)'); g.addColorStop(1,'rgba(120,40,10,0)');
    x.fillStyle=g;
    x.beginPath(); x.ellipse(32,56,18,38,0,0,7); x.fill();   /* teardrop-ish flame */
    this._tex=new THREE.CanvasTexture(cv); return this._tex;
  },
  update(t){
    for(const c of this.list){
      const fl=0.86 + Math.sin(t*12+c.seed)*0.10 + Math.sin(t*7.3+c.seed*2)*0.06;
      c.flame.scale.set(c.sx*(0.95+fl*0.1), c.sy*fl, 1);
      c.flame.material.opacity=0.82+0.18*Math.sin(t*9+c.seed);
      if(c.light) c.light.intensity=c.baseI*(0.82+0.3*fl);
    }
  }
};
function makeCandle(scale){
  scale=scale||1; const S=v=>v*scale;
  const g=new THREE.Group();
  /* brass holder + cream wax pillar. Same width/design as before, but the pillar is
     ~40% shorter (height only) so it sits low on the table. */
  const dish=new THREE.Mesh(new THREE.CylinderGeometry(S(0.026),S(0.030),S(0.008),20), brassMat);
  dish.position.y=S(0.004); dish.castShadow=true; g.add(dish);
  const waxH=0.042;                                  /* was 0.07 */
  const waxTop=0.008+waxH;
  const wax=new THREE.Mesh(new THREE.CylinderGeometry(S(0.017),S(0.019),S(waxH),20),
    new THREE.MeshStandardMaterial({color:0xeee4cf, roughness:0.55, emissive:0x4a3414, emissiveIntensity:0.18}));
  wax.position.y=S(0.008+waxH/2); wax.castShadow=true; g.add(wax);
  const wick=new THREE.Mesh(new THREE.CylinderGeometry(S(0.0008),S(0.0008),S(0.01),6),
    new THREE.MeshStandardMaterial({color:0x141414, roughness:1}));
  wick.position.y=S(waxTop+0.004); g.add(wick);
  /* flame (kept its width; a hair shorter to suit the lower pillar) */
  const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:Candles.flameTexture(), color:0xffd27a,
    transparent:true, opacity:0.95, depthWrite:false, blending:THREE.AdditiveBlending}));
  flame.scale.set(S(0.020), S(0.044), 1); flame.position.y=S(waxTop+0.022); g.add(flame);
  /* warm pool of light */
  const light=new THREE.PointLight(0xffb45a, 0.7, 1.6, 2); light.position.y=S(waxTop+0.03); g.add(light);
  Candles.list.push({flame, sx:S(0.020), sy:S(0.044), light, baseI:0.7, seed:Math.random()*10});
  return g;
}
