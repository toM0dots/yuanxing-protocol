const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const Things=require('../dist/exo-things.js'),Tow=require('../dist/exo-tow.js'),Rules=require('../dist/exo-rules.js');
const target=(extra={})=>({id:'load',kind:'debris',x:0,y:0,radius:25,material:'metal',physics:'tow',mass:35,towable:true,hookRadius:13,state:{},...extra});
function fixture(extra={},more=[]){const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},things=Things.create({placements:[target(extra),...more],storage});things.flag('towUnlocked',true);const tow=Tow.create(things),unit={x:0,y:300,angle:0,context:'surface',altitude:0},ctx={unit,height:()=>0,blocked:()=>false,braced:false,stabilizer:true};return {things,tow,unit,ctx,storage,saved};}
function step(a,n=20){for(let i=0;i<n;i++)a.tow.step(.05,a.ctx);}
function shoot(a,d,id='load'){a.unit.x=0;a.unit.y=d;a.unit.altitude=0;const t=a.things.get(id);a.tow.launch(a.unit,{id:t.id,x:t.x,y:t.y,z:(t.z||0)+45,distance:Math.hypot(t.x,t.y-d),angle:0});step(a,30);}
function train(a){for(const d of [120,210,310,410])shoot(a,d);assert.equal(a.tow.summary().train,4);a.tow.calibrate();assert(a.tow.summary().proposed&&!a.tow.summary().installed);a.tow.calibrate();assert(a.tow.summary().installed);}
// The fit uses recorded misses, with held-out throws excluded from its IDs.
{
 const a=fixture();train(a);const model=JSON.stringify(a.tow.summary().model),trainIds=a.tow.summary().model.ids;
 for(const d of [165,275,355]){shoot(a,d);assert.equal(a.tow.state.mode,'attached');a.tow.detach();}
 const s=a.tow.summary();assert.equal(s.test,3);assert(s.after<s.before*.05);assert.equal(JSON.stringify(s.model),model);assert(s.rows.filter(r=>r.role==='test').every(r=>!trainIds.includes(r.id)));a.things.save();const restored=Things.create({placements:[target()],storage:a.storage});assert.deepEqual(Tow.create(restored).summary().model,s.model);console.log({calibrationBefore:s.before,heldOutAfter:s.after,train:s.train,test:s.test});
}
// W1: mass limit, spring motion, swept obstacle stop, and downhill tipping.
{
 const a=fixture();train(a);shoot(a,300);a.tow.begin(a.unit,0);step(a,150);assert(a.things.get('load').y>90);a.tow.detach();assert.equal(a.things.get('tow:cable').location,'stowed');
 const b=fixture({mass:90});train(b);shoot(b,300);b.tow.begin(b.unit,0);step(b,80);assert.equal(b.things.get('load').y,0,'mass 90 needs the stabilizer');b.ctx.braced=true;step(b,130);assert(b.things.get('load').y>50);
 const c=fixture();train(c);shoot(c,300);c.ctx.blocked=(old,next)=>next.y>70;c.tow.begin(c.unit,0);step(c,180);assert(c.things.get('load').y<=70);assert(c.things.get('load').y>50);
 const d=fixture();train(d);shoot(d,300);d.ctx.height=(x,y)=>-y;d.tow.begin(d.unit,0);step(d,80);assert(d.things.get('load').state.tilted);
}
// W2: pulling the cart onto a plate opens the linked door; lifting it cuts it.
{
 const a=fixture({kind:'cart',mass:90},[{id:'plate',kind:'plate',x:0,y:160,material:'metal',radius:45,threshold:80,state:{}},{id:'door',kind:'door',x:130,y:160,material:'metal',controls:['plate'],state:{}}]);train(a);shoot(a,300);a.ctx.braced=true;a.tow.begin(a.unit,0);const rules=Rules.create(a.things);for(let i=0;i<200&&a.things.get('load').y<145;i++){step(a,1);rules.tick(.05,{point:a.unit});}a.tow.detach();rules.tick(.1,{point:a.unit});assert(a.things.get('plate').state.pressed);assert(a.things.get('door').state.open);a.things.patch('load',{location:'hand'});rules.tick(.1,{point:a.unit});assert(!a.things.get('door').state.open);
}
// W3: toppling follows the pull direction. The callback stuns; HP is untouched.
{
 const a=fixture({kind:'pylon',mass:90,height:240});train(a);shoot(a,300);a.ctx.braced=true;const enemy={id:'enemy',x:0,y:100,hp:70};a.ctx.actors=[enemy];a.ctx.onStun=(actor,n)=>actor.stunned=n;a.tow.begin(a.unit,0);step(a,60);assert(a.things.get('load').state.fallen);assert(Math.abs(a.things.get('load').state.fallAngle-Math.PI/2)<1e-6);assert.equal(enemy.stunned,6);assert.equal(enemy.hp,70);
}
// W4: a fixed anchor moves the mech up to the ledge, never the anchor.
{
 const a=fixture({kind:'anchor',anchor:true,physics:'fixed',mass:1000});a.ctx.height=(x,y)=>y<80?180:0;train(a);shoot(a,300);a.tow.begin(a.unit,0);step(a,420);assert(a.unit.y<35);assert.equal(a.ctx.height(a.unit.x,a.unit.y),180);assert.equal(a.things.get('load').y,0);
}
// W5: wrap gives mechanical advantage and joins two metal power endpoints.
{
 const a=fixture({mass:200},[{id:'anchor',kind:'anchor',anchor:true,x:0,y:180,material:'metal',radius:20,socket:{capacity:1},state:{}},{id:'cell',kind:'battery',location:'socket:anchor',state:{charge:1}}]);train(a);shoot(a,270);assert(a.tow.wrap('anchor',a.unit));a.tow.begin(a.unit,0);for(let i=0;i<180&&a.things.get('load').y<65;i++)step(a,1);assert(a.things.get('load').y>40);const rules=Rules.create(a.things);rules.tick(.1,{point:a.unit});assert(a.things.get('load').state.powered);a.tow.detach();rules.refresh(a.unit);assert(!a.things.get('load').state.powered);
}
// A full browser store cannot stop the physical loop or erase an earlier save.
{
 const a=fixture({kind:'pylon',mass:90,height:240});train(a);shoot(a,300);const previous=a.saved.get('exo-things-v1'),write=a.storage.setItem;a.storage.setItem=()=>{throw Error('quota');};a.ctx.braced=true;a.tow.begin(a.unit,0);assert.doesNotThrow(()=>step(a,60));assert(a.things.get('load').state.fallen);assert.equal(a.things.save(),false);assert.equal(a.saved.get('exo-things-v1'),previous);a.storage.setItem=write;assert(a.things.save());assert(Things.create({placements:[target({kind:'pylon',mass:90,height:240})],storage:a.storage}).get('load').state.fallen);
}
// Dense registry and moving cable retain the per-frame systems budget.
{
 const a=fixture({},Array.from({length:298},(_,i)=>({id:'prop:'+i,kind:'crate',material:'wood',x:500+i,y:500,physics:'fixed',state:{}})));train(a);shoot(a,300);a.tow.begin(a.unit,0);const timings=[];for(let i=0;i<100;i++){const start=performance.now();step(a,1);timings.push(performance.now()-start);}timings.sort((x,y)=>x-y);assert(timings[95]<33);console.log({physicsP95:timings[95],physicsMax:timings.at(-1),objects:a.things.count});
}
console.log('PASS: held-out calibration and W1–W5: load limits, sliding, rocks, tipping, plates, nonlethal toppling, winching, conductive cable and restore.');
