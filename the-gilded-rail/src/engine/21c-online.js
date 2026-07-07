/* The Gilded Rail - ONLINE MULTIPLAYER + ACCOUNT UI
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files.

   Online play is HOST-AUTHORITATIVE: the host's machine runs the real physics
   and rules for both players and streams ball states to the guest, so a
   tampered client can't invent outcomes. The guest aims locally (positions are
   always synced) and sends only the shot parameters. Rooms are private
   Supabase Realtime channels - server policies reject anyone who isn't a
   signed-in, email-verified member - keyed by an unguessable 6-character code.
   Two phones on the same Wi-Fi just share a code; so do two players an ocean
   apart. (Browsers expose no Bluetooth/raw-LAN sockets to games - room codes
   are the web's way of doing "local" play.)

   All game-flow integration is done by WRAPPING Game/Input methods at load
   time, so solo / local / campaign play is untouched. */

/* strip anything that could smuggle markup through a remote player's name */
function grCleanName(n){ return String(n||'').replace(/[<>&"'`]/g,'').slice(0,18) || 'Player'; }

const Net = {
  channel:null, code:null, seat:-1,           // seat 0 = host, 1 = guest
  names:['',''],
  active:false,                               // an online match is in progress
  peerHere:false,
  _stream:null,                               // host: ball-state broadcast interval
  _status:'',                                 // lobby status line

  available(){ return typeof Account!=='undefined' && Account.available(); },

  makeCode(){
    const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';    // no 0/O/1/I/L ambiguity
    const u=new Uint32Array(6); crypto.getRandomValues(u);
    return Array.from(u, x=>A[x%A.length]).join('');
  },

  /* ---------- room lifecycle ---------- */
  host(){ return this._open(this.makeCode(), 0); },
  join(code){ return this._open(String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''), 1); },

  _open(code, seat){
    if(!this.available() || !Account.signedIn()) return Promise.resolve({error:'Sign in first'});
    if(this.channel) this.leave(true);
    if(!code || code.length!==6) return Promise.resolve({error:'Enter the 6-character room code'});
    this.code=code; this.seat=seat; this.peerHere=false;
    this.names=['',''];
    this.names[seat]=grCleanName(Profile.data.name);
    const ch=Account.sb.channel('gr-room-'+code, {
      config:{ private:true, broadcast:{ self:false }, presence:{ key:Account.user.id } }
    });
    this.channel=ch;
    ch.on('presence', {event:'sync'}, ()=>this._onPresence());
    ch.on('broadcast', {event:'start'}, ({payload})=>this._onStart(payload));
    ch.on('broadcast', {event:'again'}, ({payload})=>this._onStart(payload));
    ch.on('broadcast', {event:'shot'},  ({payload})=>this._onShot(payload));
    ch.on('broadcast', {event:'bih'},   ({payload})=>this._onBih(payload));
    ch.on('broadcast', {event:'state'}, ({payload})=>this._onState(payload));
    ch.on('broadcast', {event:'sync'},  ({payload})=>this._onSync(payload));
    ch.on('broadcast', {event:'over'},  ({payload})=>this._onOver(payload));
    ch.on('broadcast', {event:'ready'}, ()=>this._onReady());
    ch.on('broadcast', {event:'bye'},   ()=>this._onPeerLeft(true));
    return new Promise(resolve=>{
      ch.subscribe(async status=>{
        if(status==='SUBSCRIBED'){
          await ch.track({ seat, name:this.names[seat] });
          resolve({ok:true, code});
        } else if(status==='CHANNEL_ERROR' || status==='TIMED_OUT'){
          resolve({error:'Could not reach the club - check your connection and sign-in'});
        }
      });
    });
  },

  _presences(){
    const st=this.channel ? this.channel.presenceState() : {};
    const out=[];
    Object.keys(st).forEach(k=>st[k].forEach(m=>out.push(m)));
    return out;
  },
  _onPresence(){
    const ps=this._presences();
    const other=ps.find(p=>p.seat!==this.seat);
    /* a full room admits no third chair: a later joiner sees both seats taken */
    if(this.seat===1 && ps.filter(p=>p.seat===1).length>1){
      const mine=ps.filter(p=>p.seat===1);
      /* someone else already holds the guest seat (we track after them) */
      if(mine.length>1 && !this.active){ this._status='That room is full.'; this.leave(true); LobbyUI.refresh(); return; }
    }
    const had=this.peerHere;
    this.peerHere=!!other;
    if(other) this.names[other.seat===0?0:1]=grCleanName(other.name);
    if(had && !this.peerHere && this.active) this._onPeerLeft(false);
    if(typeof LobbyUI!=='undefined') LobbyUI.refresh();
  },

  send(event, payload){
    try{ if(this.channel) this.channel.send({type:'broadcast', event, payload}); }catch(e){}
  },

  leave(quiet){
    if(this.channel){
      if(!quiet) this.send('bye',{});
      try{ Account.sb.removeChannel(this.channel); }catch(e){}
    }
    clearInterval(this._stream); this._stream=null;
    this.channel=null; this.code=null; this.seat=-1; this.active=false; this.peerHere=false;
    if(Game.mode==='online') Game.mode='cpu';
  },

  _onPeerLeft(said){
    if(!this.active){ if(typeof LobbyUI!=='undefined') LobbyUI.refresh(); return; }
    const nm=this.names[1-this.seat]||'Your opponent';
    this.leave(true);
    document.getElementById('gameover-overlay').classList.add('hidden');
    Game.phase='MENU';
    document.getElementById('menu-overlay').classList.remove('hidden');
    UI.sync();
    UI.modal('<h2>Opponent Left</h2><p><b>'+nm+'</b> '+(said?'left the table':'lost their connection')+'. The frame is void - no result was recorded.</p>');
  },

  /* ---------- match flow ---------- */
  startMatch(){                       // host only, once the guest is seated
    if(this.seat!==0 || !this.peerHere) return;
    Game.breaker=0;
    this.send('start', { names:this.names, breaker:0 });
    this._begin(0);
  },
  _onStart(p){
    if(!p) return;
    if(Array.isArray(p.names)) this.names=[grCleanName(p.names[0]), grCleanName(p.names[1])];
    this._begin(p.breaker===1?1:0);
  },
  _begin(breaker){
    this.active=true;
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('quick-overlay').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
    Game.mode='online'; Game.ruleset='8ball'; Game.match=null; Game._practiceLayout=null;
    Game.breaker=breaker;
    Sfx.ensure();
    if(this.seat===0){
      Game.newGame();               // the host runs the real rules; beginTurn syncs the guest
      if(!this._stream) this._stream=setInterval(()=>{
        if(this.active && this.seat===0 && Game.phase==='SIM') this.send('state', { b:this._snapshot() });
      }, 85);
    } else {
      /* guest: build the same fresh rack locally and wait for the host's cues */
      setBallSkin('numbered');
      rackBalls(); Trough.reset(); Sfx.startAtmosphere();
      Game.turn=breaker; Game.groups=[null,null]; Game.openTable=true; Game.isBreak=true;
      Game.bihKitchen=false; Game.streak=0; Game.frameShots=0; Game.framePots=0; Game.frameFouls=0;
      shotEvents.reset(true);
      if(breaker===1){ Game.phase='AIM'; Input.enterShootMode(true); }
      else { Game.phase='AI'; Input.enterOrbit(); cueStick.visible=false; }
      UI.refreshScoreboard();
      UI.banner(this.names[breaker]+(breaker===this.seat?' - your break':' breaks'), 'Open table - sink a ball to claim a group');
      UI.sync();
    }
  },

  /* ---------- host: authoritative state out ---------- */
  _snapshot(){
    return balls.map(b=>[ b.num,
      +b.pos.x.toFixed(4), +b.pos.y.toFixed(4), +b.pos.z.toFixed(4),
      (b.active&&!b.falling)?1:0,
      +b.mesh.quaternion.x.toFixed(3), +b.mesh.quaternion.y.toFixed(3),
      +b.mesh.quaternion.z.toFixed(3), +b.mesh.quaternion.w.toFixed(3) ]);
  },
  sendSync(phase){                    // called from the beginTurn wrapper on the host
    if(!this.active || this.seat!==0) return;
    this.send('sync', {
      b:this._snapshot(), turn:Game.turn, phase,
      groups:Game.groups, openTable:Game.openTable, bihKitchen:Game.bihKitchen, isBreak:Game.isBreak,
      banner:[ document.getElementById('banner-big').textContent,
               document.getElementById('banner-sub').textContent,
               document.getElementById('banner').classList.contains('show')?1:0 ]
    });
  },

  /* ---------- guest: state in ---------- */
  _applyBalls(arr){
    if(!Array.isArray(arr)) return;
    for(const row of arr){
      if(!Array.isArray(row) || row.length<5) continue;
      const n=row[0]|0, b=balls.find(x=>x.num===n);
      if(!b) continue;
      const x=+row[1], y=+row[2], z=+row[3];
      if(!isFinite(x)||!isFinite(y)||!isFinite(z)) continue;
      b.pos.set(x,y,z); b.vel.set(0,0,0); b.ang.set(0,0,0);
      b.mesh.position.set(x,y,z);
      if(row.length>=9 && isFinite(+row[5])) b.mesh.quaternion.set(+row[5],+row[6],+row[7],+row[8]);
      const act=!!row[4];
      if(!act && b.active){          // potted on the host's table
        b.active=false; b.falling=false; b.mesh.visible=false; b.shadowDisc.visible=false;
        Sfx.play('pocket', 0.6);
      } else if(act && !b.active){   // re-spotted (8 off the break, foul 9 etc.)
        b.active=true; b.falling=false; b.mesh.visible=true; b.shadowDisc.visible=true;
      }
      if(act){ b.mesh.visible=true; b.shadowDisc.visible=true; }
    }
  },
  _onState(p){
    if(this.seat!==1 || !this.active || !p) return;
    this._applyBalls(p.b);
    if(Game.phase!=='SIM'){ Game.phase='SIM'; aimGroup.visible=false; cueStick.visible=false; UI.sync(); }
  },
  _onSync(p){
    if(this.seat!==1 || !this.active || !p) return;
    this._applyBalls(p.b);
    if(Array.isArray(p.groups)) Game.groups=[p.groups[0]||null, p.groups[1]||null];
    Game.openTable=!!p.openTable; Game.bihKitchen=!!p.bihKitchen; Game.isBreak=!!p.isBreak;
    Game.turn=(p.turn===1)?1:0;
    if(p.banner && p.banner[2]) UI.banner(String(p.banner[0]||''), String(p.banner[1]||''));
    if(Game.turn===this.seat){
      if(p.phase==='BIH'){ Game.phase='BIH'; Input.enterBIH(); }
      else { Game.phase='AIM'; Input.enterShootMode(true); }
    } else {
      Game.phase='AI'; Input.enterOrbit(); cueStick.visible=false;
    }
    UI.refreshScoreboard(); UI.sync();
  },
  _onOver(p){
    if(this.seat!==1 || !this.active || !p) return;
    this._applyBalls(p.b);
    Game.phase='OVER';
    Game.lastRated=null;              // online frames are unrated (no CPU Elo)
    const won=!p.hostWon;
    /* the guest banks their own XP + stats for the frame */
    Profile.data.stats.games++;
    let xp=18;
    if(won){ Profile.data.stats.wins++; Profile.data.stats.eights++; xp=120; }
    Profile.data.xp+=xp; Profile.save(); UI.refreshProfile();
    UI.refreshScoreboard();
    UI.gameOver(won, String(p.why||'').slice(0,120), xp, Game.frameShots, Game.framePots);
  },
  _onReady(){                          // guest wants a rematch
    if(this.seat!==0) return;
    UI.xpToast(grCleanName(this.names[1])+' is ready for a rematch');
  },

  /* ---------- host: guest input in (validated before it touches the table) ---------- */
  _onShot(p){
    if(this.seat!==0 || !this.active || !p) return;
    if(Game.turn!==1 || Game.phase!=='AI') return;      // only on the guest's turn
    const yaw=+p.yaw, power=+p.power, sx=+p.sx, sy=+p.sy;
    if(!isFinite(yaw)||!isFinite(power)||!isFinite(sx)||!isFinite(sy)) return;
    const P=Math.max(0.02, Math.min(1, power));
    const SX=Math.max(-0.75, Math.min(0.75, sx)), SY=Math.max(-0.75, Math.min(0.75, sy));
    Game.fire(new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw)), P, SX, SY);
  },
  _onBih(p){
    if(this.seat!==0 || !this.active || !p) return;
    if(Game.turn!==1 || Game.phase!=='AI') return;
    const x=+p.x, z=+p.z;
    if(!isFinite(x)||!isFinite(z)) return;
    const pos=new THREE.Vector3(x, BALL.R, z);
    if(!Input.validBIH(pos)) return;                    // host re-checks the placement
    cueBall.pos.copy(pos); cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
    cueBall.active=true; cueBall.falling=false;
    cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
    this.sendSync('AIM');                               // confirmed position back to the guest
  },

  /* leaving mid-match needs a deliberate choice, not a stray Esc */
  confirmLeave(fromGameOver){
    UI.modal('<h2>Leave the Match?</h2><p>Leaving ends the online frame for both players.</p>'+
      '<div style="display:flex;gap:12px;margin-top:16px">'+
      '<button class="btn primary" id="net-stay" style="flex:1">Keep Playing</button>'+
      '<button class="btn ghost" id="net-go" style="flex:1">Leave Match</button></div>');
    document.getElementById('net-stay').addEventListener('click',()=>document.getElementById('modal-overlay').classList.add('hidden'));
    document.getElementById('net-go').addEventListener('click',()=>{
      this.leave(false);
      Sfx.stopCheer();
      document.getElementById('modal-overlay').classList.add('hidden');
      document.getElementById('gameover-overlay').classList.add('hidden');
      Game.phase='MENU';
      document.getElementById('menu-overlay').classList.remove('hidden');
      UI.sync();
    });
  }
};

/* ================= GAME-FLOW HOOKS (online mode only) =================
   Wrapping instead of editing keeps every offline mode byte-identical. */
(function(){
  const _beginTurn=Game.beginTurn.bind(Game);
  Game.beginTurn=function(player, opts){
    if(this.mode!=='online') return _beginTurn(player, opts);
    opts=opts||{};
    this.calledPocket=null;
    if(player===Net.seat){
      if(opts.bih){ this.phase='BIH'; Input.enterBIH(); }
      else { this.phase='AIM'; Input.enterShootMode(true); }
    } else {
      this.phase='AI'; Input.enterOrbit(); cueStick.visible=false;
    }
    if(Net.seat===0) Net.sendSync(opts.bih?'BIH':'AIM');
    UI.sync();
  };

  const _isHuman=Game.isHuman.bind(Game);
  Game.isHuman=function(t){ return this.mode==='online' ? t===Net.seat : _isHuman(t); };

  const _playerName=Game.playerName.bind(Game);
  Game.playerName=function(i){
    if(this.mode==='online') return Net.names[i] || (i===0?'Host':'Guest');
    return _playerName(i);
  };

  /* called-shots stays a house rule for offline play; online judges plain WPA */
  const _needCall=Game.needCall.bind(Game);
  Game.needCall=function(p){ return this.mode==='online' ? false : _needCall(p); };

  const _fire=Game.fire.bind(Game);
  Game.fire=function(dir, power, sx, sy){
    if(this.mode==='online' && Net.seat===1){
      /* guest: the host's table is the real one - send the stroke, watch it play out */
      Net.send('shot', { yaw:Math.atan2(dir.z,dir.x), power, sx, sy });
      this.frameShots++;
      Profile.data.stats.shots++;
      this.phase='SIM';
      aimGroup.visible=false; cueStick.visible=false;
      UI.sync();
      return;
    }
    _fire(dir, power, sx, sy);
  };

  const _endFrame=Game.endFrame.bind(Game);
  Game.endFrame=function(humanWon, why){
    if(this.mode==='online' && Net.seat===0){
      Net.send('over', { b:Net._snapshot(), hostWon:humanWon, why });
    }
    _endFrame(humanWon, why);
  };

  /* on the guest's screen the HOST is player 0 - the local profile picture
     belongs on the guest's own chip (player 1), not the host's */
  const _refreshScoreboard=UI.refreshScoreboard.bind(UI);
  UI.refreshScoreboard=function(){
    _refreshScoreboard();
    if(Game.mode==='online' && Net.seat===1){
      this._scoreAvatar('p0av', Game.playerName(0), null);
      this._scoreAvatar('p1av', Game.playerName(1), Profile.data.avatar);
    }
  };

  const _tryPlaceBIH=Input.tryPlaceBIH.bind(Input);
  Input.tryPlaceBIH=function(e){
    if(Game.mode==='online' && Net.seat===1 && Game.phase==='BIH'){
      const p=this.feltPoint(e); if(!p) return;
      p.y=BALL.R;
      if(!this.validBIH(p)){ Sfx.play('ui',0.4); return; }
      cueBall.pos.copy(p); cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
      cueBall.active=true; cueBall.falling=false;
      cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
      this.killGhost(); Sfx.play('ui');
      Net.send('bih', { x:p.x, z:p.z });
      Game.phase='AIM'; this.enterShootMode(true);   // optimistic; the host echoes the confirmed spot
      return;
    }
    return _tryPlaceBIH(e);
  };
})();

/* ================= ACCOUNT UI ================= */
const AccountUI = {
  $(id){ return document.getElementById(id); },

  refreshBadge(){
    const b=this.$('btn-account'); if(!b) return;
    b.textContent = (typeof Account!=='undefined' && Account.signedIn()) ? 'Account ☁' : 'Sign In';
  },
  refreshSyncLine(){
    const el=this.$('acct-sync-line'); if(!el || typeof Account==='undefined') return;
    const s=Account.syncState;
    el.textContent = s==='synced' ? '☁ Save synced to your account'
      : s==='syncing' ? '☁ Syncing…'
      : s==='error'   ? '⚠ Sync hiccup - will retry on your next save'
      : '';
  },

  _in(id, type, ph, ac){
    return '<input id="'+id+'" type="'+type+'" class="acct-in" placeholder="'+ph+'" autocomplete="'+(ac||'off')+'" spellcheck="false">';
  },
  _msg(id){ return '<div id="'+id+'" class="acct-msg"></div>'; },
  _say(id, text, good){
    const el=this.$(id); if(!el) return;
    el.textContent=text||'';
    el.style.color = good ? 'var(--teal, #6fc7b4)' : 'var(--red, #e2685c)';
  },

  accountModal(note){
    if(typeof Account==='undefined' || !Account.available()){
      UI.modal('<h2>Account</h2><p>Online features are unavailable right now (no connection to the club server). Your progress still saves on this device.</p>');
      return;
    }
    if(Account.signedIn()) return this.statusModal();
    UI.modal('<h2>Member Account</h2>'+
      (note?('<p class="acct-note">'+note+'</p>'):'')+
      '<p>Optional - sign in to keep your progress <b>permanently</b> (it follows you across devices and survives cleared browsers) and to play <b>online multiplayer</b>.</p>'+
      '<div class="acct-tabs"><button class="qual-btn sel" id="tab-in">Sign In</button><button class="qual-btn" id="tab-up">Create Account</button></div>'+
      '<div id="acct-form"></div>');
    const form=()=>this.$('acct-form');
    const signInForm=()=>{
      form().innerHTML=this._in('ac-email','email','Email','email')+this._in('ac-pass','password','Password','current-password')+
        this._msg('ac-msg')+
        '<button class="btn primary" id="ac-go" style="width:100%">Sign In</button>'+
        '<button class="linklike" id="ac-forgot" style="margin-top:10px">Forgot password?</button>';
      this.$('ac-go').addEventListener('click', async ()=>{
        const em=this.$('ac-email').value.trim(), pw=this.$('ac-pass').value;
        if(!/^\S+@\S+\.\S+$/.test(em)) return this._say('ac-msg','Enter a valid email address.');
        if(!pw) return this._say('ac-msg','Enter your password.');
        this._say('ac-msg','Signing in…',true);
        const r=await Account.signIn(em,pw);
        if(r.error) return this._say('ac-msg',r.error);
        /* success: _onSignedIn either opens the 2FA prompt or completes silently */
        if(!Account.aalPending){ UI.$('modal-overlay').classList.add('hidden'); UI.xpToast('Signed in ✓'); this.refreshBadge(); }
      });
      this.$('ac-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') this.$('ac-go').click(); });
      this.$('ac-forgot').addEventListener('click', async ()=>{
        const em=this.$('ac-email').value.trim();
        if(!/^\S+@\S+\.\S+$/.test(em)) return this._say('ac-msg','Type your email above first, then tap this again.');
        const r=await Account.resetPassword(em);
        this._say('ac-msg', r.error?r.error:'Reset link sent - check your email.', !r.error);
      });
    };
    const signUpForm=()=>{
      form().innerHTML=this._in('ac-email2','email','Email','email')+this._in('ac-pass2','password','Password (8+ characters)','new-password')+
        this._msg('ac-msg2')+
        '<button class="btn primary" id="ac-up" style="width:100%">Create Account</button>'+
        '<p class="acct-fine">You’ll get a verification email - click its link to activate the account. Passwords are hashed on the server; this game never stores them.</p>';
      this.$('ac-up').addEventListener('click', async ()=>{
        const em=this.$('ac-email2').value.trim(), pw=this.$('ac-pass2').value;
        if(!/^\S+@\S+\.\S+$/.test(em)) return this._say('ac-msg2','Enter a valid email address.');
        if(pw.length<8) return this._say('ac-msg2','Use at least 8 characters.');
        this._say('ac-msg2','Creating…',true);
        const r=await Account.signUp(em,pw);
        if(r.error) return this._say('ac-msg2',r.error);
        this._say('ac-msg2','Almost there - open the verification email we just sent and click the link.', true);
      });
    };
    this.$('tab-in').addEventListener('click',()=>{ this.$('tab-in').classList.add('sel'); this.$('tab-up').classList.remove('sel'); signInForm(); });
    this.$('tab-up').addEventListener('click',()=>{ this.$('tab-up').classList.add('sel'); this.$('tab-in').classList.remove('sel'); signUpForm(); });
    signInForm();
  },

  async statusModal(){
    const em=(Account.user&&Account.user.email)||'';
    UI.modal('<h2>Member Account</h2>'+
      '<div class="acct-row"><span class="acct-k">Signed in as</span><b>'+em.replace(/[<>&]/g,'')+'</b></div>'+
      '<div id="acct-sync-line" class="acct-fine"></div>'+
      '<h3>Two-Factor Authentication</h3><div id="mfa-zone"><p class="acct-fine">Checking…</p></div>'+
      '<h3>Security</h3>'+
      '<button class="qual-btn" id="ac-newpass">Change password</button>'+
      this._msg('ac-msg3')+
      '<button class="btn ghost" id="ac-out" style="width:100%;margin-top:16px">Sign Out</button>'+
      '<p class="acct-fine">Signing out keeps playing from this device’s local save.</p>');
    this.refreshSyncLine();
    this.$('ac-out').addEventListener('click', async ()=>{
      if(Net.active || Net.channel) Net.leave(false);
      await Account.signOut();
      UI.$('modal-overlay').classList.add('hidden');
      UI.xpToast('Signed out');
      this.refreshBadge();
    });
    this.$('ac-newpass').addEventListener('click', async ()=>{
      const r=await Account.resetPassword(em);
      this._say('ac-msg3', r.error?r.error:'Password-change link sent to your email.', !r.error);
    });
    /* 2FA zone: list the verified factor or offer enrollment */
    const zone=this.$('mfa-zone');
    const factors=await Account.mfaFactors();
    if(!zone || !this.$('ac-out')) return;      // modal was closed meanwhile
    if(factors.length){
      zone.innerHTML='<div class="acct-row"><span class="acct-k">Authenticator app</span><b style="color:var(--teal,#6fc7b4)">✓ Enabled</b></div>'+
        '<button class="qual-btn" id="mfa-off">Disable 2FA</button>'+this._msg('mfa-msg');
      this.$('mfa-off').addEventListener('click', async ()=>{
        const r=await Account.mfaUnenroll(factors[0].id);
        if(r.error) return this._say('mfa-msg', r.error);
        this.statusModal();
      });
    } else {
      zone.innerHTML='<p class="acct-fine">Add an authenticator app (Google Authenticator, Authy, 1Password…) so a stolen password alone can never open your account <b>or touch your save</b>.</p>'+
        '<button class="btn primary" id="mfa-on" style="width:100%">Enable 2FA</button>'+this._msg('mfa-msg');
      this.$('mfa-on').addEventListener('click', ()=>this.enrollModal());
    }
  },

  async enrollModal(){
    const r=await Account.mfaEnroll();
    if(r.error){ this._say('mfa-msg', r.error); return; }
    const qrSrc = r.qr.indexOf('data:')===0 ? r.qr : 'data:image/svg+xml;utf8,'+encodeURIComponent(r.qr);
    UI.modal('<h2>Enable 2FA</h2>'+
      '<p>1 · Scan this with your authenticator app:</p>'+
      '<div class="mfa-qr"><img alt="2FA QR code" src="'+qrSrc+'"></div>'+
      '<p class="acct-fine">Can’t scan? Enter this key manually: <code class="mfa-secret">'+r.secret+'</code></p>'+
      '<p>2 · Type the 6-digit code it shows:</p>'+
      this._in('mfa-code','text','123456','one-time-code')+this._msg('mfa-msg2')+
      '<button class="btn primary" id="mfa-verify" style="width:100%">Verify &amp; Enable</button>');
    const code=this.$('mfa-code'); code.inputMode='numeric'; code.maxLength=8;
    this.$('mfa-verify').addEventListener('click', async ()=>{
      const c=code.value.trim();
      if(!/^\d{6,8}$/.test(c)) return this._say('mfa-msg2','Enter the 6-digit code from the app.');
      const v=await Account.mfaVerify(r.id, c);
      if(v.error) return this._say('mfa-msg2', v.error);
      UI.xpToast('2FA enabled ✓');
      this.statusModal();
    });
    code.addEventListener('keydown',e=>{ if(e.key==='Enter') this.$('mfa-verify').click(); });
  },

  /* password sign-in succeeded but the account has 2FA: demand the code */
  async mfaChallengeModal(){
    const factors=await Account.mfaFactors();
    if(!factors.length){ Account.aalPending=false; Account.syncIn(); return; }
    UI.modal('<h2>Two-Factor Check</h2>'+
      '<p>Enter the 6-digit code from your authenticator app to finish signing in.</p>'+
      this._in('mfa-c2','text','123456','one-time-code')+this._msg('mfa-cmsg')+
      '<div style="display:flex;gap:12px;margin-top:10px">'+
      '<button class="btn primary" id="mfa-ok" style="flex:1">Verify</button>'+
      '<button class="btn ghost" id="mfa-cancel" style="flex:1">Cancel</button></div>');
    const inp=this.$('mfa-c2'); inp.inputMode='numeric'; inp.maxLength=8; inp.focus();
    this.$('mfa-ok').addEventListener('click', async ()=>{
      const c=inp.value.trim();
      if(!/^\d{6,8}$/.test(c)) return this._say('mfa-cmsg','Enter the 6-digit code.');
      const v=await Account.mfaVerify(factors[0].id, c);
      if(v.error) return this._say('mfa-cmsg', v.error);
      UI.$('modal-overlay').classList.add('hidden');
      UI.xpToast('Signed in ✓'); this.refreshBadge();
    });
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') this.$('mfa-ok').click(); });
    this.$('mfa-cancel').addEventListener('click', async ()=>{
      await Account.signOut();
      UI.$('modal-overlay').classList.add('hidden');
      this.refreshBadge();
    });
  },

  /* arrived from a password-reset email link */
  recoveryModal(){
    UI.modal('<h2>Set a New Password</h2>'+
      this._in('rec-pass','password','New password (8+ characters)','new-password')+this._msg('rec-msg')+
      '<button class="btn primary" id="rec-go" style="width:100%">Save Password</button>');
    this.$('rec-go').addEventListener('click', async ()=>{
      const pw=this.$('rec-pass').value;
      if(pw.length<8) return this._say('rec-msg','Use at least 8 characters.');
      const r=await Account.setNewPassword(pw);
      if(r.error) return this._say('rec-msg', r.error);
      UI.$('modal-overlay').classList.add('hidden');
      UI.xpToast('Password updated ✓');
    });
  }
};

/* ================= LOBBY UI (private rooms) ================= */
const LobbyUI = {
  $(id){ return document.getElementById(id); },
  view:'idle',      // idle | hosting | joining

  open(){
    if(typeof Account==='undefined' || !Account.available()){
      UI.modal('<h2>Multiplayer</h2><p>Online play needs a connection to the club server, which isn’t reachable right now.</p>');
      return;
    }
    if(!Account.signedIn()){
      AccountUI.accountModal('Online multiplayer is members-only - sign in (or create a free account) to play.');
      return;
    }
    this.view='idle';
    this.render();
  },

  render(){
    if(this.view==='hosting'){
      UI.modal('<h2>Private Room</h2>'+
        '<p>Share this code with your opponent - same room, same table, whether they’re on your Wi-Fi or across town.</p>'+
        '<div class="room-code" id="room-code">'+(Net.code||'------')+'</div>'+
        '<div class="acct-msg" id="room-status" style="min-height:18px"></div>'+
        '<button class="btn primary" id="room-start" style="width:100%" disabled>Start Match</button>'+
        '<button class="linklike" id="room-cancel" style="margin-top:12px">Cancel room</button>');
      this.$('room-start').addEventListener('click',()=>Net.startMatch());
      this.$('room-cancel').addEventListener('click',()=>{ Net.leave(false); this.view='idle'; this.render(); });
      this.refresh();
    } else if(this.view==='joining'){
      UI.modal('<h2>Join a Room</h2>'+
        '<p>Type the 6-character code from your opponent.</p>'+
        '<input id="join-code" class="acct-in room-in" maxlength="6" placeholder="ABC123" autocomplete="off" spellcheck="false">'+
        '<div class="acct-msg" id="join-msg"></div>'+
        '<button class="btn primary" id="join-go" style="width:100%">Join</button>'+
        '<button class="linklike" id="join-back" style="margin-top:12px">‹ Back</button>');
      const inp=this.$('join-code');
      inp.addEventListener('input',()=>{ inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
      const go=async ()=>{
        const code=inp.value.trim();
        const m=this.$('join-msg');
        if(code.length!==6){ m.textContent='The code is 6 characters.'; return; }
        m.textContent='Joining…';
        const r=await Net.join(code);
        if(r.error){ m.textContent=r.error; return; }
        m.textContent='';
        this.view='joined'; this.render();
      };
      this.$('join-go').addEventListener('click',go);
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
      this.$('join-back').addEventListener('click',()=>{ this.view='idle'; this.render(); });
      inp.focus();
    } else if(this.view==='joined'){
      UI.modal('<h2>Room '+(Net.code||'')+'</h2>'+
        '<div class="acct-msg" id="room-status" style="min-height:18px"></div>'+
        '<p class="acct-fine">The host starts the match once both players are seated.</p>'+
        '<button class="linklike" id="room-cancel">Leave room</button>');
      this.$('room-cancel').addEventListener('click',()=>{ Net.leave(false); this.view='idle'; this.render(); });
      this.refresh();
    } else {
      UI.modal('<h2>Multiplayer</h2>'+
        '<p>Play a friend head-to-head - 8-ball, real physics, one shared table. Create a private room and pass them the code, or join theirs.</p>'+
        '<div style="display:flex;gap:12px;margin-top:14px">'+
        '<button class="btn primary" id="mp-host" style="flex:1">Create Room</button>'+
        '<button class="btn ghost" id="mp-join" style="flex:1">Join Room</button></div>'+
        '<p class="acct-fine" style="margin-top:12px">Same Wi-Fi or worlds apart - a room code is all it takes. (Browsers don’t allow Bluetooth play.)</p>');
      this.$('mp-host').addEventListener('click', async ()=>{
        const r=await Net.host();
        if(r.error){ UI.modal('<h2>Multiplayer</h2><p>'+r.error+'</p>'); return; }
        this.view='hosting'; this.render();
      });
      this.$('mp-join').addEventListener('click',()=>{ this.view='joining'; this.render(); });
    }
  },

  refresh(){
    const st=this.$('room-status');
    if(st){
      if(Net.peerHere){
        st.textContent=(Net.names[1-Net.seat]||'Opponent')+' is at the table ✓';
        st.style.color='var(--teal,#6fc7b4)';
      } else {
        st.textContent=Net._status || 'Waiting for your opponent…';
        st.style.color='';
        Net._status='';
      }
    }
    const sb=this.$('room-start');
    if(sb) sb.disabled=!Net.peerHere;
  },

  wire(){
    const online=this.$('btn-online');
    if(online) online.addEventListener('click',()=>{ Sfx.play('ui'); this.open(); });
    const acct=this.$('btn-account');
    if(acct) acct.addEventListener('click',()=>{ Sfx.play('ui'); AccountUI.accountModal(); });
    AccountUI.refreshBadge();

    /* leaving an online match must be deliberate: intercept menu/quit paths first */
    document.addEventListener('click',e=>{
      if(!Net.active) return;
      const el=e.target.closest && e.target.closest('#btn-menu,#go-menu');
      if(!el) return;
      e.preventDefault(); e.stopPropagation();
      UI.closeQuickbar();
      Net.confirmLeave(el.id==='go-menu');
    }, true);
    addEventListener('keydown',e=>{
      if(e.code==='Escape' && Net.active && Game.phase!=='MENU'){
        const mo=document.getElementById('modal-overlay');
        if(mo && !mo.classList.contains('hidden')){ mo.classList.add('hidden'); e.stopPropagation(); return; }
        e.stopPropagation();
        Net.confirmLeave(false);
      }
    }, true);
    /* online rematch: the host deals again; the guest signals ready */
    document.addEventListener('click',e=>{
      if(!Net.active) return;
      const el=e.target.closest && e.target.closest('#go-rematch');
      if(!el) return;
      e.preventDefault(); e.stopPropagation();
      Sfx.stopCheer();
      if(Net.seat===0){
        document.getElementById('gameover-overlay').classList.add('hidden');
        Net.send('again',{ names:Net.names, breaker:Game.breaker });
        Net._begin(Game.breaker);
      } else {
        Net.send('ready',{});
        el.textContent='Waiting for host…'; el.disabled=true;
        setTimeout(()=>{ el.disabled=false; el.textContent='Rematch'; }, 5000);
      }
    }, true);
    /* if the tab dies mid-match, tell the other side */
    addEventListener('pagehide',()=>{ if(Net.channel) Net.send('bye',{}); });
  }
};
