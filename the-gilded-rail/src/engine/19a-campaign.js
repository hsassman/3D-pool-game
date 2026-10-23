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
    { id:'bk1', name:'Reggie Flynn',     title:'The Corner-Table Regular',     diff:0, edge:0.00, frames:1, xp:80,  blurb:'Reggie has kept the same corner table since the club opened. He knows every member by name and every cushion by feel. He will buy you a drink after your first frame, whichever way it goes.' },
    { id:'bk2', name:'"Two-Tap" Tessa',  title:'The Rhythm Player',       diff:0, edge:0.15, frames:1, xp:100, blurb:'Two taps of chalk, a sideways smile, then straight into the shot. Tessa learned the game between shifts at the club bar. Keep up with her conversation and you might notice when she steals the table.' },
    { id:'bk3', name:'Old Marv',         title:'The Last of the Old Guard',     diff:0, edge:0.32, frames:3, xp:150, blurb:'His tweed waistcoat is older than most of the members. Marv still uses the cue he brought home from his first tournament. He has forgotten more trick shots than you know, but the easy ones never left him.' },
    { id:'bk4', name:'Birdie Malone',    title:'The Songbird Sharpshooter',diff:1, edge:0.10, frames:3, xp:200, blurb:'A red-feathered songbird in green silk, Birdie whistles softly while she lines up long pots. The tune stops just before she clears the table.' },
    { id:'bk_boss', name:'Sal Romano',   title:'The Back-Room Proprietor',  diff:1, edge:0.35, frames:3, xp:300, boss:true, blurb:'Sal straightens his burgundy tie before he offers you a head start. He treats the back room like his own front parlour, and every challenger like an overdue guest. The welcome is warm. The lesson is expensive.' },
  ]},
  { id:'floor', name:'The Members’ Floor', minLevel:8,
    blurb:'Paying members only. The games get tighter and the talk gets quieter.', opps:[
    { id:'mf1', name:'Cue-Ball Kowalski', title:'The Grinder',    diff:1, edge:0.18, frames:3, xp:200, blurb:'The nickname came from his polished head; the reputation came from his safeties. Kowalski spent years maintaining the club tables. He knows exactly where a ball will stop, and how much you will hate finding it there.' },
    { id:'mf2', name:'Lucky Lena',       title:'The Odds Maker',      diff:1, edge:0.32, frames:3, xp:230, blurb:'A gold coin disappears across her knuckles while you aim. Lena used to keep the books for the club, and still notices every small advantage. Call it luck if it makes the result easier to accept.' },
    { id:'mf3', name:'Doc Pemberton',    title:'The Table Physician',   diff:1, edge:0.48, frames:5, xp:300, blurb:'A retired physician who still wears his white coat to the evening game. Doc studies a table like a diagnosis: calmly, thoroughly, and several steps ahead of the symptoms. The prescription is usually a long safety.' },
    { id:'mf4', name:'Gentleman Jim',    title:'The Ivory Gentleman',    diff:1, edge:0.64, frames:5, xp:360, blurb:'Jim never spills a drop on his ivory dinner jacket. He opens doors, compliments good shots, and leaves no room for a reply at the table. His manners are impeccable. His position play is worse to face.' },
    { id:'mf_boss', name:'The Deacon',   title:'Keeper of the Last Confession',  diff:2, edge:0.32, frames:5, xp:460, boss:true, blurb:'The white collar is spotless; the cue case has seen better days. He listens to every excuse without a word, then answers with a safety you cannot escape.' },
  ]},
  { id:'hightable', name:'The High Table', minLevel:16,
    blurb:'Invitation only. Every shot here is for real money - and reputation.', opps:[
    { id:'ht1', name:'Silk-Hands Sully', title:'The Velvet Touch',     diff:1, edge:0.72, frames:5, xp:320, blurb:'Sully once made a living making cards disappear. Now he makes difficult cuts look like straight pots, with the same immaculate cuffs and the same disarming smile. Watch the cue ball rather than his hands.' },
    { id:'ht2', name:'Vivian Cross',     title:'The Surgeon',     diff:2, edge:0.28, frames:5, xp:370, blurb:'Vivian checks her ivory cuffs before every break. A former restorer of antique clocks, she treats a crowded table like a mechanism: remove one piece, and everything falls into place.' },
    { id:'ht3', name:'Mr. Okafor',       title:'The Iceman',      diff:2, edge:0.42, frames:5, xp:420, blurb:'His watch stopped years ago. He still checks it before every shot. Nobody has seen Okafor hurry, raise his voice, or leave the cue ball somewhere he did not intend.' },
    { id:'ht4', name:'Mara Sokolov',     title:'The Closing Act',     diff:2, edge:0.56, frames:7, xp:500, blurb:'Once a touring stage pianist, Mara learned to finish without looking at the audience. Her runs have the same rhythm: a quiet opening, a sudden acceleration, then silence.' },
    { id:'ht_boss', name:'The Baroness', title:'Sovereign of the High Table', diff:2, edge:0.66, frames:7, xp:640, boss:true, blurb:'Emerald velvet, opera gloves, and a coronet older than the club. She acquired this table twenty years ago in a wager nobody will discuss. She has never had to win it back.' },
  ]},
  { id:'velvet', name:'The Velvet Room', minLevel:26,
    blurb:'Behind the red curtain. The stakes are whispered, never spoken.', opps:[
    { id:'vr1', name:'Knuckles Moreau',  title:'The Velvet Room Enforcer',    diff:2, edge:0.46, frames:5, xp:460, blurb:'Moreau used to guard the red curtain. Now the club pays him to stay on this side of it. His break rattles the glasses at the bar; everything after it is unnervingly gentle.' },
    { id:'vr2', name:'Persephone Vane',  title:'The Velvet Phantom',     diff:2, edge:0.60, frames:7, xp:520, blurb:'She arrives when the last song ends, black lace gloves still cold from outside. The scorekeeper remembers every frame she has won. He cannot remember ever watching her enter.' },
    { id:'vr3', name:'The Cardinal',     title:'The Crimson Confessor',   diff:2, edge:0.72, frames:7, xp:580, blurb:'A crimson cassock in a room full of black suits. He asks what you regret before the first break, then builds the entire frame around your answer. Every loose shot becomes a penance.' },
    { id:'vr4', name:'Brother Ezra',     title:'The Vow of Silence',     diff:2, edge:0.82, frames:7, xp:660, blurb:'A hooded monk with a plain ash cue and no possessions to wager. Ezra plays for one thing: the moment an opponent loses patience. He is prepared to wait all night.' },
    { id:'vr_boss', name:'Don Castellano',title:'The Debt Collector',diff:2, edge:0.88, frames:7, xp:820, boss:true, blurb:'His signet ring taps the rail once before every decisive shot. Nobody knows who first put his name on the membership ledger; nobody has dared cross it out. Every frame ends with an account settled.' },
  ]},
  { id:'gilded', name:'The Gilded Circle', minLevel:38,
    blurb:'The inner sanctum. Five players, one champion, and a seat that is never empty.', opps:[
    { id:'gc1', name:'Specter',          title:'The Unfinished Frame',      diff:2, edge:0.78, frames:7, xp:600, blurb:'A translucent figure in a dinner suit, forever trailing a little silver mist. An old ledger lists a member who vanished mid-match. Specter still seems to be playing the next shot.' },
    { id:'gc2', name:'Mistress of the Felt', title:'Conductor of the Green',diff:2, edge:0.86, frames:7, xp:680, blurb:'Black gloves, emerald velvet, and a cue held like a conductor’s baton. She walks the table once before playing. After that, every ball seems to be keeping time for her.' },
    { id:'gc3', name:'The Architect',    title:'Designer of Dead Ends',  diff:2, edge:0.92, frames:9, xp:760, blurb:'A drafting pencil in his waistcoat, folded plans in his cue case. He designed the club’s hidden rooms. At the table he builds the same way: one measured angle at a time, until you discover there is no exit.' },
    { id:'gc4', name:'Yuki Tanaka',      title:'The Quiet Storm',     diff:2, edge:0.96, frames:9, xp:900, blurb:'The youngest member ever invited behind the curtain wears an immaculate white glove. Yuki studies your opening shot with unnerving attention. It may be the only one she gives you.' },
    { id:'gc_boss', name:'Midnight Shark', title:'The House Always Wins',diff:2, edge:1.00, frames:9, xp:1300, boss:true, blurb:'A great white shark in a midnight dinner suit, gold glinting beneath the lamp. He never raises his voice; the room goes quiet for him. Every name on the champions’ board ends here. Yours need not.' },
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
