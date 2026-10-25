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
    const face=-(W2+TABLE.CUSH_D+TABLE.RAIL-.011);
    this.laneX=face+.052;
    const axisY=-.174,rodR=.003,separation=.017;
    this.y=axisY+Math.sqrt((BALL.R+rodR)**2-separation**2);
    this.group=new THREE.Group();this.group.name='Ball return assembly';tableGroup.add(this.group);
    const add=(geometry,material,x,y,z)=>{
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);this.group.add(mesh);return mesh;
    };
    const lining=new THREE.MeshStandardMaterial({color:0x263129,roughness:.9});
    WorldMaterials.bind('club-leather',lining,{bump:.00035});
    add(new THREE.BoxGeometry(.096,.008,1.06),lining,this.laneX,-.194,0);
    add(new THREE.BoxGeometry(.008,.112,1.06),lining,face+.1,-.132,0);
    const trackGeometry=new THREE.CylinderGeometry(rodR,rodR,1.06,16);
    for(const offset of [-separation,separation]){
      const track=add(trackGeometry,Craft.nickel,this.laneX+offset,axisY,0);track.rotation.x=Math.PI/2;
    }
    const supportGeometry=new THREE.BoxGeometry(.048,.012,.012);
    for(const z of [-.45,-.15,.15,.45])add(supportGeometry,steelMat,this.laneX,-.184,z);

    // A real aperture at the negative-z end, aligned with the direction of travel.
    const plate=new THREE.Shape();plate.moveTo(-.048,-.055);plate.lineTo(.048,-.055);
    plate.lineTo(.048,.055);plate.lineTo(-.048,.055);plate.closePath();
    const aperture=new THREE.Path();aperture.absarc(0,this.y+.132,.034,0,Math.PI*2,true);plate.holes.push(aperture);
    add(new THREE.ExtrudeGeometry(plate,{depth:.008,bevelEnabled:false,curveSegments:32}),steelMat,this.laneX,-.132,this.entryZ-.036);
    add(new THREE.RingGeometry(.033,.037,40),Craft.nickel,this.laneX,this.y,this.entryZ-.027);
    const chute=add(new THREE.CylinderGeometry(.034,.034,.05,32,1,true),lining,this.laneX,this.y,this.entryZ-.052);
    chute.rotation.x=Math.PI/2;
    const shadow=add(new THREE.CircleGeometry(.033,32),new THREE.MeshBasicMaterial({color:0x030403,side:THREE.DoubleSide}),this.laneX,this.y,this.entryZ-.077);

    // A padded stop catches the first ball at its tangent, not below its centre.
    add(new THREE.BoxGeometry(.066,.052,.010),Craft.pocketLeather,this.laneX,this.y-.004,this.s0+BALL.R+.005);
    const stop=add(new THREE.CylinderGeometry(.004,.004,.066,16),Craft.nickel,this.laneX,this.y-.03,this.s0+BALL.R+.01);
    stop.rotation.z=Math.PI/2;

    // Recessed glazing with a restrained satin-nickel frame and small fasteners.
    const glazing=add(new THREE.PlaneGeometry(1.018,.098),new THREE.MeshPhysicalMaterial({
      color:0xd9e4df,transparent:true,opacity:.045,roughness:.13,metalness:0,
      envMapIntensity:.25,depthWrite:false,side:THREE.DoubleSide
    }),face+.003,-.1325,0);
    glazing.rotation.y=-Math.PI/2;glazing.renderOrder=3;
    for(const y of [-.081,-.184])add(new THREE.BoxGeometry(.008,.005,1.034),Craft.nickel,face+.008,y,0);
    for(const z of [-.515,.515])add(new THREE.BoxGeometry(.008,.103,.005),Craft.nickel,face+.008,-.1325,z);
    const screwGeometry=new THREE.CylinderGeometry(.002,.002,.0025,10);
    for(const y of [-.081,-.184])for(const z of [-.49,.49]){
      const screw=add(screwGeometry,steelMat,face+.0025,y,z);screw.rotation.z=Math.PI/2;
    }
    const stripMaterial=new THREE.MeshStandardMaterial({color:0x8b7b5e,emissive:0xffdda6,emissiveIntensity:.45});
    add(new THREE.BoxGeometry(.016,.002,.94),stripMaterial,this.laneX,-.086,0);
    const light=new THREE.PointLight(0xffdda6,.22,.7,2);light.position.set(this.laneX,-.089,0);this.group.add(light);
    add(new THREE.BoxGeometry(.004,.016,.13),brassMat,face-.001,-.205,0);
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
    /* Feed in scoring order, with a ball diameter of clearance at the outlet.
       A short internal route must never let a later ball overtake an earlier one. */
    this.pending.forEach(item=>item.wait-=dt);
    const first=this.pending[0];
    const entryClear=!this.anims.some(a=>a.z<this.entryZ+this.dx);
    if(first&&first.wait<=0&&entryClear){this.pending.shift();this._enter(first);}
    /* roll released balls along the rail to their resting slot */
    for(let i=this.anims.length-1;i>=0;i--){
      const a=this.anims[i];
      a.v=Math.min(a.v+2.2*dt, 1.05);
      const previousZ=a.z;a.z+=a.v*dt;
      if(a.z>=a.to){ a.z=a.to; this.anims.splice(i,1); }
      a.b.pos.set(this.laneX, this.y, a.z);
      a.b.mesh.position.copy(a.b.pos);
      a.b.mesh.rotateOnWorldAxis(_xAxis, (a.z-previousZ)/BALL.R);
    }
  }
};
const _xAxis=new THREE.Vector3(1,0,0);
