import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createSurveyWorld} from '../dist/exo-survey-render.mjs';
const require=createRequire(import.meta.url),Lib=require('../dist/exo-survey.js');
let installed=new Set(),lit=new Set(),revision=0;const s={state:{carrying:[]},sites:Lib.sites,installed:k=>installed.has(k),calibrated:k=>lit.has(k),get revision(){return revision}};
const scene=new T.Scene(),w={elevation:()=>0,cave:null,interior:null},r=createSurveyWorld(scene,w,s);
function stats(){let draws=0,tris=0;r.root.traverseVisible(o=>{if(o.isMesh&&o.layers.mask){draws++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {draws,tris};}
r.update(Lib.HOME,w,0);assert(!r.plants.visible&&!r.sleeping.visible);assert.equal(r.towers.filter(t=>t.root.visible).length,1);const before=stats();
installed=new Set(['filter','valve','berths']);lit.add(0);revision++;r.update(Lib.HOME,w,2);assert(r.plants.visible&&r.sleeping.visible);assert(r.fan.rotation.z>0);assert(r.towers[0].crown.visible);const after=stats();assert(after.draws<=9,'yard and one beacon stay within 9 extra material batches');assert(after.tris<12000,'no dense props');
r.update({x:17400,y:3600},w,3);assert(!r.yard.visible);assert.equal(r.towers.filter(t=>t.root.visible).length,1);assert(stats().draws<=4);w.cave={id:'basalt'};r.update(Lib.HOME,w,4);assert(!r.root.visible);r.dispose();assert.equal(scene.children.length,0);
console.log({status:'PASS: repaired-state visibility, outdoor/distance culling, animation, material batching and disposal',before,after});
