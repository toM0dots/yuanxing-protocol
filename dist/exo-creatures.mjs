import * as T from './assets/ev01/three.module.mjs';
import {createCreature,poseCreature,configureFaunaSurface} from './exo-creature-models.mjs?v=20261106-model85e';
import {createCombatVFX,VFX,hash} from './exo-combat-vfx.mjs?v=69';
export {createCreature,poseCreature,configureFaunaSurface};
const colors=[0x55efcb,VFX.amber,VFX.green,0xff7449],violet=0xb685ff,UP=new T.Vector3(0,1,0),TAU=Math.PI*2;
const circle=Array.from({length:49},(_,i)=>[Math.cos(i/48*TAU),Math.sin(i/48*TAU)]);

export function createCreatureLayer(scene){
 let lastCombat=null;const live=new Map(),fx=createCombatVFX(scene,'Enemy attack effects',true),origins=new Map(),shots=new Map(),visible=new Set();
 // Short-lived vectors and warning vertices are reused, even during overlapping attacks.
 const scratch=Array.from({length:1024},()=>new T.Vector3()),tint=new T.Color(),q=new T.Quaternion();let cursor=0,smokeCount=0;
 const v=(x=0,y=0,z=0)=>scratch[cursor++%scratch.length].set(x,y,z),copy=p=>v().copy(p);
 const effects=new T.Group();effects.name='Enemy attack warnings';scene.add(effects);
 const maxVertices=12288,positions=new Float32Array(maxVertices*3),tints=new Float32Array(maxVertices*3),alphas=new Float32Array(maxVertices),geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(tints,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('alpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));geometry.setDrawRange(0,0);
 const material=new T.ShaderMaterial({vertexShader:'attribute vec3 color;attribute float alpha;varying vec3 tint;varying float fade;void main(){tint=color;fade=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 tint;varying float fade;void main(){gl_FragColor=vec4(tint,fade);}',transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const warningMesh=new T.Mesh(geometry,material);warningMesh.frustumCulled=false;effects.add(warningMesh);let used=0;
 function vertex(p,alpha){const i=used*3;positions[i]=p.x;positions[i+1]=p.y;positions[i+2]=p.z;tints[i]=tint.r;tints[i+1]=tint.g;tints[i+2]=tint.b;alphas[used++]=alpha;}
 function quad(a,b,c,d,alpha){if(used+6>maxVertices)return;vertex(a,alpha);vertex(b,alpha);vertex(c,alpha);vertex(a,alpha);vertex(c,alpha);vertex(d,alpha);}
 function update(combat,u,time,ground,camera=null,reduced=false){
  if(combat!==lastCombat){clear();lastCombat=combat;}used=0;cursor=0;smokeCount=0;fx.begin();visible.clear();
  const near=p=>Math.hypot(p.x-u.x,p.y-u.y)<1800,detail=p=>!reduced&&Math.hypot(p.x-u.x,p.y-u.y)<900,at=(x,y,z=4)=>v(x,ground(x,y)+z,y);
  const mist=(p,size,alpha,color)=>{if(smokeCount++>=48)return;if(Array.isArray(size))fx.put('smoke',p,size,color,alpha,camera?.quaternion);else fx.smoke(p,size,alpha,color,camera);};
  for(const e of combat.enemies){if(e.hp<=0||!near(e))continue;visible.add(e.id);let rig=live.get(e.id);const distance=Math.hypot(e.x-u.x,e.y-u.y),lowDetail=rig?.lowDetail?distance>780:distance>980;if(!rig||rig.level!==(e.level||1)||rig.lowDetail!==lowDetail){if(rig){scene.remove(rig.root);rig.dispose?.();}rig=createCreature(e.level||1,lowDetail);rig.lowDetail=lowDetail;rig.emitter=rig.root.getObjectByName('AttackEmitter');rig.claws=['L','R'].map(side=>rig.root.getObjectByName('Claw_'+side));scene.add(rig.root);live.set(e.id,rig);}if(distance<1100||time-(rig.lastPose??-1)>.1){poseCreature(rig,e,u,time,ground);rig.lastPose=time;}rig.root.updateMatrixWorld(true);}
  for(const [id,rig] of live)if(!visible.has(id)){scene.remove(rig.root);rig.dispose?.();live.delete(id);}
  const emitter=e=>{const socket=live.get(e.id)?.emitter;return socket?socket.getWorldPosition(v()):at(e.x,e.y,[48,65,98,140][(e.level||1)-1]);};
  function ring(x,y,r,width,color,alpha=.6){
   r=Math.max(0,r);const inner=Math.max(0,r-width);tint.setHex(color);
   for(let i=0;i<48;i++){const a=circle[i],b=circle[i+1];quad(at(x+a[0]*r,y+a[1]*r),at(x+b[0]*r,y+b[1]*r),at(x+b[0]*inner,y+b[1]*inner),at(x+a[0]*inner,y+a[1]*inner),alpha);}
  }
  function lane(from,to,width,color,progress){
   const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,n=Math.max(1,Math.ceil(len/40)),ox=-dy/len*width,oy=dx/len*width;tint.setHex(color);
   for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;quad(at(from.x+dx*a-ox,from.y+dy*a-oy),at(from.x+dx*b-ox,from.y+dy*b-oy),at(from.x+dx*b+ox,from.y+dy*b+oy),at(from.x+dx*a+ox,from.y+dy*a+oy),.12+progress*.12);}
   for(const side of [-1,1])fx.beam(at(from.x+ox*side,from.y+oy*side),at(to.x+ox*side,to.y+oy*side),1.8,color,.45+progress*.3);
  }
  for(const e of combat.enemies){
   const a=e.action;if(!a||e.hp<=0||!visible.has(e.id))continue;
   const color=colors[(e.level||1)-1],p=emitter(e),full=detail(e),charge=T.MathUtils.clamp(1-(a.time??0)/(a.duration||1),0,1),direction=v((a.target?.x??u.x)-e.x,0,(a.target?.y??u.y)-e.y).normalize();
   if(a.phase==='windup'){
    if(a.kind==='charge'||a.kind==='pounce')lane(a.from||e,a.target,a.kind==='charge'?32:20,color,charge);
    else if(a.kind==='shockwave')ring(e.x,e.y,260,4,color,.7);
    else if(a.kind==='mortar'){ring(a.target.x,a.target.y,110,5,color,.75);ring(a.target.x,a.target.y,110*(1-charge),2,color,.4);}
    else ring(e.x,e.y,60,3,color,.5);
    fx.glow(p,18+charge*30,color,.2+charge*.45,camera);
    if(e.level===1){
     // A wet, swelling throat and hanging droplets precede the fast spit/pounce.
     fx.put('ball',p,[5+charge*7,4+charge*4,6+charge*8],color,.5);
     if(full)for(let i=0;i<3;i++){const drop=copy(p).add(v((i-1)*6,-5-charge*(7+i*3),0));fx.put('ball',drop,[1.4,2.6,1.4],color,.6);}
    }else if(e.level===2){
     for(const side of [-1,1]){const horn=copy(p).add(v(direction.z*side*20,3,-direction.x*side*20));fx.beam(copy(horn).addScaledVector(direction,-18),horn,1.3,VFX.white,.25+charge*.55);if(full)mist(copy(horn).add(v(0,charge*15,0)),10+charge*18,.18,0x82735e);}
    }else if(e.level===3){
     fx.put('ball',p,7+charge*10,color,.22);for(let i=0;i<(full?5:2);i++){const a=i*2.4+(reduced?0:time*.8),r=18*(1-charge*.55),spore=copy(p).add(v(Math.cos(a)*r,Math.sin(a*1.3)*r*.65,Math.sin(a)*r));fx.put('ball',spore,2+charge*2,color,.65);}
    }else{
     for(let i=0;i<2;i++){const center=copy(p).addScaledVector(direction,8+i*12);fx.ring(center,(36+i*12)*(1-charge*.65),i?violet:color,.3+charge*.5,direction);}
     if(full)for(let i=0;i<5;i++){const a=i*TAU/5+(reduced?0:time*.7),r=38*(1-charge*.7),point=copy(p).add(v(Math.cos(a)*r,Math.sin(a)*r,0));fx.beam(point,copy(point).lerp(p,.45),1.2,violet,.5);}
    }
   }else if(a.phase==='dash'){
    const d=v(e.vx||direction.x,0,e.vy||direction.z).normalize();
    for(let i=1;i<(full?6:3);i++)mist(at(e.x-d.x*i*17,e.y-d.z*i*17,6+i*3),18+i*8,.26,0xa18b70);
    if(a.kind==='pounce'){for(let i=-1;i<=1;i++){const tip=copy(p).add(v(d.z*i*8,0,-d.x*i*8));fx.beam(copy(tip).addScaledVector(d,-28),tip,1,colors[0],.65);}}
    else if(full)for(const side of [-1,1]){const start=at(e.x+d.z*side*28,e.y-d.x*side*28,7);fx.beam(copy(start).addScaledVector(d,-40),start,1.5,VFX.amber,.75);}
   }
   if(a.phase==='release'&&a.kind==='volley')for(const claw of live.get(e.id)?.claws||[]){if(!claw)continue;const tip=claw.getWorldPosition(v());fx.glow(tip,34,violet,.75,camera);fx.beam(tip,copy(tip).addScaledVector(direction,28),2,VFX.white,.7);}
  }
  // Warnings remain at the simulation's exact radii in both effect modes.
  for(const h of combat.hazards||[]){if(!near(h))continue;const full=detail(h);
   if(h.kind==='impact'){
    ring(h.x,h.y,h.radius,4,VFX.green,.75);if(!h.from)continue;
    if(!origins.has(h)){const owner=combat.enemies.find(e=>e.id===h.owner);origins.set(h,(owner?emitter(owner):at(h.from.x,h.from.y,95)).clone());}
    const t=T.MathUtils.clamp(1-h.delay/(h.total||1.25),0,1),from=origins.get(h),end=at(h.x,h.y,5),p=copy(from).lerp(end,t);p.y+=Math.sin(t*Math.PI)*180;
    fx.put('debris',p,[7,11,7],0x576532,1);fx.glow(p,26,VFX.green,.65,camera);
    for(let i=0;i<(full?5:2);i++){const a=i*2.4+t*5,spore=copy(p).add(v(Math.cos(a)*9,Math.sin(a*.8)*7,Math.sin(a)*9));fx.put('ball',spore,4,VFX.green,.65);}
    for(let i=1;i<=(full?4:2);i++){const k=Math.max(0,t-i*.035),trail=copy(from).lerp(end,k);trail.y+=Math.sin(k*Math.PI)*180;fx.put('ball',trail,4-i*.6,VFX.green,.45/i);}
   }else if(h.kind==='pool'){
    ring(h.x,h.y,h.radius,h.radius,VFX.green,.09);ring(h.x,h.y,h.radius,3,VFX.green,.65);
    for(let i=0;i<(full?7:2);i++){const a=i*2.4,r=hash(i+(h.owner||0))*h.radius*.8,phase=reduced?.4:(time*.65+i*.27)%1,p=at(h.x+Math.cos(a)*r,h.y+Math.sin(a)*r,3+phase*16);fx.put('ball',p,1.5+phase*3,VFX.green,(1-phase)*.6);if(full&&i<3)mist(copy(p).add(v(0,9+phase*15,0)),[30,60,1],.17,0x849c50);}
   }else if(h.kind==='shockwave'){
    const fade=1-h.radius/h.maxRadius;ring(h.x,h.y,h.radius,25,colors[3],.09);ring(h.x,h.y,h.radius,9,colors[3],.8);ring(h.x,h.y,h.radius-10,2,VFX.white,.55);
    for(let i=0;i<(full?12:4);i++){const a=i*TAU/(full?12:4),p=at(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius,5);fx.put('debris',copy(p).add(v(0,Math.sin(h.radius*.035+i)*7+8,0)),[3,6,4],0x65564b,fade);if(full&&i%3===0)mist(p,26+h.radius*.20,fade*.22,0x8d7460);
     if(full){const inner=at(h.x+Math.cos(a-.05)*h.radius*.70,h.y+Math.sin(a-.05)*h.radius*.70,5);fx.beam(inner,p,2.1,violet,fade*.65);}
    }
   }
  }
  for(const h of origins.keys())if(!combat.hazards?.includes(h)||h.kind!=='impact')origins.delete(h);
  for(const b of combat.bolts||[]){if(!b.enemy||!near(b))continue;
   const spit=b.kind==='spit',color=spit?colors[0]:colors[3],p=Number.isFinite(b.z)?v(b.x,b.z,b.y):at(b.x,b.y,50),full=detail(b);
   if(!shots.has(b)){const owner=combat.enemies.find(e=>e.id===b.owner);shots.set(b,owner?emitter(owner).sub(p).clone():new T.Vector3());}p.addScaledVector(shots.get(b),Math.max(0,1-(b.age||0)/.22));
   const d=v(b.vx,b.vz||0,b.vy).normalize(),tail=copy(p).addScaledVector(d,spit?-16:-30);q.setFromUnitVectors(UP,d);
   if(spit){fx.put('ball',p,[4,8,4],color,.8,q);fx.beam(tail,p,1.5,color,.45);if(full)for(let i=1;i<=3;i++){const drop=copy(p).addScaledVector(d,-i*9);drop.y-=i*i*.7;fx.put('ball',drop,2.3-i*.35,color,.55-i*.1);}}
   else {fx.beam(tail,p,2.8,VFX.white,.95);fx.beam(tail,p,6.5,color,.42);if(full)fx.ring(copy(p).addScaledVector(d,-8),7,violet,.65,d);}
   fx.glow(p,spit?13:23,spit?color:violet,.48,camera);
  }
  for(const b of shots.keys())if(!combat.bolts?.includes(b))shots.delete(b);
  for(const e of combat.enemyFX||[]){if(!near(e))continue;
   const age=e.total-e.ttl,t=T.MathUtils.clamp(age/e.total,0,1),fade=1-t;if(t>=1)continue;
   const p=Number.isFinite(e.z)?v(e.x,e.z,e.y):at(e.x,e.y,5),color=colors[(e.level||1)-1],full=detail(e),flash=Math.max(0,1-age/(e.kind==='slam'?.28:e.kind==='sporeImpact'?.22:.18));
   if(e.kind.includes('Launch')||e.kind==='launch'){
    const owner=combat.enemies.find(m=>m.id===e.owner),source=owner?emitter(owner):p;
    if(e.kind==='launch'){if(age<.5)mist(p,20+t*85,fade*.24,VFX.dust);}
    else {fx.glow(source,20+t*35,color,flash*.8,camera);if(e.kind==='mortarLaunch'&&full)mist(copy(source).add(v(0,t*45,0)),20+t*40,fade*.18,0x8ea35c);}
   }else if(e.kind==='acidImpact'||e.kind==='sporeImpact'){
    const spore=e.kind==='sporeImpact';fx.glow(p,spore?42:23,color,flash*.7,camera);
    for(let i=0;i<(full?(spore?11:8):3);i++){const a=hash(i+e.seed)*TAU,r=(spore?75:50)*t*(.5+hash(i+19)),drop=copy(p).add(v(Math.cos(a)*r,Math.max(1,Math.sin(t*Math.PI)*(spore?50:24)),Math.sin(a)*r));fx.put('ball',drop,(spore?3.5:2.5)*fade+1,color,fade*.65);}
    if(full)for(let i=0;i<(spore?3:1);i++){const cloud=copy(p).add(v(Math.cos(i*2.4)*t*20,10+t*(spore?75:28),Math.sin(i*2.4)*t*20));mist(cloud,spore?38+t*80:20+t*35,Math.sin(t*Math.PI)*(spore?.30:.22),spore?0x91a84c:0x498e83);}
   }else if(e.kind==='chargeImpact'||e.kind==='pounceImpact'){
    const charge=e.kind==='chargeImpact',normal=v(u.x-e.x,0,u.y-e.y).normalize();fx.glow(copy(p).add(v(0,10,0)),charge?45:22,color,flash*.75,camera);
    for(let i=0;i<(full?(charge?12:6):3);i++){const a=hash(e.seed+i)*TAU,speed=(35+hash(i+71)*85)*(charge?1:.6),vx=Math.cos(a)*speed,vz=Math.sin(a)*speed,vy=30+hash(i+37)*65,tip=copy(p).add(v(vx*age,Math.max(2,vy*age-age*age*80),vz*age));fx.beam(copy(tip).add(v(-vx*.055,-vy*.04,-vz*.055)),tip,charge?1.5:1,color,fade*.75);if(charge&&i<4)fx.put('debris',tip,[3,5,3],0x736352,fade);}
    if(full)for(let i=0;i<(charge?3:1);i++)mist(copy(p).addScaledVector(normal,-t*35).add(v((i-1)*15,t*25,0)),(charge?35:20)+t*80,fade*.30,0x9a8468);
   }else if(e.kind==='slam'||e.kind==='volleyImpact'){
    const slam=e.kind==='slam',scale=slam?1.4:.65;fx.glow(p,(24+Math.sqrt(t)*70)*scale,violet,flash*.8,camera);if(flash>0){fx.put('ball',p,(10+t*35)*scale,VFX.white,flash*.85);if(slam)fx.beam(p,copy(p).add(v(0,55+flash*40,0)),7*flash,violet,flash*.45);}
    for(let i=0;i<(full?(slam?14:7):4);i++){const a=hash(e.seed+i)*TAU,r=t*(70+hash(i+43)*100)*scale,tip=copy(p).add(v(Math.cos(a)*r,Math.max(2,Math.sin(t*Math.PI)*55*scale),Math.sin(a)*r));fx.beam(copy(tip).lerp(p,.12),tip,1.5*scale,i%3?color:violet,fade*.75);if(slam&&i<4)fx.put('debris',tip,[4,6,3],0x695546,fade);}
    if(full)for(let i=0;i<(slam?4:2);i++)mist(copy(p).add(v(Math.cos(i*2.4)*t*40,15+t*55,Math.sin(i*2.4)*t*40)),(25+t*80)*scale,Math.sin(t*Math.PI)*.19,0x796759);
   }
  }
  geometry.setDrawRange(0,used);for(const a of Object.values(geometry.attributes))a.needsUpdate=true;warningMesh.visible=used>0;fx.end();
 }
 function clear(){for(const rig of live.values()){scene.remove(rig.root);rig.dispose?.();}live.clear();origins.clear();shots.clear();used=0;geometry.setDrawRange(0,0);warningMesh.visible=false;fx.begin();fx.end();}
 return {update,clear,get count(){return live.size},get effectDraws(){return fx.draws+(used?1:0)},get activeInstances(){return Object.values(fx.buckets).reduce((n,b)=>n+b.used,0)},get effectCapacity(){return fx.capacity},dispose(){clear();scene.remove(effects);geometry.dispose();material.dispose();fx.dispose();}};
}
