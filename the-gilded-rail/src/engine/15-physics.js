/* The Gilded Rail - PHYSICS
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= PHYSICS ================= */
const shotEvents = { firstContact:null, potted:[], cueScratch:false, cushionAfterContact:false,
                     anyCushion:0, breakShot:false, reset(brk){ this.firstContact=null; this.potted=[];
                     this.cueScratch=false; this.cushionAfterContact=false; this.anyCushion=0; this.breakShot=!!brk; } };

const _u=new THREE.Vector3(), _a=new THREE.Vector3(), _n=new THREE.Vector3(), _t1=new THREE.Vector3();
/* outer edge of the timber rail - past this a flying ball has cleared the table */
const TABLE_X = W2+TABLE.CUSH_D+TABLE.RAIL, TABLE_Z = H2+TABLE.CUSH_D+TABLE.RAIL;

function stepBall(b, dt){
  if(!b.active) return;
  // ---- off the table: a jumped CUE ball that clears the rail tumbles to the floor
  //      and is lost (a scratch). Only the cue ball may leave - object balls stay. ----
  if(b.offTable){
    b.vel.y -= PHYS.g*dt*1.3;
    b.pos.x += b.vel.x*dt; b.pos.z += b.vel.z*dt; b.pos.y += b.vel.y*dt;
    if(b.pos.y < -1.0){ b.active=false; b.falling=false; b.mesh.visible=false; b.shadowDisc.visible=false; }
    return;
  }
  // ---- airborne (jump shot): pure ballistic flight + ground bounce ----
  if(b.pos.y > BALL.R+1e-4 || b.vel.y > 1e-4){
    if(!b.falling){
      b.vel.y -= PHYS.g*dt;
      b.pos.x += b.vel.x*dt; b.pos.z += b.vel.z*dt; b.pos.y += b.vel.y*dt;
      // the cue ball can clear the rail and fly off → scratch
      if(b.num===0 && (Math.abs(b.pos.x)>TABLE_X || Math.abs(b.pos.z)>TABLE_Z)){
        b.offTable=true; shotEvents.potted.push(b); shotEvents.cueScratch=true;
        Sfx.play('cushion', 0.45);
        if(typeof Haptics!=='undefined') Haptics.buzz([0,30,40,30]);
        return;
      }
      if(b.pos.y <= BALL.R){                      // landed back on the cloth
        b.pos.y = BALL.R;
        if(b.vel.y < -0.2){
          const land=Math.abs(b.vel.y);
          b.vel.y *= -PHYS.eGround;
          b.vel.x *= 0.80; b.vel.z *= 0.80;       // landing scrub → settles into a roll
          if(land>0.5) Sfx.play('cushion', Math.min(0.4, land*0.12));
        } else b.vel.y = 0;
      }
      // object balls stay on the table while airborne (they can't be knocked off)
      if(b.num!==0){
        if(Math.abs(b.pos.x)>W2+0.10){ b.pos.x=Math.sign(b.pos.x)*(W2+0.10); b.vel.x*=-0.4; }
        if(Math.abs(b.pos.z)>H2+0.10){ b.pos.z=Math.sign(b.pos.z)*(H2+0.10); b.vel.z*=-0.4; }
      }
      return;                                     // skip cushions/pockets while in the air
    }
  }
  if(b.falling){ // pocket drop animation
    b.vel.multiplyScalar(0.9);
    b.pos.add(_t1.copy(b.fallPocket.pos).setY(b.pos.y).sub(b.pos).multiplyScalar(Math.min(1,10*dt)));
    b.vel.y -= PHYS.g*dt*1.6; b.pos.y += b.vel.y*dt;
    if(b.pos.y < -0.13){
      b.active=false; b.falling=false; b.mesh.visible=false; b.shadowDisc.visible=false;
      Trough.add(b);                       // object balls roll out to the return rail
    }
    return;
  }
  // slip velocity of the contact point: u = v + ω × (0,-R,0)
  _u.set(b.vel.x + b.ang.z*BALL.R, 0, b.vel.z - b.ang.x*BALL.R);
  const slip=_u.length();
  if(slip > 0.015){
    // sliding: kinetic friction decelerates slip and torques the ball.
    // a = -μg·û ;  Δω = (r×a)·m/I·dt with r=(0,-R,0), I=2/5·m·R²
    //   → Δω_x = -(5/2R)·a_z·dt ,  Δω_z = +(5/2R)·a_x·dt
    _a.copy(_u).multiplyScalar(-PHYS.muSlide*PHYS.g/slip);
    b.vel.x += _a.x*dt; b.vel.z += _a.z*dt;
    const k = 5/(2*BALL.R);
    b.ang.x += -k*_a.z*dt;
    b.ang.z +=  k*_a.x*dt;
  } else {
    // rolling: lock ω to v, apply rolling resistance
    b.ang.x =  b.vel.z/BALL.R;
    b.ang.z = -b.vel.x/BALL.R;
    const sp=Math.hypot(b.vel.x,b.vel.z);
    if(sp>0){ const dec=Math.min(sp, PHYS.muRoll*PHYS.g*dt);
      b.vel.x -= b.vel.x/sp*dec; b.vel.z -= b.vel.z/sp*dec; }
    if(Math.hypot(b.vel.x,b.vel.z) < 0.004){ b.vel.x=0; b.vel.z=0; b.ang.x=0; b.ang.z=0; }
  }
  // vertical (english) spin decays from cloth friction
  const sd=PHYS.spinDecay*dt;
  if(Math.abs(b.ang.y)>sd) b.ang.y -= Math.sign(b.ang.y)*sd; else b.ang.y=0;

  b.pos.x += b.vel.x*dt; b.pos.z += b.vel.z*dt; b.pos.y=BALL.R;

  // pockets
  const drop=p=>{
    b.falling=true; b.fallPocket=p; shotEvents.potted.push(b);
    if(b.num===0) shotEvents.cueScratch=true;
    Sfx.play('pocket', 0.7);
    if(typeof Haptics!=='undefined') Haptics.buzz(b.num===0?[0,30,40,30]:18);   // scratch buzzes twice
  };
  for(const p of POCKETS){
    const dx=b.pos.x-p.pos.x, dz=b.pos.z-p.pos.z, d=Math.hypot(dx,dz);
    if(d < p.r){ drop(p); return; }
    // funnel: in the jaws (past the cushion line near a pocket) pull toward the drop
    const out = Math.abs(b.pos.x)>W2-BALL.R*0.4 || Math.abs(b.pos.z)>H2-BALL.R*0.4;
    if(out && d < p.r+0.10){
      // a stronger pull into the throat than before, so balls in the jaws don't stall
      b.vel.x -= dx/d*7.0*dt; b.vel.z -= dz/d*7.0*dt;
      // TEETER: once the ball's centre is more than ~half-way over the lip and it's no
      // longer racing past, real-world gravity tips it in - no more balls frozen on the
      // edge with most of their mass over the hole
      const speed=Math.hypot(b.vel.x,b.vel.z);
      if(d < p.r + BALL.R*0.55 && speed < 0.85){ drop(p); return; }
    }
  }
  // hard guarantee: a centre that crosses well past a cushion plane can only be
  // inside a mouth (cushions stop centres at W2-R everywhere else) - it drops
  // into the nearest pocket, so no shot can ever leak through a jaw gap
  if(Math.abs(b.pos.x)>W2+BALL.R*0.5 || Math.abs(b.pos.z)>H2+BALL.R*0.5){
    let best=POCKETS[0], bd=1e9;
    for(const p of POCKETS){
      const d=Math.hypot(b.pos.x-p.pos.x, b.pos.z-p.pos.z);
      if(d<bd){ bd=d; best=p; }
    }
    drop(best); return;
  }
  // cushions (segments with pocket gaps) - spring-style compression + spin response
  for(const seg of SEGS){
    const p = seg.axis==='z'?b.pos.z:b.pos.x;
    const q = seg.axis==='z'?b.pos.x:b.pos.z;
    if(q < seg.from-0.012 || q > seg.to+0.012) continue;
    const pen = seg.dir<0 ? (p - (seg.pos-BALL.R)) : ((seg.pos+BALL.R) - p);
    if(pen <= 0) continue;
    let vn = seg.axis==='z'?b.vel.z:b.vel.x;
    const movingIn = seg.dir<0 ? vn>0 : vn<0;
    // positional correction (rubber gives ~pen then pushes back)
    const corr = Math.min(pen, 0.004) + Math.max(0, pen-0.004);
    if(seg.axis==='z') b.pos.z -= seg.dir<0? corr : -corr; else b.pos.x -= seg.dir<0? corr : -corr;
    if(movingIn){
      const speed=Math.abs(vn);
      // restitution falls slightly at very high speed (rubber saturates)
      const e = PHYS.eCush * (speed>4 ? 0.93 : 1);
      vn = -vn*e;
      // tangential: rail cloth grips; side-spin alters the rebound angle.
      // contact-point spin velocity along the rail: (ω×r_c) tangential comp
      //   x-walls → +ω_y·R·dir ;  z-walls → −ω_y·R·dir
      let vt = seg.axis==='z'?b.vel.x:b.vel.z;
      const spinSurf = (seg.axis==='x' ? 1 : -1) * b.ang.y*BALL.R*seg.dir;
      vt -= (vt - spinSurf)*PHYS.cushGrip;       // friction toward zero slip
      vt += spinSurf*PHYS.cushSpinKick*0.5;      // english throws the rebound
      b.ang.y *= 0.55;
      if(seg.axis==='z'){ b.vel.z=vn; b.vel.x=vt; } else { b.vel.x=vn; b.vel.z=vt; }
      seg.pulse=Math.min(1, 0.35+speed*0.18);
      shotEvents.anyCushion++;
      if(shotEvents.firstContact) shotEvents.cushionAfterContact=true;
      if(speed>0.1) Sfx.play('cushion', Math.min(1, Math.max(0.22, speed*0.26)));
    }
  }
  // hard outer containment (should rarely trigger)
  const lim=0.10;
  if(Math.abs(b.pos.x)>W2+lim){ b.pos.x=Math.sign(b.pos.x)*(W2+lim); b.vel.x*=-0.4; }
  if(Math.abs(b.pos.z)>H2+lim){ b.pos.z=Math.sign(b.pos.z)*(H2+lim); b.vel.z*=-0.4; }
}

function collideBalls(){
  for(let i=0;i<balls.length;i++){
    const a=balls[i]; if(!a.active||a.falling) continue;
    for(let j=i+1;j<balls.length;j++){
      const c=balls[j]; if(!c.active||c.falling) continue;
      if(Math.abs(a.pos.y-c.pos.y) > BALL.R*0.9) continue;   // one is airborne - it clears the other
      const dx=c.pos.x-a.pos.x, dz=c.pos.z-a.pos.z;
      const d2=dx*dx+dz*dz, min=BALL.R*2;
      if(d2>=min*min || d2===0) continue;
      const d=Math.sqrt(d2), nx=dx/d, nz=dz/d, overlap=min-d;
      a.pos.x-=nx*overlap/2; a.pos.z-=nz*overlap/2;
      c.pos.x+=nx*overlap/2; c.pos.z+=nz*overlap/2;
      const rvx=a.vel.x-c.vel.x, rvz=a.vel.z-c.vel.z;
      const vn=rvx*nx+rvz*nz;
      if(vn<=0) continue;
      const k=(1+PHYS.eBall)/2*vn; // equal 170 g masses
      a.vel.x-=nx*k; a.vel.z-=nz*k;
      c.vel.x+=nx*k; c.vel.z+=nz*k;
      // light "cling": a touch of tangential friction between ball surfaces
      const tvx=rvx-vn*nx, tvz=rvz-vn*nz;
      a.vel.x-=tvx*0.02; a.vel.z-=tvz*0.02; c.vel.x+=tvx*0.02; c.vel.z+=tvz*0.02;
      // and a subtle transfer of english at the contact patch
      const sxc=(a.ang.y-c.ang.y)*0.05; a.ang.y-=sxc; c.ang.y+=sxc;
      if(!shotEvents.firstContact){
        if(a.num===0) shotEvents.firstContact=c;
        else if(c.num===0) shotEvents.firstContact=a;
      }
      Sfx.play('clack', Math.min(1, Math.max(0.26, vn*0.2)));
    }
  }
}

let simActive=false, simTime=0;
function physicsFrame(elapsed){
  let t=Math.min(elapsed, 1/20);
  while(t>0){
    const dt=Math.min(PHYS.dt, t); t-=dt;
    for(const b of balls) stepBall(b, dt);
    collideBalls();
    if(simActive) simTime+=dt;
  }
  // visuals: spin the meshes, park the contact shadows, relax cushions
  for(const b of balls){
    if(!b.active) continue;
    b.mesh.position.copy(b.pos);
    b.shadowDisc.position.set(b.pos.x, 0.0008, b.pos.z);
    b.shadowDisc.visible=!b.falling;
    const w=b.ang.length();
    if(w>0.0001){ _n.copy(b.ang).normalize();
      b.mesh.rotateOnWorldAxis ? b.mesh.rotateOnWorldAxis(_n, w*elapsed)
        : b.mesh.rotation.x+=0; }
  }
  for(const seg of cushionMeshes){
    if(seg.pulse>0.001){
      const off=seg.baseOff + (-seg.dir)*0.007*seg.pulse;
      if(seg.axis==='z') seg.mesh.position.z=off; else seg.mesh.position.x=off;
      seg.pulse*=Math.pow(0.0001, elapsed); // fast decay
    }
  }
  if(simActive){
    let moving=false;
    for(const b of balls){ if(!b.active) continue;
      if(b.falling || b.vel.lengthSq()>0.00006 || Math.abs(b.ang.y)>0.4 || b.pos.y>BALL.R+0.001) { moving=true; break; } }
    if(!moving || simTime>30){ simActive=false; Game.onShotSettled(); }
  }
}
