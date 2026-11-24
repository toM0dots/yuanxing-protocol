const assert=require('node:assert/strict'),Opening=require('../dist/exo-opening.js'),harness=require('./expedition-harness.cjs');
let now=0;const taps=[],saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},unit={x:0,y:0};
const options={storage,clock:()=>now,onKnock:remote=>taps.push(remote)};
let o=Opening.create(options);o.start(unit);assert.equal(o.act(),'power');
const tick=(ms,ready=true)=>{now+=ms;return o.update(unit,ready);};
tick(550);assert.deepEqual(taps,[true]);tick(380);assert.deepEqual(taps,[true,true]);assert.equal(o.act(),null);tick(570);assert.equal(o.stage,'knock');
assert.equal(o.act(),'knock');assert.equal(o.act(),null,'one press cannot count twice');
o=Opening.create(options);o.start(unit);assert.equal(o.stage,'knock','the first answer survives reload');tick(230);assert.equal(o.act(),'knock');assert.equal(o.stage,'reply');assert.equal(o.act(),null,'wait for the reply');
tick(550,false);tick(380,false);tick(570,false);assert.equal(o.stage,'release');assert.equal(o.act(),null,'a reply cannot bypass map readiness');tick(1);assert.equal(o.act(),'release');assert(!o.update({x:260,y:0,flight:true},true));assert(o.update({x:260,y:0},true));assert.deepEqual(taps,[true,true,false,false,true,true]);
const before=saved.get('exo-opening-v1');o.start(unit,true);o.act();tick(550);tick(380);tick(570);o.act();tick(230);o.act();tick(550);tick(380);tick(570);o.act();o.update({x:260,y:0},true);assert.equal(saved.get('exo-opening-v1'),before,'replay does not overwrite the real opening');
for(const stage of ['release','escape','done']){const old=Opening.create({storage:{getItem:()=>JSON.stringify({stage}),setItem(){}},clock:()=>now});old.start(unit);assert.equal(old.stage,stage,'existing saves remain valid');}
// Real elapsed time, including paused frames, expires captions at low FPS.
const h=harness(),{run,qa}=h;run('Exo.resume();ExoAmbience.knock=()=>{throw new Error("audio unavailable")}');h.escapeOpening();run("ExoFieldStory.clear();ExoFieldStory.cue('AEGIS','测试短波。')");h.frame();assert(run('ExoFieldStory.speaking'));run('Exo.graphics()');h.frame(7000);assert(!run('ExoFieldStory.speaking'),'paused or slow frames cannot freeze captions');
run("closeModal();ExoFieldStory.cue('AEGIS','备用电源接通。');ExoFieldStory.clear()");h.frame();assert(!run('ExoFieldStory.speaking'),'phase changes clear queued opening speech');
run('Exo.trackCampaign()');h.settle(60);assert(h.nodes.get('hud-story-recall').hidden,'route recall stays hidden on route');run('Exo.cancelNavigation()');h.settle(60);assert(!h.nodes.get('hud-story-recall').hidden,'lost players can recall the route');
const cache=run('ExoLampRepair.caches[0]');Object.assign(qa.unit,cache);run(`Exo.inspectLamp('${cache.id}')`);assert(!/接下来|继续沿主路走|exo-lamp-next/.test(h.nodes.get('modal').innerHTML));assert.equal((h.nodes.get('modal').innerHTML.match(/<p\b/g)||[]).length,1,'repair prompt has one sentence block');
run('closeModal();Exo.intro()');console.log('PASS: two distinct answers and an audible reply, debounce, loading gate, resume/replay isolation, elapsed-time captions, on/off-route recall, concise lamp interaction.');
