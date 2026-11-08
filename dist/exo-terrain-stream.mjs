import * as T from './assets/ev01/three.module.mjs';

export const terrainLevel=(prefix,gx,gy,x,y)=>prefix!=='surface'?1:Math.max(Math.abs(x-gx),Math.abs(y-gy))<=1?1:Math.max(Math.abs(x-gx),Math.abs(y-gy))<=2?2:4;
export function geometryFromTransfer(record){
 const geometry=new T.BufferGeometry();
 for(const [name,a] of Object.entries(record.attributes))geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize,a.normalized));
 geometry.setIndex(new T.BufferAttribute(record.index,1));return geometry;
}

// Precompute full-detail tiles outside the active terrain ring. Current tiles
// always have a synchronous fallback: late workers never create a terrain hole.
export function createTerrainStream(enabled=true){
 const ready=new Map();let worker=null,last='',wanted=new Set(),failed=false,hits=0,misses=0;
 if(enabled&&typeof Worker!=='undefined'){
  try{worker=new Worker(new URL('./exo-terrain-worker.js?v=20261107-loading90',import.meta.url));
   worker.onmessage=({data})=>{if(data.error){failed=true;worker.terminate();worker=null;ready.clear();return;}if(wanted.has(data.key))ready.set(data.key,data);};
   worker.onerror=()=>{failed=true;worker?.terminate();worker=null;ready.clear();};
  }catch{failed=true;}
 }
 function prefetch(prefix,gx,gy,existing,radius=6){
  if(!worker)return;const state=prefix+':'+gx+','+gy+':'+radius;if(state===last)return;last=state;
  const jobs=[];wanted=new Set();
  for(let x=gx-radius;x<=gx+radius;x++)for(let y=gy-radius;y<=gy+radius;y++){
   const lod=terrainLevel(prefix,gx,gy,x,y),key=prefix+':'+x+','+y+':'+lod;if(existing.has(key))continue;wanted.add(key);if(!ready.has(key))jobs.push({prefix,x,y,key,lod});
  }
  for(const key of ready.keys())if(!wanted.has(key))ready.delete(key);
  jobs.sort((a,b)=>Math.hypot(a.x-gx,a.y-gy)-Math.hypot(b.x-gx,b.y-gy));worker.postMessage({jobs});
 }
 return {prefetch,take(key){const record=ready.get(key);if(!record){misses++;return null;}hits++;ready.delete(key);return geometryFromTransfer(record);},get status(){return {enabled:!!worker,failed,ready:ready.size,hits,misses};},dispose(){worker?.terminate();ready.clear();wanted.clear();}};
}
