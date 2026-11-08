import * as T from './assets/ev01/three.module.mjs';
import {createChitinBuilder,bakeRigidSkin,attachRigidSkin} from './exo-creature-models.mjs?v=20261108-inspection92b';

// The fatal boundary rule remains in ExoSandbox. This module visualizes the
// already authoritative detection, proximity charge, and immediate strike.
const DOWN=new T.Vector3(0,-1,0),UP=new T.Vector3(0,1,0),TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),vec=a=>new T.Vector3(...a);
function group(parent,name,position=[0,0,0]){const g=new T.Group();g.name=name;g.position.fromArray(position);parent.add(g);return g;}

export function createBoundaryGuardian(scene) {
  const root=new T.Group();root.name='VOID LEVIATHAN';root.visible=false;scene.add(root);
  const body=group(root,'Leviathan segmented body'),b=createChitinBuilder(2,.65),legs=[],tails=[];
  const basalt=0x414548,edge=0x83877e,tendon=0x332c26,dark=0x14191b;
  let seed=0;
  const plate=(p,pos,size,rot=[0,0,0],c=basalt)=>b.plate(p,pos,size,rot,c,seed++);
  const horn=(p,points,radii,c=basalt)=>b.tendon(p,points,radii,c,10,18);
  b.carapace(body,[[430,250,60,32],[260,258,86,45],[0,265,93,49],[-350,260,72,42]],tendon);
  for(let i=0;i<10;i++) {
    const z=-310+i*81,w=278-i*6.5,y=325-Math.max(0,i-5)*5;
    // Each trunk segment is a complete arched volume. Thin decorative cards
    // used to slice through the underbody and create torn dark silhouettes.
    b.carapace(body,[[z+40,y-60,w*.44,56],[z+19,y-53,w*.50,68],[z-20,y-54,w*.49,64],[z-40,y-59,w*.44,55]],i%3?basalt:0x4b4d44);
    if(i<5)horn(body,[[0,y+9,z+5],[0,y+68-i*5,z+17],[0,y+104-i*8,z+37]],[18-i,12-i,.3]);
  }
  function limb(side,index) {
    const z=-245+index*245,hip=[side*(index===1?118:100),267-index*9,z],knee=[side*(290-index*16),183-index*9,z-73],foot=[side*(442-index*16),3,z-145];
    const upper=group(root,`Guardian upper ${side} ${index}`,hip),lower=group(root,`Guardian lower ${side} ${index}`,knee),hipRef=group(body,`Guardian hip ${side} ${index}`,hip);
    const length1=vec(hip).distanceTo(vec(knee)),length2=vec(knee).distanceTo(vec(foot));
    upper.quaternion.setFromUnitVectors(DOWN,vec(knee).sub(vec(hip)).normalize());lower.quaternion.setFromUnitVectors(DOWN,vec(foot).sub(vec(knee)).normalize());
    for(const [node,length,r] of [[upper,length1,33-index*2],[lower,length2,24-index]]) {
      b.tissue(node,[0,0,0],[r*1.1,r*.97,r],dark);
      b.tendon(node,[[0,0,0],[0,-length*.45,3],[0,-length,0]],[r*.8,r*.64,r*.40],tendon,11,16);
      for(const s of [-1,1])b.tendon(node,[[s*r*.47,-r*.6,1],[s*r*.6,-length*.48,-r*.13],[s*r*.13,-length*.95,-1]],[r*.25,r*.34,r*.1],0x4b3c2e,7,12);
      for(let j=0;j<4;j++)plate(node,[0,-length*(.1+j*.21),-r*.52],[r*(2.8-j*.24),r*.8,length*.42],[-Math.PI/2,0,0]);
    }
    for(const s of [-1,0,1])horn(lower,[[s*12,-length2+6,-2],[s*22,-length2,-26],[s*27,-length2+4,-61]],[13,9,.2],edge);
    legs.push({upper,lower,hipRef,hip:vec(hip),knee:vec(knee),foot:vec(foot),length1,length2,side});
  }
  for(const side of [-1,1])for(let i=0;i<3;i++)limb(side,i);
  const head=group(body,'Leviathan head',[0,285,-405]);
  b.carapace(head,[[82,4,62,39],[30,3,113,56],[-35,-2,118,58],[-106,-13,86,43],[-157,-27,39,22]],basalt);
  for(const side of [-1,1]) {
    horn(head,[[side*74,41,17],[side*100,82,60],[side*137,97,137]],[20,15,.2]);
    for(let i=0;i<4;i++) {const x=side*(44+i*10),y=6+i*2,z=-132+i*19;b.tissue(head,[x,y,z],[7,5,7],dark);b.tissue(head,[x,y,z-5],[2.1,1.5,2],0xffffff,'glow');}
  }
  b.tissue(head,[0,-30,-149],[33,24,17],dark);b.tissue(head,[0,-30,-164],[11,14,5],0xffffff,'glow');
  const jaws=[];
  for(const side of [-1,1]) {
    const jaw=group(head,`Leviathan mandible ${side}`,[side*68,-32,-94]);jaws.push(jaw);
    horn(jaw,[[0,0,0],[side*14,-48,-35],[-side*28,-72,-100]],[27,20,.3],edge);plate(jaw,[side*4,-18,-19],[66,26,114],[-.55,0,-side*.4]);
    for(let i=0;i<4;i++)horn(jaw,[[-side*8,-14-i*10,-18-i*12],[-side*23,-5-i*9,-28-i*13],[-side*29,3-i*9,-30-i*13]],[5,3,.15],edge);
  }
  const emitter=group(head,'AttackEmitter',[0,-30,-174]);
  let tailParent=body;
  for(let k=0;k<4;k++) {
    const tail=group(tailParent,`Leviathan tail ${k}`,k?[0,-17,245]:[0,267,438]);tails.push(tail);tailParent=tail;
    const width=165-k*37,r=64-k*14;
    b.tendon(tail,[[0,0,0],[0,-9,140],[0,-17,260]],[r,r*.72,Math.max(.3,r*.43)],tendon,12,18);
    for(let i=0;i<4;i++) {
      plate(tail,[0,r*.75-i*4,27+i*63],[Math.max(16,width-i*12),Math.max(5,r*.5),118],[-.04,Math.PI,0]);
      for(const side of [-1,1])plate(tail,[side*(r*.75-i*2),r*.2-i*3,32+i*62],[r*1.2,Math.max(4,r*.3),100],[0,Math.PI,-side*.7]);
    }
    if(k<3)horn(tail,[[0,r*.7,45],[0,r*1.9,110],[0,r*2.3,186]],[r*.25,r*.2,.2]);else horn(tail,[[0,-10,140],[0,-5,257],[0,-25,395]],[20,11,.2],edge);
  }
  b.finish();const skinTemplate=bakeRigidSkin(root),skin=attachRigidSkin(root,skinTemplate,'Leviathan articulated mineral armor');
  const glowMaterials=[];root.traverse(o=>{if(o.isMesh&&o.userData.materialRole==='glow'){o.material=o.material.clone();glowMaterials.push(o.material);}});
  const effects=new T.Group();effects.name='Leviathan focused discharge';effects.visible=false;scene.add(effects);
  const beamMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const ringMaterial=new T.MeshBasicMaterial({color:0xffbc63,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const beamGeometry=new T.CylinderGeometry(1,1,1,10,1,true),ringGeometry=new T.TorusGeometry(1,.022,5,48),sparkGeometry=new T.ConeGeometry(1,1,5,1);
  const beam=new T.InstancedMesh(beamGeometry,beamMaterial,2),rings=new T.InstancedMesh(ringGeometry,ringMaterial,12),sparks=new T.InstancedMesh(sparkGeometry,beamMaterial,40);
  for(const mesh of [beam,rings,sparks]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);effects.add(mesh);}
  beam.name='Focused amber white beam';rings.name='Charge and impact rings';sparks.name='Radial strike ejecta';
  beam.setColorAt(0,new T.Color(0xffa63f).multiplyScalar(.32));beam.setColorAt(1,new T.Color(0xfff4d1).multiplyScalar(3.2));
  const matrix=new T.Matrix4(),quaternion=new T.Quaternion(),scale=new T.Vector3(),source=new T.Vector3(),target=new T.Vector3(),direction=new T.Vector3();
  let lastTime=null,heading=null,disposed=false;
  function instance(mesh,i,position,q,size){matrix.compose(position,q,size);mesh.setMatrixAt(i,matrix);}
  function update(u,W,combat,time=0,reduced=false) {
    if(disposed)return;const danger=W.danger(u);root.visible=effects.visible=!!danger;
    if(!danger){heading=null;beam.count=rings.count=sparks.count=0;return;}
    const dt=lastTime===null?1/60:clamp(time-lastTime,0,.1);lastTime=time;
    const dx=u.x-danger.x,dz=u.y-danger.y,len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len,desired=Math.atan2(-fx,-fz);
    heading=heading===null?desired:heading+Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading))*(1-Math.exp(-dt*4));
    // Keep the mouth behind the forbidden edge even when the player is close.
    const x=danger.x-fx*615,z=danger.y-fz*615,floor=W.elevation(x,z);root.position.set(x,Number.isFinite(floor)?floor:0,z);root.rotation.y=heading;
    const charge=clamp((1360-(Number.isFinite(danger.distance)?danger.distance:len))/1040),strike=combat.down>0,visualTime=reduced?0:time;
    root.userData.charge=charge;root.userData.phase=strike?'strike':charge>.14?'charge':'detect';
    body.position.y=Math.sin(visualTime*.75)*2-charge*22;body.rotation.x=-charge*.017;head.rotation.x=-charge*.07+(strike?.035:0);head.rotation.y=Math.sin(visualTime*.5)*.009;
    for(const jaw of jaws)jaw.rotation.y=Math.sign(jaw.position.x)*(.035+charge*.17+(strike?.09:0));
    tails.forEach((tail,i)=>tail.rotation.y=reduced?0:Math.sin(time*.4-i*.65)*(.018+i*.006));glowMaterials.forEach(m=>m.emissiveIntensity=.12+charge*.72+(strike?.9:0));
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
    for(const leg of legs) {
      const hip=leg.hipRef.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),world=leg.foot.clone().applyMatrix4(root.matrixWorld),elevation=W.elevation(world.x,world.z);world.y=(Number.isFinite(elevation)?elevation:root.position.y)+3;
      const foot=world.applyMatrix4(inverse),d=foot.clone().sub(hip),length=clamp(d.length(),.001,leg.length1+leg.length2-.001);d.normalize();
      const along=(leg.length1**2-leg.length2**2+length**2)/(2*length),lift=Math.sqrt(Math.max(0,leg.length1**2-along**2)),pole=leg.knee.clone().sub(hip);pole.addScaledVector(d,-pole.dot(d)).normalize();
      const knee=hip.clone().addScaledVector(d,along).addScaledVector(pole,lift);leg.upper.position.copy(hip);leg.upper.quaternion.setFromUnitVectors(DOWN,knee.clone().sub(hip).normalize());leg.upper.scale.y=hip.distanceTo(knee)/leg.length1;
      leg.lower.position.copy(knee);leg.lower.quaternion.setFromUnitVectors(DOWN,foot.clone().sub(knee).normalize());leg.lower.scale.y=knee.distanceTo(foot)/leg.length2;
    }
    root.updateMatrixWorld(true);skin.sync();emitter.getWorldPosition(source);
    const sampled=W.elevation(u.x,u.y),playerGround=Number.isFinite(sampled)?sampled:0,impactY=playerGround+(u.altitude||0);target.set(u.x,impactY+65,u.y);
    direction.copy(target).sub(source);const distance=Math.max(1,direction.length());direction.normalize();
    const beamQ=new T.Quaternion().setFromUnitVectors(UP,direction),ringQ=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),direction);beam.count=strike?2:0;
    if(strike){const midpoint=source.clone().add(target).multiplyScalar(.5),pulse=1+Math.sin(visualTime*39)*.12;instance(beam,0,midpoint,beamQ,scale.set(11*pulse,distance,11*pulse));instance(beam,1,midpoint,beamQ,scale.set(2.6*pulse,distance,2.6*pulse));}
    let count=0;
    if(charge>.025||strike)for(let i=0;i<3;i++){const r=24+(1-charge)*38+i*14,p=source.clone().addScaledVector(direction,5+i*12);const spin=new T.Quaternion().setFromAxisAngle(direction,visualTime*(i%2?-1:1)*1.2);quaternion.copy(spin).multiply(ringQ);instance(rings,count++,p,quaternion,scale.set(r,r,Math.max(1,charge*2)));}
    if(strike){for(let i=0;i<6;i++){const f=(i/6+visualTime*.7)%1,r=16+f*22;instance(rings,count++,source.clone().addScaledVector(direction,distance*f),ringQ,scale.set(r,r,2.5));}for(let i=0;i<2;i++){const r=28+((visualTime*1.7+i*.5)%1)*90;quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);instance(rings,count++,new T.Vector3(target.x,impactY+3+i*2,target.z),quaternion,scale.set(r,r,3));}}
    rings.count=count;ringMaterial.opacity=.28+charge*.45;sparks.count=strike?(reduced?8:40):charge>.14?(reduced?4:14):0;
    if(!strike&&sparks.count){const side=new T.Vector3().crossVectors(direction,UP).normalize(),vertical=new T.Vector3().crossVectors(side,direction).normalize();
      for(let i=0;i<sparks.count;i++){const age=(visualTime*.65+i*.071)%1,a=i*2.399963+visualTime*.7,r=(1-age)*(70-charge*22)+10,point=source.clone().addScaledVector(direction,12+(1-age)*50).addScaledVector(side,Math.cos(a)*r).addScaledVector(vertical,Math.sin(a)*r);
        quaternion.setFromUnitVectors(UP,source.clone().sub(point).normalize());instance(sparks,i,point,quaternion,scale.set(.8,7+charge*10,.8));sparks.setColorAt(i,new T.Color(i%3?0xffb354:0xfff4d1).multiplyScalar(.35+charge*.7));
      }
    }
    if(strike)for(let i=0;i<sparks.count;i++){
      const a=i*2.399963,age=(visualTime*1.4+i*.071)%1,reach=18+age*(44+i%7*8),height=Math.sin(age*Math.PI)*(40+i%9*12),point=new T.Vector3(target.x+Math.cos(a)*reach,impactY+6+height,target.z+Math.sin(a)*reach);
      direction.set(Math.cos(a)*.7,.6+Math.cos(age*Math.PI),Math.sin(a)*.7).normalize();quaternion.setFromUnitVectors(UP,direction);instance(sparks,i,point,quaternion,scale.set(1.2*(1-age)+.2,8+age*19,1.2*(1-age)+.2));sparks.setColorAt(i,new T.Color(i%3?0xffa443:0xfff1ce).multiplyScalar((1-age)*2));
    }
    for(const mesh of [beam,rings,sparks])mesh.instanceMatrix.needsUpdate=true;if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;
  }
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();effects.removeFromParent();skin.dispose();const geometry=new Set();root.traverse(o=>{if(o.isMesh)geometry.add(o.geometry);});geometry.forEach(g=>g.dispose());glowMaterials.forEach(m=>m.dispose());beamGeometry.dispose();ringGeometry.dispose();sparkGeometry.dispose();beamMaterial.dispose();ringMaterial.dispose();}
  return {root,update,dispose,effects,emitter,legs,skin};
}
