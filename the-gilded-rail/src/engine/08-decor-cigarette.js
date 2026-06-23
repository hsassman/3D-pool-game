/* The Gilded Rail - cigarette + ashtray.
   Global-scope engine file, loaded in numeric order (see index.html). */

/* A round ashtray (supplied model, with a turned-glass fallback) holding a lit
   cigarette that rests in the rim groove with its tip glowing and trailing smoke,
   plus a couple of spent butts in the dish. */
function makeCigSet(scale){
  scale=scale||1;
  const S=v=>v*scale;
  const grp=new THREE.Group();

  if(typeof Models!=='undefined' && Models.has('ashtray')){
    Models.place('ashtray', grp, 0, 0, 0, S(0.128), {by:'width'});
  } else {
    const prof=[
      [0.000,0.004],[0.040,0.002],[0.048,0.005],[0.054,0.013],[0.058,0.022],
      [0.059,0.026],[0.055,0.026],[0.051,0.021],[0.044,0.011],[0.030,0.006],[0.000,0.006]
    ].map(([r,y])=>new THREE.Vector2(S(r),S(y)));
    const glassAsh=new THREE.MeshPhysicalMaterial({color:0xeaf1f1, transparent:true, opacity:0.34,
      roughness:0.06, metalness:0, envMap:envMap, envMapIntensity:1.1, clearcoat:1, clearcoatRoughness:0.05,
      side:THREE.DoubleSide});
    const bowl=new THREE.Mesh(new THREE.LatheGeometry(prof,56), glassAsh);
    bowl.castShadow=true; bowl.receiveShadow=true; grp.add(bowl);
  }

  const REST_A=-1.05;                       /* rest angle of the lit cigarette */
  const paperMat=()=>new THREE.MeshStandardMaterial({color:0xf3eddd, roughness:0.85});
  const filtMat =()=>new THREE.MeshStandardMaterial({color:0xc8924e, roughness:0.8});
  const ashMat  =()=>new THREE.MeshStandardMaterial({color:0x6b6b66, roughness:1});
  function cigarette(len, lit){
    const c=new THREE.Group();
    c.add(new THREE.Mesh(new THREE.CylinderGeometry(S(0.0033),S(0.0033),S(len),12), paperMat()));
    const filt=new THREE.Mesh(new THREE.CylinderGeometry(S(0.0034),S(0.0034),S(0.016),12), filtMat());
    filt.position.y=-S(len/2+0.008); c.add(filt);
    if(lit){
      const ember=new THREE.Mesh(new THREE.SphereGeometry(S(0.0035),10,8),
        new THREE.MeshStandardMaterial({color:0x3a1408, emissive:0xff5a18, emissiveIntensity:1.4, roughness:1}));
      ember.position.y=S(len/2); c.add(ember);
      c.userData.ember=ember;
    } else {
      const tip=new THREE.Mesh(new THREE.CylinderGeometry(S(0.0033),S(0.0030),S(0.006),10), ashMat());
      tip.position.y=S(len/2+0.002); c.add(tip);
    }
    return c;
  }

  const V=(x,y,z)=>new THREE.Vector3(S(x),S(y),S(z));
  function layCig(c, P0, aim){
    const dir=new THREE.Vector3().subVectors(aim,P0).normalize();
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    c.position.copy(P0).addScaledVector(dir, 0.042*scale);
    grp.add(c);
    return dir;
  }

  /* the lit cigarette sits in the tray: filter on the near rim, body sloping down
     into the dish, lit end resting on the base */
  const cig=cigarette(0.052, true);
  const P0=V(Math.cos(REST_A)*0.052, 0.020, Math.sin(REST_A)*0.052);
  const aim=V(Math.cos(REST_A+Math.PI)*0.020, 0.008, Math.sin(REST_A+Math.PI)*0.020);
  const dir=layCig(cig, P0, aim);
  const ember=cig.userData.ember;
  if(typeof Embers!=='undefined') Embers.list.push(ember);

  /* smoke off the ember */
  const emberPos=P0.clone().addScaledVector(dir, 0.0705*scale);
  const em=Smoke.make(0.8*scale); em.obj.position.copy(emberPos); grp.add(em.obj);

  /* the lit tip actually casts a small warm glow into the tray (pulses with the ember) */
  const emberLight=new THREE.PointLight(0xff5a1e, 0.22, 0.34*scale+0.06, 2);
  emberLight.position.copy(emberPos); emberLight.castShadow=false; grp.add(emberLight);
  ember.userData.light=emberLight;

  /* a couple of spent butts lying in the base */
  const floorY=0.0065+0.0033;
  [[ -0.016, 0.6, 0.014], [0.010, -1.1, -0.016]].forEach(([bx,ry,bz])=>{
    const butt=cigarette(0.018, false);
    butt.rotation.set(0,ry,Math.PI/2);
    butt.position.set(S(bx), S(floorY), S(bz));
    grp.add(butt);
  });

  grp.userData.ember=ember;
  return grp;
}

/* The smouldering tip: a slow breathing glow with the odd brighter draw. */
const Embers = {
  list:[],
  update(t){
    for(let i=0;i<this.list.length;i++){
      const e=this.list[i]; if(!e || !e.material) continue;
      const draw=(Math.sin(t*0.23 + i*1.7) > 0.92) ? 0.9 : 0;
      const inten = 1.15 + Math.sin(t*1.6 + i*2.1)*0.30 + draw;
      e.material.emissiveIntensity = inten;
      if(e.userData && e.userData.light) e.userData.light.intensity = 0.16 + inten*0.10;   // the cast glow breathes with the ember
    }
  }
};
