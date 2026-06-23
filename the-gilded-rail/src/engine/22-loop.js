/* The Gilded Rail - MAIN LOOP
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= MAIN LOOP ================= */
const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(), 0.05);
  Input.update(dt);
  physicsFrame(dt);

  /* aim & cue presentation */
  if((Game.phase==='AIM'||Game.phase==='CHARGE') && (Input.mode==='SHOOT'||Input.mode==='FINE')){
    const d=Input.aimDir();
    const g=(Profile.data && Profile.data.aimGuide) || 'full';
    if(g!=='off'){ updateAimGuide(d, g); aimGroup.visible=true; } else aimGroup.visible=false;
    placeCueStick(d, 0.07 + Input.power*0.30, Input.spin.x, Input.spin.y);
    cueStick.visible=true;
  } else if(Game.phase==='AIM'||Game.phase==='CHARGE'){
    aimGroup.visible=false; cueStick.visible=false;
  }

  const t=performance.now()*0.001;
  Smoke.update(t);
  Embers.update(t);
  CueFX.update(t);
  Candles.update(t);
  Trough.update(dt);
  Flicker.update(dt);
  if(typeof Flashlight!=='undefined') Flashlight.update();

  /* drifting dust in the lamplight (table, bar and lounge clouds) */
  for(let c=0;c<dustClouds.length;c++){
    const p=dustClouds[c].geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      p.array[i*3+1]+=Math.sin(t*0.6+i)*0.00012;
      p.array[i*3]  +=Math.cos(t*0.4+i*1.7)*0.00008;
    }
    p.needsUpdate=true;
  }

  /* light rain falling outside the window */
  if(windowRain){
    const p=windowRain.geometry.attributes.position, u=windowRain.userData;
    for(let i=0;i<p.count;i++){
      p.array[i*3+1]-=dt*(2.2+(i%6)*0.3);
      if(p.array[i*3+1]<u.yBot) p.array[i*3+1]=u.yTop;
    }
    p.needsUpdate=true;
  }
  /* rain streaks running down the window glass */
  if(glassRain && glassRain.userData.tex){ glassRain.userData.tex.offset.y -= dt*0.06; }

  /* ceiling fan */
  if(ceilingFan) ceilingFan.rotation.y += dt*1.7;

  /* wall clock showing the real local time */
  if(clockHands){
    const d=new Date();
    const s=d.getSeconds()+d.getMilliseconds()/1000;
    const m=d.getMinutes()+s/60;
    const h=(d.getHours()%12)+m/60;
    clockHands.hour.rotation.z   = -(h/12)*Math.PI*2;
    clockHands.minute.rotation.z = -(m/60)*Math.PI*2;
    clockHands.second.rotation.z = -(s/60)*Math.PI*2;
  }

  Input.updateCamera(dt);
  PostFX.render();
}
