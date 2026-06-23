/* The Gilded Rail - ACHIEVEMENTS & CHALLENGES
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files (Profile, Campaign, UI).

   ============================ EASY TO EDIT ============================
   Three data tables drive everything. Add entries freely.

   ACHIEVEMENTS - permanent badges. Each: { id, name, desc, xp, cond }
     cond(stats, ev) -> boolean. `stats` is Profile.data.stats (cumulative).
     `ev` carries per-event flags: ev.breakPot, ev.foulFreeWin (may be absent).
     ⚠ keep `id` stable - it's stored in the save.

   CHALLENGE_POOL / WEEKLY_POOL - rotating goals. Each: { id, name, desc, track, goal, xp }
     track is what advances progress, one of:
       'pots'        +balls potted        'wins'      +frames won
       'foulfreewin' +foul-free wins      'beststreak' best run reached (max, not sum)
       'ladderclears'+career clears
     One daily + one weekly are picked deterministically from the date, so the
     same day always shows the same challenge and progress survives reloads.
   ===================================================================== */
const ACHIEVEMENTS = [
  {id:'first_blood',  name:'First Blood',           desc:'Win your first frame.',            xp:40,  cond:s=>s.wins>=1},
  {id:'break_artist', name:'Break Artist',          desc:'Pot a ball on the break.',         xp:30,  cond:(s,ev)=>!!ev.breakPot},
  {id:'hot_hand',     name:'Hot Hand',              desc:'Pot 5 balls in a row.',            xp:50,  cond:s=>s.bestStreak>=5},
  {id:'deadeye',      name:'Deadeye',               desc:'Pot 8 balls in a row.',            xp:90,  cond:s=>s.bestStreak>=8},
  {id:'spotless',     name:'Spotless',              desc:'Win a frame without fouling.',     xp:60,  cond:(s,ev)=>!!ev.foulFreeWin},
  {id:'half_century', name:'Half Century',          desc:'Pot 50 balls overall.',            xp:40,  cond:s=>s.potted>=50},
  {id:'sharpshooter', name:'Sharpshooter',          desc:'Pot 500 balls overall.',           xp:120, cond:s=>s.potted>=500},
  {id:'regular',      name:'A Regular',             desc:'Play 25 frames.',                  xp:50,  cond:s=>s.games>=25},
  {id:'house_legend', name:'House Legend',          desc:'Win 50 frames.',                   xp:200, cond:s=>s.wins>=50},
  {id:'ladder_champ', name:'Champion of the Rail',  desc:'Clear the entire career ladder.',  xp:300,
    cond:()=> typeof Campaign!=='undefined' && Campaign.clearedCount()>=Campaign.totalOpps()},
  {id:'league_done',  name:'League Conqueror',       desc:'Clear a full league.',             xp:150,
    cond:()=> typeof Campaign!=='undefined' && Campaign.leagues().some(l=>Campaign.leagueCleared(l))},
  {id:'prestige_one', name:'Encore',                 desc:'Prestige for the first time.',     xp:250,
    cond:()=> Profile.prestige()>=1},
];
const CHALLENGE_POOL = [
  {id:'pot10',   name:'Warm Up',     desc:'Pot 10 balls today.',            track:'pots',        goal:10, xp:40},
  {id:'pot25',   name:'In the Zone', desc:'Pot 25 balls today.',            track:'pots',        goal:25, xp:70},
  {id:'win2',    name:'Double Up',   desc:'Win 2 frames today.',            track:'wins',        goal:2,  xp:60},
  {id:'win3',    name:'Hat Trick',   desc:'Win 3 frames today.',            track:'wins',        goal:3,  xp:90},
  {id:'streak4', name:'On a Run',    desc:'Reach a 4-ball streak.',         track:'beststreak',  goal:4,  xp:60},
  {id:'spotwin', name:'Clean Hands', desc:'Win a frame without fouling.',   track:'foulfreewin', goal:1,  xp:80},
];
const WEEKLY_POOL = [
  {id:'wpot150', name:'Grinder',    desc:'Pot 150 balls this week.',          track:'pots',         goal:150, xp:250},
  {id:'wwin10',  name:'Table Boss', desc:'Win 10 frames this week.',          track:'wins',         goal:10,  xp:300},
  {id:'wladder', name:'Climber',    desc:'Clear a ladder opponent this week.',track:'ladderclears', goal:1,   xp:220},
];

/* notional opponent rating per DIFFS index, and the named rank tiers the
   player's rating falls into - both freely editable */
const RANK_DIFF = [950, 1120, 1320];
const RANK_TIERS = [
  {min:0,    name:'Rookie'},
  {min:1000, name:'Regular'},
  {min:1150, name:'Sharp'},
  {min:1300, name:'Shark'},
  {min:1450, name:'Legend'},
];

const Progression = {
  /* ---------------- rating / streaks (vs CPU) ---------------- */
  rankTier(r){ r=(r==null)?(Profile.data.rating||1000):r; let t=RANK_TIERS[0].name;
    for(const x of RANK_TIERS) if(r>=x.min) t=x.name; return t; },
  ratedFrame(won, diff){
    const R=Profile.data.rating||1000;
    const Ro=(RANK_DIFF[diff]!=null)?RANK_DIFF[diff]:1100;
    const E=1/(1+Math.pow(10,(Ro-R)/400));
    const before=R;
    Profile.data.rating=Math.max(0, Math.round(R + 24*((won?1:0)-E)));
    const s=Profile.data.stats;
    if(won){ s.frameStreak=(s.frameStreak||0)+1; s.bestFrameStreak=Math.max(s.bestFrameStreak||0, s.frameStreak); }
    else s.frameStreak=0;
    Profile.save();
    return Profile.data.rating-before;        // signed rating delta
  },

  /* ---------------- level-locked game modes ---------------- */
  modeLevel(m){ return (typeof MODE_LOCKS!=='undefined' && MODE_LOCKS[m]) || 1; },
  modeUnlocked(m){ return Profile.level().lvl >= this.modeLevel(m); },

  /* ---------------- achievements ---------------- */
  achList(){ return ACHIEVEMENTS; },
  unlocked(id){ return (Profile.data.achievements||[]).includes(id); },
  evalAchievements(ev){
    ev=ev||{}; let any=false;
    const have=(Profile.data.achievements=Profile.data.achievements||[]);
    for(const a of ACHIEVEMENTS){
      if(have.includes(a.id)) continue;
      let hit=false; try{ hit=!!a.cond(Profile.data.stats, ev); }catch(e){}
      if(hit){ have.push(a.id); Profile.data.xp+=a.xp; any=true;
        if(typeof UI!=='undefined'){ UI.xpToast('🏅 '+a.name+' · +'+a.xp+' XP'); if(UI.refreshProfile) UI.refreshProfile(); }
      }
    }
    if(any) Profile.save();
    return any;
  },

  /* ---------------- challenges ---------------- */
  _dayKey(d){ d=d||new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); },
  _weekKey(d){ d=d||new Date(); const jan1=new Date(d.getFullYear(),0,1);
    const wk=Math.ceil((((d-jan1)/86400000)+jan1.getDay()+1)/7); return d.getFullYear()+'-W'+wk; },
  _hash(str){ let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))|0; return Math.abs(h); },
  _def(pool,id){ return pool.find(c=>c.id===id); },
  ensureChallenges(){
    const C=Profile.data.challenges=Profile.data.challenges||{};
    const dk=this._dayKey(), wk=this._weekKey();
    let changed=false;
    if(C.day!==dk){ const p=CHALLENGE_POOL[this._hash(dk)%CHALLENGE_POOL.length];
      C.day=dk; C.daily={id:p.id, prog:0, done:false}; changed=true; }
    if(C.week!==wk){ const p=WEEKLY_POOL[this._hash(wk)%WEEKLY_POOL.length];
      C.week=wk; C.weekly={id:p.id, prog:0, done:false}; changed=true; }
    if(changed) Profile.save();
    return C;
  },
  daily(){ this.ensureChallenges(); return {def:this._def(CHALLENGE_POOL,Profile.data.challenges.daily.id), st:Profile.data.challenges.daily}; },
  weekly(){ this.ensureChallenges(); return {def:this._def(WEEKLY_POOL,Profile.data.challenges.weekly.id), st:Profile.data.challenges.weekly}; },
  _bump(slot, pool, track, value){
    const def=this._def(pool, slot.id); if(!def || slot.done || def.track!==track) return;
    slot.prog = (track==='beststreak') ? Math.max(slot.prog, value) : slot.prog+value;
    if(slot.prog>=def.goal){ slot.done=true; Profile.data.xp+=def.xp;
      if(typeof UI!=='undefined'){ UI.xpToast('✓ '+def.name+' · +'+def.xp+' XP'); if(UI.refreshProfile) UI.refreshProfile(); }
    }
  },
  track(track, value){
    const C=this.ensureChallenges();
    this._bump(C.daily, CHALLENGE_POOL, track, value);
    this._bump(C.weekly, WEEKLY_POOL, track, value);
    Profile.save();
  },

  /* ---------------- gameplay hooks (called from Game / Campaign) ---------------- */
  afterShot(ev){                       // ev: { pots, breakPot }
    ev=ev||{};
    if(ev.pots>0) this.track('pots', ev.pots);
    this.track('beststreak', Profile.data.stats.bestStreak);
    this.evalAchievements({breakPot:!!ev.breakPot});
  },
  afterFrame(ev){                      // ev: { won, foulFreeWin }
    ev=ev||{};
    if(ev.won) this.track('wins', 1);
    if(ev.foulFreeWin) this.track('foulfreewin', 1);
    this.evalAchievements({foulFreeWin:!!ev.foulFreeWin});
  },
  onLadderClear(){ this.track('ladderclears', 1); this.evalAchievements({}); },

  /* called once at boot to backfill stat-based achievements for existing saves */
  init(){ this.ensureChallenges(); this.evalAchievements({}); }
};
