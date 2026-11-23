/* Shared geometry and real interaction gates for the first-act route. */
const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
const h=harness(),{run,qa}=h,S=run('ExoStoryRoute'),W=run('ExoWorld');
let samples=0;
for(const path of S.paths)for(let i=1;i<path.points.length;i++){
 const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.ceil(length/35);
 for(let j=0;j<=count;j++){
  const x=a.x+(b.x-a.x)*j/count,y=a.y+(b.y-a.y)*j/count,z=W.elevation(x,y);
  assert(!W.solidStructure(x,y,z+65,25),path.id+' must clear scenery and walls');
  assert(W.slope(x,y)<.65,path.id+' must remain walkable');samples++;
 }
}
for(let i=1;i<S.lamps.length;i++)assert(Math.hypot(S.lamps[i].x-S.lamps[i-1].x,S.lamps[i].y-S.lamps[i-1].y)>800,'clues need separate moments of travel');
for(const branch of S.paths.filter(p=>p.kind==='side')){
 const main=S.paths.filter(p=>p.kind==='main').flatMap(p=>p.points);
 for(const end of [branch.points[0],branch.points.at(-1)])assert(main.some(p=>p.x===end.x&&p.y===end.y),'both ends of '+branch.id+' reconnect with the story');
 const clue=S.detours.find(p=>p.id===branch.id),route=S.route(clue,S.refuge);
 assert(route?.length>1,'tracking can resume from '+branch.id);
 for(const p of route)assert(S.roadDistance(p.x,p.y)<.01,'return navigation stays on the trail');
}
run('Exo.startCampaign();Exo.campaignAcknowledge("crash-read")');
const objective=qa.campaign.objective().id;
for(const clue of S.detours){
 assert(!qa.journey.state.earned.includes('detour:'+clue.id));
 run(`Exo.navigateDetour('${clue.id}')`);
 assert(W.navigation(qa.unit)?.route.points.length>1,'detour selection creates a physical route');
 assert.equal(qa.campaign.objective().id,objective,'optional navigation cannot advance the story');
 // Arriving is not discovery. The normal E interaction awards it once.
 Object.assign(qa.unit,{x:clue.x,y:clue.y,vx:0,vy:0});
 const xp=qa.journey.state.xp;
 run('Exo.scan()');assert(qa.journey.state.earned.includes('detour:'+clue.id));
 assert.equal(qa.journey.state.xp,xp+25);
 run('Exo.scan()');assert.equal(qa.journey.state.xp,xp+25,'revisiting cannot farm discovery XP');
 assert.equal(qa.campaign.objective().id,objective);
 run('Exo.trackCampaign()');assert(W.navigation(qa.unit),'main story remains resumable');
}
const saved=JSON.parse(h.saved.get('exo-expedition-v1'));
assert(S.detours.every(p=>saved.earned.includes('detour:'+p.id)),'all discoveries persist using the existing diary save');
const main=S.route(S.start,S.range);
assert(main.findIndex(p=>p.x===S.lamps[0].x&&p.y===S.lamps[0].y)<main.findIndex(p=>p.x===S.mother.x&&p.y===S.mother.y),'main route preserves the story order');
assert(S.beacons.filter(p=>p.side).length>0,'optional paths keep their distinct lamp colour');
run('Exo.intro()');
console.log(`PASS: ${samples} route clearance/slope samples, three reconnecting detours, physical navigation, interaction-only discovery, once-only saved XP and unchanged story gates.`);
