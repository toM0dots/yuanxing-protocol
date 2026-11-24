const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
const oldLamps=JSON.stringify({cells:10,caches:['cache:crash-kit','cache:belongings','cache:lookout','cache:cargo'],fixed:[],drawn:{'trail:k09:1':2,'trail:k09:2':2,'trail:k09:3':2}});
const h=harness(new Map([['exo-lamps-v1',oldLamps],['exo-opening-v1','{"stage":"done"}'],['exo-campaign-v1',JSON.stringify({version:1,started:true,done:['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'],checkpoint:{x:1950,y:9880,angle:-.48}})]]));
const {run,qa}=h;run('Exo.startCampaign()');h.settle();
assert.equal(run('ExoSystems.carry.count'),4);assert.equal(run('ExoSystems.things.getFlag("legacyOverflow")'),6);assert.equal(h.saved.get('exo-lamps-v1'),oldLamps);
assert.match(h.nodes.get('app').innerHTML,/exo-cells-n/);assert.match(h.nodes.get('app').innerHTML,/id="exo-cells-max">\/4/);
const press=key=>h.events.keydown({key,repeat:false,preventDefault(){}});
press('z');h.frame();assert.equal(run('ExoSystems.carry.count'),3);assert.equal(run('Exo.interaction().kind'),'thing');
const dropped=run('Exo.interaction().id');press('e');h.frame();assert.equal(run('ExoSystems.carry.count'),4);assert.equal(run(`ExoSystems.things.get('${dropped}').location`),'rack');
press('z');h.frame();const data=run('ExoSystems.things.get("'+dropped+'")');assert.equal(data.location,'world');
const restored=harness(h.saved);assert.equal(restored.run(`ExoSystems.things.get('${dropped}').x`),data.x);assert.equal(restored.run(`ExoSystems.things.get('${dropped}').y`),data.y);assert.equal(restored.run('ExoSystems.carry.count'),3);
// Remote relay calls do nothing. Nearby controls transfer an ID both ways.
run('Exo.relayPower("battery")');assert.equal(run('ExoSystems.carry.count'),3);
Object.assign(qa.unit,{x:5200,y:12300,vx:0,vy:0,flight:null});run('Exo.interact();Exo.relayPower("battery")');
assert.equal(run('ExoSystems.carry.count'),2);assert.equal(run('ExoFieldStory.state.relayBattery'),true);const cell=run('ExoSystems.carry.contents(ExoThingData.relayId)[0].id');
run('Exo.relayPower("take")');assert.equal(run('ExoSystems.carry.count'),3);assert.equal(run('ExoFieldStory.state.relayPower'),false);assert.equal(run(`ExoSystems.things.get('${cell}').location`),'rack');
run('Exo.relayPower("take")');assert.equal(run('ExoSystems.carry.count'),3,'taking twice cannot duplicate');
assert.equal(h.saved.get('exo-lamps-v1'),oldLamps,'transfers never rewrite the legacy battery counter');
// Every overflow position is outside solid structure geometry and reachable.
for(const t of run('ExoSystems.things.all().filter(t=>t.kind==="battery"&&t.location==="world"&&t.x>4000)'))assert(!run(`ExoWorld.solidStructure(${t.x},${t.y},ExoWorld.elevation(${t.x},${t.y})+20,16)`),'overflow outside K–09 walls');
const fullStorage=new Map([['exo-lamps-v1','{"cells":9}']]),store=fullStorage.set;
fullStorage.set=function(k,v){if(k==='exo-things-v1')throw Error('quota');return store.call(this,k,v);};
const readOnly=harness(fullStorage);assert.equal(readOnly.run('ExoSystems.available'),false);assert.equal(readOnly.run('ExoLampRepair.summary().cells'),9);assert.equal(fullStorage.get('exo-lamps-v1'),'{"cells":9}');assert(!fullStorage.has('exo-things-v1'),'failed migration does not create a partial save');
const corrupt=new Map([['exo-things-v1','{broken'],['exo-lamps-v1','{"cells":5}']]);const safe=harness(corrupt);assert.equal(safe.run('ExoSystems.available'),false);assert.equal(corrupt.get('exo-things-v1'),'{broken','do not overwrite a damaged save');
console.log('PASS: real Z/E input, HUD capacity, physical relay in/out, remote rejection, overflow placement, reload and legacy isolation.');
