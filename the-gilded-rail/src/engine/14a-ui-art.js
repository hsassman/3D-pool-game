/* Lightweight UI artwork. These SVG previews reflect the equipped catalog values;
   portraits and editorial images are compressed, on-demand WebP assets. */
const UIArt = {
  root:'assets/ui/collection/',
  paths:{
    arrow:'M7 17 17 7M7 7h10v10',
    trophy:'M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8',
    cue:'m5 19 14-14m-2-2 4 4M3 21l3-1-2-2-1 3Z',
    people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 8',
    target:'M21 12a9 9 0 1 1-9-9m0 4a5 5 0 1 0 5 5m-5 0 9-9m-5 0h5v5',
    sparkle:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    lock:'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4m-3 5v2',
    check:'m5 12 4 4L19 6',
    close:'m6 6 12 12M6 18 18 6',
    book:'M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Zm8 2v15',
    home:'m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7',
    fullscreen:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    menu:'M4 6h16M4 12h16M4 18h16'
  },
  icon(name, cls=''){
    return '<svg class="ui-icon '+cls+'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(this.paths[name]||this.paths.sparkle)+'"/></svg>';
  },
  portrait(id){ return this.root+'portrait-'+id+'.webp'; },
  cpuPortrait(){ return Game.mode==='cpu' ? this.portrait(Game.match ? Game.match.opp.id : ['cpu-regular','cpu-hustler','cpu-shark'][Game.diff]||'cpu-regular') : null; },
  image(file, cls='', alt=''){
    return '<img class="'+cls+'" src="'+this.root+file+'.webp" alt="'+alt+'" width="640" height="400" loading="lazy" decoding="async">';
  },
  header(kicker,title,desc,art){
    return '<div class="collection-head">'+(art?this.image(art,'collection-cover'):'')+'<div class="collection-head-copy"><div class="deco-eyebrow">'+kicker+'</div><h2 id="modal-title">'+title+'</h2>'+(desc?'<p>'+desc+'</p>':'')+'</div></div>';
  },
  item(kind,d,key){
    const hex=n=>'#'+n.toString(16).padStart(6,'0');
    const id='preview-'+kind+'-'+key;
    let shapes='';
    if(kind==='felt'){
      shapes='<rect x="19" y="14" width="202" height="112" rx="15" fill="#533b27"/><rect x="27" y="22" width="186" height="96" rx="10" fill="'+hex(d.cush)+'"/><rect x="34" y="29" width="172" height="82" rx="6" fill="'+d.bed+'"/>'+
        '<path d="M37 30h166M35 32v76" stroke="#fff" opacity=".15"/>'+[[32,27],[120,25],[208,27],[32,113],[120,115],[208,113]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="6" fill="#0c100e"/>').join('')+'<circle cx="85" cy="70" r="7" fill="#f3eddf"/><circle cx="157" cy="65" r="7" fill="#151714"/><circle cx="157" cy="64" r="3" fill="#e9e3d7"/>';
    } else if(kind==='cue'){
      const glow=d.glow?hex(d.glow):hex(d.shaft);
      shapes='<ellipse cx="120" cy="104" rx="90" ry="6" fill="#000" opacity=".3"/><g transform="rotate(-15 120 70)">'+
        (d.glow?'<path d="M22 70h195" stroke="'+glow+'" stroke-width="14" opacity=".15"/>':'')+
        '<path d="M22 70h75" stroke="'+hex(d.butt)+'" stroke-width="9"/><path d="M28 67h62" stroke="#fff" opacity=".2"/>'+
        '<path d="M98 70h118" stroke="'+hex(d.shaft)+'" stroke-width="5"/><path d="M97 66v8m-8-8v8" stroke="'+(d.ring==='chrome'?'#c4d0d4':'#d5b56f')+'" stroke-width="3"/><path d="M216 68v4" stroke="#6f9aaf" stroke-width="3"/>'+
        (d.flame?'<path d="M42 64q-9-18 7-26-3 14 10 13-3 10 6 13" fill="'+hex(d.flameColor)+'" opacity=".85"/>':'')+
        (d.smoke?'<path d="M62 57q-15-10 0-19t0-20" stroke="#ced2cb" opacity=".3" fill="none"/>':'')+'</g>';
    } else {
      shapes='<path d="m25 49 155-14 36 20-154 20Z" fill="'+hex(d.wood)+'"/><path d="M25 49v34l37 22V75Z" fill="'+hex(d.wood)+'"/><path d="m62 75 154-20v32L62 105Z" fill="'+hex(d.wood)+'"/>'+
        '<path d="m62 75 154-20v32L62 105Z" fill="#000" opacity=".24"/>'+
        [0,1,2,3,4,5].map(i=>'<path d="m'+(35+i*22)+' '+(48-i*2)+'q24 5 38-2m-14 14 35-5" fill="none" stroke="#140e08" stroke-width="1" opacity=".28"/>').join('')+
        '<path d="m63 76 150-19" stroke="#f2dab0" opacity=".35"/><path d="m99 59 7-4 7 3-7 4Zm60-7 7-4 7 3-7 4Z" fill="#e7ce98"/>';
    }
    const grain=kind==='felt'?'<image href="assets/ui/collection/felt-detail-v3.webp" x="34" y="29" width="172" height="82" opacity=".1" preserveAspectRatio="xMidYMid slice"/>':kind==='rail'?'<image href="assets/ui/collection/wood-detail-v3.webp" x="25" y="35" width="191" height="70" opacity=".16" clip-path="url(#'+id+'-clip)" preserveAspectRatio="xMidYMid slice"/>':'';
    return '<svg class="item-preview" viewBox="0 0 240 140" role="img" aria-label="'+d.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+' preview"><defs><radialGradient id="'+id+'"><stop stop-color="#304339"/><stop offset="1" stop-color="#121c18"/></radialGradient><clipPath id="'+id+'-clip"><path d="m25 49 155-14 36 20v32L62 105 25 83Z"/></clipPath></defs><rect width="240" height="140" rx="10" fill="url(#'+id+')"/>'+shapes+grain+'</svg>';
  },
  layout(t){
    const pt=p=>[20+(p.x+1.12)/2.24*260,20+(p.z+0.56)/1.12*130];
    const mark=(p,n)=>{const [x,y]=pt(p);return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+(n===0?'#f5efdf':'#'+BALL_COLORS[n].toString(16).padStart(6,'0'))+'" stroke="#e1d4ad" stroke-width=".7"/>';};
    return '<svg class="layout-preview" viewBox="0 0 300 170" role="img" aria-label="'+t.name+' ball layout"><rect x="5" y="5" width="290" height="160" rx="13" fill="#4d3825"/><rect x="15" y="15" width="270" height="140" rx="8" fill="#17503b"/>'+[[17,17],[150,16],[283,17],[17,153],[150,154],[283,153]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="7" fill="#091710"/>').join('')+mark(t.cue,0)+t.balls.map(b=>mark(b,b.num)).join('')+'</svg>';
  },
  init(){
    const icons={'btn-settings3':'settings','ta-toggle':'menu','btn-orbit':'eye','btn-shoot':'cue','btn-fine':'target'};
    Object.keys(icons).forEach(id=>{const el=document.getElementById(id);if(el) el.innerHTML=this.icon(icons[id]);});
    const tiles=[['btn-campaign','trophy'],['btn-quick','cue'],['btn-online','people'],['btn-challenges','target'],['btn-trickshots','sparkle'],['btn-custom','settings']];
    tiles.forEach(([id,icon])=>{
      const el=document.getElementById(id);if(!el)return;
      el.insertAdjacentHTML('beforeend','<span class="tile-symbol">'+this.icon(icon)+'</span><span class="tile-arrow">'+this.icon('arrow')+'</span>');
    });
    const actions={'btn-menu':'home','btn-settings':'settings','btn-custom2':'sparkle','btn-fullscreen':'fullscreen','btn-uitoggle':'menu'};
    Object.keys(actions).forEach(id=>{const el=document.querySelector('#'+id+' .ta-ic');if(el)el.innerHTML=this.icon(actions[id]);});
    document.querySelectorAll('.modal-close').forEach(el=>{el.innerHTML=this.icon('close');el.setAttribute('aria-label','Close dialog');});
    const pressed=()=>document.querySelectorAll('.chip,.gt-card').forEach(el=>el.setAttribute('aria-pressed',el.classList.contains('sel')));
    pressed();
    document.addEventListener('click',e=>{if(e.target.closest('.chip,.gt-card'))pressed();});
    document.getElementById('modal-close').addEventListener('click',()=>{
      if(UI._modalOrigin && UI._modalOrigin.isConnected) UI._modalOrigin.focus({preventScroll:true});
    });
    /* Trap keyboard focus only inside the topmost dialog; Escape is owned by Input. */
    document.addEventListener('keydown',e=>{
      const overlay=['tutorial-overlay','modal-overlay','quick-overlay','gameover-overlay','menu-overlay'].map(id=>document.getElementById(id)).find(el=>el&&!el.classList.contains('hidden'));
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
