import * as T from './assets/ev01/three.module.mjs';
const down=new T.Vector3(0,-1,0),glow=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});

export function createFlightEffects(scene,rig){
 const cone=new T.ConeGeometry(1,1,12);cone.rotateZ(Math.PI);
 const ring=new T.TorusGeometry(.22,.045,6,16),nozzleMat=new T.MeshStandardMaterial({color:0x192d43,metalness:.8,roughness:.3}),emitters=[];
 for(let i=0;i<4;i++){
  const root=new T.Group();root.name='FlightThruster_'+i;
  if(i<2)rig.jets[i].add(root);else{const leg=rig.legs[i-2];leg.foot.add(root);root.position.copy(leg.contact);root.position.y-=.02;}
  root.position.y-=.16;if(i<2)root.position.z+=.3;
  const nozzle=new T.Mesh(new T.CylinderGeometry(.24,.19,.24,12),nozzleMat);root.add(nozzle);
  const glowRing=new T.Mesh(ring,glow(0x41dcff,.85));glowRing.rotation.x=Math.PI/2;root.add(glowRing);
  const plume=new T.Group();root.add(plume);const flames=[];
  for(const [color,alpha] of [[0x1262ff,.13],[0x37ddff,.36],[0xf2ffff,.95]]){const m=new T.Mesh(cone,glow(color,alpha));plume.add(m);flames.push(m);}
  const diamonds=[];for(let j=0;j<4;j++){const m=new T.Mesh(new T.SphereGeometry(1,8,6),glow(0xb7ffff,.7));plume.add(m);diamonds.push(m);}
  emitters.push({root,plume,flames,diamonds});
 }
 const trailGeometry=new T.BufferGeometry(),positions=new Float32Array(2*42*6*3),colors=new Float32Array(positions.length);
 trailGeometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));trailGeometry.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));
 const trails=new T.Mesh(trailGeometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.8,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));trails.frustumCulled=false;scene.add(trails);
 const wash=new T.Mesh(new T.RingGeometry(.7,1,40),glow(0x71e8ff,.15));wash.rotation.x=-Math.PI/2;scene.add(wash);
 const history=[[],[]];let previous=null,lastTime=0;
 function update(u,motion,time,ground,reduced=false){const flying=!!u.flight,active=flying||motion.boosting,boost=motion.boosting,dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
  if(!previous||Math.hypot(u.x-previous.x,u.y-previous.y)>450||!flying){history[0]=[];history[1]=[];}previous={x:u.x,y:u.y};
  for(const [i,e] of emitters.entries()){
   const powered=active&&(i<2||flying);e.plume.visible=powered;e.root.children[1].visible=powered;if(!powered)continue;
   const foot=i>=2,len=(foot?(boost?4:2.4):boost?8:4)*(reduced?1:1+.06*Math.sin(time*43+i*2)),radius=foot?.32:.43;
   e.plume.quaternion.setFromUnitVectors(down,new T.Vector3(0,-1,foot?(boost?.3:0):(boost?2:.25)).normalize());
   for(const [j,m] of e.flames.entries()){const f=[1.3,1,.64][j];m.scale.set(radius*f,len*(1-j*.18),radius*f);m.position.y=-len*(1-j*.18)/2;}
   e.diamonds.forEach((m,j)=>{m.visible=boost&&!foot;m.position.y=-len*(.24+j*.19);const r=radius*(.5-j*.08);m.scale.set(r,r*1.8,r)});
   if(i<2&&flying&&boost&&!reduced&&dt>0){e.root.updateWorldMatrix(true,false);const h=history[i];h.push({p:e.root.getWorldPosition(new T.Vector3()),time});while(h.length>42)h.shift();}
  }
  let count=0;for(const h of history){while(h.length&&time-h[0].time>.7)h.shift();for(let i=1;i<h.length;i++){const a=h[i-1],b=h[i],d=b.p.clone().sub(a.p),side=new T.Vector3(-d.z,0,d.x).normalize(),fade=Math.max(0,1-(time-a.time)/.7),width=2+fade*6,points=[a.p.clone().addScaledVector(side,width),a.p.clone().addScaledVector(side,-width),b.p.clone().addScaledVector(side,width),b.p.clone().addScaledVector(side,width),a.p.clone().addScaledVector(side,-width),b.p.clone().addScaledVector(side,-width)];for(const p of points){positions.set([p.x,p.y,p.z],count*3);colors.set([.12*fade,.65*fade,fade],count*3);count++;}}}
  trailGeometry.setDrawRange(0,count);trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.color.needsUpdate=true;trails.visible=count>0;
  const clearance=u.flight?.clearance||0;wash.visible=flying&&clearance<190;wash.position.set(u.x,ground+3,u.y);wash.scale.setScalar(65+clearance*.4+(reduced?0:Math.sin(time*8)*8));wash.material.opacity=.18*(1-clearance/190);
 }
 return {emitters,trails,wash,update,dispose(){for(const e of emitters){e.root.removeFromParent();e.root.traverse(o=>{if(o.isMesh&&o.material!==nozzleMat)o.material.dispose()});}cone.dispose();ring.dispose();nozzleMat.dispose();trailGeometry.dispose();trails.material.dispose();scene.remove(trails,wash);wash.geometry.dispose();wash.material.dispose();}};
}
