import assert from 'node:assert/strict';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createFieldStory} from '../dist/exo-field-story-render.mjs';
const scene=new T.Scene(),world={elevation:()=>12,cave:null,interior:null},s=createFieldStory(scene,world);
s.update({x:4195,y:6480},world,1);assert(s.worker.visible);assert(!s.relay.visible);
let draws=0,triangles=0;s.root.traverseVisible(o=>{if(o.isMesh&&o.layers.mask){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});assert(draws<=9,'worker is batched by material');assert(triangles<13000);
s.update({x:5200,y:12230},world,2);assert(s.relay.visible);assert(!s.worker.visible);let relayDraws=0;s.root.traverseVisible(o=>{if(o.isMesh&&o.layers.mask)relayDraws++;});assert(relayDraws<=6,'relay uses a bounded material count');
world.cave={id:'survey'};s.update({x:5200,y:12230},world,3);assert(!s.root.visible);s.dispose();assert.equal(scene.children.length,0);
console.log({status:'PASS: story actors are batched, culled outdoors and disposable',workerDraws:draws,workerTriangles:triangles,relayDraws});
