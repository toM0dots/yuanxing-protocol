import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {loadGameModel} from './exo-asset-loader.mjs?v=20261110-hero8';

// Hand-dressed hero rooms. The props are Blender models (tools/build-interior-props.py)
// placed by hand, one composition per room, instead of the procedural kit. Every
// placement stays inside the room's free corners and wall bands: doors, the
// circulation lane, interaction nodes and existing story props remain clear, and
// none of these objects collide, matching the existing room dressing.

const FABRIC=new Set(['WornFabric','Blanket']);
export async function loadInteriorProps(){
 const gltf=await loadGameModel(new URL('./assets/interior-props-v1/interior-props.glb',import.meta.url).href);
 const root=gltf.scene;root.updateMatrixWorld(true);
 const props=new Map(),materials=new Map();
 root.traverse(o=>{
  if(!o.name.startsWith('Prop_'))return;
  const name=o.name.slice(5),parts=[],anchors={};
  const inverse=o.matrixWorld.clone().invert();
  o.traverse(c=>{
   if(c.isMesh){
    const source=c.material;let m=materials.get(source.name);
    if(!m){
     m=source.clone();m.dithering=true;m.envMapIntensity=.45;
     if(FABRIC.has(m.name)){m.side=T.DoubleSide;m.envMapIntensity=.15;}
     if(m.name==='AmberGlow'){m.emissiveIntensity=3.2;m.toneMapped=false;}
     materials.set(m.name,m);
    }
    parts.push({geometry:c.geometry,material:m,matrix:inverse.clone().multiply(c.matrixWorld)});
   }else if(c!==o&&c.name.startsWith(name+'_'))anchors[c.name.slice(name.length+1)]=new T.Vector3().setFromMatrixPosition(inverse.clone().multiply(c.matrixWorld));
  });
  props.set(name,{name,parts,anchors});
 });
 return {props,materials,dispose(){for(const m of materials.values())m.dispose();for(const p of props.values())for(const part of p.parts)part.geometry.dispose();}};
}

// Hand-painted signs: dark stencil letters on worn ochre enamel.
function paintSign(title,note,seed=1){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');if(!g)return null;
 let s=seed;const rnd=()=>((s=(s*16807)%2147483647)/2147483647);
 g.fillStyle='#b49058';g.fillRect(0,0,1024,512);
 for(let i=0;i<70;i++){g.fillStyle=`rgba(${60+rnd()*40|0},${45+rnd()*30|0},${25+rnd()*20|0},${.05+rnd()*.12})`;g.beginPath();g.ellipse(rnd()*1024,rnd()*512,20+rnd()*140,10+rnd()*60,rnd()*3,0,7);g.fill();}
 g.fillStyle='#1d1b17';g.font='800 150px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(title,512,215,930);
 g.font='600 46px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';g.fillStyle='#2b2720';g.fillText(note,512,385,900);
 g.fillRect(70,300,884,6);
 // Paint chipped away to bare metal, rust runs from the bolts, scratches.
 g.globalCompositeOperation='source-over';
 for(let i=0;i<55;i++){const x=rnd()*1024,y=rnd()*512,r=2+rnd()*rnd()*26;g.fillStyle=rnd()<.6?'#6d6a60':'#8a8576';g.beginPath();for(let k=0;k<7;k++){const a=k/7*Math.PI*2,rr=r*(.5+rnd());k?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.fill();}
 for(const [x,y] of [[42,48],[982,48],[42,464],[982,464]]){const grd=g.createLinearGradient(x,y,x,y+160);grd.addColorStop(0,'rgba(92,48,20,.55)');grd.addColorStop(1,'rgba(92,48,20,0)');g.fillStyle=grd;g.fillRect(x-7,y,14+rnd()*8,150+rnd()*60);}
 g.strokeStyle='rgba(230,220,195,.35)';g.lineWidth=1.4;for(let i=0;i<30;i++){const x=rnd()*1024,y=rnd()*512,l=30+rnd()*160,a=rnd()*.6-.3;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
 // The Blender face plane's V runs top-to-bottom once exported to glTF.
 t.repeat.set(1,-1);t.offset.set(0,1);return t;
}

// Offsets are from the room centre in game units (x east, y south on the deck
// plane); yaw turns the model's front (+Z) into the room. h lifts it off the floor.
const W=Math.PI/2,N=0,S=Math.PI,E=-Math.PI/2;
const DRESSING={
 // B1 entrance: the evacuation check-in hall. Families waited out the night in
 // the south-west corner by a lamp; a grow light still burns in the south-east.
 'k09-hero-hangar:0:0':{
  size:[1160,1040],ceiling:{gain:.48,color:0xa9bcc8},
  signs:[{title:'撤离登记处',note:'按顺序登记 · 别离开有灯的地方',seed:7}],
  place:[
   // Two rows of cots with their heads to the south wall, a gap left clear in
   // front of the surface lift. Some were slept in; two were left made up.
   ['cot',-410,400,W],['blanket',-410,400,W],['boots',-410,262,1.7],
   ['cot',-290,400,W],['blanket',-290,400,E],['bottle',-232,300,0],
   ['cot',-170,400,W],
   ['cot',170,400,W],['blanket',170,400,E],['boots',232,282,-.4],['bottle',112,292,0],
   ['cot',290,400,W],['blanket',290,400,W],
   ['cot',410,400,W],['bowl',352,294,0],
   // The family camp by the west wall: a lamp on a spare cell, water boiled for tea.
   ['curtain',-556,150,W],
   ['battery_case',-525,320,W],['lamp',-530,318,W+.5,36],
   ['kettle',-470,270,.6],['bowl',-500,232,0],['bottle',-462,214,0],
   // Check-in wall: sign, the key rack with two keys gone, a stool, a toolbox.
   ['sign',80,-496,N,188],['key_rack',232,-496,N,122],
   ['stool',150,-420,.35],['toolbox',268,-462,-.25],
   // Someone kept seedlings alive under a lamp on the east wall.
   ['battery_case',530,330,E],['plant_tray',530,330,E+.12,35.6],['lamp',500,255,E-.8]
  ]
 },
 // B1 hydraulic workshop: Lao Lin works and sleeps here. Bench under the only
 // warm lamp, his cot behind a curtain, spare cells and seedlings by the wall.
 'k09-hero-hangar:0:5':{
  size:[1000,960],ceiling:{gain:.5,color:0xa4b8c4},
  signs:[{title:'液压维修间',note:'工具用完放回原处 —— 老林',seed:23}],
  place:[
   ['workbench',0,420,S],['toolbox',-62,418,S+.2,88],['lamp',34,428,S-.45,88],['kettle',-4,408,S+.9,88],['bowl',-24,402,0,88],
   ['stool',-22,330,.55],
   ['cot',330,425,N],['blanket',330,425,N],['curtain',480,350,E],
   ['boots',160,430,1.25],['bottle',176,372,0],
   ['sign',70,-454,N,196],['key_rack',212,-455,N,128],
   ['battery_case',-60,-430,N],['battery_case',-60,-430,N+.14,34.4],['plant_tray',-58,-430,N-.08,69]
  ]
 }
};
export function dressingFor(structureId,level,roomId){return DRESSING[structureId+':'+level+':'+roomId]||null;}

// Furniture the mech cannot walk through, and small things it can knock about.
const SOLID={cot:{w:190,d:72,h:46,material:'metal'},workbench:{w:180,d:72,h:120,material:'wood'},battery_case:{w:58,d:38,h:36,material:'metal'}};
const LOOSE={
 bottle:{r:5,mass:.45,sound:'ceramic',tip:1.5,lift:4.2,friction:2.2},
 bowl:{r:9,mass:.55,sound:'ceramic',friction:3.2},
 kettle:{r:12,mass:.9,sound:'clatter',tip:1.35,lift:9,friction:3.4},
 boots:{r:17,mass:1,sound:'fabric',friction:4.5},
 stool:{r:18,mass:1.3,sound:'clatter',tip:1.42,lift:16,friction:3.8},
 toolbox:{r:24,mass:2.4,sound:'clatter',friction:5.5}
};
const UP=new T.Vector3(0,1,0);
function footprint(def,yaw){const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));return {w:def.w*c+def.d*s,d:def.w*s+def.d*c};}

export function dressRooms(kit,active,chunks,fixtures){
 const result={meshes:[],loose:[],solids:[],update(){}};
 if(!kit)return result;
 for(const chunk of chunks){
  const r=chunk.userData.room,plan=dressingFor(active.structure.id,active.level,r.id);
  if(!plan||Math.abs(r.w-plan.size[0])>2||Math.abs(r.d-plan.size[1])>2)continue;
  const buckets=new Map(),signs=[];let signIndex=0;
  for(const [name,dx,dy,yaw,h=0] of plan.place){
   const prop=kit.props.get(name);if(!prop)continue;
   const x=r.x+dx,z=r.y+dy;
   if(SOLID[name]){const f=footprint(SOLID[name],yaw);result.solids.push({x,y:z,w:f.w,d:f.d,h:h+SOLID[name].h,material:SOLID[name].material,room:r.id,dressing:name});}
   if(LOOSE[name]&&h===0){
    // A loose object keeps its own transform so it can be pushed and tipped.
    const group=new T.Group();group.name='Loose prop / '+name;
    for(const part of prop.parts){const m=new T.Mesh(part.geometry.clone().applyMatrix4(part.matrix),part.material);m.castShadow=true;m.receiveShadow=true;m.userData.cameraIgnore=true;group.add(m);}
    group.position.set(x,0,z);group.rotation.y=yaw;chunk.add(group);result.meshes.push(group);
    result.loose.push({name,def:LOOSE[name],group,room:r,x,z,vx:0,vz:0,yaw,spin:0,tilt:0,target:0,axis:new T.Vector3(1,0,0),heard:0,rest:true});
    continue;
   }
   const placement=new T.Matrix4().compose(new T.Vector3(x,h,z),new T.Quaternion().setFromAxisAngle(UP,yaw),new T.Vector3(1,1,1));
   for(const part of prop.parts){
    const g=part.geometry.clone().applyMatrix4(placement.clone().multiply(part.matrix));
    if(part.material.name==='SignFace'){signs.push({g,spec:plan.signs[signIndex++]||plan.signs[0]});continue;}
    g.deleteAttribute('uv');for(const k of Object.keys(g.attributes))if(!['position','normal','color'].includes(k))g.deleteAttribute(k);
    const key=part.material.name;if(!buckets.has(key))buckets.set(key,{material:part.material,list:[]});buckets.get(key).list.push(g);
   }
   if(name==='lamp'&&prop.anchors.Light){
    // The bulb becomes a warm practical light. It is lifted above the bulb so a
    // lamp on a bench lights the room around it instead of flaring the bench top.
    const p=prop.anchors.Light.clone().applyMatrix4(placement);
    fixtures.push({x:p.x,y:p.y+120,z:p.z,room:r.id,color:0xffa65a,gain:.42,practical:true});
   }
  }
  for(const {material,list} of buckets.values()){
   const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());if(!geometry)continue;
   const mesh=new T.Mesh(geometry,material);mesh.name='Hand-dressed props / '+r.name+' / '+material.name;mesh.castShadow=material.name!=='AmberGlow';mesh.receiveShadow=true;mesh.userData.cameraIgnore=true;chunk.add(mesh);result.meshes.push(mesh);
  }
  for(const {g,spec} of signs){
   const map=paintSign(spec.title,spec.note,spec.seed);const m=new T.MeshStandardMaterial({name:'Painted sign / '+spec.title,map,roughness:.78,metalness:.12,color:map?0xffffff:0xb49058});
   const mesh=new T.Mesh(g,m);mesh.name='Painted sign / '+spec.title;mesh.receiveShadow=true;mesh.userData.cameraIgnore=true;mesh.userData.ownsMaterial=true;chunk.add(mesh);result.meshes.push(mesh);
  }
  // Cool, dimmer ceiling fixtures so the practical lamps carry the room.
  for(const f of fixtures)if(f.room===r.id&&!f.practical){f.color=plan.ceiling.color;f.gain=plan.ceiling.gain;}
 }
 (typeof ExoFacilities!=='undefined'?ExoFacilities:null)?.setDressing?.(active.id,result.solids);
 if(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('profile'))globalThis.__exoDressing=result;
 let clock=0;
 const sound=(kind,strength,x,z)=>{try{(typeof ExoAmbience!=='undefined'?ExoAmbience:null)?.contact?.(kind,strength,x,z);}catch{}};
 const yawQ=new T.Quaternion(),tiltQ=new T.Quaternion();
 result.update=(u)=>{
  const now=performance.now(),dt=clock?Math.min(.05,(now-clock)/1000):0;clock=now;if(!dt||!result.loose.length)return;
  const mvx=u.vx||0,mvy=u.vy||0;
  for(const L of result.loose){
   const d0=L.def;
   if(L.rest&&Math.hypot(L.x-u.x,L.z-u.y)>d0.r+260)continue;
   // EV-04 shoves whatever is at its feet; heavier things slow it a little.
   const dx=L.x-u.x,dz=L.z-u.y,dist=Math.hypot(dx,dz),reach=d0.r+30;
   if(dist<reach){
    const nx=dist?dx/dist:Math.sin(L.yaw),nz=dist?dz/dist:Math.cos(L.yaw),toward=mvx*nx+mvy*nz;
    L.x=u.x+nx*reach;L.z=u.y+nz*reach;
    if(toward>4){
     const kick=toward*1.35/d0.mass;L.vx+=nx*kick+mvx*.2/d0.mass;L.vz+=nz*kick+mvy*.2/d0.mass;
     L.spin+=(Math.random()-.5)*toward*.09/d0.mass+(mvx*nz-mvy*nx)*.004;
     const slow=Math.min(.35,.05*d0.mass);u.vx=mvx*(1-slow);u.vy=mvy*(1-slow);
     if(now-L.heard>200&&toward>14){L.heard=now;sound(d0.sound,Math.min(1,(toward-10)/150),L.x,L.z);}
     if(d0.tip&&!L.target&&toward>55/d0.mass){L.target=d0.tip;L.axis.set(nz,0,-nx).normalize();setTimeout(()=>sound(d0.sound==='ceramic'?'ceramic':'clatter',.55,L.x,L.z),140);}
    }
    L.rest=false;
   }
   // Slide, spin and settle.
   L.x+=L.vx*dt;L.z+=L.vz*dt;L.yaw+=L.spin*dt;
   const f=Math.exp(-dt*d0.friction*(L.target?.7:1));L.vx*=f;L.vz*=f;L.spin*=Math.exp(-dt*3.2);
   // Room walls: a dull knock and a weak rebound.
   const rm=L.room,bx=rm.w/2-26-d0.r,bz=rm.d/2-26-d0.r;
   for(const [key,vel,c,b] of [['x','vx',rm.x,bx],['z','vz',rm.y,bz]]){const o=L[key]-c;if(Math.abs(o)>b){L[key]=c+Math.sign(o)*b;const sp=Math.abs(L[vel]);L[vel]*=-.35;if(sp>40&&now-L.heard>150){L.heard=now;sound('metal',Math.min(.6,sp/400),L.x,L.z);}}}
   // Furniture and other loose things.
   for(const b of result.solids){if(b.room!==rm.id)continue;const ox=L.x-b.x,oz=L.z-b.y,hx=b.w/2+d0.r,hz=b.d/2+d0.r;if(Math.abs(ox)<hx&&Math.abs(oz)<hz){if(hx-Math.abs(ox)<hz-Math.abs(oz)){L.x=b.x+Math.sign(ox||1)*hx;L.vx*=-.3;}else{L.z=b.y+Math.sign(oz||1)*hz;L.vz*=-.3;}const sp=Math.hypot(L.vx,L.vz);if(sp>25&&now-L.heard>150){L.heard=now;sound(b.material,Math.min(.5,sp/300),L.x,L.z);}}}
   for(const M of result.loose){if(M===L||M.room!==rm)continue;const ox=L.x-M.x,oz=L.z-M.z,dd=Math.hypot(ox,oz),min=d0.r+M.def.r;if(dd<min&&dd>.01){const push=(min-dd)/2,nx=ox/dd,nz=oz/dd;L.x+=nx*push;L.z+=nz*push;M.x-=nx*push;M.z-=nz*push;const rel=(L.vx-M.vx)*nx+(L.vz-M.vz)*nz;if(rel<0){const share=rel*.8;L.vx-=share*nx*M.def.mass/(d0.mass+M.def.mass);L.vz-=share*nz*M.def.mass/(d0.mass+M.def.mass);M.vx+=share*nx*d0.mass/(d0.mass+M.def.mass);M.vz+=share*nz*d0.mass/(d0.mass+M.def.mass);M.rest=false;if(-rel>20&&now-L.heard>150){L.heard=now;sound(d0.sound,Math.min(.6,-rel/200),L.x,L.z);}}}}
   // Tipping over pivots near the base, then lies on its side.
   L.tilt+=(L.target-L.tilt)*Math.min(1,dt*(L.target>L.tilt?7:3));
   yawQ.setFromAxisAngle(UP,L.yaw);tiltQ.setFromAxisAngle(L.axis,L.tilt);L.group.quaternion.copy(tiltQ).multiply(yawQ);
   L.group.position.set(L.x,(d0.lift||0)*Math.sin(Math.min(L.tilt,Math.PI/2))*.9,L.z);
   if(Math.hypot(L.vx,L.vz)<.5&&Math.abs(L.spin)<.02&&Math.abs(L.target-L.tilt)<.01){L.vx=L.vz=L.spin=0;L.rest=true;}
  }
 };
 return result;
}
