import * as T from './assets/ev01/three.module.mjs';

export function createTowView(scene,W,S,maps={},rig){
 const root=new T.Group();root.name='Tow cable and measured throws';scene.add(root);
 const ropeGeometry=new T.BufferGeometry(),ropeArray=new Float32Array(25*3);ropeGeometry.setAttribute('position',new T.BufferAttribute(ropeArray,3));
 const ropeMaterial=new T.LineBasicMaterial({color:0xb0baa4}),rope=new T.Line(ropeGeometry,ropeMaterial);rope.frustumCulled=false;root.add(rope);
 const aimGeometry=new T.BufferGeometry(),aimArray=new Float32Array(6);aimGeometry.setAttribute('position',new T.BufferAttribute(aimArray,3));const aimMaterial=new T.LineBasicMaterial({color:0xe2c48a,transparent:true,opacity:.6}),aimLine=new T.Line(aimGeometry,aimMaterial);aimLine.frustumCulled=false;root.add(aimLine);
 const ringG=new T.TorusGeometry(12,1,4,24),ringM=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),marks=new T.InstancedMesh(ringG,ringM,16);marks.frustumCulled=false;root.add(marks);
 const cursor=new T.Mesh(ringG,new T.MeshBasicMaterial({color:0xe7d2a0,toneMapped:false}));root.add(cursor);
 const hookG=new T.TorusGeometry(5,1.5,5,14,Math.PI*1.6),steel=new T.MeshStandardMaterial({color:0xadb3a2,roughness:.8,metalness:.35,map:maps['panel-color']||null,emissive:0x333b2f,emissiveIntensity:.2}),hook=new T.Mesh(hookG,steel);root.add(hook);
 const reelG=new T.CylinderGeometry(1,1,1,14),reel=new T.InstancedMesh(reelG,steel,3),mount=new T.Group();mount.position.set(-1.9,-.8,1.1);mount.scale.setScalar(1/18);rig?.chest?.add(mount);mount.add(reel);
 const pose=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),q=new T.Vector3(),color=new T.Color();
 for(let i=0;i<3;i++){pose.position.set((i-1)*10,0,0);pose.scale.set(i===1?9:12,i===1?19:3,i===1?9:12);pose.rotation.set(0,0,Math.PI/2);pose.updateMatrix();reel.setMatrixAt(i,pose.matrix);reel.setColorAt(i,color.setHex(i===1?0x3c4743:0xacb5a3));}
 function point(out,p,extra=0){return out.set(p.x,W.elevation(p.x,p.y)+(p.z||0)+extra,p.y);}
 function update(unit,world,camera){
  root.visible=mount.visible=!!S.tow.enabled&&S.available!==false;if(!root.visible)return;
  const state=S.tow.state,angle=unit.angle||0;point(a,{x:unit.x+Math.cos(angle)*27,y:unit.y+Math.sin(angle)*27,z:unit.altitude||0},83);
  rope.visible=!!state.tip;hook.visible=rope.visible;
  if(state.tip){point(b,state.tip);const anchor=state.wrap&&S.things.get(state.wrap);if(anchor)point(c,{...anchor,z:(anchor.z||0)+35});for(let i=0;i<=24;i++){const t=i/24;if(anchor){if(t<.5)q.lerpVectors(a,c,t*2);else q.lerpVectors(c,b,(t-.5)*2);}else q.lerpVectors(a,b,t);q.y-=Math.sin(t*Math.PI)*Math.min(32,a.distanceTo(b)*.06)*(state.reeling?.2:1);ropeArray[i*3]=q.x;ropeArray[i*3+1]=q.y;ropeArray[i*3+2]=q.z;}ropeGeometry.attributes.position.needsUpdate=true;hook.position.copy(b);hook.rotation.set(.5,angle,.3);ropeMaterial.color.setHex(S.things.get('tow:cable')?.state.powered?0xbce4a0:state.tension>110?0xdfa46f:0xaeb5a5);}
  aimLine.visible=cursor.visible=state.mode==='aiming'&&!!state.aim;
  if(aimLine.visible){point(b,state.aim);aimArray.set([a.x,a.y,a.z,b.x,b.y,b.z]);aimGeometry.attributes.position.needsUpdate=true;cursor.position.copy(b);if(camera)cursor.quaternion.copy(camera.quaternion);}
  let n=0;for(const mark of state.marks){for(const p of [mark.desired,mark]){if(!p||n>=16)continue;pose.position.set(p.x,W.elevation(p.x,p.y)+2.5,p.y);pose.rotation.set(-Math.PI/2,0,0);pose.scale.setScalar(p===mark ? .6 : .8);pose.updateMatrix();marks.setMatrixAt(n,pose.matrix);marks.setColorAt(n,color.setHex(p===mark?(mark.hit?0xbfe1a1:0xdb9864):0xbcc6bb));n++;}}
  marks.count=n;marks.visible=!!n;marks.instanceMatrix.needsUpdate=true;if(marks.instanceColor)marks.instanceColor.needsUpdate=true;
 }
 function dispose(){mount.removeFromParent();root.removeFromParent();for(const g of [ropeGeometry,aimGeometry,ringG,hookG,reelG])g.dispose();for(const m of [ropeMaterial,aimMaterial,ringM,cursor.material,steel])m.dispose();marks.dispose();reel.dispose();}
 return {root,mount,rope,marks,cursor,update,dispose};
}
