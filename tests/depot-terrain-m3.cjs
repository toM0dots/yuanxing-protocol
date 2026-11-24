const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),harness=require('./expedition-harness.cjs');
const h=harness(),main=h.run('ExoWorld'),dir=path.join(__dirname,'../dist'),worker=vm.createContext({console});
worker.importScripts=(...urls)=>{for(const url of urls)vm.runInContext(fs.readFileSync(path.join(dir,url.split('?')[0]),'utf8'),worker,{filename:url});};
vm.runInContext(fs.readFileSync(path.join(dir,'exo-terrain-worker.js'),'utf8').split('const geometryModule')[0],worker);
const terrain=vm.runInContext('ExoWorld',worker);let samples=0;
for(let x=5500;x<=6700;x+=30)for(let y=6150;y<=7480;y+=30){assert.equal(terrain.elevation(x,y),main.elevation(x,y),`worker/feet mismatch at ${x},${y}`);samples++;}
assert(main.elevation(5770,6600)<main.elevation(5770,6490)-35,'ditch is cut into terrain');
assert(main.elevation(6510,6420)>main.elevation(6510,6640)+100,'winch reaches a real raised ledge');
const D=h.run('ExoDepotData');for(const rock of main.rocks(6100,6650).filter(r=>!r.authoredEncounter))assert(!D.reserved(rock.x,rock.y,rock.r),'procedural rocks must clear maintained work lanes');
for(const [from,to] of [[{x:5980,y:7460},{x:5960,y:7300}],[{x:5960,y:7300},{x:5770,y:6740}],[{x:5770,y:6740},{x:6280,y:6670}]]){const points=D.route(from,to);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/20);for(let j=0;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,y=a.y+(b.y-a.y)*j/n;assert(!main.solidStructure(x,y,main.elevation(x,y)+65,24),'depot guidance clears structures and trees');assert(main.slope(x,y)<.65,'depot guidance stays walkable');assert(!main.rocks(x,y).some(r=>Math.hypot(r.x-x,r.y-y)<r.r+24),'depot guidance clears rocks');}}}
const S=h.run('ExoSystems'),floor=main.elevation(6300,6820),target=[6300,6670,floor+70],eye=[6300,7020,floor+140];assert(S.constrainCamera(target,eye,main)[1]<6820,'closed depot door cannot hide the mech from the camera');S.things.patch('depot:cable-door',{state:{open:true}});assert(S.constrainCamera(target,eye,main)[1]>6820,'open door restores camera room');
console.log(`PASS: ${samples} worker/main terrain samples, real ditch and ledge, clear maintenance lanes.`);
