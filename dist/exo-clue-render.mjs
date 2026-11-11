import * as T from './assets/ev01/three.module.mjs';
import {createInteriorMaterials,createInteriorBuilder,PALETTE as C} from './exo-interior-kit.mjs?v=20261106-diary83';
import {dressClueContext} from './exo-room-story-art.mjs?v=20261110-props1';

// Physical storytelling props. No screen-sized lore plaques or floating icons.
// The moving part is kept separate from the three material batches of the body.
export function createClueObject(clue,materials){
 const b=createInteriorBuilder(materials,null),m=createInteriorBuilder(materials,null),reveal=new T.Group(),root=new T.Group();
 const k=clue.kind,caseKinds=['case','cargo','seed','sample'];let axis='x',angle=-1.12,pivot=[0,90,-38];
 const box=(p,s,c=C.case)=>b.box(p,s,c),metal=(p,s,c=C.steel)=>b.box(p,s,c,[0,0,0],5);
 // Contact wear, not a matching fan of bright stripes around every clue.
 // Short, broken scuffs stay at actual feet or the side a case was pulled from.
 const trace=(x,z,w,d,turn=0)=>b.box([x,.8,z],[w,.5,d],0x525b4e,[0,turn,0],8);
 if(caseKinds.includes(k)){trace(59,47,2,19,.18);trace(63,65,1.2,11,.23);trace(-48,39,1.5,9,-.11);}
 else if(k==='seat'){trace(-46,36,1.7,17,-.16);trace(47,44,1.2,26,-.08);}
 else if(['valve','coil','weather','gauge'].includes(k)){trace(-44,48,2,13,.22);trace(38,52,1.4,8,-.13);}
 if(caseKinds.includes(k)){
  box([0,7,0],[132,14,100],C.dark);box([0,52,-41],[120,81,8]);for(const x of [-59,59])box([x,52,0],[8,81,88]);box([0,28,0],[112,10,80],0x464e45);
  if(k==='cargo'){for(const x of [-33,33]){metal([x,50,0],[5,45,86]);b.tube([[x-10,34,-30],[x-15,37,7],[x+8,34,35]],2,C.rubber);}box([24,43,-12],[31,21,38],C.ivory);}
  else if(k==='sample'){for(const x of [-32,0,32]){b.cylinderVessel([x,35,-4],11,39,0x8a9d92);b.box([x,39,9],[14,3,2],C.ivory,[0,0,0],8);}}
  else if(k==='seed'){for(const x of [-36,-12,12,36]){box([x,34,-12],[17,4,32],C.dark);if(x<0){for(let j=0;j<3;j++){b.beam([x,36,-12],[x+(j-1)*7,60+j*2,-14+j*3],1.4,0x647052);b.add(new T.SphereGeometry(1,6,4),[x+(j-1)*7,55+j*2,-12],[8,2,4],0x6d7d58,[0,0,(j-1)*.6],0);}}}b.tube([[-54,40,24],[-30,39,26],[40,38,26]],3,0x6a8c7f);}
  else{for(let i=0;i<4;i++)b.box([-24+i*5,36+i*2,0],[50,1.4,54],i%2?0xadaf9c:0x969b8b,[0,.04*i,0],8);metal([36,39,0],[7,7,54]);}
  m.box([0,2,44],[128,7,94],C.case);m.box([0,7,46],[94,2,66],0x878b7d);for(const x of [-49,49])m.box([x,10,44],[9,6,88],C.dark);
 }else if(k==='valve'||k==='coil'||k==='weather'){
  box([0,8,0],[126,16,100],C.dark);for(const x of [-42,42])metal([x,63,0],[11,110,14]);
  if(k==='valve'){b.cylinderVessel([0,18,-8],29,98,C.case);b.tube([[-57,30,-3],[-40,30,-3],[-39,65,-3],[-27,65,-3]],8,C.steel,5);b.tube([[27,40,-3],[54,40,-3],[54,22,27]],8,C.steel,5);}
  if(k==='coil'){b.cylinder([0,65,0],[34,76,34],C.dark,[0,0,Math.PI/2]);for(let i=-5;i<=5;i++)b.ring([i*6,65,0],33,2.5,C.steel,[0,Math.PI/2,0],5);}
  if(k==='weather'){b.beam([0,20,0],[0,133,0],5,C.steel,5);b.ring([0,105,0],47,3,C.steel,[Math.PI/2,0,0],5);}
  if(k==='valve'&&/锁|封签/.test(clue.observation||'')){metal([28,82,39],[6,17,8],C.amber);b.ring([28,72,41],6,1.4,C.steel);}
  pivot=[0,82,38];axis='z';angle=k==='valve'&&/锁|封签/.test(clue.observation||'')?.12:Math.PI*.72;m.ring([0,0,0],30,3,C.case,[0,0,0],0);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;m.beam([0,0,0],[Math.cos(a)*28,Math.sin(a)*28,0],2.5,C.case);}m.cylinder([0,0,1],[8,14,8],C.case,[Math.PI/2,0,0]);
  if(k==='valve'){const flow=new T.Mesh(new T.SphereGeometry(3,6,4),materials[2]);flow.position.set(54,21,27);reveal.add(flow);reveal.userData.flow=true;}
 }else if(k==='gauge'){
  box([0,7,0],[132,14,100],C.dark);for(const x of [-45,45])metal([x,47,0],[8,80,12]);box([0,91,0],[128,8,45]);
  const centers=clue.object.includes('三')?[-42,0,42]:[-32,32],radius=centers.length===3?18:25;
  for(const x of centers){b.cylinder([x,117,0],[radius,13,radius],C.case,[Math.PI/2,0,0]);b.cylinder([x,117,8],[radius-4,2,radius-4],C.ivory,[Math.PI/2,0,0]);b.ring([x,117,10],radius-1,2,C.steel);for(let i=0;i<7;i++){const a=i*Math.PI/4-Math.PI*.75;b.beam([x+Math.sin(a)*(radius-10),117+Math.cos(a)*(radius-10),12],[x+Math.sin(a)*(radius-6),117+Math.cos(a)*(radius-6),12],.7,C.dark);}}
  pivot=[0,91,-24];angle=-1.1;m.box([0,31,43],[130,66,4],C.case);m.box([0,31,46],[104,44,1],C.ivory);
  for(const x of centers){const needle=new T.Mesh(new T.BoxGeometry(1.2,radius-8,1),materials[5]);needle.position.set(x,123,13);reveal.add(needle);}
 }else if(k==='seat'){
  for(const x of [-48,48]){metal([x,31,0],[9,60,16]);metal([x,3,0],[28,6,77]);}box([0,87,-23],[106,85,13],0x777f70);for(const x of [-32,32]){box([x,81,-14],[8,70,3],C.rubber);metal([x,54,-10],[12,13,4]);}
  pivot=[0,49,-22];angle=1.5;m.box([0,39,0],[110,77,9],C.case);m.box([0,39,6],[94,66,7],0x6b7468);
 }else if(k==='relay'){
  box([0,49,0],[104,96,64]);box([0,98,0],[115,8,70],C.dark);for(const x of [-28,0,28]){b.tube([[x,12,12],[x,52,20],[x+7,69,32]],4,C.dark);b.cylinder([x+7,70,32],[8,13,8],C.ivory);}
  pivot=[0,101,-34];m.box([0,0,36],[112,7,76],C.case);angle=-1.2;
  const glow=new T.Mesh(new T.BoxGeometry(16,5,3),materials[2]);glow.position.set(0,61,34);reveal.add(glow);
 }else if(k==='radio'||k==='projector'){
  box([0,34,0],[124,64,82],C.dark);box([0,37,43],[112,53,6]);b.vent([-24,34,48],44,32);b.ring([34,39,48],14,3,C.steel);b.beam([-46,65,-26],[-35,140,-26],2,C.steel,5);
  if(k==='projector'){b.cylinder([0,74,4],[25,31,25],C.case,[Math.PI/2,0,0]);b.ring([0,74,21],20,3,C.steel);for(const x of [-40,40])b.cylinder([x,70,-14],[23,7,23],C.steel);}
  pivot=[34,39,53];axis='z';angle=1.9;m.cylinder([0,0,0],[11,11,11],C.case,[Math.PI/2,0,0]);m.box([0,6,7],[2,9,2],C.ivory);
  const glow=new T.Mesh(new T.PlaneGeometry(k==='radio'?28:40,10),materials[2]);glow.position.set(18,54,48);reveal.add(glow);
 }else{ // mapped route or a repair workpiece
  for(const x of [-52,52])for(const z of [-35,35])metal([x,45,z],[8,88,8]);box([0,92,0],[128,9,90]);
  if(k==='map'){b.box([0,99,0],[110,1.2,72],0xa3a994,[0,0,0],8);for(let i=0;i<5;i++)b.box([-40+i*18,100,-8+i*3],[12,1,3],0x475e58,[0,-.3,0],8);}
  else{b.cylinder([0,111,0],[23,24,23],C.steel,[Math.PI/2,0,0]);b.ring([0,112,14],15,3,C.dark);metal([-39,102,0],[7,6,58]);metal([-38,105,-24],[23,6,7]);}
  pivot=[0,101,-38];angle=-1.1;m.box([0,0,35],[114,2,74],k==='map'?0x969b8a:C.case);for(let i=0;i<4;i++)m.box([-30+i*17,2,32],[13,1,3],0x586458);
 }
 dressClueContext(b,clue);
 const body=b.finish(),moving=m.finish();moving.position.set(...pivot);moving.name='Working part / '+clue.verb;root.add(body,moving,reveal);root.name='Environmental clue / '+clue.object;root.userData={clue,moving,reveal,axis,angle,progress:0,done:false};reveal.visible=false;
 return root;
}
export function animateClue(root,done,dt=0){const d=root.userData;if(!d.moving)return;d.progress=dt<=0?(done?1:0):T.MathUtils.damp(d.progress,done?1:0,5,Math.min(dt,.1));d.moving.rotation[d.axis]=d.progress*d.angle;d.reveal.visible=done;d.done=done;if(done&&d.reveal.userData.flow&&dt>0){d.reveal.children[0].position.y-=dt*16;if(d.reveal.children[0].position.y<3)d.reveal.children[0].position.y=21;}}
export function createClueLayer(scene,{maps={}}={}){
 const materials=createInteriorMaterials(maps),objects=new Map();let group=null,key=null;
 function clear(){if(group){scene.remove(group);group.traverse(o=>o.geometry?.dispose());}group=null;objects.clear();}
 function update(u,W,dt=0){const a=W.interior,newKey=a?.id||null;if(newKey!==key){clear();key=newKey;if(a){group=new T.Group();group.name='Physical traces / '+a.id;for(const n of a.deck.nodes.filter(n=>n.kind==='log')){const clue=typeof ExoFieldClues!=='undefined'?ExoFieldClues.get(a.structure,n.index):null;if(!clue)continue;const object=createClueObject(clue,materials);object.position.set(n.x,0,n.y);object.userData.node=n;object.userData.reaction=ExoFieldClues.revision(clue.id);animateClue(object,ExoFacilities.done(n));objects.set(n.id,object);group.add(object);}scene.add(group);}}if(!a)return;for(const o of objects.values()){o.visible=Math.hypot(u.x-o.position.x,u.y-o.position.z)<1700;const serial=ExoFieldClues.revision(o.userData.clue.id);if(serial!==o.userData.reaction){o.userData.reaction=serial;o.userData.progress=0;}animateClue(o,ExoFacilities.done(o.userData.node),dt);}}
 return {update,objects,get group(){return group;},dispose(){clear();materials.forEach(m=>m.dispose());}};
}
