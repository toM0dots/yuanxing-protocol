// Classic worker shares the same deterministic terrain/collision sources.
importScripts('./assets/canyon-v2/canyon-nav.js','./assets/canyon-v2/canyon-flight.js','./exo-canyon-v2.js?v=20261106-landscape87','./exo-room-story-data.js?v=20261106-lived85','./exo-facilities.js?v=20261106-lived85','./exo-wreck-world.js?v=20261106-landscape87','./exo-region-landmark-data.js?v=61','./exo-world-layout.js?v=20261106-story80','./exo-terrain-wilds.js?v=20261106-landscape87','./exo-training-ground.js?v=20261106-story80','./exo-world.js?v=20261107-vegetation88','./exo-3d.js?v=20261107-loading90');
const geometryModule=import('./exo-terrain-geometry.mjs?v=20261107-vegetation88');
let jobs=[],busy=false;
onmessage=event=>{jobs=event.data.jobs;run();};
async function run(){
 if(busy||!jobs.length)return;busy=true;const job=jobs.shift();
 try{
  const {terrainGeometry}=await geometryModule;ExoWorld.setCave(job.prefix==='surface'?null:job.prefix);
  const data=Exo3D.mesh(job.x,job.y,job.lod||1,false),geometry=terrainGeometry(data,ExoWorld.elevation),attributes={};
  for(const [name,a] of Object.entries(geometry.attributes))attributes[name]={array:a.array,itemSize:a.itemSize,normalized:a.normalized};
  const index=geometry.index.array,transfer=[index.buffer,...Object.values(attributes).map(a=>a.array.buffer)];
  postMessage({key:job.key,attributes,index},transfer);geometry.dispose();Exo3D.releaseMeshes(new Set());
 }catch(error){postMessage({key:job.key,error:String(error)});}
 busy=false;setTimeout(run,0);
}
