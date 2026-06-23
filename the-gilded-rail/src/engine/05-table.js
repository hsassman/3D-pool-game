/* The Gilded Rail - TABLE BUILD
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= TABLE BUILD ================= */
const tableGroup = new THREE.Group(); scene.add(tableGroup);
const cushionMeshes = [];

/* pockets: physics CAPTURE centre/radius (pos,r) decoupled from the VISIBLE hole
   (vpos,vr). The visible side hole is rendered forward of the capture point and
   sized so the cushion tips land tangent to it - regulation side mouth ≈ hole, no
   felt gap (see pocket diagrams). Corners render at the capture point. Keeping the
   capture point fixed means potting behaviour is unchanged. */
const POCKETS = [];
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(s=>{
  const c=new THREE.Vector3(s[0]*(W2+0.014),0,s[1]*(H2+0.014));
  POCKETS.push({pos:c, r:0.060, type:'corner', vpos:c.clone(), vr:0.058});
});
[[-1],[1]].forEach(s=>{
  const c=new THREE.Vector3(0,0,s[0]*(H2+0.046));        /* capture point (unchanged) */
  const v=new THREE.Vector3(0,0,s[0]*(H2+0.016));        /* visible hole, pulled forward */
  POCKETS.push({pos:c, r:0.064, type:'side', vpos:v, vr:0.066});
});

/* cushion segments (axis-aligned, gaps at pocket mouths) */
const SEGS = [
  {axis:'z', pos: H2, dir:-1, from:-W2+TABLE.CORNER_CUT, to:-TABLE.SIDE_CUT},
  {axis:'z', pos: H2, dir:-1, from: TABLE.SIDE_CUT,      to: W2-TABLE.CORNER_CUT},
  {axis:'z', pos:-H2, dir: 1, from:-W2+TABLE.CORNER_CUT, to:-TABLE.SIDE_CUT},
  {axis:'z', pos:-H2, dir: 1, from: TABLE.SIDE_CUT,      to: W2-TABLE.CORNER_CUT},
  {axis:'x', pos: W2, dir:-1, from:-H2+TABLE.CORNER_CUT, to: H2-TABLE.CORNER_CUT},
  {axis:'x', pos:-W2, dir: 1, from:-H2+TABLE.CORNER_CUT, to: H2-TABLE.CORNER_CUT},
];

function buildTable(){
  /* the cloth and the slate beneath it share one shape with six true round
     pocket openings - the holes go all the way through to the throats */
  const CW=TABLE.W+0.20, CH=TABLE.H+0.20;
  const shape=new THREE.Shape();
  shape.moveTo(-CW/2,-CH/2); shape.lineTo(CW/2,-CH/2); shape.lineTo(CW/2,CH/2); shape.lineTo(-CW/2,CH/2); shape.closePath();
  POCKETS.forEach(p=>{
    const hole=new THREE.Path();
    hole.absarc(p.vpos.x, -p.vpos.z, p.vr, 0, Math.PI*2, true);   /* plane local y = -world z after rotation */
    shape.holes.push(hole);
  });
  /* slate: extruded downward 4cm, holes included */
  const slabGeo=new THREE.ExtrudeGeometry(shape, {depth:0.04, bevelEnabled:false, curveSegments:20});
  const bed=new THREE.Mesh(slabGeo, feltMat);
  bed.rotation.x=-Math.PI/2; bed.position.y=-0.0415; bed.receiveShadow=true; tableGroup.add(bed);
  /* marked cloth on top */
  const clothGeo=new THREE.ShapeGeometry(shape, 20);
  (function(){ const pos=clothGeo.attributes.position, uv=clothGeo.attributes.uv;
    for(let i=0;i<pos.count;i++){ uv.setXY(i, (pos.getX(i)+CW/2)/CW, (pos.getY(i)+CH/2)/CH); }
    uv.needsUpdate=true; })();
  const bedTop=new THREE.Mesh(clothGeo, bedTopMat);
  bedTop.rotation.x=-Math.PI/2; bedTop.position.y=-0.0003; bedTop.receiveShadow=true; tableGroup.add(bedTop);

  /* cushions: each is ONE continuous extruded shape - straight nose, round
     tips exactly on the regulation mouth lines, and straight facings behind
     (45 degrees into the corners, ~14 degrees at the sides). No seams, no
     separate pieces, one felt mapping across the lot. */
  const rt=0.012, D=TABLE.CUSH_D;
  SEGS.forEach(seg=>{
    const o=-seg.dir;                                  /* outward sign across the cushion */
    const isSide=v=>Math.abs(Math.abs(v)-TABLE.SIDE_CUT)<1e-6 && seg.axis==='z';
    /* facing lean: corner facings run TOWARD their pocket (parallel 45-degree
       chute); side facings splay AWAY from the mouth so the gap widens with
       depth - the sign here was previously inverted, leaving a felt tab
       hanging over the side openings */
    const fd=(v,e)=>{ const f=(D-rt)*Math.tan(isSide(v)?0.24:0.785);
      return isSide(v) ? Math.sign(v)*f : -e*f; };
    /* outline in world coords: (a = along axis, n + o*c = across) */
    const n=seg.pos;
    const W=(a,c)=>seg.axis==='z' ? [a, n+o*c] : [n+o*c, a];   /* world (x,z) */
    const P=(a,c)=>{ const w=W(a,c); return [w[0], -w[1]]; };  /* cloth-plane coords */
    const sh=new THREE.Shape();
    const arc=(cA,cC,pA,pC,qA,qC)=>{           /* short-way arc between two points */
      const ctr=P(cA,cC), p0=P(pA,pC), p1=P(qA,qC);
      const a0=Math.atan2(p0[1]-ctr[1], p0[0]-ctr[0]);
      let a1=Math.atan2(p1[1]-ctr[1], p1[0]-ctr[0]);
      let d=a1-a0; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      sh.absarc(ctr[0], ctr[1], rt, a0, a0+d, d<0);
    };
    const M=(a,c)=>{const p=P(a,c); sh.moveTo(p[0],p[1]);};
    const L=(a,c)=>{const p=P(a,c); sh.lineTo(p[0],p[1]);};
    /* MESH-ONLY inset: pull the side-pocket ends of the cushion back from the
       mouth so the cushion no longer overhangs the (set-back) side pocket. The
       physics cushion still spans seg.from..seg.to - only the visible mesh is
       trimmed. */
    const SIDE_INSET=0.000;
    const fa = seg.from + (isSide(seg.from)? Math.sign(seg.from)*SIDE_INSET : 0);
    const ta = seg.to   + (isSide(seg.to)?   Math.sign(seg.to)*SIDE_INSET   : 0);
    M(fa+rt, 0);
    L(ta-rt, 0);                                        /* nose */
    arc(ta-rt, rt,  ta-rt, 0,  ta, rt);                 /* round tip */
    L(ta + fd(seg.to,-1), D);                           /* facing */
    L(fa + fd(seg.from,1), D);                          /* back */
    L(fa, rt);                                          /* facing */
    arc(fa+rt, rt,  fa, rt,  fa+rt, 0);
    sh.closePath();
    const cg=new THREE.ExtrudeGeometry(sh, {depth:TABLE.CUSH_H, bevelEnabled:false, curveSegments:10});
    (function(){ const uv=cg.attributes.uv;
      for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*0.45, uv.getY(i)*0.45);
      uv.needsUpdate=true; })();
    const m=new THREE.Mesh(cg, feltCushMat);
    m.rotation.x=-Math.PI/2;
    m.castShadow=true; m.receiveShadow=true; tableGroup.add(m);
    seg.mesh=m; seg.baseOff=0; seg.pulse=0; cushionMeshes.push(seg);
  });

  /* wood rails (frame ring) */
  const railH=0.052, ro=TABLE.RAIL;
  /* the rail assembly is ONE continuous ring of timber: rounded outer corners,
     carved side-pocket mouths, and arcs wrapping each corner pocket - the grain
     never breaks and there are no seams or sharp corners anywhere */
  const ix=W2+TABLE.CUSH_D-0.005, iy=H2+TABLE.CUSH_D-0.005;   /* inner edges */
  const ox=ix+ro, oy=iy+ro, Rc=0.10;                          /* outer edges, corner radius */
  const cpx=W2+0.014, cpy=H2+0.014, rc=0.0595;                /* corner carve: hole + 1.5mm */
  const syc=H2+0.016, nr=0.0675;                              /* side carve: matches forward hole + ~1.5mm */
  const dyc=Math.sqrt(rc*rc-(ix-cpx)*(ix-cpx));
  const dxc=Math.sqrt(rc*rc-(iy-cpy)*(iy-cpy));
  const sxn=Math.sqrt(nr*nr-(iy-syc)*(iy-syc));
  /* outer boundary: rounded rectangle, counterclockwise */
  const ring=new THREE.Shape();
  ring.moveTo(ox, -(oy-Rc));
  ring.lineTo(ox, oy-Rc);
  ring.absarc(ox-Rc,  oy-Rc, Rc, 0, Math.PI/2, false);
  ring.lineTo(-(ox-Rc), oy);
  ring.absarc(-(ox-Rc), oy-Rc, Rc, Math.PI/2, Math.PI, false);
  ring.lineTo(-ox, -(oy-Rc));
  ring.absarc(-(ox-Rc), -(oy-Rc), Rc, Math.PI, Math.PI*1.5, false);
  ring.lineTo(ox-Rc, -oy);
  ring.absarc(ox-Rc, -(oy-Rc), Rc, Math.PI*1.5, Math.PI*2, false);
  ring.closePath();
  /* inner boundary: the playfield edge with all six mouths, angles computed
     directly from the geometry so every arc lands exactly on the edge lines */
  const ip=new THREE.Path();
  const A=(cx,cy,px,py)=>Math.atan2(py-cy,px-cx);
  ip.moveTo(ix, -(cpy-dyc));
  ip.lineTo(ix, cpy-dyc);
  ip.absarc( cpx,  cpy, rc, A(cpx,cpy, ix,cpy-dyc),        A(cpx,cpy, cpx-dxc,iy),   false);
  ip.lineTo(sxn, iy);
  ip.absarc( 0,    syc, nr, A(0,syc, sxn,iy),              A(0,syc, -sxn,iy),        false);
  ip.lineTo(-(cpx-dxc), iy);
  ip.absarc(-cpx,  cpy, rc, A(-cpx,cpy, -(cpx-dxc),iy),    A(-cpx,cpy, -ix,cpy-dyc), false);
  ip.lineTo(-ix, -(cpy-dyc));
  ip.absarc(-cpx, -cpy, rc, A(-cpx,-cpy, -ix,-(cpy-dyc)),  A(-cpx,-cpy, -(cpx-dxc),-iy), false);
  ip.lineTo(-sxn, -iy);
  ip.absarc( 0,   -syc, nr, A(0,-syc, -sxn,-iy),           A(0,-syc, sxn,-iy),       false);
  ip.lineTo(cpx-dxc, -iy);
  ip.absarc( cpx, -cpy, rc, A(cpx,-cpy, cpx-dxc,-iy),      A(cpx,-cpy, ix,-(cpy-dyc)), false);
  ip.closePath();
  ring.holes.push(ip);
  const ringGeo=new THREE.ExtrudeGeometry(ring, {depth:railH, bevelEnabled:false, curveSegments:26});
  (function(){ const uv=ringGeo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*0.42, uv.getY(i)*0.42);
    uv.needsUpdate=true; })();
  const railRing=new THREE.Mesh(ringGeo, woodMat);
  railRing.rotation.x=-Math.PI/2;
  railRing.castShadow=true; railRing.receiveShadow=true; tableGroup.add(railRing);

  /* apron / fascia: a slim wood band wrapping the rail's outer edge and hanging down to
     meet the cabinet skirt, closing the ~4.5cm void under the rail lip where the green bed
     edge used to peek through all the way round. Outer outline traces the rail ring exactly
     (ox,oy,Rc); a concentric inner hole keeps it a ~5.5cm-thick wall (inner radius stays
     well outside the cloth, so it never touches the felt). */
  const rr2=(sh, X, Y, R)=>{ sh.moveTo(X, -(Y-R)); sh.lineTo(X, Y-R);
    sh.absarc(X-R, Y-R, R, 0, Math.PI/2, false);            sh.lineTo(-(X-R), Y);
    sh.absarc(-(X-R), Y-R, R, Math.PI/2, Math.PI, false);   sh.lineTo(-X, -(Y-R));
    sh.absarc(-(X-R), -(Y-R), R, Math.PI, Math.PI*1.5, false); sh.lineTo(X-R, -Y);
    sh.absarc(X-R, -(Y-R), R, Math.PI*1.5, Math.PI*2, false); sh.closePath(); };
  const apron=new THREE.Shape(); rr2(apron, ox, oy, Rc);
  const apT=0.055, aHole=new THREE.Path();
  rr2(aHole, ox-apT, oy-apT, Math.max(0.012, Rc-apT));
  apron.holes.push(aHole);
  const apronGeo=new THREE.ExtrudeGeometry(apron, {depth:0.052, bevelEnabled:false, curveSegments:26});
  (function(){ const uv=apronGeo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*0.42, uv.getY(i)*0.42); uv.needsUpdate=true; })();
  const apronMesh=new THREE.Mesh(apronGeo, woodMat);
  apronMesh.rotation.x=-Math.PI/2; apronMesh.position.y=-0.05;   /* spans y -0.05 .. +0.002, just under the rail */
  apronMesh.castShadow=true; apronMesh.receiveShadow=true; tableGroup.add(apronMesh);

  /* pockets: a concave bowl carved under each hole, lined with knotted net, narrowing
     to a dark hole at the bottom. Everything stays well above the cabinet floor so the
     net never shows under the table - it only reads inside the pocket mouth. */
  /* the bowl + drop hole are UNLIT pure black so the pocket always reads as a dark
     void - the warm lamps can't tint them brown, and the wood throat never shows */
  const blackMat=new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide});
  const holeMat =new THREE.MeshBasicMaterial({color:0x000000, side:THREE.DoubleSide});
  /* woven net: the strand texture supplies colour + alpha (open holes) + relief, so the
     net reads as real twine with the black throat showing through the gaps */
  const _net=makeNetTexture();
  /* emissive on the strands (only) so the twine reads inside the dark throat without
     washing out; the alpha keeps the holes open so it still looks woven, not solid */
  const netMat=new THREE.MeshStandardMaterial({color:0xb6ac92, map:_net.tex, alphaMap:_net.tex,
    bumpMap:_net.bump, bumpScale:0.6, transparent:true, alphaTest:0.4, side:THREE.DoubleSide,
    roughness:0.74, metalness:0, emissive:0x938b6e, emissiveMap:_net.tex, emissiveIntensity:0.72});
  /* a concave (inward-curving) profile from the rim down to the small drop hole */
  const bowlProfile=(rr)=>[
    [rr*0.99,-0.006],[rr*0.93,-0.028],[rr*0.80,-0.052],[rr*0.62,-0.078],
    [rr*0.44,-0.100],[rr*0.30,-0.116],[rr*0.24,-0.126]
  ].map(([r,y])=>new THREE.Vector2(r,y));
  POCKETS.forEach(p=>{
    const visR=p.vr, cx=p.vpos.x, cz=p.vpos.z;
    /* dark concave backing (lathe), set in a little so it reads through the net holes */
    const shell=new THREE.Mesh(new THREE.LatheGeometry(bowlProfile(visR*0.9),26), blackMat);
    shell.position.set(cx,-0.004,cz); tableGroup.add(shell);
    /* a woven net pouch hanging from the rim into the open cavity; the pure-black bowl +
       drop hole behind/below it read as a dark void through the gaps */
    const net=new THREE.Mesh(new THREE.CylinderGeometry(visR*0.96, visR*0.42, 0.072, 32, 4, true), netMat);
    net.position.set(cx,-0.044,cz); tableGroup.add(net);
    /* the drop hole at the bottom of the bowl */
    const hole=new THREE.Mesh(new THREE.CircleGeometry(visR*0.23,20), holeMat);
    hole.rotation.x=Math.PI/2; hole.position.set(cx,-0.127,cz); tableGroup.add(hole);
    /* dark rim liner flush in the cloth hole - a clean dark lip, not a bright grey ring */
    const liner=new THREE.Mesh(new THREE.CylinderGeometry(visR-0.0005, visR*0.95, 0.018, 30, 1, true), darkMat);
    liner.position.set(cx, -0.011, cz); tableGroup.add(liner);
    if(p.type!=='corner') return;   /* the side pockets stay clean: liner + shell only */
    /* polished corner cap: a chrome plate whose OUTER edge traces the rail's own
       rounded corner (radius Rc about the same centre as the timber) so it sits
       flush with no gap, with a pocket-shaped cutout on the inside. Built in the
       shape plane (Y = -world z). */
    const roL=TABLE.RAIL, ixL=W2+TABLE.CUSH_D-0.005, iyL=H2+TABLE.CUSH_D-0.005;
    const oxL=ixL+roL, oyL=iyL+roL, RcL=0.10;
    const sgnx=Math.sign(p.pos.x)||1, sgnz=Math.sign(p.pos.z)||1;
    const Px=p.pos.x, Py=-p.pos.z;                    /* pocket centre, shape plane */
    const Cx=sgnx*(oxL-RcL), Cy=-sgnz*(oyL-RcL);      /* rail rounded-corner centre */
    const L=0.085, rIn=0.0595;                        /* reach along each rail; inner cutout radius
                                                         (= rail carve rc, so the chrome meets the
                                                         pocket edge flush - no proud lip / gap) */
    const E1=[sgnx*oxL,        Cy           ];        /* corner-arc tangent on the x-rail edge */
    const E2=[Cx,              -sgnz*oyL    ];        /* corner-arc tangent on the z-rail edge */
    const P1=[sgnx*oxL,            -sgnz*(oyL-RcL-L)]; /* x-rail edge, inner end */
    const P2=[sgnx*(oxL-RcL-L),    -sgnz*oyL        ]; /* z-rail edge, inner end */
    const a1=Math.atan2(P1[1]-Py, P1[0]-Px);
    const a2=Math.atan2(P2[1]-Py, P2[0]-Px);
    /* short-way arc helper (same trick the cushions use) */
    const arcTo=(sh,cx,cy,r,from,to)=>{ let d=to-from; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; sh.absarc(cx,cy,r,from,from+d,d<0); };
    const angC=(pt)=>Math.atan2(pt[1]-Cy, pt[0]-Cx);
    const sec=new THREE.Shape();
    sec.moveTo(P1[0],P1[1]);
    sec.lineTo(E1[0],E1[1]);
    arcTo(sec, Cx,Cy, RcL, angC(E1), angC(E2));       /* the wood's rounded corner, in chrome */
    sec.lineTo(P2[0],P2[1]);
    sec.lineTo(Px+rIn*Math.cos(a2), Py+rIn*Math.sin(a2));
    arcTo(sec, Px,Py, rIn, a2, a1);                   /* pocket-shaped inner cutout */
    sec.closePath();
    const capGeo=new THREE.ExtrudeGeometry(sec, {depth:0.020, bevelEnabled:true,
      bevelThickness:0.004, bevelSize:0.0035, bevelSegments:2, curveSegments:28});
    const cap=new THREE.Mesh(capGeo, chromeMat);
    /* a chunky polished corner block standing proud of the rail (~2cm) */
    cap.rotation.x=-Math.PI/2; cap.position.y=railH-0.005;
    cap.castShadow=true; tableGroup.add(cap);
  });
  /* (the slim chrome trim line that used to run along the rail's top edge was removed -
     it sat flush with the rail top and z-fought with it, reading as a glitchy sliver
     'peaking through' the wood and a sharp L where the two bars met at each corner) */

  /* skirt + legs + floor - the head-end face carries a windowed ball-return gallery */
  /* skirt: rounded corners matching the rail ring above - no sharp timber
     edge pokes out under the corner caps - with a notch left for the gallery */
  const sx=ox-0.006, sy=oy-0.006, sR=0.094, GWn=0.51;   /* concentric with the rail ring corners */
  const ss=new THREE.Shape();
  ss.moveTo(sx, -(sy-sR)); ss.lineTo(sx, sy-sR);
  ss.absarc(sx-sR,  sy-sR, sR, 0, Math.PI/2, false);
  ss.lineTo(-(sx-sR), sy);
  ss.absarc(-(sx-sR), sy-sR, sR, Math.PI/2, Math.PI, false);
  ss.lineTo(-sx, GWn);
  ss.lineTo(-sx+0.105, GWn); ss.lineTo(-sx+0.105, -GWn); ss.lineTo(-sx, -GWn);
  ss.lineTo(-sx, -(sy-sR));
  ss.absarc(-(sx-sR), -(sy-sR), sR, Math.PI, Math.PI*1.5, false);
  ss.lineTo(sx-sR, -sy);
  ss.absarc(sx-sR, -(sy-sR), sR, Math.PI*1.5, Math.PI*2, false);
  ss.closePath();
  /* open a real cavity through the cabinet under each pocket - otherwise the solid skirt
     top shows up the pocket as a brown wooden floor instead of a dark hole. Every pocket
     centre sits well inside the skirt footprint, so these never break the outer edge. */
  POCKETS.forEach(p=>{ const h=new THREE.Path();
    h.absarc(p.vpos.x, -p.vpos.z, p.vr*0.98, 0, Math.PI*2, true); ss.holes.push(h); });
  const skirtGeo=new THREE.ExtrudeGeometry(ss, {depth:0.17, bevelEnabled:false, curveSegments:18});
  (function(){ const uv=skirtGeo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*0.42, uv.getY(i)*0.42);
    uv.needsUpdate=true; })();
  const skirt=new THREE.Mesh(skirtGeo, woodMat);
  skirt.rotation.x=-Math.PI/2; skirt.position.y=-0.215;
  skirt.castShadow=true; skirt.receiveShadow=true; tableGroup.add(skirt);
  /* the polished accent carries right down the base: chrome quarter-shells
     wrapping each rounded corner of the cabinet */
  [[1,1,0],[1,-1,Math.PI/2],[-1,-1,Math.PI],[-1,1,Math.PI*1.5]].forEach(([qx,qz,th])=>{
    const strip=new THREE.Mesh(new THREE.CylinderGeometry(sR+0.0035, sR+0.0035, 0.172, 16, 1, true, th, Math.PI/2), chromeMat);
    strip.position.set(qx*(sx-sR), -0.1325, qz*(sy-sR));
    tableGroup.add(strip);
  });
  /* frame pieces complete the head face, leaving a slim viewing window */
  const gfx=-(ox-0.006)+0.0525, GW=0.51;              /* framing sits in the skirt notch at the new face */
  const gtop=new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.0375, TABLE.H+2*ro), woodMat);
  gtop.position.set(gfx,-0.06375,0); gtop.castShadow=true; tableGroup.add(gtop);
  const gbot=new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.0325, TABLE.H+2*ro), woodMat);
  gbot.position.set(gfx,-0.19875,0); gbot.castShadow=true; tableGroup.add(gbot);
  const gsideW=(H2+ro)-GW;
  [[-1],[1]].forEach(([sg])=>{
    const gs=new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.10, gsideW), woodMat);
    gs.position.set(gfx,-0.1325, sg*(GW+gsideW/2)); gs.castShadow=true; tableGroup.add(gs);
  });
  const legGeo=new THREE.CylinderGeometry(0.055,0.075,0.62,10);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(s=>{ const leg=new THREE.Mesh(legGeo, woodMat);
    leg.position.set(s[0]*(W2-0.08), -0.5, s[1]*(H2-0.04)); leg.castShadow=true; tableGroup.add(leg);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.09,0.03,10), brassMat);
    foot.position.set(leg.position.x,-0.8,leg.position.z); tableGroup.add(foot); });
  const floor=new THREE.Mesh(new THREE.CircleGeometry(15,64),
    new THREE.MeshStandardMaterial({color:0x0f0b07, map:makePlankTexture(), roughness:0.85, metalness:0.04, dithering:true}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-0.815; floor.receiveShadow=true; scene.add(floor);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(TABLE.W+2.0,TABLE.H+2.0),
    new THREE.MeshStandardMaterial({color:0x1b0d11, map:makeRugTexture(), roughness:1, dithering:true}));
  rug.rotation.x=-Math.PI/2; rug.position.y=-0.81; rug.receiveShadow=true; scene.add(rug);
  floorMat=floor.material; rugMat=rug.material;   /* Graphics.apply lifts these in high mode so the textures read */
  Graphics.floorTone();

  /* ---- room shell: a wooden ceiling well above, and dark wood-panelled walls
     wrapping the table, bar and lounge - grounds the space with depth. Kept dim;
     the fog fades them so they read as a room without stealing the dark mood.
     The back wall sits FLUSH behind the bar's back panel (bar group z=-3.6, panel
     back face ≈ -4.24) so there's no void between the wall and the bar. ---- */
  const RX=6.6, FZ=5.4, BZ=-4.27, ceilY=2.95, baseY=-0.815;
  const roomDepth=FZ-BZ, roomCz=(FZ+BZ)/2;
  ROOM_CEIL_Y=ceilY;                              /* camera collision cap (free-walk mode) */
  ROOM_RX=RX; ROOM_BZ=BZ; ROOM_FZ=FZ; ROOM_FLOOR_Y=baseY;   /* wall bounds for free-cam collision */
  /* first-person walk obstacles (world AABBs): the pool table, the bar+stools (z=-3.6),
     and the lounge table+chairs (~2.85,-2.1) - so you walk AROUND them, not through */
  WALK_BLOCKS=[
    {x0:-(W2+0.30), x1:(W2+0.30), z0:-(H2+0.30), z1:(H2+0.30)},
    {x0:-1.15, x1:1.75, z0:-4.30, z1:-2.55},
    {x0: 2.10, x1:3.55, z0:-2.85, z1:-1.35}
  ];
  const ceilTex=makePlankTexture(); ceilTex.repeat.set(8,7);
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(2*RX,roomDepth),
    new THREE.MeshStandardMaterial({color:0x281c14, map:ceilTex, roughness:0.92, metalness:0.03, side:THREE.DoubleSide, dithering:true}));
  ceil.rotation.x=Math.PI/2; ceil.position.set(0,ceilY,roomCz); ceil.receiveShadow=true; scene.add(ceil);
  /* a couple of plain beams across the ceiling for a bit of structure */
  const beamMat=new THREE.MeshStandardMaterial({color:0x1c130d, roughness:0.9, map:woodMat.map});
  [-3.0,0,3.0].forEach(bz=>{ const beam=new THREE.Mesh(new THREE.BoxGeometry(2*RX,0.14,0.18), beamMat);
    beam.position.set(0, ceilY-0.08, bz); scene.add(beam); });
  const wallH=ceilY-baseY;
  /* dark walnut wainscot: the rich grain texture mapped finely, used ALSO as a bump map
     so the boards/grain catch the lamplight in relief, with a touch of gloss + a faint
     env reflection so the wood reads as polished panelling rather than a flat painted
     plane. Base tone lifted a little so the grain is actually visible in the gloom. */
  const wallTex=makePlankTexture(); wallTex.repeat.set(9,5);
  const wallBump=makePlankTexture(); wallBump.repeat.set(9,5);
  const wallMat=new THREE.MeshStandardMaterial({color:0x33200f, map:wallTex,
    bumpMap:wallBump, bumpScale:0.022, roughness:0.6, metalness:0.22,
    envMap:envMap, envMapIntensity:0.45, side:THREE.DoubleSide, dithering:true});
  /* [x, z, width, yaw] - back wall (behind the bar) and the two side walls. The FRONT
     (+z) wall, opposite the bar, is built separately below, framed around a window. */
  [[0,BZ,2*RX,0],[-RX,roomCz,roomDepth,Math.PI/2],[RX,roomCz,roomDepth,Math.PI/2]].forEach(([x,z,w,ry])=>{
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(w,wallH), wallMat);
    wall.position.set(x, baseY+wallH/2, z); wall.rotation.y=ry; wall.receiveShadow=true; scene.add(wall);
  });
  buildWindowWall(FZ, RX, baseY, ceilY, wallMat);
  buildRoomDecor(RX, BZ, FZ, baseY, ceilY);

  /* hanging brass lamp */
  const lamp=new THREE.Group();
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.024,0.06), brassMat); lamp.add(bar);
  lampPositions.forEach(x=>{
    /* green enamel shade, double-sided so the interior reads green with the bulb
       glowing inside - matching the bar's hanging lamp (no warm-white liner cone) */
    const shade=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.16,0.13,20,1,true),
      new THREE.MeshStandardMaterial({color:0x1c5038, roughness:0.5, metalness:0.3, side:THREE.DoubleSide}));
    shade.position.set(x,-0.085,0); lamp.add(shade);
    /* a proper incandescent bulb: warm glass envelope that glows (emissive →
       catches bloom) with a little brass cap, hung just inside the shade mouth */
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.03,16,14),
      new THREE.MeshStandardMaterial({color:0x3a2a12, emissive:0xffd28a, emissiveIntensity:2.1, roughness:0.25, metalness:0}));
    bulb.position.set(x,-0.122,0); lamp.add(bulb);
    const filament=new THREE.Mesh(new THREE.SphereGeometry(0.013,8,6),
      new THREE.MeshBasicMaterial({color:0xfff3d6})); filament.position.set(x,-0.122,0); lamp.add(filament);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.017,0.022,12), brassMat);
    cap.position.set(x,-0.093,0); lamp.add(cap);
    /* the light actually emits from the bulb (a warm local pool under the shade);
       flickers with the rest of the lamps */
    const bp=new THREE.PointLight(0xffc680, 0.42, 2.0, 2); bp.position.set(x,-0.15,0); lamp.add(bp);
    flickerLights.push(bp);
  });
  [-0.8,0.8].forEach(x=>{ const cord=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,1.4,6), darkMat);
    cord.position.set(x,0.7,0); lamp.add(cord); });
  lamp.position.y=1.66; scene.add(lamp);

  /* drifting dust in the lamplight: thinned out over the table, with a little haze
     over the bar and just a few motes around the lounge table */
  const dustMat=new THREE.PointsMaterial({color:0xe8c987,size:0.011,map:roundParticleTex,
    transparent:true,opacity:0.45,alphaTest:0.02,blending:THREE.AdditiveBlending,depthWrite:false});
  function makeDust(count, cx,cy,cz, sx,sy,sz){
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){ pos[i*3]=cx+(Math.random()-0.5)*sx; pos[i*3+1]=cy+Math.random()*sy; pos[i*3+2]=cz+(Math.random()-0.5)*sz; }
    const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(g, dustMat); scene.add(pts); dustClouds.push(pts); return pts;
  }
  dust = makeDust(110, 0,0.05,0,   2.6,1.5,1.6);     /* over the table (reduced from 240) */
  makeDust(70, 0.3,0.4,-3.45,      2.4,1.1,0.8);     /* haze over the bar */
  makeDust(22, 2.85,0.3,-2.1,      0.95,0.85,0.95);  /* a few around the lounge table */
}
let dust=null;
let dustClouds=[];
let windowRain=null;
let glassRain=null;
let ceilingFan=null;
let clockHands=null;

/* ===== front-wall window (opposite the bar): a rainy night outside, moonlight in =====
   Exterior layers are stacked at increasing depth behind the glass (real 3D parallax as
   the camera pans) and drawn unfogged so they glow against the dark room. */
function buildWindowWall(wz, RX, baseY, ceilY, wallMat){
  const xc=0, yc=0.86, hw=0.52, hh=0.62;          /* window centre + half-size (x, y) - dropped to player eye height */
  const xL=-RX, xR=RX, yB=baseY, yT=ceilY;

  /* the +z (front) wall as four panels framing the opening */
  const panel=(xCen,yCen,xSz,ySz)=>{ if(xSz<=0.002||ySz<=0.002) return;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(xSz,ySz), wallMat);
    m.position.set(xCen,yCen,wz); m.receiveShadow=true; scene.add(m); };
  panel((xL+(xc-hw))/2, (yB+yT)/2, (xc-hw)-xL, yT-yB);     /* left of window  */
  panel(((xc+hw)+xR)/2, (yB+yT)/2, xR-(xc+hw), yT-yB);     /* right of window */
  panel(xc, (yB+(yc-hh))/2, 2*hw, (yc-hh)-yB);             /* under */
  panel(xc, ((yc+hh)+yT)/2, 2*hw, yT-(yc+hh));             /* over  */

  /* timber + brass frame with a cross muntin (paned, period look), just inside the room */
  const frMat=new THREE.MeshStandardMaterial({color:0x29190f, roughness:0.6, map:woodMat.map});
  const fw=0.06;
  const bar=(xCen,yCen,xSz,ySz)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(xSz,ySz,0.12), frMat);
    b.position.set(xCen,yCen,wz-0.02); b.castShadow=true; b.receiveShadow=true; scene.add(b); };
  bar(xc, yc-hh, 2*hw+2*fw, fw);     /* sill */
  bar(xc, yc+hh, 2*hw+2*fw, fw);     /* head */
  bar(xc-hw, yc, fw, 2*hh+2*fw);     /* left jamb  */
  bar(xc+hw, yc, fw, 2*hh+2*fw);     /* right jamb */
  bar(xc, yc, 2*hw, 0.022);          /* muntin (horizontal) */
  bar(xc, yc, 0.022, 2*hh);          /* muntin (vertical)   */
  const sill=new THREE.Mesh(new THREE.BoxGeometry(2*hw+2*fw,0.03,0.16), brassMat);
  sill.position.set(xc, yc-hh-0.03, wz-0.07); scene.add(sill);

  /* faint glass */
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(2*hw,2*hh),
    new THREE.MeshPhysicalMaterial({color:0xbcd4ec, transparent:true, opacity:0.07,
      roughness:0.05, metalness:0, side:THREE.DoubleSide, depthWrite:false}));
  glass.position.set(xc,yc,wz-0.005); glass.renderOrder=2; scene.add(glass);

  /* rain streaks running down the GLASS: a streak texture coplanar with the glass,
     scrolled downward in the loop */
  const grCv=document.createElement('canvas'); grCv.width=128; grCv.height=256;
  (function(){ const x=grCv.getContext('2d'); x.clearRect(0,0,128,256);
    for(let i=0;i<24;i++){ const sx=Math.random()*128, sy=Math.random()*256, len=24+Math.random()*120;
      const g=x.createLinearGradient(sx,sy,sx,sy+len);
      g.addColorStop(0,'rgba(205,224,248,0)'); g.addColorStop(0.5,'rgba(215,232,250,0.55)'); g.addColorStop(1,'rgba(205,224,248,0)');
      x.strokeStyle=g; x.lineWidth=0.7+Math.random()*1.3; x.beginPath();
      x.moveTo(sx,sy); x.lineTo(sx+(Math.random()-0.5)*5, sy+len); x.stroke(); }
    for(let i=0;i<46;i++){ x.fillStyle='rgba(218,232,250,'+(0.12+Math.random()*0.3)+')';
      x.beginPath(); x.arc(Math.random()*128, Math.random()*256, 0.7+Math.random()*1.5,0,7); x.fill(); }
  })();
  const grTex=new THREE.CanvasTexture(grCv); grTex.wrapS=grTex.wrapT=THREE.RepeatWrapping; grTex.repeat.set(1.4,1.4);
  glassRain=new THREE.Mesh(new THREE.PlaneGeometry(2*hw-0.02,2*hh-0.02),
    new THREE.MeshBasicMaterial({map:grTex, transparent:true, opacity:0.45, fog:false,
      depthWrite:false, blending:THREE.AdditiveBlending}));
  glassRain.position.set(xc,yc,wz-0.012); glassRain.renderOrder=4; glassRain.userData.tex=grTex; scene.add(glassRain);

  /* ---- exterior layers (unfogged), stacked deep for a layered, distant cityscape ---- */
  const faceRoom=Math.PI;   /* planes outside (+z) face back into the room (-z) */
  /* night sky backdrop, far away with stars */
  const skyCv=document.createElement('canvas'); skyCv.width=512; skyCv.height=384;
  (function(){ const x=skyCv.getContext('2d');
    const g=x.createLinearGradient(0,0,0,384);
    g.addColorStop(0,'#0b1530'); g.addColorStop(0.55,'#0a1126'); g.addColorStop(1,'#06090f');
    x.fillStyle=g; x.fillRect(0,0,512,384);
    for(let i=0;i<170;i++){ x.fillStyle='rgba(205,222,255,'+(0.12+Math.random()*0.5)+')';
      x.fillRect(Math.random()*512, Math.random()*260, Math.random()<0.15?1.4:0.8, 0.8); } })();
  const skyTex=new THREE.CanvasTexture(skyCv); skyTex.encoding=THREE.sRGBEncoding;
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(22,12),
    new THREE.MeshBasicMaterial({map:skyTex, fog:false}));
  sky.position.set(xc, yc+0.8, wz+9.0); sky.rotation.y=faceRoom; scene.add(sky);

  /* a textured moon (soft maria + craters, limb-darkened), high enough to clear the
     rooftops; toneMapped off so it survives ACES and the bloom gives it a gentle glow */
  const moonCv=document.createElement('canvas'); moonCv.width=moonCv.height=128;
  (function(){ const x=moonCv.getContext('2d'); x.clearRect(0,0,128,128);
    const g=x.createRadialGradient(54,50,8,64,64,64);
    g.addColorStop(0,'#f3f3ec'); g.addColorStop(0.7,'#d6d8de'); g.addColorStop(1,'#b3b7c2');
    x.fillStyle=g; x.beginPath(); x.arc(64,64,62,0,7); x.fill();
    x.fillStyle='rgba(150,156,170,0.45)';
    [[80,54,16],[52,80,20],[86,86,10],[46,48,9]].forEach(([cx,cy,r])=>{ x.beginPath(); x.arc(cx,cy,r,0,7); x.fill(); });
    [[40,44,5],[94,62,4],[70,94,6],[58,38,3],[100,84,3]].forEach(([cx,cy,r])=>{
      x.fillStyle='rgba(138,144,158,0.55)'; x.beginPath(); x.arc(cx,cy,r,0,7); x.fill();
      x.strokeStyle='rgba(245,245,240,0.45)'; x.lineWidth=1; x.beginPath(); x.arc(cx,cy,r,0,7); x.stroke(); });
  })();
  const moonTex=new THREE.CanvasTexture(moonCv);
  const moon=new THREE.Mesh(new THREE.CircleGeometry(0.185,40),
    new THREE.MeshBasicMaterial({map:moonTex, transparent:true, fog:false, toneMapped:false}));
  moon.position.set(xc+0.32, yc+0.72, wz+7.5); moon.rotation.y=faceRoom; moon.renderOrder=1; scene.add(moon);

  /* a city skyline canvas (buildings + lit windows); reused at two depths for layering.
     Buildings kept lower so the moon clears them. */
  const cityCanvas=(wide,tall,density,tint)=>{
    const cv=document.createElement('canvas'); cv.width=wide; cv.height=tall; const x=cv.getContext('2d');
    x.clearRect(0,0,wide,tall);
    let px=-10; while(px<wide){ const w=18+Math.random()*46, h=tall*(0.18+Math.random()*0.36);
      x.fillStyle=tint; x.fillRect(px, tall-h, w, h);
      for(let wy=tall-h+8; wy<tall-6; wy+=13){ for(let wk=px+4; wk<px+w-4; wk+=10){
        if(Math.random()<density){ x.fillStyle='rgba(255,205,135,0.85)'; x.fillRect(wk,wy,3,5); x.fillStyle=tint; } } }
      px+=w+2; }
    const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t;
  };
  /* far skyline (smaller, fainter, more distant) */
  const far=new THREE.Mesh(new THREE.PlaneGeometry(18,4.5),
    new THREE.MeshBasicMaterial({map:cityCanvas(512,150,0.10,'#070a12'), transparent:true, fog:false, depthWrite:false, opacity:0.85}));
  far.position.set(xc, yc-0.4, wz+6.0); far.rotation.y=faceRoom; scene.add(far);
  /* nearer rooftops (bigger, darker, more lit windows) */
  const near=new THREE.Mesh(new THREE.PlaneGeometry(12,3.2),
    new THREE.MeshBasicMaterial({map:cityCanvas(512,160,0.20,'#04060b'), transparent:true, fog:false, depthWrite:false}));
  near.position.set(xc, yc-0.7, wz+3.4); near.rotation.y=faceRoom; scene.add(near);

  /* light rain falling outside, between the glass and the rooftops */
  const rainCv=document.createElement('canvas'); rainCv.width=8; rainCv.height=32;
  (function(){ const x=rainCv.getContext('2d'); const g=x.createLinearGradient(0,0,0,32);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.5,'rgba(220,235,255,0.85)');
    g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(3,0,2,32); })();
  const rainTex=new THREE.CanvasTexture(rainCv);
  const RN=140, rp=new Float32Array(RN*3);
  for(let i=0;i<RN;i++){ rp[i*3]=xc+(Math.random()-0.5)*4.0; rp[i*3+1]=yB+Math.random()*(yT-yB+1.6);
    rp[i*3+2]=wz+0.4+Math.random()*2.6; }
  const rgeo=new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rp,3));
  windowRain=new THREE.Points(rgeo, new THREE.PointsMaterial({color:0xcfe0f5, size:0.06, map:rainTex,
    transparent:true, opacity:0.45, fog:false, depthWrite:false, blending:THREE.AdditiveBlending}));
  windowRain.userData={yTop:yT+1.6, yBot:yB-0.2};
  scene.add(windowRain);

  /* a VERY subtle cool wash through the window - no obvious light source, no shadows.
     Just a faint hint of moonlight near the glass so the window doesn't read as a sticker. */
  const moonLight=new THREE.SpotLight(0xb7ccf0, 0.3, 12, 0.7, 0.6, 1.5);
  moonLight.position.set(xc+0.3, yc+1.2, wz+0.4);
  moonLight.target.position.set(xc-0.3, baseY+0.05, 1.4);
  moonLight.castShadow=false;
  scene.add(moonLight); scene.add(moonLight.target);
}

/* ===== room decor: door + coat/umbrella stand, wall cue rack + chalk, ceiling fan,
   Art-Deco posters, and a working wall clock ===== */
function buildRoomDecor(RX, BZ, FZ, baseY, ceilY){
  const woodA=new THREE.MeshStandardMaterial({color:0x2c1a0e, roughness:0.5, metalness:0.05, map:woodMat.map});
  const woodB=new THREE.MeshStandardMaterial({color:0x40291a, roughness:0.55, map:woodMat.map});

  /* a brass wall sconce: a mount plate + arm bracket off the wall + a cone shade + bulb,
     with a STEADY warm point light (no flicker). wallX = the wall plane it brackets from;
     intensity tunes how bright it reads. */
  const brassSconceMat=new THREE.MeshStandardMaterial({color:0xc9a35c, roughness:0.35, metalness:0.9, envMap:envMap, envMapIntensity:1.0, side:THREE.DoubleSide});
  /* brackets from an x-wall by default; pass axis='z' to bracket from a z-wall (the
     window wall), with `wall` then being the z-plane. Same shade/bulb/light either way. */
  const sconce=(x,y,z, wall, intensity, axis)=>{
    axis=axis||'x';
    const plate=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.02,14), brassMat);
    if(axis==='x'){
      plate.rotation.z=Math.PI/2; plate.position.set(wall, y, z); scene.add(plate);
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011, Math.max(0.04,Math.abs(wall-x)), 8), brassMat);
      arm.rotation.z=Math.PI/2; arm.position.set((x+wall)/2, y-0.012, z); scene.add(arm);
    } else {
      plate.rotation.x=Math.PI/2; plate.position.set(x, y, wall); scene.add(plate);
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011, Math.max(0.04,Math.abs(wall-z)), 8), brassMat);
      arm.rotation.x=Math.PI/2; arm.position.set(x, y-0.012, (z+wall)/2); scene.add(arm);
    }
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.026,0.10,16,1,true), brassSconceMat);
    cup.position.set(x,y,z); scene.add(cup);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.032,12,10),
      new THREE.MeshStandardMaterial({color:0x3a2a14, emissive:0xffcf8a, emissiveIntensity:1.35, roughness:0.4}));
    bulb.position.set(x,y+0.03,z); scene.add(bulb);
    const pl=new THREE.PointLight(0xffcf94, intensity, 5.3, 2); pl.position.set(x,y+0.03,z); scene.add(pl);
  };

  /* ---- a wooden door on the far (-x) wall, by the trough/head end ---- */
  const dx=-RX+0.03, dz=-0.2, dh=2.05, dw=0.94;
  const leaf=new THREE.Mesh(new THREE.BoxGeometry(0.05, dh, dw), woodA);
  leaf.position.set(dx, baseY+dh/2, dz); leaf.castShadow=true; leaf.receiveShadow=true; scene.add(leaf);
  /* raised Art-Deco panels on the leaf */
  [[0.62,0.62],[-0.04,0.62],[-0.66,0.30]].forEach(([yo,ph])=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.012, ph, dw*0.62), woodB);
    p.position.set(dx+0.032, baseY+dh/2+yo, dz); scene.add(p);
  });
  /* casing */
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.11,dw+0.24), woodB);
  lintel.position.set(dx+0.02, baseY+dh+0.05, dz); lintel.castShadow=true; scene.add(lintel);
  [[-1],[1]].forEach(([s])=>{ const j=new THREE.Mesh(new THREE.BoxGeometry(0.12,dh+0.11,0.12), woodB);
    j.position.set(dx+0.02, baseY+(dh+0.11)/2, dz+s*(dw/2+0.06)); j.castShadow=true; scene.add(j); });
  /* brass knob + a small fanlight bar */
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.032,14,12), brassMat);
  knob.position.set(dx+0.05, baseY+1.02, dz+dw/2-0.10); scene.add(knob);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(0.01,0.14,0.05), brassMat);
  plate.position.set(dx+0.04, baseY+1.02, dz+dw/2-0.10); scene.add(plate);

  /* ---- wall cue rack (on the +x wall) holding two cues + a chalk cube on the rail ---- */
  const rx=RX-0.04;
  const board=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.55,0.46), woodB); board.position.set(rx,0.62,0); board.castShadow=true; scene.add(board);
  const topH=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.05,0.46), woodA); topH.position.set(rx-0.05,1.30,0); scene.add(topH);
  const botH=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.06,0.46), woodA); botH.position.set(rx-0.07,-0.07,0); scene.add(botH);
  const cueShaftMat=new THREE.MeshStandardMaterial({color:0x6e4a28, roughness:0.4, map:woodMat.map});
  [-0.13,0.13].forEach(cz=>{
    const cue=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.011,1.5,10), cueShaftMat); shaft.position.y=0.62; cue.add(shaft);
    const butt =new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.014,0.34,10), darkMat); butt.position.y=-0.05; cue.add(butt);
    const tip  =new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.012,8), new THREE.MeshStandardMaterial({color:0x6f8fb0})); tip.position.y=1.375; cue.add(tip);
    cue.position.set(rx-0.085, 0, cz); cue.rotation.x=0.02; scene.add(cue);
  });
  /* two billiard chalks on the +z rail: chalk body + paper wrapper + a worn, powdery
     concave top where the cue tip rubs - in two different colours */
  const railTopY=0.052, ro=TABLE.RAIL, railZ=H2+TABLE.CUSH_D+ro*0.45;
  const makeChalk=(bodyCol, wrapCol)=>{
    const g=new THREE.Group(); const s=0.027;
    const body=new THREE.Mesh(new THREE.BoxGeometry(s,s*0.96,s),
      new THREE.MeshStandardMaterial({color:bodyCol, roughness:0.97})); body.position.y=s*0.48; body.castShadow=true; g.add(body);
    const wrap=new THREE.Mesh(new THREE.BoxGeometry(s*1.05,s*0.54,s*1.05),
      new THREE.MeshStandardMaterial({color:wrapCol, roughness:0.7})); wrap.position.y=s*0.30; g.add(wrap);
    /* the worn cup: a shallow concave dish, lighter + powdery, recessed into the top */
    const dish=new THREE.Mesh(new THREE.SphereGeometry(s*0.46,16,10,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshStandardMaterial({color:new THREE.Color(bodyCol).lerp(new THREE.Color(0xffffff),0.4), roughness:1, side:THREE.DoubleSide}));
    dish.scale.set(1,0.5,1); dish.rotation.x=Math.PI; dish.position.y=s*0.95; g.add(dish);
    return g;
  };
  /* two billiard chalks (supplied model), resting flat on the rail with the worn cup
     facing up; falls back to the procedural chalk when the model is unavailable */
  const placeChalk=(x,z,yaw,bodyCol,wrapCol)=>{
    if(typeof Models!=='undefined' && Models.has('chalk')){
      Models.place('chalk', tableGroup, x, railTopY+0.001, z, 0.028, {by:'width', yaw});
    } else {
      const c=makeChalk(bodyCol, wrapCol); c.position.set(x, railTopY+0.001, z); c.rotation.y=yaw; tableGroup.add(c);
    }
  };
  const placeChalks=()=>{
    placeChalk(0.585, railZ,        0.4, 0x2b5d86, 0x16313f);
    placeChalk(0.655, railZ+0.028, -0.7, 0x2f6b46, 0x5a2b30);
  };
  /* the chalk model streams in with the other props - wait for just that model so we
     use the GLB rather than the procedural fallback (buildTable runs before models finish) */
  if(typeof Models!=='undefined') Models.ready('chalk').then(placeChalks); else placeChalks();

  /* ---- ceiling fan (large, faster spin), away from the table lamp ---- */
  const fan=new THREE.Group(); fan.position.set(0, ceilY-0.32, 2.7);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.34,8), brassMat); rod.position.y=0.19; fan.add(rod);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.14,0.09,20), brassMat); fan.add(hub);
  const fanLight=new THREE.Mesh(new THREE.SphereGeometry(0.065,16,12),
    new THREE.MeshStandardMaterial({color:0x3a2a14, emissive:0xffd28a, emissiveIntensity:1.3})); fanLight.position.y=-0.08; fan.add(fanLight);
  const blades=new THREE.Group();
  const bladeMat=new THREE.MeshStandardMaterial({color:0x35210f, roughness:0.55, map:woodMat.map});
  for(let i=0;i<5;i++){ const arm=new THREE.Group(); arm.rotation.y=(i/5)*Math.PI*2;
    const iron=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.01,0.05), brassMat); iron.position.set(0.20,0,0); arm.add(iron);
    const blade=new THREE.Mesh(new THREE.BoxGeometry(0.98,0.016,0.22), bladeMat);
    blade.position.set(0.66,-0.02,0); blade.rotation.z=0.13; arm.add(blade); blades.add(arm); }
  fan.add(blades); scene.add(fan); ceilingFan=blades;

  /* ---- Art-Deco posters / paintings on the walls ---- */
  const sunburst=()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=340; const x=cv.getContext('2d');
    x.fillStyle='#1c2a30'; x.fillRect(0,0,256,340);
    x.save(); x.translate(128,150);
    for(let i=0;i<24;i++){ x.rotate(Math.PI*2/24); x.fillStyle=i%2?'#c79a3a':'#163038'; x.beginPath(); x.moveTo(0,0); x.lineTo(20,-220); x.lineTo(-20,-220); x.closePath(); x.fill(); }
    x.restore(); x.fillStyle='#0d1418'; x.beginPath(); x.arc(128,150,46,0,7); x.fill();
    x.fillStyle='#e7c668'; x.font='bold 26px Georgia'; x.textAlign='center'; x.fillText('THE',128,300); x.fillText('GILDED',128,322);
    const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t; };
  const chevrons=()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=340; const x=cv.getContext('2d');
    x.fillStyle='#2a1820'; x.fillRect(0,0,256,340);
    for(let r=0;r<10;r++){ x.strokeStyle=r%2?'#caa64a':'#7a2b30'; x.lineWidth=10;
      x.beginPath(); x.moveTo(20,40+r*30); x.lineTo(128,10+r*30); x.lineTo(236,40+r*30); x.stroke(); }
    x.fillStyle='#0c0a0d'; x.fillRect(40,250,176,70); x.fillStyle='#e7c668'; x.font='bold 22px Georgia'; x.textAlign='center'; x.fillText('JAZZ NIGHTLY',128,292);
    const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t; };
  /* improved framed artworks for the door (-x) wall */
  const decoSun=()=>{ const cv=document.createElement('canvas'); cv.width=300; cv.height=400; const x=cv.getContext('2d');
    const g=x.createLinearGradient(0,0,0,400); g.addColorStop(0,'#26343c'); g.addColorStop(0.5,'#3c4c55'); g.addColorStop(1,'#18222a'); x.fillStyle=g; x.fillRect(0,0,300,400);
    x.save(); x.translate(150,182);
    for(let i=0;i<40;i++){ x.rotate(Math.PI*2/40); x.fillStyle=i%2?'rgba(227,181,82,0.45)':'rgba(227,181,82,0)'; x.beginPath(); x.moveTo(-4,-78); x.lineTo(4,-78); x.lineTo(2,-205); x.lineTo(-2,-205); x.closePath(); x.fill(); } x.restore();
    x.fillStyle='#e3b552'; x.beginPath(); x.arc(150,182,64,0,7); x.fill();
    x.fillStyle='#15242b'; x.beginPath(); x.moveTo(0,300); for(let xx=0;xx<=300;xx+=15) x.lineTo(xx,292+Math.sin(xx*0.05)*14); x.lineTo(300,400); x.lineTo(0,400); x.closePath(); x.fill();
    x.strokeStyle='#caa64a'; x.lineWidth=12; x.strokeRect(14,14,272,372);
    x.fillStyle='#ecdca6'; x.font='bold 30px Georgia'; x.textAlign='center'; x.fillText('RIVIERA',150,366);
    const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t; };
  const decoFan=()=>{ const cv=document.createElement('canvas'); cv.width=300; cv.height=400; const x=cv.getContext('2d');
    x.fillStyle='#1d2a2e'; x.fillRect(0,0,300,400);
    x.save(); x.translate(150,374);
    for(let r=252;r>34;r-=24){ x.beginPath(); x.arc(0,0,r,Math.PI,Math.PI*2); x.lineWidth=13; x.strokeStyle=((r/24|0)%2)?'#2f7d72':'#caa64a'; x.stroke(); } x.restore();
    x.fillStyle='#0d1416'; x.beginPath(); x.arc(150,374,34,Math.PI,Math.PI*2); x.fill();
    x.strokeStyle='#caa64a'; x.lineWidth=12; x.strokeRect(14,14,272,372);
    const t=new THREE.CanvasTexture(cv); t.encoding=THREE.sRGBEncoding; return t; };
  const poster=(x,y,z,ry,w,h,tex)=>{ const g=new THREE.Group();
    const art=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:tex, roughness:0.7}));
    g.add(art);
    const fr=new THREE.Mesh(new THREE.BoxGeometry(w+0.06,h+0.06,0.03), brassMat); fr.position.z=-0.02; g.add(fr);
    g.position.set(x,y,z); g.rotation.y=ry; g.traverse(o=>o.castShadow=false); scene.add(g); };
  /* +x wall: a poster either side of the cue rack/clock, each aligned under its sconce */
  poster(RX-0.045, 1.5, -1.7, -Math.PI/2, 0.6, 0.8, sunburst());
  poster(RX-0.045, 1.5,  1.7, -Math.PI/2, 0.6, 0.8, chevrons());
  sconce(RX-0.20, 1.96, -1.7, RX, 0.9);
  sconce(RX-0.20, 1.62,  0.0, RX, 1.5);     /* brightest - lights the cue rack + clock */
  sconce(RX-0.20, 1.96,  1.7, RX, 0.9);
  /* -x (door) wall: two improved framed artworks, each aligned under its sconce */
  poster(-RX+0.045, 1.46,  1.75, Math.PI/2, 0.66, 0.92, decoSun());
  poster(-RX+0.045, 1.46, -1.65, Math.PI/2, 0.66, 0.92, decoFan());
  sconce(-RX+0.20, 1.98,  1.75, -RX, 0.9);
  sconce(-RX+0.20, 1.98, -1.65, -RX, 0.9);

  /* ---- dartboard cabinet (supplied model) on the window (+z) wall, to the right of
     the centred window, flush to the wall, with a small dim picture light over the
     board (just slightly illuminating, as requested). Deferred until the prop models
     finish loading (buildTable runs before that). ---- */
  if(typeof Models!=='undefined') Models.ready('dartcab').then(()=>{
    if(!Models.has('dartcab')) return;
    const DARTCAB_YAW=Math.PI;                   /* spin 180° so the board + open doors face the room (-z) */
    const dcH=1.05;                              /* wall-mounted dartboard cabinet height (m) */
    const dcX=-2.25;                             /* right of the window (facing the wall, +x is left) */
    const dcCenterY=baseY+1.40;                  /* mounted on the wall, board around chest height */
    const dg=new THREE.Group();
    const cab=Models.place('dartcab', dg, 0, 0, 0, dcH, {noOrient:true, yaw:DARTCAB_YAW});
    if(cab){
      const bb=new THREE.Box3().setFromObject(cab);   /* dg still at origin: world == local */
      const czPos=FZ-bb.max.z+0.34;                   /* push the back deep INTO the wall plane so it sits flush (no gap); +0.10 deeper toward the wall */
      dg.position.set(dcX, dcCenterY-bb.max.y/2, czPos);   /* mounted on the wall, flush */
      scene.add(dg);
      /* a wall sconce above the cabinet - IDENTICAL to the room's other lamps (same helper),
         bracketed from the +z wall, lighting the dartboard */
      const topY=dcCenterY-bb.max.y/2+bb.max.y;
      sconce(dcX, topY+0.20, FZ-0.20, FZ, 0.95, 'z');
    }
  });

  /* ---- a working wall clock (real time) on the +x wall, aligned over the cue rack;
     dark patinated face + muted brass markings so it blends into the room ---- */
  const cg=new THREE.Group(); cg.position.set(RX-0.05, 2.05, 0.0); cg.rotation.y=-Math.PI/2;
  const faceCv=document.createElement('canvas'); faceCv.width=256; faceCv.height=256;
  (function(){ const x=faceCv.getContext('2d'); x.fillStyle='#211a12'; x.beginPath(); x.arc(128,128,124,0,7); x.fill();
    x.strokeStyle='#8a7038'; x.fillStyle='#9a7d3e'; x.textAlign='center'; x.textBaseline='middle';
    for(let i=0;i<12;i++){ const a=(i/12)*Math.PI*2 - Math.PI/2; const big=i%3===0;
      x.lineWidth=big?4:2; x.beginPath(); x.moveTo(128+Math.cos(a)*112,128+Math.sin(a)*112); x.lineTo(128+Math.cos(a)*(big?96:104),128+Math.sin(a)*(big?96:104)); x.stroke(); }
    x.font='bold 28px Georgia'; ['XII','III','VI','IX'].forEach((n,k)=>{ const a=(k/4)*Math.PI*2 - Math.PI/2; x.fillText(n,128+Math.cos(a)*80,128+Math.sin(a)*80); });
  })();
  const faceTex=new THREE.CanvasTexture(faceCv); faceTex.encoding=THREE.sRGBEncoding;
  const face=new THREE.Mesh(new THREE.CircleGeometry(0.24,48), new THREE.MeshStandardMaterial({map:faceTex, roughness:0.7})); face.position.z=0.005; cg.add(face);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.245,0.022,14,44), brassMat); cg.add(rim);
  const cback=new THREE.Mesh(new THREE.CylinderGeometry(0.246,0.246,0.05,44), woodB); cback.rotation.x=Math.PI/2; cback.position.z=-0.03; cg.add(cback);
  const mkHand=(len,w,col,zo)=>{ const h=new THREE.Group();
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,len,0.006), new THREE.MeshStandardMaterial({color:col, roughness:0.5, metalness:0.4}));
    m.position.y=len*0.42; h.add(m); h.position.z=0.012+zo; cg.add(h); return h; };
  const hourH=mkHand(0.135,0.014,0x9a7d3e,0), minH=mkHand(0.195,0.010,0x9a7d3e,0.004), secH=mkHand(0.205,0.004,0x7a3a2a,0.008);
  const ccap=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.03,12), brassMat); ccap.rotation.x=Math.PI/2; ccap.position.z=0.026; cg.add(ccap);
  scene.add(cg);
  clockHands={hour:hourH, minute:minH, second:secH};
}
let floorMat=null, rugMat=null;
