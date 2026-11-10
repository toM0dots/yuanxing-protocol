import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {loadGameModel} from './exo-asset-loader.mjs?v=20261107-loading90';

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

export function dressRooms(kit,active,chunks,fixtures){
 if(!kit)return [];
 const made=[];
 for(const chunk of chunks){
  const r=chunk.userData.room,plan=dressingFor(active.structure.id,active.level,r.id);
  if(!plan||Math.abs(r.w-plan.size[0])>2||Math.abs(r.d-plan.size[1])>2)continue;
  const buckets=new Map(),signs=[];let signIndex=0;
  for(const [name,dx,dy,yaw,h=0] of plan.place){
   const prop=kit.props.get(name);if(!prop)continue;
   const placement=new T.Matrix4().compose(new T.Vector3(r.x+dx,h,r.y+dy),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),new T.Vector3(1,1,1));
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
   const mesh=new T.Mesh(geometry,material);mesh.name='Hand-dressed props / '+r.name+' / '+material.name;mesh.castShadow=material.name!=='AmberGlow';mesh.receiveShadow=true;mesh.userData.cameraIgnore=true;chunk.add(mesh);made.push(mesh);
  }
  for(const {g,spec} of signs){
   const map=paintSign(spec.title,spec.note,spec.seed);const m=new T.MeshStandardMaterial({name:'Painted sign / '+spec.title,map,roughness:.78,metalness:.12,color:map?0xffffff:0xb49058});
   const mesh=new T.Mesh(g,m);mesh.name='Painted sign / '+spec.title;mesh.receiveShadow=true;mesh.userData.cameraIgnore=true;mesh.userData.ownsMaterial=true;chunk.add(mesh);made.push(mesh);
  }
  // Cool, dimmer ceiling fixtures so the practical lamps carry the room.
  for(const f of fixtures)if(f.room===r.id&&!f.practical){f.color=plan.ceiling.color;f.gain=plan.ceiling.gain;}
 }
 return made;
}
