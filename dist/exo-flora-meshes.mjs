import * as T from './assets/ev01/three.module.mjs';

export const floraRandom=n=>{const v=Math.sin(n*127.1+319.7)*43758.5453;return v-Math.floor(v)};
const rnd=floraRandom,up=new T.Vector3(0,1,0),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function buffer(){return {p:[],n:[],uv:[],color:[],pale:[]};}
function vertex(b,p,n,uv,c=[1,1,1],pale=0){b.p.push(p.x,p.y,p.z);b.n.push(n.x,n.y,n.z);b.uv.push(...uv);b.color.push(...c);b.pale.push(pale);}
function finish(b){const g=new T.BufferGeometry();for(const [name,key,size] of [['position','p',3],['normal','n',3],['uv','uv',2],['color','color',3],['barkPale','pale',1]])g.setAttribute(name,new T.Float32BufferAttribute(b[key],size));g.computeBoundingSphere();return g;}
// Continuous tapering ring surfaces: no stacked cylinders, cone roots or crown solids.
function limb(b,points,radius,endRadius,pale=0,sides=8){let length=0;
 const rings=points.map((p,j)=>{const tangent=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]).normalize(),axis=Math.abs(tangent.y)>.94?V(1,0,0):up,side=new T.Vector3().crossVectors(tangent,axis).normalize(),other=new T.Vector3().crossVectors(tangent,side).normalize(),t=j/(points.length-1),r=T.MathUtils.lerp(radius,endRadius,t)*(1+.035*Math.sin(j*3.7));if(j)length+=p.distanceTo(points[j-1]);return Array.from({length:sides+1},(_,i)=>{const a=i/sides*Math.PI*2,n=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(other,Math.sin(a));return {p:p.clone().addScaledVector(n,r),n,uv:[i/sides*.75,length*8],c:[.92+t*.08,.92+t*.08,.92+t*.08]};});});
 for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++)for(const ids of [[[j,k],[j,k+1],[j+1,k]],[[j,k+1],[j+1,k+1],[j+1,k]]]){const triangle=ids.map(([a,i])=>rings[a][i]),[a,c,d]=triangle,face=new T.Vector3().crossVectors(c.p.clone().sub(a.p),d.p.clone().sub(a.p));if(face.dot(a.n.clone().add(c.n).add(d.n))<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];for(const v of triangle)vertex(b,v.p,v.n,v.uv,v.c,pale);}
}
function curve(a,b,bend=.04,seed=0,segments=4){return Array.from({length:segments+1},(_,i)=>{const t=i/segments;return a.clone().lerp(b,t).add(V(Math.sin(t*Math.PI)*bend*Math.cos(seed),Math.sin(t*Math.PI)*bend*.5,Math.sin(t*Math.PI)*bend*Math.sin(seed)));});}
// Bent branch cards with botanical alpha, diffuse normals and varied orientations.
function spray(b,p,w,h,angle,tilt,slot,seed=0){const q=new T.Quaternion().setFromEuler(new T.Euler(tilt,angle,(rnd(seed+2)-.5)*.5)),verts=[],norms=[],uv=[];const col=slot%2,row=slot<2?1:0,c=[.82+rnd(seed+3)*.20,.84+rnd(seed+5)*.18,.80+rnd(seed+7)*.20];
 for(let y=0;y<3;y++)for(let x=0;x<2;x++){const t=y/2,point=V((x-.5)*w,(t-.42)*h,Math.sin(t*Math.PI)*h*.16).applyQuaternion(q).add(p);verts.push(point);norms.push(V((x-.5)*.45,.38+(t-.5)*.4,1).normalize().applyQuaternion(q));uv.push([col*.5+.008+x*.484,row*.5+.008+t*.484]);}
 for(const i of [0,1,2,1,3,2,2,3,4,3,5,4])vertex(b,verts[i],norms[i],uv[i],c);
}

export function treeGeometry(variant){const species=Math.floor(variant/2),seed=variant*171+19,wood=buffer(),leaf=buffer(),pale=species===1?1:0,lean=V((rnd(seed)-.5)*.09,0,(rnd(seed+1)-.5)*.08),stem=[];
 const top=species===0?.78:species===1?.94:species===2?1:.75;
 for(let j=0;j<=8;j++){const t=j/8;stem.push(V(lean.x*t+Math.sin(t*3+seed)*.010*t,t*top,lean.z*t+Math.sin(t*4+seed)*.009*t));}
 const radius=species===0?.024:species===1?.013:species===2?.021:.015;
 limb(wood,stem,radius,.0025,pale,12);
 // Small, mostly buried root flares follow the bole instead of radiating as spikes.
 for(let j=0;j<4;j++){const a=j*1.5+rnd(seed+j)*.7;limb(wood,[V(Math.cos(a)*radius*1.8,-.006,Math.sin(a)*radius*1.8),V(Math.cos(a)*radius*.8,.035,Math.sin(a)*radius*.8),V(0,.09,0)],radius*.35,.002,pale,6);}
 const count=species===2?16:species===1?9:11;
 for(let j=0;j<count;j++){const s=seed+j*31,a=j*2.399+(rnd(s)-.5)*1.25,start=species===2?.22+j*.042:species===1?.35+j*.052:.28+j*.041,
  spread=species===2?(.34*(1-start)+.025):species===1?.16+rnd(s+4)*.14:.21+rnd(s+4)*.20,
  A=V(lean.x*start,start,lean.z*start),B=V(Math.cos(a)*spread+lean.x,start+(species===2?.025:.14+rnd(s+5)*.15),Math.sin(a)*spread+lean.z);
  limb(wood,curve(A,B,.045,s,4),radius*(species===2?.26:.48)*(1-start*.5),.0015,pale,6);
  for(let k=0;k<4;k++){const t=.38+k*.20,C=A.clone().lerp(B,t),aa=a+(k%2?-.65:.65)*( .7+rnd(s+k)*.8),reach=(species===2?.07:.08)+rnd(s+k+8)*.10,
   D=C.clone().add(V(Math.cos(aa)*reach,(species===1?-.025:.025)+rnd(s+k+11)*.07,Math.sin(aa)*reach));
   limb(wood,curve(C,D,.018,s+k,2),.0028,.0005,pale,5);
   const size=species===2?.13+rnd(s+k+14)*.07:species===1?.13+rnd(s+k+14)*.09:.17+rnd(s+k+14)*.10,slot=[0,1,2,0][species];
   spray(leaf,D,size,size*(species===2?.85:1),aa, species===2?-1.05:species===1?.35:-.28,slot,s+k);
   spray(leaf,D.clone().add(V((rnd(s+k+19)-.5)*.055,.025,(rnd(s+k+23)-.5)*.055)),size*.85,size*.90,aa+1.3, -.45+rnd(s+k+13)*1.1,slot,s+k+50);
  }
 }
 // The crown breaks the straight trunk tip; young trees have lower, less even crowns.
 for(let j=0;j<12;j++){const a=j*2.4,p=V(lean.x+Math.cos(a)*.065,top-.06+rnd(seed+j+51)*.11,lean.z+Math.sin(a)*.065);spray(leaf,p,.15,.18,a,-.4,[0,1,2,0][species],seed+j+91);}
 return {wood:finish(wood),leaf:finish(leaf),species:['oak','birch','pine','young broadleaf'][species]};
}

export function grassGeometry(type=0){const b=buffer(),count=type===2?9:type===0?17:13;
 for(let k=0;k<count;k++){const seed=k*31+type*97,a=k*2.399+rnd(seed)*.7,spread=type===2?8:type===0?8.5:5,origin=V(Math.cos(a)*rnd(seed+2)*spread,0,Math.sin(a)*rnd(seed+3)*spread),height=(type===1?12:type===2?6:4)+rnd(seed+4)*(type===1?12:10),width=type===1?.21:type===2?.72:.32,bend=2+rnd(seed+9)*5,dir=V(Math.cos(a),0,Math.sin(a)),side=V(-dir.z,0,dir.x),verts=[];
  for(let j=0;j<=3;j++){const t=j/3,p=origin.clone().add(V(dir.x*bend*t*t,height*t,dir.z*bend*t*t)),w=width*(1-t)*(.70+.30*Math.sin(t*Math.PI));verts.push(p.clone().addScaledVector(side,-w),p.clone().addScaledVector(side,w));}
  const c=type===1?[.86,.81,.59]:type===2?[.66,.83,.52]:[.72,.85,.56];
  for(let j=0;j<3;j++)for(const i of (j===2?[4,5,6]:[j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2]))vertex(b,verts[i],V(dir.x*.6,.8,dir.z*.6).normalize(),[i%2,Math.floor(i/2)/3],c);
  if(type===1)for(let n=0;n<4;n++){const p=verts[6].clone().addScaledVector(dir,-n*.25);p.y-=n*.8;const s=.55-n*.08;for(const v of [p.clone().addScaledVector(side,-s),p.clone().add(V(0,1.4,0)),p.clone().addScaledVector(side,s)])vertex(b,v,up,[.5,.5],[.74,.66,.43]);}
 }
 return finish(b);
}

export function understoryGeometry(fern=false){const b=buffer();for(let j=0;j<(fern?7:10);j++){const a=j*2.399,w=fern?16:20,h=fern?27:24,p=V(Math.cos(a)*(fern?5:8),fern?10:14+rnd(j)*9,Math.sin(a)*(fern?5:8));spray(b,p,w,h,a,fern?-.85:-.15,fern?3:0,j*31+18);}return finish(b);}
