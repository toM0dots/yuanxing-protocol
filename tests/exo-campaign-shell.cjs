/* Production script order + real movement/input/event loop. */
const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
// Survey tools activate in the general world; observations remain local.
const entry=harness();
entry.run('Exo.freeExplore()');const entryPosition={x:entry.qa.unit.x,y:entry.qa.unit.y};
entry.run('Exo.beginTraining("terrain")');
assert.equal(entry.qa.terrain.active,true,'survey tools activate without a separate field');
assert.equal(entry.nodes.get('modal').open,false);
assert.equal(entry.qa.unit.x,entryPosition.x);assert.equal(entry.qa.unit.y,entryPosition.y);
assert(entry.nodes.get('terrain-focus'));assert(entry.nodes.get('exo-fire'));
entry.run('Exo.terrainProbe()');assert.equal(entry.qa.terrain.probe,null,'distant observations cannot be sampled');
entry.run('Exo.transferTraining("terrain")');assert.equal(entry.qa.unit.x,entry.run('ExoTerrainWilds.spawn.x'));
const observation=entry.run('ExoTerrainCourse.observation(ExoTerrainCourse.patches[0])');Object.assign(entry.qa.unit,observation,{vx:0,vy:0});
entry.run('Exo.terrainProbe()');assert(entry.qa.terrain.probe,'sampling succeeds at a natural observation point');
entry.run('Exo.intro()');assert.equal(entry.frames.size,0);
const h=harness(),{run,qa}=h;
assert.match(h.nodes.get('app').innerHTML,/开始冒险/);
const optional=harness();
optional.run('Exo.freeExplore();Exo.campaign();Exo.campaignAcknowledge("crash-read")');
const optionalStart=optional.run('ExoTrainingGround.campaign.start');
assert(Math.hypot(optional.qa.unit.x-optionalStart.x,optional.qa.unit.y-optionalStart.y)<1,'switching from optional exploration starts the authored campaign at its crash site');
optional.run('Exo.wildsExplore()');const fieldPosition={x:optional.qa.unit.x,y:optional.qa.unit.y};optional.run('Exo.trackCampaign()');assert.equal(optional.nodes.get('exo-radio').textContent,optional.qa.campaign.objective().instruction,'resuming story navigation restores its actual instruction');assert.equal(optional.qa.terrain.active,false,'story navigation stows the survey tools');assert.equal(optional.qa.unit.x,fieldPosition.x,'tracking the story does not teleport out of the valley');assert.equal(optional.qa.unit.y,fieldPosition.y);assert.equal(optional.qa.campaign.objective().id,'route');assert.equal(optional.run('Exo.flightToggle()'),true,'unfinished opening road does not lock flight in the distant valley');optional.run('Exo.intro()');
// A direct title -> terminal -> takeover must deploy before acknowledging.
run('Exo.hub("journey");Exo.campaignAcknowledge("crash-read")');
assert.equal(qa.campaign.objective().id,'route');
const start=run('ExoTrainingGround.campaign.start');assert(Math.hypot(qa.unit.x-start.x,qa.unit.y-start.y)<1,'title-terminal entry must use the authored crash approach');
assert.equal(run('Exo.flightToggle()'),false,'opening route cannot be skipped by flight');
const approach=run('ExoTrainingGround.campaign.approach||[]');
const guided=run('ExoWorld.navigation(Exo.__qa.unit).route.points');
for(const p of approach.slice(1))assert(guided.some(q=>q.x===p.x&&q.y===p.y),'EP02 guidance follows the authored crash approach');
const route=run('[...(ExoTrainingGround.campaign.approach||[]),ExoTrainingGround.campaign.caution,...ExoTrainingGround.campaign.bypass,ExoTrainingGround.campaign.exit]');
let steps=0;for(const p of route)steps+=h.driveTo(p);
assert.equal(qa.campaign.objective().id,'lamps');
assert.equal(qa.campaign.state.routeIndex,4);
assert.equal(run('ExoWorld.cave'),null);
const checkpoint=qa.campaign.state.checkpoint;
assert(checkpoint&&Math.abs(checkpoint.y-qa.unit.y)<260,'safe ground position is periodically persisted');
const resumed=harness(h.saved);resumed.run('Exo.resume()');
assert.equal(resumed.qa.campaign.objective().id,'lamps');
assert(Math.hypot(resumed.qa.unit.x-checkpoint.x,resumed.qa.unit.y-checkpoint.y)<1,'reload resumes the saved location');
resumed.run('Exo.intro()');assert.equal(resumed.frames.size,0);
h.driveTo(run('ExoCanyonV2.spawn'));
for(let i=0;i<3;i++){
  h.driveTo(run(`ExoCanyonV2.world(...ExoGreenTrail.records[${i}].stand)`));
  assert.equal(qa.campaign.objective().id,'lamps','proximity alone is not a scan');
  run('Exo.interact();closeModal()');h.settle();
}
assert.equal(qa.campaign.objective().id,'mother');
run('Exo.campaignAcknowledge("mother-memory")');assert.equal(qa.campaign.objective().id,'mother','memory requires reaching its rest point');
run('Exo.trackCampaign()');for(const p of run('ExoWorld.navigation(Exo.__qa.unit).route.points').slice(1))h.driveTo(p);
run('Exo.scan()');assert(h.nodes.get('modal').open,'E opens the memory at its physical rest stop');
run('Exo.campaignAcknowledge("mother-memory")');
assert.equal(qa.campaign.objective().id,'captain');
run('Exo.trackCampaign()');for(const p of run('ExoWorld.navigation(Exo.__qa.unit).route.points').slice(1))h.driveTo(p);
run('Exo.scan()');assert(h.nodes.get('modal').open,'E opens the receiver memory');
run('Exo.campaignAcknowledge("captain-memory")');
assert.equal(qa.campaign.objective().id,'refuge');
// Follow the route generated by the production tracker. Actual movement
// catches misleading beacons whose endpoints land inside authored walls.
run('Exo.trackCampaign()');
const refugePath=run('ExoWorld.navigation(Exo.__qa.unit).route.points');
for(const p of refugePath.slice(1))h.driveTo(p);
run('Exo.campaign()');
assert.equal(qa.campaign.objective().action,'acknowledge');
run('Exo.campaignAcknowledge("refuge-briefed")');
assert.equal(qa.campaign.objective().id,'model');
run('Exo.trackCampaign()');assert(run('ExoWorld.navigation(Exo.__qa.unit)'),'next story leg immediately follows the physical maintenance road');
run('Exo.navigateTraining("fire")');
const rangePath=run('ExoWorld.navigation(Exo.__qa.unit).route.points');
for(const p of rangePath.slice(1))h.driveTo(p);
run('Exo.beginTraining("fire")');assert.match(h.nodes.get('modal').innerHTML,/让每一发打得更准/);
run('closeModal();Exo.courseDeploy()');
assert.equal(qa.fire.active,true);assert.equal(qa.terrain.active,false);assert.equal(qa.unit.flight,null);
assert.equal(run('ExoWorld.cave'),null);
// Keys directed at native controls must retain their browser behavior. The
// production listener should neither steal arrow/space keys nor move the mech.
const focusedStart={x:qa.unit.x,y:qa.unit.y,energy:qa.unit.energy,trim:qa.fire.trim};
let stolen=0;
for(const tag of ['INPUT','SUMMARY','BUTTON']){
  const target={tagName:tag,closest:selector=>/input,select,textarea,button,summary/.test(selector)?{}:null};
  for(const key of ['ArrowDown',' ','r'])h.events.keydown({key,target,repeat:false,preventDefault(){stolen++;}});
  h.settle(3);
}
assert.equal(stolen,0,'native controls retain arrow/space key default behavior');
assert.equal(qa.unit.x,focusedStart.x);assert.equal(qa.unit.y,focusedStart.y,'focused controls never steer the mech');
assert.equal(qa.fire.trim,focusedStart.trim,'native-control keys never change firing trim');
h.events.keydown({key:'Escape',target:{closest:()=>({})},repeat:false,preventDefault(){stolen++;}});
assert.equal(h.nodes.get('modal').open,true,'Escape remains available from native controls');
run('closeModal()');
// Training fixture uses the actual optimizer and install UI. New test samples
// then exercise the shell's observation gate without fabricating combat claims.
run(`(()=>{const ds=[[100,-.8,-.4,-.3],[140,.7,.3,.2],[200,-.4,.5,-.1],[280,.6,-.7,.3],[350,-.9,.4,.5],[420,.3,-.2,-.2],[480,.8,.8,-.4],[540,-.6,-.3,.1],[620,.2,.6,.4],[710,-.2,-.6,-.5],[180,.9,-.8,.6],[390,-.7,.7,-.6]];Exo.__qa.fire.logs=ds.map(([distance,wind,lead,height],i)=>({id:i+1,schema:3,distance,x:distance/500,wind,lead,height,y:ExoFireControl.drift(distance,i+1,{wind,lead,height}),role:'train',assisted:false,residual:10}));})()`);
run('Exo.courseWorkshop();Exo.courseTrain(5000);Exo.courseInstall()');h.settle();
assert.equal(qa.campaign.objective().id,'defense');
qa.fire.completed=true;qa.observe();assert.equal(qa.campaign.objective().id,'defense');
for(const [i,distance] of [150,300,600].entries())qa.fire.logs.push({id:100+i,role:'test',assisted:true,distance,residual:.2});
qa.observe();assert.equal(qa.campaign.objective().id,'stabilizer');
run('Exo.endTraining()');
assert.equal(qa.fire.active,false);assert.equal(qa.terrain.active,false);
const fireTerminal=run('ExoTrainingGround.terminals.find(p=>p.id==="fire")');
assert(Math.hypot(qa.unit.x-fireTerminal.x,qa.unit.y-fireTerminal.y)<1,'exiting a lesson returns to its relocated terminal');
run('Exo.trackCampaign()');const repairPath=run('ExoWorld.navigation(Exo.__qa.unit).route.points');
for(const p of repairPath.slice(1))h.driveTo(p);
const before=qa.unit.energyRegenMultiplier;
run('Exo.campaignAcknowledge("stabilizer-installed")');assert.equal(qa.campaign.state.finished,true);
assert(Math.abs(qa.unit.energyRegenMultiplier/before-1.1)<1e-9,'completed campaign changes actual energy recovery');
qa.unit.energy=30;const p=qa.unit.energy;h.frame();assert(Math.abs(qa.unit.energy-p-12*.05*qa.unit.energyRegenMultiplier)<1e-8,'actual movement integrator applies the recovery multiplier');
run('Exo.courseDeploy()');assert.equal(qa.unit.energyRegenMultiplier,1,'lesson measurements are not affected by campaign or explorer bonuses');
run('Exo.endTraining();Exo.deployTrial(2);Exo.startCampaign()');assert.equal(qa.combat.trial,undefined,'campaign restart clears independent combat trial');
assert.equal(run('ExoWorld.cave'),null);assert.equal(qa.unit.flight,null);assert.equal(qa.fire.active,false);
run('Exo.intro()');assert.equal(h.frames.size,0);
console.log(`PASS: natural-world local sampling, geographically scoped story-flight gate, native keyboard controls, live script order, title takeover, ${steps} real input/motion frames around washed-out road, checkpoint reload, three physical lamp scans, narrative and refuge flow, campus navigation, real fitting/install handlers, held-out defense gate, persistent +10% recovery, lesson isolation and scene cleanup. DOM/logic harness only.`);
