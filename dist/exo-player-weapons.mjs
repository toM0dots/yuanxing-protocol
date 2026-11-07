import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {createCombatVFX,VFX,hash} from './exo-combat-vfx.mjs?v=69';
const up=new T.Vector3(0,1,0),white=VFX.white,cyan=VFX.cyan,pink=VFX.pink,orange=VFX.amber;
const glow=(color,opacity=.35)=>new T.MeshBasicMaterial({color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});

// Beveled equipment shells are batched by material; only real hinges stay separate.
export function createWeaponRig(rig){
 // Equipment shares the chassis finish, including its scanned paint and
 // roughness shader. Shared material references also avoid extra paint draws.
 const chassis=new Map();rig.root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))chassis.set(o.material.name,o.material);});
 const materials=[chassis.get('Vanguard_Steel')||chassis.get('Field_Steel')||chassis.get('Strike_Titanium')||new T.MeshStandardMaterial({color:0x505b60,metalness:.7,roughness:.55}),chassis.get('Vanguard_Armor')||chassis.get('Field_Paint')||chassis.get('Strike_Ceramic')||new T.MeshStandardMaterial({color:0x747d74,metalness:.2,roughness:.8}),chassis.get('Vanguard_Seal')||chassis.get('Field_Seal')||chassis.get('Strike_JointSeal')||new T.MeshStandardMaterial({color:0x171d20,metalness:.05,roughness:.9}),new T.MeshStandardMaterial({name:'Capacitor status glass',color:0x508781,emissive:cyan,emissiveIntensity:.18,roughness:.43})];
 const bins=new Map();
 function add(parent,g,p,s,mat=0,rot=[0,0,0]){const m=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...s));if(g.index){const source=g;g=source.toNonIndexed();source.dispose();}g.applyMatrix4(m);
  const pos=g.attributes.position,norm=g.attributes.normal,uv=new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));uv[i*2]=(nx>ny&&nx>nz?pos.getZ(i):pos.getX(i))/1.6;uv[i*2+1]=(ny>nx&&ny>nz?pos.getZ(i):pos.getY(i))/1.6;}g.setAttribute('uv',new T.BufferAttribute(uv,2));
  const key=parent.uuid+':'+mat;if(!bins.has(key))bins.set(key,{parent,mat,geos:[]});bins.get(key).geos.push(g)}
 function armor(parent,p,s,mat=1){const shape=new T.Shape();shape.moveTo(-.42,-.5);shape.lineTo(.34,-.5);shape.lineTo(.5,-.28);shape.lineTo(.38,.5);shape.lineTo(-.35,.5);shape.lineTo(-.5,.25);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:1,steps:1});g.translate(0,0,-.5);add(parent,g,p,s,mat)}
 function cyl(parent,p,r,h,mat=0,rot=[0,0,0],r2=r){add(parent,new T.CylinderGeometry(r2,r,h,12),p,[1,1,1],mat,rot)}
 const saber=new T.Group();saber.name='BeamSaber';saber.rotation.x=-.28;saber.position.set(.08,.05,-.12);rig.arms[0].hand.add(saber);
 cyl(saber,[0,0,0],.12,.62);for(let i=0;i<5;i++)cyl(saber,[0,-.22+i*.095,0],.14,.035,2);
 armor(saber,[0,.32,0],[.62,.24,.36]);armor(saber,[-.21,.5,0],[.13,.48,.25]);armor(saber,[.21,.5,0],[.13,.48,.25]);cyl(saber,[0,.47,0],.14,.25,0);cyl(saber,[0,.6,0],.12,.08,3);
 const blade=new T.Group();blade.position.y=.64;saber.add(blade);
 const core=new T.Mesh(new T.CylinderGeometry(.015,.055,4.5,10),new T.MeshBasicMaterial({color:0xffedff,toneMapped:false}));core.position.y=2.25;blade.add(core);
 const halo=new T.Mesh(new T.CylinderGeometry(.045,.13,4.6,10),glow(pink,.36));halo.position.y=2.25;blade.add(halo);
 const outer=new T.Mesh(new T.CylinderGeometry(.08,.24,4.65,10),glow(pink,.10));outer.position.y=2.25;blade.add(outer);
 const pods=[],doors=[];
 // The v7 concept carries one compact four-tube pack above the right shoulder.
 // Game-forward is -Z; the anatomical right is +X, appearing on the left in a front view.
 for(const side of [1]){
  const pod=new T.Group();pod.name='MissilePod';pod.position.set(side*1.10,1.63,.02);pod.scale.setScalar(.78);rig.chest.add(pod);pods.push(pod);
  armor(pod,[0,0,.04],[.69,.65,1.12],0);armor(pod,[0,-.35,.25],[.45,.13,.68],2);
  for(const x of [-.17,.17])for(const y of [-.17,.17]){
   cyl(pod,[x,y,-.55],.149,.045,0,[Math.PI/2,0,0]);
   cyl(pod,[x,y,-.573],.119,.035,2,[Math.PI/2,0,0]);
   cyl(pod,[x,y,-.58],.044,.014,0,[Math.PI/2,0,0]);
  }
  armor(pod,[0,.34,.18],[.54,.09,.65],1);
  const door=new T.Group();door.name='MissilePodDoor';door.position.set(0,.34,.46);pod.add(door);doors.push(door);
  armor(door,[0,0,-.07],[.59,.06,.32],0);
 }
 const cannon=new T.Group();cannon.name='PulseCapacitor';rig.muzzle.add(cannon);
 for(const x of [-.21,.21])armor(cannon,[x,0,.28],[.14,.36,.66]);
 for(let i=0;i<3;i++)cyl(cannon,[0,0,.03+i*.16],.18,.035,3,[Math.PI/2,0,0]);cyl(cannon,[0,0,-.08],.2,.12,0,[Math.PI/2,0,0]);cyl(cannon,[0,0,-.15],.13,.025,2,[Math.PI/2,0,0]);
 for(const {parent,mat,geos} of bins.values()){const g=mergeGeometries(geos,false),m=new T.Mesh(g,materials[mat]);m.castShadow=m.receiveShadow=true;parent.add(m);geos.forEach(x=>x.dispose());}
 return {saber,blade,pods,doors,cannon,update(b,enabled,time,reduced=false){saber.visible=cannon.visible=enabled;pods.forEach(p=>p.visible=enabled);const a=b?.saber,t=a?T.MathUtils.clamp(a.age/a.duration,0,1):0;blade.visible=enabled&&!!a;blade.scale.y=a?1+Math.sin(t*Math.PI)*.06:1;halo.material.opacity=reduced?.25:.25+Math.sin(time*16)*.018;saber.rotation.z=a?-.12:0;
  const elapsed=5.5-(b?.missileCooldown||0),open=elapsed>=0&&elapsed<1.1?T.MathUtils.smoothstep(elapsed,0,.16)*(1-T.MathUtils.smoothstep(elapsed,.72,1.1)):0;doors.forEach((d,i)=>d.rotation.x=-1.75*open);materials[3].emissiveIntensity=.18+(b?.cooldown>0?.65:0);
 }};
}

export function createPlayerWeaponLayer(scene){
 const fx=createCombatVFX(scene,'PlayerWeaponFX',true),origins=new Map(),history=[];
 // Reuse scratch vectors. Persistent socket/trail samples own their vectors.
 const scratch=Array.from({length:768},()=>new T.Vector3()),q=new T.Quaternion();let cursor=0,lastSwing=null;
 const v=(x=0,y=0,z=0)=>scratch[cursor++%scratch.length].set(x,y,z),copy=p=>v().copy(p);
 const positions=new Float32Array(24*6*3),alphas=new Float32Array(24*6),uvs=new Float32Array(24*6*2),trailGeometry=new T.BufferGeometry();
 trailGeometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));trailGeometry.setAttribute('alpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));trailGeometry.setAttribute('uv',new T.BufferAttribute(uvs,2).setUsage(T.DynamicDrawUsage));trailGeometry.setDrawRange(0,0);
 const trailMaterial=new T.ShaderMaterial({uniforms:{color:{value:new T.Color(pink)}},vertexShader:'attribute float alpha;varying float fade;varying vec2 ribbonUv;void main(){fade=alpha;ribbonUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 color;varying float fade;varying vec2 ribbonUv;
 void main(){float edge=smoothstep(0.,.16,ribbonUv.y)*(1.-smoothstep(.92,1.,ribbonUv.y));float hot=smoothstep(.68,.98,fade)*pow(ribbonUv.y,2.);vec3 tint=mix(color,vec3(1.,.92,1.),hot*.8);gl_FragColor=vec4(tint,fade*edge*.48);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
 const ribbon=new T.Mesh(trailGeometry,trailMaterial);ribbon.name='Socket-following saber ribbon';ribbon.frustumCulled=false;fx.group.add(ribbon);
 function update(b,u,time,height,rig,enabled=true,equipment=null,camera=null,reduced=false){
  fx.begin();cursor=0;const at=(x,y,z=65)=>v(x,height(x,y)+z,y),near=p=>Math.hypot(p.x-u.x,p.y-u.y)<2000;
  for(const bolt of b?.bolts||[]){
   if(bolt.enemy||!near(bolt))continue;
   const p=at(bolt.x,bolt.y),tail=at(bolt.x-bolt.vx*.065,bolt.y-bolt.vy*.065);
   if(Number.isFinite(bolt.z)){p.y=bolt.z;tail.y=bolt.z-(bolt.vz||0)*.065;}
   if(rig&&bolt.origin){
    if(!origins.has(bolt))origins.set(bolt,rig.muzzle.getWorldPosition(new T.Vector3()).sub(Number.isFinite(bolt.origin.z)?v(bolt.origin.x,bolt.origin.z,bolt.origin.y):at(bolt.origin.x,bolt.origin.y)));
    const offset=origins.get(bolt);p.addScaledVector(offset,Math.max(0,1-(bolt.age||0)/.2));tail.addScaledVector(offset,Math.max(0,1-((bolt.age||0)-.065)/.2));
   }
   fx.beam(tail,p,1.5,white,.95);fx.beam(tail,p,4.6,cyan,.25);fx.glow(p,18,cyan,.8,camera);
   if(!reduced){const dir=copy(p).sub(tail).normalize();fx.ring(copy(p).addScaledVector(dir,-10),5,cyan,.55,dir);}
  }
  for(const bolt of origins.keys())if(!b?.bolts?.includes(bolt))origins.delete(bolt);
  if(enabled&&rig){
   const flash=(b.weaponFX||[]).find(e=>e.kind==='muzzle');
   if(flash){
    const p=rig.muzzle.getWorldPosition(v()),f=flash.ttl/flash.total,forward=v(0,0,-1).applyQuaternion(rig.muzzle.getWorldQuaternion(q)),side=v(1,0,0).applyQuaternion(q),vertical=v(0,1,0).applyQuaternion(q),tip=copy(p).addScaledVector(forward,16+f*34);
    fx.beam(p,tip,2.1,white,f);fx.beam(p,tip,5.8,cyan,f*.4);fx.glow(p,26+f*22,cyan,f*.9,camera);fx.glow(p,[48*f+12,3+3*f,1],white,f*.75,camera);
    fx.ring(copy(p).addScaledVector(forward,(1-f)*36),6+(1-f)*15,cyan,f*.7,forward);
    if(!reduced)for(let i=0;i<4;i++){const a=i*Math.PI/2+flash.seed*.7,petal=copy(p).addScaledVector(forward,12).addScaledVector(side,Math.cos(a)*8*f).addScaledVector(vertical,Math.sin(a)*8*f);fx.beam(p,petal,1.1,white,f*.65);fx.beam(petal,tip,1.5,cyan,f*.6);}
   }
  }
  const a=enabled?b?.saber:null;
  if(a!==lastSwing){history.length=0;lastSwing=a;}
  const active=a&&a.age>=.15&&a.age<=.40&&equipment;
  if(active){
   const base=equipment.blade.localToWorld(new T.Vector3(0,2.1,0)),tip=equipment.blade.localToWorld(new T.Vector3(0,4.5,0));
   if(!history.length||time>history.at(-1).time)history.push({base,tip,time});
   fx.glow(base,13,pink,.4,camera);fx.glow(tip,18,pink,.6,camera);
  }
  while(history.length&&(time-history[0].time>.18||history.length>24))history.shift();
  let vertices=0;
  for(let i=1;i<history.length;i++){
   const prev=history[i-1],next=history[i],fade0=Math.max(0,1-(time-prev.time)/.18),fade1=Math.max(0,1-(time-next.time)/.18);
   for(const [p,fade,edge] of [[prev.base,fade0,0],[prev.tip,fade0,1],[next.tip,fade1,1],[prev.base,fade0,0],[next.tip,fade1,1],[next.base,fade1,0]]){positions.set(p.toArray(),vertices*3);alphas[vertices]=fade*(reduced?.4:1);uvs[vertices*2]=i/history.length;uvs[vertices*2+1]=edge;vertices++;}
   // The blade-tip contour makes the swing readable even against a bright sky.
   fx.beam(prev.tip,next.tip,.8,pink,fade0*(reduced?.25:.6));
  }
  trailGeometry.setDrawRange(0,vertices);trailGeometry.attributes.position.needsUpdate=trailGeometry.attributes.alpha.needsUpdate=trailGeometry.attributes.uv.needsUpdate=true;ribbon.visible=vertices>0;
  for(const m of b?.missiles||[]){
   if(m.delay>0||!near(m))continue;
   const z=65+Math.sin(Math.min(1,m.age/.7)*Math.PI)*65,p=at(m.x,m.y,z),dir=v(Math.cos(m.angle)*Math.cos(m.pitch||0),Math.sin(m.pitch||0),Math.sin(m.angle)*Math.cos(m.pitch||0));if(Number.isFinite(m.z))p.y=m.z;
   if(equipment&&m.age<.3){const socket=equipment.pods[(m.socket||0)%equipment.pods.length].getWorldPosition(v()),offset=socket.sub(at(u.x,u.y,65+(u.altitude||0)));p.addScaledVector(offset,1-m.age/.3);}
   q.setFromUnitVectors(up,dir);fx.put('missile',p,24,0xdde3e4,1,q);
   const tail=copy(p).addScaledVector(dir,-13),pulse=.92+.08*Math.sin(time*65+(m.id||0));
   fx.beam(tail,copy(tail).addScaledVector(dir,-22*pulse),2.2,white,.95);fx.beam(tail,copy(tail).addScaledVector(dir,-43*pulse),5.0,orange,.4);fx.glow(tail,20,orange,.8,camera);
   if(!reduced)for(let i=0;i<3;i++)fx.ring(copy(tail).addScaledVector(dir,-7-i*8),3.2-i*.65,white,.62-i*.14,dir);
   const trail=m.trail||[];
   for(let i=0;i<trail.length;i+=reduced?3:2){
    const t=trail[i],h=Number.isFinite(t.z)?v(t.x,t.z,t.y):at(t.x,t.y,65+Math.sin(Math.min(1,t.age/.7)*Math.PI)*65),age=Math.max(0,m.age-t.age),fresh=Math.max(0,1-age/.5);
    h.x+=Math.sin((m.id||0)+t.age*15)*age*7;h.y+=age*16;
    fx.smoke(h,8+age*42,.22*fresh,0x777b80,camera);
    if(!reduced&&i+2<trail.length){const n=trail[i+2],end=Number.isFinite(n.z)?v(n.x,n.z,n.y):at(n.x,n.y,65+Math.sin(Math.min(1,n.age/.7)*Math.PI)*65);fx.beam(h,end,1.5,orange,fresh*.22);}
   }
  }
  for(const e of b?.weaponFX||[]){
   if(e.kind==='muzzle'||!near(e))continue;
   const age=e.total-e.ttl,t=T.MathUtils.clamp(age/e.total,0,1),fade=1-t;if(t>=1)continue;
   const p=Number.isFinite(e.z)?v(e.x,e.z,e.y):at(e.x,e.y,45),blast=e.kind==='blast',slash=e.kind==='slashHit',tint=blast?orange:slash?pink:cyan,scale=blast?1.1:.48,burst=Math.max(0,1-age/(blast?.22:.13));
   // Bright contact -> expanding pressure wave -> ballistic fragments and cooling smoke.
   fx.glow(p,(22+Math.sqrt(t)*95)*scale,tint,burst*.95,camera);
   if(burst>0){fx.put('ball',p,(4+t*32)*scale,white,burst);fx.glow(p,[(35+t*130)*scale,6*scale,1],white,burst*.8,camera);}
   if(blast){
    const floor=height(e.x,e.y),ground=copy(p);ground.y=floor+2;
    if(p.y-floor<145)fx.ring(ground,(12+Math.sqrt(t)*130)*scale,orange,fade*fade*.48);
    fx.ring(p,(6+Math.sqrt(t)*72)*scale,orange,fade*fade*.32,camera?v(0,0,1).applyQuaternion(camera.quaternion):up);
    if(t<.45)for(let i=0;i<(reduced?2:4);i++){const a=i*2.4+e.seed,flame=copy(p).add(v(Math.cos(a)*t*32,6+t*34,Math.sin(a)*t*32));fx.put('ball',flame,(8+Math.sin(t*Math.PI)*24)*scale,i%2?orange:0xff6827,(1-t/.45)*.4);}
   }else if(!slash){const normal=v(u.x-e.x,35,u.y-e.y).normalize();fx.ring(p,(5+t*55)*scale,cyan,fade*.5,normal);}
   const count=reduced?3:blast?12:slash?9:7;
   for(let i=0;i<count;i++){
    const angle=hash(e.seed+i)*Math.PI*2,speed=(blast?130:90)+hash(e.seed+i+17)*120,vx=Math.cos(angle)*speed*scale,vz=Math.sin(angle)*speed*scale,vy=(35+hash(e.seed+i+71)*170)*scale,tailAge=Math.max(0,age-.035);
    const tip=copy(p).add(v(vx*age,vy*age-age*age*130,vz*age)),tail=copy(p).add(v(vx*tailAge,vy*tailAge-tailAge*tailAge*130,vz*tailAge));
    fx.beam(tail,tip,(blast?1.15:.8)*scale,i%3?0xffc477:tint,fade*fade);
    if(blast&&i<3)fx.put('debris',tip,[2*scale,3*scale,2*scale],0x655951,fade);
   }
   if(!reduced)for(let i=0;i<(blast?4:2);i++){const a=i*2.4+e.seed,smoke=copy(p).add(v(Math.cos(a)*t*24*scale,(8+t*70)*scale,Math.sin(a)*t*24*scale));fx.smoke(smoke,(18+t*86)*scale,Math.sin(t*Math.PI)*.25,blast?0x514b46:0x617078,camera);}
   if(slash){const direction=v(.7,1,-.25).normalize(),length=(14+t*55)*scale;fx.beam(copy(p).addScaledVector(direction,-length),copy(p).addScaledVector(direction,length),1.4,pink,fade);fx.glow(p,28,pink,fade*.5,camera);}
  }
  fx.end();
 }
 return {group:fx.group,update,get allocated(){return fx.capacity},get draws(){return fx.draws+(ribbon.visible?1:0)},get activeInstances(){return Object.values(fx.buckets).reduce((n,b)=>n+b.used,0)},dispose(){trailGeometry.dispose();trailMaterial.dispose();fx.dispose();}};
}
