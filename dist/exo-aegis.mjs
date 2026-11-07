import * as T from './assets/ev01/three.module.mjs';
const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp,TAU=Math.PI*2;
const ZERO_FEET=[0,0];

// Rigid Blender armor, independent pauldrons/hip skirts, and allocation-free leg IK.
export function createAegisRig(root){
 const get=name=>{const o=root.getObjectByName('Aegis_'+name);if(!o)throw Error('Aegis joint missing: '+name);return o};
 const rig={root,pelvis:get('pelvis'),chest:get('chest'),head:get('head'),muzzle:get('Muzzle'),jets:[get('Jet_L'),get('Jet_R')],
  legs:['L','R'].map(side=>({thigh:get('thigh_'+side),shin:get('shin_'+side),foot:get('foot_'+side),skirt:root.getObjectByName('Aegis_skirt_'+side)})),
  arms:['L','R'].map(side=>({upper:get('upper_arm_'+side),forearm:get('forearm_'+side),hand:root.getObjectByName('Aegis_hand_'+side)||get('forearm_'+side),shoulder:root.getObjectByName('Aegis_shoulder_'+side)}))};
 rig.rest=new Map();root.traverse(o=>{if(o.name.startsWith('Aegis_'))rig.rest.set(o,{p:o.position.clone(),q:o.quaternion.clone()})});
 root.updateMatrixWorld(true);rig.floor=-new T.Box3().setFromObject(root).min.y;
 rig.legs.forEach(l=>{const b=new T.Box3().setFromObject(l.foot);l.contact=l.foot.worldToLocal(new T.Vector3((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2));
  l.upperLength=l.shin.position.length();l.lowerLength=l.foot.position.length();l.upperDir=l.shin.position.clone().normalize();l.lowerDir=l.foot.position.clone().normalize();
  l.sole=l.thigh.position.clone().add(l.shin.position).add(l.foot.position).add(l.contact).add(rig.pelvis.position);
  l.support=l.contact.clone();l.soleQ=new T.Quaternion();l.roll=0;l.heelZ=l.foot.worldToLocal(new T.Vector3(b.min.x,b.min.y,b.max.z)).z;l.toeZ=l.foot.worldToLocal(new T.Vector3(b.min.x,b.min.y,b.min.z)).z;
  l.plant=new T.Vector3();l.target=new T.Vector3();l.start=new T.Vector3();l.wasStance=false;l.planted=false;
 });
 rig.work={inverse:new T.Matrix4(),target:new T.Vector3(),direction:new T.Vector3(),pole:new T.Vector3(),knee:new T.Vector3(),lower:new T.Vector3(),support:new T.Vector3(),q:new T.Quaternion(),flightQ:new T.Quaternion(),euler:new T.Euler(),lastRoot:new T.Vector3()};
 rig.motion={speed:0,run:0,air:0,aimYaw:0,aimPitch:0};return rig;
}

function solveLeg(rig,l,target){
 const w=rig.work,a=l.upperLength,b=l.lowerLength,d=clamp(target.length(),Math.abs(a-b)+.02,a+b-.012);
 w.direction.copy(target).normalize();
 // Knee pole faces -Z. Account for the actual outward offsets of the authored bones.
 w.pole.set(0,0,-1).addScaledVector(w.direction,w.direction.z).normalize();
 const cosine=clamp((a*a+d*d-b*b)/(2*a*d),-1,1);
 w.knee.copy(w.direction).multiplyScalar(a*cosine).addScaledVector(w.pole,a*Math.sqrt(1-cosine*cosine));
 l.thigh.quaternion.setFromUnitVectors(l.upperDir,w.lower.copy(w.knee).normalize());
 w.q.copy(l.thigh.quaternion).invert();w.lower.copy(w.direction).multiplyScalar(d).sub(w.knee).applyQuaternion(w.q).normalize();
 l.shin.quaternion.setFromUnitVectors(l.lowerDir,w.lower);
 l.foot.quaternion.copy(l.thigh.quaternion).multiply(l.shin.quaternion).invert().multiply(l.soleQ);
}

export function poseAegis(rig,phase,{speed=0,run=false,aimYaw=0,aimPitch=0,recoil=0,damage=0,footHeights=ZERO_FEET,idleTime=0,saber=null,flight=null,distance=null,dt=null,sampleHeight=null}={}){
 for(const [o,rest] of rig.rest){o.position.copy(rest.p);o.quaternion.copy(rest.q)}
 const stateful=Number.isFinite(dt),step=stateful?clamp(dt,0,.1):0,m=rig.motion,w=rig.work;
 const damp=(a,b,rate)=>stateful?lerp(a,b,1-Math.exp(-step*rate)):b;
 m.speed=damp(m.speed,clamp(speed,0,1),12);m.run=damp(m.run,Number(run),7);m.air=damp(m.air,Number(!!flight),8);
 m.aimYaw=damp(m.aimYaw,clamp(aimYaw,-.85,.85),10);m.aimPitch=damp(m.aimPitch,clamp(aimPitch,-1.1,1.1),10);
 const motion=m.speed,air=m.air,groundWeight=1-air,stride=lerp(1.65,1.95,m.run),stance=.56,worldScale=rig.root.scale.x||18;
 if(Number.isFinite(distance)){
  const delta=rig.lastDistance==null?0:distance-rig.lastDistance;rig.lastDistance=distance;
  if(delta<0||delta>150)rig.legs.forEach(l=>l.planted=false);
  // During stance the local sole advances +Z by exactly the body's -Z travel.
  rig.gaitPhase=(rig.gaitPhase||0)+(delta>=0&&delta<150&&!flight?delta/(2*stride*worldScale/stance)*TAU:0);phase=rig.gaitPhase;
 }
 // Stand tall at mid-stance; leg reach lowers the pelvis only at the long step extremes.
 const crouch=(.045+.035*m.run*motion)*groundWeight;
 rig.pelvis.position.y-=crouch;rig.pelvis.position.x+=Math.cos(phase-stance*Math.PI)*.045*motion*groundWeight;
 rig.chest.rotation.x=-lerp(.065,.13,m.run)*motion*groundWeight+damage*.07+recoil*.045;
 rig.chest.rotation.y=-m.aimYaw*(1-air*.65)+Math.sin(phase)*.035*motion*groundWeight;
 rig.chest.rotation.z=Math.sin(phase)*.012*motion*groundWeight;
 rig.head.rotation.y=-m.aimYaw*.18;rig.head.rotation.x=-m.aimPitch*.15;
 rig.root.updateMatrixWorld(true);w.inverse.copy(rig.root.matrixWorld).invert();
 const reset=!rig.initialized||w.lastRoot.distanceTo(rig.root.position)>200||air>.9;
 w.lastRoot.copy(rig.root.position);rig.initialized=true;
 for(let i=0;i<2;i++){
  const l=rig.legs[i],cycle=((phase/TAU+i*.5)%1+1)%1,inStance=cycle<stance,swing=clamp((cycle-stance)/(1-stance),0,1);
  const z=(inStance?-1+2*cycle/stance:1-2*T.MathUtils.smootherstep(swing,0,1))*stride;
  const lift=Math.sin(swing*Math.PI)**2*lerp(.23,.42,m.run)*motion;
  l.target.copy(l.sole);l.target.x-=Math.sign(l.sole.x)*.14*motion;l.target.z+=z*motion;l.target.y+=lift+(footHeights[i]||0);
  if(reset||flight){l.planted=false;l.wasStance=false;}
  if(stateful&&sampleHeight&&!flight&&air<.1){
   l.target.applyMatrix4(rig.root.matrixWorld);l.target.y=sampleHeight(l.target.x,l.target.z)+lift*worldScale;
   if(inStance){
    if(!l.planted||!l.wasStance)l.plant.copy(l.target);
    // A stopped mech settles back into its ready stance without a pose snap.
    if(motion<.08)l.plant.lerp(l.target,1-Math.exp(-step*7));
    l.target.copy(l.plant);l.start.copy(l.plant);l.planted=true;
   }else if(l.planted){
    w.target.copy(l.sole);w.target.x-=Math.sign(l.sole.x)*.14*motion;w.target.z-=(stride+(1-swing)*(1-stance)*2*stride/stance)*motion;w.target.applyMatrix4(rig.root.matrixWorld);w.target.y=sampleHeight(w.target.x,w.target.z);
    l.target.copy(l.start).lerp(w.target,T.MathUtils.smoothstep(swing,0,1));l.target.y+=lift*worldScale;
   }
   l.wasStance=inStance;l.target.applyMatrix4(w.inverse);
  }
  // Heel contact, flat support, then toe push-off: the rigid sole pivots around
  // its actual support edge, instead of staying flat throughout the entire step.
  l.roll=(inStance?.12*(1-T.MathUtils.smoothstep(cycle,0,.10))-.26*T.MathUtils.smoothstep(cycle,.38,stance):.14*Math.sin(swing*Math.PI)**2)*motion*groundWeight;
  l.soleQ.setFromEuler(w.euler.set(l.roll,0,0));l.support.copy(l.contact);
  if(inStance&&Math.abs(l.roll)>.00001)l.support.z=l.roll>0?l.heelZ:l.toeZ;
  l.target.add(l.support).sub(l.contact);
  if(stateful&&sampleHeight&&!flight&&air<.1&&inStance){l.target.applyMatrix4(rig.root.matrixWorld);l.target.y=sampleHeight(l.target.x,l.target.z);l.target.applyMatrix4(w.inverse);}
  w.support.copy(l.support).applyQuaternion(l.soleQ);l.target.sub(w.support);
 }
 // Lower the pelvis only as far as needed to keep the downhill leg within reach.
 if(air<.1){let supported=rig.pelvis.position.y;for(const l of rig.legs){const hip=rig.rest.get(l.thigh).p,dx=l.target.x-hip.x,dz=l.target.z-hip.z,reach=l.upperLength+l.lowerLength-.025;
  supported=Math.min(supported,l.target.y-hip.y+Math.sqrt(Math.max(.1,reach*reach-dx*dx-dz*dz)));
 }rig.pelvis.position.y=Math.max(rig.pelvis.position.y-.85,supported);}
 for(let i=0;i<2;i++){const l=rig.legs[i];
  l.target.sub(rig.pelvis.position).sub(rig.rest.get(l.thigh).p);
  solveLeg(rig,l,l.target);
  for(const [joint,x]of [[l.thigh,.12+m.run*.16+(i?-.035:.035)],[l.shin,-.48-m.run*.4],[l.foot,.12]]){
   w.flightQ.setFromEuler(w.euler.set(x,0,0));joint.quaternion.slerp(w.flightQ,air);
  }
  if(l.skirt){l.skirt.rotation.x=Math.max(0,l.thigh.rotation.x)*.52;l.skirt.rotation.z=(i?-1:1)*(.035+Math.abs(l.thigh.rotation.x)*.055);}
 }
 rig.arms[0].upper.rotation.x=.06+clamp(rig.legs[0].target.z*.17,-.30,.30)*motion*groundWeight;
 rig.arms[0].forearm.rotation.x=.20+.09*m.run*motion*groundWeight;
 rig.arms[1].upper.rotation.x=m.aimPitch+clamp(rig.legs[1].target.z*.08,-.14,.14)*motion*groundWeight;rig.arms[1].forearm.rotation.x=recoil*.10;
 // Recoil rotates the elbow instead of separating the forearm from its socket.
 rig.arms[0].upper.rotation.z=.06+air*.07;rig.arms[1].upper.rotation.z=-.06-air*.07;
 if(saber){const age=saber.age,coil=T.MathUtils.smootherstep(age,0,.17),cut=T.MathUtils.smootherstep(age,.17,.35),settle=1-T.MathUtils.smootherstep(age,.35,saber.duration),weight=coil*settle;
  rig.chest.rotation.y+=(.48-cut*1.03)*weight;rig.chest.rotation.x+=Math.sin(cut*Math.PI)*.08*weight;
  rig.arms[0].upper.rotation.x=lerp(rig.arms[0].upper.rotation.x,-1.2+cut*.18,weight);
  rig.arms[0].upper.rotation.z=lerp(rig.arms[0].upper.rotation.z,.9-cut*1.85,weight);
  rig.arms[0].forearm.rotation.x=lerp(rig.arms[0].forearm.rotation.x,-.72+cut*.44,weight);
  rig.arms[0].forearm.rotation.y=(1-cut*2.1)*weight;rig.arms[0].hand.rotation.z=(-.3+cut*.8)*weight;
 }
 rig.arms.forEach((arm,i)=>{if(arm.shoulder){arm.shoulder.rotation.x=arm.upper.rotation.x*.18;arm.shoulder.rotation.z=(i?-1:1)*Math.max(0,Math.abs(arm.upper.rotation.z)-.08)*.45;}});
}
