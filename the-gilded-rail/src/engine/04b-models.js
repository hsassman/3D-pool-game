/* The Gilded Rail - EXTERNAL 3D MODELS (glTF/GLB)
   Part of the global-scope engine; loaded in numeric order (see index.html).

   Loads the supplied props (converted to self-contained GLBs in
   public/assets/models/, listed in window.__MODELS) and stamps normalized clones
   into the scene. Each placement is auto-scaled to a real-world target size and
   rested on its surface, so source units/origins don't matter.

   Degrades gracefully: if GLTFLoader or the files aren't present (headless test,
   offline), loadAll() resolves to nothing and place() returns null - callers then
   fall back to their procedural props. */
const Models = {
  cache:{}, _loader:null, _loadPromise:null, _def:{}, _allDone:false,
  available(){ return typeof THREE!=='undefined' && typeof THREE.GLTFLoader==='function'; },
  /* a per-model deferred so a decor builder can wait for JUST the prop it needs
     (`Models.ready('chalk').then(...)`) instead of the whole batch - otherwise one big
     model, e.g. the 12 MB dartboard cabinet, would hold back the bar, chalk, etc. */
  _deferred(name){
    if(!this._def[name]){ let res; const p=new Promise(r=>{ res=r; }); this._def[name]={p,res,done:false};
      if(this._allDone) this._finish(name); }                     // late caller after loading finished
    return this._def[name];
  },
  ready(name){ return this._deferred(name).p; },                 // resolves on load OR failure
  _finish(name){ const d=this._def[name]; if(d && !d.done){ d.done=true; d.res(); } },
  _finishAll(){ this._allDone=true; Object.keys(this._def).forEach(n=>this._finish(n)); },
  /* memoised: every caller shares one load pass, so the GLB files are fetched once.
     The finishAll tail settles any waiter whose name isn't in __MODELS (or all of them
     when models are unavailable / headless) so procedural fallbacks always fire. */
  loadAll(){
    if(this._loadPromise) return this._loadPromise;
    return this._loadPromise = this._loadAll().then(()=>this._finishAll());
  },
  _loadAll(){
    const names=(typeof window!=='undefined' && window.__MODELS) ? Object.keys(window.__MODELS) : [];
    if(!this.available() || !names.length) return Promise.resolve();
    this._loader=new THREE.GLTFLoader();
    const m=window.__MODELS;
    return Promise.all(names.map(name=>new Promise(res=>{
      const done=()=>{ this._finish(name); res(); };               // settle this model's waiters + the batch
      try{
        this._loader.load(m[name], g=>{ this.cache[name]=g.scene||g.scenes[0]; done(); },
          undefined, e=>{ console.warn('[models] load failed:', name, e&&e.message||e); done(); });
      }catch(e){ done(); }
    })));
  },
  has(name){ return !!this.cache[name]; },
  /* clone a loaded model, normalize so its `target` dimension (height, or the
     larger XZ footprint when opts.by==='width') equals `target` metres, then rest
     its base on `surfaceY` centred at (x,z). opts: {yaw,tiltX,by} */
  place(name, parent, x, surfaceY, z, target, opts){
    const src=this.cache[name]; if(!src || !parent) return null;
    opts=opts||{};
    const Y=new THREE.Vector3(0,1,0), X=new THREE.Vector3(1,0,0);
    const obj=src.clone(true);
    obj.position.set(0,0,0); obj.rotation.set(0,0,0); obj.scale.setScalar(1); obj.updateMatrixWorld(true);
    /* keep only meshes whose name contains opts.only (e.g. pull the beer bottle out
       of a multi-bottle model) */
    if(opts.only){ const rm=[]; obj.traverse(o=>{ if(o.isMesh && o.name.indexOf(opts.only)<0) rm.push(o); });
      rm.forEach(o=>o.parent&&o.parent.remove(o)); obj.updateMatrixWorld(true); }
    /* auto-stand: many source models lie on their side - rotate the tallest axis up
       to vertical. Skipped for flat props (by:'width', e.g. the ashtray). */
    let box=new THREE.Box3().setFromObject(obj), size=new THREE.Vector3(); box.getSize(size);
    if(opts.by!=='width' && !opts.noOrient){
      if(size.x>size.y && size.x>=size.z) obj.rotateZ(Math.PI/2);        /* tallest = X */
      else if(size.z>size.y && size.z>size.x) obj.rotateX(-Math.PI/2);   /* tallest = Z */
    }
    if(opts.flip) obj.rotateOnWorldAxis(X, Math.PI);                     /* fix upside-down */
    if(opts.yaw)  obj.rotateOnWorldAxis(Y, opts.yaw);                    /* spin about vertical */
    obj.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(obj); box.getSize(size);
    const dim=(opts.by==='width') ? Math.max(size.x,size.z) : size.y;
    obj.scale.setScalar(target/(dim||1)); obj.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(obj);
    const ctr=new THREE.Vector3(); box.getCenter(ctr);
    obj.position.set(x-ctr.x, surfaceY-box.min.y, z-ctr.z);
    obj.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    parent.add(obj);
    return obj;
  }
};
