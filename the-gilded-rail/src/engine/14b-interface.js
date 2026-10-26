/* Shared interface components. No work is added to the animation loop. */
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
    const spin=document.getElementById('spin-reset');if(spin)spin.innerHTML=UIArt.icon('center')+'<span>Center strike</span>';
    document.getElementById('modal-close').addEventListener('click',()=>{UI._profileDraftName=null;if(Game.paused){Game.paused=false;UI.sync();}});
  }
};
