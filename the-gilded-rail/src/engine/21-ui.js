/* The Gilded Rail - UI
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= UI ================= */
/* Driver.js steps highlight the real controls, not a separate tutorial screen. */
const TUTORIAL_STEPS = [
  {title:'Welcome to your table',body:'Drag across the table to aim. On a keyboard, use ← and → for small adjustments. Your frame is held safely while we show you around.'},
  {element:'#scoreboard',title:'Follow the frame',body:'Your active player is marked in gold. Once groups are claimed, these ball markers show what remains. Clear your group, then pot the eight.',side:'bottom'},
  {element:'#mode-controls',title:'Find your angle',body:'Switch between looking around, lining up a shot, and fine aim. Tab changes view; E toggles fine aim.',side:'top'},
  {element:'#power-wrap',title:'Choose your power',body:'Hold this button, or Space, to build power. Release to strike. Lower power gives you more control over the next shot.',side:'top'},
  {element:'#spin-wrap',title:'Shape your next shot',body:'In fine aim, move the contact point for follow, draw, or side spin. Center strike resets it. Use arrow keys when this control has keyboard focus.',side:'left'},
  {element:'#ta-toggle',title:'Make yourself at home',body:'Open the match menu to resume a frame, adjust settings, or change equipment. You can replay this guide from How to Play in the club menu.',side:'bottom'},
];
const UI = {
  $(id){ return document.getElementById(id); },

  /* ---- first-run tutorial / how-to-play ---- */
  tutorialOpen(replay){
    return Onboarding.start(!!replay);
  },
  tutorialNext(){
    if(Onboarding.tour) Onboarding.tour.moveNext();
  },
  tutorialClose(){
    Onboarding.close();
  },

  refreshProfile(){
    const L=Profile.level(), pr=Profile.prestige(), star=pr>0?(' ★'+pr):'';
    this.$('lvl-num').textContent=L.lvl;
    this.$('hud-pname').textContent=Profile.data.name;
    this.$('menu-pname').textContent=Profile.data.name;
    this.$('hud-pxp').textContent = L.max ? ('MAX'+star) : (L.into+' / '+L.need+' XP'+star);
    /* progress ring: keep the dash a FULL circumference and reveal it by shrinking
       the dash-offset - the previous dasharray/offset combo rendered the wrong arc */
    const C=119.38;
    const frac = L.max ? 1 : Math.max(0, Math.min(1, L.into/L.need));
    const arc=this.$('lvl-arc');
    arc.setAttribute('stroke-dasharray', C.toFixed(2));
    arc.setAttribute('stroke-dashoffset', (C*(1-frac)).toFixed(2));
    this.applyAvatar();
    this.refreshMenuLocks();
  },

  miniBall(b){
    const d=document.createElement('div');
    if(Game.ruleset==='blackball'){
      /* English pool: solid reds / yellows / black, no numerals on the balls */
      d.className='mini-ball'+(b.num===8?' eight':'')+(b.active?'':' potted');
      d.style.background = b.num===8?'#15130f':(b.num<8?'#c62828':'#f3c200');
      d.textContent = Profile.data.a11y ? (b.num===8?'8':(b.num<8?'R':'Y')) : '';   // letters only in high-contrast
      d.title=(b.num===8?'black':(b.num<8?'red':'yellow'))+(b.active?'':' (potted)');
      return d;
    }
    d.className='mini-ball'+(b.num>8?' striped':'')+(b.num===8?' eight':'')+(b.active?'':' potted');
    const col='#'+BALL_COLORS[b.num===8?8:(b.num>8?b.num-8:b.num)].toString(16).padStart(6,'0');
    d.style.background = b.num>8
      ? 'linear-gradient(180deg,#f6f1e6 18%,'+col+' 18%,'+col+' 82%,#f6f1e6 82%)'
      : (b.num===8?'#141414':col);
    /* numerals on every marker so groups read without relying on colour */
    d.textContent=String(b.num);
    d.title=(b.num===8?'8-ball':(b.num>8?'Stripe ':'Solid ')+b.num)+(b.active?'':' (potted)');
    return d;
  },

  /* accessibility: high-contrast ball markers (rings/outlines + bigger numerals) */
  applyA11y(){ document.body.classList.toggle('a11y', !!Profile.data.a11y); },
  refreshScoreboard(){
    for(const i of [0,1]){
      const g=Game.groups[i];
      const tray=this.$('p'+i+'balls'); tray.innerHTML='';
      if(g){
        balls.filter(b=>b.num>0&&b.num!==8&&Game.groupOf(b)===g)
             .sort((a,b)=>a.num-b.num).forEach(b=>tray.appendChild(this.miniBall(b)));
        const e=balls.find(b=>b.num===8);
        if(Game.remaining(g)===0 && e) tray.appendChild(this.miniBall(e));
      }
      const strip=this.$('pc'+i);
      strip.classList.toggle('active', Game.turn===i && Game.phase!=='OVER' && Game.phase!=='MENU');
      const gn=g?Game.colourName(g):'';
      const detail=this.$('p'+i+'detail');
      if(detail) detail.textContent=gn ? gn.charAt(0).toUpperCase()+gn.slice(1)+' · '+Game.remaining(g)+' left' : (Game.turn===i?'At the table':'Waiting for the shot');
      strip.title = Game.openTable ? 'Open table' : (gn ? gn.charAt(0).toUpperCase()+gn.slice(1) : '');
    }
    this.$('p0name').textContent=Game.playerName(0).toUpperCase();
    this.$('p1name').textContent=Game.playerName(1).toUpperCase();
    /* the human (player 0) wears their profile picture; the opponent shows their
       initial. The active player's avatar gets the same gold glow as the turn dot. */
    this._scoreAvatar('p0av', Game.playerName(0), Profile.data.avatar);
    this._scoreAvatar('p1av', Game.playerName(1), UIArt.cpuPortrait());
    this.$('vs-sep').textContent = Game.openTable && Game.phase!=='MENU' ? 'open' : 'vs';
    this.refreshMatch();
  },

  /* paint a scoreboard avatar chip: a picture if supplied, else the name's initial */
  _scoreAvatar(id, name, img){
    const el=this.$(id); if(!el) return;
    img=/^assets\/ui\/collection\/portrait-[a-z0-9_-]+\.webp$/.test(img||'') ? img : this._safeAvatar(img);
    const ini=(name||'?').trim().charAt(0).toUpperCase()||'?';
    el.style.backgroundImage = img ? ('url('+img+')') : 'none';
    el.classList.toggle('has-pic', !!img);
    const sp=el.querySelector?el.querySelector('.p-av-ini'):null;
    if(sp){ sp.textContent=ini; sp.style.display = img ? 'none' : ''; }
    if(id==='p0av') this._applyBorder(el,false);   // the human wears their chosen ring colour
  },

  /* the campaign match strip (best-of-N running score), shown only during a match */
  refreshMatch(){
    const el=this.$('match-strip'); if(!el) return;
    if(Game.match && Game.phase!=='MENU'){
      const m=Game.match;
      el.classList.add('on');
      el.innerHTML='<span class="ms-opp">'+m.opp.name+'</span>'+
                   '<span class="ms-bo">Best of '+m.frames+'</span>'+
                   '<span class="ms-score">'+m.me+' : '+m.them+'</span>';
    } else el.classList.remove('on');
  },

  /* a brief "hand the device over" cue between players in local two-player */
  passBanner(player, bih){
    this.banner(Game.playerName(player)+' - your shot', bih?'Place the cue ball, then take aim':'Pass the device and take aim');
  },


  _bt:null,
  banner(big, sub){
    const el=this.$('banner');
    if(!big && !sub){ el.classList.remove('show'); return; }
    this.$('banner-big').textContent=big; this.$('banner-sub').textContent=sub;
    el.classList.add('show');
    clearTimeout(this._bt);
    this._bt=setTimeout(()=>el.classList.remove('show'), 3400);
  },

  xpToast(txt){
    const t=document.createElement('div'); t.className='xp-toast'; t.textContent=txt;
    document.body.appendChild(t); setTimeout(()=>t.remove(),1700);
  },

  gauge(p){
    this.$('pbar-fill').style.height=(p*100).toFixed(1)+'%';
    const pct=this.$('power-pct');
    pct.textContent=Math.round(p*100)+'%';
    pct.style.color = p>0.8 ? '#e2685c' : (p>0.55 ? '#e3c84a' : 'var(--gold-bright)');
  },

  spinDot(){
    const d=this.$('spin-dot');
    d.style.left=(50+Input.spin.x*50)+'%';
    d.style.top =(50-Input.spin.y*50)+'%';
    const sx=Input.spin.x, sy=Input.spin.y;
    let t='center strike';
    if(sy<-0.60){                                   // extreme low contact = jump/scoop
      t = sy<-0.70 ? 'JUMP - scoop over a ball' : 'jump shot ▾';
    } else if(Math.abs(sx)>0.08||Math.abs(sy)>0.08){
      const v = sy>0.12?'follow':(sy<-0.12?'draw':'');
      const h = sx>0.12?'right english':(sx<-0.12?'left english':'');
      t=[v,h].filter(Boolean).join(' + ')||'center strike';
    }
    this.$('spin-readout').textContent=t;
    const control=this.$('spin-ball');control.setAttribute('aria-valuemin','-75');control.setAttribute('aria-valuemax','75');
    control.setAttribute('aria-valuenow',Math.round(Input.spin.y*100));control.setAttribute('aria-valuetext',t);
  },

  sync(){
    const ph=Game.phase, m=Input.mode;
    document.body.classList.toggle('match-active',!!Game.match);
    this.$('hud').classList.toggle('on', ph!=='MENU');
    const orbitLook=m==='ORBIT'||m==='BIH'||ph==='SIM'||ph==='AI';
    this.$('btn-orbit').classList.toggle('active', orbitLook);
    /* right-side look stick: only while the free-cam view it turns is actually
       active - exactly when the power meter / spin pad are hidden, so the two
       can never occupy the same corner */
    const lookStick=this.$('look-stick'); if(lookStick) lookStick.classList.toggle('on', orbitLook);
    this.$('btn-shoot').classList.toggle('active', m==='SHOOT'&&(ph==='AIM'||ph==='CHARGE'));
    this.$('btn-fine').classList.toggle('active',  m==='FINE'&&(ph==='AIM'||ph==='CHARGE'));
    const canShoot=(ph==='AIM'||ph==='CHARGE')&&(m==='SHOOT'||m==='FINE');
    this.$('power-wrap').classList.toggle('on', canShoot);
    document.body.classList.toggle('charging', canShoot);   // moves #status clear of the meter
    this.$('spin-wrap').classList.toggle('on', m==='FINE'&&canShoot);
    this.$('bih-notice').classList.toggle('on', ph==='BIH');
    this.refreshCallPockets();
    /* a brief, fading status cue in the bottom-right (replaces the old hint bar) */
    if(ph==='MENU'){ const el=this.$('status'); if(el){ el.classList.remove('show'); this._statusText=null; } }
    else {
      let st;
      if(ph==='AIM'||ph==='CHARGE'){
        st = m==='FINE' ? 'Fine aim - set spin, then <b>hold</b> to charge'
           : (Game.mode==='local' ? Game.playerName(Game.turn)+' - aim &amp; charge'
                                   : 'Your shot - aim &amp; <b>hold</b> to charge');
      } else if(ph==='BIH'){
        st = 'Ball in hand - tap the felt to place the cue'+(Game.bihKitchen?' (behind the line)':'');
      } else if(ph==='SIM'){
        st = 'Balls rolling…';
      } else if(ph==='AI'){
        /* name the actual opponent (the campaign opponent, the local player, or the
           house) rather than the generic difficulty tier */
        st = Game.playerName(Game.turn)+' is at the table';
      } else {
        st = 'Walk &amp; orbit - <b>Tab</b> to take your shot';
      }
      this.statusHint(st);
    }
  },

  /* fade a short status line in (bottom-right), then out - re-fires only on change */
  statusHint(text){
    const el=this.$('status'); if(!el || text===this._statusText) return;
    this._statusText=text; el.innerHTML=text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._statusT); this._statusT=setTimeout(()=>el.classList.remove('show'), 2800);
  },

  modal(html, kind=''){
    const card=this.$('modal-card');
    if(this.$('modal-overlay').classList.contains('hidden')) this._modalOrigin=document.activeElement;
    card.className='modal-card panel'+(kind?' modal-'+kind:'');
    this.$('modal-content').innerHTML=html;
    if(kind!=='profile') this._profileDraftName=null;
    Interface.decorate(kind);
    this.$('modal-overlay').classList.remove('hidden');
    const title=card.querySelector?card.querySelector('h2'):null;
    if(title) card.setAttribute('aria-label',title.textContent);
    card.scrollTop=0;
    const close=this.$('modal-close'); if(close && close.focus) close.focus({preventScroll:true});
  },

  /* collapse the in-match actions dropdown */
  closeQuickbar(){
    const ta=this.$('top-actions'); if(!ta) return;
    ta.classList.remove('ta-open'); ta.classList.add('ta-closed');
    const tog=this.$('ta-toggle'); if(tog) tog.setAttribute('aria-expanded','false');
    const menu=this.$('ta-menu');if(menu){menu.inert=true;menu.setAttribute('aria-hidden','true');}
  },

  pauseMenu(){
    if(Game.mode==='online') return Net.confirmLeave(false);
    if(Game.phase==='MENU'||Game.phase==='OVER')return;
    this.closeQuickbar();
    if(Input.charging) Input.cancelCharge();
    Input.keys={}; Game.paused=true;
    this.modal(UIArt.header('YOUR TABLE IS WAITING','Take a moment.','The frame will be right here when you return.','reflection-v3')+
      '<div class="pause-actions"><button class="btn primary" id="pause-resume">'+UIArt.icon('cue')+' Return to the table</button>'+
      '<button class="btn ghost" id="pause-settings">'+UIArt.icon('settings')+' Settings</button>'+
      '<button class="btn ghost" id="pause-equipment">'+UIArt.icon('sparkle')+' Your equipment</button>'+
      '<button class="linklike" id="pause-leave">Leave this frame</button></div>','pause');
    const resume=()=>{Game.paused=false;this.$('modal-overlay').classList.add('hidden');this.sync();};
    this.$('pause-resume').addEventListener('click',resume);
    this.$('pause-settings').addEventListener('click',()=>this.settingsModal());
    this.$('pause-equipment').addEventListener('click',()=>this.customizeModal());
    this.$('pause-leave').addEventListener('click',()=>{
      Game.paused=false;simActive=false;Game.abandonMatch();Game.phase='MENU';
      this.$('modal-overlay').classList.add('hidden');this.$('menu-overlay').classList.remove('hidden');this.sync();
    });
  },

  gameOver(won, why, xp, shots, pots, ctx){
    ctx=ctx||{};
    let eyebrow='FRAME COMPLETE', title=won?'Victory':'The House Wins', rematchLabel='Rematch';
    this._rematchAction=()=>Game.newGame();
    const opp = ctx.match?ctx.match.opp:(ctx.matchDecided?ctx.opp:null);
    const me  = ctx.match?ctx.match.me :(ctx.matchDecided?ctx.me :null);
    const them= ctx.match?ctx.match.them:(ctx.matchDecided?ctx.them:null);

    if(ctx.match){                               // a frame inside an ongoing match
      eyebrow='FRAME '+(me+them)+' · BEST OF '+ctx.match.frames;
      title = won?'Frame Won':'Frame Lost';
      rematchLabel='Next Frame';
    } else if(ctx.matchDecided){                 // the match just ended
      eyebrow = ctx.wonMatch?'MATCH WON':'MATCH LOST';
      title = ctx.wonMatch ? (Campaign.isFinal(opp)?'House Champion':'Match Won') : 'Match Lost';
      if(ctx.wonMatch){
        const nxt=Campaign.next();
        if(nxt){ rematchLabel='Next: '+nxt.name; this._rematchAction=()=>Campaign.start(nxt); }
        else   { rematchLabel='Play Again';     this._rematchAction=()=>Campaign.start(opp); }
      } else { rematchLabel='Try Again';         this._rematchAction=()=>Campaign.start(opp); }
    }

    const r=Game.lastRated;
    this.$('go-eyebrow').textContent=eyebrow;
    this.$('go-title').textContent=title;
    this.$('go-sub').textContent = why + (opp? '  ·  '+me+'–'+them+' vs '+opp.name : '')
      + (r? '  ·  '+r.rank+' '+r.rating+' ('+(r.delta>=0?'+':'')+r.delta+')' : '');
    this.$('go-rematch').textContent=rematchLabel;
    const acc = shots? Math.round(100*pots/shots):0;
    this.$('go-stats').innerHTML =
      '<div class="go-grid">'+
      '<div><b>'+xp+'</b><span>XP earned</span></div>'+
      '<div><b>'+pots+'</b><span>balls potted</span></div>'+
      '<div><b>'+shots+'</b><span>shots taken</span></div>'+
      '<div><b>'+acc+'%</b><span>pot rate</span></div></div>';
    const card=this.$('gameover-card');
    this.$('result-art').innerHTML=UIArt.image(won?'victory-v3':'reflection-v3','result-cover');
    this.$('result-medallion').innerHTML=UIArt.icon(won?'trophy':'cue');
    if(card){ card.classList.toggle('result-win', !!won); card.classList.toggle('result-loss', !won); }
    this.$('gameover-overlay').classList.remove('hidden');
    /* result-screen audio: a crowd roar on a win, a brass sting on a loss */
    Sfx.ensure(); Sfx.play(won?'win':'fail');
  },

  settingsModal(){
    const v=Profile.data.vol;
    const row=(id,label,val,icon,desc)=>'<div class="volume-control"><div class="volume-heading">'+UIArt.icon(icon)+'<label for="vol-'+id+'">'+label+'<small>'+desc+'</small></label>'+
      '<span class="vval" id="vv-'+id+'">'+Math.round(val*100)+'%</span></div>'+
      '<input type="range" id="vol-'+id+'" min="0" max="100" value="'+Math.round(val*100)+'" aria-label="'+label+' volume"></div>';
    const panel=(id,html)=>'<div class="settings-pane" id="setting-panel-'+id+'" role="tabpanel" aria-labelledby="setting-tab-'+id+'" data-settings-panel="'+id+'">'+html+'</div>';
    const audio=Interface.section('sound','The sound of the club',
      row('sfx','Sound effects',v.sfx,'cue','Every strike, cushion and pocket')+
      row('music','Music',v.music,'music','The club soundtrack')+
      row('amb','Ambience',v.amb,'ambience','Rain, room tone and atmosphere')+
      Interface.toggle('mute-all','Mute all audio','Keep the club quiet.',!Profile.data.sound));
    const play=Interface.section('target','Make every shot your own',
      '<div class="preference-label"><strong>Aim guide</strong><p>Choose how much of the shot you can see.</p></div>'+Interface.choices('ag',[['full','Full guide','Path + contact point'],['cue','Cue line','Your initial direction'],['off','No guide','Trust your eye']],Profile.data.aimGuide||'full')+
      Interface.toggle('flash-enable','Pocket flashlight','Enable the room flashlight. Press F to switch it.',Profile.data.flashlightEnabled)+
      Interface.toggle('called-shots','Call the eight','Choose a pocket before your final 8-ball shot.',Profile.data.calledShots));
    const access=Interface.section('eye','A clearer view of the game',
      Interface.toggle('a11y-balls','High-contrast ball markers','Clear numbers and markings, beyond color alone.',Profile.data.a11y)+
      Interface.toggle('haptics-on','Vibration feedback','A subtle response to strikes and pots on supported devices.',Profile.data.haptics!==false)+
      '<div class="comfort-note">'+UIArt.icon('keyboard')+'<p>All menus support keyboard navigation. Use Tab to move, Enter to choose, and Esc to close. Motion follows your device’s reduced-motion preference.</p></div>');
    const graphics=Interface.section('display','Set the atmosphere',
      '<div class="preference-label"><strong>Graphics quality</strong><p>Balance visual detail with a smooth game.</p></div>'+Interface.choices('q',[['low','Low','Fastest · no shadows'],['medium','Balanced','Detail meets performance'],['high','High','Full lighting & shadows']],Profile.data.quality)+
      '<div class="preference-label"><strong>Depth of field</strong><p>Bring your shot into focus with cinematic lens blur.</p></div>'+Interface.choices('dof',[['off','Off'],['normal','Subtle'],['strong','Cinematic']],Profile.data.dof||'off'));
    const club=Interface.section('shield','A few club secrets',this._secretSection(), 'An invitation, a discovery, a little history.');
    this.modal(UIArt.header('CLUB PREFERENCES','Settings','A few details make all the difference.','settings-v3')+
      '<div class="settings-layout">'+Interface.settingsNav()+'<div class="settings-content">'+panel('sound',audio)+panel('play',play)+panel('access',access)+panel('graphics',graphics)+panel('club',club)+'</div></div>'+
      '<div class="settings-save-note" role="status">'+UIArt.icon('check')+' Preferences save automatically <span>Changes apply immediately</span></div>','settings');
    Interface.wireSettings();
    ['sfx','music','amb'].forEach(b=>{
      const sl=this.$('vol-'+b);
      sl.addEventListener('input',()=>{
        const val=sl.value/100; Sfx.ensure(); Sfx.setVol(b,val);
        this.$('vv-'+b).textContent=sl.value+'%';
        if(b==='sfx') Sfx.play('clack',0.5);
      });
    });
    this.$('mute-all').addEventListener('change',e=>{ Sfx.ensure(); Sfx.setMute(e.target.checked); });
    this.$('a11y-balls').addEventListener('change',e=>{
      Profile.data.a11y=e.target.checked; Profile.save(); this.applyA11y(); this.refreshScoreboard(); Sfx.play('ui',0.3);
    });
    this.$('called-shots').addEventListener('change',e=>{
      Profile.data.calledShots=e.target.checked; Profile.save(); this.sync(); Sfx.play('ui',0.3);
    });
    this.$('haptics-on').addEventListener('change',e=>{
      Profile.data.haptics=e.target.checked; Profile.save(); if(e.target.checked) Haptics.buzz(20);
    });
    const fe=this.$('flash-enable');
    if(fe) fe.addEventListener('change',e=>{
      Profile.data.flashlightEnabled=e.target.checked; Profile.save();
      if(typeof Flashlight!=='undefined') Flashlight.set(e.target.checked);   // turn it on now (off when disabled)
      Sfx.play('ui',0.3);
    });
    document.querySelectorAll('.qual-btn[data-q]').forEach(b=>b.addEventListener('click',()=>{
      Profile.data.quality=b.dataset.q; Profile.save(); Graphics.apply();
      document.querySelectorAll('.qual-btn[data-q]').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); Sfx.play('ui',0.3);
    }));
    document.querySelectorAll('.qual-btn[data-ag]').forEach(b=>b.addEventListener('click',()=>{
      Profile.data.aimGuide=b.dataset.ag; Profile.save();
      document.querySelectorAll('.qual-btn[data-ag]').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); Sfx.play('ui',0.3);
    }));
    document.querySelectorAll('.qual-btn[data-dof]').forEach(b=>b.addEventListener('click',()=>{
      Profile.data.dof=b.dataset.dof; Profile.save();   // PostFX.render() reads this live - no rebuild needed
      document.querySelectorAll('.qual-btn[data-dof]').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); Sfx.play('ui',0.3);
    }));
    this._wireSecret();
  },

  /* ---- secret codes: a discreet redeem box + any unlocked extras ---- */
  CODES:{ 'SPEAKEASY':'original' },
  _secretSection(){
    const c=(Profile.data.codes)||{};
    return '<h3>Secret Code</h3>'+
      '<div class="set-line" style="gap:8px;align-items:center">'+
        '<input id="code-in" maxlength="24" placeholder="Enter code…" autocomplete="off" spellcheck="false" '+
          'style="flex:1;min-width:0;padding:10px 12px;background:rgba(0,0,0,.35);border:1px solid rgba(201,163,92,.4);'+
          'border-radius:8px;color:var(--cream);font-size:14px;letter-spacing:.12em;text-transform:uppercase;outline:none">'+
        '<button class="qual-btn" id="code-redeem">Redeem</button>'+
      '</div>'+
      '<div id="code-msg" style="font-size:11px;letter-spacing:.05em;min-height:14px;margin:2px 0 4px;color:var(--muted)"></div>'+
      (c.original ? '<div style="margin-top:8px"><button class="btn" id="play-original" style="width:100%">▸ Play the Original (the very first build)</button></div>' : '');
  },
  _wireSecret(){
    const inp=this.$('code-in'), btn=this.$('code-redeem');
    if(btn) btn.addEventListener('click',()=>this.redeemCode(inp?inp.value:''));
    if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') this.redeemCode(inp.value); });
    const po=this.$('play-original');
    if(po) po.addEventListener('click',()=>this.launchOriginal());
  },
  redeemCode(raw){
    const code=(raw||'').trim().toUpperCase().replace(/\s+/g,'');
    const msg=this.$('code-msg');
    if(!code) return;
    const feat=this.CODES[code];
    if(!feat){ if(msg){ msg.textContent='Unrecognized code.'; msg.style.color='var(--red)'; } Sfx.play('ui',0.35); return; }
    if(Profile.data.codes && Profile.data.codes[feat]){ if(msg){ msg.textContent='Already unlocked.'; msg.style.color='var(--muted)'; } return; }
    if(!Profile.data.codes) Profile.data.codes={};
    Profile.data.codes[feat]=true; Profile.save(); Sfx.play('win');
    const names={original:'the Original build'};
    this.settingsModal();                                   // re-render so the new control appears
    const m2=this.$('code-msg'); if(m2){ m2.textContent='Unlocked '+names[feat]+'!'; m2.style.color='var(--teal)'; }
  },
  /* open the bundled first-ever build (easter-egg.html) in a full-screen overlay frame */
  launchOriginal(){
    let ov=this.$('original-overlay');
    if(!ov){
      ov=document.createElement('div'); ov.id='original-overlay';
      ov.style.cssText='position:fixed;inset:0;z-index:60;background:#000;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#0b0c10;border-bottom:1px solid rgba(201,163,92,.3)">'+
        '<span style="font-family:Fraunces,serif;color:#e8c987;font-size:14px;letter-spacing:.1em">The Gilded Rail · Original Build</span>'+
        '<button id="original-close" class="btn" style="padding:6px 14px">Close ✕</button></div>'+
        '<iframe id="original-frame" title="Original build" allow="autoplay" style="flex:1;width:100%;border:0;background:#000"></iframe>';
      document.body.appendChild(ov);
      this.$('original-close').addEventListener('click',()=>{ const f=this.$('original-frame'); if(f) f.src='about:blank'; ov.remove(); Sfx.play('ui',0.3); });
    }
    this.$('modal-overlay').classList.add('hidden');
    this.$('original-frame').src='easter-egg.html';
    Sfx.play('ui');
  },

  /* first initial for the fallback (text) avatar */
  _initials(){ const n=(Profile.data.name||'G').trim(); return (n.charAt(0)||'G').toUpperCase(); },

  /* only ever use an avatar that is a real inline image. Guards against a tampered or
     (later) server-supplied value injecting anything into the CSS url() it lands in. */
  _safeAvatar(a){ return (typeof a==='string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(a)) ? a : null; },

  /* paint the menu avatar button: the picture if set, else the initial; plus the
     unlocked border ring */
  applyAvatar(){
    const img=this.$('menu-avatar'), ini=this.$('menu-avatar-initials'), btn=this.$('btn-profile');
    const a=this._safeAvatar(Profile.data.avatar);
    if(img) img.style.backgroundImage = a ? ('url('+a+')') : 'none';
    if(ini){ ini.textContent=this._initials(); ini.style.display = a ? 'none' : ''; }
    if(btn){ btn.classList.toggle('has-pic', !!a); this._applyBorder(btn,true); }
  },
  /* apply the chosen avatar border (colour ring + glow) to an element */
  _applyBorder(el, glow){
    if(!el) return;
    const b=(typeof BORDERS!=='undefined' && BORDERS[Profile.data.avatarBorder])||null;
    if(!b){ return; }
    el.style.borderColor=b.col;
    if(glow) el.style.boxShadow='0 0 12px '+b.glow+', 0 6px 18px rgba(0,0,0,.5)';
  },

  /* read an image file → downscale to a 256² square (cover) → data URL, so the saved
     avatar stays small in localStorage */
  _readAvatar(file, cb){
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        try{
          const S=256, c=document.createElement('canvas'); c.width=S; c.height=S;
          const ctx=c.getContext('2d');
          const sc=Math.max(S/img.width, S/img.height), w=img.width*sc, h=img.height*sc;
          ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
          cb(c.toDataURL('image/jpeg',0.85));
        }catch(_){ cb(r.result); }
      };
      img.onerror=()=>cb(r.result);
      img.src=r.result;
    };
    r.readAsDataURL(file);
  },

  /* the profile menu: picture, name, border + banner cosmetics, and career stats */
  profileModal(){
    const s=Profile.data.stats, L=Profile.level(), lvl=L.lvl;
    const acc=s.shots?Math.round(100*s.potted/s.shots):0;
    const rk=(typeof Progression!=='undefined')?Progression.rankTier():'';
    const star=Profile.prestige()>0?(' ★'+Profile.prestige()):'';
    const a=this._safeAvatar(Profile.data.avatar);
    const bdef=BORDERS[Profile.data.avatarBorder]||BORDERS.gold;
    const bandef=BANNERS[Profile.data.banner]||BANNERS.felt;
    const ringStyle='border-color:'+bdef.col+';box-shadow:0 0 14px '+bdef.glow;
    if(this._profileDraftName==null) this._profileDraftName=Profile.data.name;
    /* border + banner swatch rows (level-gated, like Customize) */
    const borderSw=Object.entries(BORDERS).map(([k,d])=>{
      const open=lvl>=d.lvl, sel=Profile.data.avatarBorder===k;
      return '<button class="cos-sw'+(sel?' sel':'')+(open?'':' locked')+'" data-bd="'+k+'" aria-pressed="'+sel+'" aria-disabled="'+!open+'" title="'+d.name+(open?'':' · Level '+d.lvl)+'">'+
        '<span class="cos-ring" style="border-color:'+d.col+';box-shadow:0 0 8px '+d.glow+'"></span>'+
        '<span class="cos-nm">'+d.name+'<small>'+(sel?'Equipped':open?'Available':'Level '+d.lvl)+'</small></span></button>';
    }).join('');
    const bannerSw=Object.entries(BANNERS).map(([k,d])=>{
      const open=lvl>=d.lvl, sel=Profile.data.banner===k;
      return '<button class="cos-sw ban'+(sel?' sel':'')+(open?'':' locked')+'" data-ban="'+k+'" aria-pressed="'+sel+'" aria-disabled="'+!open+'" title="'+d.name+(open?'':' · Level '+d.lvl)+'">'+
        '<span class="cos-ban" style="background:'+d.css+'"></span>'+
        '<span class="cos-nm">'+d.name+'<small>'+(sel?'Equipped':open?'Available':'Level '+d.lvl)+'</small></span></button>';
    }).join('');
    this.modal(
      '<h2 class="sr-only">Player profile</h2><div class="member-card" style="--member-tint:'+bandef.css+'">'+UIArt.image('membership-v3','member-art')+'<div class="member-card-top"><span class="deco-eyebrow">THE GILDED RAIL · PLAYER CARD</span>'+UIArt.icon('crown')+'</div>'+
      '<div class="prof-head">'+
        '<button class="prof-avatar'+(a?' has-pic':'')+'" id="prof-pic" title="Change picture" '+
          'style="'+(a?('background-image:url('+a+');'):'')+ringStyle+'"><span class="prof-av-ini">'+this._initials()+'</span>'+
          '<span class="prof-av-edit" aria-hidden="true">'+UIArt.icon('edit')+'</span></button>'+
        '<div class="prof-id">'+
          '<label class="profile-name-label" for="prof-name">Your name at the table</label><input id="prof-name" class="prof-name-in" maxlength="18" aria-label="Member name" value="'+this._profileDraftName.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'+
          '<div class="prof-sub">Level '+lvl+star+' · '+(Profile.data.rating||1000)+(rk?(' · '+rk):'')+'</div>'+
          '<div class="prof-actions"><button class="linklike" id="prof-change">Change picture</button>'+
            (a?'<button class="linklike" id="prof-rm">Remove</button>':'')+'</div>'+
        '</div>'+
      '</div></div>'+
      '<input type="file" id="prof-file" accept="image/*" style="display:none">'+
      '<div class="profile-progress"><span class="section-icon">'+UIArt.icon('trophy')+'</span><div><strong>'+rk+' · '+(Profile.data.rating||1000)+' rating</strong><small>'+(L.max?'The top of the ladder. Prestige awaits.':(L.need-L.into)+' XP to Level '+(lvl+1))+'</small><div class="member-xp"><span style="width:'+Math.round(100*L.into/L.need)+'%"></span></div></div><span class="profile-level">'+lvl+'<small>LEVEL</small></span></div>'+
      '<div class="go-grid prof-stats">'+
        '<div><b>'+Profile.data.xp+'</b><span>lifetime XP</span></div>'+
        '<div><b>'+s.wins+' / '+s.games+'</b><span>frames won</span></div>'+
        '<div><b>'+s.potted+'</b><span>balls potted</span></div>'+
        '<div><b>'+acc+'%</b><span>pot rate</span></div>'+
        '<div><b>'+(s.bestFrameStreak||0)+'</b><span>best win streak</span></div>'+
        '<div><b>'+s.eights+'</b><span>8-balls sunk</span></div></div>'+
      '<div id="profile-account"></div>'+
      '<div class="profile-cosmetics">'+Interface.section('crown','Avatar ring','<div class="cos-row" id="border-row">'+borderSw+'</div>','A signature around your portrait.')+
      Interface.section('cloth','Profile banner','<div class="cos-row" id="banner-row">'+bannerSw+'</div>','Set the tone of your player card.')+'</div>'+
      '<div class="profile-save-bar"><span>'+UIArt.icon('shield')+' Your reputation, your style.</span><button class="btn primary" id="prof-save">Save profile</button></div>', 'profile'
    );
    const save=()=>{
      const v=this.$('prof-name').value.trim()||'Guest';
      Profile.data.name=v; Profile.save(); this.refreshProfile(); this.refreshScoreboard();
      this._profileDraftName=null;
      this.$('modal-overlay').classList.add('hidden'); Sfx.play('ui');
    };
    this.$('prof-save').addEventListener('click',save);
    this.$('prof-name').addEventListener('input',e=>this._profileDraftName=e.target.value);
    this.$('prof-name').addEventListener('keydown',e=>{ if(e.key==='Enter') save(); });
    const file=this.$('prof-file');
    const pick=()=>file.click();
    this.$('prof-pic').addEventListener('click',pick);
    this.$('prof-change').addEventListener('click',pick);
    file.addEventListener('change',e=>{
      const f=e.target.files&&e.target.files[0]; if(!f) return;
      this._readAvatar(f, url=>{ Profile.data.avatar=url; Profile.save(); this.applyAvatar(); this.refreshScoreboard(); this.profileModal(); });
    });
    const rm=this.$('prof-rm'); if(rm) rm.addEventListener('click',()=>{ Profile.data.avatar=null; Profile.save(); this.applyAvatar(); this.refreshScoreboard(); this.profileModal(); });
    document.querySelectorAll('#border-row [data-bd]').forEach(b=>b.addEventListener('click',()=>{
      const k=b.dataset.bd; if(lvl<BORDERS[k].lvl) return;
      Profile.data.avatarBorder=k; Profile.save(); this.applyAvatar(); this.refreshScoreboard(); this.profileModal();
    }));
    document.querySelectorAll('#banner-row [data-ban]').forEach(b=>b.addEventListener('click',()=>{
      const k=b.dataset.ban; if(lvl<BANNERS[k].lvl) return;
      Profile.data.banner=k; Profile.save(); this.profileModal();
    }));
  },

  /* cycle the aim guide (G) - Full → Cue Line → Off → … with a status cue */
  cycleAimGuide(){
    const order=['full','cue','off'], cur=Profile.data.aimGuide||'full';
    const next=order[(order.indexOf(cur)+1)%order.length];
    Profile.data.aimGuide=next; Profile.save(); Sfx.play('ui',0.4);
    this._statusText=null;                 // force the status line to re-fire
    this.statusHint('Aim guide: <b>'+({full:'Full',cue:'Cue line',off:'Off'})[next]+'</b>');
  },

  /* called-shots: a compact pocket picker shown only while the human is on the 8 */
  buildCallPockets(){
    const el=this.$('call-pockets'); if(!el) return;
    el.innerHTML='';
    POCKETS.forEach((p,i)=>{
      const lab=(p.type==='side'?'S':'')+(p.pos.z<0?'T':'B')+(p.type!=='side'?(p.pos.x<0?'L':'R'):'');
      const b=document.createElement('button'); b.className='callp'; b.textContent=lab; b.dataset.pi=i;
      b.addEventListener('click',()=>{ Game.calledPocket=i; Sfx.play('ui',0.4); this.refreshCallPockets(); });
      el.appendChild(b);
    });
  },
  refreshCallPockets(){
    const el=this.$('call-pockets'); if(!el) return;
    const show = Game.needCall && Game.needCall() && (Game.phase==='AIM'||Game.phase==='CHARGE');
    el.classList.toggle('on', !!show);
    (el.children?Array.from(el.children):[]).forEach(b=>b.classList.toggle('sel', (+b.dataset.pi)===Game.calledPocket));
  },

  /* the career ladder - COVER VIEW: five league covers. Click one to open its
     detail (the five opponents). New leagues open as you level up. */
  campaignModal(){
    const covers=Campaign.leagues().map((l,i)=>{
      const open=Campaign.leagueUnlocked(l);
      const done=l.opps.filter(o=>Campaign.cleared(o.id)).length;
      const full=Campaign.leagueCleared(l);
      const pct=Math.round(100*done/l.opps.length);
      const meta = open ? (done+' / '+l.opps.length+' cleared'+(full?' ✓':'')) : '🔒 Reach Level '+l.minLevel;
      return '<button class="lg-card art-league'+(i+1)+(open?'':' locked')+(full?' cleared':'')+'" data-lg="'+l.id+'">'+
        '<div class="lg-shade"></div>'+
        '<div class="lg-cardbody">'+
          '<span class="lg-no">League '+(i+1)+(full?' · Champion':'')+'</span>'+
          '<span class="lg-cname">'+l.name+'</span>'+
          '<span class="lg-meta">'+meta+'</span>'+
          '<div class="lg-prog"><div class="lg-progfill" style="width:'+pct+'%"></div></div>'+
        '</div></button>';
    }).join('');
    const done=Campaign.clearedCount(), total=Campaign.totalOpps();
    const prestige = Profile.canPrestige()
      ? '<button class="btn primary" id="do-prestige" style="width:100%;margin:6px 0 14px">★ Prestige '+(Profile.prestige()+1)+
        ' - reset to Level 1, keep every unlock</button>'
      : (Profile.prestige()>0?'<p style="text-align:center;color:var(--gold-bright)">★ Prestige '+Profile.prestige()+'</p>':'');
    this.modal(UIArt.header('THE ROAD TO HOUSE CHAMPION','The Career Ladder','Every table has its legends. Earn your place among them.','career-v2')+
      '<p>Five leagues, each with five players - the fifth is the boss. Pick a league to see its roster. '+
      '<b>'+done+' of '+total+'</b> opponents cleared.</p>'+ prestige +
      '<div class="lg-cover-grid">'+covers+'</div>', 'career');
    document.querySelectorAll('.lg-card').forEach(b=>b.addEventListener('click',()=>this.leagueModal(b.dataset.lg)));
    const pb=this.$('do-prestige');
    if(pb) pb.addEventListener('click',()=>{ if(Profile.doPrestige()){ Sfx.play('win'); this.campaignModal(); } });
  },

  /* league DETAIL VIEW - the five opponents, with a back link to the cover */
  leagueModal(id){
    const l=Campaign.leagueById(id); if(!l) return;
    const i=Campaign.leagueIndex(id), open=Campaign.leagueUnlocked(l);
    const done=l.opps.filter(o=>Campaign.cleared(o.id)).length;
    const cards=l.opps.map(opp=>{
      const unlocked=open && Campaign.isUnlocked(opp), cleared=Campaign.cleared(opp.id);
      const state=cleared?'Cleared':(unlocked?'Available':'Locked');
      const action = unlocked
        ? '<button class="btn '+(cleared?'ghost':'primary')+' camp-play" data-opp="'+opp.id+'">'+(cleared?'Replay':'Play')+'</button>'
        : '<span class="camp-lock">'+(open?'Win the previous match':'Reach Level '+l.minLevel)+'</span>';
      return '<div class="camp-card opponent-card'+(cleared?' cleared':'')+(unlocked?'':' locked')+(opp.boss?' boss':'')+'">'+
        '<div class="opponent-portrait"><img src="'+UIArt.portrait(opp.id)+'" alt="Portrait of '+opp.name.replace(/"/g,'&quot;')+'" width="256" height="256" loading="lazy" decoding="async">'+(opp.boss?'<span class="boss-seal">'+UIArt.icon('trophy')+'League boss</span>':'')+'</div><div class="opponent-copy">'+
        '<div class="camp-head"><div class="camp-name">'+(opp.boss?'★ ':'')+opp.name+(cleared?' ✓':'')+'</div>'+
        '<span class="camp-state">'+state+'</span></div>'+
        '<div class="camp-meta">'+opp.title+' · Best of '+opp.frames+' · '+DIFFS[opp.diff].name+'</div>'+
        '<p class="camp-blurb">'+opp.blurb+'</p><div class="opponent-reward">'+UIArt.icon('sparkle')+' '+opp.xp+' XP first clear</div>'+action+'</div></div>';
    }).join('');
    this.modal('<button class="linklike lg-back" id="lg-back">‹ All leagues</button>'+
      UIArt.header('LEAGUE '+(i+1),l.name,l.blurb,'league-'+l.id)+
      '<p class="lg-detail-sub">League '+(i+1)+' · '+(open?(done+' / '+l.opps.length+' cleared'):'Unlocks at Level '+l.minLevel)+'</p>'+
      '<div class="camp-list opponent-grid">'+cards+'</div>', 'roster');
    this.$('lg-back').addEventListener('click',()=>this.campaignModal());
    document.querySelectorAll('.camp-play').forEach(b=>b.addEventListener('click',()=>{
      const opp=Campaign.oppById(b.dataset.opp);
      if(!opp) return;
      this.$('modal-overlay').classList.add('hidden');
      this.$('menu-overlay').classList.add('hidden');
      Sfx.ensure();
      Campaign.start(opp);
    }));
  },

  /* preset trick-shot layouts, played in Practice mode */
  trickshotModal(){
    const cards=TRICKSHOTS.map(t=>
      '<div class="camp-card trick-card">'+UIArt.layout(t)+'<div class="camp-head"><div class="camp-name">'+t.name+'</div></div>'+
      '<p class="camp-blurb">'+t.desc+'</p>'+
      '<button class="btn primary camp-play trick-play" data-t="'+t.id+'">Set Up</button></div>').join('');
    this.modal(UIArt.header('THE PRACTICE ROOM','Trick Shots','Read the angles. Learn the table. Make the impossible feel routine.','trickshot-v2')+
      '<p>Preset layouts to sharpen your aim and position. Ball in hand - clear the table to reset.</p>'+
      '<div class="camp-list trick-grid">'+cards+'</div>', 'tricks');
    document.querySelectorAll('.trick-play').forEach(b=>b.addEventListener('click',()=>{
      const t=TRICKSHOTS.find(x=>x.id===b.dataset.t); if(!t) return;
      this.$('modal-overlay').classList.add('hidden');
      this.$('menu-overlay').classList.add('hidden');
      Sfx.ensure(); Sfx.play('ui');
      Game.startTrickshot(t);
    }));
  },

  /* daily/weekly challenges + the achievement gallery */
  challengesModal(){
    const bar=(st,def)=>{
      if(!def) return '';
      const pct=Math.min(100, Math.round(100*st.prog/def.goal));
      return '<div class="chal-row'+(st.done?' done':'')+'">'+
        '<div class="chal-top"><span class="chal-name">'+def.name+(st.done?' ✓':'')+'</span>'+
        '<span class="chal-xp">+'+def.xp+' XP</span></div>'+
        '<div class="chal-desc">'+def.desc+'</div>'+
        '<div class="chal-bar"><div class="chal-fill" style="width:'+pct+'%"></div></div>'+
        '<div class="chal-prog">'+Math.min(st.prog,def.goal)+' / '+def.goal+'</div></div>';
    };
    const d=Progression.daily(), w=Progression.weekly();
    const ach=Progression.achList().map(a=>{ const got=Progression.unlocked(a.id);
      return '<div class="ach'+(got?' got':'')+'"><div class="ach-badge">'+UIArt.icon(got?'trophy':'lock')+'</div>'+
        '<div class="ach-body"><div class="ach-name">'+a.name+'</div><div class="ach-desc">'+a.desc+'</div></div>'+
        '<div class="ach-xp">'+a.xp+'</div></div>';
    }).join('');
    const got=Progression.achList().filter(a=>Progression.unlocked(a.id)).length;
    this.modal(UIArt.header('A LITTLE BETTER, EVERY FRAME','Challenges','Small victories. Lasting reputation.','challenges-v2')+
      '<h3>Today</h3>'+bar(d.st,d.def)+
      '<h3>This Week</h3>'+bar(w.st,w.def)+
      '<h3>Achievements - '+got+' / '+Progression.achList().length+'</h3>'+
      '<div class="ach-list">'+ach+'</div>', 'challenges');
  },

  customizeModal(tab){
    tab=['felt','cue','rail'].includes(tab)?tab:(this._atelierTab||'felt');
    this._atelierTab=tab;
    const lvl=Profile.level().lvl;
    /* one renderer for any catalog (felt/cue/rail) keeps the three sections in sync */
    const tags=d=>(d.smoke||d.glow||d.flame)?'<span class="item-effect" title="'+[d.smoke?'Smoke':null,d.glow?'Glow':null,d.flame?'Flame':null].filter(Boolean).join(' · ')+'">'+UIArt.icon(d.flame?'light':'sparkle')+'</span>':'';
    const swatches=(catalog, current, attr)=>Object.entries(catalog).map(([k,d])=>{
      const open=lvl>=d.lvl, sel=current===k;
      return '<button type="button" class="swatch'+(sel?' sel':'')+(open?'':' locked')+'" data-'+attr+'="'+k+'" aria-pressed="'+sel+'" aria-disabled="'+!open+'"'+(!open?' title="Unlocks at Level '+d.lvl+'"':'')+'>'+
        UIArt.item(attr,d,k)+(sel||!open?'<span class="sw-status">'+UIArt.icon(sel?'check':'lock')+'</span>':'')+
        '<div class="sw-info"><div class="sw-name">'+d.name+tags(d)+'</div>'+
        '<div class="sw-sub">'+(open?(sel?'Equipped':'Ready to equip'):'Unlocks at Level '+d.lvl)+'</div></div></button>';
    }).join('');
    const cats={felt:FELTS,cue:CUES,rail:RAILS};
    const previews=swatches(cats[tab],Profile.data[tab],tab);
    const count=Object.values(cats[tab]).filter(d=>lvl>=d.lvl).length;
    const tabs=[['felt','Table cloth','target'],['cue','Cues','cue'],['rail','Wood finishes','sparkle']].map(([key,label,icon])=>
      '<button type="button" class="atelier-tab'+(tab===key?' active':'')+'" data-atelier="'+key+'" aria-pressed="'+(tab===key)+'">'+UIArt.icon(icon)+label+'</button>').join('');
    this.modal(UIArt.header('THE EQUIPMENT ATELIER','Make it yours.','An expression of your game, down to the last detail.','atelier-v3')+
      Interface.equipment(tab)+
      '<div class="atelier-tabs" aria-label="Equipment category">'+tabs+'</div>'+
      '<div class="atelier-tools"><label class="equipment-search">'+UIArt.icon('search')+'<input id="equipment-search" type="search" placeholder="Find your next signature…" aria-label="Search equipment"></label><button class="qual-btn" id="equipment-available" aria-pressed="false">Unlocked only</button></div>'+
      '<div class="equipment-count">'+count+' of '+Object.keys(cats[tab]).length+' unlocked · Select an item to equip</div>'+
      '<div class="swatch-grid catalog-'+tab+'">'+previews+'</div><p class="equipment-empty" id="equipment-empty" hidden>No equipment matches this search.</p>'+
      '<p class="atelier-note">Earn XP by potting balls, winning frames and clearing the career ladder. Every level brings something new.</p>', 'customize');
    if(document.querySelector){
      this._equipmentFilters=this._equipmentFilters||{};
      const state=this._equipmentFilters[tab]||(this._equipmentFilters[tab]={query:'',available:false});
      this.$('equipment-search').value=state.query;
      const filter=()=>{
        state.query=String(this.$('equipment-search').value||'');
        const q=state.query.trim().toLowerCase();let shown=0;
        document.querySelectorAll('.swatch').forEach(el=>{const match=el.textContent.toLowerCase().includes(q)&&(!state.available||!el.classList.contains('locked'));el.hidden=!match;if(match)shown++;});
        this.$('equipment-available').setAttribute('aria-pressed',state.available);
        this.$('equipment-empty').hidden=shown!==0;
        const countEl=document.querySelector('.equipment-count');if(countEl)countEl.textContent=shown+' items · '+count+' unlocked';
      };
      this.$('equipment-search').addEventListener('input',filter);
      this.$('equipment-available').addEventListener('click',()=>{state.available=!state.available;filter();});
      filter();
    }
    document.querySelectorAll('[data-atelier]').forEach(b=>b.addEventListener('click',()=>this.customizeModal(b.dataset.atelier)));
    /* generic picker wiring for each catalog */
    const pick=(attr,catalog,apply)=>document.querySelectorAll('['+'data-'+attr+']').forEach(el=>el.addEventListener('click',()=>{
      const k=el.dataset[attr]; if(lvl<catalog[k].lvl){ return; }
      const scroll=this.$('modal-card').scrollTop;
      Profile.data[attr]=k; Profile.save(); apply(); this.customizeModal(attr);
      this.$('modal-card').scrollTop=scroll;
      const selected=document.querySelector?document.querySelector('[data-'+attr+'="'+k+'"]'):null;
      if(selected) selected.focus({preventScroll:true});
    }));
    pick('felt', FELTS, ()=>Unlocks.applyFelt());
    pick('cue',  CUES,  ()=>Unlocks.applyCue());
    pick('rail', RAILS, ()=>Unlocks.applyRail());
  },

  /* mark level-locked game types in the Bento Quick-Match panel */
  refreshMenuLocks(){
    document.querySelectorAll('#type-row [data-t]').forEach(b=>{
      const t=b.dataset.t, open=(typeof Progression==='undefined')||Progression.modeUnlocked(t);
      b.classList.toggle('locked', !open);
      /* show the unlock level in the STATIC badge (data-lock), not a hover tooltip:
         a data-tip here would hijack the same ::after the badge uses and morph it on
         hover. The badge text is fixed so the locked card never changes on hover. */
      b.removeAttribute('data-tip');
      if(!open) b.setAttribute('data-lock','🔒 Locked · Lvl '+Progression.modeLevel(t));
      else b.removeAttribute('data-lock');
    });
  },

  wire(){
    this.buildCallPockets();
    /* ONE delegated click sound for every interactive control in the UI. Controls
       keep their own behaviour; the 60ms de-dupe in Sfx.play('ui') means a control
       that also calls Sfx.play('ui') itself won't double the click. The 3D canvas
       and disabled/locked controls are excluded. */
    const CLICKABLE='button,.chip,.swatch,.callp,.qual-btn,.b-tile,.camp-card,.lg-card,.linklike,input[type=checkbox],label,[role="slider"]';
    document.addEventListener('pointerdown',e=>{
      try{
        const el=e.target.closest&&e.target.closest(CLICKABLE);
        if(!el) return;
        if(el.disabled || el.classList.contains('locked') || el.classList.contains('b-locked')) return;
        Sfx.ensure(); Sfx.play('ui',0.28);   /* 20% softer than the previous 0.35 */
      }catch(_){/* a click must never be blocked by an audio hiccup */}
    }, true);
    /* difficulty */
    document.querySelectorAll('#diff-row .chip').forEach(b=>{
      b.addEventListener('click',()=>{
        document.querySelectorAll('#diff-row .chip').forEach(x=>x.classList.remove('sel'));
        b.classList.add('sel'); Game.diff=+b.dataset.d; Sfx.play('ui');
      });
    });
    /* game type - level-locked; Practice is solo so it hides the opponent + difficulty rows */
    document.querySelectorAll('#type-row [data-t]').forEach(b=>{
      b.addEventListener('click',()=>{
        const t=b.dataset.t;
        if(typeof Progression!=='undefined' && !Progression.modeUnlocked(t)){
          b.animate?b.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:180}):0;
          return;
        }
        document.querySelectorAll('#type-row [data-t]').forEach(x=>x.classList.remove('sel'));
        b.classList.add('sel'); Game.ruleset=t; Game._practiceLayout=null;
        const solo=Game.ruleset==='practice';
        this.$('mode-group').style.display = solo?'none':'';
        this.$('diff-group').style.display = solo?'none':'';
      });
    });
    document.querySelectorAll('#mode-row .chip').forEach(b=>{
      b.addEventListener('click',()=>{
        document.querySelectorAll('#mode-row .chip').forEach(x=>x.classList.remove('sel'));
        b.classList.add('sel'); Game.mode=b.dataset.m; Sfx.play('ui');
        const dg=this.$('diff-group');
        dg.style.opacity = Game.mode==='cpu' ? '1' : '0.32';
        dg.style.pointerEvents = Game.mode==='cpu' ? 'auto' : 'none';
        document.querySelectorAll('#diff-row .chip').forEach(x=>x.disabled=Game.mode!=='cpu');
      });
    });
    this.$('btn-newgame').addEventListener('click',()=>{
      Sfx.ensure();
      this.$('quick-overlay').classList.add('hidden');
      this.$('menu-overlay').classList.add('hidden');
      Game.newGame();
    });
    /* Quick Match opens its own setup overlay (game type + players + difficulty) */
    this.$('btn-quick').addEventListener('click',()=>{ Sfx.ensure(); this.$('quick-overlay').classList.remove('hidden'); });
    this.$('quick-close').addEventListener('click',()=>this.$('quick-overlay').classList.add('hidden'));
    this.$('quick-overlay').addEventListener('click',e=>{ if(e.target===this.$('quick-overlay')) this.$('quick-overlay').classList.add('hidden'); });
    this.$('btn-menu').addEventListener('click',()=>{
      this.pauseMenu();
    });
    this.$('go-rematch').addEventListener('click',()=>{
      Sfx.stopCheer();                 // applause fades out the moment you leave the screen
      this.$('gameover-overlay').classList.add('hidden');
      (this._rematchAction||(()=>Game.newGame()))();
    });
    this.$('go-menu').addEventListener('click',()=>{
      Sfx.stopCheer();
      this.$('gameover-overlay').classList.add('hidden');
      Game.abandonMatch();
      this.$('menu-overlay').classList.remove('hidden'); Game.phase='MENU'; this.sync();
    });
    this.$('btn-campaign').addEventListener('click',()=>{ Sfx.play('ui'); this.campaignModal(); });
    this.$('btn-challenges').addEventListener('click',()=>{ Sfx.play('ui'); this.challengesModal(); });
    this.$('btn-trickshots').addEventListener('click',()=>{ Sfx.play('ui'); this.trickshotModal(); });
    this.$('btn-howto').addEventListener('click',()=>{ Sfx.play('ui'); this.tutorialOpen(true); });
    this.$('modal-close').addEventListener('click',()=>this.$('modal-overlay').classList.add('hidden'));
    this.$('modal-overlay').addEventListener('click',e=>{ if(e.target===this.$('modal-overlay')) this.$('modal-overlay').classList.add('hidden'); });

    this.$('btn-settings').addEventListener('click',()=>this.settingsModal());
    this.$('btn-custom').addEventListener('click',()=>this.customizeModal());
    this.$('btn-custom2').addEventListener('click',()=>this.customizeModal());
    /* fullscreen: works across browsers via vendor prefixes (Android Chrome/Firefox,
       desktop). iOS Safari has no element-fullscreen API, so the button just no-ops
       there - everything else still runs. */
    const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement;
    const fsEnter=()=>{ const el=document.documentElement;
      (el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen||function(){}).call(el); };
    const fsExit=()=>{ (document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen||function(){}).call(document); };
    this.$('btn-fullscreen').addEventListener('click',()=>{
      if(fsEl()) fsExit(); else fsEnter();
      Sfx.play('ui');
    });
    const onFsChange=()=>{
      const fsb=this.$('btn-fullscreen'); if(!fsb) return;
      fsb.title = fsEl() ? 'Exit fullscreen (Esc)' : 'Fullscreen';
      const lbl=fsb.querySelector('.ta-lbl'); if(lbl) lbl.textContent = fsEl() ? 'Exit Fullscreen' : 'Fullscreen';
    };
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
      .forEach(ev=>document.addEventListener(ev,onFsChange));

    /* portrait "rotate your device" hint: a brief, self-dismissing nudge rather than a
       permanent banner. Shows for ~5s on startup (and again whenever the phone is
       turned back to portrait), then fades out on its own. Touch portrait only. */
    const rh=this.$('rotate-hint'); let rhFade=null, rhGone=null;
    const showRotate=()=>{
      if(!rh || !document.body.classList.contains('touch')) return;
      if(!(typeof matchMedia!=='undefined' && matchMedia('(orientation:portrait)').matches)) return;
      clearTimeout(rhFade); clearTimeout(rhGone);
      rh.classList.remove('fading'); rh.classList.add('show');
      rhFade=setTimeout(()=>{ rh.classList.add('fading');
        rhGone=setTimeout(()=>rh.classList.remove('show','fading'), 450); }, 5000);
    };
    showRotate();
    addEventListener('orientationchange',()=>setTimeout(showRotate,300));
    const toggleUI=()=>{ document.body.classList.toggle('ui-hidden'); Sfx.play('ui'); };
    this.$('btn-uitoggle').addEventListener('click',toggleUI);
    this.$('ui-restore').addEventListener('click',toggleUI);
    addEventListener('keydown',e=>{ if(e.code==='KeyH' && Game.phase!=='MENU' && !Onboarding.active) toggleUI(); });

    this.$('btn-rules').addEventListener('click',()=>this.modal(
      '<h2>House Rules</h2>'+
      '<p>Regulation 8-ball, WPA style. The table is <b>open after the break</b> - the first legally potted ball claims your group (solids 1–7 or stripes 9–15). Clear your group, then sink the 8 to win.</p>'+
      '<p><b>Fouls</b> (opponent gets ball in hand): scratching the cue ball, failing to hit one of your own balls first, and no ball reaching a cushion after contact. A foul on the break gives ball in hand behind the head string.</p>'+
      '<p><b>The 8-ball:</b> potting it early, or scratching while potting it, loses the frame instantly. An 8 made on the break is re-spotted and play continues.</p>'+
      '<p><i>Club simplifications:</i> shots are not called, and a soft break is not penalised.</p>'
    ));
    /* top-right of the Bento: profile (name / picture / career stats) + settings */
    this.$('btn-profile').addEventListener('click',()=>this.profileModal());
    this.$('btn-settings3').addEventListener('click',()=>this.settingsModal());

    /* in-match actions dropdown: one trigger opens the full set; closes on item
       click or an outside click (same behaviour on desktop and mobile) */
    const ta=this.$('top-actions'), tog=this.$('ta-toggle');
    tog.addEventListener('click',e=>{
      e.stopPropagation();
      const open=ta.classList.toggle('ta-open'); ta.classList.toggle('ta-closed',!open);
      tog.setAttribute('aria-expanded', open?'true':'false');
      const actions=this.$('ta-menu');actions.inert=!open;actions.setAttribute('aria-hidden',!open);
      if(open&&e.detail===0&&actions.querySelector) actions.querySelector('button').focus();
    });
    document.querySelectorAll('#ta-menu .ta-item').forEach(it=>it.addEventListener('click',()=>this.closeQuickbar()));
    document.addEventListener('click',e=>{ if(ta.contains && !ta.contains(e.target)) this.closeQuickbar(); });
    this.$('btn-orbit').addEventListener('click',()=>{ if(Game.phase==='AIM'||Game.phase==='CHARGE') Input.enterOrbit(); });
    this.$('btn-shoot').addEventListener('click',()=>{ if(Game.phase==='AIM'||Game.phase==='CHARGE') Input.enterShootMode(false); });
    this.$('btn-fine').addEventListener('click',()=>Input.toggleFine());


    /* spin pad */
    const sb=this.$('spin-ball');
    const setSpin=e=>{
      const r=sb.getBoundingClientRect();
      let x=((e.clientX-r.left)/r.width-0.5)*2, y=-(((e.clientY-r.top)/r.height-0.5)*2);
      const m=Math.hypot(x,y); if(m>0.75){ x*=0.75/m; y*=0.75/m; }
      Input.spin.x=x; Input.spin.y=y; this.spinDot();
    };
    let sd=false;
    sb.addEventListener('pointerdown',e=>{ sd=true; e.preventDefault();
      try{ sb.setPointerCapture(e.pointerId); }catch(_){}; setSpin(e); });
    sb.addEventListener('keydown',e=>{
      if(Onboarding.active||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==='Home'){Input.spin.x=0;Input.spin.y=0;}
      else {
        if(e.key==='ArrowLeft')Input.spin.x-=.05;if(e.key==='ArrowRight')Input.spin.x+=.05;
        if(e.key==='ArrowUp')Input.spin.y+=.05;if(e.key==='ArrowDown')Input.spin.y-=.05;
        const length=Math.hypot(Input.spin.x,Input.spin.y);if(length>.75){Input.spin.x*=.75/length;Input.spin.y*=.75/length;}
      }
      this.spinDot();
    });
    addEventListener('pointermove',e=>{ if(sd) setSpin(e); });
    addEventListener('pointerup',()=>sd=false);
    addEventListener('pointercancel',()=>sd=false);
    this.$('spin-reset').addEventListener('click',()=>{ Input.spin.x=0; Input.spin.y=0; this.spinDot(); });
  }
};

/* a tiny stylesheet add for the game-over grid */
(function(){
  const st=document.createElement('style');
  st.textContent='.go-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0;text-align:center}'+
    '.go-grid div{background:rgba(255,255,255,.03);border:1px solid rgba(201,163,92,.18);border-radius:10px;padding:12px}'+
    '.go-grid b{display:block;font-family:Fraunces,serif;font-size:24px;color:#e8c987}'+
    '.go-grid span{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(239,231,214,.55)}'+
    '#modal-content h2{font-family:Fraunces,serif;font-weight:500;font-size:26px;color:#e8c987;margin-bottom:12px}'+
    '#modal-content p{font-size:14px;line-height:1.65;color:rgba(239,231,214,.85);margin-bottom:10px}';
  document.head.appendChild(st);
})();
