import * as T from './assets/ev01/three.module.mjs';
import {createCampusMaterials,createCampusBuilder} from './exo-campus-materials.mjs?v=73';
import {exteriorDetailKit} from './exo-exterior-kit.mjs?v=20261106-exterior86';

// Shallow, conforming surface dressing. Heights stay below a footstep and are
// sampled from the SAME surface as movement: no new plateaus or hidden walls.
export function createExteriorGround(scene,maps,world){
 const materials=createCampusMaterials(maps),rows=new Map();let last='';
 materials[3].name='Exterior / eroded mineral paving';materials[3].roughness=.82;
 materials[3].userData.minimumRoughness=.48;
 materials[4].name='Exterior / wind deposited sediment';
 materials[4].transparent=true;materials[4].depthWrite=false;
 const soilCompile=materials[4].onBeforeCompile;
 materials[4].onBeforeCompile=shader=>{soilCompile(shader);shader.vertexShader='attribute float siteCoverage;varying float edgeCoverage;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nedgeCoverage=siteCoverage;');shader.fragmentShader='varying float edgeCoverage;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=edgeCoverage;');};
 materials[4].customProgramCacheKey=()=> 'exterior-soft-sediment-v86';
 materials[8].name='Exterior / leaves';materials[8].roughness=.94;materials[8].metalness=0;materials[8].onBeforeCompile=()=>{};
 function build(site){
  const landmark=site.region!==undefined,region=landmark?site.region:site.sector,rx=landmark?(region===7?310:340):site.w/2+20,rz=landmark?290:site.d/2+20;
  const b=createCampusBuilder(materials),seed=(site.x*.017+site.y*.013),ground=(x,z)=>world.surfaceElevation(site.x+x,site.y+z)-site.z;
  function patch(x,z,w,d,kind=3,rotation=0,shade=0x81867c,height=.6,rough=true){
   const vertices=[],uv=[],coverage=[],corners=8,points=[];
   // Broken corners, irregular edge lengths; no overlapping plane decals.
   const tile=kind===3&&w<65&&d<65,edge=.12;
   const cut=[[-1+edge,-1],[1-edge,-1],[1,-1+edge],[1,1-edge],[1-edge,1],[-1+edge,1],[-1,1-edge],[-1,-1+edge]];
   for(let i=0;i<corners;i++){const a=Math.PI*2*i/corners,q=rough?.82+.15*Math.sin(i*8.3+x*.1+z*.2):1,px=tile?cut[i][0]*w*.5:Math.cos(a)*w*.5*q,pz=tile?cut[i][1]*d*.5:Math.sin(a)*d*.5*q;points.push([x+px*Math.cos(rotation)-pz*Math.sin(rotation),z+px*Math.sin(rotation)+pz*Math.cos(rotation)]);}
   function triangle(a,c,tail){
    // Long flat triangles float over terrain undulations. Subdivide in plan,
    // then resample every vertex, including the interior of the footprint.
    if(Math.max(Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(c[0]-tail[0],c[1]-tail[1]),Math.hypot(tail[0]-a[0],tail[1]-a[1]))>27){
     const ac=[(a[0]+c[0])/2,(a[1]+c[1])/2],cd=[(c[0]+tail[0])/2,(c[1]+tail[1])/2],da=[(tail[0]+a[0])/2,(tail[1]+a[1])/2];triangle(a,ac,da);triangle(ac,c,cd);triangle(da,cd,tail);triangle(ac,cd,da);return;
    }
    for(const v of [a,c,tail]){vertices.push(v[0],ground(...v)+height,v[1]);uv.push(v[0]/54,v[1]/54);const q=Math.hypot((v[0]-x)/(w*.5),(v[1]-z)/(d*.5));coverage.push(Math.max(0,Math.min(1,(.91-q)*3.3)));}
   }
   for(let i=0;i<corners;i++)triangle([x,z],points[(i+1)%corners],points[i]);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(kind===4)g.setAttribute('siteCoverage',new T.Float32BufferAttribute(coverage,1));g.computeVertexNormals();
   b.add(g,[0,0,0],[1,1,1],shade,[0,0,0],kind);
  }
  // Eroded paving follows the occupied front and service side. A ragged edge
  // dissolves into the surrounding scan instead of outlining a square pad.
  const width=landmark?580:site.w+110,depth=landmark?150:140,start=landmark?200:site.d/2-3,step=38;
  for(let row=0;row<Math.ceil(depth/step);row++)for(let col=0;col<Math.ceil(width/step);col++){
   const x=-width/2+(col+.5)*step+(row%2?11:0),z=start+row*step,q=Math.sin(col*12.73+row*7.31+seed);
   if(row>1&&(q>.63||Math.abs(x)>width*.46-10*row))continue;
   patch(x+q*.5,z,step-2,step-2,3,q*.016,[0x7e8984,0x879087,0x788681,0x92958a][Math.abs(col+row)%4],1.3);
   if(q<-.72)patch(x+8,z+6,24,12,4,.2,0x8f8f7a,1.6);
  }
  if(region===3){
   const e=exteriorDetailKit(b.add,{paint:8,metal:8,dark:8,glass:8,light:8,leaf:8});
   for(let i=0;i<21;i++){const side=i%2?1:-1,x=side*(rx+3+Math.sin(i*2.7)*26),z=-rz+14+Math.floor(i/3)*rz*1.7/7+Math.sin(i*9.2)*22;
    e.ivy([x,ground(x,z)+17,z],17+(i%4)*4,i);if(i%3===0)e.ivy([x+9,ground(x+9,z)+14,z+8],17,i+2);
   }
   for(const x of [-width*.39,width*.41])for(let i=0;i<4;i++){const z=start+30+i*31;e.ivy([x+Math.sin(i)*12,ground(x,z)+18,z],18,i+6);}
  }
  // Sediment tails accumulate behind foundations, never across the doorway.
  for(let side of [-1,1])for(let i=0;i<11;i++){
   const x=side*(rx+12+(i%3)*12),z=-rz+18+i*rz*1.55/10,q=Math.sin(i*4.13+seed);
   patch(x+q*7,z,45+q*12,35+q*8,4,q*.5,region===7?0xa6b0ad:0x939484,.35);
   // Mostly buried bedding fragments: two strata, not a row of round boulders.
   if(i%3!==1){patch(x-7*side,z,28+q*5,21,7,q*.23,0x6d7978,2.5);patch(x-9*side,z-2,18,14,7,q*.23,0x84918d,4.5);}
  }
  // Grated drains are flush with the surface, open at one end for maintenance.
  const dx=-Math.min(rx*.67,190),dz=start+38;
  function drainBox(x,z,height,size,color){const g=new T.BoxGeometry(...size),p=g.attributes.position;for(let i=0;i<p.count;i++){const px=x+p.getX(i),pz=z+p.getZ(i);p.setXYZ(i,px,ground(px,pz)+height+p.getY(i),pz);}g.computeVertexNormals();b.add(g,[0,0,0],[1,1,1],color,[0,0,0],5);}
  for(let i=0;i<3;i++){const z=dz+i*25;drainBox(dx,z,1.2,[17,1.5,23],0x303d40);for(let j=0;j<5;j++)drainBox(dx-6+j*3,z,2.3,[1,1,21],0x77817e);}
  if(region===7){
   // Wind-carved snow only along the lee edge of the summit access; the route
   // remains legible and uses its existing height / slope classifications.
   for(let i=0;i<12;i++){const x=(i%2?-1:1)*(rx+26+Math.sin(i)*12),z=-rz+i*rz/6;patch(x,z,52,87,3,.22,0xc4cdc8,1.6);}
  }
  const root=b.finish();root.position.set(site.x,site.z,site.y);root.name='Ground contact / '+(site.id||site.name);root.userData.cameraIgnore=true;
  root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});scene.add(root);return root;
 }
 function update(u,W=world){
  const key=(W.cave?'interior:':'surface:')+Math.floor(u.x/160)+','+Math.floor(u.y/160);if(key===last)return;last=key;
  const wanted=new Set();if(!W.cave){
   const sites=[...W.structures.filter(s=>!['camp-0-0','k09-hero-hangar'].includes(s.id)),...(W.landmarks||[])];
   for(const site of sites){if(Math.hypot(site.x-u.x,site.y-u.y)>1900)continue;const id=site.id||'region-'+site.region;wanted.add(id);if(!rows.has(id))rows.set(id,build(site));}
  }
  for(const [id,g]of rows)if(!wanted.has(id)){scene.remove(g);g.traverse(o=>o.geometry?.dispose());rows.delete(id);}
 }
 return{update,rows,dispose(){for(const g of rows.values()){scene.remove(g);g.traverse(o=>o.geometry?.dispose());}rows.clear();materials.forEach(m=>m.dispose());}};
}
