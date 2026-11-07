import * as T from './assets/ev01/three.module.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=45';
import {GLTFLoader} from './assets/ev01/GLTFLoader.mjs';
import {createInteriorMaterials,createInteriorBuilder} from './exo-interior-kit.mjs?v=20261106-sites82';
import {drawRoomStory} from './exo-room-story-art.mjs?v=20261106-lived85';

export const FLAGSHIP='camp-0-0';
const base=new URL('./assets/hangar-v1/',import.meta.url),Y=new T.Vector3(0,1,0);
export async function loadHangarKit(){
 const loader=new T.TextureLoader(),maps={};
 const [gltf]=await Promise.all([new GLTFLoader().loadAsync(new URL('helios-kit.glb',base).href),...['metal-color','metal-normal','panel-color','panel-normal'].map(async name=>{const t=await loader.loadAsync(new URL(name+(name.endsWith('normal')?'-rough.png':'.jpg'),base).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.flipY=false;if(name.endsWith('color'))t.colorSpace=T.SRGBColorSpace;maps[name]=t;if(name.endsWith('normal')){t.userData.normalRough=true;maps[name.replace('normal','rough')]=t;}})]);
 return prepareHangarKit(gltf.scene,maps);
}
export function prepareHangarKit(root,maps={}){
 root.updateMatrixWorld(true);const modules=new Map(),materials=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const source=o.material,name=source.name;
  if(!materials.has(name)){const m=source.clone();m.envMapIntensity=.55;m.roughness=Math.max(.8,m.roughness);m.dithering=true;
   if(['Ivory','Graphite','Steel','Amber'].includes(name)){m.roughnessMap=maps['panel-rough']||null;m.normalMap=maps['panel-normal']||null;m.normalScale=new T.Vector2(.2,.2);}
   if(name==='Ivory'||name==='Amber'){m.map=maps['panel-color']||null;m.metalness=.18;m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 panelSample=texture2D(map,vMapUv);diffuseColor.rgb*=clamp(.78+dot(panelSample.rgb,vec3(.2126,.7152,.0722))*.8,.72,1.08);`);};m.customProgramCacheKey=()=> 'helios-painted-panel';}
   if(name==='Deck'){m.map=maps['metal-color']||null;m.normalMap=maps['metal-normal']||null;m.roughnessMap=maps['metal-rough']||null;m.color.setHex(0xa3afb8);m.normalScale=new T.Vector2(.6,.6);}
   if(name==='Graphite'){m.map=maps['panel-color']||null;m.color.setHex(0xa8b6bf);m.metalness=.48;}
   if(['Light','Status','OrangeLight'].includes(name)){m.emissiveIntensity=2.4;m.toneMapped=false;}
   applyPackedPBR(m);materials.set(name,m);
  }
  const module=o.parent.name,g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!modules.has(module))modules.set(module,[]);modules.get(module).push({geometry:g,material:materials.get(name)});
 });
 return {modules,materials,maps};
}

class KitInstances {
 constructor(kit,group){this.kit=kit;this.group=group;this.rows=new Map();this.meshes=[];this.last='';}
 add(name,p,scale=[1,1,1],yaw=0,condition=null){if(!this.rows.has(name))this.rows.set(name,[]);this.rows.get(name).push({p,condition,matrix:new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromAxisAngle(Y,yaw),new T.Vector3(...scale))});}
 finish(){for(const [name,rows] of this.rows){const parts=this.kit.modules.get(name);if(!parts)throw new Error('Missing hangar kit module: '+name);for(const part of parts){const mesh=new T.InstancedMesh(part.geometry,part.material,rows.length);mesh.name='HELIOS_'+name;mesh.receiveShadow=true;mesh.castShadow=['Crate','Reactor','ServiceArm','DoorFrame'].includes(name)&&!['Light','Status','OrangeLight'].includes(part.material.name);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.rows=rows;this.group.add(mesh);this.meshes.push(mesh);}}}
 update(u,revision='',radius=1900){const key=Math.floor(u.x/80)+','+Math.floor(u.y/80)+','+revision;if(key===this.last)return;this.last=key;for(const mesh of this.meshes){let n=0;for(const r of mesh.userData.rows)if(Math.hypot(r.p[0]-u.x,r.p[2]-u.y)<radius&&(!r.condition||r.condition()))mesh.setMatrixAt(n++,r.matrix);mesh.count=n;mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=null;}}
 dispose(){this.meshes.forEach(m=>m.dispose());this.meshes=[];this.rows.clear();}
}
const steel=new T.MeshStandardMaterial({color:0x465159,metalness:.7,roughness:.44,envMapIntensity:.6}),dark=new T.MeshStandardMaterial({color:0x10191e,metalness:.5,roughness:.72}),amber=new T.MeshStandardMaterial({color:0xbf843a,metalness:.3,roughness:.55}),glow=new T.MeshBasicMaterial({color:0xd5eced,toneMapped:false});
function cuboid(group,p,s,material=steel){const mesh=new T.Mesh(new T.BoxGeometry(...s),material);mesh.position.set(...p);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;group.add(mesh);return mesh;}
function floorUnion(rects,height,material,flip=false){const xs=[...new Set(rects.flatMap(r=>[r.x-r.w/2,r.x+r.w/2]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.y-r.d/2,r.y+r.d/2]))].sort((a,b)=>a-b),p=[],uv=[],n=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;if(!rects.some(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.y)<r.d/2))continue;const a=[xs[i],height,zs[j]],b=[xs[i],height,zs[j+1]],c=[xs[i+1],height,zs[j+1]],d=[xs[i+1],height,zs[j]];for(const v of flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]){p.push(...v);uv.push(v[0]/120,v[2]/120);n.push(0,flip?-1:1,0);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.userData.ownedGeometry=true;return mesh;
}
function labelTexture(title,subtitle,color='#e6dfcd'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.clearRect(0,0,1024,256);c.fillStyle=color;c.font='700 110px system-ui';c.fillText(title,18,125);c.font='28px system-ui';c.fillText(subtitle,24,195);c.fillRect(24,225,900,3);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
function placard(group,title,subtitle,p,width=300,yaw=0,color,labels=true){if(!labels)return;const texture=labelTexture(title,subtitle,color),material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.FrontSide,toneMapped:false});const mesh=new T.Mesh(new T.PlaneGeometry(width,width/4),material);mesh.position.set(...p);mesh.rotation.y=yaw;mesh.userData.cameraIgnore=true;mesh.userData.ownedGeometry=mesh.userData.ownedMaterial=true;group.add(mesh);return mesh;}
function deckSurface(kit){const m=kit.materials.get('Deck').clone();m.color.setHex(0x80919a);m.roughness=.74;m.metalness=.5;m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 panelUV=fract(vMapUv*.6);float seam=1.0-smoothstep(.004,.014,min(min(panelUV.x,1.0-panelUV.x),min(panelUV.y,1.0-panelUV.y)));diffuseColor.rgb*=mix(1.0,.22,seam);`);};m.customProgramCacheKey=()=> 'helios-deck-v1';applyPackedPBR(m);return m;}

export function createHangarArt(scene,kit,{labels=true}={}){
 let group=null,instances=null,key=null,ownMaterial=null;const decorations=[],storyRooms=[],storyMaterials=createInteriorMaterials(kit.maps);
 const keyLight=new T.SpotLight(0xffe7c8,200000,2200,1.15,.72,2);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.bias=-.0001;keyLight.shadow.normalBias=1.3;keyLight.shadow.camera.near=30;keyLight.visible=false;scene.add(keyLight,keyLight.target);
 const fill=new T.PointLight(0x8ccadd,34000,1050,2);fill.visible=false;scene.add(fill);
 function clear(){if(group){scene.remove(group);group.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.ownedMaterial){o.material.map?.dispose();o.material.dispose();}});}instances?.dispose();ownMaterial?.dispose();group=null;instances=null;ownMaterial=null;decorations.length=0;storyRooms.length=0;keyLight.visible=fill.visible=false;}
 function begin(id){group=new T.Group();group.name=id;instances=new KitInstances(kit,group);scene.add(group);}
 function wallRun(w){const length=w.axis?w.w:w.d,count=Math.max(1,Math.ceil(length/160)),yaw=w.axis?(w.side>0?Math.PI:0):(w.side>0?-Math.PI/2:Math.PI/2);
  for(let j=0;j<count;j++){const offset=(j+.5)*length/count-length/2;instances.add('WallBay',[w.x+(w.axis?offset:0),0,w.y+(w.axis?0:offset)],[length/count/160,1,1],yaw);}
 }
 function buildDeck(a){begin('HELIOS_'+a.id);const d=a.deck;ownMaterial=deckSurface(kit);group.add(floorUnion(d.rects,0,ownMaterial),floorUnion(d.rects,d.ceiling,dark,true));
  for(const wall of d.walls)wallRun(wall);
  for(const t of d.links){const vertical=Math.abs(t.a.x-t.b.x)<1,dx=t.b.x-t.a.x,dz=t.b.y-t.a.y,yaw=vertical?0:Math.PI/2,length=Math.hypot(dx,dz),mx=(t.a.x+t.b.x)/2,mz=(t.a.y+t.b.y)/2;
   for(const r of [t.a,t.b]){const sign=r===t.a?1:-1,x=r.x+(vertical?0:Math.sign(dx)*sign*r.w/2),z=r.y+(vertical?Math.sign(dz)*sign*r.d/2:0);instances.add('DoorFrame',[x,0,z],[t.w/330,1,1],yaw);}
   for(let k=0;k<length;k+=300){const t0=k/length,x=t.a.x+dx*t0,z=t.a.y+dz*t0;instances.add('CeilingLight',[x,490,z],[.7,1,1],yaw);}
   for(const side of [-1,1]){const m=cuboid(group,[mx+(vertical?side*(t.w/2-35):0),1.5,mz+(vertical?0:side*(t.w/2-35))],[vertical?5:length,2,vertical?length:5],amber);decorations.push(m);}
  }
  for(const r of d.rooms){
   for(const sx of [-1,1])for(const sz of [-1,1])instances.add('Buttress',[r.x+sx*(r.w/2-26),0,r.y+sz*(r.d/2-45)],[1,1,1],sx<0?Math.PI/2:-Math.PI/2);
   for(const side of [-1,1]){for(let i=-1;i<=1;i++){instances.add('CeilingLight',[r.x+i*230,488,r.y+side*r.d*.27],[1,1,1]);instances.add('PipeRack',[r.x+i*200,452,r.y+side*(r.d/2-80)],[1,1,1]);}const truss=cuboid(group,[r.x,475,r.y+side*r.d*.35],[r.w-40,35,28],steel);decorations.push(truss);}
   placard(group,String(r.id+1).padStart(2,'0'),r.name,[r.x,335,r.y-r.d/2+40],Math.min(360,r.w*.4),0,undefined,labels);
   // Recessed overhead crane, clear of all walking routes.
   if([0,4,11].includes(r.id)){for(const side of [-1,1]){decorations.push(cuboid(group,[r.x+side*260,450,r.y],[25,45,r.d-80],amber));}decorations.push(cuboid(group,[r.x,420,r.y-170],[560,50,55],steel));}
   if(r.id===0){placard(group,'HELIOS','ORBITAL SERVICE / BAY 01',[r.x-r.w/2+40,345,r.y-30],370,Math.PI/2,undefined,labels);}
   if(r.id===6||r.id===12){for(let i=-1;i<=1;i++)instances.add('Terminal',[r.x+i*150,0,r.y-r.d/2+90],[1.3,1.1,1],0);}
   if(a.level===2&&r.id===11){placard(group,'CORE / 03','CONTAINMENT ARRAY',[r.x,370,r.y-r.d/2+42],420,0,'#9ddce8',labels);}
  }
  const replaced=new Set();for(const r of d.rooms){const b=createInteriorBuilder(storyMaterials),slots=drawRoomStory(b,r,d,a.structure.id);if(!slots.size)continue;for(const p of slots)replaced.add(p);const chunk=b.finish();chunk.name='Room left behind / '+r.name;chunk.userData.room=r;chunk.traverse(o=>{if(o.geometry)o.userData.ownedGeometry=true;});storyRooms.push(chunk);group.add(chunk);}
  for(const p of d.props){if(replaced.has(p))continue;const name=p.kind==='service-arm'?'ServiceArm':p.kind==='reactor'||p.room===4?'Reactor':'Crate';instances.add(name,[p.x,0,p.y],name==='Crate'?[p.w/90,p.h/170,p.d/200]:[1,1,1]);}
  for(const n of d.nodes){if(n.kind==='log')continue;const p=[n.x,0,n.y],done=()=>!ExoFacilities.done(n);if(n.kind==='cache')instances.add('Crate',p,[.9,.55,.42],0,done);else if(['next','back','exit'].includes(n.kind)){instances.add('DoorFrame',p,[.72,.57,.6]);placard(group,n.kind==='exit'?'SURFACE':n.kind==='next'?'DESCEND':'ASCEND',n.name,[n.x,195,n.y+33],165,0,'#a6dce3',labels);}else{instances.add(n.kind==='vault'?'Reactor':'Terminal',p,n.kind==='vault'?[.8,1.1,.8]:[1,1,1]);placard(group,n.kind==='relay'?'POWER':n.kind==='vault'?'ARCHIVE':'RECORD',n.name,[n.x,180,n.y+28],110,0,n.kind==='relay'?'#eac17d':'#9adddf',labels);}}
  instances.finish();
 }
 function buildExterior(s){begin('HELIOS_exterior');const {x,y,z,w,d,h}=s;
  // Keep the same structural wall and doorway envelope as the playable building.
  for(const side of [-1,1]){
   for(let i=0;i<7;i++)instances.add('WallBay',[x+side*w/2,z,y-d/2+(i+.5)*d/7],[d/7/160,h/520,1],side<0?-Math.PI/2:Math.PI/2);
   for(let i=0;i<3;i++)instances.add('WallBay',[x+side*(w*.22+(i+.5)*w*.28/3),z,y+d/2],[w*.28/3/160,h/520,1],0);
   for(let i=0;i<4;i++)instances.add('Buttress',[x+side*(w/2+22),z,y-d/2+80+i*(d-160)/3],[1.8,h/490,1.7],side<0?-Math.PI/2:Math.PI/2);
  }
  for(let i=0;i<7;i++)instances.add('WallBay',[x-w/2+(i+.5)*w/7,z,y-d/2],[w/7/160,h/520,1],Math.PI);
  cuboid(group,[x,z+h+8,y],[w+75,22,d+45],dark);
  for(let i=-2;i<=2;i++){cuboid(group,[x+i*200,z+h+38,y],[145,38,d-130],steel);for(let j=-2;j<=2;j++)cuboid(group,[x+i*200,z+h+61,y+j*125],[130,9,65],dark);}
  cuboid(group,[x,z+h-90,y+d/2],[w,180,70],dark);placard(group,'HELIOS / 01','AEGIS ORBITAL MAINTENANCE',[x-300,z+h-82,y+d/2+38],590,0,undefined,labels);
  instances.add('DoorFrame',[x,z,y+d/2+12],[1.42,1.52,1.5]);instances.add('DoorFrame',[s.entrance.x,z,s.entrance.y],[1.08,.8,1]);
  cuboid(group,[x,z-6,y+d/2+125],[440,12,280],dark);
  for(const side of [-1,1]){for(let i=0;i<5;i++){const p=[x+side*193,z+4,y+d/2+20+i*50];cuboid(group,p,[12,4,24],amber);}instances.add('Terminal',[x+side*270,z,y+d/2+100],[1.3,1.4,1.3]);}
  placard(group,'01','BOARDING AIRLOCK',[x-95,z+235,s.entrance.y+24],195,0,'#9cd9df',labels);
  instances.finish();
 }
 function update(u,W,time=0){const a=W.interior,s=W.structures.find(s=>s.id===FLAGSHIP),inside=a?.structure.id===FLAGSHIP,outside=!W.cave&&s&&Math.hypot(u.x-s.x,u.y-s.y)<4000,newKey=inside?a.id:outside?'exterior':null;
  if(key!==newKey){clear();key=newKey;if(inside)buildDeck(a);else if(outside)buildExterior(s);}if(!group)return;
  const p=inside?ExoFacilities.progress(a.structure):null;instances.update(u,p?[p.caches.length,p.relays.length,p.vault].join(':'):'',inside?1800:4800);
  for(const m of decorations)m.visible=Math.hypot(m.position.x-u.x,m.position.z-u.y)<1800;
  for(const room of storyRooms)room.visible=Math.hypot(room.userData.room.x-u.x,room.userData.room.y-u.y)<1800;
  if(inside){const r=ExoFacilities.roomAt(u);keyLight.visible=fill.visible=true;const lx=r?.x??u.x,lz=r?.y??u.y;keyLight.position.set(lx-100,485,lz-140);keyLight.target.position.set(lx+80,0,lz+120);fill.position.set(lx+220,280,lz+200);keyLight.color.setHex(a.level===2?0xb7d8e4:0xffe5c1);keyLight.intensity=r?.id===4?250000:200000;}
 }
 const cameraRay=new T.Raycaster(),cameraOrigin=new T.Vector3(),cameraDirection=new T.Vector3();
 function constrainCamera(target,eye,W){
  update({x:target[0],y:target[1]},W);
  if(!group)return eye;
  group.updateMatrixWorld(true);
  cameraOrigin.set(target[0],target[2],target[1]);cameraDirection.set(eye[0],eye[2],eye[1]).sub(cameraOrigin);
  const distance=cameraDirection.length();if(distance<.01)return eye;
  cameraRay.set(cameraOrigin,cameraDirection.normalize());cameraRay.near=0;cameraRay.far=distance+24;
  // Use the actual Blender meshes, including open doorways, cranes and their crossbars.
  const hit=cameraRay.intersectObjects(group.children.filter(m=>m.visible&&!m.userData.cameraIgnore),false)[0];
  if(!hit)return eye;
  const ratio=Math.min(1,Math.max(1,hit.distance-24)/distance);
  return target.map((v,i)=>v+(eye[i]-v)*ratio);
 }
 return {update,constrainCamera,get group(){return group},get key(){return key},get instances(){return instances},dispose(){clear();storyMaterials.forEach(m=>m.dispose());scene.remove(keyLight,keyLight.target,fill);keyLight.shadow.map?.dispose();}};
}
