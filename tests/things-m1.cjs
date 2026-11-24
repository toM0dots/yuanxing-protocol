const assert=require('node:assert/strict');
const Things=require('../dist/exo-things.js'),Carry=require('../dist/exo-carry.js'),Data=require('../dist/exo-things-data.js');
const lamps=[{id:'cache:a',name:'箱',kind:'cache',x:100,y:100},{id:'lamp:a',name:'灯',kind:'spare',x:150,y:100},{id:'lamp:b',name:'断灯',kind:'broken',x:200,y:100}];
const placements=Data.batteries({lamps});
function create(saved=new Map(),extra=[]){const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};const things=Things.create({placements:[...placements,...extra],storage}),carry=Carry.create(things,{home:Data.home});return {things,carry,saved,storage};}
// Each legacy count becomes that many distinct objects, never clamped to four.
for(const cells of [0,1,4,5,10,21]){
 const legacy=JSON.stringify({cells,fixed:['lamp:b'],caches:['cache:a'],drawn:{'lamp:a':1}}),relay=JSON.stringify({relayBattery:true});
 const h=create(new Map([['exo-lamps-v1',legacy],['exo-field-story-v1',relay],['academy-progress-v1','untouched']]));
 h.carry.migrate({lamp:JSON.parse(legacy),relay:true});
 assert.equal(h.carry.count,Math.min(cells,4));assert.equal(h.carry.contents('lamp:b').length,1);assert.equal(h.carry.contents(Data.relayId).length,1);
 const left=h.things.all().filter(t=>t.kind==='battery'&&t.location==='world');assert.equal(left.length,Math.max(0,cells-4));
 assert.equal(new Set(h.things.all().map(t=>t.id)).size,h.things.count);
 assert.equal(h.saved.get('exo-lamps-v1'),legacy);assert.equal(h.saved.get('exo-field-story-v1'),relay);assert.equal(h.saved.get('academy-progress-v1'),'untouched');
 const before=JSON.stringify(h.things.snapshot());const again=create(h.saved);assert.equal(again.carry.migrate({lamp:{cells:99}}),false);assert.equal(JSON.stringify(again.things.snapshot()),before);
 assert.equal(again.carry.count,Math.min(cells,4));assert.equal(again.things.getFlag('legacyOverflow'),Math.max(0,cells-4));
}
const h=create();h.carry.migrate();const events=[];h.things.subscribe(e=>events.push(e));
assert(h.carry.cache('cache:a').ok);const id=h.carry.rack()[0].id;assert(!h.carry.cache('cache:a').ok,'cache cannot duplicate');
assert(h.carry.drop({x:300,y:300,angle:0}).ok);assert.equal(h.things.get(id).location,'world');assert.equal(h.carry.count,0);
assert.equal(h.carry.nearest({x:300,y:300}).id,id);assert.equal(h.carry.nearest({x:300,y:300,context:'cave:x'}),null);
assert(h.carry.toggle({x:300,y:300,angle:0}).ok);assert.equal(h.carry.rack()[0].id,id);
assert(h.carry.insert('lamp:b').ok);assert.equal(h.things.get(id).location,'socket:lamp:b');assert(h.carry.remove('lamp:b').ok);assert.equal(h.carry.rack()[0].id,id);
assert(!h.carry.drop({x:300,y:300},{canPlace:()=>false}).ok);assert.equal(h.carry.count,1);
for(let i=0;i<3;i++){h.things.add(Data.battery('extra:'+i,'world',300,300));assert(h.carry.take('extra:'+i).ok);}
h.things.add(Data.battery('full-refusal','world',300,300));assert(!h.carry.take('full-refusal').ok);assert.equal(h.things.get('full-refusal').location,'world');assert.equal(h.carry.count,4);
assert(events.some(e=>e.reason==='battery-dropped')&&events.some(e=>e.reason==='battery-inserted'));
assert(!Object.hasOwn(h.things.snapshot().changes['lamp:a']||{},'name'),'authored fields are not repeated in saves');
const restored=create(h.saved);assert.equal(restored.carry.count,4);assert.equal(restored.things.get(id).id,id);
// A failed durable write rolls back transfers, including the free rack slot.
const before=JSON.stringify(h.things.snapshot());h.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>h.carry.drop({x:300,y:300}),/保存/);assert.equal(JSON.stringify(h.things.snapshot()),before);
// Spatial activation is capped and context-aware even with a large registry.
const stress=create(new Map(),Array.from({length:5000},(_,i)=>({id:'stress:'+i,kind:'crate',x:100+(i%100)*10,y:100+Math.floor(i/100)*10})));
const start=performance.now();for(let i=0;i<100;i++)stress.things.wake({x:100,y:100});const ms=(performance.now()-start)/100;
assert(stress.things.active.length<=300);assert(stress.things.active.every(t=>Math.hypot(t.x-100,t.y-100)<=600));assert(stress.things.sleeping.length+stress.things.active.length<=300);
console.log({status:'PASS: physical identity, 4-slot limit, cache/socket/world transfers, context, rollback, delta saves, migration without loss or legacy writes, activation cap',activationMs:+ms.toFixed(3)});
