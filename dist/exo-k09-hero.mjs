import * as T from './assets/ev01/three.module.mjs';
import {GLTFLoader} from './assets/ev01/GLTFLoader.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=59';

export const K09_HANGAR='k09-hero-hangar';
export async function loadK09Hero(){
 return (await new GLTFLoader().loadAsync(new URL('./assets/k09-hero-v1/k09-hangar-field.glb?v=20261106-detail81',import.meta.url).href)).scene;
}
export function createK09Hero(scene,root,maps,canyon){
 if(!root)return {update(){},constrainCamera:(_target,eye)=>eye};
 const C=ExoCanyonV2;
 root.name='K09 authored hangar and evacuation equipment';
 root.position.set(C.origin.x,C.baseHeight,C.origin.y);root.scale.setScalar(C.scale);
 root.traverse(o=>{if(!o.isMesh)return;
  const m=o.material,name=m.name.replace(/\.\d+$/,'');
  m.envMapIntensity=.55;m.dithering=true;
  if(['K09_Painted','K09_Steel','K09_Dark'].includes(name)){
   const panel=name==='K09_Painted';
   m.map=maps[panel?'panel-color':'metal-color'];
   m.normalMap=maps[panel?'panel-normal':'metal-normal'];m.roughnessMap=m.normalMap;
   m.normalScale=new T.Vector2(panel?.28:.5,panel?.28:.5);m.roughness=.92;
   // Preserve the station palette while using the scan's weathering and relief.
   m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 weatherP;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nweatherP=position;');
    s.fragmentShader='varying vec3 weatherP;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 scanSample=texture2D(map,vMapUv);float wear=dot(scanSample.rgb,vec3(.2126,.7152,.0722));
float runoff=smoothstep(.38,.92,sin(weatherP.x*9.7+weatherP.z*11.3)+.35*sin(weatherP.x*29.1+weatherP.z*31.7));
float footDust=1.-smoothstep(.8,5.,weatherP.y);
float corrosion=runoff*(.09+.29*footDust)*smoothstep(.12,.6,1.-wear);
diffuseColor.rgb*=clamp(.42+wear*1.65,.42,1.15);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.105,.055),corrosion);
diffuseColor.rgb*=1.-footDust*.24;`);
   };
   m.customProgramCacheKey=()=> 'k09-weathered-metal-v53';m.userData.minimumRoughness=.58;applyPackedPBR(m);
  }
  if(name==='K09_Green'||name==='K09_Amber')m.toneMapped=false;
  if(name==='K09_Cloth')m.side=T.DoubleSide;
  o.castShadow=!['K09_Green','K09_Amber'].includes(name);o.receiveShadow=true;
 });
 // The original lamps remain a fallback if this optional kit fails to load.
 canyon.traverse(o=>{if(o.isMesh&&o.name.startsWith('FIELD'))o.visible=false;});
 root.updateMatrixWorld(true);scene.add(root);
 if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('profile')){const parts=[];root.traverse(o=>{if(o.isMesh)parts.push({name:o.name,vertices:o.geometry.attributes.position.count,visible:o.visible})});console.info('K09 DETAIL KIT',JSON.stringify({parts,position:root.position.toArray(),scale:root.scale.toArray()}));}
 const ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3();
 return {root,update(u,W){root.visible=!W.cave&&Math.hypot(u.x-C.origin.x,u.y-C.origin.y)<4700;},
  constrainCamera(target,eye){if(!root.visible)return eye;
   origin.set(target[0],target[2],target[1]);direction.set(eye[0],eye[2],eye[1]).sub(origin);const length=direction.length();
   if(length<1)return eye;ray.set(origin,direction.normalize());ray.near=0;ray.far=length+20;
   const hit=ray.intersectObject(root,true)[0];if(!hit)return eye;
   const t=Math.min(1,Math.max(1,hit.distance-20)/length);return target.map((v,i)=>v+(eye[i]-v)*t);
  }};
}
