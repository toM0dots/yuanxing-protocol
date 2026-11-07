import * as T from './three.module.mjs';
import { mergeGeometries } from './BufferGeometryUtils.mjs';

// ECHO–9 EV–01. Metres, +Y up, -Z forward. Rigid mechanical joint hierarchy.
export function createMech({detail=1}={}) {
  const root=new T.Group();root.name='EV01';
  const mat={
    armor:new T.MeshStandardMaterial({name:'Ceramic titanium',color:0xb9c4c0,metalness:.63,roughness:.44}),
    dark:new T.MeshStandardMaterial({name:'Petrol composite',color:0x24454c,metalness:.62,roughness:.4}),
    frame:new T.MeshStandardMaterial({name:'Graphite structure',color:0x171f25,metalness:.78,roughness:.39}),
    metal:new T.MeshStandardMaterial({name:'Machined alloy',color:0x7c9099,metalness:.94,roughness:.23}),
    orange:new T.MeshStandardMaterial({name:'Rescue orange',color:0xcf5928,metalness:.38,roughness:.51}),
    black:new T.MeshStandardMaterial({name:'Joint seals',color:0x0b1116,metalness:.1,roughness:.81}),
    light:new T.MeshStandardMaterial({name:'Cyan phosphor',color:0x9affff,emissive:0x37c9df,emissiveIntensity:2.6,roughness:.3}),
    amber:new T.MeshStandardMaterial({name:'Amber phosphor',color:0xffa643,emissive:0xff5418,emissiveIntensity:1.5}),
    glass:new T.MeshStandardMaterial({name:'Armored optical glass',color:0x063944,metalness:.82,roughness:.13,emissive:0x11525f,emissiveIntensity:.35})
  };
  let n=0;const geos=new Map();
  function group(parent,name,p=[0,0,0]){const o=new T.Group();o.name=name;o.position.set(...p);parent.add(o);return o;}
  function mesh(p,g,m,pos=[0,0,0],rot=[0,0,0],name){const o=new T.Mesh(g,m);o.name=name||`part_${n++}`;o.position.set(...pos);o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  function panelGeo(w,h,d,cut=.16){const key=[w,h,d,cut].join();if(geos.has(key))return geos.get(key);const x=w/2,y=h/2,q=Math.min(w,h)*cut;const s=new T.Shape();s.moveTo(-x+q,-y);s.lineTo(x-q,-y);s.lineTo(x,-y+q);s.lineTo(x,y-q);s.lineTo(x-q,y);s.lineTo(-x+q,y);s.lineTo(-x,y-q);s.lineTo(-x,-y+q);s.closePath();const b=Math.min(.045,d*.17,w*.06,h*.06);const g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1,curveSegments:1});g.translate(0,0,-d/2+b);geos.set(key,g);return g;}
  const plate=(p,dim,pos,m=mat.armor,rot=[0,0,0],name)=>mesh(p,panelGeo(...dim),m,pos,rot,name);
  const box=(p,dim,pos,m=mat.frame,rot=[0,0,0])=>mesh(p,new T.BoxGeometry(...dim),m,pos,rot);
  const cyl=(p,r1,r2,len,pos,m=mat.metal,rot=[0,0,Math.PI/2],seg=16)=>mesh(p,new T.CylinderGeometry(r1,r2,len,seg),m,pos,rot);
  function rod(p,a,b,r,m=mat.metal){const A=new T.Vector3(...a),B=new T.Vector3(...b),o=mesh(p,new T.CylinderGeometry(r,r,A.distanceTo(B),10),m,A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());return o;}
  function bolts(p,w,h,z){if(!detail)return;for(const x of [-w/2,w/2])for(const y of [-h/2,h/2])cyl(p,.034,.034,.025,[x,y,z],mat.metal,[Math.PI/2,0,0],6);}
  function armored(p,dim,pos,m=mat.armor,rot=[0,0,0]){const g=group(p,`armor_${n++}`,pos);g.rotation.set(...rot);plate(g,dim,[0,0,0],m);bolts(g,dim[0]*.69,dim[1]*.65,-dim[2]/2-.05);return g;}
  function vent(p,pos,w,h,rot=[0,0,0]){const g=group(p,`vent_${n++}`,pos);g.rotation.set(...rot);plate(g,[w+.12,h+.12,.09],[0,0,0],mat.metal);box(g,[w,h,.05],[0,0,-.06],mat.black);for(let i=0;i<6;i++)box(g,[w*.9,.025,.07],[0,-h*.38+i*h*.15,-.1],mat.frame);return g;}
  function cable(p,pts,r=.05){const curve=new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a)));return mesh(p,new T.TubeGeometry(curve,16,r,6,false),mat.black);}
  const body=group(root,'Body');
  const pelvis=group(body,'Pelvis',[0,3.02,0]);
  cyl(pelvis,.65,.65,.6,[0,.19,0],mat.frame,[0,0,0],24);
  plate(pelvis,[1.85,.58,1.05],[0,-.06,0],mat.frame);
  for(const side of [-1,1]){armored(pelvis,[.82,.63,.35],[side*.63,-.12,-.61],mat.dark,[0,side*-.12,side*.12]);plate(pelvis,[.74,.4,.35],[side*1.05,-.08,.03],mat.armor,[0,0,-side*.25]);}
  plate(pelvis,[.45,.68,.27],[0,-.2,-.67],mat.armor);
  const torso=group(body,'Torso',[0,3.57,0]);
  plate(torso,[2.22,1.5,1.16],[0,.48,0],mat.frame);
  // Sloped breastplates leave an inset, protected cockpit at the centre.
  for(const side of [-1,1]){
    armored(torso,[1.1,1.24,.53],[side*.69,.62,-.63],mat.armor,[-.12,side*.22,-side*.12]);
    plate(torso,[.9,.18,.2],[side*.7,.13,-.98],mat.dark,[0,0,side*.12]);
    plate(torso,[.71,.08,.035],[side*.75,1.03,-.97],mat.light,[0,0,side*.12]);
    vent(torso,[side*.91,.48,.64],.55,.66,[0,Math.PI,0]);
    rod(torso,[side*.7,-.26,.15],[side*1.1,.32,.35],.1,mat.metal);
    plate(torso,[.65,.18,.18],[side*.89,1.25,-.49],mat.orange,[0,0,-side*.13]);
  }
  plate(torso,[.72,.85,.38],[0,.71,-.91],mat.dark);
  plate(torso,[.46,.55,.07],[0,.85,-1.14],mat.glass,[-.15,0,0]);
  box(torso,[.035,.56,.04],[0,.86,-1.2],mat.metal);
  for(let i=0;i<3;i++)plate(torso,[.6-i*.1,.13,.22],[0,-.02-i*.16,-.66],mat.metal);
  // Small recessed optical head and radar mast; no human face.
  const head=group(torso,'SensorHead',[0,1.6,-.06]);
  cyl(head,.3,.38,.27,[0,-.17,0],mat.metal,[0,0,0]);
  plate(head,[1.0,.56,.78],[0,.13,0],mat.dark);
  plate(head,[.82,.21,.1],[0,.14,-.46],mat.black);
  plate(head,[.64,.075,.045],[0,.17,-.52],mat.light);
  plate(head,[1.04,.17,.92],[0,.41,.01],mat.armor,[.04,0,0]);
  cyl(head,.07,.07,.1,[.31,.13,-.53],mat.orange,[Math.PI/2,0,0]);
  rod(head,[.48,.3,.18],[.54,1.04,.25],.018,mat.metal);cyl(head,.035,.035,.05,[.54,1.04,.25],mat.amber,[0,0,0],8);
  const legs=[];
  for(const side of [-1,1]){
    const tag=side<0?'L':'R',hip=group(root,`Hip_${tag}`,[side*.84,2.99,0]);
    cyl(hip,.38,.38,.48,[0,0,0],mat.frame);cyl(hip,.25,.25,.51,[0,0,0],mat.metal);
    const thigh=group(hip,`Thigh_${tag}`);
    plate(thigh,[.63,1.35,.58],[0,-.72,.1],mat.frame);
    armored(thigh,[.88,1.1,.49],[side*.04,-.68,-.3],mat.armor,[-.08,0,side*.055]);
    plate(thigh,[.22,.82,.13],[side*.32,-.61,-.59],mat.orange);
    rod(thigh,[side*.37,-.15,.35],[side*.37,-1.18,.29],.09,mat.metal);
    cyl(thigh,.13,.13,.62,[side*.37,-.51,.33],mat.frame,[0,0,0]);
    const knee=group(thigh,`Knee_${tag}`,[0,-1.42,0]);
    cyl(knee,.28,.28,.98,[0,0,0],mat.frame);cyl(knee,.19,.19,1.02,[0,0,0],mat.metal);
    armored(knee,[.72,.57,.37],[0,0,-.31],mat.dark,[-.15,0,0]);
    plate(knee,[.42,.09,.07],[0,.1,-.54],mat.light);
    const shin=group(knee,`Shin_${tag}`);
    plate(shin,[.58,1.25,.55],[0,-.65,.07],mat.frame);
    armored(shin,[.82,.96,.45],[0,-.69,-.27],mat.armor,[.1,0,0]);
    plate(shin,[.5,.32,.08],[0,-.87,-.55],mat.dark);
    vent(shin,[side*.42,-.63,.07],.28,.5,[0,-side*Math.PI/2,0]);
    rod(shin,[side*.32,-.14,.38],[side*.32,-1.25,.23],.07,mat.metal);
    cyl(shin,.11,.11,.55,[side*.32,-.49,.33],mat.frame,[0,0,0]);
    const ankle=group(shin,`Ankle_${tag}`,[0,-1.37,0]);
    cyl(ankle,.21,.21,.65,[0,0,0],mat.metal);
    const foot=group(ankle,`Foot_${tag}`);
    plate(foot,[1,.22,1.53],[0,-.14,-.25],mat.black);
    armored(foot,[.91,.25,1.18],[0,.03,-.28],mat.dark,[.08,0,0]);
    plate(foot,[.83,.14,.29],[0,-.02,-.95],mat.armor);
    for(let j=0;j<3;j++)box(foot,[.035,.18,.34],[(j-1)*.22,.05,-.88],mat.frame);
    plate(foot,[.76,.065,.1],[0,.09,-1.04],mat.orange);
    legs.push({hip,thigh,knee,shin,ankle,foot,side});
  }
  const arms=[];let weapon,muzzle,recoil;
  for(const side of [-1,1]){
    const tag=side<0?'L':'R';
    const shoulder=group(torso,`Shoulder_${tag}`,[side*1.58,1.04,.08]);
    cyl(shoulder,.37,.37,.5,[0,-.12,0],mat.metal);
    const cap=group(torso,`Pauldron_${tag}`,[side*1.66,1.31,.03]);
    armored(cap,[1.13,.62,1.4],[0,0,0],side>0?mat.orange:mat.armor,[0,0,-side*.14]);
    plate(cap,[.85,.14,1.2],[0,.36,.03],mat.dark,[0,0,-side*.14]);
    plate(cap,[.69,.08,.075],[0,-.13,-.77],mat.light);
    for(let k=0;k<3;k++)plate(cap,[.16,.17,.05],[(k-1)*.22,.06,-.79],mat.frame);
    const upper=group(shoulder,`UpperArm_${tag}`);
    plate(upper,[.48,.83,.51],[0,-.55,0],mat.frame);
    armored(upper,[.62,.77,.54],[side*.1,-.57,-.07],mat.dark);
    cable(upper,[[side*.15,-.1,.3],[side*.39,-.5,.47],[side*.22,-.93,.3]]);
    const elbow=group(upper,`Elbow_${tag}`,[0,-1.03,0]);
    cyl(elbow,.24,.24,.7,[0,0,0],mat.metal);
    const forearm=group(elbow,`Forearm_${tag}`);
    plate(forearm,[.56,.84,.61],[0,-.46,0],mat.frame);
    if(side<0){
      armored(forearm,[.73,1,.38],[-.16,-.51,-.31],mat.armor);
      plate(forearm,[.34,.49,.1],[-.17,-.48,-.58],mat.dark);
      for(let i=0;i<3;i++)plate(forearm,[.23,.035,.025],[-.17,-.35-i*.1,-.66],mat.light);
      const hand=group(forearm,'Manipulator_L',[0,-1,0]);
      plate(hand,[.49,.35,.45],[0,0,0],mat.metal);
      for(let i=0;i<3;i++){plate(hand,[.11,.25,.15],[(i-1)*.16,-.27,-.17],mat.frame);plate(hand,[.11,.15,.22],[(i-1)*.16,-.4,-.23],mat.metal);}
      plate(hand,[.15,.35,.19],[-.32,-.12,.03],mat.metal,[0,0,-.4]);
    }else{
      weapon=group(forearm,'CannonMount',[.02,-.52,-.29]);
      recoil=group(weapon,'CannonRecoil');
      armored(recoil,[.79,.66,1.47],[0,0,-.36],mat.dark);
      plate(recoil,[.59,.15,1.41],[0,.43,-.37],mat.armor);
      cyl(recoil,.19,.24,1.91,[0,0,-1.67],mat.metal,[Math.PI/2,0,0],20);
      for(let i=0;i<5;i++)cyl(recoil,.28,.28,.1,[0,0,-1.12-i*.22],mat.frame,[Math.PI/2,0,0]);
      plate(recoil,[.51,.48,.35],[0,0,-2.66],mat.dark);
      cyl(recoil,.17,.17,.07,[0,0,-2.87],mat.black,[Math.PI/2,0,0]);
      for(const a of [-1,1]){rod(recoil,[a*.33,.14,-.8],[a*.26,.12,-2.49],.048,mat.orange);plate(recoil,[.06,.06,1.0],[a*.31,.31,-1.27],mat.light);}
      for(let i=0;i<4;i++)box(recoil,[.83,.06,.085],[0,-.26,-.2-i*.23],mat.metal);
      plate(recoil,[.23,.25,.51],[0,.57,-.45],mat.frame);
      plate(recoil,[.15,.1,.04],[0,.58,-.74],mat.light);
      muzzle=group(recoil,'MuzzleSocket',[0,0,-2.91]);
    }
    arms.push({shoulder,upper,elbow,forearm,side});
  }
  const jets=[];
  // Twin propulsion packs, propellant lines, cooling fins and attitude jets.
  for(const side of [-1,1]){
    const pack=group(torso,`ThrusterPack_${side<0?'L':'R'}`,[side*.81,.66,.99]);
    armored(pack,[.78,1.55,.69],[0,0,0],mat.dark);
    plate(pack,[.61,.38,.2],[0,.43,.43],mat.orange,[0,Math.PI,0]);
    for(let i=0;i<5;i++)plate(pack,[.61,.045,.15],[0,.18-i*.15,.42],mat.metal);
    cyl(pack,.27,.37,.51,[0,-.92,.05],mat.metal,[0,0,0]);
    cyl(pack,.21,.21,.04,[0,-1.2,.05],mat.black,[0,0,0]);
    cyl(pack,.13,.13,.055,[0,-1.23,.05],mat.light,[0,0,0]);
    const jet=group(pack,`ExhaustSocket_${side<0?'L':'R'}`,[0,-1.25,.05]);jets.push(jet);
    cable(torso,[[side*.64,-.3,.43],[side*1.21,-.32,.92],[side*1.2,.25,1.05]],.07);
  }
  // Shoulder missile/sensor pod; deliberately asymmetric to the cannon.
  const pod=group(torso,'SurveyPod',[-1.05,1.88,.64]);
  plate(pod,[.64,.57,.9],[0,0,0],mat.dark,[.15,0,0]);
  for(const x of [-.16,.16])for(const y of [-.13,.13]){cyl(pod,.105,.105,.13,[x,y,-.5],mat.metal,[Math.PI/2,0,0],12);cyl(pod,.065,.065,.14,[x,y,-.52],mat.black,[Math.PI/2,0,0],12);}
  // Identification bars and 09 markings are geometry, so they survive export.
  const label=group(torso,'UnitMark',[-.69,.65,-.96]);label.rotation.y=-.22;
  const segments=[[0,.14,.16,.028],[.09,.075,.028,.11],[.09,-.075,.028,.11],[0,-.14,.16,.028],[-.09,-.075,.028,.11],[-.09,.075,.028,.11],[0,0,.16,.028]];
  for(let digit=0;digit<2;digit++)segments.forEach(([x,y,w,h],i)=>{if((digit===0&&i!==6)||(digit===1&&i!==4))box(label,[w,h,.012],[x+(digit-.5)*.26,y,-.035],mat.frame);});
  // Secondary engineering detail: separate fasteners, access panels and edge lips.
  for(const side of [-1,1]){
    const chestDetail=group(torso,`ChestAccess_${side}`,[side*.69,.62,-.63]);
    chestDetail.rotation.set(-.12,side*.22,-side*.12);
    plate(chestDetail,[.52,.31,.023],[0,-.23,-.306],mat.dark);
    plate(chestDetail,[.39,.16,.025],[0,-.23,-.326],mat.frame);
    for(let j=0;j<3;j++)box(chestDetail,[.26,.016,.024],[0,-.18-j*.052,-.347],mat.metal);
    box(chestDetail,[.018,.63,.014],[side*.38,.06,-.315],mat.frame);
    box(chestDetail,[.52,.018,.014],[0,.4,-.315],mat.frame);
    // Weathered exposed lips catch the key light instead of relying on a flat outline.
    plate(chestDetail,[.67,.025,.024],[0,.57,-.29],mat.metal);
    for(let j=0;j<4;j++)box(chestDetail,[.04,.14,.012],[(j-1.5)*.07,-.47,-.32],j%2?mat.orange:mat.frame,[0,0,-.35]);
    rod(torso,[side*.28,1.11,.27],[side*.39,1.62,.24],.055,mat.metal);
    cable(torso,[[side*.43,1.15,.15],[side*.65,1.41,.18],[side*.43,1.64,.16]],.035);
    for(let j=0;j<3;j++)plate(torso,[.2,.075,.09],[side*1.19,.69-j*.15,-.53],mat.metal,[0,0,side*.2]);
    rod(pelvis,[side*.4,.12,.32],[side*.88,-.41,.31],.055,mat.metal);
    cable(pelvis,[[side*.35,-.1,-.21],[side*.71,-.38,-.1],[side*.91,-.3,.05]],.045);
  }
  for(const l of legs){
    const side=l.side;
    // Radial fasteners and concentric joint faces sit outside each knee.
    cyl(l.knee,.24,.24,.035,[side*.531,0,0],mat.frame);
    cyl(l.knee,.13,.13,.04,[side*.555,0,0],mat.orange);
    cyl(l.knee,.075,.075,.044,[side*.577,0,0],mat.metal);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;cyl(l.knee,.024,.024,.04,[side*.555,Math.sin(a)*.205,Math.cos(a)*.205],mat.metal,[0,0,Math.PI/2],6);}
    const kneeDetail=group(l.knee,'KneeCoverDetail_'+side,[0,0,-.52]);kneeDetail.rotation.x=-.15;
    box(kneeDetail,[.018,.25,.012],[-.22,-.05,-.04],mat.metal);box(kneeDetail,[.018,.25,.012],[.22,-.05,-.04],mat.metal);
    plate(l.thigh,[.36,.31,.035],[0,-.82,-.575],mat.dark,[-.08,0,side*.055]);
    for(let j=0;j<4;j++)box(l.shin,[.43,.022,.022],[0,-.46+j*.105,-.528],mat.frame);
    plate(l.shin,[.033,.62,.022],[-side*.27,-.62,-.516],mat.metal);
    cable(l.shin,[[side*.2,-.2,.35],[side*.42,-.58,.47],[side*.19,-1.21,.28]],.038);
    for(let j=0;j<3;j++)plate(l.foot,[.09,.06,.28],[(j-1)*.23,.17,-.77],mat.metal);
  }
  // Longer lower body, compact sensor head: expedition-machine proportions.
  head.scale.setScalar(.83);
  const legRise=.61;
  torso.position.y+=legRise;pelvis.position.y+=legRise;
  for(const l of legs)l.hip.position.y+=legRise;
  const rig={root,body,torso,head,pelvis,legs,arms,weapon,recoil,muzzle,jets,materials:mat};
  poseMech(rig,0,{speed:0});
  return rig;
}

export function poseMech(rig,t,{speed=0,run=false,aim=0,recoil=0,damage=0,footHeights=[0,0]}={}){
  const stride=run?.83:.55, lift=run?.34:.19;
  rig.body.position.y=Math.sin(t*2)*.025*speed;
  rig.torso.rotation.x=.035*speed+(run?.035*speed:0)+damage*.07;
  rig.torso.rotation.z=Math.sin(t)*.025*speed;
  rig.head.rotation.y=Math.sin(t)*.025*(1-speed);
  rig.legs.forEach((l,i)=>{
    const phase=t+(i?Math.PI:0),s=Math.sin(phase);
    const z=s*stride*speed;
    const y=-3.27+Math.max(0,Math.cos(phase))*lift*speed+T.MathUtils.clamp(footHeights[i],-.25,.25);
    const a=1.75,b=1.65,d=T.MathUtils.clamp(Math.hypot(y,z),.4,a+b-.015);
    l.thigh.rotation.x=Math.atan2(-z,-y)-Math.acos(T.MathUtils.clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
    l.knee.rotation.x=Math.PI-Math.acos(T.MathUtils.clamp((a*a+b*b-d*d)/(2*a*b),-1,1));
    l.ankle.rotation.x=-l.thigh.rotation.x-l.knee.rotation.x;
    l.hip.rotation.z=Math.sin(phase)*.018*speed;
  });
  rig.arms.forEach(a=>{a.upper.rotation.x=a.side<0?Math.sin(t)*.18*speed:-.06+aim*.4;a.upper.rotation.z=-a.side*.06;a.elbow.rotation.x=a.side<0?-.12:-.22;});
  rig.weapon.rotation.x=aim*.6+.28;
  rig.recoil.position.z=recoil*.22;
  rig.torso.rotation.x+=recoil*.025;
}

// Merge fixed geometry within each moving joint to keep GPU submissions bounded.
export function optimizeRigidMeshes(root){
 const moving=new Set(['EV01','Body','Pelvis','Torso','SensorHead','SurveyPod','CannonMount','CannonRecoil','MuzzleSocket','Manipulator_L']);
 root.traverse(o=>{if(/^(Hip|Thigh|Knee|Shin|Ankle|Foot|Shoulder|UpperArm|Elbow|Forearm|ExhaustSocket)_/.test(o.name))moving.add(o.name);});
 function process(node){
   const batches=new Map(),remove=[];node.updateWorldMatrix(true,true);const inv=node.matrixWorld.clone().invert();
   function walk(o){if(o!==node&&moving.has(o.name)){process(o);return;}if(o.isMesh){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));const id=o.material.uuid;if(!batches.has(id))batches.set(id,{mat:o.material,geos:[]});batches.get(id).geos.push(geo);remove.push(o);}for(const ch of [...o.children])walk(ch);}
   for(const ch of [...node.children])walk(ch);
   remove.forEach(o=>o.removeFromParent());
   for(const {mat,geos} of batches.values()){const g=mergeGeometries(geos,false);if(!g)throw Error('Rigid merge failed');const m=new T.Mesh(g,mat);m.name=node.name+'_'+mat.name.replaceAll(' ','_');m.castShadow=m.receiveShadow=true;node.add(m);geos.forEach(g=>g.dispose());}
 }
 process(root);
 root.traverse(o=>{const scale=o.name.startsWith('Thigh_')?1.75/1.42:o.name.startsWith('Shin_')?1.65/1.37:1;if(o.isGroup&&scale!==1){for(const child of o.children){if(child.isMesh)child.geometry.scale(1,scale,1);else if(/^(Knee|Ankle)_/.test(child.name))child.position.y*=scale;}}});
 return root;
}
