import * as T from './assets/ev01/three.module.mjs';

// Shared instancing keeps the entire maintenance yard under ten prop draws.
// Light is painted/emissive: there are deliberately no new Light objects.
export function createDepotView(scene,W,S,maps={}){
 const root=new T.Group();root.name='East spare-parts depot';scene.add(root);
 const steel=new T.MeshStandardMaterial({color:0xb4b9a7,emissive:0x4c5549,emissiveIntensity:.18,roughness:.87,metalness:.2,map:maps['panel-color']||null,normalMap:maps['panel-normal']||null,normalScale:new T.Vector2(.45,.45)});
 const dark=new T.MeshStandardMaterial({color:0x545b54,emissive:0x30392f,emissiveIntensity:.14,roughness:.94,metalness:.25,map:maps['panel-color']||null});
 const shell=new T.MeshStandardMaterial({color:0x9d9b7b,emissive:0x3f4938,emissiveIntensity:.15,roughness:.7,metalness:.42,map:maps['panel-color']||null});
 const glow=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 const water=new T.MeshStandardMaterial({color:0x344b48,roughness:.26,metalness:.25,transparent:true,opacity:.72,depthWrite:false});
 const geos={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(.5,.5,1,12),sphere:new T.SphereGeometry(.5,10,7),water:new T.CircleGeometry(1,32),ring:new T.TorusGeometry(1,.025,3,32)};
 const pools={};
 for(const [key,g,m] of [['steel','box',steel],['dark','box',dark],['glow','box',glow],['pipe','cylinder',steel],['rubber','cylinder',dark],['shell','sphere',shell],['eye','sphere',glow],['water','water',water],['ring','ring',glow]]){const mesh=new T.InstancedMesh(geos[g],m,600);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);pools[key]={mesh,n:0};}
 const waterPatches=new Map();
 const pose=new T.Object3D(),color=new T.Color(),open=new Map(),up=new T.Vector3(0,1,0),direction=new T.Vector3();
 const off=0x56605b,on=0xb6db9b,amber=0xda9252;
 function part(key,x,z,y,sx,sz,sy,rx=0,ry=0,rz=0,tint){const p=pools[key];if(p.n>=600)return;pose.position.set(x,z,y);pose.scale.set(sx,sz,sy);pose.rotation.set(rx,ry,rz);pose.updateMatrix();p.mesh.setMatrixAt(p.n,pose.matrix);if(tint!==undefined){color.setHex(tint);p.mesh.setColorAt(p.n,color);}p.n++;}
 function beam(key,ax,az,ay,bx,bz,by,width=8,depth=8){const p=pools[key];if(p.n>=600)return;direction.set(bx-ax,bz-az,by-ay);const length=direction.length();pose.position.set((ax+bx)/2,(az+bz)/2,(ay+by)/2);pose.scale.set(width,length,depth);pose.quaternion.setFromUnitVectors(up,direction.normalize());pose.updateMatrix();p.mesh.setMatrixAt(p.n++,pose.matrix);}
 function fixture(t,x,y,z,time){
  const lit=t.state.powered?on:off,bad=t.state.broken;
  if(t.kind==='reel'){part('dark',x,z+3,y,55,6,45);for(const d of [-13,13])part('pipe',x+d,z+24,y,42,4,42,0,0,Math.PI/2);part('rubber',x,z+24,y,30,25,30,0,0,Math.PI/2);part('glow',x,z+24,y+16,15,4,2,0,0,0,on);return;}
  if(t.kind==='anchor'){part('dark',x,z+4,y,65,8,65);part('pipe',x,z+22,y,15,40,15);part('steel',x,z+42,y,45,10,15);for(const side of [-1,1])part('pipe',x+side*21,z+8,y+19,6,14,6);return;}
  if(t.kind==='plate'){part('dark',x,z+2,y,136,4,136);part('steel',x,z+(t.state.pressed?3:7),y,125,6,125);for(const side of [-1,1])part('glow',x+side*57,z+11,y,4,2,110,0,0,0,t.state.pressed?on:amber);return;}
  if(t.kind==='gap'){for(const side of [-1,1])part('steel',x+side*101,z+27,y,9,50,170);part('rubber',x,z+14,y,22,185,22,Math.PI/2);return;}
  if(t.kind==='pylon'){
   const v=(open.get(t.id)??(t.state.fallen?1:0))*.85+(t.state.fallen?1:0)*.15;open.set(t.id,v);const angle=t.state.fallAngle||0,tip={x:x+Math.cos(angle)*Math.sin(v*Math.PI/2)*t.height,y:y+Math.sin(angle)*Math.sin(v*Math.PI/2)*t.height,z:z+18+Math.cos(v*Math.PI/2)*t.height};
   part('dark',x,z+5,y,68,10,68);for(const side of [-1,1])beam('steel',x+side*14,z+18,y,tip.x+side*14,tip.z,tip.y,9,13);for(let i=0;i<=8;i++){const f=i/8;beam('steel',x-14+(tip.x-x)*f,z+18+(tip.z-z-18)*f,y+(tip.y-y)*f,x+14+(tip.x-x)*f,z+18+(tip.z-z-18)*f,y+(tip.y-y)*f,7,20);}return;
  }
  if(t.kind==='debris'){
   for(const side of [-1,1]){part('steel',x+side*43,z+30,y,10,60,80,0,0,side*.13);part('dark',x,z+side*18+32,y,96,9,84,0,0,.09);}beam('steel',x-40,z+12,y-30,x+44,z+61,y+32,9,8);part('pipe',x,z+56,y+43,10,25,10,0,0,Math.PI/2);return;
  }
  if(t.kind==='cart'){
   part('steel',x,z+24,y,90,10,130);for(const side of [-1,1])for(const end of [-1,1])part('rubber',x+side*42,z+12,y+end*47,24,12,24,0,0,Math.PI/2);for(const [dx,dy] of [[-20,-31],[21,-28],[0,31]]){part('dark',x+dx,z+42,y+dy,33,30,40,0,.08*dx);part('steel',x+dx,z+45,y+dy+21,27,3,2);}part('steel',x,z+32,y+70,40,5,8);return;
  }
  if(t.kind==='water'){
   let patch=waterPatches.get(t.id);if(!patch){const geometry=new T.CircleGeometry(t.radius,40),positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const dx=positions.getX(i),dy=positions.getY(i);positions.setXYZ(i,dx,W.elevation(x+dx,y+dy)-z+1.3,dy);}for(let i=0;i<geometry.index.count;i+=3){const a=geometry.index.getX(i+1);geometry.index.setX(i+1,geometry.index.getX(i+2));geometry.index.setX(i+2,a);}geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,water),arcGeometry=new T.BufferGeometry(),arcPositions=new Float32Array(40*2*3);arcGeometry.setAttribute('position',new T.BufferAttribute(arcPositions,3));const arcMaterial=new T.LineBasicMaterial({color:0xc4dfac,transparent:true,opacity:.48,depthWrite:false}),arc=new T.LineSegments(arcGeometry,arcMaterial);root.add(mesh,arc);patch={mesh,arc,geometry,arcGeometry,arcMaterial,arcPositions,at:-1};waterPatches.set(t.id,patch);}
   patch.mesh.visible=true;patch.mesh.position.set(x,z,y);patch.arc.visible=!!t.state.powered;patch.arc.position.set(x,z,y);
   const stamp=Math.floor(time*10);if(t.state.powered&&stamp!==patch.at){patch.at=stamp;const r=24+(time*24)%80;for(let i=0;i<40;i++)for(let end=0;end<2;end++){const a=(i+end)*Math.PI*2/40,dx=Math.sin(a)*r,dy=Math.cos(a)*r,index=(i*2+end)*3;patch.arcPositions[index]=dx;patch.arcPositions[index+1]=W.elevation(x+dx,y+dy)-z+2;patch.arcPositions[index+2]=dy;}patch.arcGeometry.attributes.position.needsUpdate=true;patch.arcGeometry.computeBoundingSphere();}return;
  }
  if(t.kind==='cable'){const a=S.things.get(t.ends?.[0]),b=S.things.get(t.ends?.[1]);if(!a||!b)return;const length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.x-a.x,b.y-a.y);part('dark',(a.x+b.x)/2,z+29,(a.y+b.y)/2,5,5,length,0,angle);part('glow',(a.x+b.x)/2,z+32,(a.y+b.y)/2,1,1,length,0,angle,0,lit);return;}
  if(t.kind==='creature'){
   const a=S.things.get(t.state.target),yaw=a?Math.atan2(a.x-x,a.y-y):0;
   part('shell',x,z+14,y,36,23,56,0,yaw);for(let i=0;i<4;i++)part('shell',x,z+18-i*1.5,y-17+i*10,35-i*4,12,15,0,yaw);
   for(let i=0;i<4;i++)for(const side of [-1,1]){const sway=t.state.stunned?0:Math.sin(time*9+i*1.2)*.15;part('pipe',x+side*22,z+7,y-16+i*10,3,31,3,0,.4*side,side*(1+sway));part('pipe',x+side*34,z+4,y-12+i*10,2,16,2,0,0,side*.4);}
   part('eye',x,z+17,y+26,14,5,7,0,0,0,t.state.stunned?amber:t.state.feeding?on:0x869d8d);return;
  }
  if(t.kind==='gate'||t.kind==='door'){
   const size=t.size||[120,140,16],target=t.state.open?1:0,v=(open.get(t.id)??target)*.82+target*.18;open.set(t.id,v);
   for(const side of [-1,1]){part('steel',x+side*(size[0]/2+8),z+size[1]/2,y,14,size[1]+20,28);part('dark',x+side*(size[0]/2+14),z+4,y,34,8,45);}
   part('steel',x,z+size[1]+8,y,size[0]+40,18,28);part('dark',x,z+size[1]/2+v*size[1]*.9,y,size[0],size[1]*(1-v*.8),size[2]);
   for(let i=0;i<6;i++)part('steel',x,z+(i+.5)*size[1]/6*(1-v*.8)+v*size[1]*.9,y+size[2]/2+1,size[0]-4,3,2);
   part('glow',x-size[0]/2-10,z+60,y+16,4,22,2,0,0,0,t.state.open?on:amber);return;
  }
  if(t.kind==='lamp'){
   part('dark',x,z+4,y,65,8,65);part('pipe',x,z+62,y,10,118,10);part('steel',x,z+119,y,42,8,27);part('glow',x,z+112,y+5,34,8,20,0,0,0,lit);part('steel',x,z+35,y+10,28,45,20);
  }else if(t.kind==='pump'){
   part('dark',x,z+8,y,75,16,65);part('pipe',x,z+38,y,46,60,46,0,0,Math.PI/2);part('rubber',x+34,z+36,y,52,8,52,0,0,Math.PI/2);
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5+(t.state.powered?time*7:0);part('steel',x+40,z+36+Math.sin(a)*13,y+Math.cos(a)*13,3,20,5,a,0,0);}
   part('pipe',x-15,z+20,y+40,13,65,13,Math.PI/2);part('glow',x,z+60,y,24,3,9,0,0,0,lit);
  }else if(t.kind==='terminal'){
   part('dark',x,z+5,y,58,10,44);part('steel',x,z+43,y,42,74,30);part('dark',x,z+48,y+16,33,45,3);part('glow',x,z+68,y+19,24,4,2,0,0,bad?.15:0,bad?amber:lit);for(let i=0;i<4;i++)part('dark',x,z+22+i*4,y+16,22,1,2);
  }else if(t.kind==='crate'||t.kind==='cache'){
   const size=t.size||[50,37,40];part('steel',x,z+size[1]/2,y,...size);for(const side of [-1,1]){part('dark',x+side*size[0]*.38,z+size[1]/2,y,5,size[1]+2,size[2]+2);part('pipe',x+side*size[0]*.46,z+size[1]/2,y+size[2]/2,4,size[1]-10,4);}
   part('dark',x,z+size[1]+1,y,size[0]+3,3,size[2]+3);part('glow',x,z+size[1]*.5,y+size[2]/2+1,16,5,2,0,0,-.08,t.state.powered?on:0x9b936c);
  }else if(t.kind==='filter'){
   part('pipe',x,z+28,y,36,56,36);for(const h of [4,16,40,52])part('rubber',x,z+h,y,39,4,39);part('steel',x,z+58,y,17,6,17);
  }
  if(t.socket){part('dark',x+19,z+22,y+20,19,29,13);part('glow',x+28,z+26,y+28,2,16,2,0,0,0,bad?amber:lit);}
 }
 function update(unit,world,time=0){
  root.visible=S.available!==false;if(!root.visible)return;
  for(const p of Object.values(pools))p.n=0;for(const p of waterPatches.values()){p.mesh.visible=false;p.arc.visible=false;}
  const rows=S.things.near(S.point(unit,world),950).filter(t=>t.zone==='depot'&&t.kind!=='battery');
  for(const t of rows)fixture(t,t.x,t.y,world.elevation(t.x,t.y)+(t.z||0),time);
  const held=S.carry.hand();if(held){fixture(held,unit.x+Math.sin(unit.angle)*55,unit.y-Math.cos(unit.angle)*55,world.elevation(unit.x,unit.y)+(unit.altitude||0)+65,time);}
  // The loading canopy is weathered and open-sided, so every system remains
  // visible from the approach without a separate map or loading transition.
  if(!world.interior&&!world.cave&&Math.hypot(unit.x-6100,unit.y-7100)<1200){for(const x of [5660,6000,6340,6680])for(const y of [6740,7390]){const z=world.elevation(x,y);part('steel',x,z+105,y,12,210,12);part('dark',x,z+4,y,50,8,50);}for(const y of [6740,7390])part('steel',6170,world.elevation(6170,y)+211,y,1040,14,16);part('dark',6080,world.elevation(6080,6740)+214,6830,660,8,180,0,0,.018);}
  for(const f of S.signals){const t=S.things.get(f.id);if(!t||Math.hypot(t.x-unit.x,t.y-unit.y)>700)continue;for(let i=0;i<7;i++){const a=i*2.399+time*3,r=(1.2-(f.until-S.time))*30;part('glow',t.x+Math.cos(a)*r,world.elevation(t.x,t.y)+35+Math.sin(i)*r,t.y+Math.sin(a)*r,2,9,2,0,0,a,amber);}}
  for(const p of Object.values(pools)){p.mesh.count=p.n;p.mesh.visible=!!p.n;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;}
 }
 function dispose(){root.removeFromParent();for(const p of waterPatches.values()){p.geometry.dispose();p.arcGeometry.dispose();p.arcMaterial.dispose();}for(const p of Object.values(pools))p.mesh.dispose();for(const g of Object.values(geos))g.dispose();for(const m of [steel,dark,shell,glow,water])m.dispose();}
 return {root,pools,update,dispose};
}
