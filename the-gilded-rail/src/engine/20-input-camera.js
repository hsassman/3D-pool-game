/* The Gilded Rail - INPUT / CAMERA
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= INPUT / CAMERA ================= */
const Input = {
  mode:'ORBIT',            // ORBIT | SHOOT | FINE | BIH
  aimYaw: Math.PI,         // direction the SHOT travels (radians, world XZ)
  sDist:0.85, sH:0.42,     // shoot-mode camera distance / height (wheel + vertical drag)
  stickVec:{x:0,y:0},
  orbitYaw: -Math.PI/2, orbitPitch: 0.62, orbitDist: 2.9,
  /* first-person free-cam: eye walks the room (WASD / stick), mouse looks (yaw+pitch),
     wheel changes eye height. orbitYaw doubles as the look yaw. */
  walkPos: new THREE.Vector3(0, 0.55, 3.0),
  lookPitch: -0.22,        // FP look pitch (0 = level, + up, - down)
  fov: 50,                 // free-cam zoom (wheel/pinch change the lens FOV; 50 = default)
  focus: new THREE.Vector3(0,0.06,0),
  keys:{}, dragging:false, lastX:0, lastY:0,
  spin:{x:0,y:0},          // sx (side), sy (vertical) in [-0.75, 0.75]
  power:0, charging:false, chargeDir:1,
  bihGhost:null, bihValid:false, _mx:0, _my:0,

  init(){
    /* the room comes alive on the first gesture - browser autoplay rules need one.
       We bind several gesture types (mobile Safari unlocks on touchend/click as well
       as pointerdown) and keep nudging resume() on every gesture until the audio
       context is actually 'running', so audio reliably starts on all mobile browsers. */
    const gestures=['pointerdown','touchend','click','keydown'];
    const wake=()=>{ Sfx.ensure(); Sfx.startAtmosphere(); };
    gestures.forEach(ev=>addEventListener(ev, wake, {once:true}));
    const resumeAudio=()=>{
      try{ if(Sfx.ctx && Sfx.ctx.state!=='running') Sfx.ctx.resume(); }catch(_){}
      if(Sfx.ctx && Sfx.ctx.state==='running') gestures.forEach(ev=>removeEventListener(ev, resumeAudio));
    };
    gestures.forEach(ev=>addEventListener(ev, resumeAudio));
    addEventListener('keydown', e=>{
      if(e.repeat) return;
      this.keys[e.code]=true;
      /* Esc closes any open transient (quick-match setup, actions dropdown) first,
         otherwise opens the menu from anywhere in a frame (a quick pause) */
      if(e.code==='Escape'){
        const qo=document.getElementById('quick-overlay');
        if(qo && !qo.classList.contains('hidden')){ qo.classList.add('hidden'); return; }
        const ta=document.getElementById('top-actions');
        if(ta && ta.classList.contains('ta-open')){ UI.closeQuickbar(); return; }
        const mo=document.getElementById('menu-overlay');
        if(mo && mo.classList.contains('hidden') && Game.phase!=='MENU' && Game.phase!=='OVER'){
          mo.classList.remove('hidden'); Game.phase='MENU'; UI.sync(); Sfx.play('ui',0.4);
        }
        return;
      }
      if(e.code==='KeyF' && typeof Flashlight!=='undefined' && Flashlight.available()){ Flashlight.toggle(); }
      if(Game.phase==='MENU'||Game.phase==='OVER') return;
      if(e.code==='Tab'){ e.preventDefault(); this.toggleOrbitShoot(); }
      if(e.code==='KeyE'){ this.toggleFine(); }
      if(e.code==='KeyG'){ UI.cycleAimGuide(); }     // cycle shot-guide detail
      if(e.code==='Space'){ e.preventDefault();
        if((this.mode==='SHOOT'||this.mode==='FINE') && (Game.phase==='AIM'||Game.phase==='CHARGE')) this.beginCharge(); }
    });
    addEventListener('keyup', e=>{
      this.keys[e.code]=false;
      if(e.code==='Space' && this.charging) this.releaseCharge();
    });

    canvas.addEventListener('pointerdown', e=>{
      this.dragging=true; this.lastX=e.clientX; this.lastY=e.clientY;
      canvas.setPointerCapture(e.pointerId);
      if(this.mode==='BIH' && Game.phase==='BIH') this.tryPlaceBIH(e);
    });
    addEventListener('pointermove', e=>{
      this._mx=e.clientX; this._my=e.clientY;
      if(this.mode==='BIH' && Game.phase==='BIH'){ this.updateBIHGhost(e); }
      if(!this.dragging) return;
      const dx=e.clientX-this.lastX, dy=e.clientY-this.lastY;
      this.lastX=e.clientX; this.lastY=e.clientY;
      if(this.mode==='ORBIT' || this.mode==='BIH' || Game.phase==='SIM' || Game.phase==='AI'){
        this.orbitYaw   += dx*0.0042;                                   // mouse right -> look right
        this.lookPitch   = Math.max(-1.15, Math.min(1.15, this.lookPitch - dy*0.0042));  // mouse up = look up
      } else if(this.mode==='SHOOT'||this.mode==='FINE'){
        this.aimYaw -= dx*(this.mode==='FINE'?0.0012:0.0034);
        this.sH = Math.max(0.10, Math.min(1.05, this.sH + dy*0.0022));   // pan up/down
      }
    });
    addEventListener('pointerup', ()=>{ this.dragging=false; });
    canvas.addEventListener('wheel', e=>{
      e.preventDefault();
      if((this.mode==='SHOOT'||this.mode==='FINE') && (Game.phase==='AIM'||Game.phase==='CHARGE')){
        this.sDist=Math.max(0.45, Math.min(1.9, this.sDist + e.deltaY*0.0011));
      } else {
        /* free-cam: wheel zooms the LENS in / out (narrows / widens the FOV) - the eye
           stays put, so it optically pulls the board closer. Scroll up = zoom in. */
        this.fov=Math.max(14, Math.min(60, this.fov + e.deltaY*0.02));
      }
    }, {passive:false});
    /* pinch zoom on touch */
    this._pinch=null;
    canvas.addEventListener('touchstart', e=>{ if(e.touches.length===2){
      this._pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); } }, {passive:true});
    canvas.addEventListener('touchmove', e=>{
      if(e.touches.length===2 && this._pinch){
        const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        const dz=(this._pinch-d)*0.004; this._pinch=d;
        if((this.mode==='SHOOT'||this.mode==='FINE') && (Game.phase==='AIM'||Game.phase==='CHARGE'))
          this.sDist=Math.max(0.45, Math.min(1.9, this.sDist+dz));
        else this.fov=Math.max(14, Math.min(60, this.fov + dz*22));   // free-cam: pinch zooms the lens
      }
    }, {passive:true});
    canvas.addEventListener('touchend', ()=>{ this._pinch=null; }, {passive:true});

    /* virtual thumbstick (touch) */
    const stick=document.getElementById('stick'), knob=document.getElementById('stick-knob');
    if(stick){
      let sid=null, cx=0, cy=0;
      const setKnob=(x,y)=>{ knob.style.transform='translate(calc(-50% + '+(x*34)+'px), calc(-50% + '+(y*34)+'px))'; };
      stick.addEventListener('pointerdown', e=>{
        sid=e.pointerId; const r=stick.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
        stick.setPointerCapture(sid); e.preventDefault();
      });
      stick.addEventListener('pointermove', e=>{
        if(e.pointerId!==sid) return;
        let x=(e.clientX-cx)/44, y=(e.clientY-cy)/44;
        const m=Math.hypot(x,y); if(m>1){ x/=m; y/=m; }
        /* small deadzone keeps a resting thumb from drifting the aim */
        if(m<0.15){ this.stickVec.x=0; this.stickVec.y=0; } else { this.stickVec.x=x; this.stickVec.y=y; }
        setKnob(x,y);
      });
      const release=e=>{ if(e.pointerId!==sid) return; sid=null; this.stickVec.x=0; this.stickVec.y=0; setKnob(0,0); };
      stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);
    }

    /* touch / mouse charge button.
       We CAPTURE the pointer on press so the button keeps receiving events even if
       the finger drifts off it (common in landscape, where a small slip used to fire
       pointerleave and silently cancel the shot). Release on up OR cancel; we no
       longer release on pointerleave, which was the landscape "charge does nothing" bug. */
    const cb=document.getElementById('charge-btn');
    const dn=e=>{ e.preventDefault(); try{ cb.setPointerCapture(e.pointerId); }catch(_){}
      if(Game.phase==='AIM') this.beginCharge(); };
    const up=e=>{ e.preventDefault(); if(this.charging) this.releaseCharge(); };
    cb.addEventListener('pointerdown', dn);
    cb.addEventListener('pointerup', up);
    cb.addEventListener('pointercancel', up);
  },

  toggleOrbitShoot(){
    if(Game.phase==='BIH') return;
    if(Game.phase!=='AIM' && Game.phase!=='CHARGE'){ this.enterOrbit(); return; }
    if(this.mode==='ORBIT') this.enterShootMode(false);
    else this.enterOrbit();
  },
  toggleFine(){
    if(Game.phase!=='AIM' && Game.phase!=='CHARGE') return;
    if(this.mode==='FINE'){ this.enterShootMode(false); return; }
    /* one tap into Fine-Tune from anywhere (orbit/shoot) - matters on touch, where
       there's no keyboard and the ✛ button is the only way in */
    if(this.mode!=='SHOOT') this.enterShootMode(false);
    this.mode='FINE'; Sfx.play('ui'); UI.sync();
  },

  enterOrbit(){
    this.mode='ORBIT'; this.cancelCharge();
    aimGroup.visible=false; cueStick.visible = (Game.phase==='AI');
    this.killGhost(); UI.sync();
  },
  enterShootMode(fresh){
    this.mode='SHOOT';
    if(fresh){
      // aim roughly at the densest cluster of legal balls
      const t=balls.filter(b=>b.active&&b.num>0);
      const c=new THREE.Vector3();
      if(t.length){ t.forEach(b=>c.add(b.pos)); c.divideScalar(t.length); }
      const d=c.sub(cueBall.pos); this.aimYaw=Math.atan2(d.z, d.x);
      this.spin.x=0; this.spin.y=0; UI.spinDot();
    }
    this.power=0; this.charging=false;
    cueStick.visible=true; aimGroup.visible=true;
    this.killGhost(); UI.sync();
  },
  enterBIH(){
    this.mode='BIH'; this.cancelCharge();
    aimGroup.visible=false; cueStick.visible=false;
    cueBall.mesh.visible=false; cueBall.shadowDisc.visible=false;
    if(!this.bihGhost){
      this.bihGhost=new THREE.Mesh(ballGeo,
        new THREE.MeshStandardMaterial({color:0xfdf6e3, transparent:true, opacity:0.55, roughness:0.3}));
      scene.add(this.bihGhost);
    }
    this.bihGhost.visible=true; UI.sync();
  },
  killGhost(){ if(this.bihGhost) this.bihGhost.visible=false; },

  aimDir(){ return new THREE.Vector3(Math.cos(this.aimYaw),0,Math.sin(this.aimYaw)); },

  /* ----- ball in hand placement ----- */
  feltPoint(e){
    const r=canvas.getBoundingClientRect();
    const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(nd, camera);
    const t=(BALL.R - rc.ray.origin.y)/rc.ray.direction.y;
    if(t<=0) return null;
    return rc.ray.origin.clone().addScaledVector(rc.ray.direction, t);
  },
  validBIH(p){
    const maxX = Game.bihKitchen ? KITCHEN_X : (W2-BALL.R-0.002);
    if(p.x < -W2+BALL.R+0.002 || p.x > maxX) return false;
    if(Math.abs(p.z) > H2-BALL.R-0.002) return false;
    return !balls.some(b=>b.active && b.num!==0 && b.pos.distanceTo(p) < BALL.R*2.01);
  },
  updateBIHGhost(e){
    const p=this.feltPoint(e); if(!p||!this.bihGhost) return;
    p.y=BALL.R; this.bihGhost.position.copy(p);
    this.bihValid=this.validBIH(p);
    this.bihGhost.material.color.set(this.bihValid?0xfdf6e3:0xc23b2e);
    this.bihGhost.material.opacity=this.bihValid?0.55:0.35;
  },
  tryPlaceBIH(e){
    const p=this.feltPoint(e); if(!p) return;
    p.y=BALL.R;
    if(!this.validBIH(p)){ Sfx.play('ui',0.4); return; }
    cueBall.pos.copy(p); cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
    cueBall.active=true; cueBall.falling=false;
    cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
    this.killGhost(); Sfx.play('ui');
    Game.phase='AIM'; this.enterShootMode(true);
  },

  /* ----- power charge ----- */
  beginCharge(){ if(this.charging) return; this.charging=true; this.chargeDir=1; this.power=0; Game.phase='CHARGE'; UI.sync(); },
  cancelCharge(){ this.charging=false; this.power=0; UI.gauge(0); if(Game.phase==='CHARGE') Game.phase='AIM'; },
  releaseCharge(){
    if(!this.charging) return;
    this.charging=false;
    const p=this.power; this.power=0; UI.gauge(0);
    if(p<0.02){ Game.phase='AIM'; UI.sync(); return; }
    Game.fire(this.aimDir(), p, this.spin.x, this.spin.y);
  },

  /* ----- per-frame ----- */
  update(dt){
    /* first-person walk: WASD / stick move the eye in the look direction (horizontal),
       Shift to stride faster. Wall + table collisions keep you in the room. */
    if(this.mode==='ORBIT'||this.mode==='BIH'||Game.phase==='SIM'||Game.phase==='AI'){
      const sp=(this.keys['ShiftLeft']||this.keys['ShiftRight']?2.7:1.5)*dt;
      const fwd=new THREE.Vector3(Math.cos(this.orbitYaw),0,Math.sin(this.orbitYaw));    // horizontal heading
      const rgt=new THREE.Vector3(-Math.sin(this.orbitYaw),0,Math.cos(this.orbitYaw));   // viewer's right = cross(fwd,up)
      const p=this.walkPos;
      if(this.keys['KeyW']||this.keys['ArrowUp'])    p.addScaledVector(fwd, sp);   // forward
      if(this.keys['KeyS']||this.keys['ArrowDown'])  p.addScaledVector(fwd,-sp);   // back
      if(this.keys['KeyA']) p.addScaledVector(rgt,-sp);                            // left
      if(this.keys['KeyD']) p.addScaledVector(rgt, sp);                            // right
      if(this.keys['Space']) p.y+=sp;                                             // rise
      if(this.keys['ControlLeft']||this.keys['ControlRight']) p.y-=sp;            // crouch / descend
      if(this.stickVec.x||this.stickVec.y){
        p.addScaledVector(fwd, -this.stickVec.y*sp*1.3);   // push up = forward
        p.addScaledVector(rgt,  this.stickVec.x*sp*1.3);
      }
      this.clampWalk();
    }
    /* arrow keys fine-aim */
    if((this.mode==='SHOOT'||this.mode==='FINE') && (Game.phase==='AIM'||Game.phase==='CHARGE')){
      const fine=this.mode==='FINE'?0.18:0.55;
      if(this.keys['ArrowLeft'])  this.aimYaw-=fine*dt;
      if(this.keys['ArrowRight']) this.aimYaw+=fine*dt;
      if(this.stickVec.x) this.aimYaw+=this.stickVec.x*fine*1.4*dt;
      if(this.stickVec.y) this.sH=Math.max(0.10,Math.min(1.05,this.sH+this.stickVec.y*0.5*dt));
    }
    /* charge ping-pong */
    if(this.charging){
      this.power += this.chargeDir*dt*0.85;
      if(this.power>=1){ this.power=1; this.chargeDir=-1; }
      if(this.power<=0){ this.power=0; this.chargeDir=1; }
      UI.gauge(this.power);
    }
  },

  /* keep the first-person eye inside the room (walls / floor / ceiling, with margin) and
     out of the table footprint, so you walk AROUND the table instead of through it */
  clampWalk(){
    const p=this.walkPos, m=0.28;
    if(typeof ROOM_RX!=='undefined'){
      p.x=Math.max(-ROOM_RX+m, Math.min(ROOM_RX-m, p.x));
      p.z=Math.max(ROOM_BZ+m,  Math.min(ROOM_FZ-m,  p.z));
    }
    p.y=Math.max(-0.2, Math.min(1.2, p.y));
    /* push the eye out of any furniture block (table / bar+stools / lounge) along its
       shallowest edge, so movement stops cleanly against it */
    if(typeof WALK_BLOCKS!=='undefined'){
      for(let i=0;i<WALK_BLOCKS.length;i++){ const b=WALK_BLOCKS[i];
        if(p.x>b.x0 && p.x<b.x1 && p.z>b.z0 && p.z<b.z1){
          const dl=p.x-b.x0, dr=b.x1-p.x, db=p.z-b.z0, dt=b.z1-p.z, mn=Math.min(dl,dr,db,dt);
          if(mn===dl) p.x=b.x0; else if(mn===dr) p.x=b.x1; else if(mn===db) p.z=b.z0; else p.z=b.z1;
        }
      }
    }
  },

  updateCamera(dt){
    const lerp=1-Math.pow(0.0008,dt);
    let tp=new THREE.Vector3(), tl=new THREE.Vector3(), tfov=50;
    if(Game.phase==='MENU'){
      const t=performance.now()*0.00012;
      tp.set(Math.cos(t)*3.1, 1.5+Math.sin(t*0.7)*0.18, Math.sin(t)*3.1);
      tl.set(0,0.05,0);
    } else if((this.mode==='SHOOT'||this.mode==='FINE') && (Game.phase==='AIM'||Game.phase==='CHARGE')){
      const d=this.aimDir();
      const f=this.mode==='FINE'?0.45:1;
      tp.copy(cueBall.pos).addScaledVector(d,-this.sDist*f).add(new THREE.Vector3(0,this.sH*f,0));
      tl.copy(cueBall.pos).addScaledVector(d, this.mode==='FINE'?0.35:1.1);
    } else {
      /* first-person free-cam: eye at walkPos, looking along (yaw, pitch), wheel-zoomed FOV */
      const cp=Math.cos(this.lookPitch);
      tp.copy(this.walkPos);
      tl.set(this.walkPos.x + Math.cos(this.orbitYaw)*cp,
             this.walkPos.y + Math.sin(this.lookPitch),
             this.walkPos.z + Math.sin(this.orbitYaw)*cp);
      tfov=this.fov;
    }
    camera.position.lerp(tp, lerp);
    if(camera.position.y > ROOM_CEIL_Y-0.12) camera.position.y=ROOM_CEIL_Y-0.12;   // hard ceiling cap
    /* wall + floor collision: keep the free camera inside the room so it can't clip
       through a wall (notably the window wall) and break the illusion */
    const wm=0.22;
    camera.position.x=Math.max(-ROOM_RX+wm, Math.min(ROOM_RX-wm, camera.position.x));
    camera.position.z=Math.max(ROOM_BZ+wm,  Math.min(ROOM_FZ-wm,  camera.position.z));
    if(camera.position.y < ROOM_FLOOR_Y+0.12) camera.position.y=ROOM_FLOOR_Y+0.12;
    if(!this._look) this._look=tl.clone();
    this._look.lerp(tl, lerp);
    camera.lookAt(this._look);
    /* smoothly ease the lens toward the target FOV (wheel zoom in free-cam, 50 elsewhere) */
    if(Math.abs(camera.fov-tfov)>0.02){
      camera.fov += (tfov-camera.fov)*Math.min(1, lerp*1.8);
      camera.updateProjectionMatrix();
    }
  }
};
