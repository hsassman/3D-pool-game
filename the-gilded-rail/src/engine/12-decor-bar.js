/* The Gilded Rail - THE BAR
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= THE BAR ================= */
/* veined marble for the counter top */
function makeMarbleTexture(){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const x=cv.getContext('2d');
  x.fillStyle='#d8cfbe'; x.fillRect(0,0,512,256);
  for(let i=0;i<70;i++){ x.fillStyle='rgba('+(200+Math.random()*40|0)+','+(190+Math.random()*40|0)+','+(172+Math.random()*40|0)+',0.14)';
    const r=24+Math.random()*70; x.beginPath(); x.arc(Math.random()*512,Math.random()*256,r,0,7); x.fill(); }
  for(let i=0;i<16;i++){ x.strokeStyle='rgba(118,108,92,'+(0.08+Math.random()*0.12)+')'; x.lineWidth=0.5+Math.random()*1.3;
    let px=Math.random()*512, py=0; x.beginPath(); x.moveTo(px,py);
    while(py<256){ px+=(Math.random()-0.5)*34; py+=8+Math.random()*16; x.lineTo(px,py); } x.stroke(); }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,1); return t;
}
function buildBar(){
  const grp=new THREE.Group();
  grp.position.set(0.3, -0.815, -3.6);    /* across the room, past the lounge */
  const darkWood=new THREE.MeshStandardMaterial({color:0x241510, roughness:0.55, map:woodMat.map});
  /* counter: timber base with a light stone top, brass foot rail */
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 0.54), woodMat);
  top.position.set(0,1.135,0.10); top.castShadow=true; grp.add(top);
  const stone=new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.02, 0.56),
    new THREE.MeshStandardMaterial({color:0xe6ddcd, map:makeMarbleTexture(), roughness:0.26, metalness:0.06, envMap:envMap, envMapIntensity:0.32}));
  stone.position.set(0,1.166,0.10); stone.receiveShadow=true; grp.add(stone);
  const BARTOP=1.176;
  const front=new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.13, 0.05), darkWood);
  front.position.set(0,0.565,0.335); front.castShadow=true; grp.add(front);
  /* solid end caps so the counter doesn't read as a floating slab */
  [[-1],[1]].forEach(([s])=>{
    const cap=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.13,0.50), darkWood);
    cap.position.set(s*1.25,0.565,0.11); grp.add(cap);
  });
  const footRail=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,2.4,12), brassMat);
  footRail.rotation.z=Math.PI/2; footRail.position.set(0,0.18,0.42); grp.add(footRail);
  /* back bar: dark panel, a round mirror at its heart, two flanking shelf bays */
  const panel=new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.18, 0.04), darkWood);
  panel.position.set(0,1.09,-0.62); grp.add(panel);
  const mirror=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.015,32),
    new THREE.MeshStandardMaterial({color:0x9aa39e, roughness:0.05, metalness:1.0, envMap:envMap, envMapIntensity:1.7}));
  mirror.rotation.x=Math.PI/2; mirror.position.set(0,1.54,-0.595); grp.add(mirror);
  const mFrame=new THREE.Mesh(new THREE.TorusGeometry(0.325,0.015,12,40), brassMat);
  mFrame.position.set(0,1.54,-0.595); grp.add(mFrame);
  /* wall sconces flanking the mirror - warm glowing shades */
  [[-0.50],[0.50]].forEach(([sxp])=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.07,8), brassMat);
    arm.position.set(sxp,1.62,-0.585); grp.add(arm);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.022,10,8),
      new THREE.MeshStandardMaterial({color:0x3a2a14, emissive:0xffd9a0, emissiveIntensity:1.7}));
    bulb.position.set(sxp,1.67,-0.585); grp.add(bulb);
  });
  /* flanking shelf bays, both heights, with the warm strip-glow */
  const rnd=mulberry(1924);
  [[-0.86],[0.86]].forEach(([bx])=>{
    [1.30, 1.74].forEach(sy=>{
      const shelf=new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.026, 0.30), woodMat);
      shelf.position.set(bx,sy,-0.46); shelf.castShadow=true; shelf.receiveShadow=true; grp.add(shelf);
      const glow=new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.018, 0.018),
        new THREE.MeshStandardMaterial({color:0x2a1c10, emissive:0xd98a3c, emissiveIntensity:0.9}));
      glow.position.set(bx,sy+0.022,-0.585); grp.add(glow);
    });
  });
  /* the collection on the wall: the original procedural bottle archetypes, stacked
     across three bays, the fourth bay (upper right) given over to empty whisky
     glasses, plus crystal decanters as decoration */
  [{y:1.313, xs:[0.69,1.03]},                  /* lower right - two spots given to Jack Daniels below */
   {y:1.313, xs:[-0.52,-0.69,-1.03]},          /* lower left  - one spot given to Jack Daniels */
   {y:1.753, xs:[-0.52,-0.69,-1.03,-1.20]}     /* upper left  - one spot given to Jack Daniels */
  ].forEach(({y,xs})=>xs.forEach(x=>{
    const b=makeBottle(rnd);
    b.position.set(x+(rnd()-0.5)*0.02, y, -0.46+(rnd()-0.5)*0.05);
    b.rotation.y=rnd()*Math.PI; grp.add(b);
  }));
  /* bottles of Jack Daniels on the shelves (in place of procedural bottles): two on the
     lower-right, one on the lower-left, one on the upper-left */
  if(Models.has('jackdaniels')){
    [[0.52,1.313,0.5],[0.86,1.313,-0.4],[-0.86,1.313,0.7],[-0.86,1.753,-0.6]]
      .forEach(([x,y,yaw])=> Models.place('jackdaniels', grp, x, y, -0.46, 0.30, {yaw}));
  } else {
    [[0.52,1.313],[0.86,1.313],[-0.86,1.313],[-0.86,1.753]].forEach(([x,y])=>{
      const b=makeBottle(rnd); b.position.set(x,y,-0.46); b.rotation.y=rnd()*Math.PI; grp.add(b); });
  }
  [0.56,0.69,0.82,0.95].forEach(gx=>{ const eg=makeGlass(false);   /* empty whisky glasses */
    eg.position.set(gx,1.753,-0.44); grp.add(eg); });
  /* two crystal decanters at the free OUTER ends of the lower bays - clear of the bottles */
  const d1=makeDecanter(); d1.position.set(1.24,1.313,-0.46); grp.add(d1);
  const d2=makeDecanter(); d2.position.set(-1.24,1.313,-0.46); grp.add(d2);
  /* on the counter: the Jack Daniels, a beer bottle beside the lone red cup, two
     whisky glasses, a decanter, two smouldering cigarettes */
  if(Models.has('jackdaniels')) Models.place('jackdaniels', grp, 0.34, BARTOP, 0.04, 0.26, {yaw:0.2});
  if(Models.has('redcup'))      Models.place('redcup',      grp, 0.66, BARTOP, 0.16, 0.105, {yaw:0.9});
  if(Models.has('bottles'))     Models.place('bottles',     grp, 0.52, BARTOP, 0.09, 0.22, {only:'Beer', yaw:-0.5});  /* beer bottle next to the cup */
  const g1=makeGlass(true, true);  g1.position.set(0.18,BARTOP,0.20); grp.add(g1);   /* whisky on the rocks, beside the Jack */
  const g2=makeGlass(false);       g2.position.set(-0.24,BARTOP,0.16); grp.add(g2);
  const dc=makeDecanter(); dc.position.set(-0.52,BARTOP,0.04); grp.add(dc);
  const c1=makeCigSet(0.95); c1.position.set(-0.82,BARTOP+0.001,0.12); grp.add(c1);
  const c2=makeCigSet(0.95); c2.position.set(0.92,BARTOP+0.001,0.06); c2.rotation.y=2.2; grp.add(c2);
  const cand=makeCandle(1.1); cand.position.set(-0.04,BARTOP,0.18); grp.add(cand);   /* candle on the bar */
  /* a dim shaded light hangs over the counter */
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.16,0.10,16,1,true),
    new THREE.MeshStandardMaterial({color:0x1c5038, roughness:0.5, metalness:0.3, side:THREE.DoubleSide}));
  shade.position.set(0,2.04,0.05); grp.add(shade);
  const cord=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.5,6),
    new THREE.MeshStandardMaterial({color:0x0c0c0e, roughness:0.9}));
  cord.position.set(0,2.32,0.05); grp.add(cord);
  const bl=new THREE.PointLight(0xd9923c, 0.45, 4.5, 2);
  bl.position.set(0,1.98,0.05); grp.add(bl);
  flickerLights.push(bl);
  /* a few stools pulled up to the counter */
  [-0.74,0.02,0.78].forEach(sxp=>{
    const st=makeStool(); st.position.set(sxp,0,0.80);
    st.rotation.y=Math.PI+(Math.abs(sxp)>0.1?Math.sign(sxp)*0.25:0);
    grp.add(st);
  });
  scene.add(grp);
}
