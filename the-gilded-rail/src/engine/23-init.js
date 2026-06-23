/* The Gilded Rail - INIT
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= INIT ================= */
(async function init(){
  buildTable();
  Trough.build();
  if(typeof matchMedia!=='undefined' && matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
  for(let n=0;n<=15;n++) makeBall(n);
  rackBalls();
  Input.init();
  UI.wire();
  await Profile.load();
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
  /* the room decor uses the external prop models - load them in the BACKGROUND so the
     table and game are playable immediately. The lounge/bar/ashtray stream in once the
     props THEY use are ready (not the whole batch - the big dartboard cabinet must not
     hold them back); the chalk + cabinet wait for their own models in buildRoomDecor. */
  Models.loadAll();
  const barProps=['jackdaniels','redcup','bottles','stool','ashtray'];
  Promise.all(barProps.map(n=>Models.ready(n))).then(()=>{
    buildLounge();
    buildBar();
    const ash=makeCigSet(0.9);   /* ashtray + cigarette on the far rail corner */
    ash.position.set(W2*0.78, 0.061, -(H2+TABLE.CUSH_D+TABLE.RAIL/2));
    tableGroup.add(ash);
  });
})();
