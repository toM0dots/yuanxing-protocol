import * as T from './assets/ev01/three.module.mjs';

// Static spatial ranges all have an identity batch transform. Do not fetch
// that same 4x4 matrix from a GPU texture for every canyon/wreck vertex.
export function useIdentityBatchTransform(material){
 const original=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{original.call(material,shader,renderer);shader.vertexShader=shader.vertexShader.replace('#include <batching_vertex>','#ifdef USE_BATCHING\nmat4 batchingMatrix=mat4(1.0);\n#endif');};
 material.customProgramCacheKey=()=>key+'|identity-batch-v43';material.userData.identityBatch=true;return material;
}

// Share only byte-identical vertices. Normals, UV seams and material colors are
// part of the key, so this reduces vertex work without simplifying the surface.
export function indexExactGeometry(geometry){
 const attributes=Object.entries(geometry.attributes),count=geometry.attributes.position.count;
 const unique=new Map(),source=[],remap=new Uint32Array(count);
 const streams=attributes.map(([,a])=>({a,bits:a.array instanceof Float32Array?new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length):a.array}));
 const same=(a,b)=>streams.every(({a:attr,bits})=>{for(let j=0;j<attr.itemSize;j++)if(bits[a*attr.itemSize+j]!==bits[b*attr.itemSize+j])return false;return true;});
 for(let i=0;i<count;i++){
  let hash=2166136261;for(const {a,bits} of streams)for(let j=0;j<a.itemSize;j++)hash=Math.imul(hash^bits[i*a.itemSize+j],16777619);
  const bucket=unique.get(hash);let index;
  if(bucket)for(const candidate of bucket)if(same(i,source[candidate])){index=candidate;break;}
  if(index===undefined){index=source.length;source.push(i);if(bucket)bucket.push(index);else unique.set(hash,[index]);}remap[i]=index;
 }
 if(source.length===count)return geometry;
 const oldIndex=geometry.index,Index=source.length<=65535?Uint16Array:Uint32Array,indices=new Index(oldIndex?oldIndex.count:count);
 for(let i=0;i<indices.length;i++)indices[i]=remap[oldIndex?oldIndex.getX(i):i];
 for(const [name,a] of attributes){const data=new a.array.constructor(source.length*a.itemSize);for(let i=0;i<source.length;i++)for(let j=0;j<a.itemSize;j++)data[i*a.itemSize+j]=a.array[source[i]*a.itemSize+j];geometry.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}
 geometry.setIndex(new T.BufferAttribute(indices,1));return geometry;
}

// InstancedMesh's normal culling uses a single bound for the entire batch.
// Compact each batch against BOTH view and shadow frusta instead. Offscreen
// objects which can cast a visible shadow must remain in the batch.
export function createInstanceCuller(separateShadows=false,{radiusPadding=0,maxDistance=Infinity}={}){
 const states=new WeakMap(),view=new T.Frustum(),projection=new T.Matrix4(),matrix=new T.Matrix4(),sphere=new T.Sphere();
 const center=new T.Vector3(),eye=new T.Vector3();
 function prepare(camera){camera.updateMatrixWorld();eye.setFromMatrixPosition(camera.matrixWorld);view.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
 function cull(mesh,shadowFrustum=null){
  // Per-instance culling replaces the aggregate bound. A cached bound of an
  // earlier compacted subset must not hide instances restored after travel.
  mesh.frustumCulled=false;
  let state=states.get(mesh);
  if(!state||state.version!==mesh.instanceMatrix.version){
   mesh.geometry.computeBoundingSphere();const base=mesh.geometry.boundingSphere,n=mesh.count;
   state={shadowMesh:state?.shadowMesh,count:n,matrices:mesh.instanceMatrix.array.slice(0,n*16),colors:mesh.instanceColor?.array.slice(0,n*3),bounds:new Float32Array(n*4),version:mesh.instanceMatrix.version};
   for(let i=0;i<n;i++){matrix.fromArray(state.matrices,i*16);center.copy(base.center).applyMatrix4(matrix);state.bounds.set([center.x,center.y,center.z,base.radius*matrix.getMaxScaleOnAxis()+.01],i*4);}
   states.set(mesh,state);
  }
  if(separateShadows&&!state.shadowMesh){
   const shadow=new T.InstancedMesh(mesh.geometry,mesh.material,mesh.instanceMatrix.count);shadow.name='Shadow coverage: '+mesh.name;shadow.castShadow=true;shadow.frustumCulled=false;shadow.matrixAutoUpdate=false;shadow.instanceMatrix.setUsage(T.DynamicDrawUsage);
   let count=0;shadow.onBeforeRender=()=>{count=shadow.count;shadow.count=0;};shadow.onAfterRender=()=>{shadow.count=count;};
   mesh.parent?.add(shadow);mesh.castShadow=false;state.shadowMesh=shadow;
  }
  mesh.updateWorldMatrix(true,false);const worldScale=mesh.matrixWorld.getMaxScaleOnAxis();let count=0,shadowCount=0;
  const ids=[],shadowIds=[],shadowMesh=state.shadowMesh;
  if(shadowMesh){shadowMesh.matrix.copy(mesh.matrix);shadowMesh.visible=mesh.visible&&!!shadowFrustum;shadowMesh.layers.mask=mesh.layers.mask;}
  for(let i=0;i<state.count;i++){
   sphere.center.fromArray(state.bounds,i*4).applyMatrix4(mesh.matrixWorld);sphere.radius=state.bounds[i*4+3]*worldScale+radiusPadding;
   const dx=sphere.center.x-eye.x,dz=sphere.center.z-eye.z,range=maxDistance+sphere.radius;
   const inView=dx*dx+dz*dz<=range*range&&view.intersectsSphere(sphere),inShadow=!!shadowFrustum?.intersectsSphere(sphere);
   if(shadowMesh&&inShadow){shadowIds.push(i);for(let j=0;j<16;j++)shadowMesh.instanceMatrix.array[shadowCount*16+j]=state.matrices[i*16+j];shadowCount++;}
   if(!inView&&(separateShadows||!inShadow))continue;
   ids.push(i);
   for(let j=0;j<16;j++)mesh.instanceMatrix.array[count*16+j]=state.matrices[i*16+j];
   if(state.colors)for(let j=0;j<3;j++)mesh.instanceColor.array[count*3+j]=state.colors[i*3+j];
   count++;
  }
  const changed=!state.ids||state.ids.length!==ids.length||ids.some((id,i)=>id!==state.ids[i]);
  mesh.count=count;if(changed){mesh.instanceMatrix.needsUpdate=true;if(state.colors)mesh.instanceColor.needsUpdate=true;}state.ids=ids;state.version=mesh.instanceMatrix.version;
  if(shadowMesh){const changed=!state.shadowIds||state.shadowIds.length!==shadowIds.length||shadowIds.some((id,i)=>id!==state.shadowIds[i]);shadowMesh.count=shadowCount;if(changed)shadowMesh.instanceMatrix.needsUpdate=true;state.shadowIds=shadowIds;}
  return {source:state.count,visible:count};
 }
 return {prepare,cull,shadowFor:mesh=>states.get(mesh)?.shadowMesh};
}

export function sceneGeometryKey(o,world,rover=null){
 return JSON.stringify([world.cave?.id||'surface',world.interior?.id,!!o.fireCourse?.active,o.sites.map(s=>[s.x,s.y]),o.combat?.drops.map(d=>[d.x,d.y]),rover]);
}

// Preserve the Blender meshes, UVs, materials and animated joint hierarchy,
// while submitting compatible rigid armor pieces together.
export function batchRigidModel(root){
 const groups=new Map(),batches=[],links=[],inverse=new T.Matrix4(),matrix=new T.Matrix4();
 root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent||o.geometry.morphAttributes.position)return;
  const signature=Object.entries(o.geometry.attributes).map(([k,a])=>`${k}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
  const key=[o.material.uuid,!!o.geometry.index,o.castShadow,o.receiveShadow,signature].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 for(const pieces of groups.values()){
  if(pieces.length<2)continue;
  const vertices=pieces.reduce((n,o)=>n+o.geometry.attributes.position.count,0),indices=pieces.reduce((n,o)=>n+(o.geometry.index?.count||0),0);
  const batch=new T.BatchedMesh(pieces.length,vertices,indices,pieces[0].material);
  batch.name='Batched '+pieces[0].material.name;batch.castShadow=pieces[0].castShadow;batch.receiveShadow=pieces[0].receiveShadow;batch.frustumCulled=false;batch.sortObjects=true;
  for(const source of pieces){const id=batch.addGeometry(source.geometry),mask=source.layers.mask;source.layers.disableAll();links.push({source,batch,id,mask});}
  root.add(batch);batches.push(batch);
 }
 function sync(){inverse.copy(root.matrixWorld).invert();for(const {source,batch,id} of links){matrix.multiplyMatrices(inverse,source.matrixWorld);batch.setMatrixAt(id,matrix);let visible=true;for(let p=source;p&&p!==root;p=p.parent)visible=visible&&p.visible;batch.setVisibleAt(id,visible);}}
 root.updateMatrixWorld(true);sync();
 return {batches,links,sync,dispose(){for(const {source,mask} of links)source.layers.mask=mask;for(const batch of batches){batch.removeFromParent();batch.dispose();}}};
}

// Split static meshes into spatial draw ranges without changing any triangle.
// Multi-draw keeps one material submission while camera/shadow passes can skip
// whole invisible sections of the authored canyon and spacecraft hull.
export function partitionStaticMeshes(root,cellSize=12){
 const sources=[];root.traverse(o=>{if(o.isMesh&&!o.isBatchedMesh&&!o.isSkinnedMesh&&!Array.isArray(o.material)&&!o.material.transparent&&(o.geometry.index?.count||o.geometry.attributes.position.count)>36000)sources.push(o);});
 const result=[],materials=new Map();
 for(const source of sources){
  const g=source.geometry,p=g.attributes.position,index=g.index,n=index?.count||p.count,cells=new Map();
  for(let i=0;i<n;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),axis=k=>Math.floor(ids.reduce((sum,id)=>sum+p.array[id*3+k],0)/(3*cellSize)),key=axis(0)+','+axis(1)+','+axis(2);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(...ids);}
  if(cells.size<2)continue;
  const chunks=[];let vertexCount=0;
  for(const ids of cells.values()){
   const remap=new Map(),vertices=[],indices=[];
   for(const id of ids){if(!remap.has(id)){remap.set(id,vertices.length);vertices.push(id);}indices.push(remap.get(id));}
   const chunk=new T.BufferGeometry();for(const [name,a] of Object.entries(g.attributes)){const array=new a.array.constructor(vertices.length*a.itemSize);for(let i=0;i<vertices.length;i++)for(let j=0;j<a.itemSize;j++)array[i*a.itemSize+j]=a.array[vertices[i]*a.itemSize+j];chunk.setAttribute(name,new T.BufferAttribute(array,a.itemSize,a.normalized));}
   chunk.setIndex(indices);chunk.computeBoundingSphere();chunks.push(chunk);vertexCount+=vertices.length;
  }
  if(!materials.has(source.material)){const material=source.material.clone();material.onBeforeCompile=source.material.onBeforeCompile;material.customProgramCacheKey=source.material.customProgramCacheKey;materials.set(source.material,useIdentityBatchTransform(material));}
  const batch=new T.BatchedMesh(chunks.length,vertexCount,n,materials.get(source.material));batch.name=source.name;batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.frustumCulled=false;batch.position.copy(source.position);batch.quaternion.copy(source.quaternion);batch.scale.copy(source.scale);batch.visible=source.visible;batch.layers.mask=source.layers.mask;batch.renderOrder=source.renderOrder;batch.userData={...source.userData,spatialChunks:chunks.length};
  batch.customDepthMaterial=useIdentityBatchTransform(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:source.material.side}));
  for(const chunk of chunks){batch.addGeometry(chunk);chunk.dispose();}for(const child of [...source.children])batch.add(child);
  source.parent.add(batch);source.removeFromParent();g.dispose();result.push(batch);
 }
 return result;
}
