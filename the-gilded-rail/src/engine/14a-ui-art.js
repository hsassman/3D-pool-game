/* Lightweight UI artwork. These SVG previews reflect the equipped catalog values;
   portraits and editorial images are compressed, on-demand WebP assets. */
const UIArt = {
  root:'assets/ui/collection/',
  /* Shared 24px optical grid; icons never depend on an OS emoji/font. */
  paths:{
    arrow:"M7 17 17 7M7 7h10v10",
    trophy:"M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8",
    cue:"M3 21 20 4M5 17l2 2M17 5l2 2M21 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    people:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 8",
    target:"M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12 2v4m0 12v4M2 12h4m12 0h4M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
    sparkle:"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
    settings:"M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10M11 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM17 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
    lock:"M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 5v2",
    check:"m5 12 4 4L19 6",
    close:"m6 6 12 12M6 18 18 6",
    book:"M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Zm8 2v15",
    home:"m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7",
    fullscreen:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
    fullscreenExit:"M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5",
    menu:"M4 6h16M4 12h16M4 18h16",
    sound:"M4 9h4l5-5v16l-5-5H4V9Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
    music:"M9 18V5l11-2v13M9 9l11-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    ambience:"M3 15q3-4 6 0t6 0 6 0M3 20q3-4 6 0t6 0 6 0M12 3v5M5 5l2 2m12-2-2 2",
    eye:"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    display:"M3 4h18v13H3V4Zm9 13v4m-5 0h10",
    shield:"m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 9 3 3 5-6",
    user:"M4 21v-2a8 8 0 0 1 16 0v2M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    edit:"m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4",
    crown:"m3 6 5 5 4-7 4 7 5-5-2 13H5L3 6Zm3 10h12",
    cloud:"M7 18H6c-5 0-5-8 0-8 0-8 12-8 12-1 6 0 6 9 0 9h-1M9 14l3-3 3 3m-3-3v10",
    search:"M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6",
    arrowLeft:"m14 5-7 7 7 7M7 12h14",
    copy:"M8 8h13v13H8V8ZM3 16V3h13",
    chat:"M3 3h18v14H9l-6 4V3Zm4 5h10M7 12h7",
    cloth:"M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 8h18M8 3v18",
    wood:"M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 8q5-4 10 0t8 0M3 13q4-3 8 0t10 0M3 18q5-4 10 0t8 0",
    keyboard:"M2 6h20v13H2V6Zm4 4h1m3 0h1m3 0h1m3 0h1M6 14h1m3 0h8",
    light:"M9 18h6m-6 3h6M8 13a6 6 0 1 1 8 0l-1 2H9l-1-2Z",
    exit:"M9 3H3v18h6m6-15 6 6-6 6m-7-6h13",
    center:"M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM12 8v8m-4-4h8",
    orbit:"M20 8a9 9 0 1 0 0 8M20 3v5h-5M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
    customize:"m12 3-9 5 9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
    eyeOff:"m3 3 18 18M10 5h2c6 0 10 7 10 7a18 18 0 0 1-4 4M6 6a19 19 0 0 0-4 6s4 7 10 7c2 0 4-1 5-2M10 10a3 3 0 0 0 4 4",
    award:"M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM8 12 6 21l6-3 6 3-2-9",
    flame:"M13 2c1 5-4 6-4 10-2-1-2-3-2-3-5 6-3 13 5 13s11-9 5-14c1 5-2 6-2 6 1-5-2-7-2-12Z",
    smoke:"M7 21c-5-4 5-6 0-10M13 21c-5-6 5-8 0-14M19 21c-5-8 5-10 0-18",
    bolt:"m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
    route:"M6 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM4 7v7a5 5 0 0 0 5 5h6m-3-3 3 3-3 3M20 3l-6 6m0-6 6 6",
    play:"m8 4 12 8-12 8V4Z",
    pause:"M7 4v16M17 4v16",
    star:"m12 3 3 6 6.5 1-4.7 4.6 1.1 6.4-5.9-3.1L6.1 21l1.1-6.4L2.5 10 9 9l3-6Z",
    chevronRight:"m9 5 7 7-7 7",
    chevronDown:"m5 9 7 7 7-7",
    refresh:"M20 7a9 9 0 1 0 1 9M20 2v5h-5"
  },
  icon(name, cls=''){
    return '<svg class="ui-icon '+cls+'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-icon="'+name+'"><path d="'+(this.paths[name]||this.paths.sparkle)+'"/></svg>';
  },
  portrait(id){ return this.root+'portrait-'+id+'.webp'; },
  cpuPortrait(){ return Game.mode==='cpu' ? this.portrait(Game.match ? Game.match.opp.id : ['cpu-regular','cpu-hustler','cpu-shark'][Game.diff]||'cpu-regular') : null; },
  image(file, cls='', alt=''){
    return '<img class="'+cls+'" src="'+this.root+file+'.webp" alt="'+alt+'" width="640" height="400" loading="lazy" decoding="async">';
  },
  header(kicker,title,desc,art){
    return '<div class="collection-head">'+(art?this.image(art,'collection-cover'):'')+'<div class="collection-head-copy"><div class="deco-eyebrow">'+kicker+'</div><h2 id="modal-title">'+title+'</h2>'+(desc?'<p>'+desc+'</p>':'')+'</div></div>';
  },
  /* Catalog previews share real dimensions and colors; no extra WebGL scene. */
  cueDrawing(d,id){
    const hex=n=>'#'+n.toString(16).padStart(6,'0');
    return '<defs><linearGradient id="'+id+'-shaft" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".45"/><stop offset=".35" stop-color="'+hex(d.shaft)+'"/><stop offset=".7" stop-color="'+hex(d.shaft)+'"/><stop offset="1" stop-color="#070c09"/></linearGradient><linearGradient id="'+id+'-butt" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+hex(d.butt)+'"/><stop offset=".35" stop-color="'+hex(d.butt)+'"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".24"/><stop offset=".65" stop-color="'+hex(d.butt)+'"/><stop offset="1" stop-color="#060a07"/></linearGradient></defs>'+
      '<ellipse cx="160" cy="94" rx="139" ry="3" fill="#000" opacity=".22"/>'+
      (d.glow?'<path d="M97 80h195" stroke="'+hex(d.glow)+'" stroke-width="8" opacity=".12"/>':'')+
      '<path data-part="butt" d="M22 77.5 95 77.9V82.1L22 82.5Z" fill="url(#'+id+'-butt)"/><path data-part="shaft" d="M97 77.9 292 79V81L97 82.1Z" fill="url(#'+id+'-shaft)"/>'+
      (d.inlay?'<path d="m38 80 19-1.5 19 1.5-19 1.5Zm23 0 17-1.5 14 1.5-14 1.5Z" fill="#dfd6bb"/>':'')+
      '<path d="M22 77.5v5" stroke="#090f0b" stroke-width="2"/><path d="M96 77.8v4.4M89 77.8v4.4" stroke="'+(d.ring==='chrome'?'#cbd3d0':'#c5a666')+'" stroke-width="1.6"/>'+
      '<path d="M292 80h4" stroke="#ece7d8" stroke-width="2"/><path d="M296 80h2" stroke="#52768b" stroke-width="2"/>'+
      (d.smoke?'<path d="M288 75q-8-9 0-17t0-15" stroke="#c3cbbf" stroke-width="1" fill="none" opacity=".25"/>':'')+
      (d.flame?'<path d="M276 78q-7-8 1-18 0 9 5 5 4 8 7 12" fill="'+hex(d.flameColor||0xffaa50)+'" opacity=".65"/>':'');
  },
  item(kind,d,key){
    const hex=n=>'#'+n.toString(16).padStart(6,'0');
    const id='preview-'+kind+'-'+key;
    let shapes='',defs='';
    if(kind==='cue') shapes=this.cueDrawing(d,id);
    else if(kind==='felt'){
      const wood=typeof RAILS!=='undefined'&&Profile.data?RAILS[Profile.data.rail].wood:0x6b4226;
      defs='<clipPath id="'+id+'-bed"><rect x="56" y="28" width="208" height="104" rx="4"/></clipPath><clipPath id="'+id+'-rail"><path d="M38 11h244v138H38Z M49 22v116h222V22Z" fill-rule="evenodd"/></clipPath>';
      shapes='<ellipse cx="160" cy="151" rx="121" ry="4" fill="#000" opacity=".22"/><rect x="38" y="11" width="244" height="138" rx="11" fill="'+hex(wood)+'"/>'+
        '<image href="assets/ui/collection/wood-detail-v3.webp" x="38" y="11" width="244" height="138" clip-path="url(#'+id+'-rail)" opacity=".15" preserveAspectRatio="xMidYMid slice"/>'+
        '<rect x="49" y="22" width="222" height="116" rx="6" fill="'+hex(d.cush)+'"/><rect data-part="bed" x="56" y="28" width="208" height="104" rx="4" fill="'+d.bed+'"/>'+
        '<image href="assets/ui/collection/felt-detail-v3.webp" x="56" y="28" width="208" height="104" clip-path="url(#'+id+'-bed)" opacity=".08" preserveAspectRatio="xMidYMid slice"/>'+
        '<path d="M57 29h206M57 29v102" stroke="#fff" opacity=".1"/>'+
        [[52,25],[160,22],[268,25],[52,135],[160,138],[268,135]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="4.8" fill="#07110c"/>').join('')+
        [85,122,198,235].map(x=>'<circle cx="'+x+'" cy="16" r="1" fill="#d3c6a6" opacity=".8"/>').join('');
    } else {
      defs='<clipPath id="'+id+'-grain"><path d="m34 65 210-28 42 24-210 29Z"/></clipPath>';
      shapes='<ellipse cx="164" cy="124" rx="119" ry="6" fill="#000" opacity=".2"/>'+
        '<path d="m34 65 210-28 42 24-210 29Z" fill="'+hex(d.wood)+'"/><path d="M34 65v18l42 25V90Z" fill="'+hex(d.wood)+'"/>'+
        '<path d="m76 90 210-29v18L76 108Z" fill="'+hex(d.wood)+'"/><path d="m76 90 210-29v18L76 108Z" fill="#000" opacity=".22"/>'+
        '<image href="assets/ui/collection/wood-detail-v3.webp" x="34" y="37" width="252" height="72" clip-path="url(#'+id+'-grain)" opacity=".27" preserveAspectRatio="xMidYMid slice"/>'+
        '<path d="m77 90 207-28" stroke="#f2e2b5" opacity=".4" stroke-width="1"/><path d="m34 65 42 25" stroke="#f2e2b5" opacity=".2"/>'+
        '<path d="m124 69 4-3 4 2-4 3Zm72-10 4-3 4 2-4 3Z" fill="#e4d4ac"/>';
    }
    return '<svg class="item-preview item-'+kind+'" viewBox="'+(kind==='cue'?'0 35 320 74':'0 0 320 160')+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+d.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+' preview"><defs>'+defs+'</defs>'+shapes+'</svg>';
  },
  layout(t){
    const pt=p=>[20+(p.x+1.12)/2.24*260,20+(p.z+0.56)/1.12*130];
    const mark=(p,n)=>{const [x,y]=pt(p);return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+(n===0?'#f5efdf':'#'+BALL_COLORS[n].toString(16).padStart(6,'0'))+'" stroke="#e1d4ad" stroke-width=".7"/>';};
    return '<svg class="layout-preview" viewBox="0 0 300 170" role="img" aria-label="'+t.name+' ball layout"><rect x="5" y="5" width="290" height="160" rx="13" fill="#4d3825"/><rect x="15" y="15" width="270" height="140" rx="8" fill="#17503b"/>'+[[17,17],[150,16],[283,17],[17,153],[150,154],[283,153]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="7" fill="#091710"/>').join('')+mark(t.cue,0)+t.balls.map(b=>mark(b,b.num)).join('')+'</svg>';
  },
  init(){
    const icons={'btn-settings3':'settings','ta-toggle':'menu','btn-orbit':'orbit','btn-shoot':'cue','btn-fine':'target'};
    Object.keys(icons).forEach(id=>{const el=document.getElementById(id);if(el) el.innerHTML=this.icon(icons[id]);});
    const tiles=[['btn-campaign','trophy'],['btn-quick','cue'],['btn-online','people'],['btn-challenges','award'],['btn-trickshots','route'],['btn-custom','customize']];
    tiles.forEach(([id,icon])=>{
      const el=document.getElementById(id);if(!el)return;
      el.insertAdjacentHTML('beforeend','<span class="tile-symbol">'+this.icon(icon)+'</span><span class="tile-arrow">'+this.icon('arrow')+'</span>');
    });
    const actions={'btn-menu':'home','btn-settings':'settings','btn-custom2':'customize','btn-fullscreen':'fullscreen','btn-uitoggle':'eyeOff'};
    Object.keys(actions).forEach(id=>{const el=document.querySelector('#'+id+' .ta-ic');if(el)el.innerHTML=this.icon(actions[id]);});
    document.querySelectorAll('.modal-close').forEach(el=>{el.innerHTML=this.icon('close');el.setAttribute('aria-label','Close dialog');});
    const cta=document.querySelector('.career-cta>span');if(cta)cta.innerHTML=this.icon('arrow');
    const pressed=()=>document.querySelectorAll('.chip,.gt-card').forEach(el=>el.setAttribute('aria-pressed',el.classList.contains('sel')));
    pressed();
    document.addEventListener('click',e=>{if(e.target.closest('.chip,.gt-card'))pressed();});
    document.getElementById('modal-close').addEventListener('click',()=>{
      if(UI._modalOrigin && UI._modalOrigin.isConnected) UI._modalOrigin.focus({preventScroll:true});
    });
    /* Trap keyboard focus only inside the topmost dialog; Escape is owned by Input. */
    document.addEventListener('keydown',e=>{
      if(typeof Onboarding!=='undefined'&&Onboarding.active)return;
      const overlay=['modal-overlay','quick-overlay','gameover-overlay','menu-overlay'].map(id=>document.getElementById(id)).find(el=>el&&!el.classList.contains('hidden'));
      if(!overlay)return;
      /* Form typing and dialog navigation must not reach the game's window shortcuts. */
      e.stopPropagation();
      if(e.key==='Escape'){
        const close=overlay.querySelector('.modal-close');
        if(close){e.preventDefault();close.click();}
        return;
      }
      if(e.key!=='Tab')return;
      const focusable=Array.from(overlay.querySelectorAll('button:not(:disabled),input,select,textarea,[tabindex="0"],a[href]')).filter(el=>el.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey && (document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus();}
    });
  }
};
