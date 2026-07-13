/* The Gilded Rail - INIT
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= INIT ================= */
(async function init(){
  /* kick every asset download off immediately - the boot curtain (index.html)
     stays up until they all land; see Boot in 22b-preload.js */
  const booted = Boot.run();
  buildTable();
  Trough.build();
  if(typeof matchMedia!=='undefined' && matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
  for(let n=0;n<=15;n++) makeBall(n);
  rackBalls();
  Input.init();
  UI.wire();
  await Profile.load();
  /* optional member accounts + cloud saves + online rooms (no-ops offline) */
  if(typeof Account!=='undefined') Account.init();
  if(typeof LobbyUI!=='undefined') LobbyUI.wire();
  Unlocks.applyAll();
  UI.applyA11y();
  Graphics.apply();
  Progression.init();
  /* restore a previously-on flashlight (only takes effect if its code is still unlocked) */
  if(typeof Flashlight!=='undefined'){ Flashlight.ensure(); Flashlight.set(!!(Profile.data.flashlight && Flashlight.available())); }
  UI.refreshScoreboard();
  UI.gauge(0); UI.spinDot(); UI.sync();
  PostFX.init();
  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    PostFX.setSize(innerWidth,innerHeight);
  });
  loop();
  /* hold the curtain until EVERY asset has downloaded AND the room decor built from
     them has finished parsing/placing - otherwise the menu would appear "ready" while
     GLTF parsing + scene-graph inserts for 7 models were still to come, causing the
     exact stutter this loader exists to prevent. Bytes are already local (blob: URLs
     from Boot), so parsing is fast; the watchdog still guarantees the curtain can
     never trap the player on a broken network. */
  const barProps=['jackdaniels','redcup','bottles','stool','ashtray'];
  const decorReady = booted.then(()=>Models.loadAll()).then(()=>
    Promise.all(barProps.map(n=>Models.ready(n)))
  ).then(()=>{
    buildLounge();
    buildBar();
    const ash=makeCigSet(0.9);   /* ashtray + cigarette on the far rail corner */
    ash.position.set(W2*0.78, 0.061, -(H2+TABLE.CUSH_D+TABLE.RAIL/2));
    tableGroup.add(ash);
  });
  await Promise.race([decorReady, new Promise(r=>setTimeout(r, 60000))]);
  Boot.hide();
})();
