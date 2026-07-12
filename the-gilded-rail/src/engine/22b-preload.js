/* The Gilded Rail - BOOT PRELOADER
   Part of the global-scope engine; loaded in numeric order (see index.html).

   Downloads EVERY external asset up front - the GLB prop models, all audio
   (impact samples, one-shots, the full soundtrack), the menu artwork and the
   web fonts - behind the #boot-loader curtain in index.html, with a byte-level
   progress bar. Models and audio are kept as blob: URLs and swapped into the
   same globals the engine reads (__MODELS/__SFX/__AUDIO/__SONG), so nothing is
   ever fetched twice; the artwork just warms the browser cache for the CSS.

   Degrades gracefully: any failed download counts as done (the engine's own
   fallbacks then apply), and init() races the whole thing against a watchdog,
   so a broken network can never trap the player behind the loader. */
const Boot = {
  _p:null, _pct:0,
  _el(id){ try{ return document.getElementById(id); }catch(e){ return null; } },

  /* every URL the game will need, read from the same globals the engine uses
     (the build rewrites those paths, so this stays correct in dev and in dist) */
  _urls(){
    const w=(typeof window!=='undefined')?window:{}; const list=[];
    const push=u=>{ if(u && typeof u==='string' && list.indexOf(u)<0) list.push(u); };
    Object.keys(w.__MODELS||{}).forEach(k=>push(w.__MODELS[k]));
    [w.__SFX, w.__AUDIO].forEach(m=>{ if(m) Object.keys(m).forEach(k=>(m[k]||[]).forEach(push)); });
    push(w.__SONG);
    /* menu artwork referenced from the stylesheet (build rewrites this path too) */
    ['logo-mark.png','career.jpg','8ball.jpg','english.jpg','practice.jpg','trickshot.jpg']
      .forEach(f=>push('/assets/ui/'+f));
    return list;
  },

  run(){ return this._p || (this._p = this._run().catch(()=>{})); },

  async _run(){
    if(typeof fetch==='undefined' || typeof window==='undefined') return;
    const urls=this._urls(); if(!urls.length){ this._paint(1); return; }
    const prog=new Array(urls.length).fill(0);
    const paint=()=>this._paint(prog.reduce((a,b)=>a+b,0)/prog.length);
    /* models + audio become blob: URLs (never re-fetched); images only warm the cache */
    const KEEP=/\.(glb|mp3|wav|ogg|m4a)(\?|$)/i;
    await Promise.all(urls.map((u,i)=>
      this._get(u, f=>{ prog[i]=f; paint(); }, KEEP.test(u))
        .catch(()=>{ prog[i]=1; paint(); })));
    /* fonts too - but never hang on them */
    try{ if(document.fonts && document.fonts.ready)
      await Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,4000))]); }catch(e){}
    this._paint(1);
  },

  async _get(url, onp, keep){
    const r=await fetch(url);
    if(!r.ok){ onp(1); return; }
    const total=+(r.headers.get('content-length')||0);
    if(r.body && total>0){
      const reader=r.body.getReader(); const chunks=[]; let got=0;
      for(;;){ const c=await reader.read(); if(c.done) break;
        chunks.push(c.value); got+=c.value.length; onp(Math.min(0.999, got/total)); }
      if(keep) this._swap(url, URL.createObjectURL(new Blob(chunks)));
    } else {
      const b=await r.blob();                      /* no length header (dev server) - per-file jump */
      if(keep) this._swap(url, URL.createObjectURL(b));
    }
    onp(1);
  },

  /* point the engine's asset globals at the already-downloaded bytes */
  _swap(url, blobUrl){
    const w=window;
    Object.keys(w.__MODELS||{}).forEach(k=>{ if(w.__MODELS[k]===url) w.__MODELS[k]=blobUrl; });
    [w.__SFX, w.__AUDIO].forEach(m=>{ if(m) Object.keys(m).forEach(k=>{
      const a=m[k]||[]; for(let i=0;i<a.length;i++) if(a[i]===url) a[i]=blobUrl; }); });
    if(w.__SONG===url) w.__SONG=blobUrl;
  },

  _paint(f){
    this._pct=Math.max(this._pct, Math.round(f*100));   /* never runs backwards */
    try{
      const fill=this._el('bl-fill'), pct=this._el('bl-pct');
      if(fill) fill.style.width=this._pct+'%';
      if(pct) pct.textContent=this._pct+'%';
    }catch(e){}
  },

  hide(){
    try{
      const el=this._el('boot-loader'); if(!el) return;
      el.classList.add('done');                       /* CSS fade, then drop the node */
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 900);
    }catch(e){}
  }
};
