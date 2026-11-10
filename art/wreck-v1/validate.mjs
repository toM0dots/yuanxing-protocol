import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../dist/assets/ev01/three.module.mjs';
import {GLTFLoader} from '../../dist/assets/ev01/GLTFLoader.mjs';
const path=new URL('../../dist/assets/wreck-v1/echo9-orbital-wreck.glb',import.meta.url),bytes=fs.readFileSync(path),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);let triangles=0,meshes=0;const mats=new Set();
root.traverse(o=>{if(!o.isMesh)return;meshes++;mats.add(o.material.name);const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=o.geometry.attributes.uv;assert(p&&n&&uv,o.name+' has positions, normals and UVs');assert([...p.array,...n.array,...uv.array].every(Number.isFinite),o.name+' finite attributes');assert(o.matrixWorld.elements.every(Number.isFinite));triangles+=(o.geometry.index?.count||p.count)/3;assert(!o.material.map&&!o.material.normalMap,'GLB carries no embedded image maps');});
const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());assert(meshes<=24);assert(triangles<100000,'runtime triangle budget');assert(size.x>29&&size.x<45&&size.y>29&&size.y<36&&size.z>49&&size.z<58,JSON.stringify(size));
const ray=new T.Raycaster(new T.Vector3(0,15,-70),new T.Vector3(0,0,1),0,150);assert.equal(ray.intersectObject(root,true).length,0,'the entire central bore is open without any cap');
ray.set(new T.Vector3(0,30,0),new T.Vector3(0,-1,0));let hit=ray.intersectObject(root,true);assert(hit.length,'maintenance deck visible from above');const deck=hit.find(h=>h.point.y<5&&h.point.y>3.6);assert(deck,'interior has a real raised maintenance deck');
ray.set(new T.Vector3(0,8,-25),new T.Vector3(0,-1,0));hit=ray.intersectObject(root,true);assert(hit.some(h=>h.point.y>1&&h.point.y<2.5),'entrance ramp slopes up from the ground');
for(const x of [-2.4,0,2.4])for(let z=-28;z<=20;z+=.5){const floor=z<-19.4?.08+(z+29)/9.6*3.77:3.89;ray.set(new T.Vector3(x,floor+.2,z),new T.Vector3(0,1,0));ray.far=7.2;assert.equal(ray.intersectObject(root,true).length,0,`mech clearance across ramp and deck at ${x},${z}`);}
const result={meshes,triangles,materials:[...mats],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},dimensions:size.toArray(),open_bore:true,deck_y:deck.point.y};
fs.writeFileSync(new URL('validation.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
