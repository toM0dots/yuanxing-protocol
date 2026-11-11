import * as T from './assets/ev01/three.module.mjs';
import {createFieldLampBatch} from './exo-field-lamps.mjs?v=20261107-performance89';

// Repairable and drainable lanterns (ExoLampRepair). Each is its own small batch
// of the shared field-lantern model, so its optical core, ground spill and real
// light can be lit, dimmed or dark on its own. A dead lamp still catches the
// eye with a weak, irregular flicker.
export function createRepairLamps(scene,maps,W,kit=null){
 const root=new T.Group();root.name='Repairable lamps';
 const lamps=[],caches=[];
 if(typeof ExoLampRepair==='undefined')return {root,update(){},dispose(){}};
 const items=[...ExoLampRepair.broken.map((item,i)=>({item,height:44,seed:900+i*7,color:0xe4bd87})),...ExoLampRepair.spares().map((item,i)=>({item,height:29,seed:709+i,color:0x9fe9b7}))];
 for(const {item,height,seed,color} of items){
  const batch=createFieldLampBatch(maps);
  batch.add({x:item.x,y:item.y,z:W.elevation(item.x,item.y),height,seed,color,groundAt:W.elevation});
  const lamp=batch.finish();lamp.name='Repairable lamp / '+item.name;root.add(lamp);
  const cores=new Set(),spills=[];
  lamp.traverse(o=>{if(!o.material)return;for(const m of [].concat(o.material)){if(/optical core/.test(m.name))cores.add(m);}if(/ground spill/i.test(o.name))spills.push(o);});
  const fixtures=lamp.userData.fixtures.slice();
  lamps.push({item,lamp,batch,cores:[...cores].map(m=>({m,base:m.emissiveIntensity,color:m.color.clone()})),spills,fixtures,shown:-1,next:Math.random()*4});
 }
 // Salvage caches use the interior kit's battery case at outdoor scale.
 const prop=kit?.props?.get('battery_case');
 if(prop)for(const item of ExoLampRepair.caches){
  const g=new T.Group();g.name='Battery cache / '+item.name;let glow=null;
  for(const part of prop.parts){const m=new T.Mesh(part.geometry,part.material);m.matrixAutoUpdate=false;m.matrix.copy(part.matrix);m.castShadow=part.material.name!=='AmberGlow';m.receiveShadow=true;if(part.material.name==='AmberGlow')glow=m;g.add(m);}
  g.position.set(item.x,W.elevation(item.x,item.y),item.y);g.rotation.y=(item.x*.013)%6.28;g.scale.setScalar(.78);root.add(g);
  caches.push({item,g,glow});
 }
 scene.add(root);
 function update(u,world,now=performance.now()){
  root.visible=!world.cave&&!world.interior;if(!root.visible)return;
  const t=now/1000;
  for(const L of lamps){
   const level=ExoLampRepair.level(L.item);
   let glow=level;
   if(level===0){                                   // dead cell: brief, uneven sputters
    if(t>L.next){L.flickUntil=t+.05+Math.random()*.12;L.next=t+2.5+Math.random()*5;}
    glow=t<L.flickUntil?.18+.12*Math.sin(t*90):0;
   }
   if(Math.abs(glow-L.shown)>.005){
    for(const c of L.cores){c.m.emissiveIntensity=c.base*glow;c.m.color.copy(c.color).multiplyScalar(.32+.68*Math.min(1,glow*1.4));}
    L.shown=glow;
   }
   const lit=level>0;
   if(L.lit!==level){
    L.lit=level;for(const s of L.spills)s.visible=lit;
    L.lamp.userData.fixtures=lit?L.fixtures.map(f=>({...f,gain:level})):[];
   }
  }
  for(const c of caches)if(c.glow)c.glow.visible=!ExoLampRepair.taken(c.item.id);
 }
 return {root,update,dispose(){root.removeFromParent();lamps.forEach(L=>L.batch.dispose());}};
}
