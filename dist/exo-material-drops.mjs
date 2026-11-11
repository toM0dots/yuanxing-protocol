import * as T from './assets/ev01/three.module.mjs';
import {loadGameModel} from './exo-asset-loader.mjs?v=20261110-hero8';

// Modelled loot dropped by defeated creatures: 能源晶核 (energy core) and
// 合金 (alloy salvage). Each drop pops out, hovers and turns slowly with a soft
// ground glow, then drifts to the mech and disappears when collected.
const SCALE={energy:30,metal:40},GLOW={energy:0x5ff0d2,metal:0xf0c070};
export function createMaterialDropLayer(scene){
 const group=new T.Group();group.name='MaterialDrops';scene.add(group);
 const templates={},pool={energy:[],metal:[]},live=new Map();let ready=false,failed=false;
 const ringGeometry=new T.RingGeometry(.55,1,40);ringGeometry.rotateX(-Math.PI/2);
 const ringMaterials={energy:new T.MeshBasicMaterial({color:GLOW.energy,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),metal:new T.MeshBasicMaterial({color:GLOW.metal,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false})};
 const emissive=[];
 loadGameModel(new URL('./assets/material-drops-v1/material-drops.glb',import.meta.url).href).then(gltf=>{
  for(const [kind,name] of [['energy','Drop_Energy'],['metal','Drop_Metal']]){const root=gltf.scene.getObjectByName(name);if(!root)throw Error('Missing drop model '+name);root.position.set(0,0,0);root.scale.setScalar(SCALE[kind]);
   root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;const m=o.material;if(m?.emissiveMap||m?.emissiveIntensity>0&&m.emissive?.getHex())emissive.push(m);}});templates[kind]=root;}
  ready=true;globalThis.ExoMaterialDropsReady=true;
 }).catch(error=>{failed=true;console.warn('Material drop models unavailable; drops keep the simple markers.',error);});
 function take(kind){const item=pool[kind].pop();if(item){item.visible=true;return item;}
  const holder=new T.Group(),model=templates[kind].clone(true),ring=new T.Mesh(ringGeometry,ringMaterials[kind]);ring.renderOrder=2;holder.add(model,ring);holder.userData={model,ring};group.add(holder);return holder;}
 function update(combat,time,elevation,reduced=false){
  if(!ready){return;}
  const drops=combat?.drops||[],seen=new Set();
  for(const d of drops){const kind=d.kind==='energy'?'energy':'metal';let item=live.get(d);if(!item){item=take(kind);item.userData.kind=kind;live.set(d,item);}seen.add(d);
   const age=d.age||0,pop=Math.min(1,age/.35),settle=pop<1?1+Math.sin(pop*Math.PI)*.25:1,ground=elevation(d.x,d.y),seed=d.seed||0;
   const hover=kind==='energy'?14+(reduced?0:Math.sin(time*2.2+seed)*3.2):3+(reduced?0:Math.sin(time*1.7+seed)*1.2);
   item.position.set(d.x,ground+hover*pop,d.y);item.userData.model.rotation.y=reduced?seed:time*(kind==='energy'?.9:.45)+seed;item.userData.model.scale.setScalar(SCALE[kind]*pop*settle);
   item.userData.ring.position.y=-hover*pop+1.2;item.userData.ring.scale.setScalar((kind==='energy'?20:24)*(.8+.2*Math.sin(time*3+seed)));}
  for(const [d,item] of live)if(!seen.has(d)){item.visible=false;pool[item.userData.kind].push(item);live.delete(d);}
  const pulse=reduced?1:1+.35*Math.sin(time*3.1);for(const m of emissive)m.emissiveIntensity=(m.userData.baseEmissive??=m.emissiveIntensity)*pulse;
 }
 return {group,update,get ready(){return ready},get failed(){return failed},get count(){return live.size}};
}
