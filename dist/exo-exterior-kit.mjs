import * as T from './assets/ev01/three.module.mjs';

// The colony / relay / summit concept language, in metres-consistent geometry.
// Callers supply their existing material bins; no extra textures or draw calls.
export const EXTERIOR={ivory:0xc5c2af,patch:0x9caaa5,steel:0x637074,dark:0x28343a,glass:0x647c78,amber:0xd8ac70,green:0xa5d6b4,rust:0x776452};
export function weatherExteriorMaterial(material,{glass=false}={}){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  previous(shader);
  shader.vertexShader='varying vec3 exteriorP;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nexteriorP=position;');
  shader.fragmentShader='varying vec3 exteriorP;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float runoff=smoothstep(.55,.94,.5+.30*sin(exteriorP.x*.19+sin(exteriorP.z*.14)*2.)+.2*sin(exteriorP.z*.21+exteriorP.x*.031));
float runLength=.55+.45*sin(exteriorP.y*.015+exteriorP.x*.047);
float settledDust=1.-smoothstep(2.,36.,exteriorP.y);
diffuseColor.rgb*=1.-runoff*runLength*${glass?'.21':'.15'}-settledDust*${glass?'.08':'.17'};`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(roughnessFactor+runoff*${glass?'.23':'.12'}+settledDust*.10,${glass?'.20':'.53'},1.);`);
 };
 const key=material.customProgramCacheKey();material.customProgramCacheKey=()=>key+'-rain-wear-v86-'+glass;
}
export function roundedBoxGeometry(w,h,d,radius=8){
 const r=Math.min(radius,Math.min(w,h,d)*.45),g=new T.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,n=g.attributes.normal,half=[w/2,h/2,d/2];
 for(let i=0;i<p.count;i++){
  const raw=[p.getX(i),p.getY(i),p.getZ(i)],point=raw.map((v,k)=>Math.abs(v)<half[k]-.001?Math.sign(v)*(half[k]-r):v),core=point.map((v,k)=>Math.max(-half[k]+r,Math.min(half[k]-r,v))),normal=new T.Vector3(...point.map((v,k)=>v-core[k])).normalize();
  p.setXYZ(i,core[0]+normal.x*r,core[1]+normal.y*r,core[2]+normal.z*r);n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 return g;
}
function roundedPath(path,w,h,r){
 const x=-w/2,y=-h/2;r=Math.min(r,w/2-.01,h/2-.01);
 path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);return path;
}
export function pressureFrameGeometry(w,h,r=9,thickness=3,depth=5){
 const shape=roundedPath(new T.Shape(),w,h,r),hole=roundedPath(new T.Path(),w-2*thickness,h-2*thickness,Math.max(1,r-thickness));shape.holes.push(hole);
 const g=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:5});g.translate(0,0,-depth/2);return g;
}

// Common signature: add(geometry, position, scale, color, rotation, material).
export function exteriorDetailKit(add,{paint=0,metal=0,dark=0,glass=1,light=2,leaf=0}={}){
 const C=EXTERIOR,Y=new T.Vector3(0,1,0);
 const box=(p,s,c=C.steel,k=metal,r=[0,0,0])=>add(new T.BoxGeometry(...s),p,[1,1,1],c,r,k);
 const round=(p,s,c=C.ivory,radius=8,k=paint,r=[0,0,0])=>add(roundedBoxGeometry(...s,radius),p,[1,1,1],c,r,k);
 const cyl=(p,r,h,c=C.steel,k=metal,rot=[0,0,0],top=r)=>add(new T.CylinderGeometry(top,r,h,16),p,[1,1,1],c,rot,k);
 const frame=(p,w,h,c=C.steel,r=8,t=3,depth=5,yaw=0)=>add(pressureFrameGeometry(w,h,r,t,depth),p,[1,1,1],c,[0,yaw,0],metal);
 function beam(a,b,r=1.5,c=C.steel,k=metal){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,[0,0,0],[1,1,1],c,[0,0,0],k);}
 function local(p,yaw,v){return[p[0]+Math.cos(yaw)*v[0]+Math.sin(yaw)*v[2],p[1]+v[1],p[2]-Math.sin(yaw)*v[0]+Math.cos(yaw)*v[2]];}
 function window(p,w,h,yaw=0,warm=false){
  // Deep shadow gasket, recessed glass, physical sill and separate mullions.
  round(p,[w+9,h+9,4],C.dark,7,dark,[0,yaw,0]);
  round(local(p,yaw,[0,0,2.5]),[w,h,2],warm?0x8d8570:C.glass,6,glass,[0,yaw,0]);
  frame(local(p,yaw,[0,0,5]),w+7,h+7,C.patch,8,2.5,7,yaw);
  box(local(p,yaw,[0,-h/2-3,6]),[w+12,4,10],C.steel,metal,[0,yaw,0]);
  for(const x of [-w*.25,w*.25])box(local(p,yaw,[x,0,5]),[1.5,h-3,2],C.dark,dark,[0,yaw,0]);
  if(warm)box(local(p,yaw,[0,h*.36,3.7]),[w*.72,1.3,1],0xb99b6d,light,[0,yaw,0]);
 }
 function fixture(p,yaw=0,green=false){
  round(p,[13,7,7],C.dark,1.5,dark,[0,yaw,0]);
  box(local(p,yaw,[0,-.5,4]),[8,2,1.5],green?C.green:C.amber,light,[0,yaw,0]);
  box(local(p,yaw,[0,4,3]),[17,2,10],C.ivory,metal,[0,yaw,0]);
 }
 function pipe(points,r=2.3){
  // Rounded elbows rather than a stack of disconnected straight cylinders.
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
  add(new T.TubeGeometry(curve,Math.max(12,points.length*5),r,6,false),[0,0,0],[1,1,1],C.steel,[0,0,0],metal);
  const last=points.at(-1);for(const t of [.17,.47,.78]){const p=curve.getPointAt(t),q=curve.getTangentAt(t),g=new T.CylinderGeometry(r*1.5,r*1.5,2,10);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,q));add(g,p.toArray(),[1,1,1],C.patch,[0,0,0],metal);}
  return last;
 }
 function valve(p,r=5,yaw=0){add(new T.TorusGeometry(r,1.1,5,16),p,[1,1,1],C.amber,[0,yaw,0],metal);for(const a of [0,Math.PI/2])beam(local(p,yaw,[-Math.cos(a)*r,-Math.sin(a)*r,0]),local(p,yaw,[Math.cos(a)*r,Math.sin(a)*r,0]),.7,C.steel);}
 function rail(a,b,height=19){const A=new T.Vector3(...a),B=new T.Vector3(...b),steps=Math.max(1,Math.ceil(A.distanceTo(B)/35));for(let i=0;i<=steps;i++){const p=A.clone().lerp(B,i/steps);beam(p.toArray(),p.clone().add(new T.Vector3(0,height,0)).toArray(),1.2);}for(const y of [height*.46,height])beam(A.clone().add(new T.Vector3(0,y,0)).toArray(),B.clone().add(new T.Vector3(0,y,0)).toArray(),1.2);}
 function vent(p,w=27,h=22,yaw=0){round(p,[w+5,h+5,4],C.dark,2,dark,[0,yaw,0]);for(let i=0;i<6;i++)box(local(p,yaw,[0,-h/2+(i+.5)*h/6,3]),[w,1.3,4],C.steel,metal,[.25,yaw,0]);}
 function panelBolts(p,w,h,yaw=0){for(const x of [-w/2+3,w/2-3])for(const y of [-h/2+3,h/2-3])cyl(local(p,yaw,[x,y,0]),.85,1.2,C.steel,metal,[Math.PI/2,yaw,0]);}
 function module(p,w,d,h,{color=C.ivory,warm=false,seed=0}={}){
  round([p[0],p[1]+h/2,p[2]],[w,h,d],color,Math.min(13,w*.12));
  round([p[0],p[1]+h-2,p[2]],[w+4,9,d+4],C.patch,4,metal);
  box([p[0],p[1]+7,p[2]+d/2+.5],[w-12,14,2],C.dark,dark);
  for(const side of [-1,1])window([p[0]+side*w*.27,p[1]+h*.57,p[2]+d/2+.8],w*.27,h*.34,0,warm&&side<0);
  // The airlock is solid: this is the above-ground shell of a separate interior.
  round([p[0],p[1]+h*.36,p[2]+d/2+2],[w*.20,h*.61,4],C.dark,6,dark);
  frame([p[0],p[1]+h*.36,p[2]+d/2+4],w*.23,h*.65,C.patch,7,2,5);
  box([p[0]+w*.055,p[1]+h*.34,p[2]+d/2+8],[2,h*.15,2],C.steel);
  fixture([p[0],p[1]+h*.76,p[2]+d/2+5]);
  for(const side of [-1,1]){window([p[0]+side*(w/2+.6),p[1]+h*.57,p[2]-d*.16],d*.45,h*.30,side*Math.PI/2);panelBolts([p[0]+side*w*.4,p[1]+h*.52,p[2]+d/2+1.7],w*.12,h*.67);}
  const x=p[0]+w*.39,z=p[2]+d/2+6;
  pipe([[x,p[1]+h-6,z],[x+5,p[1]+h-10,z],[x+5,p[1]+17,z],[x+10,p[1]+11,z+2]],1.8);
  if(seed%2===0){vent([p[0]-w*.36,p[1]+h*.25,p[2]+d/2+2],w*.13,h*.13);valve([x+5,p[1]+23,z+3],3.5);}
  for(let i=0;i<3;i++)box([p[0]-w*.32+i*w*.32,p[1]+h+3,p[2]-d*.21],[w*.22,3,d*.31],i===seed%3?C.patch:C.steel,metal);
 }
 function ivy(p,length=38,seed=0){
  // Bent leaf blades and branching stems, never green rock-shaped clumps.
  const points=Array.from({length:5},(_,i)=>[p[0]+Math.sin(seed+i*1.7)*length*.08,p[1]-length*i/4,p[2]+Math.sin(i+seed)*3]);for(let i=1;i<points.length;i++)beam(points[i-1],points[i],.35,0x667148,leaf);
  for(let i=0;i<12;i++){
   const t=i/12,side=i%2?1:-1,x=p[0]+Math.sin(seed+t*6.8)*length*.08+side*length*.07,y=p[1]-length*t,z=p[2]+Math.sin(t*4+seed)*3;
   const g=new T.BufferGeometry(),s=2.4+(1-t)*2.5,a=[],outline=[[0,0,0],[.48,.42,.1],[1.2,.28,.15],[1.8,-.2,-.2],[1.16,-.62,.1],[.42,-.48,.3]],center=[side*s*.8,-s*.1,s*.17];
   for(let j=0;j<outline.length;j++)for(const v of [center,...[outline[j],outline[(j+1)%outline.length]].map(q=>[side*q[0]*s,q[1]*s,q[2]*s])])a.push(...v);
   // Curved ovate blades with a raised midrib, visible from both sides.
   const back=[];for(let j=0;j<a.length;j+=9)back.push(...a.slice(j,j+3),...a.slice(j+6,j+9),...a.slice(j+3,j+6));
   g.setAttribute('position',new T.Float32BufferAttribute([...a,...back],3));g.setAttribute('uv',new T.Float32BufferAttribute(new Array((a.length+back.length)/3*2).fill(0),2));g.computeVertexNormals();add(g,[x,y,z],[1,1,1],[0x536346,0x758057,0x354d3c,0x8a895b][(i+seed+40)%4],[.25*Math.sin(i),seed*.71+i*.7,.1],leaf);
  }
 }
 return {box,round,cyl,frame,beam,window,fixture,pipe,valve,rail,vent,panelBolts,module,ivy};
}
