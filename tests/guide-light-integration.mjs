import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createGuideLights,createGuideLightPool,CANYON_LAMP_SOCKETS} from '../dist/exo-guide-lights.mjs';
import {createCaverns} from '../dist/exo-caverns.mjs';
const require=createRequire(import.meta.url);
for(const [name,file] of [['ExoCanyonData','assets/canyon-v2/canyon-nav.js'],['ExoCanyonFlightData','assets/canyon-v2/canyon-flight.js'],['ExoCanyonV2','exo-canyon-v2.js'],['ExoFacilities','exo-facilities.js'],['ExoWreckWorld','exo-wreck-world.js'],['ExoRegionLandmarkData','exo-region-landmark-data.js'],['ExoStoryRoute','exo-story-route.js'],['ExoWorldLayout','exo-world-layout.js'],['ExoTerrainWilds','exo-terrain-wilds.js'],['ExoTrainingGround','exo-training-ground.js'],['ExoWorld','exo-world.js']])globalThis[name]=require('../dist/'+file);
globalThis.ExoLampRepair=require('../dist/exo-lamp-repair.js');
globalThis.ExoGuidance=require('../dist/exo-guidance.js');
const W=ExoWorld,C=ExoCanyonV2,scene=new T.Scene(),guides=createGuideLights(scene,{},W,C),pool=createGuideLightPool(scene),fixtures=guides.root.userData.fixtures;
const coordinates=points=>points.map(p=>[p.x,p.y].join(':')).sort();
assert.deepEqual(coordinates(ExoGuidance.waylights(W)),coordinates(fixtures),'every ordinary interactable lamp has a rendered fixture, including camp lights');
for(const p of fixtures){assert([p.x,p.y,p.z,p.coreZ,p.height].every(Number.isFinite));assert.equal(p.z,W.elevation(p.x,p.y));assert(p.coreZ>p.z&&p.coreZ<p.z+p.height);}
for(const p of ExoStoryRoute.lamps)assert(!fixtures.some(f=>f.x===p.x&&f.y===p.y),'repair renderer owns the story lamps without duplicate fixed lights');
let triangles=0;guides.root.traverse(o=>{if(o.geometry){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const attr of ['position','normal','uv'])assert(o.geometry.attributes[attr].array.every(Number.isFinite));}});
assert(triangles<370000,`entire road/canyon lamp family stays within fixed geometry budget: ${fixtures.length} fixtures / ${triangles} triangles`);
for(const p of fixtures){pool.update(p,[guides.root]);assert(pool.lights.filter(l=>l.visible).length<=2);assert(pool.lights.some(l=>l.visible&&l.position.x===p.x&&l.position.y===p.coreZ&&l.position.z===p.y),'local light is on the real optic');}
pool.update(fixtures[0],[guides.root],false);assert(pool.lights.every(l=>!l.visible),'interior transition disables all surface lamp lighting');
guides.update({}, {cave:{id:'survey'}});pool.update(fixtures[0],[guides.root]);assert(pool.lights.every(l=>!l.visible));guides.update({},W);
const map=require('../dist/exo-3d.js'),road=W.beacons.find(p=>!C.inZone(p.x,p.y)),tx=Math.floor(road.x/1000),ty=Math.floor(road.y/1000),simple=map.mesh(tx,ty,1),premium=map.mesh(tx,ty,1,false);
assert(simple.length>premium.length,'legacy geometry keeps its beacons while premium omits duplicate markers');assert.deepEqual(simple.slice(0,premium.length),premium.slice(),'terrain itself is unchanged');assert.deepEqual(simple.roadCoverage.slice(0,premium.roadCoverage.length),premium.roadCoverage,'road coverage is unchanged');assert.equal(map.mesh(tx,ty,1,false),premium,'premium caches separately');assert.equal(map.mesh(tx,ty,1),simple);
assert.equal(map.sceneGeometry({c:{x:road.x,y:road.y},unit:road,sites:[],rocks:[],combat:null},false,false,false,false).length,0,'premium marker batch no longer draws the old solid cyan camp posts');
const caves=createCaverns(scene,{});let caveFixtures=0;
for(const c of W.caves){W.setCave(c.id);caves.update(W.entry,W);let count=0;caves.lanterns.traverse(o=>{for(const p of o.userData.fixtures||[]){count++;assert([p.x,p.y,p.z,p.coreZ].every(Number.isFinite));assert(W.inside(p.x,p.y,28),'cave lamp preserves tunnel margin');assert.equal(p.z,W.elevation(p.x,p.y));}});assert(count>0);caveFixtures+=count;}
W.setCave(null);caves.update(W.surfaceCamps[0],W);assert.equal(caves.lanterns,null);caves.dispose();guides.dispose();pool.dispose();assert.equal(scene.children.length,0,'all new light and fixture resources detach on disposal');
const glb=readFileSync(new URL('../dist/assets/k09-hero-v1/k09-hangar-field.glb',import.meta.url)),json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());assert.equal(json.scenes.length,1);assert.equal(json.meshes.length,6,'hero export has only active authored material groups');
console.log(`PASS: ${fixtures.length} road/canyon lamps, ${triangles} triangles; two anchored lights; ${caveFixtures} cave fixtures; premium/fallback terrain parity; cleanup; six-mesh hero export.`);
