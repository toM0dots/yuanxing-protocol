import * as T from './assets/ev01/three.module.mjs';
import {createFieldLampBatch} from './exo-field-lamps.mjs?v=20261107-performance89';
import {builder,scannedMaterial} from './exo-world-details.mjs?v=20261111-ground105';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';

const caveNoise=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
function spineDistance(x,y,W){let distance=Infinity;for(const t of W.tunnels){const dx=t.b.x-t.a.x,dy=t.b.y-t.a.y,f=Math.max(0,Math.min(1,((x-t.a.x)*dx+(y-t.a.y)*dy)/(dx*dx+dy*dy||1)));distance=Math.min(distance,Math.hypot(x-t.a.x-dx*f,y-t.a.y-dy*f));}return distance;}
function dripStone(x,y,z,radius,length,seed,up=false){
 const p=[],uv=[],indices=[],sides=13,rings=9;
 for(let k=0;k<=rings;k++){const t=k/rings,fall=Math.pow(1-t,1.4),bend=Math.sin(t*2.7+seed)*t*radius*.24;
  for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,r=radius*(.025+fall)*(.78+.16*Math.sin(a*3+seed)+.09*Math.sin(a*7-k*.6)+.045*Math.sin(k*2.1));p.push(x+Math.cos(a)*r+bend,z+(up?1:-1)*t*length,y+Math.sin(a)*r+Math.cos(t*3+seed)*t*radius*.13);uv.push(i/sides,t);if(k<rings&&i<sides){const j=k*(sides+1)+i;indices.push(j,j+sides+1,j+sides+2,j,j+sides+2,j+1);}}
 }
 if(!up)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function surveyChamber(room,W,rockMaterial,quartzMaterial){
 const group=new T.Group();group.name='Survey chamber / '+room.name;const rock=[],quartz=[];
 for(let i=0;i<11;i++){
  const a=i*2.399+room.id,x=room.x+Math.cos(a)*room.r*(.65+caveNoise(i,room.id)*.2),y=room.y+Math.sin(a)*room.r*(.65+caveNoise(room.id,i)*.2);
  if(!W.inside(x,y,45)||spineDistance(x,y,W)<110)continue;
  const floor=W.elevation(x,y),ceiling=W.caveCeiling(x,y),length=Math.max(20,Math.min(48+caveNoise(i,4)*75,ceiling-230));
  rock.push(dripStone(x,y,floor+ceiling+5,17+caveNoise(i,12)*17,length,room.id*20+i));
  if(spineDistance(x,y,W)>180){const g=new T.SphereGeometry(1,14,9),p=g.attributes.position;for(let j=0;j<p.count;j++){const px=p.getX(j),py=p.getY(j),pz=p.getZ(j),n=1+.12*Math.sin(px*7+pz*4+i)+.08*Math.cos(py*9-px*3);p.setXYZ(j,x+px*(13+caveNoise(i,9)*12)*n,floor+py*(5+caveNoise(i,8)*8)*n+3,y+pz*(11+caveNoise(i,7)*15)*n);}g.computeVertexNormals();rock.push(g);}
 }
 if(room.theme==='crystal')for(let i=0;i<5;i++){const a=i*1.9+.8,x=room.x+Math.cos(a)*room.r*.77,y=room.y+Math.sin(a)*room.r*.77;if(!W.inside(x,y,50)||spineDistance(x,y,W)<170)continue;for(let j=0;j<3;j++)quartz.push(dripStone(x+j*13,y+j*5,W.elevation(x+j*13,y+j*5)-3,8+j*2,24+caveNoise(i,j)*36,i*7+j,true));}
 for(const [parts,material] of [[rock,rockMaterial],[quartz,quartzMaterial]])if(parts.length){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name=parts===rock?'Scanned eroded cave formations':'Muted mineral quartz';group.add(mesh);}
 return group;
}
function surveyGround(W,materials){
 const group=new T.Group();group.name='Survey cave / visible ground risks';const d=typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null;if(!d)return group;
 const wet=[],crust=[],cracks=[];
 function patch(h,scale=1){const p=[],uv=[],indices=[],rings=6,sides=44;for(let k=0;k<=rings;k++)for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,r=k/rings*(.93+.05*Math.sin(a*7)+.02*Math.sin(a*13)),x=h.x+Math.cos(a)*h.rx*r*scale,y=h.y+Math.sin(a)*h.ry*r*scale;p.push(x,W.elevation(x,y)+.7,y);uv.push(x/70,y/70);if(k<rings&&j<sides){const q=k*(sides+1)+j;indices.push(q,q+1,q+sides+2,q,q+sides+2,q+sides+1);}}const masked=[];for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3);if(tri.every(v=>d.sample(p[v*3],p[v*3+2],'survey')?.id===h.id))masked.push(...tri);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(masked);g.computeVertexNormals();return g;}
 for(const h of d.caveHazards){
  (h.kind==='slip'?wet:crust).push(patch(h));
  if(h.kind==='sink')for(let i=0;i<11;i++){
   const a=i*2.399,x=h.x+Math.cos(a)*h.rx*.62,y=h.y+Math.sin(a)*h.ry*.62,p=[],uv=[],indices=[];
   for(let j=0;j<5;j++){const px=x+(j-2)*13,py=y+Math.sin(j*2+i)*11;if(!W.inside(px,py,15))continue;const z=W.elevation(px,py)+1.1;for(const side of [-1,1]){p.push(px,z,py+side*1.1);uv.push(j,side);}if(p.length>=12){const k=p.length/3-4;indices.push(k,k+1,k+3,k,k+3,k+2);}}
   if(indices.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();cracks.push(g);}
  }
 }
 for(const [parts,material] of [[wet,materials.wet],[crust,materials.crust],[cracks,materials.cracks]])if(parts.length){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new T.Mesh(g,material);m.receiveShadow=true;group.add(m);}
 return group;
}

export function caveTile(tx,ty,W){const p=[],n=[],step=1000/18;
 const vertex=(x,y,z,nx,ny,nz)=>{p.push(x,z,y);n.push(nx,ny,nz);};
 function ceiling(x,y){return W.elevation(x,y)+W.caveCeiling(x,y);}
 for(let i=0;i<18;i++)for(let j=0;j<18;j++){const x=tx*1000+i*step,y=ty*1000+j*step,cs=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]],d=cs.map(([a,b])=>W.caveDistance(a,b));
  if(d.some(v=>v>0))for(const k of [0,2,1,0,3,2]){const [a,b]=cs[k];vertex(a,b,ceiling(a,b),0,-1,0);}
  const cross=[];for(let k=0;k<4;k++){const l=(k+1)%4;if((d[k]>0)===(d[l]>0))continue;const t=d[k]/(d[k]-d[l]);cross.push([cs[k][0]+(cs[l][0]-cs[k][0])*t,cs[k][1]+(cs[l][1]-cs[k][1])*t]);}
  for(let k=0;k+1<cross.length;k+=2){const [a,b]=[cross[k],cross[k+1]];for(let level=0;level<4;level++)for(const [v,top] of [[a,0],[b,0],[b,1],[a,0],[b,1],[a,1]]){const dx=W.caveDistance(v[0]+5,v[1])-W.caveDistance(v[0]-5,v[1]),dy=W.caveDistance(v[0],v[1]+5)-W.caveDistance(v[0],v[1]-5),len=Math.hypot(dx,dy)||1,f=(level+top)/4,bulge=Math.sin(f*Math.PI)*(10+8*Math.sin(v[0]*.013+v[1]*.009));vertex(v[0]+dx/len*bulge,v[1]+dy/len*bulge,W.elevation(...v)+f*W.caveCeiling(...v),dx/len,0,dy/len);}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));return g;
}
function chamber(room,W){const b=builder(),color=room.theme==='magma'?0xff954c:room.theme==='ruin'?0xffd17a:0x57dfd1;
 for(let i=0;i<16;i++){const angle=i*2.399+room.id,x=room.x+Math.cos(angle)*room.r*(.35+(i%4)*.12),y=room.y+Math.sin(angle)*room.r*(.35+(i%4)*.12),ceil=W.elevation(x,y)+W.caveCeiling(x,y),length=Math.min(55+(i*31%85),W.caveCeiling(x,y)-175);if(!W.inside(x,y,90))continue;b.add(new T.ConeGeometry(1,1,10),[x,ceil-length/2,y],[15+i%4*5,length,15+i%4*5],0x54676c,[Math.PI,0,.08*Math.sin(i)]);}
 for(let i=0;i<9;i++){const a=i*2.399+room.id,x=room.x+Math.cos(a)*room.r*.83,y=room.y+Math.sin(a)*room.r*.83,z=W.elevation(x,y);if(!W.inside(x,y,35))continue;for(let k=0;k<3;k++){const h=32+k*20,r=9+k*4;b.add(new T.CylinderGeometry(1,1,1,6),[x+k*14,z+h/2,y],[r,h,r],color,[0,k,0],3);b.add(new T.ConeGeometry(1,1,6),[x+k*14,z+h+r,y],[r,r*2,r],color,[0,k,0],3);}}
 if(room.theme==='ruin'){for(const side of [-1,1]){const x=room.x+side*room.r*.48,y=room.y-room.r*.45;b.box([x,W.elevation(x,y)+55,y],[80,110,60],0x77858b);for(let i=0;i<4;i++)b.box([x,W.elevation(x,y)+15+i*25,y+33],[70,4,4],0x283d49);}b.box([room.x,W.elevation(room.x,room.y)+15,room.y-room.r*.58],[room.r*.9,30,60],0x6a7d84);}
 const group=b.finish();group.name='Chamber_'+room.name;
 if(room.theme==='lake'||room.theme==='magma'){const m=new T.Mesh(new T.CircleGeometry(room.r*.43,48),new T.MeshStandardMaterial({color:room.theme==='lake'?0x17576c:0x8d3c18,emissive:room.theme==='lake'?0x062b38:0xc64b12,emissiveIntensity:.65,roughness:.15,metalness:.65,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(room.x,W.elevation(room.x,room.y)+1,room.y);group.add(m);}
 return group;
}
export function createCaverns(scene,textures){const material=scannedMaterial(textures,{color:0x727f87}),tiles=new Map(),rooms=new Map();material.side=T.DoubleSide;let active=null,lanterns=null,fieldLamps=null,surveyFloor=null;
 const surveyMaterials={rock:scannedMaterial(textures,{color:0x8a8d80}),quartz:new T.MeshStandardMaterial({color:0x9daaa0,roughness:.59,metalness:.035,envMapIntensity:.3}),wet:new T.MeshStandardMaterial({color:0x334541,...(textures['rock-diff']?{map:textures['rock-diff']}:{}),roughness:.23,metalness:0,envMapIntensity:.38,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}),crust:scannedMaterial(textures,{color:0xaaa18d,ground:true,patches:false}),cracks:new T.MeshStandardMaterial({color:0x172326,roughness:1,metalness:0,side:T.DoubleSide})};
 surveyMaterials.crust.polygonOffset=true;surveyMaterials.crust.polygonOffsetFactor=-1;
 function clear(){for(const m of tiles.values()){scene.remove(m);m.geometry.dispose();}tiles.clear();for(const m of rooms.values()){scene.remove(m);m.traverse(o=>o.geometry?.dispose());}rooms.clear();if(lanterns){fieldLamps?.dispose();fieldLamps=null;scene.remove(lanterns);lanterns.traverse(o=>o.geometry?.dispose());lanterns=null;}if(surveyFloor){scene.remove(surveyFloor);surveyFloor.traverse(o=>o.geometry?.dispose());surveyFloor=null;}}
 function update(u,W){const id=W.interior?null:W.cave?.id||null;if(id!==active){clear();active=id;}if(!id)return;
  const keep=new Set(),gx=Math.floor(u.x/1000),gy=Math.floor(u.y/1000);for(let x=gx-2;x<=gx+2;x++)for(let y=gy-2;y<=gy+2;y++){const key=x+','+y;keep.add(key);if(!tiles.has(key)){const m=new T.Mesh(caveTile(x,y,W),material);m.receiveShadow=true;scene.add(m);tiles.set(key,m);}}
  for(const [key,m] of tiles)if(!keep.has(key)){scene.remove(m);m.geometry.dispose();tiles.delete(key);}
  const wanted=new Set();for(const r of W.rooms){if(Math.hypot(r.x-u.x,r.y-u.y)>2700)continue;wanted.add(r.id);if(!rooms.has(r.id)){const g=id==='survey'?surveyChamber(r,W,surveyMaterials.rock,surveyMaterials.quartz):chamber(r,W);scene.add(g);rooms.set(r.id,g);}}
  for(const [id,g] of rooms)if(!wanted.has(id)){scene.remove(g);g.traverse(o=>o.geometry?.dispose());rooms.delete(id);}
  if(!lanterns){const b=builder();fieldLamps=createFieldLampBatch(textures);const placed=[];
   for(const side of [-1,1]){const x=W.entry.x+side*90,y=W.entry.y;if(W.inside(x,y,28)){placed.push({x,y});fieldLamps.add({x,y,z:W.elevation(x,y),height:38,groundAt:W.elevation,seed:911+side,color:0xa0ddbb});}}
   for(const t of W.tunnels){const dx=t.b.x-t.a.x,dy=t.b.y-t.a.y,length=Math.hypot(dx,dy),count=Math.max(1,Math.ceil(length/340)),offset=Math.min(100,t.r*.55);
    for(let i=0;i<=count;i++){const f=i/count,x=t.a.x+dx*f-dy/(length||1)*offset,y=t.a.y+dy*f+dx/(length||1)*offset;
     if(!W.inside(x,y,28)||placed.some(p=>Math.hypot(x-p.x,y-p.y)<90))continue;
     placed.push({x,y});fieldLamps.add({x,y,z:W.elevation(x,y),height:32,groundAt:W.elevation,seed:placed.length+31,color:0xa0ddbb});
    }
   }
   const c=W.caveData.core,z=W.elevation(c.x,c.y);
   if(id==='survey'){
    b.box([c.x,z+5,c.y],[56,10,42],0x5b6a64);b.box([c.x,z+28,c.y],[35,38,28],0x889086);b.box([c.x,z+50,c.y],[39,6,31],0x4c625d);b.box([c.x,z+32,c.y+15],[22,13,2],0x293e41);b.box([c.x,z+32,c.y+16.5],[15,3,1],0x8aaba0,[0,0,0],2);
    for(const side of [-1,1])b.beam([c.x+side*15,z+8,c.y+16],[c.x+side*15,z+48,c.y+16],1.5,0x737c6d);
    const d=typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null;
    for(const h of d?.caveHazards||[]){const safe=d.safePoint(h.x,h.y,'survey'),dx=safe.x-h.x,dy=safe.y-h.y,length=Math.hypot(dx,dy)||1,x=h.x+dx/length*Math.min(h.rx,h.ry)*.62,y=h.y+dy/length*Math.min(h.rx,h.ry)*.62,ground=W.elevation(x,y);if(spineDistance(x,y,W)<104)continue;b.box([x,ground+22,y],[5,44,5],0x7d8373);b.box([x,ground+38,y],[23,13,4],0xa89c70);b.box([x,ground+46,y],[8,4,7],0xb39662,[0,0,0],2);}
    surveyFloor=surveyGround(W,surveyMaterials);scene.add(surveyFloor);
   }else{b.add(new T.OctahedronGeometry(1,1),[c.x,z+85,c.y],[35,75,35],0x84fff2,[0,0,0],2);b.cylinder([c.x,z+5,c.y],[95,10,95],0x324d57);}
   lanterns=b.finish();lanterns.add(fieldLamps.finish());scene.add(lanterns);}
 }
 return {update,tiles,rooms,get lanterns(){return lanterns},dispose(){clear();material.dispose();Object.values(surveyMaterials).forEach(m=>m.dispose());}};
}
