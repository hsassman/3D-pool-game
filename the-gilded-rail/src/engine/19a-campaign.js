/* The Gilded Rail - CAREER LADDER / CAMPAIGN
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files (Profile, DIFFS, Game, UI).

   ============================ EASY TO EDIT ============================
   The career is five LEAGUES, each with the same number of opponents plus a
   final boss. A league is level-gated (minLevel); within a league the opponents
   unlock top-to-bottom (first open, each next after the previous is cleared).

   League:  { id, name, minLevel, blurb, opps:[ opponent, … ] }
   Opponent:{ id, name, title, diff, edge, frames, xp, blurb, boss? }
     id     unique + STABLE (stored in the save to record a clear).
     diff   AI base difficulty - index into DIFFS (0=Regular,1=Hustler,2=Shark).
     edge   0..1 fine difficulty on TOP of diff (AI.cfg blends toward perfect:
            lower jitter/power error, higher smarts). Lets the ladder ramp
            smoothly across all 25 opponents even though there are only 3 DIFFS.
     frames best-of length (odd); first to ceil(frames/2) wins the match.
     boss   true marks the league's final boss (the 5th of each league). The very
            last boss is the overall House Champion (final).

   Each league has FOUR regulars then a BOSS, and difficulty climbs both within a
   league and from one league to the next.
   ===================================================================== */
const LEAGUES = [
  { id:'backroom', name:'The Back Room', minLevel:1,
    blurb:'Where every member cuts their teeth. Friendly games, forgiving players.', opps:[
    { id:'bk1', name:'Reggie Flynn',     title:'The Regular',     diff:0, edge:0.00, frames:1, xp:80,  blurb:'A friendly face at the corner table. Everyone starts with Reggie.' },
    { id:'bk2', name:'"Two-Tap" Tessa',  title:'The Local',       diff:0, edge:0.15, frames:1, xp:100, blurb:'Quick and chatty - win the small talk and you win the frame.' },
    { id:'bk3', name:'Old Marv',         title:'The Veteran',     diff:0, edge:0.32, frames:3, xp:150, blurb:'Slow, deliberate, and he never seems to miss the easy ones.' },
    { id:'bk4', name:'Birdie Malone',    title:'The Sharpshooter',diff:1, edge:0.10, frames:3, xp:200, blurb:'Sinks long pots with a grin and a wink. Don’t let her get rolling.' },
    { id:'bk_boss', name:'Sal Romano',   title:'Back-Room Boss',  diff:1, edge:0.35, frames:3, xp:300, boss:true, blurb:'He’ll spot you a frame and still take your money. The Back Room is his.' },
  ]},
  { id:'floor', name:'The Members’ Floor', minLevel:8,
    blurb:'Paying members only. The games get tighter and the talk gets quieter.', opps:[
    { id:'mf1', name:'Cue-Ball Kowalski', title:'The Grinder',    diff:1, edge:0.18, frames:3, xp:200, blurb:'Wears you down with safeties until you crack.' },
    { id:'mf2', name:'Lucky Lena',       title:'The Closer',      diff:1, edge:0.32, frames:3, xp:230, blurb:'They call it luck. It isn’t.' },
    { id:'mf3', name:'Doc Pemberton',    title:'The Tactician',   diff:1, edge:0.48, frames:5, xp:300, blurb:'Plays three shots ahead and tells you so.' },
    { id:'mf4', name:'Gentleman Jim',    title:'The Mechanic',    diff:1, edge:0.64, frames:5, xp:360, blurb:'Textbook everything. He’ll punish one loose shot all night.' },
    { id:'mf_boss', name:'The Deacon',   title:'Floor Champion',  diff:2, edge:0.32, frames:5, xp:460, boss:true, blurb:'Silent, patient, surgical. The Deacon does not miss the ones that matter.' },
  ]},
  { id:'hightable', name:'The High Table', minLevel:16,
    blurb:'Invitation only. Every shot here is for real money - and reputation.', opps:[
    { id:'ht1', name:'Silk-Hands Sully', title:'The Stylist',     diff:1, edge:0.72, frames:5, xp:320, blurb:'Makes the hardest shots look like nothing at all.' },
    { id:'ht2', name:'Vivian Cross',     title:'The Surgeon',     diff:2, edge:0.28, frames:5, xp:370, blurb:'Cold, precise, and entirely without mercy.' },
    { id:'ht3', name:'Mr. Okafor',       title:'The Iceman',      diff:2, edge:0.42, frames:5, xp:420, blurb:'Never rushes, never rattles, never gives the table back.' },
    { id:'ht4', name:'Mara Sokolov',     title:'The Run-Out',     diff:2, edge:0.56, frames:7, xp:500, blurb:'Give her one open table and the frame is already over.' },
    { id:'ht_boss', name:'The Baroness', title:'High-Table Champion', diff:2, edge:0.66, frames:7, xp:640, boss:true, blurb:'She has owned this table for twenty years. Dethrone her if you can.' },
  ]},
  { id:'velvet', name:'The Velvet Room', minLevel:26,
    blurb:'Behind the red curtain. The stakes are whispered, never spoken.', opps:[
    { id:'vr1', name:'Knuckles Moreau',  title:'The Enforcer',    diff:2, edge:0.46, frames:5, xp:460, blurb:'Breaks like a thunderclap and runs out in silence.' },
    { id:'vr2', name:'Persephone Vane',  title:'The Phantom',     diff:2, edge:0.60, frames:7, xp:520, blurb:'You’ll swear the balls move for her.' },
    { id:'vr3', name:'The Cardinal',     title:'The Confessor',   diff:2, edge:0.72, frames:7, xp:580, blurb:'Sink a ball and he forgives you. Miss and he does not.' },
    { id:'vr4', name:'Brother Ezra',     title:'The Ascetic',     diff:2, edge:0.82, frames:7, xp:660, blurb:'Plays in total silence. Every safety is a small sermon.' },
    { id:'vr_boss', name:'Don Castellano',title:'Velvet-Room Boss',diff:2, edge:0.88, frames:7, xp:820, boss:true, blurb:'The man the whole club answers to. Beating him is a statement.' },
  ]},
  { id:'gilded', name:'The Gilded Circle', minLevel:38,
    blurb:'The inner sanctum. Five players, one champion, and a seat that is never empty.', opps:[
    { id:'gc1', name:'Specter',          title:'The Unseen',      diff:2, edge:0.78, frames:7, xp:600, blurb:'No one knows their real name. No one needs to.' },
    { id:'gc2', name:'Mistress of the Felt', title:'The Virtuoso',diff:2, edge:0.86, frames:7, xp:680, blurb:'Plays the table like an instrument. You are the audience.' },
    { id:'gc3', name:'The Architect',    title:'The Mastermind',  diff:2, edge:0.92, frames:9, xp:760, blurb:'Builds a frame shot by shot until there is no way out.' },
    { id:'gc4', name:'Yuki Tanaka',      title:'The Prodigy',     diff:2, edge:0.96, frames:9, xp:900, blurb:'Half your age, twice your nerve. The future of the table.' },
    { id:'gc_boss', name:'Midnight Shark', title:'House Champion',diff:2, edge:1.00, frames:9, xp:1300, boss:true, blurb:'The name whispered after closing time. Beat the Shark and the Gilded Rail is yours.' },
  ]},
];

const Campaign = {
  active:null,                          // opponent currently being played, or null

  leagues(){ return LEAGUES; },
  leagueById(id){ return LEAGUES.find(l=>l.id===id); },
  leagueIndex(id){ return LEAGUES.findIndex(l=>l.id===id); },
  allOpps(){ const a=[]; LEAGUES.forEach(l=>l.opps.forEach(o=>a.push(o))); return a; },
  list(){ return this.allOpps(); },     // legacy: a flat roster
  _save(){ return Profile.data.campaign || (Profile.data.campaign = {cleared:[]}); },
  oppById(id){ return this.allOpps().find(o=>o.id===id); },
  index(id){ return this.allOpps().findIndex(o=>o.id===id); },
  cleared(id){ return this._save().cleared.includes(id); },
  leagueOf(opp){ return LEAGUES.find(l=>l.opps.some(o=>o.id===opp.id)); },
  leagueUnlocked(l){ return Profile.level().lvl >= l.minLevel; },
  leagueCleared(l){ return l.opps.every(o=>this.cleared(o.id)); },
  isBoss(opp){ return !!opp.boss; },
  isFinal(opp){ const last=LEAGUES[LEAGUES.length-1]; return opp.id===last.opps[last.opps.length-1].id; },

  /* an opponent is playable when its league is level-unlocked AND it's the first
     of the league or the previous opponent in the league is cleared */
  isUnlocked(opp){
    const l=this.leagueOf(opp); if(!l || !this.leagueUnlocked(l)) return false;
    const i=l.opps.findIndex(o=>o.id===opp.id);
    return i<=0 || this.cleared(l.opps[i-1].id);
  },
  /* the next opponent the player should face */
  next(){
    for(const l of LEAGUES){ if(!this.leagueUnlocked(l)) continue;
      const o=l.opps.find(o=>this.isUnlocked(o)&&!this.cleared(o.id)); if(o) return o; }
    return null;
  },
  clearedCount(){ return this._save().cleared.filter(id=>!!this.oppById(id)).length; },
  totalOpps(){ return this.allOpps().length; },

  start(opp){
    if(!this.isUnlocked(opp)) return false;
    this.active=opp;
    Game.startCampaignMatch(opp);
    return true;
  },
  markCleared(id){
    const s=this._save();
    if(!s.cleared.includes(id)){
      s.cleared.push(id);
      if(typeof Progression!=='undefined') Progression.onLadderClear();
    }
    Profile.save();
  }
};
