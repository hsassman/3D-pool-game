/* The Gilded Rail - AI OPPONENT
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= AI OPPONENT ================= */
const AI = {
  /* base difficulty, plus a per-opponent "edge" (campaign only) that blends toward
     perfect play - tighter aim, less power error, sharper shot selection. Lets the
     career ladder ramp smoothly across all 25 opponents with only 3 base tiers. */
  cfg(){
    const base=DIFFS[Game.diff]||DIFFS[0];
    const e=(Game.match&&Game.match.opp&&Game.match.opp.edge)||0;
    if(!e) return base;
    return { name:base.name, think:base.think,
      jitter: base.jitter*(1-0.55*e),
      powErr: base.powErr*(1-0.55*e),
      smart:  Math.min(1, base.smart + (1-base.smart)*e) };
  },
  legalTargets(){
    if(Game.ruleset==='9ball'){            // 9-ball: only the lowest ball is legal
      const low=balls.filter(b=>b.active&&!b.falling&&b.num>0).sort((a,b)=>a.num-b.num)[0];
      return low?[low]:[];
    }
    const g=Game.groups[1];
    if(Game.openTable || !g) return balls.filter(b=>b.active&&!b.falling&&b.num>0&&b.num!==8);
    const own=balls.filter(b=>b.active&&!b.falling&&Game.groupOf(b)===g&&b.num!==8&&b.num>0);
    return own.length? own : balls.filter(b=>b.active&&b.num===8);
  },
  corridorClear(a, b, ignore){
    const d=b.clone().sub(a); const len=d.length(); if(len<1e-5) return true; d.divideScalar(len);
    for(const o of balls){
      if(!o.active||o.falling||ignore.includes(o)) continue;
      const ap=o.pos.clone().sub(a); const t=Math.max(0,Math.min(len, ap.dot(d)));
      const closest=a.clone().addScaledVector(d,t);
      if(closest.distanceTo(o.pos) < BALL.R*1.95) return false;
    }
    return true;
  },
  /* score one direct (target,pocket) chance from a given cue position */
  evalShot(t, p, from, skipCorridor){
    const pc=p.pos.clone().setY(BALL.R);
    const toPocket=pc.clone().sub(t.pos).setY(0); const dPocket=toPocket.length(); toPocket.normalize();
    const ghost=t.pos.clone().addScaledVector(toPocket,-BALL.R*2);
    const aim=ghost.clone().sub(from).setY(0); const dCue=aim.length();
    if(dCue<BALL.R*1.5) return null;
    aim.normalize();
    const cut=aim.dot(toPocket);
    if(cut<0.28) return null;
    if(!skipCorridor){
      if(!this.corridorClear(from, ghost, [cueBall,t])) return null;
      if(!this.corridorClear(t.pos.clone().addScaledVector(toPocket,BALL.R*2.05), pc, [t,cueBall])) return null;
    }
    let score=Math.pow(cut,3)*(1/(0.5+dCue))*(1/(0.4+dPocket))*(p.type==='corner'?1.05:1.0);
    /* side pockets only accept a reasonably square approach */
    if(p.type==='side'){
      const sq=Math.abs(toPocket.z*Math.sign(p.pos.z));
      if(sq<0.45) return null;
      score*=0.35+0.65*sq;
    }
    /* a target frozen on a cushion is much harder unless it runs along that rail */
    const nearZ=H2-Math.abs(t.pos.z)<BALL.R*1.6, nearX=W2-Math.abs(t.pos.x)<BALL.R*1.6;
    if((nearZ&&Math.abs(toPocket.z)>0.45)||(nearX&&Math.abs(toPocket.x)>0.45)) score*=0.55;
    return {score, dir:aim, cut, dCue, dPocket, ghost, toPocket, target:t, pocket:p};
  },
  /* quick "how good is the table from here" probe for position play */
  nextQuality(from, exclude){
    let q=0;
    for(const t of this.legalTargets()){
      if(t===exclude) continue;
      for(const p of POCKETS){
        const c=this.evalShot(t,p,from,true);
        if(c && c.score>q) q=c.score;
      }
    }
    return q;
  },
  plan(){
    const D=this.cfg();
    const targets=this.legalTargets();
    let cands=[];
    for(const t of targets) for(const p of POCKETS){
      const c=this.evalShot(t,p,cueBall.pos,false);
      if(c) cands.push(c);
    }
    /* nothing direct? a sharp player checks the one-rail banks */
    if(!cands.length && D.smart>0.8){
      for(const t of targets) for(const p of POCKETS){
        const mirrors=[
          new THREE.Vector3(p.pos.x, 0,  2*H2*1.0-p.pos.z), new THREE.Vector3(p.pos.x, 0, -2*H2-p.pos.z),
          new THREE.Vector3( 2*W2-p.pos.x, 0, p.pos.z),     new THREE.Vector3(-2*W2-p.pos.x, 0, p.pos.z)];
        for(const pm of mirrors){
          const toPm=pm.clone().sub(t.pos).setY(0); const dPm=toPm.length(); toPm.normalize();
          const ghost=t.pos.clone().addScaledVector(toPm,-BALL.R*2);
          const aim=ghost.clone().sub(cueBall.pos).setY(0); const dCue=aim.length();
          if(dCue<BALL.R*1.5) continue; aim.normalize();
          const cut=aim.dot(toPm); if(cut<0.55) continue;
          if(!this.corridorClear(cueBall.pos, ghost, [cueBall,t])) continue;
          cands.push({score:Math.pow(cut,3)*0.3/(0.6+dCue+dPm), dir:aim, cut, dCue, dPocket:dPm,
                      ghost, toPocket:toPm, target:t, pocket:p, bank:true});
        }
      }
    }
    if(cands.length){
      cands.sort((a,b)=>b.score-a.score);
      /* the sharp player thinks one shot ahead: where does the cue come to rest,
         and what does the table look like from there? */
      if(D.smart>0.8){
        cands.slice(0,4).forEach(c=>{
          const tan=c.dir.clone().addScaledVector(c.toPocket,-c.cut);
          const tl=tan.length();
          const travel=0.12+0.55*(1-c.cut*c.cut);
          const rest=c.ghost.clone();
          if(tl>1e-4) rest.addScaledVector(tan.normalize(), travel);
          rest.x=Math.max(-W2+BALL.R, Math.min(W2-BALL.R, rest.x));
          rest.z=Math.max(-H2+BALL.R, Math.min(H2-BALL.R, rest.z));
          c.score *= 1 + 0.85*Math.min(1, this.nextQuality(rest, c.target)*6);
        });
        cands.sort((a,b)=>b.score-a.score);
      }
      /* sharper players commit to the assessed best; the regulars get loose */
      const pickN=D.smart>0.95?1:(D.smart>0.8?2:3);
      const pick=cands[(Math.random()*Math.min(pickN,cands.length))|0];
      if(Math.random()<Math.max(D.smart,0.55)){
        const v=Math.min(6.6, 1.0 + pick.dCue*1.05 + (pick.dPocket*(pick.bank?2.6:1.95))/Math.max(pick.cut,0.45));
        return {score:pick.score, dir:pick.dir, power:v/MAX_BREAK_SPEED, target:pick.target, pocket:pick.pocket};
      }
    }
    /* safety: soft touch that leaves the cue with the worst possible table */
    let bestS=null;
    for(const t of targets){
      const aim=t.pos.clone().sub(cueBall.pos).setY(0); const d=aim.length(); aim.normalize();
      if(!this.corridorClear(cueBall.pos, t.pos.clone().addScaledVector(aim,-BALL.R*2), [cueBall,t])) continue;
      /* the cue dies just short of contact: estimate rest near the target */
      const rest=t.pos.clone().addScaledVector(aim,-BALL.R*2.6);
      const oppQ=D.smart>0.8 ? this.nextQuality(rest, null) : Math.random()*0.1;
      const s={dir:aim, d, oppQ};
      if(!bestS || s.oppQ<bestS.oppQ) bestS=s;
    }
    if(!bestS){
      const t=targets.sort((a,b)=>a.pos.distanceTo(cueBall.pos)-b.pos.distanceTo(cueBall.pos))[0];
      if(!t) return null;
      const aim=t.pos.clone().sub(cueBall.pos).setY(0).normalize();
      bestS={dir:aim, d:t.pos.distanceTo(cueBall.pos)};
    }
    const off=new THREE.Vector3(-bestS.dir.z,0,bestS.dir.x).multiplyScalar((Math.random()-0.5)*0.12);
    const aim=bestS.dir.clone().add(off).normalize();
    return {dir:aim, power:Math.min(0.30, (bestS.d*0.85+0.55)/MAX_BREAK_SPEED), safety:true};
  },

  /* position play: pick follow (+) or draw (−) so the cue drifts toward the next
     ball. Only sharper players (smart ≥ 0.8) bother; weaker ones strike centre. */
  positionSpin(plan){
    if(this.cfg().smart<0.8 || !plan || !plan.target) return {sx:0, sy:0};
    const t=plan.target;
    let next=null, nd=1e9;
    for(const b of this.legalTargets()){ if(b===t||!b) continue;
      const d=b.pos.distanceTo(t.pos); if(d<nd){ nd=d; next=b; } }
    let sy=-0.2;                                  // default: a little check/draw
    if(next){
      const toNext=next.pos.clone().sub(t.pos).setY(0);
      if(toNext.lengthSq()>1e-6){ toNext.normalize();
        // next ball ahead of the cue's line → roll forward (follow); behind → draw back
        sy = plan.dir.dot(toNext) >= 0 ? 0.35 : -0.4;
      }
    }
    return {sx:0, sy:Math.max(-0.6, Math.min(0.6, sy))};
  },

  placeBallInHand(){
    /* sample positions, keep the best plan */
    let best=null, bestPos=null;
    for(let i=0;i<26;i++){
      const x = Game.bihKitchen ? (-W2+0.08 + Math.random()*(KITCHEN_X+W2-0.16))
                                : (-W2+0.08 + Math.random()*(TABLE.W-0.16));
      const z = -H2+0.08 + Math.random()*(TABLE.H-0.16);
      const pos=new THREE.Vector3(x,BALL.R,z);
      if(balls.some(b=>b.active&&b.num!==0&&b.pos.distanceTo(pos)<BALL.R*2.2)) continue;
      cueBall.pos.copy(pos);
      const pl=this.plan();
      const s=pl?(pl.safety?0.01:pl.score||0.02):0;
      if(!best||s>best){ best=s; bestPos=pos.clone(); }
    }
    cueBall.pos.copy(bestPos||new THREE.Vector3(Game.bihKitchen?KITCHEN_X-0.25:0,BALL.R,0));
    cueBall.vel.set(0,0,0); cueBall.ang.set(0,0,0);
  },
  takeTurn(){
    const cfg=this.cfg();
    UI.banner('','');
    const wait=cfg.think[0]+Math.random()*(cfg.think[1]-cfg.think[0]);
    setTimeout(()=>{
      if(Game.phase!=='AI') return;
      let dir, power, sx=0, sy=0;
      if(Game.isBreak){
        const apex=balls.filter(b=>b.active&&b.num>0).sort((a,b)=>a.pos.x-b.pos.x)[0];
        dir=apex.pos.clone().sub(cueBall.pos).setY(0).normalize();
        const off=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar((Math.random()-0.5)*0.02);
        dir.add(off).normalize(); power=0.98; sy=-0.1;
      } else {
        const plan=this.plan();
        if(!plan){ Game.onShotSettled(); return; }
        dir=plan.dir.clone(); power=plan.power;
        /* called-shots: the house calls the pocket it is playing the 8 into */
        if(Profile.data.calledShots && Game.ruleset==='8ball' && Game.isOnEight(1) && plan.pocket){
          const pi=POCKETS.indexOf(plan.pocket); if(pi>=0) Game.calledPocket=pi;
        }
        /* human error */
        const ang=(Math.random()-0.5)*2*cfg.jitter;
        const c=Math.cos(ang), s=Math.sin(ang);
        dir.set(dir.x*c-dir.z*s, 0, dir.x*s+dir.z*c);
        power=Math.max(0.07, Math.min(1, power*(1+(Math.random()-0.5)*2*cfg.powErr)));
        if(!plan.safety){ const ps=this.positionSpin(plan); sx=ps.sx; sy=ps.sy; }  // deliberate position play
      }
      /* show the house cue lining up, then strike */
      cueStick.visible=true;
      const start=performance.now(), lineup=650;
      const animate=()=>{
        const k=Math.min(1,(performance.now()-start)/lineup);
        placeCueStick(dir, 0.05+0.22*power*(k<0.85?k/0.85:(1-(k-0.85)/0.15)), sx, sy);
        if(k<1 && Game.phase==='AI') requestAnimationFrame(animate);
        else if(Game.phase==='AI') Game.fire(dir, power, sx, sy);
      };
      animate();
    }, wait);
  }
};
