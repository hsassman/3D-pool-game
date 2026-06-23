/* The Gilded Rail - BALL RETURN GALLERY
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= BALL RETURN GALLERY ================= */
/* potted balls collect INSIDE the cabinet at the head end, in scoring order,
   behind a glass panel with a chrome railing and an end stop */
const Trough = {
  count:0, anims:[], pending:[],
  laneX:0, y:-0.154, s0:0.435, dx:(typeof BALL!=='undefined'?BALL.R:0.028575)*2+0.0045,
  entryZ:-0.50,
  build(){
    const face=-(W2+TABLE.CUSH_D+TABLE.RAIL-0.011);   /* the skirt's head face (matches engine_a) */
    this.laneX = face+0.052;
    /* balls rest in the groove between two parallel rails: rod axes at
       y=-0.183, spaced 34mm apart -> ball centre sits sqrt((R+r)^2-17^2mm)
       = 26.6mm above the rod axis */
    this.y = -0.183+0.0266;
    /* channel interior: dark floor + back wall, softly lit */
    const innerMat=new THREE.MeshStandardMaterial({color:0x12100d, roughness:0.95});
    const cfloor=new THREE.Mesh(new THREE.BoxGeometry(0.096,0.010,1.04), innerMat);
    cfloor.position.set(face+0.050,-0.203,0); tableGroup.add(cfloor);
    /* the return track itself: two chrome rails side by side INSIDE the
       gallery - the balls sit in the groove between them and roll along it */
    [[-0.017],[0.017]].forEach(([dxr])=>{
      const rr=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,1.06,10), chromeMat);
      rr.rotation.x=Math.PI/2;
      rr.position.set(this.laneX+dxr, -0.183, 0);
      tableGroup.add(rr);
    });
    /* small support feet under the rails */
    [-0.42,0,0.42].forEach(pz=>{
      const ft=new THREE.Mesh(new THREE.BoxGeometry(0.044,0.014,0.008), steelMat);
      ft.position.set(this.laneX,-0.192,pz); tableGroup.add(ft);
    });
    /* back wall pulled 3mm clear of the skirt face - coplanar surfaces flicker */
    const cback=new THREE.Mesh(new THREE.BoxGeometry(0.01,0.125,1.04), innerMat);
    cback.position.set(face+0.097,-0.125,0); tableGroup.add(cback);
    /* a dark opening at the entry end of the lane: the balls roll OUT of a hole in the
       cabinet wall rather than appearing out of a solid panel. A pure-black disc on the
       back wall, ringed by a darker shadow, reads as a recessed hole. */
    const voidMat=new THREE.MeshBasicMaterial({color:0x000000});
    /* a dim brushed-steel collar so the black hole reads as a defined chute mouth even
       against the dark gallery interior */
    const collar=new THREE.Mesh(new THREE.RingGeometry(BALL.R*1.45, BALL.R*1.78, 28),
      new THREE.MeshStandardMaterial({color:0x3a3d42, roughness:0.5, metalness:0.9, envMap:envMap, envMapIntensity:0.7, side:THREE.DoubleSide}));
    collar.rotation.y=-Math.PI/2;                          /* faces the viewer (-x) */
    collar.position.set(face+0.0905, this.y, this.entryZ); tableGroup.add(collar);
    const mouth=new THREE.Mesh(new THREE.CircleGeometry(BALL.R*1.46, 24), voidMat);
    mouth.rotation.y=-Math.PI/2;
    mouth.position.set(face+0.0912, this.y, this.entryZ); tableGroup.add(mouth);
    /* a faint warm emissive strip under the channel ceiling: the balls stay lit
       and readable no matter what the room lights are doing */
    const strip=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.003,1.0),
      new THREE.MeshStandardMaterial({color:0x2a2118, emissive:0xffd9a0, emissiveIntensity:1.1}));
    strip.position.set(face+0.045,-0.084,0); tableGroup.add(strip);
    /* the rail simply turns up at the end: a chrome cross-rod (same stock as the
       two running rails) that the lead ball rolls against - part of the rail, not
       a solid block */
    const endRod=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.045,12), chromeMat);
    endRod.rotation.z=Math.PI/2;                         /* lies across the lane (x) */
    endRod.position.set(this.laneX, -0.181, this.s0+BALL.R+0.004); tableGroup.add(endRod);
    /* small chrome elbows tying the cross-rod into each running rail */
    [[-0.017],[0.017]].forEach(([dxr])=>{
      const elbow=new THREE.Mesh(new THREE.SphereGeometry(0.0035,10,8), chromeMat);
      elbow.position.set(this.laneX+dxr, -0.182, this.s0+BALL.R+0.004); tableGroup.add(elbow);
    });
    /* glass viewing panel + slim chrome trim */
    const glass=new THREE.Mesh(new THREE.BoxGeometry(0.003,0.098,1.02),
      new THREE.MeshPhysicalMaterial({color:0xffffff, transparent:true, opacity:0.10,
        roughness:0.04, metalness:0, envMap:envMap, envMapIntensity:0.25,
        depthWrite:false, side:THREE.DoubleSide}));
    glass.position.set(face+0.0035,-0.1325,0);
    glass.renderOrder=3;                    /* drawn after the balls behind it */
    tableGroup.add(glass);
    [[-0.081],[-0.184]].forEach(([gy])=>{
      const tr=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.008,1.03), chromeMat);
      tr.position.set(face+0.010,gy,0); tableGroup.add(tr);
    });
    [[-1],[1]].forEach(([sg])=>{
      const tr=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.105,0.008), chromeMat);
      tr.position.set(face+0.010,-0.1325,sg*0.512); tableGroup.add(tr);
    });
    /* a warm strip of light inside so the balls read through the glass */
    const gl1=new THREE.PointLight(0xffd9a0, 0.65, 0.9, 2);
    gl1.position.set(face+0.05,-0.085,0); tableGroup.add(gl1);
    /* brass plaque under the window */
    const plaque=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.020,0.15), brassMat);
    plaque.position.set(face-0.0015,-0.201,0); tableGroup.add(plaque);
  },
  reset(){ this.count=0; this.anims.length=0; this.pending.length=0; },
  /* called when a potted ball finishes its pocket drop. The ball doesn't appear
     in the gallery instantly - it "travels the internal channels" first, with a
     delay scaled by how far its pocket is from the head-end return. */
  add(b){
    if(b.num===0) return;                       // cue ball never racks up here
    const slot=this.count++;
    if(slot>14) return;
    let dist=0.4;
    if(b.fallPocket){ const dx=b.fallPocket.pos.x-this.laneX, dz=b.fallPocket.pos.z-this.entryZ;
      dist=Math.hypot(dx,dz); }
    b.mesh.visible=false; b.shadowDisc.visible=false;     // hidden while it rolls inside
    this.pending.push({b, slot, wait:0.25 + dist*0.7});   // ≈0.3s (near) … ~2s (far foot pocket)
  },
  _enter(item){
    const b=item.b;
    b.mesh.visible=true; b.shadowDisc.visible=false;
    b.pos.set(this.laneX, this.y, this.entryZ);
    b.mesh.position.copy(b.pos);
    this.anims.push({b, z:this.entryZ, to:this.s0-item.slot*this.dx, v:0});
  },
  update(dt){
    /* release queued balls once their travel delay elapses */
    for(let i=this.pending.length-1;i>=0;i--){
      const it=this.pending[i]; it.wait-=dt;
      if(it.wait<=0){ this._enter(it); this.pending.splice(i,1); }
    }
    /* roll released balls along the rail to their resting slot */
    for(let i=this.anims.length-1;i>=0;i--){
      const a=this.anims[i];
      a.v=Math.min(a.v+2.2*dt, 1.05);
      a.z+=a.v*dt;
      if(a.z>=a.to){ a.z=a.to; this.anims.splice(i,1); }
      a.b.pos.set(this.laneX, this.y, a.z);
      a.b.mesh.position.copy(a.b.pos);
      a.b.mesh.rotateOnWorldAxis(_xAxis, (a.v*dt)/BALL.R);   // rolling visual
    }
  }
};
const _xAxis=new THREE.Vector3(1,0,0);
