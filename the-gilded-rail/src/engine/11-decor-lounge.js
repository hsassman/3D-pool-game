/* The Gilded Rail - LOUNGE CORNER
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= LOUNGE CORNER ================= */
function buildLounge(){
  const grp=new THREE.Group();
  grp.position.set(2.85, -0.815, -2.1);
  /* bar-height round table */
  const top=new THREE.Mesh(new THREE.CylinderGeometry(0.31,0.31,0.03,28), woodMat);
  top.position.y=1.02; top.castShadow=true; top.receiveShadow=true; grp.add(top);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.03,1.0,12), chromeMat);
  stem.position.y=0.52; grp.add(stem);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.20,0.025,20), chromeMat);
  base.position.y=0.013; grp.add(base);
  /* two high chairs */
  [[0.58,0.35],[-0.18,0.62]].forEach(([dx,dz])=>{
    const ch=makeStool();
    ch.position.set(dx,0,dz);
    ch.lookAt(new THREE.Vector3(0,0,0)); ch.position.y=0;
    grp.add(ch);
  });
  /* a beer bottle on the table (extracted from the bottles model) */
  if(Models.has('bottles')) Models.place('bottles', grp, 0.12, 1.035, 0.06, 0.22, {only:'Beer', yaw:0.6});
  else { const glass=makeGlass(true); glass.position.set(0.12, 1.035, 0.05); grp.add(glass); }
  /* the second cigarette set */
  const cig=makeCigSet(1.0);
  cig.position.set(-0.11, 1.043, -0.05);
  grp.add(cig);
  /* a small candle on the lounge table */
  const candle=makeCandle(1.0);
  candle.position.set(0.13, 1.035, -0.12);
  grp.add(candle);
  /* a soft warm pool light for the corner */
  const pl=new THREE.PointLight(0xd98a3c, 0.5, 4, 2); pl.position.set(0,1.7,0); grp.add(pl);
  flickerLights.push(pl);
  scene.add(grp);
}
