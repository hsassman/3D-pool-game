/* The Gilded Rail - BALLS
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= BALLS ================= */
function ballTexture(num){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const x=cv.getContext('2d');
  const stripe = num>8, color='#'+(BALL_COLORS[num]||0xf7f2e4).toString(16).padStart(6,'0');
  x.fillStyle = (num===0)?'#f7f2e4':(stripe?'#f5f0e0':color); x.fillRect(0,0,512,256);
  if(stripe){ x.fillStyle=color; x.fillRect(0,62,512,132); }
  if(num>0){
    [128,384].forEach(cx=>{
      x.fillStyle='#f5f0e0'; x.beginPath(); x.arc(cx,128,42,0,7); x.fill();
      x.strokeStyle='rgba(0,0,0,.18)'; x.lineWidth=2; x.stroke();
      x.fillStyle='#161310'; x.font='700 52px "Albert Sans", sans-serif'; x.textAlign='center'; x.textBaseline='middle';
      x.fillText(String(num), cx, 131);
    });
  } else { // cue ball: subtle red dot
    x.fillStyle='#c23b2e'; x.beginPath(); x.arc(128,128,7,0,7); x.fill();
  }
  /* faint wear speckle */
  for(let i=0;i<160;i++){ x.fillStyle='rgba(60,40,20,'+(Math.random()*0.05)+')';
    x.fillRect(Math.random()*512, Math.random()*256, 1.4, 1.4); }
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}

const balls=[]; let cueBall=null;
const ballGeo=new THREE.SphereGeometry(BALL.R, 36, 26);
function makeBall(num){
  const mat=new THREE.MeshPhysicalMaterial({map:ballTexture(num), roughness:0.12, metalness:0,
    clearcoat:1, clearcoatRoughness:0.06, reflectivity:0.7, envMapIntensity:1.15});
  const mesh=new THREE.Mesh(ballGeo, mat); mesh.castShadow=true; mesh.receiveShadow=true;
  const shadowDisc=new THREE.Mesh(new THREE.CircleGeometry(BALL.R*1.05, 18),
    new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.28, depthWrite:false}));
  shadowDisc.rotation.x=-Math.PI/2;
  scene.add(mesh); scene.add(shadowDisc);
  const b={ num, type: num===0?'cue':(num===8?'eight':(num<8?'solid':'stripe')),
    pos:new THREE.Vector3(), vel:new THREE.Vector3(), ang:new THREE.Vector3(),
    mesh, shadowDisc, active:true, falling:false, fallPocket:null };
  b._texNum=mat.map;          // numbered skin (8-ball / 9-ball / practice), cached for skin swaps
  balls.push(b); if(num===0) cueBall=b;
  return b;
}

/* solid reds & yellows + black + white cue, no numbers - for English / blackball pool */
function blackballTexture(num){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const x=cv.getContext('2d');
  const col = num===0 ? '#f6f1e4' : num===8 ? '#15130f' : (num<8 ? '#c62828' : '#f3c200');
  x.fillStyle=col; x.fillRect(0,0,512,256);
  /* faint wear speckle so the solid colour isn't flat */
  for(let i=0;i<160;i++){ x.fillStyle='rgba(40,24,10,'+(Math.random()*0.05)+')';
    x.fillRect(Math.random()*512, Math.random()*256, 1.4, 1.4); }
  if(num===0){ x.fillStyle='#c23b2e'; x.beginPath(); x.arc(128,128,7,0,7); x.fill(); }  // cue spot
  const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}
/* swap every ball between 'numbered' and 'blackball' skins (textures cached per ball) */
let _ballSkin='numbered';
function setBallSkin(mode){
  if(mode===_ballSkin) return; _ballSkin=mode;
  for(const b of balls){
    if(mode==='blackball'){ b._texBB = b._texBB || blackballTexture(b.num); b.mesh.material.map=b._texBB; }
    else b.mesh.material.map=b._texNum;
    b.mesh.material.needsUpdate=true;
  }
}
function rackBalls(){
  /* triangle rack at the foot spot: 8 in the middle of row 3, one solid + one stripe
     on the back corners, the rest shuffled - per regulation. */
  const solids=[1,2,3,4,5,6,7].sort(()=>Math.random()-0.5);
  const stripes=[9,10,11,12,13,14,15].sort(()=>Math.random()-0.5);
  const layout=new Array(15).fill(null);
  layout[0]=solids.pop();           // apex (convention: any, often a solid)
  layout[4]=8;                      // row3 middle = index 4 in rows [0|1,2|3,4,5|6..9|10..14]
  layout[10]=solids.pop(); layout[14]=stripes.pop(); // back corners, one of each
  const rest=[...solids,...stripes].sort(()=>Math.random()-0.5);
  for(let i=0;i<15;i++) if(layout[i]===null) layout[i]=rest.pop();
  let idx=0; const gap=BALL.R*2*1.001, rowGap=gap*Math.sqrt(3)/2;
  for(let row=0;row<5;row++) for(let k=0;k<=row;k++){
    const num=layout[idx++];
    const b=balls.find(bb=>bb.num===num);
    b.pos.set(FOOT_SPOT.x+row*rowGap, BALL.R, (k-row/2)*gap);
    b.vel.set(0,0,0); b.ang.set(0,0,0); b.active=true; b.falling=false;
    b.mesh.visible=true; b.mesh.quaternion.set(0,0,0,1);
    b.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
  }
  cueBall.pos.set(-TABLE.W/4-0.18, BALL.R, 0);
  cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
  cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
  cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
}

/* hide every object ball (10–15 etc.) that a non-8-ball mode doesn't use */
function hideObjectBalls(){
  for(const b of balls){ if(b.num===0) continue;
    b.active=false; b.falling=false; b.mesh.visible=false; b.shadowDisc.visible=false; }
}

/* 9-BALL rack: balls 1–9 in a diamond at the foot spot, 1 on the apex (toward
   the breaker), 9 in the centre, the rest shuffled. Balls 10–15 sit out. */
function rack9(){
  hideObjectBalls();
  const others=[2,3,4,5,6,7,8].sort(()=>Math.random()-0.5);
  const slots=new Array(9).fill(null); slots[0]=1; slots[4]=9;   // apex=1, centre=9
  for(let i=0,oi=0;i<9;i++) if(slots[i]===null) slots[i]=others[oi++];
  const gap=BALL.R*2*1.001, rowGap=gap*Math.sqrt(3)/2, rows=[1,2,3,2,1];
  const baseX=FOOT_SPOT.x-2*rowGap;
  let idx=0;
  for(let r=0;r<rows.length;r++) for(let k=0;k<rows[r];k++){
    const num=slots[idx++], b=balls.find(bb=>bb.num===num);
    b.pos.set(baseX+r*rowGap, BALL.R, (k-(rows[r]-1)/2)*gap);
    b.vel.set(0,0,0); b.ang.set(0,0,0); b.active=true; b.falling=false;
    b.mesh.visible=true; b.shadowDisc.visible=true; b.mesh.quaternion.set(0,0,0,1);
    b.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
  }
  cueBall.pos.set(-TABLE.W/4-0.18, BALL.R, 0);
  cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
  cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
  cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
}

/* ============ TRICK-SHOT LAYOUTS (played in Practice) ============
   EASY TO EDIT: each layout lists a cue position and the balls to place.
   Table extents are roughly x∈[-1.1,1.1], z∈[-0.55,0.55] (centre is 0,0). */
const TRICKSHOTS = [
  {id:'line', name:'The Firing Line', desc:'Three reds lined up the spot - run them into the far rail pockets.',
   cue:{x:-0.85,z:0}, balls:[{num:3,x:0.0,z:0},{num:1,x:0.28,z:0},{num:6,x:0.56,z:0}]},
  {id:'wagon', name:'Wagon Wheel', desc:'A fan of balls around the cue - pick your pocket.',
   cue:{x:-0.5,z:0}, balls:[{num:9,x:0.3,z:0.30},{num:2,x:0.45,z:0},{num:11,x:0.3,z:-0.30},{num:4,x:0.6,z:0.15},{num:13,x:0.6,z:-0.15}]},
  {id:'snake', name:'The Long Snake', desc:'Thread the cue past the blockers to sink the 8.',
   cue:{x:-0.95,z:-0.4}, balls:[{num:5,x:-0.2,z:-0.2},{num:10,x:0.2,z:0.1},{num:8,x:0.9,z:0.42}]},
  {id:'gauntlet', name:'The Gauntlet', desc:'A corridor of balls - split it clean and run them home.',
   cue:{x:-0.92,z:0}, balls:[{num:2,x:-0.1,z:0.18},{num:9,x:-0.1,z:-0.18},{num:4,x:0.3,z:0.18},
     {num:12,x:0.3,z:-0.18},{num:8,x:0.7,z:0}]},
  {id:'massecue', name:'The Massé', desc:'Bottom-heavy spin and a steep cue - curve around the blocker.',
   cue:{x:-0.55,z:-0.35}, balls:[{num:7,x:-0.2,z:-0.05},{num:8,x:0.55,z:0.4}]},
  {id:'clockwork', name:'Clockwork', desc:'A ring of balls about the 8 - clear the dial.',
   cue:{x:-0.95,z:0}, balls:[{num:1,x:0.1,z:0},{num:3,x:0.4,z:0.28},{num:11,x:0.4,z:-0.28},
     {num:6,x:0.72,z:0.14},{num:13,x:0.72,z:-0.14},{num:8,x:0.4,z:0}]},
  {id:'bankschool', name:'Bank School', desc:'Nothing straight in - bank the 8 off the long rail.',
   cue:{x:-0.6,z:0.3}, balls:[{num:14,x:-0.1,z:-0.25},{num:8,x:0.55,z:-0.30}]},
];
function applyTrickshot(L){
  hideObjectBalls();
  L.balls.forEach(spec=>{ const b=balls.find(bb=>bb.num===spec.num); if(!b) return;
    b.pos.set(spec.x, BALL.R, spec.z); b.vel.set(0,0,0); b.ang.set(0,0,0);
    b.active=true; b.falling=false; b.mesh.visible=true; b.shadowDisc.visible=true; b.mesh.quaternion.set(0,0,0,1);
  });
  cueBall.pos.set(L.cue.x, BALL.R, L.cue.z); cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
  cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
  cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
}
