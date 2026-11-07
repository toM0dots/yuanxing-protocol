import * as T from './assets/ev01/three.module.mjs';
import {PALETTE as C} from './exo-interior-kit.mjs?v=20261106-sites82';

// Purpose-built equipment, authored inside a normalized 100-unit footprint.
// Each component is then fitted to the physical collision envelope supplied by
// the deck planner. No model or texture downloads; existing CC0 scans are shared.
export const PROGRAM_PROP_KINDS=['pump','cooling','archive','greenhouse','cargo','survey','weather','relay','drill','conveyor','ventilation','winch','bench','battery'];
export function drawProgramProp(b,p){
 if(!PROGRAM_PROP_KINDS.includes(p.kind))return false;
 const W=p.w,H=p.h,D=p.d,v=p.variant||0,scale=[W/100,H/100,D/100],origin=[p.x,0,p.y];
 const at=(x,y,z)=>[p.x+x*scale[0],y*scale[1],p.y+z*scale[2]];
 function add(g,x=0,y=0,z=0,color=C.case,kind=0,rotation=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));b.add(g,origin,scale,color,[0,0,0],kind);}
 function box(x,y,z,w,h,d,color=C.case,kind=0,rotation=[0,0,0]){
  const bevel=kind!==2&&kind!==8&&Math.min(w,h,d)>8&&Math.max(w,h,d)>40;
  const g=new T.BoxGeometry(w,h,d,bevel?3:1,bevel?3:1,bevel?3:1);
  if(bevel){const radius=.65,half=[w/2,h/2,d/2],p=g.attributes.position,n=g.attributes.normal;
   for(let i=0;i<p.count;i++){const raw=[p.getX(i),p.getY(i),p.getZ(i)],q=raw.map((a,k)=>Math.abs(a)<half[k]-.001?Math.sign(a)*(half[k]-radius):a),core=q.map((a,k)=>Math.max(-half[k]+radius,Math.min(half[k]-radius,a))),normal=new T.Vector3(...q.map((a,k)=>a-core[k])).normalize();p.setXYZ(i,core[0]+normal.x*radius,core[1]+normal.y*radius,core[2]+normal.z*radius);n.setXYZ(i,normal.x,normal.y,normal.z);}
  }
  add(g,x,y,z,color,kind,rotation);
 }
 function cyl(x,y,z,r,h,color=C.case,axis=[0,0,0],kind=0,segments=16){add(new T.CylinderGeometry(r,r,h,segments),x,y,z,color,kind,axis);}
 function ring(x,y,z,r,t=1.2,color=C.steel,axis=[0,0,0],kind=5){add(new T.TorusGeometry(r,t,4,20),x,y,z,color,kind,axis);}
 function beam(a,c,r=1.4,color=C.steel,kind=5){const A=new T.Vector3(...a),B=new T.Vector3(...c),g=new T.CylinderGeometry(r,r,A.distanceTo(B),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,0,0,0,color,kind);}
 function pipe(points,r=2.3,color=C.steel,kind=5){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),Math.max(8,points.length*3),r,6,false),0,0,0,color,kind);}
 function bolts(x,y,z,r,count=6,axis='z'){
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,px=Math.cos(a)*r,py=Math.sin(a)*r;cyl(x+(axis==='x'?0:px),y+(axis==='y'?0:axis==='x'?px:py),z+(axis==='y'?py:axis==='x'?py:0),1,1.5,C.steel,axis==='y'?[0,0,0]:axis==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0],5,6);}
 }
 function plinth(){box(0,4,0,91,8,88,C.dark);for(const x of [-37,37])for(const z of [-35,35]){box(x,3,z,13,6,15,C.steel,5);cyl(x,8,z,1.9,2,C.steel,[0,0,0],5,6);}}
 function screen(x,y,z,w=22,h=14,index=v%4){box(x,y,z-1.7,w+4,h+4,4,C.dark);b.screen(at(x,y,z+.6),w*scale[0],h*scale[1],index);}
 function grille(x,y,z,w,h){box(x,y,z,w+4,h+4,3,C.dark);for(let j=-h/2+2;j<h/2;j+=4)box(x,y+j,z+2,w,1.2,3,C.steel,5,[.3,0,0]);}
 function drum(x,y,z,r,length,color=C.case,axis=[Math.PI/2,0,0]){const profile=[[r*.7,-length/2],[r*.94,-length*.46],[r,-length*.36],[r,length*.36],[r*.94,length*.46],[r*.7,length/2]].map(q=>new T.Vector2(...q));add(new T.LatheGeometry(profile,20),x,y,z,color,0,axis);}
 function dish(x,y,z,r,axis=[0,0,0]){const points=[[0,0],[r*.25,r*.02],[r*.52,r*.09],[r*.78,r*.2],[r,r*.36],[r,r*.39],[r*.78,r*.24],[r*.52,r*.13],[r*.25,r*.06],[0,r*.04]].map(a=>new T.Vector2(...a));add(new T.LatheGeometry(points,20),x,y,z,C.ivory,0,axis);}

 if(p.kind==='pump'){
  plinth();box(-22,14,-9,30,13,37,C.case);box(21,13,8,35,10,40,C.case);
  drum(-22,37,-11,17,43,C.case);for(let i=0;i<7;i++)ring(-22,37,-30+i*5.4,17.4,.9,C.dark);
  cyl(-22,37,13,9,9,C.steel,[Math.PI/2,0,0],5);bolts(-22,37,17.7,12);
  // Offset volute and its tangential discharge distinguish a centrifugal pump.
  drum(16,35,15,21,18,0x6c8984);ring(16,35,26,20,1.8,C.steel);bolts(16,35,28,16,8);
  cyl(16,35,30,8,11,C.dark,[Math.PI/2,0,0]);ring(16,35,36,11,2,C.steel);
  pipe([[33,37,15],[37,54,12],[30,68,3],[6,68,-3]],4.1,0x6c8984,0);ring(6,68,-3,6,1.5,C.steel,[0,Math.PI/2,0]);
  pipe([[-22,58,-21],[-22,75,-20],[-7,80,-20]],1.2,C.rubber,0);screen(-19,77,-17,17,12,0);
 }else if(p.kind==='cooling'){
  plinth();for(const x of [-34,34])box(x,47,0,10,75,57,C.case);
  for(let i=0;i<12;i++)box(0,15+i*5.5,-2,61,2.2,55,i%3?C.steel:C.dark,5);
  for(const x of [-22,22]){pipe([[x,13,-32],[x,81,-32],[x,86,-17],[x,86,28],[x,75,32]],3.4,0x718e94,0);ring(x,80,-32,5,1.1,C.steel,[Math.PI/2,0,0]);}
  box(0,86,0,76,8,62,C.dark);screen(23,54,33,21,16,0);
  for(const y of [29,60]){ring(-17,y,32,14,2.1,C.steel);cyl(-17,y,32,4,5,C.dark,[Math.PI/2,0,0]);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;box(-17+Math.sin(a)*7,y+Math.cos(a)*7,31,7,15,2,C.dark,0,[0,.25,-a]);}}
 }else if(p.kind==='archive'){
  plinth();for(const x of [-40,40])box(x,51,-1,6,85,74,C.dark);box(0,91,0,86,6,77,C.case);box(0,49,-36,77,80,4,C.case);
  for(let row=0;row<5;row++){
   const y=17+row*15;box(0,y-5,0,79,3,71,C.steel,5);
   for(let col=0;col<4;col++){const x=-29+col*19.3;box(x,y+1,-1,16,12,65,(row+col+v)%3?0x777b70:0x969586);box(x,y+1,32.5,12,9,2,C.dark);box(x,y+1,34,7,1.3,2,C.ivory,8);box(x,y+4.4,34,4,1.1,1,(row+col)%4?C.green:C.amber,2);}
  }
  // A small angled reader explains how the sealed cartridges are used.
  box(0,93,10,29,6,25,C.dark);screen(0,93,23,24,7,1);
 }else if(p.kind==='greenhouse'){
  plinth();for(const x of [-40,40]){box(x,49,0,4,89,68,C.case);box(x,95,0,8,4,76,C.steel,5);}
  for(const y of [18,52]){
   box(0,y,0,76,6,70,0x687970);box(0,y+4,0,70,2,64,0x283d32,1);
   for(const z of [-23,0,23])for(const x of [-22,22]){
    cyl(x,y+7,z,6,6,0x5d6950,[0,0,0],0,10);
    const seed=(x+30)*.017+(z+28)*.03+v*.7;
    beam([x,y+10,z],[x+Math.sin(seed)*2,y+30,z],.6,0x526b46,7);
    for(let j=0;j<4;j++){
     const a=j*2.4+seed,len=12+j%2*4,start=y+10+j*3,positions=[],uv=[],indices=[];
     for(let k=0;k<=5;k++){const t=k/5,width=Math.max(.12,Math.sin(t*Math.PI)*4.6),reach=t*len,cy=start+Math.sin(t*Math.PI*.85)*9-t*t*3;
      for(const side of [-1,1]){positions.push(x+Math.cos(a)*reach+Math.sin(a)*width*side,cy-side*.7*Math.sin(t*Math.PI),z+Math.sin(a)*reach-Math.cos(a)*width*side);uv.push((side+1)/2,t);}
      if(k<5){const q=k*2;indices.push(q,q+1,q+3,q,q+3,q+2);}
     }
     const count=positions.length/3,back=[];for(let k=0;k<indices.length;k+=3)back.push(indices[k]+count,indices[k+2]+count,indices[k+1]+count);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...positions,...positions],3));g.setAttribute('uv',new T.Float32BufferAttribute([...uv,...uv],2));g.setIndex([...indices,...back]);g.computeVertexNormals();add(g,0,0,0,j%2?0x597544:0x718557,7);
    }
   }
  }
  for(const z of [-24,24]){box(0,91,z,64,4,8,C.dark);box(0,88.7,z,58,1.4,5,0xd1d5ac,2);}
  pipe([[-35,12,29],[-35,57,29],[-33,61,30],[33,61,30]],1.2,0x556e61,0);
 }else if(p.kind==='cargo'){
  box(0,7,0,91,7,89,C.dark);for(const x of [-34,34])box(x,3,0,14,6,82,C.steel,5);
  for(const z of [-30,-15,0,15,30])cyl(0,13,z,3.2,82,C.steel,[0,0,Math.PI/2],5,10);
  for(let i=0;i<3;i++){const x=i===2?0:(i-.5)*41,y=i===2?68:35,z=i===2?-4:0,w=i===2?62:37;
   box(x,y,z,w,i===2?28:36,66,(i+v)%2?0x7f8275:0x958977);for(const side of [-1,1]){box(x+side*(w/2-3),y,z,3,i===2?29:37,67,C.dark);box(x,y,z+side*34,w+1,4,3,C.dark);}
   box(x,y+3,z+34,14,9,1,C.ivory,8);box(x,y-5,z+35,8,2,1,C.amber,8);
  }
  for(const z of [-24,24])box(0,84,z,62,2.5,4,C.dark);
 }else if(p.kind==='survey'){
  plinth();for(const x of [-31,31])box(x,31,0,7,47,60,C.case);
  box(0,57,0,85,7,73,C.dark);box(0,61,0,72,2,59,0x607677,1);
  // Relief contours and an optical sampling arm, rather than another server.
  for(let i=0;i<4;i++)add(new T.CylinderGeometry(10+i*4,12+i*4,2.5,12),-13,64+i*2.5,-4,0x9eac9f,0);
  for(let i=0;i<5;i++)box(20,64,-21+i*10,13,1.8,4,0x99aaa0,8);
  cyl(30,74,-26,3,32,C.steel,[0,0,0],5);beam([30,89,-26],[-2,89,-26],3,C.case,0);cyl(-2,83,-26,5,10,C.dark);cyl(-2,77,-26,3.4,2,0xa2d2c6,[0,0,0],2);
  screen(0,47,38,28,13,1);for(const x of [-27,-20,20,27])cyl(x,63,29,2,2,C.dark,[0,0,0],0,10);
 }else if(p.kind==='weather'){
  plinth();box(0,20,0,36,23,35,C.case);cyl(0,58,0,4.5,66,C.steel,[0,0,0],5);screen(0,25,19,25,15,2);
  beam([-30,76,0],[30,76,0],2.2,C.steel,5);for(const x of [-27,27]){cyl(x,78,0,10,5,C.ivory);for(let i=0;i<4;i++)cyl(x,81+i*2.7,0,11,1.2,C.ivory,[0,0,0],0,16);}
  cyl(0,91,0,3,9,C.dark);for(let i=0;i<3;i++){const a=i*Math.PI*2/3,A=[Math.cos(a)*6,94,Math.sin(a)*6],B=[Math.cos(a)*21,94,Math.sin(a)*21];beam(A,B,1,C.steel);add(new T.SphereGeometry(5.5,10,5,0,Math.PI*2,0,Math.PI/2),...B,C.ivory,0,[0,0,Math.PI/2]);}
  pipe([[4,18,-12],[10,46,-14],[3,71,-4]],1.1,C.rubber,0);
 }else if(p.kind==='relay'){
  plinth();box(-22,35,-5,31,52,57,C.dark);for(let i=0;i<5;i++){const y=16+i*9;box(-22,y,25,26,7,3,C.case);box(-30,y,27.5,2,2,1,i===v?C.amber:C.green,2);grille(-18,y,27,13,4);}
  cyl(15,40,-5,5,58,C.steel,[0,0,0],5);dish(15,66,-5,29,[.44,0,0]);beam([15,64,-5],[15,91,-16],1.3,C.dark,0);cyl(15,90,-16,3,5,C.dark);
  ring(15,66,-5,11,1.4,C.steel,[Math.PI/2,0,0]);pipe([[-24,51,-25],[-31,63,-32],[1,63,-32],[15,47,-18]],2,C.rubber,0);
 }else if(p.kind==='drill'){
  plinth();for(const x of [-35,35])box(x,49,-9,8,81,39,C.dark);
  box(0,85,-9,79,12,45,C.case);box(0,69,-9,33,20,35,0x92958b);cyl(0,49,-9,7,36,C.steel,[0,0,0],5);
  // Continuous helical flights cast a recognizable spiral around the shaft.
  const points=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*9;points.push(new T.Vector3(Math.cos(a)*12,24+i/80*38,Math.sin(a)*12-9));}
  add(new T.TubeGeometry(new T.CatmullRomCurve3(points),80,2.6,4,false),0,0,0,C.steel,5);
  add(new T.ConeGeometry(8,13,12),0,17,-9,C.dark,0,[Math.PI,0,0]);
  for(const x of [-35,35]){beam([x,15,17],[x,76,17],2,C.steel);for(const y of [22,56,77])box(x,y,18,13,5,7,C.case);}
  screen(29,49,20,19,13,0);pipe([[-20,78,-23],[-24,61,-26],[-16,52,-26],[-15,28,-25]],2,C.rubber,0);
 }else if(p.kind==='conveyor'){
  for(const x of [-37,37])for(const z of [-35,35])box(x,20,z,6,40,8,C.case);
  for(const x of [-40,40])box(x,42,0,7,11,88,C.dark);
  box(0,44,0,72,4,86,0x3a403b);for(let i=0;i<10;i++)cyl(0,44,-39+i*8.7,3.1,72,C.steel,[0,0,Math.PI/2],5,10);
  for(let i=0;i<7;i++){const x=Math.sin(i*2.1+v)*22,z=-30+i*10;add(new T.IcosahedronGeometry(7+i%3,0),x,55+i%2*2,z,i%3?0x696c5c:0x9f8c65,7,[i*.2,i,0]);}
  box(0,83,-29,89,8,16,C.case);for(const x of [-42,42])box(x,62,-29,6,44,17,C.case);box(0,77,-29,58,2,6,C.green,2);
  cyl(0,32,30,7,49,C.dark,[0,0,Math.PI/2]);screen(31,58,37,19,13,0);
 }else if(p.kind==='ventilation'){
  plinth();box(0,14,-1,77,14,64,C.dark);drum(0,55,-8,35,53,0x81908b);ring(0,55,21,36,2.4,C.steel);ring(0,55,-36,35,2,C.dark);
  cyl(0,55,16,8,13,C.case,[Math.PI/2,0,0]);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;box(Math.sin(a)*20,55+Math.cos(a)*20,15,13,30,3,0x969b8e,0,[0,.3,-a]);}
  // Safety grille ahead of the blades; housing stays cylindrical.
  for(const y of [-24,-12,0,12,24]){const width=Math.sqrt(35*35-y*y);beam([-width,55+y,24],[width,55+y,24],.7,C.dark,0);}bolts(0,55,24,31,8);
  screen(29,16,35,19,11,2);pipe([[-23,20,-20],[-37,32,-19],[-38,50,-18]],2,C.rubber,0);
 }else if(p.kind==='winch'){
  plinth();for(const x of [-35,35]){box(x,32,0,12,46,64,C.case);ring(x,50,0,27,2.2,C.steel,[0,Math.PI/2,0]);}
  cyl(0,50,0,19,61,C.dark,[0,0,Math.PI/2]);for(let i=0;i<11;i++)ring(-27+i*5.4,50,0,20,1.3,0x8a8d7d,[0,Math.PI/2,0]);
  cyl(-38,50,0,9,9,C.steel,[0,0,Math.PI/2],5);cyl(38,50,0,13,10,C.case,[0,0,Math.PI/2]);bolts(44,50,0,8,6,'x');
  for(const x of [-24,24])beam([x,14,35],[x,80,35],2,C.steel);beam([-24,80,35],[24,80,35],2.5,C.case,0);cyl(0,76,35,7,40,C.steel,[0,0,Math.PI/2],5);
  pipe([[0,52,20],[0,69,30],[0,77,35],[0,57,39],[0,26,39]],1.5,C.dark,0);ring(0,22,39,5,1.4,C.steel);
 }else if(p.kind==='bench'){
  for(const x of [-36,36])box(x,30,0,7,60,65,C.dark);box(0,61,0,88,7,76,C.case);
  box(-23,29,-4,23,42,55,0x8c8f80);for(let i=0;i<4;i++){const y=15+i*9;box(-23,y,25,20,7,3,C.dark);box(-23,y,28,9,1.6,2,C.steel,5);}
  box(0,83,-34,84,30,5,C.dark);for(let i=0;i<8;i++){const x=-30+i*8.5;box(x,83,-30,2,19-i%3*3,2,C.steel,5);ring(x,92-i%3,-30,2.4,.7,C.steel);}
  cyl(24,69,-7,7,9,C.steel,[0,0,0],5);box(24,77,-7,18,8,11,C.dark);beam([15,77,-7],[36,77,-7],1.2,C.steel);
  box(-17,68,15,22,7,17,C.case);screen(-17,72,25,19,8,1);
 }else if(p.kind==='battery'){
  plinth();for(const x of [-38,38])box(x,50,-3,6,84,65,C.dark);box(0,94,-3,82,7,67,C.case);
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){const x=-26+col*17.3,y=31+row*37;drum(x,y,-4,6.5,27,col===v?0x8d9377:0x677f76,[0,0,0]);cyl(x,y+15,-4,3.1,4,C.steel,[0,0,0],5);pipe([[x,y+18,-4],[x,y+21,12],[x,y+16,25]],1.1,row?C.dark:0x9d7552,0);}
  for(const y of [12,49,87])box(0,y,0,77,3,61,C.steel,5);screen(0,66,34,24,13,0);box(0,38,33,43,6,4,C.dark);
 }
 return true;
}
