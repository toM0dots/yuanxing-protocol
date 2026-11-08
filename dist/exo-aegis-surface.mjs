import * as T from './assets/ev01/three.module.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=59';

// Real CC0 scan detail on the UV-mapped Blender armor; the art palette stays authored.
export function applyAegisSurface(root,maps){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh||seen.has(o.material))return;const m=o.material;seen.add(m);m.envMapIntensity=.5;m.dithering=true;
  if(m.name.startsWith('Vanguard_')){
   m.envMapIntensity=.9;
   if(m.name==='Vanguard_Frame')m.color.multiplyScalar(1.20);
   if(/Vanguard_(Seal|Optics|Marking)$/.test(m.name))return;
   const floors={Armor:.48,Edge:.35,Navy:.44,Frame:.61,Steel:.28,Red:.47,Gold:.32};
   m.userData.minimumRoughness=floors[m.name.slice(9)]??.4;
   m.map=maps['panel-color'];m.normalMap=maps['panel-normal'];m.roughnessMap=maps['panel-rough'];m.normalScale=new T.Vector2(/Frame|Steel/.test(m.name)?.055:.10,/Frame|Steel/.test(m.name)?.055:.10);
   // The source owns painted ceramic, colored armor and exposed-metal response.
   // Sparse bright abrasions in the CC0 scan become darker exposed chips in
   // painted panels. The scan's blue pigment never replaces the source palette.
   const compile=m.onBeforeCompile;
   m.onBeforeCompile=(s,r)=>{compile.call(m,s,r);s.vertexShader='varying vec3 armorLocal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\narmorLocal=position;');s.fragmentShader='varying vec3 armorLocal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 armorScan=texture2D(map,vMapUv);
float armorWear=dot(armorScan.rgb,vec3(.2126,.7152,.0722));
float abrasionBand=.35+.65*smoothstep(.35,.90,sin(armorLocal.x*4.7+armorLocal.z*3.1)*.5+.5);
diffuseColor.rgb*=${/Vanguard_(Armor|Edge|Navy|Red)$/.test(m.name)?'clamp(.89+sqrt(max(armorWear,0.))*.45,.89,1.08)*(1.-smoothstep(.19,.42,armorWear)*.16*abrasionBand)':'clamp(.88+sqrt(max(armorWear,0.))*.34,.88,1.08)'};`);};
   m.customProgramCacheKey=()=> 'echo9-hero-paint-v92-'+(/Armor|Edge|Navy|Red/.test(m.name)?'paint':'metal');applyPackedPBR(m);m.needsUpdate=true;return;
  }
  const field=m.name.startsWith('Field_');
  if(!(field||m.name.startsWith('Strike_'))||/Optics|Reactor|JointSeal|Field_Seal|Field_Status/.test(m.name))return;
  // The Blender armor already has UVs. Use the scan's worn paint variation as
  // well as its relief, while retaining each authored armor material's identity.
  m.map=maps['panel-color'];m.normalMap=maps['panel-normal'];m.roughnessMap=maps['panel-rough'];m.normalScale=new T.Vector2(field?.16:.22,field?.16:.22);
  // The field chassis owns its subdued olive/steel palette in the source GLB.
  // Preserve those authored colors and metalness values through runtime wear.
  if(!field){
   if(/Ceramic/.test(m.name)){m.color.setHex(0xaab6b5);m.metalness=.22;}
   if(/Graphite/.test(m.name)){m.color.setHex(0x52616b);m.metalness=.38;}
   if(/Titanium/.test(m.name)){m.color.setHex(0x7e8d91);m.metalness=.72;}
  }
  m.roughness=field?Math.max(m.roughness,.76):/Ceramic|Edge/.test(m.name)?.86:.76;
  m.userData.minimumRoughness=field?(/Paint|Edge/.test(m.name)?.62:/Steel/.test(m.name)?.4:/Oxide/.test(m.name)?.66:.5):/Ceramic|Edge/.test(m.name)?.62:/Titanium/.test(m.name)?.4:.55;
  const compile=m.onBeforeCompile;
  m.onBeforeCompile=(s,r)=>{compile.call(m,s,r);s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 armorScan=texture2D(map,vMapUv);
float armorWear=dot(armorScan.rgb,vec3(.2126,.7152,.0722));
diffuseColor.rgb*=${field?'clamp(.76+sqrt(max(armorWear,0.))*.78,.72,1.18)':'clamp(.65+sqrt(max(armorWear,0.))*1.55,.65,1.22)'};`);};
  m.customProgramCacheKey=()=> field?'aegis-field-paint-v74':'aegis-weathered-paint-v73';
  applyPackedPBR(m);m.needsUpdate=true;
 });return seen.size;
}
