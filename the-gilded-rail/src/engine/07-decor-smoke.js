/* The Gilded Rail - SMOKE (soft rising wisps)
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files.

   Sprite-based so each particle can grow and fade independently - reads as a
   continuous wisp of smoke rather than a string of dots. */
const Smoke = {
  emitters:[], _tex:null,
  texture(){
    if(this._tex) return this._tex;
    const cv=document.createElement('canvas'); cv.width=cv.height=64; const x=cv.getContext('2d');
    const g=x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,0.92)');
    g.addColorStop(0.35,'rgba(255,255,255,0.42)');
    g.addColorStop(0.7,'rgba(255,255,255,0.12)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g; x.fillRect(0,0,64,64);
    this._tex=new THREE.CanvasTexture(cv); return this._tex;
  },
  /* a thin looping column of smoke; parent it wherever the ember is */
  make(scale){
    const N=16, grp=new THREE.Group(), sprites=[];
    for(let i=0;i<N;i++){
      const mat=new THREE.SpriteMaterial({map:this.texture(), color:0xb7bbc2, transparent:true,
        opacity:0, depthWrite:false, blending:THREE.NormalBlending});
      const s=new THREE.Sprite(mat); s.scale.setScalar(0.02*scale);
      grp.add(s); sprites.push(s);
    }
    grp.frustumCulled=false;
    const em={obj:grp, sprites, N, seed:Math.random()*100, scale, speed:0.085+Math.random()*0.03};
    this.emitters.push(em);
    return em;
  },
  update(t){
    for(const em of this.emitters){
      if(!em.obj.visible) continue;
      const sc=em.scale;
      for(let i=0;i<em.N;i++){
        const life=((t*em.speed)+(i/em.N)+em.seed)%1;       // 0 at the ember → 1 dissolved
        const sp=em.sprites[i];
        const widen=(0.2+life)*0.06*sc;                      // drifts wider as it rises
        sp.position.set(Math.sin(life*6.0+em.seed+i*0.7)*widen,
                        life*0.46*sc,
                        Math.cos(life*4.6+i*1.31+em.seed)*widen*0.8);
        sp.scale.setScalar((0.03+life*0.16)*sc);             // billows outward as it climbs
        sp.material.opacity=0.55*Math.sin(Math.PI*Math.min(1,life))*Math.min(1,sc*0.7+0.4);
      }
    }
  }
};
