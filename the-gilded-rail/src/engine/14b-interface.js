/* Shared interface components. No work is added to the animation loop. */
Object.assign(UIArt.paths,{
  sound:'M4 9h4l5-5v16l-5-5H4V9Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  music:'M9 18V5l11-2v13M9 9l11-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ambience:'M3 15q3-4 6 0t6 0 6 0M3 20q3-4 6 0t6 0 6 0M12 3v5M5 5l2 2m12-2-2 2',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  display:'M3 4h18v13H3V4Zm9 13v4m-5 0h10',
  shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 9 3 3 5-6',
  user:'M4 21v-2a8 8 0 0 1 16 0v2M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  edit:'m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4',
  crown:'m3 6 5 5 4-7 4 7 5-5-2 13H5L3 6Zm3 10h12',
  cloud:'M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12H6Zm3-6 3-3 3 3m-3-3v7',
  search:'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6',
  arrowLeft:'m14 5-7 7 7 7M7 12h14',
  copy:'M8 8h13v13H8V8ZM3 16V3h13',
  chat:'M3 3h18v14H9l-6 4V3Zm4 5h10M7 12h7',
  cloth:'M3 5h18v14H3V5Zm4 0v14M17 5v14M3 9h18M3 15h18',
  wood:'M3 5h18v14H3V5Zm0 5q6-5 12 0t6 0M3 15q5-4 9 0t9 0',
  keyboard:'M2 6h20v13H2V6Zm4 4h1m3 0h1m3 0h1m3 0h1M6 14h1m3 0h8',
  light:'M9 18h6m-6 3h6M8 13a6 6 0 1 1 8 0l-1 2H9l-1-2Z',
  exit:'M9 3H3v18h6m6-15 6 6-6 6m-7-6h13',
  trophy:'M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8'
});
const Interface = {
  section(icon,title,body,desc=''){
    return '<section class="interface-section"><div class="section-heading"><span class="section-icon">'+UIArt.icon(icon)+'</span><div><h3>'+title+'</h3>'+(desc?'<p>'+desc+'</p>':'')+'</div></div>'+body+'</section>';
  },
  toggle(id,title,desc,on){
    return '<label class="preference-toggle" for="'+id+'"><span class="preference-copy"><strong>'+title+'</strong><small>'+desc+'</small></span><input type="checkbox" id="'+id+'"'+(on?' checked':'')+'><span class="switch-track" aria-hidden="true"></span></label>';
  },
  choices(attr,items,current){
    return '<div class="qual-row">'+items.map(([key,name,detail])=>'<button type="button" class="qual-btn'+(key===current?' sel':'')+'" data-'+attr+'="'+key+'" aria-pressed="'+(key===current)+'"><span>'+name+'</span>'+(detail?'<small>'+detail+'</small>':'')+'</button>').join('')+'</div>';
  },
  settingsNav(){
    const tabs=[['sound','sound','Audio','The sound of the club'],['play','cue','Gameplay','Your way to play'],['access','eye','Accessibility','Comfort & clarity'],['graphics','display','Graphics','Detail & atmosphere'],['club','shield','Club extras','Codes & discoveries']];
    return '<nav class="settings-nav" aria-label="Settings categories" role="tablist">'+tabs.map(([id,icon,name,desc])=>'<button id="setting-tab-'+id+'" role="tab" aria-controls="setting-panel-'+id+'" data-settings-tab="'+id+'">'+UIArt.icon(icon)+'<span>'+name+'<small>'+desc+'</small></span></button>').join('')+'</nav>';
  },
  wireSettings(){
    if(!document.querySelector)return;
    const buttons=Array.from(document.querySelectorAll('[data-settings-tab]'));
    const select=id=>{
      UI._settingsTab=id;
      buttons.forEach(b=>{const active=b.dataset.settingsTab===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;});
      document.querySelectorAll('[data-settings-panel]').forEach(p=>p.hidden=p.dataset.settingsPanel!==id);
    };
    buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.settingsTab));b.addEventListener('keydown',e=>{
      if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)+buttons.length)%buttons.length;
      select(buttons[n].dataset.settingsTab);buttons[n].focus();
    });});
    select(buttons.some(b=>b.dataset.settingsTab===UI._settingsTab)?UI._settingsTab:'sound');
  },
  decorate(kind){
    if(!document.querySelector)return;
    const content=document.getElementById('modal-content'),card=document.getElementById('modal-card');
    if(!kind){
      const title=content.querySelector('h2');
      if(title&&!content.querySelector('.collection-head')&&!content.querySelector('.member-card')){
        const text=title.textContent;
        const online=/Multiplayer|Room|Opponent Left|Leave/.test(text);
        const rules=/House Rules/.test(text);
        const art=online?'online-v2':rules?'tutorial-v3':'membership-v3';
        card.classList.add(online?'modal-online':rules?'modal-rules':'modal-account');
        title.outerHTML=UIArt.header(online?'THE PRIVATE TABLE':rules?'THE CLUB HANDBOOK':'MEMBERSHIP',text,'',art);
      }
    }
    content.querySelectorAll('.qual-row .qual-btn,.acct-tabs .qual-btn').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('sel')));
  },
  equipment(tab='felt'){
    const catalogs={felt:FELTS,cue:CUES,rail:RAILS};
    const d=catalogs[tab][Profile.data[tab]];
    return '<div class="equipment-stage stage-'+tab+'"><div class="equipment-stage-label"><span class="deco-eyebrow">CURRENTLY EQUIPPED</span><strong>'+d.name+'</strong><small>'+(d.desc||{felt:'Regulation cloth · 2:1 playing surface',cue:'Full-length cue · tapered shaft',rail:'Timber finish · polished edge'}[tab])+'</small></div><div class="equipment-preview">'+UIArt.item(tab,d,'equipped')+'</div></div>';
  },
  init(){
    const menu=document.getElementById('ta-menu');menu.inert=true;menu.setAttribute('aria-hidden','true');
    const pressed=e=>{const group=e.target.closest('.qual-row,.acct-tabs');if(group)group.querySelectorAll('.qual-btn').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('sel')));};
    document.addEventListener('click',pressed);
    const restore=document.getElementById('ui-restore');if(restore)restore.innerHTML=UIArt.icon('eye');
    const spin=document.getElementById('spin-reset');if(spin)spin.innerHTML=UIArt.icon('target')+'<span>Center strike</span>';
    document.getElementById('modal-close').addEventListener('click',()=>{UI._profileDraftName=null;if(Game.paused){Game.paused=false;UI.sync();}});
  }
};
