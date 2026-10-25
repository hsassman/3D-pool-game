/* Shared, bounded material assets. Procedural surfaces remain the offline fallback. */
const WorldMaterials={
  textures:{},targets:{},promise:null,
  bind(key,material,options){
    (this.targets[key]||(this.targets[key]=[])).push({material,options:options||{}});
    if(this.textures[key])this.assign(key,material,options||{});
  },
  assign(key,material,options){
    if(options.when&&!options.when())return;
    const texture=this.textures[key];if(!texture)return;
    if(options.paint){options.paint(texture,material);return;}
    const slot=options.slot||'map',old=material[slot];
    material[slot]=texture;
    if(options.color!=null)material.color.set(options.color);
    if(options.bump){material.bumpMap=texture;material.bumpScale=options.bump;}
    material.needsUpdate=true;
    if(options.disposeFallback&&old&&old!==texture)old.dispose();
  },
  load(){
    if(this.promise)return this.promise;
    if(typeof Image==='undefined')return Promise.resolve();
    const files=['quarter-sawn-walnut','club-leather','club-rug','harbor-nocturne','champions-study','deco-cue-wrap','worsted-cloth',
      'portrait-railway','portrait-botanicals','rain-droplets','clock-enamel'];
    this.promise=Promise.all(files.map(key=>new Promise(resolve=>{
      new THREE.TextureLoader().load('assets/world/'+key+'.webp',texture=>{
        texture.encoding=key==='rain-droplets'?THREE.LinearEncoding:THREE.sRGBEncoding;
        texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        if(['quarter-sawn-walnut','club-leather','deco-cue-wrap','rain-droplets'].includes(key))texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
        this.textures[key]=texture;
        (this.targets[key]||[]).forEach(({material,options})=>this.assign(key,material,options));
        if(key==='club-rug')Graphics.floorTone();
        if(key==='worsted-cloth'&&typeof Unlocks!=='undefined'){Unlocks._feltKey=null;Unlocks.applyFelt();}
        resolve();
      },undefined,()=>resolve());
    })));return this.promise;
  }
};
WorldMaterials.bind('quarter-sawn-walnut',woodMat,{bump:.0007});
WorldMaterials.bind('club-leather',leatherMat,{bump:.0005});
