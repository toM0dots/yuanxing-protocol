import * as T from './assets/ev01/three.module.mjs';
import {useIdentityBatchTransform} from './exo-render-optimization.mjs?v=20261107-performance89';

// Draw opaque coverage once with a cheap depth shader. The following color
// pass still uses every original material, texture and sample; covered pixels
// can fail the depth test before doing PBR/scan shading. No render targets or
// reduced-resolution buffers are used, so hardware MSAA coverage is retained.
export function createDepthPrepass(){
 const cache=new WeakMap(),owned=new Set(),restore=[];
 function depthFor(material){
  if(!material||material.transparent||!material.depthWrite||!material.depthTest||material.alphaHash||material.userData.skipDepthPrepass||
   !(material.isMeshStandardMaterial||material.isMeshBasicMaterial))return null;
  let depth=cache.get(material);
  if(!depth){depth=new T.MeshDepthMaterial();if(material.userData.identityBatch)useIdentityBatchTransform(depth);cache.set(material,depth);owned.add(depth);}
  for(const key of ['side','map','alphaMap','alphaTest','displacementMap','displacementScale','displacementBias','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','clippingPlanes','clipIntersection','clipShadows','visible'])depth[key]=material[key];
  // Different compiled depth/PBR vertex programs can round depth differently
  // on Intel WebGL. Bias the early pass one slope unit and four depth-buffer units away so the
  // original color pass is never rejected by its own coverage. That pass still
  // writes the exact original depth; occlusion and transparent layers are intact.
  depth.polygonOffset=true;
  depth.polygonOffsetFactor=(material.polygonOffset?material.polygonOffsetFactor:0)+1;
  depth.polygonOffsetUnits=(material.polygonOffset?material.polygonOffsetUnits:0)+4;
  depth.colorWrite=false;depth.depthFunc=material.depthFunc;return depth;
 }
 function render(renderer,scene,camera){
  const autoClear=renderer.autoClear,background=scene.background,shadowAuto=renderer.shadowMap.autoUpdate,shadowNeeds=renderer.shadowMap.needsUpdate,infoAuto=renderer.info.autoReset;
  renderer.info.reset();renderer.info.autoReset=false;renderer.autoClear=false;
  if(background?.isColor)renderer.setClearColor(background);
  renderer.clear(true,true,true);scene.background=null;
  // Match the renderer's visibility/layer gates. Hidden interiors and source
  // meshes replaced by batches need no material swaps or restore allocations.
  scene.traverseVisible(o=>{
   if(!o.layers.test(camera.layers))return;
   if(!o.isMesh&&!o.isLine&&!o.isPoints&&!o.isSprite)return;
   const material=o.isMesh&&!Array.isArray(o.material)?depthFor(o.material):null;
   restore.push([o,o.material,o.layers.mask]);
   if(material)o.material=material;else o.layers.disableAll();
  });
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  try{
   try{renderer.render(scene,camera);}finally{
    for(const [o,material,mask] of restore){o.material=material;o.layers.mask=mask;}restore.length=0;
    renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowNeeds;
   }
   renderer.render(scene,camera);
  }finally{scene.background=background;renderer.autoClear=autoClear;renderer.info.autoReset=infoAuto;}
 }
 return {render,depthFor,dispose(){for(const m of owned)m.dispose();owned.clear();}};
}
