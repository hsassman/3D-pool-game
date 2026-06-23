/* The Gilded Rail - GAME / RULES
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= GAME / RULES ================= */
const Game = {
  phase:'MENU',           // MENU | AIM | CHARGE | SIM | BIH | AI | OVER
  turn:0,                 // 0 = player 1, 1 = player 2 / CPU
  mode:'cpu',             // 'cpu' = vs computer, 'local' = two players on one device
  groups:[null,null],     // 'solid' | 'stripe'
  openTable:true,
  isBreak:true,
  bihKitchen:false,       // ball-in-hand restricted to the kitchen (after break foul)
  diff:1,
  streak:0, frameShots:0, framePots:0, frameFouls:0,
  breaker:0,
  match:null,             // campaign match in progress: {opp, need, me, them, frames} | null
  ruleset:'8ball',        // '8ball' | '9ball' | 'blackball' | 'practice'
  _practiceLayout:null,   // active trick-shot layout in practice, or null for a full rack
  calledPocket:null,      // POCKETS index the shooter has called for the 8 (called-shots rule)

  /* a turn is human-controlled if it's player 1, or always in local two-player */
  isHuman(t){ return this.mode==='local' ? true : t===0; },
  playerName(i){
    if(i===0) return Profile.data.name||'Player 1';
    if(this.mode==='local') return 'Player 2';
    if(this.match) return this.match.opp.name;   // campaign: show the opponent's name
    return 'House';
  },
  /* a player is "on the 8" when their group is set and fully cleared */
  isOnEight(player){ const g=this.groups[player]; return !!g && this.remaining(g)===0; },
  /* called-shots: the human must pick a pocket for the 8 before they can shoot it */
  needCall(player){
    if(this.ruleset!=='8ball' || !Profile.data.calledShots) return false;
    player = (player==null)?this.turn:player;
    return this.isHuman(player) && this.isOnEight(player);
  },

  /* route the start of a player's turn: humans aim, the CPU thinks */
  beginTurn(player, opts){
    opts=opts||{};
    this.calledPocket=null;          // a fresh turn clears any prior pocket call
    if(this.isHuman(player)){
      if(opts.bih){ this.phase='BIH'; if(this.mode==='local') UI.passBanner(player,true); Input.enterBIH(); }
      else { this.phase='AIM'; if(this.mode==='local') UI.passBanner(player,false); Input.enterShootMode(true); }
    } else {
      this.phase='AI'; Input.enterOrbit();
      if(opts.bih) AI.placeBallInHand();
      AI.takeTurn();
    }
    /* show the how-to-play coaching the very first time a human is at the table */
    if(typeof UI!=='undefined' && !Profile.data.tutorialSeen && this.isHuman(player)) UI.tutorialOpen(false);
  },

  /* begin a campaign match against one ladder opponent (best-of-N frames) */
  startCampaignMatch(opp){
    this.mode='cpu';
    this.diff=opp.diff;
    this.match={ opp, need:Math.ceil(opp.frames/2), me:0, them:0, frames:opp.frames };
    this.breaker=0;
    this.newGame();
  },

  /* abandon any campaign match (e.g. returning to the menu mid-match) */
  abandonMatch(){ this.match=null; if(typeof Campaign!=='undefined') Campaign.active=null; },

  /* reds/yellows label helper (English pool uses colours instead of solids/stripes) */
  colourName(g){
    if(this.ruleset==='blackball') return g==='solid'?'reds':(g==='stripe'?'yellows':'black');
    return g==='solid'?'solids':(g==='stripe'?'stripes':'eight');
  },

  newGame(){
    if(this.ruleset==='9ball')     return this.newGame9();
    if(this.ruleset==='blackball') return this.newGameBlackball();
    if(this.ruleset==='practice')  return this.newGamePractice(this._practiceLayout);
    setBallSkin('numbered');
    rackBalls();
    Trough.reset();
    Sfx.startAtmosphere();
    this.turn=this.breaker; this.groups=[null,null]; this.openTable=true; this.isBreak=true;
    this.bihKitchen=false; this.streak=0; this.frameShots=0; this.framePots=0; this.frameFouls=0;
    shotEvents.reset(true);
    UI.refreshScoreboard();
    const breakLabel = this.turn===0 ? (this.mode==='local'?'Player 1 breaks':'Your break')
                                     : (this.mode==='local'?'Player 2 breaks':'House breaks');
    UI.banner(breakLabel,'Open table - sink a ball to claim a group');
    this.beginTurn(this.turn);
    UI.sync();
  },

  /* ---------------- ENGLISH / BLACKBALL (reds & yellows) ----------------
     Same WPA-style flow as 8-ball (open table → claim a colour → clear it → pot
     the black to win; foul = ball in hand), but with red/yellow/black balls. */
  newGameBlackball(){
    setBallSkin('blackball');
    rackBalls();
    Trough.reset();
    Sfx.startAtmosphere();
    this.turn=this.breaker; this.groups=[null,null]; this.openTable=true; this.isBreak=true;
    this.bihKitchen=false; this.streak=0; this.frameShots=0; this.framePots=0; this.frameFouls=0;
    this.match=null;
    shotEvents.reset(true);
    UI.refreshScoreboard();
    const lbl=this.turn===0 ? (this.mode==='local'?'Player 1 breaks':'Your break')
                            : (this.mode==='local'?'Player 2 breaks':'House breaks');
    UI.banner(lbl,'English pool - reds & yellows, then the black');
    this.beginTurn(this.turn);
    UI.sync();
  },

  /* ---------------- 9-BALL ---------------- */
  lowest9(){ const ns=balls.filter(b=>b.active&&!b.falling&&b.num>0).map(b=>b.num);
    return ns.length?Math.min.apply(null,ns):9; },
  newGame9(){
    setBallSkin('numbered');
    rack9(); Trough.reset(); Sfx.startAtmosphere();
    this.turn=this.breaker; this.groups=[null,null]; this.openTable=false; this.isBreak=true;
    this.bihKitchen=false; this.streak=0; this.frameShots=0; this.framePots=0; this.frameFouls=0;
    this.match=null;
    shotEvents.reset(true);
    UI.refreshScoreboard();
    UI.banner(this.turn===0?'Your break':'House breaks','9-Ball - strike the lowest ball first, sink the 9 to win');
    this.beginTurn(this.turn);
    UI.sync();
  },
  placeCueForBIH9(){
    this.bihKitchen=false;
    if(shotEvents.cueScratch){
      cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
      cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
      cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0); cueBall.pos.set(0, BALL.R, 0);
    }
    this.beginTurn(this.turn, {bih:true});
    UI.refreshScoreboard(); UI.sync();
  },
  _settle9(){
    const ev=shotEvents, shooter=this.turn;
    const pottedObj=ev.potted.filter(b=>b.num>0);
    const lowest=this._lowest9Before||1;
    let foul=false, reasons=[];
    if(!ev.firstContact){ foul=true; reasons.push('cue ball hit nothing'); }
    else if(ev.firstContact.num!==lowest){ foul=true; reasons.push('missed the '+lowest+'-ball'); }
    if(ev.cueScratch){ foul=true; reasons.push('scratched the cue ball'); if(shooter===0) Profile.data.stats.scratches++; }
    if(!ev.cueScratch && ev.firstContact && pottedObj.length===0 && !ev.cushionAfterContact){
      foul=true; reasons.push('no ball reached a rail'); }
    const nine=balls.find(b=>b.num===9), ninePotted=pottedObj.some(b=>b.num===9);
    /* legal 9 = win; foul 9 = re-spot and play on */
    if(ninePotted && !foul){ this.endFrame(shooter===0, shooter===0?'ran out the 9-ball':'house ran out the 9'); return; }
    if(ninePotted && foul){
      nine.active=true; nine.falling=false; nine.mesh.visible=true; nine.shadowDisc.visible=true;
      nine.vel.set(0,0,0); nine.ang.set(0,0,0);
      let p=FOOT_SPOT.clone();
      while(balls.some(b=>b!==nine&&b.active&&b.pos.distanceTo(p)<BALL.R*2.05)) p.x+=BALL.R*2.1;
      nine.pos.copy(p);
    }
    if(shooter===0){
      const pots=pottedObj.length;
      if(pots>0 && !foul){
        Profile.data.stats.potted+=pots; this.framePots+=pots; this.streak+=pots;
        Profile.data.stats.bestStreak=Math.max(Profile.data.stats.bestStreak, this.streak);
        Profile.addXP(pots*10, pots>1?pots+' balls':'nice pot');
      }
      if(foul){ Profile.data.stats.fouls++; this.streak=0; this.frameFouls++; }
      if(typeof Progression!=='undefined')
        Progression.afterShot({pots:(pots>0&&!foul)?pots:0, breakPot: ev.breakShot && pots>0 && !foul});
    }
    this.isBreak=false;
    if(foul){
      this.turn=1-shooter; if(shooter===0) this.streak=0;
      UI.banner('Foul - '+reasons[0], (this.turn===0?'You have':'House has')+' ball in hand');
      this.placeCueForBIH9();
    } else if(pottedObj.length>0){
      UI.banner(shooter===0?'Stay at the table':'House continues','');
      this.nextShot(shooter);
    } else {
      this.turn=1-shooter; if(shooter===0) this.streak=0;
      UI.banner(this.turn===0?'Your shot':'House at the table','');
      this.nextShot(this.turn);
    }
    UI.refreshScoreboard(); UI.sync(); Profile.save();
  },

  /* ---------------- PRACTICE / TRICK SHOTS ---------------- */
  startTrickshot(layout){ this.ruleset='practice'; this.newGamePractice(layout); },
  newGamePractice(layout){
    setBallSkin('numbered');
    this._practiceLayout=layout||null;
    if(layout) applyTrickshot(layout); else rackBalls();
    Trough.reset(); Sfx.startAtmosphere();
    this.mode='local';                 // solo: always human, never the AI
    this.turn=0; this.groups=[null,null]; this.openTable=true; this.isBreak=false;
    this.match=null; this.streak=0; this.frameShots=0; this.framePots=0; this.frameFouls=0;
    shotEvents.reset(false);
    UI.refreshScoreboard();
    UI.banner(layout?layout.name:'Practice Table', layout?layout.desc:'Free play - ball in hand, no rules');
    this.phase='AIM'; Input.enterShootMode(true);
    UI.sync();
  },
  _settlePractice(){
    this.isBreak=false;
    /* potting balls just clears them; re-rack (or reset the layout) once empty */
    if(!balls.some(b=>b.num>0 && b.active)){
      if(this._practiceLayout) applyTrickshot(this._practiceLayout); else rackBalls();
      Trough.reset();
    }
    if(shotEvents.cueScratch){
      cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
      cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
      cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0); cueBall.pos.set(0, BALL.R, 0);
      this.phase='BIH'; Input.enterBIH();
    } else {
      this.phase='AIM'; Input.enterShootMode(true);
    }
    UI.refreshScoreboard(); UI.sync();
  },

  groupOf(b){ return b.num<8 ? 'solid' : (b.num>8 ? 'stripe' : 'eight'); },
  remaining(group){ return balls.filter(b=>b.num>0 && b.num!==8 && b.active && this.groupOf(b)===group).length; },

  fire(dir, power, sx, sy){
    this.frameShots++;
    if(this.turn===0){ Profile.data.stats.shots++; }
    if(this.ruleset==='9ball') this._lowest9Before=this.lowest9();
    this._shotCall = this.calledPocket;     // the pocket called for this shot (8-ball, called-shots)
    shotEvents.reset(this.isBreak);
    this._remAtStart = this.groups[this.turn] ? this.remaining(this.groups[this.turn]) : null;
    strikeCueBall(dir, power, sx, sy);
    if(typeof Haptics!=='undefined') Haptics.buzz(Math.round(8+power*22));   // strike kick scales with power
    simActive=true; simTime=0;
    this.phase='SIM';
    aimGroup.visible=false; cueStick.visible=false;
    UI.sync();
  },

  onShotSettled(){
    if(this.ruleset==='practice') return this._settlePractice();
    if(this.ruleset==='9ball')    return this._settle9();
    const ev=shotEvents, shooter=this.turn, me=this.groups[shooter];
    let foul=false, reasons=[], win=false, lose=false;
    const pottedObj = ev.potted.filter(b=>b.num>0);
    const potted8   = pottedObj.find(b=>b.num===8);

    /* --- legality of first contact --- */
    if(!ev.firstContact){ foul=true; reasons.push('cue ball touched nothing'); }
    else{
      const fg=this.groupOf(ev.firstContact);
      if(this.openTable){
        if(fg==='eight' && !ev.breakShot){ foul=true; reasons.push('struck the 8-ball first on an open table'); }
      } else {
        const mustHit = this.remaining(me) + (pottedObj.filter(b=>this.groupOf(b)===me).length) > 0 ? me : 'eight';
        // (remaining() is post-shot; add back own balls potted this shot to judge the start state)
        if(fg!==mustHit){ foul=true; reasons.push('contacted '+(fg==='eight'?'the 8-ball':"opponent's group")+' first'); }
      }
    }
    if(ev.cueScratch){ foul=true; reasons.push('scratched the cue ball'); if(shooter===0) Profile.data.stats.scratches++; }
    if(!ev.cueScratch && ev.firstContact && pottedObj.length===0 && !ev.cushionAfterContact){
      foul=true; reasons.push('no ball reached a rail after contact');
    }

    /* --- the 8-ball --- */
    if(potted8){
      if(ev.breakShot){
        this.respotEight();
        UI.banner('8 off the break','Re-spotted - play continues');
      } else {
        const hadBallsLeft = me ? (this._remAtStart>0) : true;  // open table: never legal
        if(hadBallsLeft || foul){ lose=true; }
        else if(Profile.data.calledShots){
          /* called-shots: the 8 must drop in the called pocket, else loss */
          const eight=ev.potted.find(b=>b.num===8);
          const calledOK = this._shotCall!=null && eight && eight.fallPocket===POCKETS[this._shotCall];
          if(calledOK) win=true; else { lose=true; reasons.push('8-ball not in the called pocket'); }
        } else win=true;
      }
    }

    /* --- group assignment (table stays open after the break) --- */
    if(!ev.breakShot && this.openTable && !foul && pottedObj.some(b=>b.num!==8)){
      const first=pottedObj.find(b=>b.num!==8);
      const g=this.groupOf(first);
      this.groups[shooter]=g; this.groups[1-shooter]=(g==='solid'?'stripe':'solid');
      this.openTable=false;
      const win8 = this.ruleset==='blackball' ? 'pot the black' : 'sink the 8';
      UI.banner((shooter===0?'You are ':'House takes ')+this.colourName(g).toUpperCase(),
                shooter===0 ? 'Clear your group, then '+win8
                            : 'You have '+this.colourName(g==='solid'?'stripe':'solid'));
    }

    /* --- scoring / stats for the human --- */
    if(shooter===0){
      const ownPots = pottedObj.filter(b=> b.num!==8 && (this.openTable||!me ? true : this.groupOf(b)===me)).length;
      if(ownPots>0 && !foul){
        Profile.data.stats.potted += ownPots;
        this.framePots += ownPots;
        this.streak += ownPots;
        Profile.data.stats.bestStreak = Math.max(Profile.data.stats.bestStreak, this.streak);
        Profile.addXP(ownPots*12, ownPots>1?ownPots+' balls':'nice pot');
      }
      if(foul){ Profile.data.stats.fouls++; this.streak=0; this.frameFouls++; }
      /* feed challenges + achievements (balls potted, break pots, streaks) */
      if(typeof Progression!=='undefined'){
        const cleanPots=(ownPots>0 && !foul)?ownPots:0;
        Progression.afterShot({pots:cleanPots, breakPot: ev.breakShot && cleanPots>0});
      }
    }

    /* --- end of frame? --- */
    if(win||lose){
      const humanWon = (win && shooter===0) || (lose && shooter===1);
      this.endFrame(humanWon, win&&shooter===0&&!foul ? 'sank the 8-ball' :
        (lose&&shooter===0 ? (foul&&potted8?'fouled on the 8-ball':'8-ball down too early') :
         (win? 'house sank the 8' : 'house fouled on the 8')));
      return;
    }

    /* --- continue or pass --- */
    const legalPot = !foul && pottedObj.some(b=>{
      if(b.num===8) return false;
      if(this.openTable || !this.groups[shooter]) return true;
      return this.groupOf(b)===this.groups[shooter];
    });

    this.isBreak=false;
    if(foul){
      if(shooter===0) this.streak=0;
      this.turn=1-shooter;
      const wasBreak = ev.breakShot;
      this.bihKitchen = wasBreak;
      UI.banner('Foul - '+reasons[0], (this.turn===0?'You have':'House has')+' ball in hand'+(wasBreak?' (kitchen)':''));
      this.placeCueForBIH();
    } else if(legalPot){
      UI.banner(shooter===0?'Stay at the table':'House shoots again','');
      this.nextShot(shooter);
    } else {
      this.turn=1-shooter;
      if(shooter===0) this.streak=0;
      UI.banner(this.turn===0?'Your shot':'House at the table','');
      this.nextShot(this.turn);
    }
    UI.refreshScoreboard(); UI.sync(); Profile.save();
  },

  placeCueForBIH(){
    if(shotEvents.cueScratch){
      cueBall.active=true; cueBall.falling=false; cueBall.offTable=false;
      cueBall.mesh.visible=true; cueBall.shadowDisc.visible=true;
      cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
      cueBall.pos.set(this.bihKitchen?KITCHEN_X-0.25:0, BALL.R, 0);
    }
    this.beginTurn(this.turn, {bih:true});
    UI.refreshScoreboard(); UI.sync();
  },

  nextShot(player){
    this.beginTurn(player);
  },

  respotEight(){
    const e=balls.find(b=>b.num===8);
    e.active=true; e.falling=false; e.mesh.visible=true; e.shadowDisc.visible=true;
    e.vel.set(0,0,0); e.ang.set(0,0,0);
    let p=FOOT_SPOT.clone();
    while(balls.some(b=>b!==e&&b.active&&b.pos.distanceTo(p)<BALL.R*2.05)) p.x+=BALL.R*2.1;
    e.pos.copy(p);
  },

  endFrame(humanWon, why){
    this.phase='OVER';
    Profile.data.stats.games++;
    let xp=0;
    if(humanWon){
      Profile.data.stats.wins++; Profile.data.stats.eights++;
      xp = 120 + this.remainingOpp()*8;
      /* victory/defeat audio is played by UI.gameOver (the result screen) */
      if(typeof Haptics!=='undefined') Haptics.buzz([0,50,60,50,60,90]);
      this.breaker=0;
    } else { xp = 18; this.breaker=1; }
    Profile.data.xp += xp; Profile.save(); UI.refreshProfile();

    /* feed challenges + achievements (frame wins, foul-free wins, ladder champ) */
    if(typeof Progression!=='undefined')
      Progression.afterFrame({won:humanWon, foulFreeWin: humanWon && this.frameFouls===0});

    /* rated frame vs the CPU: update Elo rating + frame-win streak */
    this.lastRated=null;
    if(this.mode==='cpu' && typeof Progression!=='undefined'){
      const delta=Progression.ratedFrame(humanWon, this.diff);
      this.lastRated={delta, rating:Profile.data.rating, rank:Progression.rankTier()};
    }

    /* campaign match: tally this frame, then continue or conclude the match */
    if(this.match){
      const m=this.match;
      if(humanWon) m.me++; else m.them++;
      if(m.me>=m.need || m.them>=m.need){
        const wonMatch=m.me>=m.need;
        let bonus=0;
        if(wonMatch && typeof Campaign!=='undefined' && !Campaign.cleared(m.opp.id)){
          bonus=m.opp.xp||0; Profile.data.xp+=bonus; Profile.save(); UI.refreshProfile();
          Campaign.markCleared(m.opp.id);
        }
        this.match=null; if(typeof Campaign!=='undefined') Campaign.active=null;
        UI.refreshScoreboard();
        UI.gameOver(humanWon, why, xp+bonus, this.frameShots, this.framePots,
                    {matchDecided:true, wonMatch, opp:m.opp, me:m.me, them:m.them});
      } else {
        UI.refreshScoreboard();
        UI.gameOver(humanWon, why, xp, this.frameShots, this.framePots, {match:m});
      }
      return;
    }
    UI.gameOver(humanWon, why, xp, this.frameShots, this.framePots);
  },
  remainingOpp(){ const g=this.groups[1]; return g? this.remaining(g):0; }
};
