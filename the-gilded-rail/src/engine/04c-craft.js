/* Static craftsmanship geometry. Shared materials and merged strand meshes keep
   close-up detail bounded; no per-frame reconstruction or transparent net layers. */
const Craft={
  merge(parts){
    let vertices=0,indices=0;
    parts.forEach(g=>{vertices+=g.attributes.position.count;indices+=g.index.count;});
    const position=new Float32Array(vertices*3),normal=new Float32Array(vertices*3),uv=new Float32Array(vertices*2);
    const index=vertices>65535?new Uint32Array(indices):new Uint16Array(indices);
    let v=0,k=0;
    parts.forEach(g=>{
      position.set(g.attributes.position.array,v*3);normal.set(g.attributes.normal.array,v*3);uv.set(g.attributes.uv.array,v*2);
      for(let i=0;i<g.index.count;i++)index[k++]=g.index.array[i]+v;
      v+=g.attributes.position.count;g.dispose();
    });
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));
    g.setAttribute('normal',new THREE.BufferAttribute(normal,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    g.setIndex(new THREE.BufferAttribute(index,1));g.computeBoundingSphere();return g;
  },
  net(radius){
    const parts=[],strands=20,depth=.112;
    for(const [r,y] of [[radius*.91,-.018],[.033,-.13]]){
      const rim=new THREE.TorusGeometry(r,.0008,5,64);rim.rotateX(Math.PI/2);rim.translate(0,y,0);parts.push(rim);
    }
    for(const handedness of [-1,1])for(let i=0;i<strands;i++){
      const points=[];
      for(let j=0;j<=24;j++){
        const t=j/24,a=i/strands*Math.PI*2+handedness*t*Math.PI*.8;
        const r=radius*.91*(1-t)+.033*t+.003*Math.sin(t*Math.PI);
        points.push(new THREE.Vector3(Math.cos(a)*r,-.018-depth*t,Math.sin(a)*r));
      }
      parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.00065,4,false));
    }
    return this.merge(parts);
  },
  shade(radius,height){
    const geometry=new THREE.LatheGeometry([
      [.13*radius,height*.48],[.19*radius,height*.48],[.22*radius,height*.34],
      [.30*radius,height*.18],[.43*radius,-height*.08],[.65*radius,-height*.34],
      [.9*radius,-height*.47],[radius,-height*.49],[radius,-height*.55],
      [.94*radius,-height*.57],[.86*radius,-height*.5],[.61*radius,-height*.36],
      [.39*radius,-height*.1],[.26*radius,height*.15],[.18*radius,height*.34]
    ].map(([r,y])=>new THREE.Vector2(r,y)),40);
    const outer=[],inner=[],source=geometry.index.array;
    for(let i=0;i<40;i++)for(let j=0;j<14;j++){
      const target=j>=8?inner:outer,offset=(i*14+j)*6;
      for(let k=0;k<6;k++)target.push(source[offset+k]);
    }
    geometry.setIndex(outer.concat(inner));geometry.clearGroups();
    geometry.addGroup(0,outer.length,0);geometry.addGroup(outer.length,inner.length,1);
    return geometry;
  },
  clockDial(image){
    const cv=document.createElement('canvas');cv.width=cv.height=768;const x=cv.getContext('2d');
    const g=x.createRadialGradient(350,330,20,384,384,384);g.addColorStop(0,'#f1e7cc');g.addColorStop(1,'#b9a784');
    x.fillStyle=g;x.fillRect(0,0,768,768);
    if(image){x.save();x.globalCompositeOperation='multiply';x.globalAlpha=.3;x.drawImage(image,0,0,768,768);x.restore();}
    x.strokeStyle='#554d3e';
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30-Math.PI/2,major=i%5===0,r0=major?319:338;
      x.lineWidth=major?5:2;x.beginPath();x.moveTo(384+Math.cos(a)*r0,384+Math.sin(a)*r0);
      x.lineTo(384+Math.cos(a)*353,384+Math.sin(a)*353);x.stroke();
    }
    x.fillStyle='#343c34';x.font='44px Georgia';x.textAlign='center';x.textBaseline='middle';
    const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    numerals.forEach((label,i)=>{const a=i*Math.PI/6-Math.PI/2;x.fillText(label,384+Math.cos(a)*281,384+Math.sin(a)*281);});
    x.font='22px Georgia';x.fillText('THE GILDED RAIL',384,278);x.font='16px Georgia';x.fillText('EST. 1924',384,306);
    x.font='17px Georgia';x.fillText('PRECISION · LONDON',384,483);
    const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  },
  enamel:new THREE.MeshPhysicalMaterial({color:0x174735,roughness:.26,metalness:.35,clearcoat:.65,clearcoatRoughness:.2,side:THREE.DoubleSide}),
  lampLiner:new THREE.MeshStandardMaterial({color:0xd8cfac,roughness:.4,metalness:.35,side:THREE.DoubleSide}),
  nickel:new THREE.MeshStandardMaterial({color:0xa6aaa5,roughness:.3,metalness:.88,envMapIntensity:.75}),
  twine:new THREE.MeshStandardMaterial({color:0x86785d,roughness:.98,metalness:0,envMapIntensity:.15}),
  pocketLeather:new THREE.MeshStandardMaterial({color:0x32271f,roughness:.64,metalness:0})
};
WorldMaterials.bind('club-leather',Craft.pocketLeather,{bump:.00045});
Craft.twine.color.convertSRGBToLinear();
