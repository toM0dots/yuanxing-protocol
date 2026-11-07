import * as T from './assets/ev01/three.module.mjs';
import {PALETTE as C} from './exo-interior-kit.mjs?v=20261106-sites82';

// Architectural services follow the work done here. All floor details are flush;
// overhead equipment stays above the mech; wall relief fits the collision margin.
export function dressProgramRoom(b,r,profile,deck){
 const id=profile?.id||'hangar',accent=profile?.accent||C.amber;
 const left=r.x-r.w/2+38,right=r.x+r.w/2-38,back=r.y-r.d/2+38,front=r.y+r.d/2-38;
 const stripe=(x,y,w,d,color=accent)=>b.box([x,1.6,y],[w,1.4,d],color,[0,0,0],8);
 if(['pump','cooling','ventilation'].includes(id)){
  // Wall-side supply/return mains; repeated coupling flanges show flow routes.
  for(const side of [-1,1]){
   const z=side<0?back:front;
   for(const h of [315,372]){
    b.beam([left,h,z],[right,h,z],id==='ventilation'?20:12,h===315?accent:C.steel,0);
    for(let x=left+80;x<right;x+=240)b.flange([x,h,z],id==='ventilation'?27:19,[0,0,Math.PI/2]);
   }
   stripe(r.x,z+side*-26,r.w-130,13,0x5f7771);
   for(let x=left+50;x<right;x+=100)stripe(x,z+side*-34,30,8,accent);
  }
  if(id==='ventilation')for(const x of [left+45,right-45]){
   b.box([x,465,r.y],[72,55,r.d-60],0x6e7977);
   for(let z=back+45;z<front;z+=175){b.box([x,461,z],[80,64,8],C.steel,[0,0,0],5);}
  }
 }else if(id==='greenhouse'){
  // Tall irrigation arches and translucent grow-light ribbons over planted bays.
  for(const z of [back+90,r.y,front-90]){
   const pts=[];for(let i=0;i<=12;i++){const a=Math.PI*i/12;pts.push([r.x-Math.cos(a)*(r.w/2-34),330+Math.sin(a)*150,z]);}
   b.tube(pts,5,0x899685,5);
   b.beam([left+80,455,z],[right-80,455,z],4,C.ivory,5);
   for(const side of [-1,1])b.box([r.x+side*r.w*.28,443,z],[r.w*.25,3,9],0xbfcdb1,[0,0,0],2);
  }
  for(const x of [left+15,right-15]){b.beam([x,24,back],[x,24,front],6,0x829183);stripe(x,r.y,15,r.d-140,0x4a6655);}
 }else if(['archive','survey','weather'].includes(id)){
  // Quiet research rooms: deep window-like instruments, cleaner service band,
  // acoustical ceiling ribs and small pools of light instead of factory pipework.
  for(let x=left+80;x<right-30;x+=170){b.box([x,486,r.y],[22,48,r.d-85],C.dark);b.box([x,458,r.y],[3,3,r.d*.52],0xd4d1b9,[0,0,0],2);}
  for(const side of [-1,1]){
   const z=side<0?back:front;
   b.box([r.x,408,z],[Math.min(r.w-150,680),54,8],0x283a3d);
   for(let x=r.x-220;x<=r.x+220;x+=110){b.screen([x,408,z+(side<0?5:-5)],68,34,id==='archive'?1:0,[0,side<0?0:Math.PI,0]);}
  }
  if(id==='weather')for(let i=0;i<12;i++){const a=i*Math.PI/6;stripe(r.x+Math.cos(a)*170,r.y+Math.sin(a)*170,18,4,accent);}
  if(id==='survey'){stripe(r.x,r.y,220,3,C.ivory);stripe(r.x,r.y,3,220,C.ivory);}
 }else if(id==='relay'){
  for(const x of [left+35,right-35]){
   b.box([x,449,r.y],[70,16,r.d-100],C.dark);
   for(let j=-2;j<=2;j++)b.tube([[x+j*7,462,back],[x+j*7,472,r.y],[x+j*7,458,front]],3,j%2?accent:C.rubber);
   for(let z=back+20;z<front;z+=70)b.box([x,468,z],[77,4,5],C.steel,[0,0,0],5);
  }
  for(let i=-3;i<=3;i++)stripe(r.x+i*36,back+30,4,60,accent);
 }else if(['lift','logistics','mining','hangar'].includes(id)){
  // Broad loading bays have overhead travel rails and a suspended cross-beam.
  for(const side of [-1,1]){
   const x=r.x+side*r.w*.34;
   b.box([x,472,r.y],[26,22,r.d-80],C.dark);b.box([x,488,r.y],[52,8,r.d-80],C.steel,[0,0,0],5);
   stripe(x,r.y,7,r.d-120,accent);
   if(id==='lift')for(let j=0;j<3;j++)b.beam([side<0?left:right,30,r.y+j*13-13],[side<0?left:right,490,r.y+j*13-13],2.5,C.steel,5);
  }
  const gantryZ=r.y-r.d*.24;b.box([r.x,439,gantryZ],[r.w*.74,38,48],id==='mining'?0x9d8052:C.case);
  for(let i=-2;i<=2;i++)b.box([r.x+i*r.w*.11,442,gantryZ+25],[25,12,2],accent,[0,0,0],8);
  if(id==='mining')for(const side of [-1,1]){const x=side<0?left:right;b.box([x,95,r.y],[20,180,r.d-110],0x6b6c60,[0,0,0],3);}
  if(id==='logistics')for(const side of [-1,1])for(let k=0;k<3;k++){const x=r.x+side*r.w*.3,z=r.y+(k-1)*r.d*.24;stripe(x,z,140,4,C.ivory);stripe(x-70,z+25,4,50,C.ivory);stripe(x+70,z+25,4,50,C.ivory);}
 }
 // Functional floor zone. Entry and connector lanes remain empty and walkable.
 if(r.purpose==='power')for(let i=0;i<5;i++)stripe(r.x-90+i*45,r.y-170,24,7,0xb28d4c);
}

export function evidenceHardware(b,n,program){
 const x=n.x,z=n.y,id=program?.id||'hangar',accent=program?.accent||C.green;
 // The original interaction point becomes a physical recoverable source.
 b.box([x,8,z],[70,16,52],C.dark);b.box([x,61,z-5],[15,99,17],C.steel,[0,0,0],5);
 b.box([x,112,z],[96,12,68],C.case);
 if(['pump','cooling','ventilation'].includes(id)){
  b.cylinderVessel([x-23,119,z-5],15,43,C.ivory);b.ring([x-23,142,z+11],10,2,C.steel);b.screen([x-23,142,z+13],13,13,0);
  b.box([x+23,130,z],[36,28,42],C.dark);b.screen([x+23,146,z+3],28,27,0,[-Math.PI/2,0,0]);
 }else if(['greenhouse','mining','survey'].includes(id)){
  for(const side of [-1,1]){b.cylinder([x+side*24,130,z-8],[9,23,9],C.ivory);b.cylinder([x+side*24,143,z-8],[10,4,10],accent);}
  b.box([x,125,z+18],[42,5,24],C.dark);b.screen([x,128,z+18],36,20,2,[-Math.PI/2,0,0]);
 }else{
  b.box([x-17,130,z],[44,25,47],C.dark);for(let i=0;i<3;i++){b.box([x-17,124+i*7,z+25],[31,4,3],i===1?accent:C.steel,[0,0,0],i===1?2:5);}
  b.box([x+28,128,z],[23,20,41],C.ivory);b.screen([x+28,139,z],18,33,1,[-Math.PI/2,0,0]);
 }
 for(const side of [-1,1])b.bolt([x+side*38,119,z+24],2,[0,0,0]);
 b.tube([[x+8,30,z-14],[x+21,62,z-15],[x+17,103,z-18]],2.3,C.rubber);
 b.box([x,91,z+7],[42,10,2],accent,[0,0,0],2);
}
