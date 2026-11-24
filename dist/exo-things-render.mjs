import * as T from './assets/ev01/three.module.mjs';

// Three shared instanced battery parts and one rack. Existing texture maps,
// no lights, no shadow casters and no per-object material allocations.
export function createThingsView(scene,W,S,maps={},rig){
 const root=new T.Group();root.name='Physical batteries';scene.add(root);
 const steel=new T.MeshStandardMaterial({color:0xc7b585,emissive:0x4b5445,emissiveIntensity:.28,roughness:.82,metalness:.2,map:maps['panel-color']||null,normalMap:maps['panel-normal']||null,normalScale:new T.Vector2(.2,.2)});
 const rubber=new T.MeshStandardMaterial({color:0x243333,roughness:.92,metalness:.15,map:maps['panel-color']||null});
 const strip=new T.MeshBasicMaterial({color:0xc8dd99,toneMapped:false});
 const bodyG=new T.CylinderGeometry(7,7,24,12),capG=new T.CylinderGeometry(8.3,8.3,3,12),stripG=new T.BoxGeometry(3,15,1.5),rackG=new T.BoxGeometry(1,1,1);
 const make=(g,m,n)=>{const mesh=new T.InstancedMesh(g,m,n);mesh.frustumCulled=false;mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);return mesh;};
 const body=make(bodyG,steel,304),caps=make(capG,rubber,608),stripes=make(stripG,strip,304),frame=new T.InstancedMesh(rackG,rubber,7);
 frame.name='Four-cell back rack';const mount=new T.Group();mount.position.set(0,.05,1.65);rig?.chest?.add(mount);mount.add(frame);
 const matrix=new T.Matrix4(),part=new T.Matrix4(),base=new T.Matrix4(),pose=new T.Object3D(),rackScale=new T.Vector3(1/18,1/18,1/18),charged=new T.Color(0xc8dd99),empty=new T.Color(0x5a6160);
 const bars=[[0,0,0,2.8,.12,.22],[0,1.45,0,2.8,.12,.22],[0,-1.45,0,2.8,.12,.22],[-1.35,0,0,.12,3,.22],[1.35,0,0,.12,3,.22],[0,0,0,.12,3,.22],[0,0,-.2,.55,2.4,.16]];
 bars.forEach(([x,y,z,sx,sy,sz],i)=>{pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.updateMatrix();frame.setMatrixAt(i,pose.matrix);});
 let n=0;
 function cell(t,m){
  if(n>=304)return;body.setMatrixAt(n,m);
  for(let i=0;i<2;i++){part.makeTranslation(0,i?12.5:-12.5,0);matrix.multiplyMatrices(m,part);caps.setMatrixAt(n*2+i,matrix);}
  part.makeTranslation(0,0,7.1);matrix.multiplyMatrices(m,part);stripes.setMatrixAt(n,matrix);stripes.setColorAt(n,t.state.charge>0?charged:empty);n++;
 }
 function update(unit,world){
  n=0;root.visible=S.available!==false;mount.visible=!!rig&&S.available!==false;if(!root.visible)return;mount.updateWorldMatrix(true,false);
  for(const t of S.carry.rack()){
   const slot=t.slot??0;part.makeTranslation(slot%2?.69:-.69,slot<2?.74:-.74,.27);base.multiplyMatrices(mount.matrixWorld,part);base.scale(rackScale);cell(t,base);
  }
  const p=S.point(unit,world);
  for(const t of S.things.near(p,700,{kind:'battery'})){pose.position.set(t.x,world.elevation(t.x,t.y)+14+(t.z||0),t.y);pose.scale.set(1,1,1);pose.rotation.set(0,0,.12);pose.updateMatrix();cell(t,pose.matrix);}
  for(const t of S.things.near(p,700).filter(t=>t.zone==='depot'&&t.socket)){for(const b of S.carry.contents(t.id)){pose.position.set(t.x+19,world.elevation(t.x,t.y)+23,t.y+29);pose.scale.set(.75,.75,.75);pose.rotation.set(0,0,0);pose.updateMatrix();cell(b,pose.matrix);}}
  body.count=stripes.count=n;caps.count=n*2;
  for(const mesh of [body,caps,stripes]){mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;}if(stripes.instanceColor)stripes.instanceColor.needsUpdate=true;
 }
 function dispose(){mount.removeFromParent();root.removeFromParent();for(const m of [body,caps,stripes,frame])m.dispose();for(const g of [bodyG,capG,stripG,rackG])g.dispose();for(const m of [steel,rubber,strip])m.dispose();}
 return {root,mount,frame,body,caps,stripes,update,dispose};
}
