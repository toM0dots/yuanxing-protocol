import * as T from './assets/ev01/three.module.mjs';
import {PALETTE as C} from './exo-interior-kit.mjs?v=20261106-sites82';
import {roomStorySlots,storyFamily} from './exo-room-stories.mjs?v=20261106-lived85';

// Native, solid scene compositions. Every mesh is packed into the room's
// existing material batches. No point lights, text plaques or new textures.
// Clothes, padded luggage and bent sheet metal have actual folded surfaces.
const P={cloth:0x967559,linen:0xb5ad91,green:0x728a70,ink:0x364842,rust:0x78604d,dust:0x736f5d,clean:0x959d8b};
export function drawStoryComposition(b,p,kind,{index=0,family='research',yaw=0,fragment=p.asset,state=p.state||''}={}){
 const height=Math.min(p.h,Math.max(p.w,p.d)*.88),scale=[p.w/100,height/100,p.d/100],origin=[p.x,0,p.y];
 const matrix=new T.Matrix4().makeRotationY(yaw),parts=[];
 function add(g,x=0,y=0,z=0,c=C.case,k=0,rot=[0,0,0]){g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));if(fragment){parts.push({g,c,k});return;}g.applyMatrix4(matrix);b.add(g,origin,scale,c,[0,0,0],k);}
 function box(x,y,z,w,h,d,c=C.case,k=0,rot=[0,0,0]){add(new T.BoxGeometry(w,h,d),x,y,z,c,k,rot);}
 function cyl(x,y,z,r,h,c=C.steel,rot=[0,0,0],k=5){add(new T.CylinderGeometry(r,r,h,12),x,y,z,c,k,rot);}
 function orb(x,y,z,w,h,d,c,k=8,rot=[0,0,0]){const g=new T.SphereGeometry(1,12,8);g.scale(w,h,d);add(g,x,y,z,c,k,rot);}
 function cushion(x,y,z,w,h,d,c,rot=[0,0,0]){
  const g=new T.BoxGeometry(w,h,d,4,4,4),v=g.attributes.position,half=[w/2,h/2,d/2],radius=Math.min(w,h,d)*.35;
  for(let i=0;i<v.count;i++){const q=[v.getX(i),v.getY(i),v.getZ(i)],core=q.map((n,j)=>T.MathUtils.clamp(n,-half[j]+radius,half[j]-radius)),n=new T.Vector3(...q.map((n,j)=>n-core[j])).normalize();v.setXYZ(i,core[0]+n.x*radius,core[1]+n.y*radius,core[2]+n.z*radius);}
  g.computeVertexNormals();add(g,x,y,z,c,8,rot);
 }
 function ring(x,y,z,r,t=1,c=C.steel,rot=[0,0,0],k=5){add(new T.TorusGeometry(r,t,4,18),x,y,z,c,k,rot);}
 function line(a,z,r=1,c=C.steel,k=5){const A=new T.Vector3(...a),B=new T.Vector3(...z),g=new T.CylinderGeometry(r,r,A.distanceTo(B),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,0,0,0,c,k);}
 function hose(points,r=1,c=C.rubber,k=0){add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*3),r,5,false),0,0,0,c,k);}
 function cloth(x,y,z,w,d,c=P.cloth,drop=0,angle=0){
  if(y<10&&!pallet&&!shelf)y=1.8;
  const g=new T.PlaneGeometry(w,d,10,8);g.rotateX(-Math.PI/2);const v=g.attributes.position;
  for(let i=0;i<v.count;i++){const px=v.getX(i),pz=v.getZ(i),edge=Math.max(0,(pz/d+.5-.7)/.3),fold=(fragment?1.6:1);v.setY(i,(Math.sin(px*.6+pz*.16)*.8+Math.cos(px*.23-pz*.31)*.55)*fold-drop*edge*edge);v.setX(i,px+Math.sin(pz*.42)*(fragment?1.1:.32));}
  g.computeVertexNormals();
  // A doubled hem gives cloth thickness and prevents a back-facing hole when
  // the viewer looks at a draped edge from below.
  const hem=g.clone();hem.translate(0,-.38,0);const q=hem.index.array;for(let i=0;i<q.length;i+=3){const t=q[i+1];q[i+1]=q[i+2];q[i+2]=t;}hem.computeVertexNormals();add(g,x,y,z,c,8,[0,angle,0]);add(hem,x,y,z,c,8,[0,angle,0]);
 }
 function mark(x,y,z,f=family,size=8){const col=f==='evacuation'?P.linen:f==='maintenance'?C.amber:0x7a9b9c;
  // Repeated physical stitching / inventory paint links objects across sites.
  for(const dx of [-size*.22,size*.22])box(x+dx,y,z,size*.16,size*.7,.35,col,8,[0,0,-.22]);
  box(x,y-size*.45,z,size*.86,.7,.4,col,8);
 }
 function bag(x,y,z,s=1,c=P.cloth){
  if(y<10&&!pallet&&!shelf)y=.8;
  orb(x,y+7*s,z,12*s,7*s,8*s,c,8,[0,.12,0]);
  for(const dx of [-6,6]){hose([[x+dx*s,y+3*s,z+7*s],[x+dx*s,y+11*s,z+3*s],[x+dx*s,y+12*s,z-3*s],[x+dx*s,y+3*s,z-7*s]],.6*s,P.ink);box(x+dx*s,y+6*s,z+7.5*s,2*s,2.6*s,.6*s,C.steel,5);}
  hose([[x-4*s,y+11*s,z],[x-3*s,y+15*s,z],[x+3*s,y+15*s,z],[x+4*s,y+11*s,z]],.6*s,P.linen,8);mark(x,y+6*s,z+7.7*s,'evacuation',4*s);
 }
 function bottle(x,y,z,s=1,c=C.ivory){
  if(y<10&&!pallet&&!shelf)y=.6;
  const pts=[[0,0],[3.5,0],[4,2],[4,18],[3.7,20],[2,22],[1.6,24],[0,24]].map(([r,h])=>new T.Vector2(r*s,h*s));add(new T.LatheGeometry(pts,12),x,y,z,c,0);
  cyl(x,y+25*s,z,1.8*s,2*s,C.steel);box(x,y+11*s,z+4*s,4*s,5*s,.3*s,P.green,8);
 }
 function oxygen(x,y,z,s=1){
  if(y<10&&!pallet&&!shelf)y=.6;
  bottle(x,y,z,s,C.ivory);ring(x,y+12*s,z,4.4*s,.55*s,P.ink,[Math.PI/2,0,0],0);hose([[x,y+25*s,z],[x+6*s,y+23*s,z],[x+6*s,y+7*s,z+2*s]],.55*s,C.rubber);
 }
 function tool(x,y,z,angle=.3){line([x-6*Math.sin(angle),y,z-6*Math.cos(angle)],[x+6*Math.sin(angle),y,z+6*Math.cos(angle)],.8,C.steel);ring(x+6*Math.sin(angle),y,z+6*Math.cos(angle),2,.65,C.steel,[Math.PI/2,0,0]);}
 function glove(x,y,z,flip=1){orb(x,y+1.2,z,2.5,1.2,3.8,P.linen);for(let i=0;i<4;i++)orb(x+(i-1.5)*1.1,y+1,z+4+(i%2)*.7,.7,.7,2,P.linen);orb(x+flip*3,y+1,z,1.4,.8,2.3,P.linen);}
 function cup(x,y,z){if(y<10&&!pallet&&!shelf)y=.6;cyl(x,y+2.8,z,2.4,5,C.ivory);cyl(x,y+5.4,z,2, .3,P.ink,[0,0,0],8);ring(x+2.9,y+3,z,1.5,.5,C.ivory);}
 function seat(x,z,blanket=false){
  for(const dx of [-11,11]){line([x+dx,pallet?5:1.5,z-7],[x+dx,27,z-7],1.1);line([x+dx,pallet?5:1.5,z+9],[x+dx,25,z+8],1.1);}
  cushion(x,27,z,29,6.6,24,P.green);cushion(x,44,z-11,29,34,5.6,P.green,[-.12,0,0]);
  for(const dx of [-12,12]){line([x+dx,31,z-7],[x+dx,57,z-8],.35,P.linen,8);line([x+dx,30,z-8],[x+dx,30,z+9],.3,P.linen,8);}
  line([x-12,57,z-8],[x+12,57,z-8],.35,P.linen,8);
  for(const dx of [-8,8]){hose([[x+dx,59,z-8],[x+dx*.8,41,z-5],[x+dx*.6,29,z+7]],.9,P.ink);box(x+dx*.6,29,z+8,3,4,1,C.steel,5);}
  if(blanket)cloth(x+3,32,z+5,21,21,P.linen,8,.18);
 }
 function rack(){for(const x of [-40,40])for(const z of [-27,27])line([x,4,z],[x,82,z],1.5);for(const h of [5,36,69]){box(0,h,0,84,3,58,C.case);box(0,h+2,29,85,3,2,C.steel,5);}line([-40,8,-28],[40,80,-28],1.1);}
 function desk(){for(const x of [-36,36])for(const z of [-24,24])line([x,3,z],[x,42,z],1.5);box(0,43,0,84,3,59,C.case);box(0,40,-26,80,8,4,C.dark);}
 function pad(x,y,z,w=18,d=13){box(x,y,z,w,1,d,P.ink,8);for(const dx of [-w*.44,w*.44])box(x+dx,y+.6,z,1, .3,d,P.clean,8);}
 function hardcase(x,y,z,s=1,open=false){
  if(y<10&&!pallet&&!shelf)y=.7;
  box(x,y+8*s,z,27*s,16*s,21*s,C.case);box(x,y+3*s,z+10.7*s,24*s,5*s,1*s,C.dark);
  for(const dx of [-11,11]){box(x+dx*s,y+8*s,z+11*s,2*s,14*s,1.5*s,C.steel,5);box(x+dx*s,y+15*s,z+11*s,3*s,4*s,2*s,C.dark);}
  if(open){box(x,y+19*s,z-10*s,27*s,18*s,2*s,C.case,0,[-.5,0,0]);box(x,y+16*s,z,23*s,1*s,17*s,P.ink,8);}
  else box(x,y+17*s,z,27*s,2*s,21*s,C.steel,5);
  mark(x,y+10*s,z+11.6*s,family,7*s);
 }
 function cross(x,y,z,s=1){box(x,y,z,8*s,2*s,.4,P.linen,8);box(x,y,z,2*s,8*s,.45,P.linen,8);}
 function wornPlate(x,y,z,w,h,tilt=.15){
  const g=new T.PlaneGeometry(w,h,6,4),v=g.attributes.position;
  for(let i=0;i<v.count;i++){const px=v.getX(i),py=v.getY(i);v.setZ(i,Math.max(0,px/w+.12)**2*6+Math.sin(py*.3)*.4);}
  g.computeVertexNormals();add(g,x,y,z,C.case,0,[0,tilt,.09]);
  for(let i=0;i<5;i++)box(x-w*.32+i*w*.14,y-h*.28+i*1.3,z+.7,5+i, .6,.3,P.rust,8,[0,0,.2]);
 }
 function slashes(x,y,z,n=5){for(let i=0;i<n;i++)box(x+(i-n/2)*2,y+i*.3,z,.6,5+(i%3)*2,.4,C.steel,5,[0,0,.38]);}
 function lamp(x,y,z,lit=true){if(y<10&&!pallet&&!shelf)y=.5;box(x,y+2,z,12,4,12,C.dark);line([x,y+3,z],[x,y+26,z],1.4);box(x,y+27,z,12,13,9,C.case);box(x,y+27,z+4.6,7,8,.6,lit?C.green:P.ink,lit?2:8);for(const dx of [-4,4])line([x+dx,y+21,z+5],[x+dx,y+33,z+5],.5);}
 function plant(x,y,z,s=1){
  cyl(x,y+3*s,z,5*s,6*s,P.rust,[0,0,0],0);cyl(x,y+6.1*s,z,4.3*s,.4,P.ink,[0,0,0],8);
  for(let i=0;i<4;i++){const a=i*2.4;line([x,y+6*s,z],[x+Math.cos(a)*5*s,y+(17+i)*s,z+Math.sin(a)*4*s],.35*s,P.green,8);orb(x+Math.cos(a)*5*s,y+(14+i)*s,z+Math.sin(a)*4*s,5*s,1*s,2.3*s,P.green,8,[.2,a,.45]);}
 }
 function tray(x,y,z,empty=false){if(y<10&&!pallet&&!shelf)y=1.8;box(x,y,z,31,3,24,C.case);for(const dx of [-10,0,10])for(const dz of [-6,6]){box(x+dx,y+1.7,z+dz,7,.6,8,P.ink,8);if(!empty&&dx<0)plant(x+dx,y+2,z+dz,.6);}}
 function seal(x,y,z){box(x,y,z,4,12,.5,P.linen,8);box(x,y+1,z+.4,2,3,.2,C.amber,8);}
 function drum(x,y,z,r=12,len=14){cyl(x,y,z,r,len,C.case,[Math.PI/2,0,0],0);ring(x,y,z+len/2+.5,r,.9,C.steel);cyl(x,y,z+len/2+1,r*.75,.5,P.ink,[Math.PI/2,0,0],8);}

 // Freight conversions and heavy machines keep their load frame. Ordinary
 // desks, shelves and belongings stand directly on the room's floor.
 const pallet=!fragment&&['passenger','conversion','bypass','locked','drill','rail','reroute'].includes(kind),shelf=!fragment&&['emptied','oxygen','belongings','handoff','film','missing','sealed'].includes(kind);
 if(fragment){
  // Each of these is a freestanding object, with its own grounded transform
  // and collision envelope. There is no shared plinth or catalogue layout.
  if(['chair','chair_turned','chair_fallen'].includes(fragment)){
   seat(0,0,false);if(state==='coat'){cloth(-4,61,-7,29,29,P.cloth,37,.21);cloth(11,52,-1,11,32,P.cloth,28,-.27);}
  }else if(fragment==='bench'){
   desk();
   // A partially pulled drawer, no matching partner on the other side.
   box(-22,33,23,25,9,29,C.dark);box(-22,34,38,28,12,2,C.case);box(-22,34,40,8,2,2,C.steel,5);
   if(['repair','brakes','lamp','storm','tools'].includes(state)){
    cloth(-19,46,9,32,33,P.linen,15,-.19);tool(-12,48,5,.86);glove(-25,48,15);drum(19,55,-9,10,12);
    if(state==='lamp')lamp(22,47,-12,true);else if(state==='storm')wornPlate(16,61,-6,34,30,.48);else if(state==='brakes'){ring(19,56,0,7,2,C.steel);box(19,47,18,16,3,9,P.rust,0,[0,.27,0]);}
    box(26,47,20,11,2,8,C.dark);for(let i=0;i<3;i++)cyl(21+i*3,48,19+(i%2)*2,.7,1,C.steel);
   }else if(state==='samples'||state==='strata'||state==='calibration'){
    pad(-18,46,-5,27,29);bottle(-25,47,-8,.63);bottle(-13,47,-6,.8);cloth(19,46,12,27,29,P.linen,12,.25);tool(18,48,5,-.51);
    if(state==='strata')for(let i=0;i<3;i++)box(21,49+i*4,-15,23,4,18,i===1?C.steel:P.rust,i===1?5:0);
    else drum(21,56,-14,9,9);
   }else if(state==='packing'){hardcase(-20,46,0,.9,true);cloth(17,47,7,31,37,P.cloth,21,.31);bottle(31,47,-16,.54);}
   else if(state==='meal'){cup(-23,46,14);box(13,47,-5,18,3,17,P.linen,8,[0,.26,0]);cyl(18,49,-10,3,4,C.case);cloth(-19,46,-6,23,27,P.green,0,.25);}
   else{for(let i=0;i<(state==='missing'?3:5);i++)box(-15+i*3,46+i*.3,-4+i*2,34, .6,29,P.linen,8,[0,i*.07-.19,0]);cup(29,46,-16);cloth(24,46,17,22,25,P.cloth,15,-.24);}
  }else if(fragment==='rack'){
   rack();hardcase(-23,7,-6,.84);if(state==='closed')hardcase(18,39,-7,.72);else{cloth(17,71,9,6,39,P.ink,28,.23);hose([[-24,68,-17],[-27,52,3],[-13,43,21]],.8,P.ink);pad(17,38,-5,24,29);if(state==='oxygen'){oxygen(-26,39,-9,.9);cross(-23,13,4,1);}}
  }else if(fragment==='bag'||fragment==='bag_open'){
   bag(0,0,0,1.25,fragment==='bag_open'?P.cloth:P.green);
   if(fragment==='bag_open'){box(-2,12,0,17,2,8,P.ink,8,[0,.15,0]);cloth(-5,13,6,19,18,P.linen,10,.34);hose([[-9,3,8],[-18,1,14],[-22,1,24]],.6,P.ink);}
  }else if(fragment==='case_open'||fragment==='case_closed'||fragment==='cases_left'){
   hardcase(0,0,0,1,fragment==='case_open');if(fragment==='cases_left'){hardcase(18,0,-12,.76);hardcase(-3,18,-3,.65);}
  }else if(fragment==='coat'||fragment==='cloth'){
   cloth(0,8,0,34,36,fragment==='coat'?P.cloth:P.linen,5,.24);if(fragment==='coat'){cloth(-18,6,2,13,24,P.cloth,3,-.65);cloth(17,5,8,12,25,P.cloth,2,.85);}
  }else if(fragment==='cup'){cup(0,0,0);}
  else if(fragment==='spill'){
   cyl(0,2,0,2.4,5,C.ivory,[0,0,Math.PI/2],0);ring(1,2,3,1.5,.5,C.ivory,[Math.PI/2,0,0]);
   for(const [x,z,w,d]of [[6,1,8,5],[11,3,6,3],[14,5,3,2]])orb(x,.25,z,w,.18,d,0x39453b,8);
  }else if(fragment==='tools'){
   cloth(-3,3,-2,31,25,P.cloth,0,.2);tool(-9,5,-1,.35);tool(3,4,5,-.71);glove(15,3,1);box(-7,4,11,2,2,12,C.dark);
  }else if(fragment==='panel'){
   wornPlate(0,5,0,33,26,.09);for(let i=0;i<3;i++)box(-11+i*7,2,14+(i%2)*5,3,2,5,C.ivory,0,[.2,i,.3]);
  }else if(fragment==='coil'){
   hose([[-17,1,9],[-21,2,-6],[-8,2,-13],[10,2,-7],[12,2,9],[-5,2,12],[-12,3,0],[0,3,-8],[9,3,1],[20,1,17]],1.1,P.ink);cyl(20,2,17,2,4,C.ivory,[.9,0,0]);
  }else if(fragment==='oxygen'||fragment==='oxygen_fallen'){oxygen(0,0,0,1.3);}
  else if(fragment==='seed_carrier'){tray(0,3,0,true);cloth(-4,5,0,13,17,P.linen,0,.3);}
  else if(fragment==='pot_spill'){
   cyl(0,3,0,5,7,P.rust,[0,0,1.2],0);for(let i=0;i<5;i++)orb(5+i*2,.7,3+(i%3)*2,2,.7,1.5,P.ink);line([2,1,-1],[17,1,9],.4,P.green,8);orb(14,1,7,5,.5,2,P.green);
  }else if(fragment==='seed_bed'){
   desk();box(0,45,0,76,4,48,P.ink,8);plant(-25,48,-10,1.4);plant(-12,48,11,1.2);plant(-25,48,12,.85);
   pad(18,48,-2,27,32);box(18,48.6,-2,23,.5,28,P.clean,8);hose([[-40,44,-25],[-16,45,-25],[31,44,-24]],1.3,0x769c8a,0);cloth(-33,48,19,12,24,P.linen,17,.3);
  }else if(fragment==='cot'){
   for(const x of [-18,18])for(const z of [-32,32]){line([x,5,z],[x,29,z],1.4);ring(x,5,z,3.8,1.2,C.dark,[0,Math.PI/2,0],0);}box(0,29,0,41,4,76,C.steel,5);cushion(0,34,0,38,7,72,P.linen);cloth(-7,39,7,34,54,P.green,29,-.11);cushion(0,39,-25,29,6,16,P.linen);
  }else if(fragment==='lamp'){lamp(0,0,0,true);}
  else if(fragment==='battery'){hardcase(0,0,0,.7);box(1,15,0,5,1,5,C.amber,8);}
  else if(fragment==='radio'||fragment==='receiver'){
   box(0,14,0,34,28,25,C.dark);box(0,14,13,29,22,2,C.case);drum(8,14,15,4,3);for(let i=0;i<5;i++)box(-8,7+i*3,15,12,1.2,1,C.steel,5);
   if(fragment==='receiver'){line([-12,28,-9],[-9,58,-9],.7);cyl(3,37,-6,13,3,C.ivory,[-.6,0,0],0);ring(3,38,-5,13,.8,C.steel,[-.6,0,0]);line([3,38,-3],[3,47,7],.7);}
   hose([[11,0,-8],[19,1,-10],[23,1,9]],.8,P.ink);
  }else if(fragment==='relay'){
   box(0,37,0,40,74,33,C.case);box(0,37,17,34,63,2,C.dark);for(let i=0;i<5;i++)box(0,15+i*10,18.5,28,7,2,P.ink);
   for(const [x,h,z]of [[-10,28,28],[1,20,30],[12,34,26]]){hose([[x,59,18],[x-4,43,24],[x,h,z]],1.2,P.ink);cyl(x,h,z,2.3,4,C.ivory);}
   box(0,72,0,44,3,36,C.case,0,[-.13,0,0]);seal(-14,62,20);
  }else if(fragment==='pump'){
   cyl(0,29,0,16,48,C.case,[0,0,0],0);for(const h of [10,47])ring(0,h,0,17,1.2,C.steel,[Math.PI/2,0,0]);hose([[-28,12,0],[-27,49,-3],[0,56,-3],[26,47,0]],3,C.case,0);hose([[-27,9,8],[-14,5,23],[21,5,19],[26,13,6]],1.5,P.green,0);ring(11,29,18,7,1.2,C.case);box(17,28,19,3,6,2,C.amber);seal(17,29,21);
  }else if(fragment==='sample_cart'){
   for(const x of [-24,24])for(const z of [-17,17]){line([x,5,z],[x,42,z],1.1);ring(x,4,z,3,1,C.dark,[0,Math.PI/2,0],0);}box(0,42,0,56,3,41,C.case);box(0,18,0,51,2,35,C.dark);hardcase(-9,20,0,.65,true);
   if(state==='cores'){for(let i=0;i<3;i++)cyl(-16+i*14,48,-4,3.5,23,P.rust,[0,0,.25],0);}
   else if(state!=='empty'){bottle(-16,44,-9,.7);bottle(-4,44,-8,.7);pad(16,44,2,14,19);}else pad(7,44,-4,31,23);cloth(-17,45,14,18,20,P.linen,17,-.21);
  }else if(fragment==='drill'){
   for(const x of [-27,27]){box(x,26,0,8,49,18,C.case);line([x,2,20],[x,47,0],2);}cyl(0,48,0,12,58,C.steel,[0,0,Math.PI/2]);for(const x of [-24,-10,3,16,26])ring(x,48,0,13,1.2,C.steel,[0,Math.PI/2,0]);box(-9,23,-15,23,15,8,C.dark);seal(-9,23,-10);
  }else if(fragment==='filter'){
   box(0,23,0,31,46,8,C.case);for(let i=0;i<8;i++)box(-12+i*3.4,23,5,1.7,39,3,state==='used'?P.ink:C.ivory,8);box(0,2,0,35,4,18,C.dark);if(state==='used')for(let i=0;i<7;i++)box(-12+i*4,12+(i%3)*8,7,4,6,.6,P.dust,8);
  }else if(fragment==='brake'){
   drum(0,15,0,14,13);ring(0,15,8,9,2,C.steel);box(-12,15,10,5,25,6,C.case);box(9,2,17,12,3,8,P.rust,0,[0,.27,0]);
  }else if(fragment==='rail'){
   for(const x of [-10,10]){box(x,5,-13,3,7,38,C.steel,5);box(x+4,6,23,3,7,19,C.steel,5,[0,-.27,0]);}for(const z of [-27,-12,4,22])box(0,2,z,36,3,6,P.rust);box(12,7,12,3,6,9,C.steel,5,[0,.5,.12]);
  }else if(fragment==='film'){
   hardcase(0,0,0,1.2,true);drum(-6,26,-3,11,6);drum(12,11,11,9,4);cloth(-6,22,12,22,29,P.linen,16,.27);
  }
  const pose=new T.Matrix4().makeRotationFromEuler(new T.Euler(fragment==='panel'?-Math.PI/2:0,0,fragment==='chair_fallen'?1.36:fragment==='oxygen_fallen'?Math.PI/2:0));
  const bounds=new T.Box3();for(const part of parts){part.g.applyMatrix4(pose);part.g.computeBoundingBox();bounds.union(part.g.boundingBox);}
  if(!parts.length)throw Error('Unknown room object: '+fragment);
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),factor=Math.min((p.baseW||p.w)/size.x,(p.baseD||p.d)/size.z,p.h/Math.max(size.y,.001))*.985;
  for(const {g,c,k}of parts){g.translate(-center.x,-bounds.min.y,-center.z);g.scale(factor,factor,factor);g.applyMatrix4(matrix);b.add(g,origin,[1,1,1],c,[0,0,0],k);}
  return;
 }
 throw Error('A room object requires its own physical placement');
}

export function drawRoomStory(b,r,deck,siteId){
 const slots=roomStorySlots(siteId,deck,r),moment=r.moment;
 for(const slot of slots)drawStoryComposition(b,slot.p,slot.kind,slot);
 if(!moment)return new Set();
 const anchor=moment.anchors[0];if(!anchor)return new Set(slots.map(s=>s.p));
 const stain=(x,z,w,d,color=0x4d5145,turn=0)=>{
  const shape=new T.Shape();for(let i=0;i<13;i++){const a=i*Math.PI*2/12,rad=1+Math.sin(i*2.17)*.12,xx=Math.cos(a)*w*.5*rad,zz=Math.sin(a)*d*.5*rad;if(i===0)shape.moveTo(xx,zz);else shape.lineTo(xx,zz);}const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);b.add(g,[x,1.05,z],[1,1,1],color,[0,turn,0],8);
 };
 const scratch=(a,c,color=0x60685b,width=1.3)=>{const dx=c.x-a.x,dz=c.y-a.y;b.box([(a.x+c.x)/2,1.35,(a.y+c.y)/2],[Math.hypot(dx,dz),.4,width],color,[0,-Math.atan2(dz,dx),0],8);};
 const at=(x,z)=>({x:anchor.x+x*Math.cos(anchor.yaw)+z*Math.sin(anchor.yaw),y:anchor.y+z*Math.cos(anchor.yaw)-x*Math.sin(anchor.yaw)});
 const contact=at(0,anchor.d*.46);
 if(['drag','wheels','shoes'].includes(moment.trace)){
  const moved=moment.anchors.find(p=>p.asset.startsWith('chair'))||anchor;
  // Unequal broken sweeps terminate at the displaced chair / trolley feet.
  for(const side of [-1,1])for(const [start,end]of [[0,.22],[.32,.63],[.73,1]]){const dx=-57,dz=74;scratch({x:moved.x+side*20+dx*start,y:moved.y+dz*start},{x:moved.x+side*20+dx*end,y:moved.y+dz*end},0x5c6255,1.2);}
  stain(moved.x-49,moved.y+63,48,67,0x6d7061,-.41);
 }else if(moment.trace==='soil'){
  const pot=slots.find(s=>s.p.asset==='pot_spill')?.p;
  if(pot){
   const cs=Math.cos(pot.yaw),sn=Math.sin(pot.yaw),ground=(x,z)=>({x:pot.x+x*cs+z*sn,y:pot.y+z*cs-x*sn});
   const q=ground(12,8);stain(q.x,q.y,39,23,0x292b20,pot.yaw+.3);
   // A granular fan starts at the fallen pot's mouth; it is not a large,
   // repeated puddle under the centre of every planting table.
   for(let i=0;i<23;i++){const reach=8+(i*.618%1)*38,spread=Math.sin(i*2.4)*reach*.36,a=ground(reach,spread+5),sz=1.1+(i*1.37%1)*1.5;b.add(new T.IcosahedronGeometry(sz,0),[a.x,sz*.5,a.y],[1,.65,.8],i%3?0x373526:0x45412e,[0,i*.7,.12],8);}
  }
 }else if(['water','mineral'].includes(moment.trace)){
  stain(contact.x,contact.y,126,63,0x4a5950,.23);
  for(const [dx,dz,w,d]of [[27,27,46,19],[55,36,27,13],[71,51,12,8]]){const q=at(dx,anchor.d*.46+dz);stain(q.x,q.y,w,d,0x586359,.34);}
 }else if(moment.trace==='cable'){
  const power=moment.anchors.find(p=>p.asset==='battery'),light=moment.anchors.find(p=>p.asset==='lamp'||p.asset==='receiver');
  if(power&&light&&Math.abs(power.x-light.x)<150&&Math.hypot(power.x-light.x,power.y-light.y)<600){
   b.tube([[power.x,5,power.y],[power.x-19,2,power.y+27],[(power.x+light.x)/2-31,2,(power.y+light.y)/2],[light.x-17,2,light.y+19],[light.x,6,light.y]],2.1,P.ink);
  }
  stain(contact.x-17,contact.y+11,43,24,0x4b5045,-.31);
 }else if(moment.trace==='cup'){
  const cup=slots.find(s=>s.p.asset==='cup'||s.p.asset==='spill')?.p;
  if(cup){stain(cup.x+10,cup.y+7,21,14,0x39463c,.31);stain(cup.x+20,cup.y+11,8,5,0x4a5547,-.14);}
 }else if(moment.trace==='dust'){
  stain(anchor.x-21,anchor.y+anchor.d*.55,128,43,0x6d7061,.13);
  for(const [dx,dz]of [[-31,21],[12,34],[47,25]]){const q=at(dx,anchor.d*.5+dz);stain(q.x,q.y,16,35,0x4d554c,.42);}
 }else if(moment.trace==='paper'||moment.trace==='packing'){
  for(const [dx,dz,w,d,turn]of [[29,27,17,24,.21],[-31,45,21,17,-.68],[47,63,10,19,.83]]){const q=at(dx,anchor.d*.45+dz);stain(q.x,q.y,w,d,0x898c77,turn);}
 }else if(moment.trace==='repair'||moment.trace==='debris'){
  stain(contact.x-9,contact.y+13,81,42,0x424a40,-.12);
  for(const [dx,dz,l,turn]of [[21,22,7,.4],[-18,31,11,-.73],[38,43,5,.8],[-32,17,8,-.2]]){const q=at(dx,anchor.d*.45+dz);b.box([q.x,2,q.y],[l,1.3,3],C.steel,[.15,turn,.1],5);}
 }
 // Damage is tied to the work in this room. The loose cover below an opened
 // cabinet, mineral streaks by a bypass, and storm debris have different shapes.
 const damage=moment.damage;if(damage){
  const x=r.x+Math.sign(anchor.x-r.x||1)*r.w*.35,z=r.y-r.d/2+24;
  if(damage==='opened'||damage==='storm'){
   b.box([x,174,z],[104,126,2],C.dark);
   if(damage==='storm'){
    const g=new T.PlaneGeometry(115,135,6,5),v=g.attributes.position;
    for(let i=0;i<v.count;i++){const xx=v.getX(i),yy=v.getY(i);v.setZ(i,Math.max(0,(xx+30)/85)*5+Math.sin(yy*.11)*1.3);if(xx>35&&yy<0)v.setX(i,xx-13);}
    g.computeVertexNormals();b.add(g,[x-32,151,z+3],[.54,.78,1],0x7d877d,[0,.04,-.19],0);
   }
   b.tube([[x-33,226,z+3],[x-29,185,z+7],[x-16,142,z+5]],2.3,C.rubber);
   b.tube([[x+23,228,z+3],[x+29,170,z+6],[x+20,132,z+4]],2,C.rubber);
   for(const dx of [-47,47])for(const h of [117,231])b.bolt([x+dx,h,z+4],2.5);
  }else if(damage==='mineral'){
   for(const [dx,h,w]of [[-49,46,8],[-32,37,4],[-11,52,12],[9,32,5],[31,44,9],[49,28,4]]){b.box([x+dx,h*.5+13,z],[w,h,1],0x5c6a5c,[0,0,0],8);}
  }else if(damage==='removed'){
   // An absent mounting is quieter than a display of evenly spaced labels.
   b.box([x-13,159,z],[53,91,1],0x929787,[0,0,0],8);for(const [dx,h]of [[-34,121],[8,121],[-34,198],[8,198]]){b.box([x+dx,h,z+2],[9,11,4],C.dark);b.bolt([x+dx,h,z+5],2.3);}
   b.box([x+29,141,z],[2,54,1],C.steel,[0,0,-.11],5);
  }else if(damage==='handled'){
   for(const [dx,h,len,turn]of [[-17,71,43,.14],[11,65,31,-.17],[26,81,21,.26]])b.box([x+dx,h,z],[1.4,len,1],0x737b70,[0,0,turn],8);
  }
 }
 return new Set(slots.map(s=>s.p));
}

export function dressClueContext(b,clue){
 if(!clue?.siteId)return;
 const family=storyFamily(clue.siteId),color=family==='evacuation'?P.linen:family==='maintenance'?C.amber:0x7a9b9c;
 // A small worn inventory mark remains; belongings are arranged in the room,
 // not duplicated as the same ribbon at the foot of every handled object.
 b.box([-9,18,51],[3,9,.7],color,[0,0,-.22],8);
}
