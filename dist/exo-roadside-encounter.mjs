import * as T from './assets/ev01/three.module.mjs';
import {mergeVertices} from './assets/ev01/BufferGeometryUtils.mjs';
import {createCampusMaterials,createCampusBuilder} from './exo-campus-materials.mjs?v=73';

// One authored roadside vignette, reusing loaded scans and one static batch per
// material. Open escape lanes and the real road remain outside the outcrops.
export function createRoadsideEncounter(scene,W,maps,data=ExoRoadsideEncounter){
 const materials=createCampusMaterials(maps),b=createCampusBuilder(materials),height=(x,z)=>W.surfaceElevation(x,z);
 const soil=materials[4],compile=soil.onBeforeCompile;soil.transparent=true;soil.depthWrite=false;
 soil.onBeforeCompile=s=>{compile(s);s.vertexShader='attribute float encounterFade;varying float serviceCoverage;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nserviceCoverage=encounterFade;');s.fragmentShader='varying float serviceCoverage;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=serviceCoverage;');};soil.customProgramCacheKey=()=> 'service-ground-v92';
 function patch(x,z,rx,rz,color,rotation=0){
  const positions=[],uv=[],fade=[],rings=5,segments=24;
  function vertex(r,a){const q=.90+.07*Math.sin(a*5+x)+.03*Math.sin(a*9+z),dx=Math.cos(a)*rx*r*q,dz=Math.sin(a)*rz*r*q,px=x+dx*Math.cos(rotation)-dz*Math.sin(rotation),pz=z+dx*Math.sin(rotation)+dz*Math.cos(rotation);positions.push(px,height(px,pz)+.45,pz);uv.push(px/54,pz/54);fade.push((1-T.MathUtils.smoothstep(r,.45,1))*.55);}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,c=(i+1)/segments*Math.PI*2,lo=j/rings,hi=(j+1)/rings;vertex(lo,a);vertex(hi,c);vertex(hi,a);vertex(lo,a);vertex(lo,c);vertex(hi,c);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('encounterFade',new T.Float32BufferAttribute(fade,1));g.computeVertexNormals();b.add(g,[0,0,0],[1,1,1],color,[0,0,0],4);
 }
 for(const p of data.rocks){
  // Unequal tilted strata share a mineral direction. Part-buried toes blend
  // into the slope instead of sitting as freestanding geometric pebbles.
  const g=new T.SphereGeometry(1,28,18),v=g.attributes.position;
  for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),fracture=1+.07*Math.sin(y*13+x*3+p.seed)+.045*Math.sin(z*9+y*3);v.setXYZ(i,x*fracture*.91,(y*.92+x*.18)*fracture,z*fracture*.87);}
  g.deleteAttribute('normal');const smooth=mergeVertices(g,1e-4);g.dispose();smooth.computeVertexNormals();
  b.add(smooth,[p.x,height(p.x,p.y)+p.r*.12,p.y],[p.r,p.r*1.4,p.r],p.seed%2?0x8e9387:0x747e79,[0,p.seed*.47,0],7);
  patch(p.x,p.y,p.r*1.6,p.r*1.4,0x7b8072,.17);
  for(let i=0;i<4;i++){const angle=2.1+i*.48+p.seed*.3,x=p.x+Math.cos(angle)*p.r*.88,z=p.y+Math.sin(angle)*p.r*.88,scale=(.10+i*.035)*p.r;b.add(new T.SphereGeometry(1,10,6),[x,height(x,z)+scale*.15,z],[scale,scale*.35,scale*.6],0x838a7c,[.1,.4*i,.2],7);}
 }
 const box=(x,z,y,size,color,rotation=[0,0,0],kind=0)=>b.box([x,height(x,z)+y,z],size,color,rotation,kind);
 // The empty cart has slewed off the road. Its ruptured side, dropped battery,
 // loose cable and dragged wheel tracks describe the interruption visually.
 const x=6425,z=6120;
 box(x,z,22,[78,12,108],0x596767,[.04,.26,.07],5);
 box(x-24,z-9,41,[13,36,77],0x788b83,[.06,.26,-.11]);
 box(x+26,z+9,30,[9,22,64],0x626d69,[.21,.33,-.62]);
 box(x-5,z-38,44,[57,34,9],0x687b72,[.04,.26,.07]);
 for(const side of [-1,1])for(const offset of [-34,34]){const xx=x+side*38,zz=z+offset;b.cylinder([xx,height(xx,zz)+12,zz],[12,8,12],0x292f30,[0,0,Math.PI/2],5);b.cylinder([xx+side*4.2,height(xx,zz)+12,zz],[5,1,5],0x858b80,[0,0,Math.PI/2],5);}
 box(x+70,z-36,10,[28,18,42],0xa69a73,[.05,-.47,.15]);
 box(x+72,z-36,20,[15,2,18],0x313c3c,[.05,-.47,.15],5);
 box(x-36,z+72,2.5,[43,3,54],0x7f8c81,[0,-.68,.05]);
 for(let i=0;i<9;i++){const a=i*.39,xx=x+47+i*3,zz=z+12+Math.sin(a)*23;b.beam([xx,height(xx,zz)+1.8,zz],[xx+3,height(xx+3,z+12+Math.sin(a+.39)*23)+1.8,z+12+Math.sin(a+.39)*23],.8,0x303a38,5);}
 for(const side of [-1,1])for(let i=0;i<10;i++){const xx=x+side*29+Math.sin(i*.15)*65,zz=z+65+i*16;patch(xx,zz,7,19,0x454a40,-.15-i*.045);}
 for(const [dx,dz,a]of [[-65,42,.28],[87,15,-.61],[31,89,.9]]){box(x+dx,z+dz,3,[9,5,21],0x948e75,[0,a,.03],5);box(x+dx+4,z+dz,6,[3,2,9],0xc8bd9d,[0,a,0],5);}
 // A bent service lamp, intact in one half, points back toward the public road.
 const lx=6780,lz=6020,h=height(lx,lz);
 b.box([lx,h+3,lz],[25,6,22],0x69716c,[0,.22,0],3);
 b.beam([lx,h+5,lz],[lx+8,h+59,lz-4],3.3,0x697c79,5);
 b.box([lx+9,h+65,lz-5],[21,15,12],0x77877d,[.06,.12,-.16]);
 b.box([lx+9,h+65,lz+1.2],[14,5,1],0x86baa7,[0,0,-.16],2);
 for(let i=0;i<6;i++){const xx=6680+i*19,zz=6060+i*9;box(xx,zz,.9,[12,1,4],0x9f9464,[0,-.43,0],8);}
 const root=b.finish();root.name='Old freight road / interrupted service stop';scene.add(root);
 return {root,update(u){root.visible=!W.cave&&!W.interior&&Math.hypot(u.x-data.spawn.x,u.y-data.spawn.y)<2600;},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());}};
}
