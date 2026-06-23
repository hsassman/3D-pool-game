/* The Gilded Rail - AIM GUIDE
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= AIM GUIDE ================= */
const aimGroup=new THREE.Group(); scene.add(aimGroup);
const aimLineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const aimLine=new THREE.Line(aimLineGeo, new THREE.LineDashedMaterial({color:0xe8c987, dashSize:0.035, gapSize:0.022, transparent:true, opacity:0.9}));
const objLineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const objLine=new THREE.Line(objLineGeo, new THREE.LineBasicMaterial({color:0xf2ecdc, transparent:true, opacity:0.85}));
const defLineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const defLine=new THREE.Line(defLineGeo, new THREE.LineBasicMaterial({color:0x7fd4bb, transparent:true, opacity:0.5}));
const ghostRing=new THREE.Mesh(new THREE.RingGeometry(BALL.R*0.82,BALL.R,28),
  new THREE.MeshBasicMaterial({color:0xe8c987, transparent:true, opacity:0.85, side:THREE.DoubleSide}));
ghostRing.rotation.x=-Math.PI/2;
aimGroup.add(aimLine,objLine,defLine,ghostRing);
aimGroup.visible=false;

function raySphere(o, d, c, r){
  const ox=o.x-c.x, oz=o.z-c.z;
  const b=ox*d.x+oz*d.z, cc=ox*ox+oz*oz-r*r;
  const disc=b*b-cc; if(disc<0) return Infinity;
  const t=-b-Math.sqrt(disc); return t>0.0005?t:Infinity;
}
function updateAimGuide(dir, mode){
  mode=mode||'full';
  const o=cueBall.pos;
  let tMin=3.4, hit=null;
  for(const b of balls){
    if(!b.active||b.falling||b.num===0) continue;
    const t=raySphere(o,dir,b.pos,BALL.R*2);
    if(t<tMin){ tMin=t; hit=b; }
  }
  // cushion limit
  const lim=(v,bound,dv)=> dv>1e-6?((bound-v)/dv):(dv<-1e-6?((-bound-v)/dv):Infinity);
  const tc=Math.min(lim(o.x,W2-BALL.R,dir.x), lim(o.z,H2-BALL.R,dir.z));
  if(tc>0 && tc<tMin){ tMin=tc; hit=null; }
  const end=o.clone().addScaledVector(dir,tMin);
  aimLine.geometry.setFromPoints([o.clone().setY(BALL.R*0.6), end.clone().setY(BALL.R*0.6)]);
  aimLine.computeLineDistances();
  /* 'cue' mode shows only the cue line + the contact ghost - no post-contact
     prediction (the object & deflection lines), for a cleaner / harder game */
  if(mode==='cue'){
    ghostRing.visible=true; ghostRing.position.set(end.x,0.002,end.z);
    objLine.visible=false; defLine.visible=false; return;
  }
  if(hit){
    ghostRing.visible=true; ghostRing.position.set(end.x, 0.002, end.z);
    const od=hit.pos.clone().sub(end).setY(0).normalize();
    objLine.visible=true;
    objLine.geometry.setFromPoints([hit.pos.clone().setY(BALL.R*0.6), hit.pos.clone().addScaledVector(od,0.42).setY(BALL.R*0.6)]);
    const dot=dir.dot(od);
    const tang=dir.clone().sub(od.clone().multiplyScalar(dot));
    if(tang.lengthSq()>1e-6){
      tang.normalize();
      defLine.visible=true;
      defLine.geometry.setFromPoints([end.clone().setY(BALL.R*0.6), end.clone().addScaledVector(tang,0.3*(1-Math.abs(dot))+0.05).setY(BALL.R*0.6)]);
    } else defLine.visible=false;
  } else {
    ghostRing.visible=true; ghostRing.position.set(end.x,0.002,end.z);
    objLine.visible=false; defLine.visible=false;
  }
}

/* strike: convert power + spin offsets into velocity & angular velocity.
   JUMP/SCOOP: striking at the very bottom of the cue ball (sy near its lowest, an
   elevated-cue motion) pops the ball into the air so it can hop a blocking ball.
   It engages only at the extreme low contact, so ordinary draw still works. */
function strikeCueBall(dir, power, sx, sy){
  const speed=Math.max(0.45, power*MAX_BREAK_SPEED);
  const jump = Math.max(0, (-sy)-0.60)/0.15;            // 0 above sy=-0.60 → 1 at sy=-0.75
  const fwd  = 1 - jump*0.32;                            // some pace bleeds into the hop
  cueBall.vel.set(dir.x*speed*fwd, jump*(0.55+power*1.25), dir.z*speed*fwd);  // upward launch
  // follow/draw about the lateral axis (cross(UP,dir)); ω_roll = cross(UP,v)/R
  const lat=new THREE.Vector3().crossVectors(UP,dir);
  cueBall.ang.copy(lat).multiplyScalar((speed/BALL.R)*sy*1.3*(1-jump*0.7));   // less backspin when scooping
  // side english about the vertical axis
  cueBall.ang.y = -sx*(speed/BALL.R)*1.0;
  Sfx.play('cue', Math.min(1,power+0.2));
}
