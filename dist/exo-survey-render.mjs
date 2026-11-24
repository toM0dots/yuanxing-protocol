import * as T from './assets/ev01/three.module.mjs';
import {batchRigidModel} from './exo-render-optimization.mjs?v=20261110-armory1';
// Reused workshop textures; no new texture requests, shadows or light sources.
// Only nearby masts and the refuge yard submit draw calls.
export function createSurveyWorld(scene,W,S,maps={}){
 const root=new T.Group();root.name='Survey network and refuge repairs';scene.add(root);const geometries=[],materials=[],batches=[];
 const mat=(color,metalness=.2)=>{const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.065,roughness:.88,metalness,map:maps['panel-color']||null,normalMap:maps['panel-normal']||null,normalScale:new T.Vector2(.16,.16)});materials.push(m);return m;};
 const steel=mat(0x9fa89d,.4),dark=mat(0x333e3d,.5),cloth=mat(0x8c8873,0),leaf=mat(0x6c8550,0),glow=new T.MeshBasicMaterial({color:0xc2dfa9,toneMapped:false});materials.push(glow);
 const mesh=(g,m,p,x=0,y=0,z=0)=>{geometries.push(g);const a=new T.Mesh(g,m);a.position.set(x,y,z);p.add(a);return a;};
 const box=(x,y,z,m,p,a,b,c)=>mesh(new T.BoxGeometry(x,y,z),m,p,a,b,c);
 const tube=(r,h,m,p,x,y,z)=>mesh(new T.CylinderGeometry(r,r,h,8),m,p,x,y,z);
 const group=(x,y,name)=>{const g=new T.Group();g.name=name;g.position.set(x,W.elevation(x,y),y);root.add(g);return g;};
 const towers=S.sites.map(s=>{
  const g=group(s.x-78,s.y+35,s.name),h=210+s.id%3*28;
  box(84,9,70,dark,g,0,5,0);for(const x of [-24,24]){tube(3,h,steel,g,x,h/2,0);const brace=tube(2.2,h*.75,dark,g,0,h*.45,0);brace.rotation.z=(x<0?1:-1)*.30;}
  for(let y=35;y<h-15;y+=28)box(52,3,8,dark,g,0,y,0);
  tube(11,60,steel,g,0,h+10,0);for(let i=0;i<4;i++){const panel=box(30,45,3,steel,g,Math.sin(i*Math.PI/2)*22,h+13,Math.cos(i*Math.PI/2)*22);panel.rotation.y=i*Math.PI/2;}
  const crown=new T.Group();g.add(crown);tube(7,35,glow,crown,0,h+24,0);const ring=mesh(new T.TorusGeometry(29,1.7,4,24),glow,crown,0,h+39,0);ring.rotation.x=Math.PI/2;
  box(39,56,25,dark,g,55,28,-15);box(31,19,2,steel,g,55,44,-29);box(22,5,2,glow,crown,55,44,-31);
  box(50,18,36,dark,g,22,12,49);const lid=new T.Group();lid.position.set(22,22,67);g.add(lid);box(50,3,36,cloth,lid,0,0,-18);const supply=new T.Group();supply.position.set(22,24,49);g.add(supply);if(s.cargo==='filter'){const item=tube(6,28,steel,supply,0,3,0);item.rotation.z=Math.PI/2;}else if(s.cargo==='valve')mesh(new T.TorusGeometry(10,3,6,12),steel,supply,0,3,0);else if(s.cargo==='berths')for(const x of [-12,12])box(3,7,29,steel,supply,x,0,0);
  const cable=mesh(new T.TorusGeometry(21,1.4,4,20,Math.PI*1.7),dark,g,36,5,-16);cable.rotation.x=Math.PI/2;
  const b=batchRigidModel(g);batches.push(b);return {root:g,crown,lid,supply,b,id:s.id};
 });
 const yard=group(4240,6535,'K–09 / a place to return to');
 // A covered fan before repair; afterwards the cloth hangs from one corner.
 const vent=new T.Group();yard.add(vent);vent.position.set(-160,W.elevation(4080,6315)-yard.position.y,-220);vent.rotation.y=Math.PI;vent.scale.setScalar(1.5);box(66,69,28,dark,vent,0,36,0);const rim=mesh(new T.TorusGeometry(25,3,6,24),steel,vent,0,40,-17);
 const fan=new T.Group();vent.add(fan);fan.position.set(0,40,-20);for(let i=0;i<4;i++){const blade=box(9,23,2,steel,fan,0,12,0);blade.rotation.z=i*Math.PI/2;blade.position.set(Math.sin(i*Math.PI/2)*11,Math.cos(i*Math.PI/2)*11,0);}tube(3,62,steel,vent,40,31,0);
 const cover=box(57,62,2,cloth,vent,0,40,-23);cover.rotation.z=.08;
 // The repaired intake and doorway indicator face the approach, not the yard.
 const windTies=new T.Group();vent.add(windTies);windTies.position.set(0,68,-24);
 for(const x of [-16,0,16]){const strip=box(4,24,1,cloth,windTies,x,12,0);strip.rotation.z=x*.01;}
 const welcome=new T.Group();yard.add(welcome);welcome.position.set(44,W.elevation(4284,6315)-yard.position.y,-220);box(116,12,6,dark,welcome,0,190,0);const doorLamp=box(101,5,7,glow,welcome,0,190,4);
 const planter=new T.Group();yard.add(planter);planter.position.set(340,W.elevation(4580,6700)-yard.position.y,165);planter.rotation.y=-.22;
 for(let i=0;i<2;i++){box(94,16,36,dark,planter,i*5,16,i*64);box(84,3,26,cloth,planter,i*5,25,i*64);for(const x of [-35,35])tube(2,17,steel,planter,x,8,i*64);}
 const plants=new T.Group();planter.add(plants);for(let i=0;i<12;i++){const x=-33+(i%4)*21,z=Math.floor(i/4)*29;const stem=tube(1,16+i%3*5,leaf,plants,x,34,z);stem.rotation.z=Math.sin(i*7)*.12;for(let j=0;j<3;j++){const petal=mesh(new T.SphereGeometry(3.5,6,4),leaf,plants,x+Math.sin(j*2+i)*7,34+j*4,z+Math.cos(j*2+i)*4);petal.scale.set(2,.32,1);petal.rotation.z=Math.sin(i+j)*.5;}}
 const drip=tube(1.6,116,steel,planter,0,28,32);drip.rotation.z=Math.PI/2;
 const sleeping=new T.Group();yard.add(sleeping);sleeping.position.set(-10,W.elevation(4230,6645)-yard.position.y,110);
 const canopy=box(180,4,115,cloth,sleeping,0,98,0);canopy.rotation.z=-.05;for(const x of [-80,80])for(const z of [-46,46])tube(1.8,95,steel,sleeping,x,47,z);
 for(let i=0;i<2;i++){const bed=new T.Group();sleeping.add(bed);bed.position.set(i*85-42,0,i*12);bed.rotation.y=(i?-.09:.15);box(61,5,100,dark,bed,0,18,0);box(55,5,90,cloth,bed,0,23,0);box(30,6,19,steel,bed,-3,28,-30);for(const x of [-24,24])for(const z of [-40,40])tube(1.8,17,steel,bed,x,9,z);box(22,27,15,dark,bed,36,14,36);tube(3.5,7,steel,bed,36,31,34);const body=mesh(new T.CapsuleGeometry(9,43,4,8),cloth,bed,0,33,8);body.rotation.x=Math.PI/2;mesh(new T.SphereGeometry(8,8,6),steel,bed,0,34,-26);}
 const yardBatch=batchRigidModel(yard);batches.push(yardBatch);let lastRevision=-1;
 function update(u,world,time=0){root.visible=!world.cave&&!world.interior;if(!root.visible)return;
  const changed=lastRevision!==S.revision;if(changed)lastRevision=S.revision;
  for(const t of towers){const visible=Math.hypot(u.x-S.sites[t.id].x,u.y-S.sites[t.id].y)<2300,justVisible=visible&&!t.root.visible;t.root.visible=visible;if(visible&&(changed||justVisible)){t.crown.visible=S.calibrated(t.id);const k=S.sites[t.id].cargo,taken=k&&(S.installed(k)||S.state.carrying.includes(k));t.lid.rotation.x=taken?-1.9:0;t.supply.visible=!!k&&!taken;t.root.updateMatrixWorld(true);t.b.sync();}}
  yard.visible=Math.hypot(u.x-4240,u.y-6535)<1500;if(!yard.visible)return;
  const fixed=S.installed('filter');cover.position.x=fixed?-37:0;cover.rotation.z=fixed?-.7:.08;fan.rotation.z=fixed?time*5:Math.sin(time*6)*.06;windTies.visible=fixed;windTies.rotation.x=fixed?-.5+Math.sin(time*3)*.14:0;doorLamp.visible=fixed;plants.visible=S.installed('valve');sleeping.visible=S.installed('berths');yard.updateMatrixWorld(true);yardBatch.sync();
 }
 return {root,towers,yard,plants,sleeping,fan,vent,windTies,doorLamp,update,dispose(){for(const b of batches)b.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}};
}
