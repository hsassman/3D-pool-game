/* The Gilded Rail - ACCOUNT / CLOUD SAVES
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files.

   Optional member accounts on Supabase Auth: email + password (bcrypt-hashed
   server-side, never stored here), email verification on signup, optional TOTP
   two-factor (authenticator app), and password reset by email. A signed-in
   member's progress is mirrored to the game_saves table (Row Level Security:
   each account can only ever touch its own rows), so a save survives cleared
   browsers and moves between devices. Guests keep playing from localStorage
   exactly as before - everything here is additive. */

const GR_NET = {
  URL: 'https://thoctsmffbrttdkuezjf.supabase.co',
  KEY: 'sb_publishable_y7s1HoqGyBRjrbBxakpfeg_ERHwqPZb',   // publishable key: safe to ship, RLS does the guarding
  SAVE_PREFIX: 'gildedrail:',
  META_LASTWRITE: 'gildedrail-meta:lastWrite'              // outside SAVE_PREFIX: never synced itself
};

const Account = {
  sb: null,            // supabase client (null when the vendored lib is unavailable)
  user: null,          // signed-in user object | null
  aalPending: false,   // password accepted but a 2FA code is still required
  syncState: 'idle',   // idle | syncing | synced | error - surfaced in the account modal
  lastSync: 0,
  _pushTimers: {},

  available(){ return !!this.sb; },
  signedIn(){ return !!this.user && !this.aalPending; },

  init(){
    try{
      if(typeof supabase === 'undefined' || !supabase.createClient) return;   // vendor lib missing: play offline
      this.sb = supabase.createClient(GR_NET.URL, GR_NET.KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' }
      });
    }catch(e){ this.sb = null; return; }
    this._hookStorage();
    this.sb.auth.onAuthStateChange((event, session)=>{
      this.user = session ? session.user : null;
      if(event === 'SIGNED_OUT'){ this.aalPending=false; this.syncState='idle'; }
      if(event === 'PASSWORD_RECOVERY' && typeof AccountUI !== 'undefined') AccountUI.recoveryModal();
      if((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) this._onSignedIn();
      if(typeof AccountUI !== 'undefined') AccountUI.refreshBadge();
    });
    /* picking the game back up on this device pulls the other device's progress */
    try{ document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState==='visible') this._maybeResync();
    }); }catch(e){}
  },

  /* a session exists - but if this account enrolled 2FA, hold everything until
     the authenticator code has been verified (AAL2) */
  async _onSignedIn(){
    try{
      const { data } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if(data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'){
        this.aalPending = true;
        if(typeof AccountUI !== 'undefined') AccountUI.mfaChallengeModal();
        return;
      }
    }catch(e){}
    this.aalPending = false;
    this.syncIn();
  },

  /* ---------- auth ---------- */
  /* translate raw network failures ("Failed to fetch") into something a player
     can act on - the request never left the browser, the server never saw it */
  _nice(error){
    const m=(error && error.message) || 'Something went wrong';
    if(/failed to fetch|network|load failed|fetch/i.test(m))
      return 'Can’t reach the club server. Reload the page (Ctrl+Shift+R) and try again — if it keeps happening, an ad-blocker, VPN or network filter is likely blocking supabase.co.';
    return m;
  },
  async signUp(email, password){
    const { data, error } = await this.sb.auth.signUp({
      email, password, options:{ emailRedirectTo: location.origin + location.pathname }
    });
    if(error) return { error: this._nice(error) };
    /* Supabase answers "ok" for an already-registered email (anti-enumeration);
       a fresh signup has no session until the emailed link is clicked */
    if(data && data.user && !data.session) return { needsConfirm:true };
    return { ok:true };
  },
  async signIn(email, password){
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if(error) return { error: this._nice(error) };
    return { ok:true };   // _onSignedIn decides whether a 2FA code is still needed
  },
  async signOut(){
    try{ await this.sb.auth.signOut(); }catch(e){}
    this.user=null; this.aalPending=false; this.syncState='idle';
  },
  async resetPassword(email){
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname });
    return error ? { error: this._nice(error) } : { ok:true };
  },
  async setNewPassword(password){
    const { error } = await this.sb.auth.updateUser({ password });
    return error ? { error: error.message } : { ok:true };
  },

  /* ---------- two-factor (TOTP authenticator app) ---------- */
  async mfaFactors(){
    try{
      const { data } = await this.sb.auth.mfa.listFactors();
      return (data && data.totp) ? data.totp.filter(f=>f.status==='verified') : [];
    }catch(e){ return []; }
  },
  async mfaEnroll(){
    const { data, error } = await this.sb.auth.mfa.enroll({ factorType:'totp', friendlyName:'The Gilded Rail' });
    if(error) return { error: error.message };
    return { id:data.id, qr:(data.totp&&data.totp.qr_code)||'', secret:(data.totp&&data.totp.secret)||'' };
  },
  async mfaVerify(factorId, code){
    const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code:String(code||'').trim() });
    if(error) return { error: error.message };
    if(this.aalPending){ this.aalPending=false; this.syncIn(); }
    return { ok:true };
  },
  async mfaUnenroll(factorId){
    const { error } = await this.sb.auth.mfa.unenroll({ factorId });
    return error ? { error: error.message } : { ok:true };
  },

  /* ---------- cloud saves ---------- */
  /* every local write stamps a freshness marker; sign-in compares it against the
     cloud's updated_at so whichever side is NEWER wins (no progress ever lost to
     an older copy) */
  _hookStorage(){
    const store = window.storage, self = this;
    if(!store || store.__grCloud) return;
    store.__grCloud = true;
    const rawSet = store.set.bind(store), rawRemove = store.remove ? store.remove.bind(store) : null;
    store.set = async function(key, value){
      const r = await rawSet(key, value);
      if(typeof key==='string' && key.indexOf(GR_NET.SAVE_PREFIX)===0){
        try{ localStorage.setItem(GR_NET.META_LASTWRITE, String(Date.now())); }catch(e){}
        self._queuePush(key, value);
      }
      return r;
    };
    if(rawRemove) store.remove = async function(key){
      const r = await rawRemove(key);
      if(typeof key==='string' && key.indexOf(GR_NET.SAVE_PREFIX)===0 && self.signedIn()){
        try{ await self.sb.from('game_saves').delete().eq('key', key); }catch(e){}
      }
      return r;
    };
  },
  _queuePush(key, value){
    if(!this.signedIn()) return;
    clearTimeout(this._pushTimers[key]);
    this._pushTimers[key] = setTimeout(()=>this._push(key, value), 1500);
  },
  async _push(key, value){
    if(!this.signedIn()) return;
    try{
      this.syncState='syncing';
      const { error } = await this.sb.from('game_saves')
        .upsert({ user_id:this.user.id, key, value }, { onConflict:'user_id,key' });
      this.syncState = error ? 'error' : 'synced';
      if(!error) this.lastSync = Date.now();
    }catch(e){ this.syncState='error'; }
    if(typeof AccountUI !== 'undefined') AccountUI.refreshSyncLine();
  },
  _localKeys(){
    const out=[];
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k && k.indexOf(GR_NET.SAVE_PREFIX)===0) out.push(k);
      }
    }catch(e){}
    return out;
  },
  /* ---- cross-device profile merge ----
     Progress is MERGED, never clobbered: monotonic things (XP, stat counters,
     achievements, career clears, redeemed codes) take the union / maximum from
     both sides, so playing on your phone and your desktop always adds up.
     Preferences (name, avatar, cloth, volumes…) follow the side written most
     recently. If anything is malformed, fall back to the newer copy whole. */
  _mergeProfiles(localStr, cloudStr, cloudNewer){
    try{
      const L=JSON.parse(localStr), C=JSON.parse(cloudStr);
      const newer=cloudNewer?C:L, older=cloudNewer?L:C;
      const out=Object.assign({}, older, newer);              // prefs: newer side wins
      const mx=(a,b)=>Math.max(Number(a)||0, Number(b)||0);
      out.xp=mx(L.xp,C.xp);
      out.prestige=mx(L.prestige,C.prestige);
      out.rating=mx(L.rating,C.rating)||1000;
      /* a default identity never beats a chosen one */
      if((!newer.name || newer.name==='Guest') && older.name && older.name!=='Guest') out.name=older.name;
      if(!newer.avatar && older.avatar) out.avatar=older.avatar;
      const st={}, ls=L.stats||{}, cs=C.stats||{};
      Object.keys(ls).concat(Object.keys(cs)).forEach(k=>{ st[k]=mx(ls[k],cs[k]); });
      out.stats=st;
      out.achievements=Array.from(new Set([].concat(L.achievements||[], C.achievements||[])));
      const lc=(L.campaign&&L.campaign.cleared)||[], cc=(C.campaign&&C.campaign.cleared)||[];
      out.campaign=Object.assign({}, older.campaign, newer.campaign,
        { cleared:Array.from(new Set([].concat(lc,cc))) });
      out.codes=Object.assign({}, L.codes, C.codes);
      out.tutorialSeen=!!(L.tutorialSeen||C.tutorialSeen);
      /* challenges: merge only when both sides are on the same day/week period */
      const lch=L.challenges||{}, cch=C.challenges||{};
      const ch=Object.assign({}, (cloudNewer?lch:cch), (cloudNewer?cch:lch));
      if(lch.day===cch.day && lch.daily && cch.daily && lch.daily.id===cch.daily.id)
        ch.daily={ id:lch.daily.id, prog:mx(lch.daily.prog,cch.daily.prog), done:!!(lch.daily.done||cch.daily.done) };
      if(lch.week===cch.week && lch.weekly && cch.weekly && lch.weekly.id===cch.weekly.id)
        ch.weekly={ id:lch.weekly.id, prog:mx(lch.weekly.prog,cch.weekly.prog), done:!!(lch.weekly.done||cch.weekly.done) };
      out.challenges=ch;
      return JSON.stringify(out);
    }catch(e){ return cloudNewer?cloudStr:localStr; }
  },
  /* on sign-in (and when returning to the tab): reconcile cloud vs local */
  async syncIn(){
    if(!this.signedIn()) return;
    this.syncState='syncing'; this._lastPull=Date.now();
    if(typeof AccountUI !== 'undefined') AccountUI.refreshSyncLine();
    try{
      const { data:rows, error } = await this.sb.from('game_saves').select('key,value,updated_at');
      if(error) throw error;
      const cloud={}; (rows||[]).forEach(r=>{ cloud[r.key]=r; });
      const localLast = Number((()=>{ try{ return localStorage.getItem(GR_NET.META_LASTWRITE); }catch(e){ return 0; } })()) || 0;
      const cloudLast = (rows||[]).reduce((m,r)=>Math.max(m, Date.parse(r.updated_at)||0), 0);
      const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
      const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
      let changedLocal=false;
      const PROF='gildedrail:profile:v1';
      const lp=lsGet(PROF), cp=cloud[PROF];
      if(lp && cp && cp.value!==lp){
        const merged=this._mergeProfiles(lp, cp.value, cloudLast>=localLast);
        if(merged!==lp){ lsSet(PROF, merged); changedLocal=true; }
        if(merged!==cp.value) await this._push(PROF, merged);
      } else if(cp && !lp){
        lsSet(PROF, cp.value); changedLocal=true;
      } else if(lp && !cp){
        await this._push(PROF, lp);
      }
      /* any other save keys: cloud fills gaps locally, local fills gaps in the cloud */
      for(const k of Object.keys(cloud)){
        if(k===PROF) continue;
        const lv=lsGet(k);
        if(lv==null || (cloud[k].value!==lv && cloudLast>localLast)){ lsSet(k, cloud[k].value); changedLocal=true; }
      }
      for(const k of this._localKeys()){
        if(k===PROF || cloud[k]) continue;
        const lv=lsGet(k);
        if(lv!=null) await this._push(k, lv);
      }
      if(changedLocal){
        await Profile.load();
        Unlocks.applyAll(); UI.applyA11y(); Graphics.apply();
        UI.refreshScoreboard();
        UI.xpToast('☁ Progress synced across your devices');
      }
      this.syncState='synced'; this.lastSync=Date.now();
    }catch(e){ this.syncState='error'; }
    if(typeof AccountUI !== 'undefined'){ AccountUI.refreshSyncLine(); AccountUI.refreshBadge(); }
  },
  /* returning to the tab (e.g. switching devices mid-session): re-pull, gently */
  _maybeResync(){
    if(!this.signedIn()) return;
    if(typeof Game!=='undefined' && Game.phase!=='MENU') return;   // never mid-frame
    if(Date.now()-(this._lastPull||0) < 60000) return;
    this.syncIn();
  }
};
