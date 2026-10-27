/* The Gilded Rail - post-processing: depth of field + bloom + edge AA.
   Global-scope engine file, loaded in numeric order (see index.html).

   A Bokeh depth-of-field pass focused on the cue ball, plus an Unreal bloom pass that
   makes the lamps, glowing bulbs, embers and glowing cues bleed light realistically.
   The blur deepens when you are down on a shot and eases off when orbiting.

   The composer renders to a plain (non-multisampled) render target, so it silently
   throws away the renderer's own MSAA (antialias:true on the WebGLRenderer only
   antialiases the direct-to-screen path). An FXAA pass runs last to restore smooth
   edges on the composer path - otherwise cushion rails and ball silhouettes look
   noticeably more jagged whenever DoF/bloom is on than when it's off.

   Degrades gracefully: if the passes are missing (offline / headless) or quality is
   Low, it renders straight to screen. */
const PostFX = {
  composer:null, bokeh:null, bloom:null, fxaa:null, _on:false,
  available(){
    return typeof THREE!=='undefined'
      && typeof THREE.EffectComposer==='function'
      && typeof THREE.RenderPass==='function'
      && typeof THREE.BokehPass==='function';
  },
  init(quality){
    if(this.composer||(quality||Profile.data.quality||'low')==='low')return;
    if(!this.available()) return;
    try{
      this.composer=new THREE.EffectComposer(renderer);
      this._pixelRatio=renderer.getPixelRatio();
      this.composer.addPass(new THREE.RenderPass(scene, camera));
      this.bokeh=new THREE.BokehPass(scene, camera,
        {focus:0.75, aperture:0.16, maxblur:0.13, width:innerWidth, height:innerHeight});
      /* three.js's BokehPass ships with needsSwap=false because it's meant to be the
         FINAL pass (rendered straight to screen). We run bloom AFTER it, so without a
         swap the composer would feed the original SHARP render to bloom and silently
         throw the DoF result away. Force the swap so the blur actually propagates. */
      this.bokeh.needsSwap=true;
      this.bokeh.setSize=(w,h)=>{this.bokeh.renderTargetDepth.setSize(w,h);this.bokeh.uniforms.aspect.value=w/h;};
      this.composer.addPass(this.bokeh);
      if(typeof THREE.UnrealBloomPass==='function'){
        this.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.72, 0.55, 0.78);
        this.composer.addPass(this.bloom);
      }
      if(typeof THREE.FXAAShader!=='undefined' && typeof THREE.ShaderPass==='function'){
        this.fxaa=new THREE.ShaderPass(THREE.FXAAShader);
        const pr=renderer.getPixelRatio();
        this.fxaa.material.uniforms['resolution'].value.set(1/(innerWidth*pr), 1/(innerHeight*pr));
        this.composer.addPass(this.fxaa);
      }
      this._on=true;
    }catch(e){ this.composer=null; this._on=false; }
  },
  setSize(w,h){
    if(!this.composer&&!this.fxaa)return;
    const pr=renderer.getPixelRatio();
    if(this.composer){
      if(this._pixelRatio!==pr){this._pixelRatio=pr;this.composer.setPixelRatio(pr);}
      this.composer.setSize(w,h);
    }
    if(this.fxaa)this.fxaa.material.uniforms['resolution'].value.set(1/(w*pr),1/(h*pr));
  },
  enabled(){ return this._on && !(typeof Profile!=='undefined' && Profile.data.quality==='low'); },
  /* depth-of-field level, controlled from Settings: 'off' | 'normal' | 'strong'
     (default off - the bokeh pass is the single heaviest effect, so new players
     start without it; 'strong' keeps the table sharp and blurs only the room).
     'off' disables only the DoF pass; bloom and the rest of the look stay. */
  dofLevel(){ return (typeof Profile!=='undefined' && Profile.data.dof) || 'off'; },
  render(){
    if(!this.enabled()){ renderer.render(scene, camera); return; }
    const dof=this.dofLevel();
    if(this.bokeh) this.bokeh.enabled = (dof!=='off');
    const u=this.bokeh && this.bokeh.uniforms;
    if(u && dof!=='off'){
      /* focus stays locked on the cue ball, so the rack and the far end of the table
         (anything past it) fall away into bokeh - foreground/cue razor sharp. */
      let foc=0.75;
      if(typeof cueBall!=='undefined' && cueBall) foc=Math.max(0.25, camera.position.distanceTo(cueBall.pos));
      u['focus'].value = foc;
      u['aspect'].value = camera.aspect;                 // keep correct after a resize
      const strong = dof==='strong';
      /* SUBTLE, playable depth of field. The visible blur radius is ~0.4*maxblur of the
         frame, so maxblur must stay small or the whole table smears into an unplayable
         mess. 'aperture' is the ramp rate (blur = (focus-distance)*aperture): keep it
         low so the table balls you're aiming at stay readable and only the room beyond
         the table softens. 'strong' is a clearly visible but still gentle fall-off;
         'normal' is barely-there. */
      u['aperture'].value = strong ? 0.010 : 0.006;
      u['maxblur'].value  = strong ? 0.005 : 0.003;
    }
    this.composer.render();
  }
};
