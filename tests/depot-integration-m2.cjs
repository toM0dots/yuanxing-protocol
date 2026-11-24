const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
const done=['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'];
function make(complete=true){const h=harness(new Map([['exo-opening-v1','{"stage":"done"}'],['exo-lamps-v1','{"cells":4}'],['exo-campaign-v1',JSON.stringify({version:1,started:true,done:complete?done:[],checkpoint:{x:5980,y:7460,angle:0}})]]));h.run('Exo.startCampaign()');h.settle();return h;}
const h=make(),{qa,run}=h,pose=(x,y)=>{Object.assign(qa.unit,{x,y,angle:0,vx:0,vy:0});h.frame();},get=id=>run(`ExoSystems.things.get('depot:${id}')`),act=(id,held=false)=>run(`ExoSystems.act('depot:${id}',Exo.__qa.unit,ExoWorld,{held:${held}})`);
assert(run('ExoSystems.things.getFlag("depotOpen")'));
// Setup 1 and input hold: same handlers as keyboard/touch.
pose(5880,7230);act('lamp');assert(get('lamp').state.powered);act('lamp');assert(!get('lamp').state.powered);
// Setup 2: carry, place and conduct; the doorway opens because of contact.
pose(6120,7245);act('feed');pose(6190,7380);act('bridge-crate');assert.equal(run('ExoSystems.carry.hand().id'),'depot:bridge-crate');pose(6190,7295);h.events.keydown({key:'z',repeat:false,preventDefault(){}});h.frame();assert(get('door').state.open);pose(6120,7245);act('feed');assert(!get('door').state.open);
// Setup 3: Z places an actual charged battery into the authored puddle.
pose(6480,7200);h.events.keydown({key:'z',repeat:false,preventDefault(){}});h.settle(3);assert(get('pump').state.powered);assert(qa.combat.hp<100);h.events.keydown({key:'e',repeat:false,preventDefault(){}});h.settle(3);assert(!get('pump').state.powered);
// Setup 4 starts feeding the lamp. A fresh battery changes the target.
pose(5740,6900);h.settle(4);assert.equal(get('seam').state.target,'depot:seam-lamp');pose(5590,6890);h.events.keydown({key:'z',repeat:false,preventDefault(){}});h.settle(4);assert.notEqual(get('seam').state.target,'depot:seam-lamp');assert.equal(get('seam').kind,'creature');
// Setup 11: pre-laid cable powers the far side, and taking the source cuts it.
pose(6080,6750);act('cable-feed');assert(get('cable-door').state.open);act('cable-feed');assert(!get('cable-door').state.open);
// Setup 12: hold E overloads, short E retrieves, hold E rewires.
pose(6470,6750);assert.equal(run('Exo.interaction().id'),'depot:single');h.events.keydown({key:'e',repeat:false,preventDefault(){}});h.settle(15);h.events.keyup({key:'e'});assert(get('single').state.broken);act('single');act('single');assert.equal(run('ExoSystems.carry.contents("depot:single").length'),0);act('single',true);assert(!get('single').state.broken);act('single');assert(get('single').state.powered);
const copy=harness(h.saved);assert.equal(copy.run('ExoSystems.things.get("depot:bridge-crate").y'),7180);assert.equal(copy.run('ExoSystems.carry.contents("depot:single").length'),1);
const locked=make(false);Object.assign(locked.qa.unit,{x:5880,y:7245,angle:0});assert(!locked.run('ExoSystems.things.getFlag("depotOpen")'));assert.equal(locked.run('ExoSystems.act("depot:lamp",Exo.__qa.unit,ExoWorld)'),false);locked.run('Exo.visitFacility("camp-8-0")');assert.equal(locked.run('ExoWorld.interior'),null);
console.log('PASS: depot setups 1–4 / 11–12 with production input, EP09 gate, electric armour chip, instant cut-off and save restore.');
