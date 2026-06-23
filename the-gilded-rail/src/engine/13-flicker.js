/* The Gilded Rail - FAULTY WIRING
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= FAULTY WIRING ================= */
/* roughly every few minutes the lights act up for about ten seconds. Most of the time
   ONE random lamp just stutters; ~20% of the time it's a full power-cut and EVERY lamp
   drops out together (the brass wall sconces stay lit, so the room never goes pitch black)
   before the power kicks back in. */
const Flicker = {
  t:0, next:160+Math.random()*140, active:null,
  update(dt){
    this.t+=dt;
    if(!this.active){
      if(this.t>=this.next && flickerLights.length){
        if(Math.random()<0.20){
          /* power-cut: snap every lamp off for ~10s, remembering each base level */
          const saved=flickerLights.map(l=>l.intensity);
          flickerLights.forEach(l=>l.intensity=0);
          this.active={blackout:true, saved, end:this.t+9+Math.random()*2.5};
        } else {
          const l=flickerLights[(Math.random()*flickerLights.length)|0];
          this.active={l, base:l.intensity, end:this.t+10};
        }
      }
    } else {
      const a=this.active;
      if(this.t>=a.end){
        if(a.blackout) flickerLights.forEach((l,i)=>l.intensity=a.saved[i]);
        else a.l.intensity=a.base;
        this.active=null;
        this.next=this.t+240+Math.random()*120;        /* next episode in 4-6 minutes */
      } else if(a.blackout){
        /* stay dark, with the odd faint surge as the wiring tries to catch */
        flickerLights.forEach((l,i)=> l.intensity = (Math.random()<0.05 ? a.saved[i]*0.22 : 0));
      } else {
        a.l.intensity = a.base * (Math.random()<0.82 ? 0.45+Math.random()*0.7 : 0.05);
      }
    }
  }
};
