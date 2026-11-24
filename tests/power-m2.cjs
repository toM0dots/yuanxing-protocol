const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const Things=require('../dist/exo-things.js'),Carry=require('../dist/exo-carry.js'),Power=require('../dist/exo-power.js'),Data=require('../dist/exo-depot-data.js');
const metal=(id,x,y,kind='terminal',extra={})=>({id,x,y,kind,material:'metal',radius:20,state:{rewired:true,powered:false},...extra});
const battery=(id,location,x=0,y=0)=>metal(id,x,y,'battery',{location,physics:'carry',mass:8,radius:13,state:{charge:1}});
function setup(rows){const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},things=Things.create({placements:rows,storage}),power=Power.create(things),carry=Carry.create(things);power.refresh({x:0,y:0});return {data,storage,things,power,carry};}
const socket=metal('lamp',0,0,'lamp',{socket:{capacity:1}});
// P1: the source drains only while simulated, and the ID survives a restore.
{
 const a=setup([socket,battery('a','socket:lamp')]);a.power.tick(10,{point:{x:0,y:0}});assert(a.things.get('lamp').state.lit);assert(a.things.get('a').state.charge<1);const charge=a.things.get('a').state.charge;a.power.tick(10,{point:{x:3000,y:0}});assert.equal(a.things.get('a').state.charge,charge);a.things.save();const restored=Things.create({placements:[socket,battery('a','socket:lamp')],storage:a.storage});assert.equal(restored.get('a').state.charge,charge);assert.deepEqual([...a.data.keys()],['exo-things-v1']);
}
// P2: a moved metal object, or a cable, joins otherwise disconnected nodes.
for(const cable of [false,true]){
 const rows=[socket,battery('a','socket:lamp'),metal('door',140,0,'door')];rows.push(cable?metal('link',70,0,'cable',{ends:['lamp','door']}):metal('crate',70,200,'crate',{radius:51,physics:'carry',mass:30}));const a=setup(rows);if(!cable){assert.equal(a.things.get('door').state.open,false);a.things.transaction(()=>a.things.patch('crate',{y:0}));a.power.tick(.1,{point:{x:0,y:0}});}assert.equal(a.things.get('door').state.open,true);a.carry.take('a');assert.equal(a.things.get('door').state.open,false,'P4 cuts through a moved crate or cable immediately');
}
// P3: a 120-unit body of water feeds a pump, stuns creatures for six seconds,
// chips one armour point, and cannot conduct across a dry separation.
{
 const a=setup([battery('a','world',10,0),metal('water',0,0,'water',{material:'water',radius:120}),metal('pump',90,0,'pump'),metal('far',220,0,'pump'),metal('seam',40,10,'creature',{material:'organic',species:'seam',state:{stunned:0}})]),hits=[];
 a.power.tick(.1,{point:{x:0,y:0},actors:[{id:'u',player:true,x:0,y:20},{id:'air',player:true,x:0,y:0,airborne:true}],onShock:(a,n)=>hits.push([a.id,n])});assert(a.things.get('pump').state.powered);assert.equal(a.things.get('far').state.powered,false);assert.equal(a.things.get('seam').state.stunned,6);assert.deepEqual(hits,[['u',1]]);a.carry.take('a');assert.equal(a.things.get('pump').state.powered,false);
}
// P4: removal has no one-tick delay, including depletion at exactly zero.
{
 const a=setup([socket,battery('a','socket:lamp')]);assert(a.things.get('lamp').state.powered);a.carry.take('a');assert.equal(a.things.get('lamp').state.powered,false);a.carry.insert('lamp');a.things.transaction(()=>a.things.patch('a',{state:{charge:1e-6}}));a.power.tick(.1,{point:{x:0,y:0}});assert.equal(a.things.get('a').state.charge,0);assert.equal(a.things.get('lamp').state.lit,false);
}
// P5: overload consumes no IDs. Rewiring requires an empty, isolated socket.
{
 const a=setup([socket,battery('a','socket:lamp'),battery('b','rack')]),events=[];a.things.subscribe(e=>events.push(e));assert(a.carry.insert('lamp',{overload:true}).overloaded);assert(a.things.get('lamp').state.broken);assert.equal(a.things.get('lamp').state.powered,false);assert(!a.power.rewire('lamp').ok);a.carry.remove('lamp');a.carry.remove('lamp');assert(a.power.rewire('lamp').ok);a.carry.insert('lamp');assert(a.things.get('lamp').state.powered);assert.equal(a.things.all().filter(t=>t.kind==='battery').length,2);assert(events.some(e=>e.type==='signal'&&e.kind==='overload'));
}
// P6: a spare cell is preferred to the powered lamp; feeding never attacks.
{
 const a=setup([socket,battery('a','socket:lamp'),battery('lure','world',180,0),metal('seam',25,0,'creature',{species:'seam',material:'organic',physics:'push',state:{stunned:0}})]);
 for(let i=0;i<90;i++)a.power.tick(.1,{point:{x:0,y:0}});assert.equal(a.things.get('seam').state.target,'lure');assert(a.things.get('lure').state.charge<1);assert(a.things.get('a').state.charge>.99);assert.equal(a.things.get('seam').state.stunned,0);
}
// The hand slot has its own capacity, placement validation and persistence.
{
 const a=setup([metal('crate',0,0,'crate',{physics:'carry',mass:32,radius:45}),metal('filter',0,50,'filter',{physics:'carry',mass:18})]);assert(a.carry.lift('crate').ok);assert(!a.carry.lift('filter').ok);assert(!a.carry.lower({x:0,y:0},{canPlace:()=>false}).ok);assert.equal(a.carry.hand().id,'crate');assert(a.carry.lower({x:30,y:200,angle:0}).ok);assert.equal(a.things.get('crate').y,85);a.things.save();assert.equal(Things.create({placements:[metal('crate',0,0,'crate',{physics:'carry',mass:32,radius:45})],storage:a.storage}).get('crate').y,85);
}
// Authored depot uses the same generic graph. Before EP09 nothing is live.
{
 const a=setup(Data.placements());a.power.refresh({x:6000,y:7000});assert(!a.things.get('depot:seam-lamp').state.powered);a.things.flag('depotOpen',true);a.power.refresh({x:6000,y:7000});assert(a.things.get('depot:seam-lamp').state.powered);a.things.transaction(()=>a.things.patch('depot:feed-cell',{location:'socket:depot:feed'}));a.things.transaction(()=>a.things.patch('depot:bridge-crate',{x:6190,y:7180}));a.power.tick(.1,{point:{x:6190,y:7180}});assert(a.things.get('depot:door').state.open);
}
// Dense worst-case 300 active objects, not just the small authored fixtures.
const stress=setup(Array.from({length:300},(_,i)=>i===0?battery('b','world'):metal('n'+i,(i%20)*12,Math.floor(i/20)*12)));
const durations=[];for(let i=0;i<40;i++){const start=performance.now();stress.power.tick(.1,{point:{x:100,y:100}});durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);assert(durations[Math.floor(durations.length*.95)]<33,'P95 systems tick must stay below 33 ms');
console.log(JSON.stringify({status:'PASS P1–P6, hand slot, depot gating, source removal/depletion, persistence',active:stress.things.active.length,p95:durations[38],max:durations.at(-1)},null,2));
