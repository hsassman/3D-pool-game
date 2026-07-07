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
  /* on sign-in: reconcile cloud vs local, newest side wins, then keep mirroring */
  async syncIn(){
    if(!this.signedIn()) return;
    this.syncState='syncing';
    if(typeof AccountUI !== 'undefined') AccountUI.refreshSyncLine();
    try{
      const { data:rows, error } = await this.sb.from('game_saves').select('key,value,updated_at');
      if(error) throw error;
      const localLast = Number((()=>{ try{ return localStorage.getItem(GR_NET.META_LASTWRITE); }catch(e){ return 0; } })()) || 0;
      const cloudLast = (rows||[]).reduce((m,r)=>Math.max(m, Date.parse(r.updated_at)||0), 0);
      if(rows && rows.length && cloudLast > localLast){
        /* the cloud copy is fresher (another device, or this browser was wiped) */
        rows.forEach(r=>{ try{ localStorage.setItem(r.key, r.value); }catch(e){} });
        try{ localStorage.setItem(GR_NET.META_LASTWRITE, String(cloudLast)); }catch(e){}
        await Profile.load();
        Unlocks.applyAll(); UI.applyA11y(); Graphics.apply();
        UI.refreshScoreboard();
        UI.xpToast('☁ Save restored from your account');
      } else {
        /* local is fresher (or the account is brand new): publish it */
        const keys=this._localKeys();
        for(const k of keys){
          const v=(()=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } })();
          if(v!=null) await this.sb.from('game_saves')
            .upsert({ user_id:this.user.id, key:k, value:v }, { onConflict:'user_id,key' });
        }
      }
      this.syncState='synced'; this.lastSync=Date.now();
    }catch(e){ this.syncState='error'; }
    if(typeof AccountUI !== 'undefined'){ AccountUI.refreshSyncLine(); AccountUI.refreshBadge(); }
  }
};
