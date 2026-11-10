import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createRegionalLandmarks,landmarkRoadClearance,landmarkBoundaryClearance} from '../dist/exo-regional-landmarks.mjs';
const c={};vm.createContext(c);
for(const f of ['assets/canyon-v2/canyon-nav.js','assets/canyon-v2/canyon-flight.js','exo-canyon-v2.js','exo-wreck-world.js','exo-world.js'])vm.runInContext(fs.readFileSync(new URL('../dist/'+f,import.meta.url),'utf8'),c);
globalThis.ExoCanyonV2=vm.runInContext('ExoCanyonV2',c);globalThis.ExoWreckWorld=vm.runInContext('ExoWreckWorld',c);
const W=vm.runInContext('ExoWorld',c),scene=new T.Scene(),start=performance.now(),layer=createRegionalLandmarks(scene,{},W),buildMs=performance.now()-start;
const metrics=[];
for(const [i,group] of layer.groups.entries()){
 group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group),p=layer.placements[i],r=layer.stats.regions[i];
 assert(r.triangles<=(i===3?68000:44000)&&r.drawGroups<=6);
 for(const mesh of group.children)for(const attr of Object.values(mesh.geometry.attributes))for(const v of attr.array)assert(Number.isFinite(v));
 assert(landmarkRoadClearance(W,p.x,p.y)>=700);assert(Math.hypot(p.x-W.surfaceCamps[i].x,p.y-W.surfaceCamps[i].y)>=750);
 for(const camp of W.surfaceCamps)assert(Math.hypot(p.x-camp.x,p.y-camp.y)>p.radius+p.fade);
 for(const cave of W.caves)assert(Math.hypot(p.x-cave.x,p.y-cave.y)>p.radius+p.fade+180);
 // Entire ground footprint and its blend stay clear of the navigable road band.
 assert(landmarkRoadClearance(W,p.x,p.y)>p.radius+p.fade+150);
 let radius=0;for(const mesh of group.children){const pos=mesh.geometry.attributes.position;for(let k=0;k<pos.count;k++)radius=Math.max(radius,Math.hypot(pos.getX(k),pos.getZ(k)));}
 assert(radius<p.radius+10,'model fits terrain pad envelope: region '+i+', radius '+radius);
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.z,bounds.max.z])assert(landmarkBoundaryClearance(W,x,y)>=1700,'all scenery bounds stay clear of the lethal boundary');
 assert.equal(W.danger({x:p.x,y:p.y+550}),null,'front approach has no boundary warning');
 assert(landmarkBoundaryClearance(W,p.x,p.y+550)>=1700);
 metrics.push({...r,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},nearestRoad:landmarkRoadClearance(W,p.x,p.y),campDistance:Math.hypot(p.x-W.surfaceCamps[i].x,p.y-W.surfaceCamps[i].y)});
}
// A 120-unit mech can pass the open central minehead and beneath the suspended cage.
const groundBlocked=(region,x,y)=>layer.collisionBoxes.some(b=>b.region===region&&b.z<layer.placements[region].z+100&&b.z+b.h>layer.placements[region].z+10&&Math.abs(x-b.x)<b.w/2+24&&Math.abs(y-b.y)<b.d/2+24);
for(const [region,local] of [[0,[0,155]],[2,[0,180]],[5,[0,125]],[6,[0,230]]]){const p=layer.placements[region];assert(!groundBlocked(region,p.x+local[0],p.y+local[1]),'readable front approach remains open in region '+region);}
const data={version:1,placements:layer.placements,collisionBoxes:layer.collisionBoxes};
// Check the narrow mountain pad with production elevation and grounded movement.
const mountainContext={console};vm.createContext(mountainContext);vm.runInContext('const ExoRegionLandmarkData='+JSON.stringify(data),mountainContext);
for(const f of ['assets/canyon-v2/canyon-nav.js','assets/canyon-v2/canyon-flight.js','exo-canyon-v2.js','exo-wreck-world.js','exo-world.js','exo-motion.js'])vm.runInContext(fs.readFileSync(new URL('../dist/'+f,import.meta.url),'utf8'),mountainContext);
const mountain=vm.runInContext(`(()=>{const p=ExoRegionLandmarkData.placements[7],u={...ExoMotion.create(),x:p.x,y:p.y+550},target=p.y+300;let frames=0,maxSlope=0;while(u.y-target>8&&frames<1800){maxSlope=Math.max(maxSlope,ExoWorld.slope(u.x,u.y));ExoMotion.step(u,{x:0,y:-1},1/30,false);frames++;}return {height:p.z,frames,maxSlope,distance:Math.hypot(u.x-p.x,u.y-target),warning:ExoWorld.danger(u)};})()`,mountainContext);
assert(mountain.height>=180);assert(mountain.frames<1800&&mountain.distance<10,'mountain approach is reachable on foot');assert(mountain.maxSlope<1.1,'mountain approach stays within normal landing slope');assert.equal(mountain.warning,null);
fs.writeFileSync(new URL('../dist/exo-region-landmark-data.js',import.meta.url),'/* Fixed landmark pads and solid proxies, shared by renderer, terrain worker and physics. */\nconst ExoRegionLandmarkData='+JSON.stringify(data)+';\nif(typeof module!=="undefined")module.exports=ExoRegionLandmarkData;\n');
const output=new URL('../art/regional-landmarks-v1/',import.meta.url);fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(new URL('metrics.json',output),JSON.stringify({buildMs,regions:metrics,triangles:metrics.reduce((a,r)=>a+r.triangles,0),collisionBoxes:layer.collisionBoxes.length,mountainApproach:mountain,validation:['finite positions, normals and UVs','all eight material/triangle budgets','all terrain pads clear road navigation band, camps and cave entrances','open front approach clear for capsule, archive, minehead and deep shaft','all model bounds at least 1700 world units from active lethal boundaries','front approaches produce no guardian warning','mountain observatory elevation >=180 and grounded approach below slope1.1']},null,2)+'\n');
console.log(JSON.stringify({buildMs,regions:metrics.map(r=>({region:r.region,triangles:r.triangles,draws:r.drawGroups,x:r.x,y:r.y,road:r.nearestRoad})),collisionBoxes:layer.collisionBoxes.length},null,2));
layer.dispose();
