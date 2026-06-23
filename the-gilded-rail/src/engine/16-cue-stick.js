/* The Gilded Rail - CUE STICK
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= CUE STICK ================= */
const cueStick = new THREE.Group();
const cueParts = {};
(function(){
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.0065,0.012,1.18,16),
    new THREE.MeshStandardMaterial({color:0xc89a5e, roughness:0.45}));
  shaft.position.y=-0.62; shaft.castShadow=true;
  const butt=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.0145,0.42,16),
    new THREE.MeshStandardMaterial({color:0x2a1812, roughness:0.5}));
  butt.position.y=-1.42;
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,0.012,16), brassMat); ring.position.y=-1.205;
  cueParts.shaft=shaft; cueParts.butt=butt; cueParts.ring=ring;
  const ferrule=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.0065,0.018,12),
    new THREE.MeshStandardMaterial({color:0xf2ecdc, roughness:0.5})); ferrule.position.y=-0.022;
  const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.0058,0.006,0.009,12),
    new THREE.MeshStandardMaterial({color:0x2c4a73, roughness:0.9})); tip.position.y=-0.009;
  cueStick.add(shaft,butt,ring,ferrule,tip);
  cueStick.visible=false; scene.add(cueStick);
})();
/* ---- flaming cue: additive billboard flames that lick up the shaft ---- */
const _flameTex=(function(){
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const x=cv.getContext('2d');
  const g=x.createRadialGradient(32,40,2, 32,40,30);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(255,230,150,0.9)');
  g.addColorStop(0.65,'rgba(255,120,30,0.5)'); g.addColorStop(1,'rgba(255,60,0,0)');
  x.fillStyle=g; x.beginPath(); x.ellipse(32,38,20,30,0,0,7); x.fill();
  return new THREE.CanvasTexture(cv);
})();
function buildCueFlame(){
  if(cueParts.flame) return cueParts.flame;
  const g=new THREE.Group();
  for(let i=0;i<8;i++){
    const m=new THREE.SpriteMaterial({map:_flameTex, color:0xff7a18, transparent:true,
      blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.7});
    const s=new THREE.Sprite(m);
    const yy=-0.07 - i*0.135;                 // climb the shaft from the tip toward the butt
    s.position.set(0, yy, 0);
    s.scale.set(0.07, 0.12, 1);
    s.userData.base=yy; s.userData.i=i;
    g.add(s);
  }
  g.visible=false; cueStick.add(g); cueParts.flame=g;
  return g;
}
/* per-frame flame flicker (called from the main loop) */
const CueFX={
  update(t){
    const fl=cueParts.flame; if(!fl || !fl.visible || !cueStick.visible) return;
    for(const s of fl.children){
      const i=s.userData.i;
      const f=0.7 + Math.sin(t*9 + i*1.7)*0.3 + (Math.random()-0.5)*0.22;
      s.scale.set(0.055*f + 0.035, 0.13*f + 0.05, 1);
      s.material.opacity = 0.45 + 0.4*Math.abs(Math.sin(t*7 + i*1.3));
      s.position.y = s.userData.base + Math.sin(t*6 + i)*0.006;
    }
  }
};

function placeCueStick(dir, pullback, sx, sy){
  // tip points at the chosen contact spot on the cue ball
  const right=_t1.set(-dir.z,0,dir.x).normalize();
  const contact=new THREE.Vector3().copy(cueBall.pos)
    .addScaledVector(dir,-BALL.R)
    .addScaledVector(right, sx*BALL.R*0.62)
    .addScaledVector(UP,    sy*BALL.R*0.62);
  // the stick body extends along local -Y from the tip; map that onto the
  // BUTT direction (opposite the shot), tilted up so the butt clears the rails
  const buttDir=dir.clone().multiplyScalar(-1);
  buttDir.y=0.12; buttDir.normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0), buttDir);
  cueStick.quaternion.copy(q);
  // group origin (tip end) sits just behind the contact point, pulled back with power
  cueStick.position.copy(contact).addScaledVector(buttDir, 0.012+pullback);
}
