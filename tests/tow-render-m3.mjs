import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {createTowView} from '../dist/exo-tow-render.mjs';
const require=createRequire(import.meta.url),Things=require('../dist/exo-things.js'),Tow=require('../dist/exo-tow.js');
const things=Things.create({placements:[{id:'load',kind:'cart',x:0,y:0,physics:'tow',mass:90,state:{}}]});things.flag('towUnlocked',true);const tow=Tow.create(things),scene=new T.Scene(),chest=new T.Group(),world={elevation:()=>0},camera=new T.PerspectiveCamera(),unit={x:0,y:250,angle:0},view=createTowView(scene,world,{tow,things},{},{chest});scene.add(chest);
tow.begin(unit,0);view.update(unit,world,camera);assert(view.cursor.visible);assert(!view.rope.visible);tow.release(unit);tow.step(.05,{unit,height:()=>0});view.update(unit,world,camera);assert(view.rope.visible);for(const p of view.rope.geometry.attributes.position.array)assert(Number.isFinite(p));
for(let i=0;i<30;i++)tow.step(.05,{unit,height:()=>0});view.update(unit,world,camera);assert.equal(view.marks.count,2);assert(!view.rope.visible);
let lights=0,draws=0;scene.traverseVisible(o=>{if(o.isLight)lights++;if(o.isMesh||o.isLine)draws++;});assert.equal(lights,0);assert(draws<=7);assert.equal(view.rope.geometry.attributes.position.count,25);view.dispose();assert.equal(chest.children.length,0);assert.equal(scene.children.length,1);console.log({status:'PASS: visible aim, throw, measured miss marks, bounded cable, no lights and disposal',draws});
