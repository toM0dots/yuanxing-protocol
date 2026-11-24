const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
const h=harness(new Map([['exo-opening-v1','{"stage":"done"}'],['exo-campaign-v1',JSON.stringify({version:1,started:true,done:['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'],checkpoint:{x:5960,y:7370,angle:0}})]]));
const {run,qa}=h,pose=(x,y,angle=0)=>{Object.assign(qa.unit,{x,y,angle,vx:0,vy:0,altitude:0});qa.camera.yaw=-angle;run('Exo3D.resetOrbit(Exo.__qa.camera)');h.frame();},press=(key,n)=>{h.events.keydown({key,repeat:false,preventDefault(){}});h.settle(n);h.events.keyup({key});},get=id=>run(`ExoSystems.things.get('depot:${id}')`);
run('Exo.startCampaign()');h.settle();pose(5960,7370);assert.equal(run('Exo.interaction().id'),'depot:reel');press('e',2);assert(run('ExoSystems.tow.enabled'));assert(h.nodes.has('hud-tow'));
for(const y of [6730,6860,6730,6860]){pose(5770,y);press('x',16);h.settle(25);assert.equal(run('ExoSystems.tow.state.mode'),'idle');}
assert.equal(run('ExoSystems.tow.summary().train'),4);run('Exo.towCalibrate();Exo.towCalibrate()');assert(run('ExoSystems.tow.summary().installed'));
// A held-out throw hits the pylon, then bracing permits a nonlethal toppling.
pose(5770,6790);press('x',16);h.settle(25);assert.equal(run('ExoSystems.tow.state.targetId'),'depot:pylon');assert(run('ExoSystems.tow.summary().after')<1);run('Exo.towBrace()');press('x',80);h.settle(12);assert(get('pylon').state.fallen);run('Exo.towBrace()');pose(5770,6730);h.driveTo({x:5770,y:6440});run('Exo.towBrace()');
// Setup 5: the same physical cable moves debris out of the doorway.
pose(6280,6670);press('x',16);h.settle(25);assert.equal(run('ExoSystems.tow.state.targetId'),'depot:debris');press('x',150);assert(get('debris').y>6580);press('x',1);
// Setup 7: a heavy cart stays on the plate after the cable is detached.
pose(6080,6290,Math.PI);press('x',16);h.settle(25);assert.equal(run('ExoSystems.tow.state.targetId'),'depot:cart');press('x',440);assert(get('plate').state.pressed);press('x',1);h.settle(5);assert(get('plate-door').state.open);
// Setup 8: winch from the ground to the raised terrain.
pose(6510,6640);press('x',16);h.settle(25);assert.equal(run('ExoSystems.tow.state.targetId'),'depot:winch-anchor');press('x',400);assert(qa.unit.y<6470);assert(run('ExoWorld.elevation(Exo.__qa.unit.x,Exo.__qa.unit.y)')>100);
// Phone handlers share aiming/release and cancel without a stuck reel.
pose(6280,6750);const button=h.nodes.get('hud-tow');button.onpointerdown({pointerId:17,clientX:100,preventDefault(){}});h.settle(8);assert.equal(run('ExoSystems.tow.state.mode'),'aiming');button.onpointermove({clientX:105});h.settle(3);assert.notEqual(qa.camera.yaw,0);button.onpointercancel();assert.equal(run('ExoSystems.tow.state.mode'),'idle');
const copy=harness(h.saved);assert(copy.run('ExoSystems.tow.summary().installed'));assert(copy.run('ExoSystems.things.get("depot:pylon").state.fallen'));assert.equal(copy.run('ExoSystems.things.get("tow:cable").location'),'stowed');
console.log('PASS: production X / E / brace controls, earned reel, fit/install, held-out throws, setups 5–8, phone aim/cancel and persisted outcomes.');
