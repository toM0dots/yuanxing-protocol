import {batchRigidModel} from './exo-render-optimization.mjs?v=20261110-armory1';
import * as T from './assets/ev01/three.module.mjs';
// Small, reusable physical actors: a mechanic at the workshop and a working
// steerable antenna on the summit. No new textures or real-time lights.
export function createFieldStory(scene,W,maps={}){
 const root=new T.Group();root.name='Living story / workshop and south relay';scene.add(root);
 const owned=[],materials=[],mesh=(g,m,parent,x=0,y=0,z=0)=>{owned.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const mat=(color,roughness=.8,metalness=.1)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,map:maps['panel-color']||null,normalMap:maps['panel-normal']||null,normalScale:new T.Vector2(.15,.15)});materials.push(m);return m;};
 const steel=mat(0xb7c3b8,.68,.25),rust=mat(0x50473c,.94,.35),cloth=mat(0x87958c,.95,0),gloves=mat(0xb0a88a,.92,0),visor=mat(0x111e21,.28,.5),bright=new T.MeshBasicMaterial({color:0xb6e6b4,toneMapped:false});materials.push(bright);
 const box=(a,b,c,m,p,x,y,z)=>mesh(new T.BoxGeometry(a,b,c),m,p,x,y,z);
 const tube=(r,h,m,p,x,y,z)=>mesh(new T.CylinderGeometry(r,r,h,12),m,p,x,y,z);
 const capsule=(r,h,m,p,x,y,z)=>mesh(new T.CapsuleGeometry(r,h,4,10),m,p,x,y,z);
 const worker=new T.Group();worker.position.set(4195,W.elevation(4195,6480),6480);worker.name='老林 / repairing the workshop brace';root.add(worker);
 capsule(5.3,10,cloth,worker,0,30,0);capsule(4.1,2,cloth,worker,0,22,0);
 for(const x of [-3.8,3.8]){capsule(2.2,10,cloth,worker,x,12,0);box(5,4,8,rust,worker,x,3,-2);}
 const head=new T.Group();head.position.set(0,43,0);worker.add(head);const helmet=mesh(new T.SphereGeometry(5,14,10),gloves,head);helmet.scale.set(.9,1.1,.9);box(8,7,2,visor,head,0,1,-4);box(9,1.3,1.2,steel,head,0,5,-5);worker.rotation.y=.25;
 const arm=new T.Group();arm.position.set(-6,35,0);worker.add(arm);const upper=capsule(2,8,cloth,arm,0,-4,0);upper.rotation.x=-.65;capsule(1.8,6,gloves,arm,0,-9,-5);tube(1.1,6,steel,arm,0,-10,-9);
 const other=capsule(2,12,cloth,worker,6,28,-2);other.rotation.x=-.25;
 box(7,13,4,rust,worker,0,32,6);box(5,2,2,bright,worker,0,37,8);
 const bench=new T.Group();worker.add(bench);box(28,3,18,rust,bench,0,22,-20);for(const x of [-10,10])tube(1.5,22,steel,bench,x,11,-20);box(15,5,7,steel,bench,0,26,-20);
 const spark=mesh(new T.SphereGeometry(1.6,6,4),bright,bench,-4,26,-20);
 const relay=new T.Group();relay.position.set(5120,W.elevation(5120,12195),12195);relay.name='南线中继 / manually steered dish';root.add(relay);
 box(130,12,110,rust,relay,0,2,0);tube(8,160,steel,relay,0,86,0);
 for(const x of [-45,45]){const strut=tube(3,130,rust,relay,x/2,66,0);strut.rotation.z=-Math.sign(x)*.34;}
 const antenna=new T.Group();antenna.position.set(0,166,0);relay.add(antenna);
 const bowl=mesh(new T.SphereGeometry(52,24,12,0,Math.PI*2,0,.48*Math.PI),steel,antenna);bowl.rotation.x=-Math.PI/2;bowl.material.side=T.DoubleSide;
 const rim=mesh(new T.TorusGeometry(52,1.4,5,32),rust,antenna,0,0,-3);rim.rotation.x=0;
 for(let i=0;i<4;i++){const support=tube(1.2,64,rust,antenna,Math.sin(i*Math.PI/2)*19,Math.cos(i*Math.PI/2)*19,-30);support.rotation.x=Math.PI/2;}
 box(13,10,14,visor,antenna,0,0,-57);box(33,51,25,rust,relay,-66,26,25);box(27,18,1,visor,relay,-66,38,11);const led=box(5,5,2,bright,relay,-66,44,10);
 const ring=mesh(new T.TorusGeometry(43,1.1,4,32),bright,relay,0,14,0);ring.rotation.x=-Math.PI/2;
 const workerBatch=batchRigidModel(worker),relayBatch=batchRigidModel(relay);
 function update(u,world,now){
  root.visible=!world.cave&&!world.interior;if(!root.visible)return;
  worker.visible=Math.hypot(u.x-4195,u.y-6480)<2100;relay.visible=Math.hypot(u.x-5200,u.y-12230)<2600;
  if(worker.visible){const near=Math.hypot(u.x-4195,u.y-6480)<280;head.rotation.y=near?T.MathUtils.clamp(Math.atan2(4195-u.x,6480-u.y)-.25,-1.1,1.1):0;arm.rotation.x=near?-.7:Math.sin(now*2.4)*.1;spark.visible=!near&&Math.sin(now*17)>.15;}
  if(relay.visible){const s=typeof ExoFieldStory==='undefined'?{}:ExoFieldStory.state;antenna.rotation.y=-(s.relayYaw||0)*Math.PI/180;led.visible=!!s.relayPower;ring.visible=!!s.relayBattery;}
  if(worker.visible){worker.updateMatrixWorld(true);workerBatch.sync();}if(relay.visible){relay.updateMatrixWorld(true);relayBatch.sync();}
 }
 return {root,worker,relay,antenna,update,dispose(){workerBatch.dispose();relayBatch.dispose();root.removeFromParent();for(const g of owned)g.dispose();for(const m of materials)m.dispose();}};
}
