import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {createInteriorMaterials,createInstrumentAtlas,createInteriorBuilder,PALETTE as C} from './exo-interior-kit.mjs?v=20261106-sites82';

import {drawProgramProp} from './exo-program-props.mjs?v=20261106-sites82';
import {dressProgramRoom,evidenceHardware} from './exo-program-architecture.mjs?v=20261106-sites82';
import {drawRoomStory} from './exo-room-story-art.mjs?v=20261106-lived85';
import {dressRooms} from './exo-interior-dressing.mjs?v=20261110-contact94b';

// Detailed maintenance architecture shares the original physical deck. The
// central circulation lane and every interaction point remain unchanged.
function labelAtlas(entries){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2**Math.ceil(Math.log2(entries.length*64));const g=canvas.getContext('2d');if(!g)return null;
 for(let i=0;i<entries.length;i++){
  const y=i*64;g.fillStyle='#26302f';g.fillRect(0,y,1024,64);g.fillStyle='#8e9589';g.fillRect(10,y+6,3,52);g.fillStyle='#c7c6b1';g.font='500 29px "PingFang SC","Microsoft YaHei",sans-serif';g.fillText(entries[i],30,y+40,960);
  for(let k=0;k<12;k++){const x=(i*137+k*83)%1024,dy=(k*13+i*5)%64;g.strokeStyle=k%3?'#0c181636':'#e1d9bd19';g.beginPath();g.moveTo(x,y+dy);g.lineTo(x+19+k*3,y+dy-1);g.stroke();}
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const material=new T.MeshStandardMaterial({name:'Bolted maintenance labels',map:texture,roughness:.9,metalness:.12,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 return {material,texture,height:canvas.height,dispose(){material.dispose();texture.dispose();}};
}
function labelMesh(atlas,index,p,w,yaw=0){if(!atlas)return null;const g=new T.PlaneGeometry(w,w/16),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-(index+1-uv.getY(i))*64/atlas.height);const m=new T.Mesh(g,atlas.material);m.position.set(...p);m.rotation.y=yaw;m.name='Mounted maintenance plate';m.userData.cameraIgnore=true;return m;}
function floorGeometry(rects,height=0,flip=false){
 // Union rectangles before triangulation: overlapping corridors otherwise make
 // metallic floors shimmer and draw false lines at every room junction.
 const xs=[...new Set(rects.flatMap(r=>[r.x-r.w/2,r.x+r.w/2]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.y-r.d/2,r.y+r.d/2]))].sort((a,b)=>a-b),p=[],uv=[],n=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;if(!rects.some(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.y)<r.d/2))continue;const a=[xs[i],height,zs[j]],b=[xs[i],height,zs[j+1]],c=[xs[i+1],height,zs[j+1]],d=[xs[i+1],height,zs[j]];for(const v of flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]){p.push(...v);uv.push(v[0]/80,v[2]/80);n.push(0,flip?-1:1,0);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
}
function detailedFloor(material){const compile=material.onBeforeCompile;material.onBeforeCompile=s=>{compile(s);s.vertexShader='varying vec3 deckP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndeckP=position;');s.fragmentShader='varying vec3 deckP;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 cell=fract(deckP.xz/160.);float seam=1.-smoothstep(.004,.012,min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y)));
 float edgeDust=1.-smoothstep(.01,.055,min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y)));
 float scuff=pow(.5+.5*sin(deckP.x*.025+sin(deckP.z*.038)*2.),8.)*.11;
 diffuseColor.rgb*=1.-seam*.65-edgeDust*.12-scuff;`);};material.customProgramCacheKey=()=> 'facility-scanned-deck-v81';return material;}

function wallDetail(b,w,profile){
 const length=w.axis?w.w:w.d,count=Math.max(1,Math.ceil(length/(['archive','survey','weather'].includes(profile?.id)?175:160))),width=length/count;
 const at=(along,height,inset=0)=>[w.x+(w.axis?along:-w.side*inset),height,w.y+(w.axis?-w.side*inset:along)];
 const box=(along,height,inset,span,h,depth,color,kind=0)=>b.box(at(along,height,inset),[w.axis?span:depth,h,w.axis?depth:span],color,[0,0,0],kind);
 // The thick shell remains at the original collision plane. All relief stays
 // within its 35-unit physical player margin.
 box(0,29,11,length,52,8,C.dark);box(0,70,14,length,9,8,C.steel,5);
 box(0,408,10,length,28,14,C.dark);box(0,455,12,length,12,14,C.steel,5);
 for(let j=0;j<count;j++){
  const along=(j+.5)*width-length/2;
  box(along,232,10,width-5,302,9,C.dark);box(along,231,16,width-15,287,7,profile?.wall||C.case);
  box(along-width/2+5,234,21,3,300,4,C.steel,5);
  for(const sx of [-1,1])for(const z of [103,359])b.bolt(at(along+sx*(width*.5-17),z,22),2.4,w.axis?[Math.PI/2,0,0]:[0,0,Math.PI/2]);
  if(j%4===1){const p=at(along,220,21),yaw=w.axis?(w.side>0?Math.PI:0):(w.side>0?-Math.PI/2:Math.PI/2);b.vent(p,Math.min(79,width-22),74,[0,yaw,0]);}
  if(j%3===0){box(along,90,22,30,10,2,C.amber,8);box(along+20,90,22,4,10,2,C.dark,8);}
 }
 // Electrical conduit and retainers run high enough to clear weapon sockets.
 b.beam(at(-length/2,382,18),at(length/2,382,18),4,C.dark);
 for(let d=32;d<length;d+=180)box(d-length/2,382,19,8,18,10,C.steel,5);
}
function roomDetails(b,r,lights,profile){
 const research=['archive','survey','weather'].includes(profile?.id),cultivation=profile?.id==='greenhouse',quiet=research||cultivation;
 for(const side of [-1,1]){
  const z=r.y+side*(r.d/2-65);
  if(!quiet){
  for(const offset of [-12,12])b.beam([r.x-r.w/2+35,452+offset*.2,z+offset],[r.x+r.w/2-35,452+offset*.2,z+offset],offset<0?8:5,offset<0?C.case:C.dark,offset<0?0:5);
  for(let d=70;d<r.w;d+=190){const x=r.x-r.w/2+d;b.box([x,473,z],[5,51,47],C.steel,[0,0,0],5);b.flange([x,452-2.4,z-12],12,[0,0,Math.PI/2]);}
  }
  // An open ladder cable tray and suspended lamp housing, not a luminous stripe.
  const trayZ=r.y+side*r.d*.27;
  if(!quiet){for(const dz of [-22,22])b.beam([r.x-r.w/2+55,470,trayZ+dz],[r.x+r.w/2-55,470,trayZ+dz],3,C.steel,5);
  for(let x=r.x-r.w/2+65;x<r.x+r.w/2-55;x+=50)b.box([x,468,trayZ],[4,4,44],C.steel,[0,0,0],5);}else b.box([r.x,474,trayZ],[r.w-110,12,18],profile.wall);
  for(let j=-1;j<=1;j++){const x=r.x+j*230;b.luminaire([x,456,trayZ],104);lights.push({x,y:446,z:trayZ,room:r.id,color:profile?.light||0xffe6be});}
  if(!quiet)b.tube([[r.x-r.w/2+65,472,trayZ],[r.x-180,478,trayZ-10],[r.x+80,474,trayZ+5],[r.x+r.w/2-65,470,trayZ]],3.1,C.rubber);
 }
 // Faded floor thresholds and drainage are flush visual layers.
 for(const side of [-1,1]){
  const x=r.x+side*(r.w/2-42);b.box([x,1,r.y],[21,2,r.d-84],C.dark);
  if(research)b.box([x,2.2,r.y],[4,1.2,r.d-84],profile.accent,[0,0,0],8);
  else for(let d=-r.d/2+50;d<r.d/2-45;d+=16)b.box([x,2.2,r.y+d],[19,1.2,3],C.steel,[0,0,0],5);
 }
 if(r.kind==='arrival'||r.kind==='command'){
  for(let i=0;i<12;i++){const a=i*Math.PI/6;b.box([r.x+Math.cos(a)*150,1.2,r.y+Math.sin(a)*150],[28,1.4,5],i%3?C.ivory:C.amber,[0,-a,0],8);}
  b.box([r.x,1,r.y+118],[186,1.5,5],C.amber,[0,0,0],8);
 }
}
function crate(b,p,color=C.case){const {x,y,w,d,h}=p;b.box([x,h/2,y],[w-6,h-5,d-6],color);b.box([x,h-7,y],[w,12,d],C.steel,[0,0,0],5);
 for(const sx of [-1,1])for(const sy of [-1,1]){b.box([x+sx*(w/2-7),h/2,y+sy*(d/2-7)],[10,h,10],C.dark);b.box([x+sx*(w/2-8),12,y+sy*(d/2-10)],[15,19,18],C.steel,[0,0,0],5);}
 for(const side of [-1,1]){const z=y+side*(d/2-1);b.box([x,h*.53,z],[w*.57,h*.64,3],0x929486);for(const sx of [-1,1]){b.box([x+sx*w*.28,h-25,z+side*3],[12,30,8],C.dark);b.box([x+sx*w*.28,h-23,z+side*8],[7,12,4],C.steel,[0,0,0],5);}b.box([x,h*.6,z+side*3],[Math.min(35,w*.4),13,4],C.dark);b.box([x,h*.6+1,z+side*6],[Math.min(27,w*.3),5,2],C.steel,[0,0,0],5);b.box([x-13,h*.24,z+side*3],[21,12,1],C.ivory,[0,0,0],8);}
}
function machinery(b,p,theme){if(drawProgramProp(b,p))return;const {x,y,w,d,h}=p;
 if(p.kind==='crate'){crate(b,p);return;}
 if(p.kind==='server'||p.kind==='relay'){
  b.box([x,h/2,y],[w,h,d],C.dark);for(const side of [-1,1])b.box([x+side*(w/2-5),h/2,y+d/2-5],[6,h,8],C.steel,[0,0,0],5);
  for(let z=21;z<h-12;z+=25){b.box([x,z,y+d/2-1],[w-15,20,6],C.case);b.vent([x+9,z,y+d/2+3],w-46,11);b.box([x-w/2+16,z,y+d/2+7],[3,3,2],z%3?C.green:C.amber,[0,0,0],2);b.box([x-w/2+24,z,y+d/2+6],[6,7,4],C.dark);}
  b.tube([[x-w/2+8,h-12,y-d/2+5],[x-w/2+18,h-40,y-d/2+10],[x-w/2+14,21,y-d/2+8]],3,C.rubber);return;
 }
 if(['refinery','mining','lift'].includes(p.kind)){
  const radius=Math.min(w*.33,d*.33);b.cylinderVessel([x,15,y],radius,h-55);b.box([x,7,y],[w-8,14,d-8],C.dark);
  for(const side of [-1,1]){const px=x+side*(w/2-18);b.tube([[px,20,y],[px,h-35,y],[x+side*radius*.9,h-35,y]],6,C.steel,5);b.flange([px,80,y],11);b.flange([px,h-60,y],11);}
  b.ring([x,140,y+radius+3],19,3,C.steel);b.screen([x,140,y+radius+4],25,23,0);b.beam([x+radius*.7,35,y+radius*.4],[x+radius*.7,150,y+radius*.4],4,C.dark);
  if(p.kind==='mining'){for(let i=0;i<7;i++)b.ring([x,45+i*21,y],radius+3,4,C.steel,[Math.PI/2,0,0],5);}return;
 }
 if(p.kind==='observatory'){
  b.box([x,17,y],[w-8,34,d-8],C.dark);b.cylinder([x,65,y],[31,100,31],C.steel,[0,0,0],5);b.cylinderVessel([x,110,y],Math.min(w*.37,70),90,C.ivory);
  b.cylinder([x,190,y-40],[26,95,26],C.dark,[.8,0,0]);b.ring([x,220,y-70],28,4,C.steel,[.8,0,0],5);
  for(const side of [-1,1])b.beam([x+side*50,35,y],[x+side*45,160,y],5,C.steel,5);b.tube([[x+36,160,y],[x+53,125,y+20],[x+40,30,y+25]],4,C.rubber);return;
 }
 if(p.kind==='habitat'){
  b.box([x,12,y],[w-8,24,d-8],C.dark);for(const side of [-1,1])b.box([x+side*(w/2-12),h/2,y],[12,h,d-20],C.case);
  for(let j=0;j<3;j++){const z=35+j*77;b.box([x,z,y],[w-20,9,d-15],C.steel,[0,0,0],5);b.box([x,z+9,y],[w-28,15,d-27],0x282e25);for(let i=0;i<4;i++){const px=x+(i%2-.5)*70,py=y+(Math.floor(i/2)-.5)*76;b.cylinder([px,z+22,py],[20,19,20],0x515a40);for(const side of [-1,1])b.add(new T.SphereGeometry(1,8,6),[px+side*7,z+37,py],[14,4,10],0x526749,[0,0,side*.7]);}}return;
 }
 // A service cradle occupies exactly the previous machine proxy.
 b.box([x,18,y],[w-8,36,d-10],C.dark);for(const side of [-1,1]){const px=x+side*(w/2-22);b.box([px,h*.47,y],[24,h*.82,45],C.case);b.beam([px,65,y+25],[px,h*.75,y-25],7,C.steel,5);b.cylinder([px,h*.76,y],[18,26,18],C.dark,[Math.PI/2,0,0]);b.beam([px,h*.76,y],[x+side*20,h*.58,y-35],9,C.steel,5);b.tube([[px,42,y-25],[px+side*8,h*.68,y-28],[x+side*20,h*.58,y-38]],3,C.rubber);}b.box([x,h-12,y],[w-4,24,40],C.case);b.box([x,h-10,y+22],[w*.6,8,3],C.amber,[0,0,0],8);
 for(const side of [-1,1]){
  const px=x+side*(w/2-22);
  for(const zz of [-1,1]){b.box([px,8,y+zz*(d/2-16)],[35,8,24],C.steel,[0,0,0],5);b.bolt([px,13,y+zz*(d/2-16)],3.6,[0,0,0]);}
  for(const z of [48,h*.72,h-10])b.bolt([px,z,y+24],3.2);
  b.ring([px,h*.76,y+16],13,3,C.steel);b.bolt([px,h*.76,y+20],5);
  b.beam([px+side*7,55,y-26],[px+side*7,h*.61,y-26],4,C.ivory,5);
  b.beam([px+side*7,55,y-26],[px+side*7,h*.38,y-26],7,C.dark);
  b.flange([px+side*7,h*.38,y-26],10);
 }
 b.box([x+w/2-25,112,y+30],[30,48,16],C.dark);b.screen([x+w/2-25,118,y+39],23,25,0);
 b.tube([[x+w/2-25,87,y+31],[x+w/2-40,57,y+28],[x+w/2-34,32,y+3]],2.3,C.rubber);

}
function terminal(b,n,theme,program){if(n.kind==='log'){evidenceHardware(b,n,program);return;}const {x,y}=n,color=n.kind==='relay'?C.amber:C.green;
 if(['back','exit','next'].includes(n.kind)){
  b.box([x,1,y],[176,2,116],C.dark);for(const side of [-1,1]){b.box([x+side*87,77,y],[14,154,22],C.case);b.box([x+side*87,76,y+13],[4,105,4],C.dark);for(let i=0;i<3;i++)b.box([x+side*87,40+i*31,y+16],[3,13,2],color,[0,0,0],2);for(const h of [20,133])b.bolt([x+side*87,h,y+14]);}b.box([x,156,y],[186,17,25],C.dark);b.box([x,156,y+14],[145,10,2],C.ivory,[0,0,0],8);return;
 }
 if(n.kind==='cache'){crate(b,{x,y,w:90,d:65,h:70},0x79816c);b.box([x,43,y+34],[24,5,2],color,[0,0,0],2);return;}
 if(n.kind==='vault'){
  b.cylinder([x,10,y],[72,20,72],C.dark);b.cylinderVessel([x,22,y],43,130,C.ivory);for(const side of [-1,1]){b.beam([x+side*60,8,y],[x+side*60,155,y],6,C.steel,5);b.beam([x+side*60,155,y],[x+side*30,155,y],5,C.steel,5);}b.ring([x,90,y+44],25,5,C.dark);b.screen([x,90,y+45],34,34,1);return;
 }
 // A recessed instrument behind a gasket, physical buttons and side handles.
 b.box([x,5,y],[66,10,43],C.dark);b.box([x,55,y-3],[42,102,29],C.case);b.box([x,107,y],[80,65,37],C.dark,[.12,0,0]);b.box([x,108,y+18],[71,54,5],C.steel,[.12,0,0],5);b.box([x,112,y+22],[59,39,3],C.rubber,[.12,0,0]);b.screen([x,112,y+24],53,33,n.kind==='relay'?0:1,[.12,0,0]);
 b.box([x,74,y+21],[79,14,33],C.case,[-.16,0,0]);for(let i=0;i<5;i++){b.cylinder([x-24+i*12,84,y+26],[3.5,3,3.5],i===4?color:C.dark);if(i===4)b.cylinder([x-24+i*12,86,y+26],[2.1,1,2.1],color,[0,0,0],2);}for(const side of [-1,1]){b.beam([x+side*42,89,y+14],[x+side*42,131,y+9],3,C.steel,5);b.bolt([x+side*31,129,y+24]);b.bolt([x+side*31,92,y+24]);}
 b.tube([[x+17,22,y-17],[x+23,42,y-17],[x+18,78,y-16]],3,C.rubber);
}

export function createFacilityLayer(scene,{labels=true,exclude=()=>false,maps={},props=null}={}){
 let key=null,group=null,plates=null,lightingAnchor=null,dressed=null;const nodes=new Map(),rooms=[],fixtures=[],materials=createInteriorMaterials(maps),atlas=createInstrumentAtlas(),floorMat=materials[5].clone(),roofMat=new T.MeshStandardMaterial({name:'Dark service ceiling',color:0x343b38,roughness:.94,metalness:.12,side:T.DoubleSide});
 floorMat.onBeforeCompile=materials[5].onBeforeCompile;detailedFloor(floorMat);floorMat.color.setHex(0x7d8983);floorMat.vertexColors=false;
 const lightPool=Array.from({length:4},(_,i)=>{const l=new T.SpotLight(i===0?0xffe6be:0xd9e2d5,150000,1250,1.15,.72,2);l.visible=false;l.castShadow=i===0;l.shadow.mapSize.set(512,512);l.shadow.camera.near=20;l.shadow.normalBias=1.2;l.shadow.bias=-.0002;scene.add(l,l.target);return l;});
 function clear(){dressed=null;if(group){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.userData.ownsMaterial){o.material.map?.dispose();o.material.dispose();}});group=null;}plates?.dispose();plates=null;lightingAnchor=null;nodes.clear();rooms.length=0;fixtures.length=0;for(const l of lightPool)l.visible=false;}
 function build(active){
  const {deck,plan}=active,program=plan.program;
  floorMat.color.setHex(program?.floor||0x7d8983);roofMat.color.setHex(['archive','survey','weather','greenhouse'].includes(program?.id)?0x56635d:0x343b38);
  group=new T.Group();group.name=active.id;plates=labels?labelAtlas([...deck.rooms.map(r=>String(r.id+1).padStart(2,'0')+' / '+r.name),...deck.nodes.map(n=>n.name)]):null;
  for(const [h,material,flip] of [[0,floorMat,false],[deck.ceiling,roofMat,true]]){const m=new T.Mesh(floorGeometry(deck.rects,h,flip),material);m.receiveShadow=true;group.add(m);}
  const shell=createInteriorBuilder(materials,atlas),builders=new Map(deck.rooms.map(r=>[r.id,createInteriorBuilder(materials,atlas)]));
  for(const wall of deck.walls){shell.box([wall.x,deck.ceiling/2,wall.y],[wall.w,deck.ceiling,wall.d],0x525d59);const room=deck.rooms.reduce((a,r)=>Math.hypot(r.x-wall.x,r.y-wall.y)<Math.hypot(a.x-wall.x,a.y-wall.y)?r:a);wallDetail(builders.get(room.id),wall,program);}
  for(const t of deck.links){const vertical=Math.abs(t.a.x-t.b.x)<1,dx=t.b.x-t.a.x,dy=t.b.y-t.a.y;for(const r of [t.a,t.b]){const b=builders.get(r.id),sign=r===t.a?1:-1,x=r.x+(vertical?0:Math.sign(dx)*sign*r.w/2),y=r.y+(vertical?Math.sign(dy)*sign*r.d/2:0);for(const side of [-1,1]){b.box([x+(vertical?side*(t.w/2-7):0),235,y+(vertical?0:side*(t.w/2-7))],[vertical?16:29,470,vertical?29:16],C.dark);b.box([x+(vertical?side*(t.w/2-9):0),108,y+(vertical?0:side*(t.w/2-9))],[vertical?7:31,96,vertical?31:7],C.amber,[0,0,0],8);}b.box([x,474,y],[vertical?t.w:29,20,vertical?29:t.w],C.case);b.box([x,1.2,y],[vertical?t.w-12:26,1.5,vertical?26:t.w-12],C.amber,[0,0,0],8);}}
  group.add(shell.finish());
  for(const r of deck.rooms){const b=builders.get(r.id);roomDetails(b,r,fixtures,program);dressProgramRoom(b,r,program,deck);const replaced=drawRoomStory(b,r,deck,active.structure.id);for(const p of deck.props.filter(p=>p.room===r.id&&!replaced.has(p)))machinery(b,p,plan.theme);const chunk=b.finish();chunk.name='Detailed room / '+r.name;chunk.userData.room=r;rooms.push(chunk);group.add(chunk);
   if(plates){const m=labelMesh(plates,r.id,[r.x,338,r.y-r.d/2+23],Math.min(r.w*.45,370));if(m)chunk.add(m);}
  }
  dressed=dressRooms(props,active,rooms,fixtures);
  for(const [i,n] of deck.nodes.entries()){if(n.kind==='log')continue;const b=createInteriorBuilder(materials,atlas);terminal(b,n,plan.theme,program);const root=b.finish();root.name='Interactive equipment / '+n.name;root.userData.node=n;nodes.set(n.id,root);group.add(root);if(plates){const isPortal=['back','exit','next'].includes(n.kind),p=[n.x,isPortal?157:n.kind==='cache'?34:n.kind==='vault'?173:n.kind==='log'?102:48,n.y+(isPortal?16:n.kind==='cache'?38:n.kind==='vault'?46:n.kind==='log'?9:16)],width=isPortal?141:n.kind==='cache'?55:n.kind==='vault'?75:n.kind==='log'?62:35;const m=labelMesh(plates,deck.rooms.length+i,p,width);if(m)root.add(m);}}
  scene.add(group);
 }
 function update(u,W){
  const active=W.interior&&!exclude(W.interior)?W.interior:null,newKey=active?.id||null;if(newKey!==key){clear();key=newKey;if(active)build(active);}if(!active)return;
  for(const r of rooms){const room=r.userData.room;r.visible=Math.hypot(u.x-room.x,u.y-room.y)<2300;}
  dressed?.update(u);
  // Select real ceiling housings. Their positions stay fixed as the player moves.
  if(!lightingAnchor||Math.hypot(u.x-lightingAnchor.x,u.y-lightingAnchor.y)>70){
   // Practical lamps in hand-dressed rooms win over ceiling housings nearby.
   const reach=f=>Math.hypot(f.x-u.x,f.z-u.y)-(f.practical?650:0),near=fixtures.slice().sort((a,b)=>reach(a)-reach(b)).slice(0,4);
   lightPool.forEach((l,i)=>{const p=near[i];l.visible=!!p;if(!p)return;l.position.set(p.x,p.y,p.z);l.target.position.set(p.x,0,p.z);l.userData.fixture=p;l.color.setHex(p.color);l.intensity=(i===0?650000:360000)*(p.gain??1);});lightingAnchor={x:u.x,y:u.y};
  }
  for(const root of nodes.values()){const n=root.userData.node,done=ExoFacilities.done(n);root.visible=!(done&&n.kind==='cache')&&Math.hypot(n.x-u.x,n.y-u.y)<2300;}
 }
 return {update,get group(){return group},nodes,lightPool,fixtures,dispose(){clear();lightPool.forEach(l=>{scene.remove(l,l.target);l.shadow.map?.dispose();});floorMat.dispose();roofMat.dispose();materials.forEach(m=>m.dispose());atlas?.dispose();}};
}
