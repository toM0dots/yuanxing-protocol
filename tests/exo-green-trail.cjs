const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope={console};vm.createContext(scope);
for(const file of ['assets/canyon-v2/canyon-nav.js','assets/canyon-v2/canyon-flight.js','exo-canyon-v2.js','exo-green-trail.js','exo-region-data.js','exo-region-art.js','exo-lore.js','exo-progress.js','exo-room-story-data.js','exo-facilities.js','exo-wreck-world.js','exo-region-landmark-data.js','exo-world-layout.js','exo-world.js','exo-motion.js','exo-sandbox.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),scope);
const run=source=>vm.runInContext(source,scope);
run(`var saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},options={storage,camps:ExoWorld.surfaceCamps},p=ExoProgress.create(options),C=ExoCanyonV2,T=ExoGreenTrail;`);

// Traverse the actual canyon collision, rocks, slopes and acceleration with the
// production movement code, without flight, boost, teleports or skill unlocks.
for(const dt of [1/60,1/30,.05]){
 const route=run(`(()=>{const u={...ExoMotion.create(),...C.spawn};let seconds=0;const reached=[];
  for(const r of T.records){const dest=C.world(...r.stand);let frames=0;
   while(Math.hypot(u.x-dest.x,u.y-dest.y)>9&&frames<2500){const dx=dest.x-u.x,dy=dest.y-u.y,d=Math.hypot(dx,dy);ExoMotion.step(u,{x:dx/d*Math.min(1,d/45),y:dy/d*Math.min(1,d/45)},${dt},false);frames++;}
   seconds+=frames*${dt};const local=C.local(u.x,u.y);reached.push({id:T.near(u)?.id,target:r.id,frames,clearance:C.clearance(local.x,local.y),ceiling:C.ceiling(local.x,local.y)});
  }return {reached,seconds};})()`);
 for(const stop of route.reached){assert.equal(stop.id,stop.target,'walkable approach must reach its intended lamp');assert(stop.frames<2500);assert(stop.clearance>=2,'mech body clears the wall');assert(stop.ceiling>8,'mech clears the cave roof');}
 console.log(`PASS: grounded traversal at ${Math.round(1/dt)} simulation Hz, ${route.seconds.toFixed(1)} seconds driving, three reachable lamps.`);
}

assert.equal(run('p.scanTrail({...ExoMotion.create(),...C.spawn})'),null,'cannot recover a record from spawn');
assert.equal(run('p.state.xp'),0);
for(const i of [2,0,1]){
 run(`var r=T.records[${i}],u={...ExoMotion.create(),...C.world(...r.stand)};`);
 assert.equal(run('p.scanTrail({...u,flight:{mode:"hover"}})'),null,'must land to scan');
 assert.equal(run('p.scanTrail(u,false)'),null,'courses and trials cannot award memories');
 assert.equal(run('p.scanTrail(u)'),run('r.id'),'records can be recovered out of order');
 const xp=run('p.state.xp');run('p.scanTrail(u)');assert.equal(run('p.state.xp'),xp,'repeat scanning cannot farm XP');
 const html=run('p.recordHTML(r.id)');assert(html.includes(run('ExoRegionData[8].views.find(v=>v.view===r.view).src')));assert.equal((html.match(/src="[^"]+(?<!-thumb)\.webp"/g)||[]).length,1,'only one full image per open record');
}
assert.equal(run('p.state.xp'),140,'3 x 35 XP plus a one-time completion award');
run('p.observe({unit:C.spawn,battle:{}})');assert.equal(run('p.state.rank'),2,'region discovery and the trail earn the first upgrade');assert.equal(run('p.state.points'),1);
assert.equal(run('p.finish("signal")'),false,'the optional trail does not bypass campaign gates');
run('var restored=ExoProgress.create(options)');assert.equal(run('restored.state.xp'),180);assert.equal(run('restored.trailEarned.length'),3);assert.equal(run('restored.toast(0)'),null);
run('ExoWorld.setCave("basalt")');assert.equal(run('T.near(u)'),null,'underground coordinate reuse cannot trigger a surface memory');run('ExoWorld.setCave(null)');

// The current smooth terrain no longer has the old wall beside these legacy
// sockets. Supply an occluded sightline to test the actual scan filter.
run('var realBlocked=C.blocked;C.blocked=(a,b)=>b.id===T.records[0].id;');
assert.notEqual(run('T.near({...ExoMotion.create(),...C.world(...T.records[0].stand)})?.id'),run('T.records[0].id'),'occluded lamp cannot be read');
run('C.blocked=realBlocked');
assert.equal(run('T.progress(restored.trailEarned).next'),null);
console.log('PASS: proximity and wall checks, flight/trial guards, out-of-order discovery, XP deduplication, first upgrade, campaign gate, single-image loading and save restoration.');

// The story corridor must not aggro the relocated patrols during a slow walk.
const quiet=run(`(()=>{const b=ExoSandbox.create(),u={...ExoMotion.create(),...C.spawn};let attacked=false;for(const r of T.records){const dest=C.world(...r.stand);for(let f=0;f<1800;f++){const dx=dest.x-u.x,dy=dest.y-u.y,d=Math.hypot(dx,dy);ExoMotion.step(u,d>9?{x:dx/d*Math.min(1,d/45),y:dy/d*Math.min(1,d/45)}:{x:0,y:0},1/30);ExoSandbox.tick(b,u,1/30,ExoWorld.rocks(u.x,u.y));if(b.hp<100||b.enemies.some(e=>e.action))attacked=true;}}return {attacked,population:b.enemies.length};})()`);
assert.equal(quiet.attacked,false,'quiet opening route must allow players to learn scanning');assert.equal(quiet.population,58,'preserve all existing enemies');
console.log('PASS: three-minute patrol simulation keeps the opening route quiet, all 58 surface enemies retained.');
