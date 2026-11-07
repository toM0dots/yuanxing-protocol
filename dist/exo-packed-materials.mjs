import * as T from './assets/ev01/three.module.mjs';

// RGB is the original normal scan; A is the original roughness G channel.
// Both use the same UV transform/filtering. One sample serves both equations.
const wrapped=new WeakSet();
export function applyPackedPBR(material){
 if(!material.normalMap?.userData.normalRough||material.normalMap!==material.roughnessMap||wrapped.has(material))return material;
 const original=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  original.call(material,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`vec4 packedNormalRough=texture2D(normalMap,vNormalMapUv);
float roughnessFactor=max(${(Number(material.userData.minimumRoughness)||0).toFixed(3)},roughness*packedNormalRough.a);`);
  const normal=T.ShaderChunk.normal_fragment_maps.replace(/texture2D\( normalMap, vNormalMapUv \)/g,'packedNormalRough');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',normal);
 };
 material.customProgramCacheKey=()=>key+'|packed-normal-rough-v59|'+(material.userData.minimumRoughness||0);material.needsUpdate=true;wrapped.add(material);return material;
}
