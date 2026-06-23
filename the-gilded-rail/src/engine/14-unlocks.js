/* The Gilded Rail - UNLOCKS
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= UNLOCKS =================
   THREE editable catalogs - cloths (FELTS), cues (CUES), and wood finishes
   (RAILS). To add an item, drop another entry in the right object; the Customize
   screen lists them automatically and `lvl` gates when it unlocks. Keep the keys
   stable (they're stored in the save). XP from frames, matches, achievements and
   challenges feeds the level curve, so there's always a next thing to chase - and
   the top tiers are deliberately steep so prestige runs stay worth it.

     FELT  : { name, lvl, bed:'#rrggbb' (cloth top), cush:0xRRGGBB (rail tone), hi:'r,g,b' (nap highlight) }
     CUE   : { name, lvl, shaft:0xRRGGBB, butt:0xRRGGBB, ring:'brass'|'chrome',
               smoke?:bool, glow?:0xRRGGBB (emissive shaft), flame?:bool, flameColor?:0xRRGGBB }
     RAIL  : { name, lvl, wood:0xRRGGBB (timber albedo - grain texture is neutral so this reads true), rough?:0..1 }
*/
const FELTS = {
  emerald: {name:'Club Emerald',    lvl:1,  bed:'#0f5238', cush:0x0f5036, hi:'255,255,255'},
  crimson: {name:'Crimson Velvet',  lvl:1,  bed:'#5a1820', cush:0x51151d, hi:'255,205,205'},   /* toned down */
  forest:  {name:'Forest Green',    lvl:2,  bed:'#16402a', cush:0x143a26, hi:'205,255,220'},
  amber:   {name:'Amber Gold',      lvl:3,  bed:'#6f5616', cush:0x655013, hi:'255,236,184'},    /* toned down */
  azure:   {name:'Midnight Azure',  lvl:4,  bed:'#17436f', cush:0x153e66, hi:'200,225,255'},
  royal:   {name:'Royal Purple',    lvl:6,  bed:'#3b1f63', cush:0x351b59, hi:'225,205,255'},
  charcoal:{name:'Slate Charcoal',  lvl:8,  bed:'#23262b', cush:0x202329, hi:'210,220,230'},
  sand:    {name:'Desert Sand',     lvl:10, bed:'#6f5a30', cush:0x65522c, hi:'255,236,196'},    /* toned down */
  rose:    {name:'Rosewood Red',    lvl:12, bed:'#651d28', cush:0x5b1a23, hi:'255,205,210'},    /* toned down */
  teal:    {name:'Peacock Teal',    lvl:14, bed:'#0e4f4c', cush:0x0c4744, hi:'200,255,250'},
  wine:    {name:'Oxblood Wine',    lvl:17, bed:'#4a141c', cush:0x431219, hi:'255,200,200'},
  navy:    {name:'Royal Navy',      lvl:20, bed:'#16284f', cush:0x142448, hi:'200,215,255'},
  plum:    {name:'Deep Plum',       lvl:24, bed:'#2e1640', cush:0x29143a, hi:'228,200,255'},
  steel:   {name:'Gunmetal',        lvl:28, bed:'#2a2f36', cush:0x262a30, hi:'215,225,235'},
  glacier: {name:'Glacier Blue',    lvl:32, bed:'#1d6b86', cush:0x1a6079, hi:'210,245,255'},
  champagne:{name:'Champagne Gold', lvl:38, bed:'#7a6a32', cush:0x6f602d, hi:'255,244,205'},
  onyx:    {name:'Onyx Black',      lvl:44, bed:'#15161a', cush:0x121317, hi:'200,205,215'},
  gilded:  {name:'The Gilded Cloth',lvl:50, bed:'#123a2e', cush:0x0e2f25, hi:'255,232,150'},    /* signature */
};
const CUES = {
  classic: {name:'House Classic',     lvl:1,  shaft:0xc89a5e, butt:0x2a1812, ring:'brass',  smoke:false},
  ivory:   {name:'Ivory & Gold',      lvl:3,  shaft:0xeae0c8, butt:0xb89a5e, ring:'brass',  smoke:false},
  obsidian:{name:'Obsidian & Silver', lvl:4,  shaft:0x16161a, butt:0x0c0c0e, ring:'chrome', smoke:false},
  ember:   {name:'The Ember',         lvl:5,  shaft:0x6e4322, butt:0x3a2210, ring:'brass',  smoke:true},
  rosewd:  {name:'Rosewood Sport',    lvl:6,  shaft:0x6a2f23, butt:0x3a1a12, ring:'brass',  smoke:false},
  jade:    {name:'Jade Inlay',        lvl:8,  shaft:0x1f6b53, butt:0x123c2e, ring:'chrome', smoke:false},
  crimsonlacq:{name:'Crimson Lacquer',lvl:10, shaft:0x7a1d22, butt:0x3a0e12, ring:'brass',  smoke:false},
  phantom: {name:'The Phantom',       lvl:12, shaft:0x101014, butt:0x070709, ring:'chrome', smoke:true},
  gilded:  {name:'The Gilded',        lvl:14, shaft:0xc9a35c, butt:0x6e4f1f, ring:'brass',  smoke:true},
  /* ---- glowing cues (emissive shaft - lights up in the dark room) ---- */
  neon:    {name:'Neon Viper',        lvl:16, shaft:0x0d3a24, butt:0x07140d, ring:'chrome', glow:0x39ff6a},
  frost:   {name:'Frostbite',         lvl:20, shaft:0x16303d, butt:0x0a161d, ring:'chrome', glow:0x5cc8ff},
  plasma:  {name:'Plasma Arc',        lvl:26, shaft:0x1a0d2a, butt:0x0d0618, ring:'chrome', glow:0xb84dff, smoke:true},
  /* ---- flaming cues (live flame licking up the shaft) ---- */
  inferno: {name:'Inferno',           lvl:31, shaft:0x2a1208, butt:0x160803, ring:'brass',  flame:true, flameColor:0xff6a14, glow:0xff4a00},
  bluefire:{name:'Blue Blaze',        lvl:37, shaft:0x081626, butt:0x040b14, ring:'chrome', flame:true, flameColor:0x47a6ff, glow:0x2a7dff},
  solar:   {name:'Solar Flare',       lvl:44, shaft:0x2e2206, butt:0x140f03, ring:'brass',  flame:true, flameColor:0xffc24a, glow:0xffb020},
  eternal: {name:'Eternal Flame',     lvl:50, shaft:0xc9a35c, butt:0x6e4f1f, ring:'brass',  flame:true, flameColor:0xffd66a, glow:0xffcf5a, smoke:true},
};
const RAILS = {
  walnut:  {name:'Walnut',            lvl:1,  wood:0x6b4226},
  mahogany:{name:'Mahogany',          lvl:1,  wood:0x5a2418},
  ebony:   {name:'Ebony',             lvl:6,  wood:0x2a2420, rough:0.30},
  oak:     {name:'Golden Oak',        lvl:9,  wood:0x8a6a3e},
  teak:    {name:'Burmese Teak',      lvl:13, wood:0x7a4e28},
  bleached:{name:'Bleached Birch',    lvl:17, wood:0xb59a6e},
  wenge:   {name:'Wenge',             lvl:22, wood:0x342a20, rough:0.28},
  maple:   {name:"Bird's-Eye Maple",  lvl:28, wood:0x9a7a48},
  rosewood:{name:'Brazilian Rosewood',lvl:34, wood:0x5a2a20},
  burl:    {name:'Gilded Burl',       lvl:42, wood:0x8a6a32, rough:0.26},
};
/* profile cosmetics - pure CSS (avatar ring + header banner), unlocked by level */
const BORDERS = {
  gold:    {name:'Gilded Ring',  lvl:1,  col:'#e8c987', glow:'rgba(232,201,135,.55)'},
  silver:  {name:'Silver',       lvl:4,  col:'#c2c8d0', glow:'rgba(194,200,208,.5)'},
  emerald: {name:'Emerald',      lvl:9,  col:'#2fae7a', glow:'rgba(47,174,122,.55)'},
  ruby:    {name:'Ruby',         lvl:15, col:'#d2475a', glow:'rgba(210,71,90,.55)'},
  sapphire:{name:'Sapphire',     lvl:21, col:'#4a8fe0', glow:'rgba(74,143,224,.55)'},
  amethyst:{name:'Amethyst',     lvl:29, col:'#b84dff', glow:'rgba(184,77,255,.6)'},
  flame:   {name:'Flame',        lvl:37, col:'#ff7a18', glow:'rgba(255,122,24,.7)'},
  platinum:{name:'Platinum',     lvl:46, col:'#eaf0f6', glow:'rgba(234,240,246,.7)'},
};
const BANNERS = {
  felt:    {name:'House Felt',   lvl:1,  css:'linear-gradient(135deg,#0f5238,#0a2c20)'},
  noir:    {name:'Midnight',     lvl:1,  css:'linear-gradient(135deg,#1a1c22,#070809)'},
  burgundy:{name:'Burgundy',     lvl:7,  css:'linear-gradient(135deg,#5a1820,#1c0a0d)'},
  azure:   {name:'Azure Hour',   lvl:13, css:'linear-gradient(135deg,#17436f,#0a1726)'},
  royal:   {name:'Royal',        lvl:20, css:'linear-gradient(135deg,#3b1f63,#150a26)'},
  teal:    {name:'Peacock',      lvl:27, css:'linear-gradient(135deg,#0e4f4c,#072624)'},
  gilded:  {name:'Gilded',       lvl:35, css:'linear-gradient(135deg,#8a6a16,#3a2a08)'},
  ember:   {name:'Embers',       lvl:45, css:'linear-gradient(135deg,#6a2208,#1a0a04)'},
};
const Unlocks = {
  has(def){ return Profile.level().lvl >= def.lvl; },
  applyFelt(){
    const f=FELTS[Profile.data.felt]||FELTS.emerald;
    bedTopMat.map=makeFeltTexture(f, true); bedTopMat.needsUpdate=true;
    /* cushions get their own baked texture in the cushion tone; material color
       stays white so the map isn't double-tinted toward black */
    const cushTex=makeFeltTexture(Object.assign({}, f, {bed:'#'+f.cush.toString(16).padStart(6,'0')}), false);
    cushTex.wrapS=cushTex.wrapT=THREE.RepeatWrapping;   /* extruded cushions sample past 0..1 */
    cushTex.needsUpdate=true;
    feltMat.color.set(0xffffff); feltMat.map=cushTex; feltMat.needsUpdate=true;
    feltCushMat.color.set(0xffffff); feltCushMat.map=cushTex; feltCushMat.needsUpdate=true;
  },
  applyCue(){
    const cdef=CUES[Profile.data.cue]||CUES.classic;
    cueParts.shaft.material.color.set(cdef.shaft);
    cueParts.butt.material.color.set(cdef.butt);
    cueParts.ring.material = cdef.ring==='chrome' ? chromeMat : brassMat;
    /* glowing cue: emissive shaft (+ a soft butt glow) */
    const gl=cdef.glow||0;
    cueParts.shaft.material.emissive.set(gl);
    cueParts.shaft.material.emissiveIntensity = gl?1.05:0;
    cueParts.shaft.material.needsUpdate=true;
    /* smoke wisp */
    if(cdef.smoke){
      if(!cueParts.smoke){ cueParts.smoke=Smoke.make(0.55); cueParts.smoke.obj.position.set(0,0.01,0); cueStick.add(cueParts.smoke.obj); }
      cueParts.smoke.obj.visible=true;
    } else if(cueParts.smoke){ cueParts.smoke.obj.visible=false; }
    /* flaming cue: a live flame licking up the shaft */
    if(cdef.flame && typeof buildCueFlame==='function'){
      const fl=buildCueFlame(); fl.visible=true;
      const col=cdef.flameColor||0xff7a18;
      fl.children.forEach(s=>{ if(s.material) s.material.color.set(col); });
    } else if(cueParts.flame){ cueParts.flame.visible=false; }
  },
  applyRail(){
    /* recolours the shared timber material (rails, skirt, legs, lounge table); the
       grain texture is neutral so the colour reads as the true wood albedo */
    const r=RAILS[Profile.data.rail]||RAILS.walnut;
    woodMat.color.set(r.wood);
    woodMat.roughness = (r.rough!=null) ? r.rough : 0.42;
    woodMat.needsUpdate=true;
  },
  applyAll(){ this.applyFelt(); this.applyCue(); this.applyRail(); }
};
