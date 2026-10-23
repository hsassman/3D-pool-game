/* Check the real AI scheduler: pause thinking/lineup and discard stale turns. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const THREE=require('three');
const timers=[],frames=[];
let now=0,fired=0;
const Game={phase:'AI',paused:false,isBreak:false,fire(){fired++;this.phase='SIM';}};
const context={THREE,Game,DIFFS:[{}],Profile:{data:{calledShots:false}},UI:{banner(){}},cueStick:{visible:false},
  cueBall:{pos:new THREE.Vector3()},placeCueStick(){},MAX_BREAK_SPEED:9.5,
  performance:{now:()=>now},setTimeout:fn=>timers.push(fn),requestAnimationFrame:fn=>frames.push(fn),Math};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/engine/19-ai-opponent.js'),'utf8')+'\nglobalThis.subject=AI;',context);
const AI=context.subject;
AI.cfg=()=>({think:[0,0],jitter:0,powErr:0,smart:1});
AI.plan=()=>({dir:new THREE.Vector3(1,0,0),power:.3});
AI.takeTurn();Game.paused=true;timers.shift()();assert.equal(fired,0);
Game.paused=false;timers.shift()();timers.shift()();
now=800;Game.paused=true;frames.shift()();assert.equal(fired,0);
Game.paused=false;frames.shift()();assert.equal(fired,1);
Game.phase='AI';AI.takeTurn();const stale=timers.shift();AI.takeTurn();const current=timers.shift();
stale();assert.equal(frames.length,0);current();now=1600;frames.shift()();assert.equal(fired,2);
console.log('AI pause: thinking, cue animation, resume and stale-turn guards passed');
