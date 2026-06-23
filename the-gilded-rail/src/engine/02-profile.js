/* The Gilded Rail - PROFILE / PERSISTENCE
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= PROFILE / PERSISTENCE ================= */
const Profile = {
  data: { name:'Guest', avatar:null, avatarBorder:'gold', banner:'felt',
          xp:0, prestige:0, sound:true, felt:'emerald', cue:'classic', rail:'walnut',
          a11y:false,                                  // high-contrast ball markers (accessibility)
          aimGuide:'full',                             // shot guide detail: 'full' | 'cue' | 'off'
          calledShots:false,                           // house rule: must call the pocket for the 8-ball
          tutorialSeen:false,                          // first-time how-to-play overlay shown?
          haptics:true,                                // vibration feedback on touch devices
          quality:'high',                              // graphics quality: 'low' | 'medium' | 'high'
          dof:'strong',                                // depth-of-field strength: 'off' | 'normal' | 'strong'
          codes:{},                                    // secret codes redeemed (e.g. {original:true})
          flashlightEnabled:false,                     // flashlight feature switched on (Settings); press F in game
          flashlight:false,                            // flashlight currently on (only if enabled)
          rating:1000,                                 // Elo-style skill rating vs the CPU
          vol:{sfx:0.8, music:0.45, amb:0.4},
          campaign:{cleared:[]},                       // career-ladder opponents beaten (by id)
          achievements:[],                             // achievement ids unlocked
          challenges:{},                               // daily/weekly challenge state (see 19b-progression.js)
          stats:{shots:0,potted:0,fouls:0,games:0,wins:0,eights:0,bestStreak:0,scratches:0,frameStreak:0,bestFrameStreak:0} },
  async load(){
    try{
      const r = await window.storage.get('gildedrail:profile:v1');
      if(r && r.value){ const d = JSON.parse(r.value);
        this.data = Object.assign(this.data, d);
        this.data.stats = Object.assign({shots:0,potted:0,fouls:0,games:0,wins:0,eights:0,bestStreak:0,scratches:0,frameStreak:0,bestFrameStreak:0}, d.stats||{});
        this.data.vol = Object.assign({sfx:0.8, music:0.45, amb:0.4}, d.vol||{});
        this.data.campaign = Object.assign({cleared:[]}, d.campaign||{});
        if(!Array.isArray(this.data.campaign.cleared)) this.data.campaign.cleared=[];
        this.data.achievements = Array.isArray(d.achievements) ? d.achievements : [];
        this.data.challenges = (d.challenges && typeof d.challenges==='object') ? d.challenges : {};
        if(['off','normal','strong'].indexOf(this.data.dof)<0) this.data.dof='strong';
        this.data.codes = (d.codes && typeof d.codes==='object') ? d.codes : {};
        /* the flashlight used to be a secret code; it's a Settings feature now - keep it on
           for anyone who'd already unlocked it via the old code */
        if(this.data.codes.flashlight) this.data.flashlightEnabled=true;
        if(!FELTS[this.data.felt]) this.data.felt='emerald';
        if(!CUES[this.data.cue]) this.data.cue='classic';
        if(!RAILS[this.data.rail]) this.data.rail='walnut';
        if(typeof BORDERS==='undefined' || !BORDERS[this.data.avatarBorder]) this.data.avatarBorder='gold';
        if(typeof BANNERS==='undefined' || !BANNERS[this.data.banner]) this.data.banner='felt';
        /* sanitise free-form / stored values so nothing unexpected reaches the DOM */
        this.data.name = (typeof this.data.name==='string' ? this.data.name : 'Guest').slice(0,18) || 'Guest';
        if(typeof this.data.avatar!=='string' || !/^data:image\//.test(this.data.avatar)) this.data.avatar=null;
        this.data.xp = Math.max(0, Number(this.data.xp)||0);
        this.data.prestige = Math.max(0, Math.floor(Number(this.data.prestige)||0));
      }
    }catch(e){ /* fresh profile */ }
    UI.refreshProfile();
  },
  async save(){
    try{ await window.storage.set('gildedrail:profile:v1', JSON.stringify(this.data)); }catch(e){}
  },
  LEVEL_CAP:50,
  level(){ let xp=this.data.xp, lvl=1; const cap=this.LEVEL_CAP;
    while(lvl<cap && xp >= this.need(lvl)){ xp-=this.need(lvl); lvl++; }
    if(lvl>=cap){ const n=this.need(cap); return {lvl:cap, into:n, need:n, max:true}; }
    return {lvl, into:xp, need:this.need(lvl), max:false}; },
  need(l){ return Math.round(110*Math.pow(l,1.45)); },
  prestige(){ return this.data.prestige||0; },
  /* prestige: only at the cap - bank a star, reset XP/level, keep everything unlocked */
  canPrestige(){ return this.level().max; },
  doPrestige(){ if(!this.canPrestige()) return false;
    this.data.prestige=(this.data.prestige||0)+1; this.data.xp=0; this.save();
    if(typeof UI!=='undefined'){ UI.refreshProfile(); UI.xpToast('★ Prestige '+this.data.prestige+'!'); }
    return true; },
  addXP(n, label){
    if(n<=0) return;
    this.data.xp += n; this.save(); UI.refreshProfile(); UI.xpToast('+'+n+' XP'+(label?(' · '+label):''));
  }
};
