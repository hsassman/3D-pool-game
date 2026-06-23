/* The Gilded Rail - AUDIO (synthesized)
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= AUDIO (synthesized) ================= */
const Sfx = {
  ctx:null, master:null, bus:{}, _atmo:false,
  samples:{}, _ri:{},          /* decoded AudioBuffers per type + round-robin index */
  oneshots:{},                 /* decoded one-shot buffers: ui, cheer, fail, thunder */
  ensure(){
    if(!this.ctx){
      try{
        this.ctx = new (window.AudioContext||window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = Profile.data.sound?1:0;
        const comp=this.ctx.createDynamicsCompressor();
        comp.threshold.value=-16; comp.knee.value=22; comp.ratio.value=5;
        comp.attack.value=0.002; comp.release.value=0.12;
        this.master.connect(comp); comp.connect(this.ctx.destination);
        ['sfx','music','amb'].forEach(b=>{
          const g=this.ctx.createGain(); g.gain.value=Profile.data.vol[b];
          g.connect(this.master); this.bus[b]=g;
        });
      }catch(e){}
    }
    if(this.ctx && this.ctx.state==='suspended') this.ctx.resume();
    if(this.ctx && !this._sfxLoaded && typeof window!=='undefined' && window.__SFX) this.loadSamples(window.__SFX);
    if(this.ctx && !this._osLoaded && typeof window!=='undefined' && window.__AUDIO) this.loadOneShots(window.__AUDIO);
  },
  setVol(b,v){
    Profile.data.vol[b]=v; Profile.save();
    if(this.ctx && this.bus[b]) this.bus[b].gain.setTargetAtTime(v, this.ctx.currentTime, 0.04);
    if(b==='music' && this._songEl && !this._songRouted) this._songEl.volume=v*(Profile.data.sound?1:0);
  },
  setMute(m){
    Profile.data.sound=!m; Profile.save();
    if(this.master) this.master.gain.setTargetAtTime(m?0:1, this.ctx.currentTime, 0.03);
    if(this._songEl && !this._songRouted) this._songEl.volume=m?0:Profile.data.vol.music;
  },
  /* ---------- optional real samples ----------
     Provide recordings via Sfx.loadSamples({clack:[url,…], cushion:[…], pocket:[…]})
     (see window.__SFX in index.html). When present they're used instead of the
     synth: a different clip each hit (round-robin + shuffle), pitch- and
     level-scaled by impact so even the same clip varies - giving the wide variety
     across single hits and the dozens of contacts in a break. */
  loadSamples(map){
    if(this._sfxLoaded || !map || !this.ctx) return;   /* needs a context (ensure() calls us) */
    this._sfxLoaded=true;                 /* once only - avoid duplicate decodes */
    const ctx=this.ctx, jobs=[];
    Object.keys(map).forEach(type=>{ this.samples[type]=this.samples[type]||[]; (map[type]||[]).forEach(u=>jobs.push([type,u])); });
    /* decode one clip at a time - a burst of parallel decodeAudioData calls is slow
       and flaky; sequential is reliable and the clips are small */
    const next=()=>{
      const job=jobs.shift(); if(!job) return; const [type,u]=job;
      fetch(u).then(r=>r.arrayBuffer())
        .then(ab=>new Promise(res=>ctx.decodeAudioData(ab, b=>{
          /* peak-normalize each clip so loud and soft RECORDINGS don't fight the
             force-based level - a soft hit must sound soft regardless of which clip
             the round-robin picks */
          try{ const d=b.getChannelData(0); let pk=0; for(let i=0;i<d.length;i+=8){ const a=d[i]<0?-d[i]:d[i]; if(a>pk)pk=a; }
               b._norm = pk>0.001 ? Math.min(6, 0.7/pk) : 1; }catch(e){ b._norm=1; }
          this.samples[type].push(b); res(); }, ()=>res())))
        .catch(()=>{}).then(next);
    };
    next();
  },
  _playSample(type, vol, g){
    const list=this.samples[type]; if(!list || !list.length) return false;
    const c=this.ctx, t=c.currentTime;
    this._ri[type]=((this._ri[type]|0)+1)%list.length;
    /* occasional shuffle so the order itself isn't perfectly cyclic */
    const idx = (Math.random()<0.35) ? (Math.random()*list.length)|0 : this._ri[type];
    const buf=list[idx];
    const src=c.createBufferSource(); src.buffer=buf;
    src.playbackRate.value = 0.97 + vol*0.05 + (Math.random()-0.5)*0.035;   /* tiny jitter only; pitch ~constant */
    /* LOUDNESS TRACKS SHOT FORCE: a steep, near-linear map on the impact strength
       (vol), times the clip's normalization - minimal randomness so a soft hit is
       always soft and a hard hit is always loud. A solid floor (0.2) means even the
       gentlest real contact is clearly audible - no more "silent" hits. */
    const force = 0.2 + Math.pow(vol, 1.1) * 1.2;
    const sg=c.createGain(); sg.gain.value = Math.min(1.6, force) * (buf._norm||1);
    src.connect(sg); sg.connect(g); src.start(t);
    return true;
  },

  /* ---------- one-shot, non-impact clips (UI click, victory crowd, fail, thunder) ----------
     Decoded once and peak-normalized so `vol` is the true loudness control. */
  loadOneShots(map){
    if(this._osLoaded || !map || !this.ctx) return;
    this._osLoaded=true;
    const ctx=this.ctx, jobs=[];
    Object.keys(map).forEach(n=>{ this.oneshots[n]=this.oneshots[n]||[]; (map[n]||[]).forEach(u=>jobs.push([n,u])); });
    const next=()=>{
      const job=jobs.shift(); if(!job) return; const [n,u]=job;
      fetch(u).then(r=>r.arrayBuffer())
        .then(ab=>new Promise(res=>ctx.decodeAudioData(ab, b=>{
          try{ const d=b.getChannelData(0); let pk=0; for(let i=0;i<d.length;i+=16){ const a=d[i]<0?-d[i]:d[i]; if(a>pk)pk=a; }
               b._norm = pk>0.001 ? Math.min(8, 0.9/pk) : 1; }catch(e){ b._norm=1; }
          this.oneshots[n].push(b); res(); }, ()=>res())))
        .catch(()=>{}).then(next);
    };
    next();
  },
  /* play one clip from a one-shot set (random pick) on the given bus */
  playOneShot(name, vol, busName){
    const list=this.oneshots[name]; if(!list || !list.length || !this.ctx) return false;
    const c=this.ctx, t=c.currentTime, buf=list[(Math.random()*list.length)|0];
    const src=c.createBufferSource(); src.buffer=buf;
    const g=c.createGain(); g.gain.value=Math.min(1.4, (vol||0.6)*(buf._norm||1));
    src.connect(g); g.connect(this.bus[busName]||this.bus.sfx||this.master); src.start(t);
    return true;
  },
  /* layer EVERY clip in a one-shot set at once (used for the victory roar:
     crowd-with-shouts + people-cheering together). Nodes are tracked so the roar can
     be faded out the instant the player leaves the result screen (see stopCheer). */
  playOneShotAll(name, vol, busName){
    const list=this.oneshots[name]; if(!list || !list.length || !this.ctx) return false;
    const c=this.ctx, t=c.currentTime, bus=this.bus[busName]||this.bus.sfx||this.master;
    this._cheerNodes=[];
    list.forEach((buf,i)=>{ const src=c.createBufferSource(); src.buffer=buf;
      const g=c.createGain(); g.gain.value=Math.min(1.4, (vol||0.6)*(buf._norm||1)*(i?0.7:1));
      src.connect(g); g.connect(bus); src.start(t);
      this._cheerNodes.push({src,g}); });
    return true;
  },
  /* fade out + stop the victory roar (called when the result screen is dismissed so
     the applause doesn't bleed into the next match) */
  stopCheer(){
    if(!this.ctx || !this._cheerNodes || !this._cheerNodes.length) return;
    const t=this.ctx.currentTime;
    this._cheerNodes.forEach(({src,g})=>{
      try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
           g.gain.linearRampToValueAtTime(0.0001, t+0.35); src.stop(t+0.4); }catch(e){}
    });
    this._cheerNodes=[];
  },

  play(type, vol){
    this.ensure(); if(!this.ctx || !this.bus.sfx) return;
    vol = Math.min(1, Math.max(0.02, vol||0.5));
    const c=this.ctx, t=c.currentTime, g=c.createGain(); g.connect(this.bus.sfx);
    if(type==='clack' || type==='cushion' || type==='pocket' || type==='cue'){
      /* The gameplay impacts are real recordings (from the supplied "Pool-game
         sounds"): a different clip each time (round-robin + shuffle), pitch- and
         level-scaled by impact strength so single pots - and the dozens of pairwise
         contacts in a break - all sound organic and varied. No synthesis. */
      this._playSample(type, vol, g);
    } else if(type==='ui'){
      /* de-dupe: a single global click handler plays this for EVERY control, so a
         control's own explicit Sfx.play('ui') would otherwise double it. Collapse
         any 'ui' clicks within ~60ms into one. */
      const now=(typeof performance!=='undefined'?performance.now():Date.now());
      if(now-(this._lastUi||0) < 60) return;
      this._lastUi=now;
      /* real UI click recording if supplied, else the synth blip */
      if(!this.playOneShot('ui', Math.min(0.9, 0.55*(vol/0.5||1)), 'sfx')){
        const o=c.createOscillator(); o.type='sine'; o.frequency.value=720; o.connect(g);
        g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09); o.start(t); o.stop(t+0.1);
      }
    } else if(type==='win'){
      /* victory roar: crowd shouts + people cheering layered. Falls back to the
         synth fanfare if the recordings aren't loaded yet */
      if(!this.playOneShotAll('cheer', 0.85, 'sfx')){
        [523,659,784,1046].forEach((f,i)=>{ const o=c.createOscillator(); o.type='triangle'; o.frequency.value=f;
          const gg=c.createGain(); o.connect(gg); gg.connect(this.bus.sfx);
          gg.gain.setValueAtTime(0.0001,t+i*0.13); gg.gain.exponentialRampToValueAtTime(0.18,t+i*0.13+0.02);
          gg.gain.exponentialRampToValueAtTime(0.001,t+i*0.13+0.5); o.start(t+i*0.13); o.stop(t+i*0.13+0.55); });
      }
    } else if(type==='fail'){
      /* defeat sting (brass) on the game-over screen - no synth fallback */
      this.playOneShot('fail', 0.8, 'sfx');
    }
  },

  /* ---------- atmosphere: chatter bed + the house record ---------- */
  startAtmosphere(){
    this.ensure(); if(!this.ctx || this._atmo) return; this._atmo=true;
    if(typeof window!=='undefined' && window.__SFX) this.loadSamples(window.__SFX);   /* real hit samples, if supplied */
    if(typeof window!=='undefined' && window.__AUDIO) this.loadOneShots(window.__AUDIO);
    this._scheduleThunder();                          /* distant thunder, now and then */
    const c=this.ctx;
    /* low murmur of conversation: looped brownish noise through wandering bandpass gains */
    for(let k=0;k<2;k++){
      const len=3.1+k*1.3, buf=c.createBuffer(1,(c.sampleRate*len)|0,c.sampleRate), d=buf.getChannelData(0);
      let last=0;
      for(let i=0;i<d.length;i++){ last=(last+(Math.random()*2-1)*0.045)*0.986; d[i]=last*2.6; }
      const src=c.createBufferSource(); src.buffer=buf; src.loop=true;
      const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=360+k*260; bp.Q.value=0.55;
      const g=c.createGain(); g.gain.value=0.045;
      src.connect(bp); bp.connect(g); g.connect(this.bus.amb); src.start();
      setInterval(()=>{ try{ g.gain.setTargetAtTime(0.028+Math.random()*0.05, c.currentTime, 1.4); }catch(e){} }, 2700+k*1100);
    }
    this._song();
  },

  /* distant thunder: a low, occasional rumble on the ambience bus - every 2–5
     minutes, kept quiet so it never drowns the music or table sounds */
  _scheduleThunder(){
    if(this._thunderT) return;                        /* one scheduler only */
    const tick=()=>{
      this._thunderT=setTimeout(()=>{
        /* a touch louder than before, and the level varies a lot clap-to-clap so some
           rolls are a faint distant rumble and others a closer crack */
        try{ if(Profile.data.sound) this.playOneShot('thunder', 0.34+Math.random()*0.34, 'amb'); }catch(e){}
        tick();
      }, 120000 + Math.random()*180000);              /* 2–5 min */
    };
    tick();
  },

  /* the house record: decoded straight into WebAudio (looped, on the music bus);
     falls back to an <audio> element if decoding isn't available */
  _song(){
    if(this._songStarted || !window.__SONG) return;
    this._songStarted=true;
    const url=window.__SONG;
    const decode=(arrbuf)=>{
      this.ctx.decodeAudioData(arrbuf,
        ab=>{ const src=this.ctx.createBufferSource(); src.buffer=ab; src.loop=true;
              src.connect(this._roomChain()); src.start(); this._songSrc=src; this._songRouted=true; },
        ()=>this._songFallback());
    };
    if(this.ctx){
      try{
        if(url.indexOf('data:')===0){
          const b64=url.split(',')[1], bin=atob(b64), buf=new Uint8Array(bin.length);
          for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
          decode(buf.buffer); return;
        }
        fetch(url).then(r=>r.arrayBuffer()).then(decode).catch(()=>this._songFallback());
        return;
      }catch(e){}
    }
    this._songFallback();
  },
  /* "playing somewhere across the room": roll off the highs and lows like
     distance does, then blend in a long soft reverb so the track sits in the
     space rather than in your ear */
  _roomChain(){
    const c=this.ctx;
    const inG=c.createGain(); inG.gain.value=0.9;
    const hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=150; hp.Q.value=0.5;
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400; lp.Q.value=0.4;
    inG.connect(hp); hp.connect(lp);
    /* generated room impulse: 2.6s of exponentially decaying stereo noise */
    const len=(c.sampleRate*2.6)|0, ir=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d=ir.getChannelData(ch);
      let lpv=0;
      for(let i=0;i<len;i++){
        lpv=lpv*0.72+(Math.random()*2-1)*0.28;            /* darken the tail */
        d[i]=lpv*Math.pow(1-i/len,2.4);
      }
    }
    const conv=c.createConvolver(); conv.buffer=ir;
    const dry=c.createGain(); dry.gain.value=0.42;
    const wet=c.createGain(); wet.gain.value=0.58;
    lp.connect(dry); dry.connect(this.bus.music);
    lp.connect(conv); conv.connect(wet); wet.connect(this.bus.music);
    return inG;
  },

  _songFallback(){
    if(typeof Audio==='undefined') return;
    try{
      const el=new Audio(window.__SONG); el.loop=true;
      el.volume=Profile.data.vol.music*(Profile.data.sound?1:0);
      this._songEl=el; this._songRouted=false;
      el.play().catch(()=>{});
    }catch(e){}
  }
};

/* ================= HAPTICS (touch devices) =================
   Vibration feedback. No-op unless: enabled in Profile, the device exposes
   navigator.vibrate, and we're on a touch device. Patterns are ms (number) or
   [pause,buzz,pause,…] arrays. */
const Haptics = {
  enabled(){
    return Profile.data.haptics!==false
      && typeof navigator!=='undefined' && typeof navigator.vibrate==='function'
      && typeof document!=='undefined' && document.body && document.body.classList
      && document.body.classList.contains('touch');
  },
  buzz(pattern){ if(this.enabled()){ try{ navigator.vibrate(pattern); }catch(e){} } }
};
