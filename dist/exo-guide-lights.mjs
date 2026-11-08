import * as T from './assets/ev01/three.module.mjs';
import {createFieldLampBatch} from './exo-field-lamps.mjs?v=20261107-performance89';

// Fixed maintenance hardware follows the same beacon coordinates as navigation.
// Legacy WebGL retains its low-detail markers; the premium terrain omits them.
export const CANYON_LAMP_SOCKETS=[[1.1,8.37],[13,18.87],[5,26.87],[14,27.87],[2.8,17.37],[14,9.37],[-1,8.48]];
function* buildGuideLights(scene,maps,W,C=null){
 const batch=createFieldLampBatch(maps);
 for(const [i,p] of (W.beacons||[]).entries()){
  if(C?.inZone(p.x,p.y)){const q=C.local(p.x,p.y);if(C.clearance(q.x,q.y)<3)continue;}
  batch.add({...p,z:W.elevation(p.x,p.y),height:46,groundAt:W.elevation,seed:i+13,color:p.side?0xe4bd87:0xa1d5b4});
  yield;
 }
 for(const [i,camp] of (W.surfaceCamps||[]).entries())for(const side of [-1,1]){
  if(i===8&&typeof ExoStoryRoute!=='undefined')continue; // the three clue lamps now guide this area
  const x=camp.x+side*90,y=camp.y;batch.add({x,y,z:W.elevation(x,y),height:45,groundAt:W.elevation,seed:311+i*2+side,color:0x9ed9b6});
  yield;
 }
 if(C)for(const [i,p] of (typeof ExoStoryRoute!=='undefined'?ExoStoryRoute.lamps:CANYON_LAMP_SOCKETS).entries()){
  const q=Array.isArray(p)?C.world(...p):p;batch.add({...q,z:W.elevation(q.x,q.y),height:29,groundAt:W.elevation,seed:709+i,color:0x9fe9b7});
  yield;
 }
 const root=batch.finish();root.name='World maintenance lanterns';scene.add(root);
 return {root,update(_u,world){root.visible=!world.cave&&!world.interior;},dispose:batch.dispose};
}
export function createGuideLights(...args){const steps=buildGuideLights(...args);let next=steps.next();while(!next.done)next=steps.next();return next.value;}
export async function createGuideLightsAsync(...args){
 const steps=buildGuideLights(...args);let next=steps.next(),count=0;
 while(!next.done){if(++count%4===0)await new Promise(resolve=>setTimeout(resolve,0));next=steps.next();}return next.value;
}

// Only two actual lights, anchored to visible lantern optics. They softly light
// nearby stone/metal rather than flooding the scene with colored ambient fill.
export function createGuideLightPool(scene){
 const lamps=Array.from({length:2},()=>{const light=new T.PointLight(0xb1e9bc,0,240,2);light.visible=false;scene.add(light);return light;});
 function update(u,groups,enabled=true){
  const closest=[null,null],ranges=[Infinity,Infinity];
  if(enabled)for(const root of groups){if(!root?.visible)continue;root.traverse(o=>{for(const p of o.userData.fixtures||[]){
   const d=Math.hypot(p.x-u.x,p.y-u.y);if(d>420)continue;
   if(d<ranges[0]){closest[1]=closest[0];ranges[1]=ranges[0];closest[0]=p;ranges[0]=d;}else if(d<ranges[1]){closest[1]=p;ranges[1]=d;}
  }});}
  lamps.forEach((light,i)=>{const p=closest[i];light.visible=!!p;if(!p)return;const s=p.height/58;
   light.position.set(p.x,p.coreZ??p.z+p.height*.64,p.y);light.color.setHex(p.color).lerp(new T.Color(0xe9f1d8),.38);
   light.distance=160+120*s;light.intensity=2200*s*s*Math.min(1,(420-ranges[i])/100);
  });
 }
 return {update,lights:lamps,dispose(){lamps.forEach(light=>scene.remove(light));}};
}
