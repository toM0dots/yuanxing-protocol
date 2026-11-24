const assert=require('node:assert/strict'),fs=require('node:fs'),harness=require('./expedition-harness.cjs');
const h=harness(new Map([['academy-progress-v1','{"30":{"complete":true}}'],['academy-projects-v1','[{"name":"untouched"}]']])),{run,qa}=h;
const legacyBefore=h.saved.get('academy-progress-v1');
const fullCells=require('node:vm').runInNewContext(fs.readFileSync('dist/exo-lamp-repair.js','utf8')+'\nExoLampRepair.summary().cells',{localStorage:{getItem:()=>JSON.stringify({cells:10})}});
assert.equal(fullCells,10,'all four caches and six lamp cells survive reload');
assert.equal(run('ExoGuidance.clear({x:0,y:0},{x:1,y:1},{elevation:()=>0,structuresBlocked:()=>true})'),false,'walls block lamp actions as well as prompts');
assert.match(h.nodes.get('app').innerHTML,/开始冒险/);
assert.equal(run('typeof Engine'),'undefined');assert.equal(run('typeof home'),'undefined');
run('Exo.resume()');h.escapeOpening();h.settle();
assert(run('ExoWorld.navigation(Exo.__qa.unit).target.story'),'new game guides automatically');
const routeIndex=qa.campaign.state.routeIndex;
run('Exo.travel();closeModal();Exo.intro();Exo.resume()');
assert.equal(qa.campaign.state.routeIndex,routeIndex);assert.equal(h.nodes.get('modal').open,false,'resume does not reopen the chapter list');
assert(run('ExoWorld.navigation(Exo.__qa.unit)'));
run('Exo.cancelNavigation()');qa.observe();assert.equal(run('ExoWorld.navigation(Exo.__qa.unit)'),null,'cancel remains cancelled');
run('Exo.trackCampaign()');assert(run('ExoWorld.navigation(Exo.__qa.unit)'),'recall restores the main route');
// Road checkpoints detect a fast pass between polls, but not a teleport or flight.
const C=run('ExoCampaign'),saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
for(const mode of ['ground','flight','teleport']){
 const c=C.create({storage:{getItem(){return null},setItem(){}},points:{route:[{x:500,y:500,radius:60}]}});c.start();c.award('crash-read');
 c.observe({unit:{x:mode==='teleport'?0:400,y:500,flight:mode==='flight'}});c.observe({unit:{x:600,y:500,flight:mode==='flight'}});
 assert.equal(c.objective().id,mode==='ground'?'lamps':'route',mode+' crossing');
}
// Every physical lamp family shares the same prompt/action radius, including
// an already repaired lamp and the ordinary road beacons.
const cache=run('ExoLampRepair.caches.find(p=>p.id==="cache:crash-kit")');
Object.assign(qa.unit,cache,{flight:null});qa.observe();
assert.equal(run('Exo.interaction().id'),cache.id);run('Exo.interact()');
assert.match(h.nodes.get('modal').innerHTML,/取出应急电池/);assert.equal(run('ExoLampRepair.summary().cells'),0,'inspection is not consumption');
run(`Exo.lampAction('${cache.id}','take')`);assert.equal(run('ExoLampRepair.summary().cells'),1);
run(`Exo.lampAction('${cache.id}','take')`);assert.equal(run('ExoLampRepair.summary().cells'),1,'cache cannot duplicate cells');
run('closeModal()');
const broken=run('ExoLampRepair.broken[0]');Object.assign(qa.unit,broken);qa.observe();
run('Exo.interact()');assert.match(h.nodes.get('modal').innerHTML,/打开接线盒 · 使用 1 块电池/);
// Stub only the SVG connector UI here; assert the real shell waits for its
// completion callback. The actual wiring UI is exercised in browser QA.
run('globalThis.wiringOptions=null;ExoLampWiring.start=o=>{globalThis.wiringOptions=o;}');
run(`Exo.lampAction('${broken.id}','repair')`);assert.equal(run('ExoLampRepair.level(ExoLampRepair.broken[0])'),0);assert.equal(run('ExoLampRepair.summary().cells'),1);
run('wiringOptions.onCancel()');assert.equal(run('ExoLampRepair.summary().cells'),1,'cancel preserves cell');
run(`Exo.lampAction('${broken.id}','repair');wiringOptions.onDone()`);assert.equal(run('ExoLampRepair.level(ExoLampRepair.broken[0])'),1);assert.equal(run('ExoLampRepair.summary().cells'),0);
assert.equal(run('Exo.interaction().id'),broken.id,'repaired lamp is still inspectable');
run('Exo.interact();closeModal()');
// Reading a story lamp records it once; batteries need deliberate actions.
const memory=run('ExoGreenTrail.records[0]');Object.assign(qa.unit,memory);qa.observe();run('Exo.interact()');
assert(qa.journey.trailEarned.includes(memory.id));const xp=qa.journey.state.xp;
assert.equal(run('ExoLampRepair.summary().cells'),0);run('closeModal();Exo.interact()');assert.equal(qa.journey.state.xp,xp);
run(`Exo.lampAction('${memory.id}','take')`);assert.equal(run('ExoLampRepair.summary().cells'),1);
run(`Exo.lampAction('${memory.id}','take')`);assert.equal(run('ExoLampRepair.summary().cells'),1,'last battery requires explicit confirmation');
run(`Exo.lampAction('${memory.id}','take')`);assert.equal(run('ExoLampRepair.summary().cells'),2);
run(`Exo.lampAction('${memory.id}','return')`);assert.equal(run('ExoLampRepair.summary().cells'),1);
const before=run('JSON.stringify(ExoLampRepair.state)');Object.assign(qa.unit,{x:1950,y:9880});run(`Exo.lampAction('${memory.id}','take')`);assert.equal(run('JSON.stringify(ExoLampRepair.state)'),before,'remote actions cannot mutate lamps');
run('closeModal();Exo.intro()');
const restored=harness(h.saved);assert.equal(restored.run('ExoLampRepair.state.fixed.includes("'+broken.id+'")'),true);assert.equal(restored.run('ExoLampRepair.state.drawn["'+memory.id+'"]'),1);
assert.equal(h.saved.get('academy-progress-v1'),legacyBefore);assert.equal(h.saved.get('academy-projects-v1'),'[{"name":"untouched"}]');
const html=fs.readFileSync('dist/index.html','utf8');for(const stem of ['curriculum','lesson-copy','applications','engines','app','journey','diversity','tiny-cnn','field-missions','vision-missions','vision-posters','cinematic'])assert(!new RegExp('src="'+stem+'\\.js').test(html),'standalone entry excludes '+stem);
for(const m of html.matchAll(/(?:src|href)="([^"?]+)(?:\?[^\"]*)?"/g))if(!m[1].startsWith('http'))assert(fs.existsSync('dist/'+m[1]),'entry asset exists: '+m[1]);
console.log('PASS: game-only boot, Academy save isolation, automatic/restored navigation, swept grounded checkpoints, shared lamp reach, explicit battery choices, repair completion/cancel, persistent lamps, remote-action rejection and entry assets.');
