import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createRouteGuide} from '../dist/exo-guidance-render.mjs';
const require=createRequire(import.meta.url);globalThis.ExoGuidance=require('../dist/exo-guidance.js');
const scene=new T.Scene(),route={points:[{x:0,y:0},{x:0,y:500},{x:500,y:500}]},target={x:500,y:500};
const W={elevation:(x,y)=>x*.1+y*.05,navigation:()=>({route,target})},guide=createRouteGuide(scene,W);
guide.update({x:0,y:0},1000);assert(guide.root.visible);
const arrows=guide.root.children.find(o=>o.isInstancedMesh),ring=guide.root.children.find(o=>!o.isInstancedMesh);assert(arrows.count>0&&arrows.count<=10);
const matrix=new T.Matrix4(),p=new T.Vector3();
for(let i=0;i<arrows.count;i++){arrows.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);assert(p.x<.01||Math.abs(p.z-500)<.01,'chevrons turn along the route');assert(Math.abs(p.y-W.elevation(p.x,p.z)-18)<.001);}
assert.equal(ring.visible,false);guide.update(target,1200);assert(ring.visible);assert.equal(arrows.count,0);
guide.update(target,1300,true);assert(!guide.root.visible);W.cave={};guide.update(target,1400);assert(!guide.root.visible);delete W.cave;
guide.update({...target,flight:{}},1500);assert(!guide.root.visible);
let triangles=0;guide.root.traverse(o=>{if(o.geometry)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?10:1);});assert(triangles<200,'fixed guide geometry stays tiny');
guide.dispose();assert.equal(scene.children.length,0);
console.log('PASS: bounded route geometry, corner following, ground clearance, arrival ring, flight/interior/activity visibility and disposal ('+triangles+' triangles).');
