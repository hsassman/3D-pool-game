/* Driver.js owns tour rendering, placement, focus and keyboard navigation. */
const Onboarding={
  active:false,tour:null,snapshot:null,
  start(replay){
    if(this.active)return true;
    if(typeof Net!=='undefined'&&Net.active){UI.statusHint('Replay the guide after this online frame.');return false;}
    const factory=window.driver&&window.driver.js&&window.driver.js.driver;
    if(typeof factory!=='function'){UI.statusHint('The guide could not load. Please reload the page.');return false;}
    if(Input.charging)Input.cancelCharge();
    this.snapshot={phase:Game.phase,mode:Input.mode,paused:!!Game.paused,focus:document.activeElement,
      uiHidden:document.body.classList.contains('ui-hidden'),
      overlays:['menu-overlay','quick-overlay','modal-overlay','gameover-overlay'].map(id=>({id,hidden:UI.$(id).classList.contains('hidden')}))};
    Input.keys={};Input.dragging=false;Game.paused=true;
    if(Game.phase==='MENU'||Game.phase==='OVER')Game.phase='AIM';
    Input.mode='FINE';this.active=true;
    document.body.classList.remove('ui-hidden');document.body.classList.add('onboarding-active');
    this.snapshot.overlays.forEach(o=>UI.$(o.id).classList.add('hidden'));
    UI.closeQuickbar();UI.sync();
    try{
      this.tour=factory({
        animate:typeof matchMedia==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration:180,overlayColor:'#06100b',overlayOpacity:.6,stagePadding:6,stageRadius:10,
        allowClose:true,allowScroll:false,overlayClickBehavior:'none',disableActiveInteraction:true,
        allowKeyboardControl:true,showProgress:true,progressText:'{{current}} of {{total}}',
        nextBtnText:'Next',prevBtnText:'Back',doneBtnText:'Finish',closeBtnLabel:'Close guide',
        popoverClass:'club-tour',popoverOffset:12,
        steps:TUTORIAL_STEPS.map(s=>({element:s.element,popover:{title:s.title,description:s.body,side:s.side||'bottom',align:'center'}})),
        onDestroyed:()=>this.restore(true)
      });
      this.tour.drive();return true;
    }catch(e){this.restore(false);throw e;}
  },
  close(){if(this.tour)this.tour.destroy();else if(this.active)this.restore(false);},
  restore(seen){
    const previous=this.snapshot;if(!previous)return;
    this.active=false;this.tour=null;this.snapshot=null;
    Game.phase=previous.phase;Game.paused=previous.paused;Input.mode=previous.mode;Input.keys={};
    previous.overlays.forEach(o=>UI.$(o.id).classList.toggle('hidden',o.hidden));
    document.body.classList.remove('onboarding-active');document.body.classList.toggle('ui-hidden',previous.uiHidden);
    if(seen){Profile.data.tutorialSeen=true;Profile.save();}
    UI.sync();
    if(previous.focus&&previous.focus.isConnected&&previous.focus.focus)previous.focus.focus({preventScroll:true});
  }
};
/* Consume dismissal before Driver removes the tour and the game sees Escape. */
window.addEventListener('keydown',e=>{
  if(Onboarding.active&&e.code==='Space'){
    e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(Onboarding.active&&e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();Onboarding.close();
  }
},true);
