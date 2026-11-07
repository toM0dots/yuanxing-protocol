import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=59';
import {exteriorDetailKit,EXTERIOR,weatherExteriorMaterial} from './exo-exterior-kit.mjs?v=20261106-exterior86';

// Authored shapes from the approved region references. Coordinates are world units,
// with a 120–150 unit mech; all geometry is opaque and merged by shared material.
export const REGION_LANDMARK_NAMES=[
 '最后的救援舱','蓝晶斗轮采掘机','断裂的记忆环','峡谷温室与悬挂住宅',
 '折断的天线阵列','玄武岩矿务站','深井吊笼与钻机','群峰射电观测阵列'
];
const PAINT=0,METAL=1,DARK=2,GLASS=3,GLOW=4,NATURAL=5;
const C={...EXTERIOR,blue:0x6f969b,stone:0x9c9b8c};
const Y=new T.Vector3(0,1,0);

function materialFamily(maps){
 const p=new T.MeshStandardMaterial({name:'Regional painted equipment',vertexColors:true,metalness:.28,roughness:.91,envMapIntensity:.5});
 const m=new T.MeshStandardMaterial({name:'Regional weathered steel',vertexColors:true,metalness:.64,roughness:.88,envMapIntensity:.6});
 const d=new T.MeshStandardMaterial({name:'Regional recesses',vertexColors:true,metalness:.3,roughness:.94});
 for(const [mat,prefix,strength] of [[p,'panel',.28],[m,'metal',.48]]){
  mat.map=maps[prefix+'-color']||null;mat.normalMap=maps[prefix+'-normal']||null;mat.roughnessMap=maps[prefix+'-rough']||mat.normalMap;mat.normalScale.set(strength,strength);
  if(mat.map){mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','vec4 weatheredScan=texture2D(map,vMapUv);float pigment=dot(weatheredScan.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=clamp(.62+pigment*1.18,.62,1.12);');};mat.customProgramCacheKey=()=> 'regional-weathered-panels-v52';}
  mat.userData.minimumRoughness=.58;applyPackedPBR(mat);weatherExteriorMaterial(mat);
 }
 const glass=new T.MeshStandardMaterial({name:'Regional aged pressure glazing',vertexColors:true,metalness:.34,roughness:.30,envMapIntensity:1.25});
 weatherExteriorMaterial(glass,{glass:true});
 const glow=new T.MeshBasicMaterial({name:'Regional lamps',vertexColors:true,toneMapped:false});
 const natural=new T.MeshStandardMaterial({name:'Regional stone and living growth',vertexColors:true,roughness:1,metalness:0,map:maps['rock-diff']||null});
 return [p,m,d,glass,glow,natural];
}

function kit(materials,placement){
 const bins=Array.from({length:6},()=>[]),solids=[],bounds=[];
 function add(g,p=[0,0,0],scale=[1,1,1],color=C.ivory,kind=PAINT,rotation=[0,0,0]){
  if(g.index){const source=g;g=g.toNonIndexed();source.dispose();}
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale)));
  const pos=g.attributes.position,n=g.attributes.normal,col=new Float32Array(pos.count*3),uv=new Float32Array(pos.count*2),c=new T.Color(color);
  for(let i=0;i<pos.count;i++){
   col.set([c.r,c.g,c.b],i*3);
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   uv[i*2]=(ny>=nx&&ny>=nz?pos.getX(i):nx>nz?pos.getZ(i):pos.getX(i))/75;
   uv[i*2+1]=(ny>=nx&&ny>=nz?pos.getZ(i):pos.getY(i))/75;
  }
  g.setAttribute('color',new T.BufferAttribute(col,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));bins[kind].push(g);
 }
 const detail=exteriorDetailKit((g,p,s,c,r,k)=>add(g,p,s,c,k,r),{paint:PAINT,metal:METAL,dark:DARK,glass:GLASS,light:GLOW,leaf:PAINT});
 function solid(p,s){if(s[1]<16)return;solids.push({region:placement.region,x:placement.x+p[0],y:placement.y+p[2],z:placement.z+p[1]-s[1]/2,w:s[0],d:s[2],h:s[1]});}
 function box(p,s,color=C.ivory,kind=PAINT,rotation=[0,0,0],collision=false){add(new T.BoxGeometry(1,1,1),p,s,color,kind,rotation);if(collision){const m=new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)).elements;solid(p,[Math.abs(m[0])*s[0]+Math.abs(m[4])*s[1]+Math.abs(m[8])*s[2],Math.abs(m[1])*s[0]+Math.abs(m[5])*s[1]+Math.abs(m[9])*s[2],Math.abs(m[2])*s[0]+Math.abs(m[6])*s[1]+Math.abs(m[10])*s[2]]);}}
 function cylinder(p,r,h,color=C.steel,kind=METAL,rotation=[0,0,0],collision=false,segments=16,top=r){add(new T.CylinderGeometry(top,r,h,segments),p,[1,1,1],color,kind,rotation);if(collision)solid(p,[r*2,h,r*2]);}
 function beam(a,b,r=5,color=C.steel,kind=METAL){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(Y,B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,[0,0,0],[1,1,1],color,kind);}
 function torus(p,r,t,color=C.steel,kind=METAL,rotation=[0,0,0],arc=Math.PI*2){add(new T.TorusGeometry(r,t,6,48,arc),p,[1,1,1],color,kind,rotation);}
 function panel(p,s,color=C.ivory,rotation=[0,0,0]){box(p,s,color,PAINT,rotation);const a=rotation[1],front=[Math.sin(a),Math.cos(a)];for(const side of [-1,1]){const x=p[0]+side*s[0]*.43*Math.cos(a)+front[0]*(s[2]/2+1),z=p[2]-side*s[0]*.43*Math.sin(a)+front[1]*(s[2]/2+1);box([x,p[1],z],[3,s[1]*.85,3],C.dark,DARK);} }
 function truss(a,b,width=24,color=C.rust){const A=new T.Vector3(...a),B=new T.Vector3(...b),delta=B.clone().sub(A),side=new T.Vector3(-delta.z,0,delta.x).normalize().multiplyScalar(width/2),n=Math.max(2,Math.ceil(delta.length()/75));for(const s of [-1,1])beam(A.clone().addScaledVector(side,s).toArray(),B.clone().addScaledVector(side,s).toArray(),5,color);for(let i=0;i<n;i++){const p=A.clone().lerp(B,i/n),q=A.clone().lerp(B,(i+1)/n);beam(p.addScaledVector(side,i%2?1:-1).toArray(),q.addScaledVector(side,i%2?-1:1).toArray(),3,C.steel);}}
 function rail(a,b,height=23){const A=new T.Vector3(...a),B=new T.Vector3(...b),n=Math.ceil(A.distanceTo(B)/48);for(let i=0;i<=n;i++){const p=A.clone().lerp(B,i/n);beam(p.toArray(),p.clone().add(new T.Vector3(0,height,0)).toArray(),1.8,C.rust);}for(const h of [height*.45,height])beam(A.clone().add(new T.Vector3(0,h,0)).toArray(),B.clone().add(new T.Vector3(0,h,0)).toArray(),1.8,C.rust);}
 function lamp(x,y,z,color=C.green){cylinder([x,y+9,z],5,18,C.dark,DARK);cylinder([x,y+23,z],5.2,13,color,GLOW);for(const h of [16,30])cylinder([x,y+h,z],7,3,C.steel,METAL);for(let i=0;i<4;i++){const a=i*Math.PI/2;beam([x+6*Math.cos(a),y+16,z+6*Math.sin(a)],[x+6*Math.cos(a),y+30,z+6*Math.sin(a)],.7,C.steel);}}
 function crate(x,y,z,size=30){box([x,y+size*.4,z],[size,size*.8,size*.7],C.dark,DARK);for(const side of [-1,1]){panel([x,y+size*.4,z+side*size*.36],[size*.9,size*.65,2],C.ivory);box([x+side*size*.33,y+size*.4,z],[3,size*.85,size*.76],C.steel,METAL);}box([x,y+size*.85,z],[size*.35,3,5],C.steel,METAL);}
 function room(x,z,w,d,h,color=C.ivory){
  solid([x,h/2,z],[w,h,d]);detail.module([x,0,z],w,d,h,{color,warm:true,seed:Math.round(Math.abs(x+z))%3});
 }

 function stone(p,s,color=C.stone,seed=1){const g=new T.IcosahedronGeometry(1,1),v=g.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),q=1+.12*Math.sin(x*9+z*5+seed)*Math.cos(y*8-seed);v.setXYZ(i,x*q,y*q,z*q);}g.computeVertexNormals();add(g,p,s,color,NATURAL);}
 function greenery(p,size,seed=1){for(let i=0;i<3;i++)detail.ivy([p[0]+(i-1)*size*.35,p[1]+size*.20,p[2]+Math.sin(i+seed)*size*.15],size*(.8+i*.22),Math.abs(seed+i));}

 function dish(p,r,tilt=.5,azimuth=.2,broken=false){
  const transform=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(tilt,azimuth,0)),new T.Vector3(1,1,1));
  const local=v=>new T.Vector3(...v).applyMatrix4(transform).toArray();
  const points=[];for(let i=0;i<=12;i++){const u=i/12;points.push(new T.Vector2(r*u, r*.34*u*u));}
  const g=new T.LatheGeometry(points,48,broken?.35:0,broken?Math.PI*1.65:Math.PI*2);g.applyMatrix4(transform);
  // The reflector is a shell visible from both its bowl and rear approach. Keep
  // the other painted surfaces single-sided; reverse only this backing's faces.
  const backing=g.clone(),indices=backing.index.array,normals=backing.attributes.normal;
  for(let i=0;i<indices.length;i+=3){const v=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=v;}
  for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
  add(g,[0,0,0],[1,1,1],C.ivory,PAINT);add(backing,[0,0,0],[1,1,1],0x929c98,PAINT);
  for(let i=0;i<16;i++){const a=i*Math.PI*2/16;if(broken&&i>12)continue;const edge=[r*Math.sin(a),r*.34,r*Math.cos(a)];
   for(let j=0;j<4;j++){const u=j/4,v=(j+1)/4;beam(local([r*u*Math.sin(a),r*(.34*u*u-.025),r*u*Math.cos(a)]),local([r*v*Math.sin(a),r*(.34*v*v-.025),r*v*Math.cos(a)]),2.3,C.steel);}
   if(i%4===0)beam(local(edge),local([0,r*.72,0]),2.3,C.steel);
  }
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,b=a+Math.PI/6;if(broken&&i>9)continue;
   const rim=[r*.94*Math.sin(a),r*.30,r*.94*Math.cos(a)],hub=[r*.28*Math.sin(a),-r*.10,r*.28*Math.cos(a)],next=[r*.94*Math.sin(b),r*.30,r*.94*Math.cos(b)];
   beam(local(hub),local(rim),2.4,C.steel);beam(local(hub),local(next),1.7,C.steel);
   beam(local(rim),local(next),2.1,C.patch);
  }
  torus(p,r*.18,4,C.steel,METAL,[Math.PI/2,0,0]);
  cylinder([p[0],p[1]-r*.12,p[2]],r*.17,r*.17,C.steel,METAL);
  cylinder(p,r*.12,r*.15,C.dark,DARK);beam(local([0,0,0]),local([0,r*.76,0]),4,C.rust);const receiver=new T.CylinderGeometry(r*.026,r*.055,r*.12,12);receiver.applyMatrix4(new T.Matrix4().makeTranslation(0,r*.76,0)).applyMatrix4(transform);add(receiver,[0,0,0],[1,1,1],C.steel,METAL);
 }
 function finish(){const group=new T.Group();for(let i=0;i<bins.length;i++)if(bins[i].length){const g=mergeGeometries(bins[i]);bins[i].forEach(x=>x.dispose());g.computeBoundingBox();g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[i]);mesh.name=REGION_LANDMARK_NAMES[placement.region]+' / '+materials[i].name;mesh.castShadow=i!==GLOW;mesh.receiveShadow=true;group.add(mesh);}group.position.set(placement.x,placement.z,placement.y);group.name='REGION_'+placement.region+'_'+REGION_LANDMARK_NAMES[placement.region];return {group,solids};}
 return {add,box,cylinder,beam,torus,panel,truss,rail,lamp,crate,room,stone,greenery,dish,solid,detail,finish};
}

function construct(region,materials,p){
 const k=kit(materials,p),{add,box,cylinder,beam,torus,panel,truss,rail,lamp,crate,room,stone,greenery,dish,solid,detail:e}=k;
 if(region===0){
  // A broken rescue capsule: open cross-section, exposed ribs and an evacuation ramp.
  for(let i=0;i<7;i++){const z=-100+i*30;torus([0,90,z],94,5,C.steel,METAL,[0,0,0],Math.PI*1.8);}
  for(let i=0;i<10;i++){const a=.2+i*Math.PI*1.8/10,x=Math.cos(a)*94,y=90+Math.sin(a)*94;const span=170+(i%3)*15;panel([x,y,-12],[45,8,span],i%3===0?C.rust:C.ivory,[0,0,a]);}
  box([0,4,5],[130,8,220],C.dark,DARK);box([0,28,106],[110,6,70],C.steel,METAL,[-.45,0,0]);
  for(const side of [-1,1]){box([side*82,80,-5],[24,160,210],C.dark,DARK,[0,0,0],true);cylinder([side*73,90,-98],20,180,C.steel,METAL,[Math.PI/2,0,0]);}
  box([0,110,-110],[140,170,8],C.dark,DARK,[0,0,0],true);box([0,100,-104],[67,80,3],C.blue,GLASS);box([0,157,-99],[90,5,3],C.amber,GLOW);
  room(-220,65,100,100,70,0xb9aa8a);room(220,-20,130,90,83,0xa2a7a0);
  for(const x of [-175,175]){truss([x,0,-170],[x,230,-170],30);box([x,0,-170],[40,25,45],C.steel,METAL,[0,0,0],true);}truss([-175,230,-170],[175,230,-170],28);beam([40,230,-170],[40,138,-170],2.5);cylinder([40,130,-170],12,22,C.rust);
  for(let i=0;i<9;i++)crate(-220+(i%3)*36,0,150+Math.floor(i/3)*30,28);for(const x of [-110,110])lamp(x,0,145);
 }else if(region===1){
  // Bucket wheel excavator with a triangulated boom, track beds and feed conveyor.
  for(const x of [-112,112]){box([x,26,0],[62,52,280],C.dark,DARK,[0,0,0],true);for(let z=-125;z<=125;z+=25)box([x,48,z],[65,8,14],C.steel,METAL);for(let z=-100;z<=100;z+=40)cylinder([x+(x<0?-34:34),26,z],20,8,C.rust,METAL,[0,0,Math.PI/2]);}
  box([0,76,0],[245,54,200],C.rust,PAINT,[0,0,0],true);cylinder([0,115,0],96,25,C.steel);room(-62,-30,92,110,178,0xc5b889);
  for(const x of [-38,38])truss([x,123,20],[x,225,-275],32,C.rust);truss([-38,225,-275],[38,225,-275],20);
  cylinder([0,225,-284],110,35,C.dark,DARK,[0,0,Math.PI/2]);torus([23,225,-284],112,9,C.rust,METAL,[0,Math.PI/2,0]);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box([0,225+Math.sin(a)*114,-284+Math.cos(a)*114],[58,32,44],C.rust,PAINT,[a,0,0]);beam([27,225,-284],[27,225+Math.sin(a)*102,-284+Math.cos(a)*102],5,C.steel);}
  solid([0,225,-284],[58,245,245]);truss([0,170,40],[0,85,280],46);box([0,127,170],[38,8,240],C.dark,DARK,[.34,0,0]);
  for(let z=65;z<260;z+=26)cylinder([0,162-(z-65)*.34,z],7,43,C.steel,METAL,[0,0,Math.PI/2]);
  for(let i=0;i<8;i++){const x=200+(i%2)*35,z=-130+Math.floor(i/2)*60;stone([x,12,z],[22,28,20],0x466f7d,i);add(new T.ConeGeometry(12,55,5),[x+5,36,z],[1,1,1],C.blue,GLASS,[.2,i*.4,.25]);}
  for(const x of [-125,125])rail([x,105,60],[x,105,-90]);lamp(85,105,76);lamp(-85,105,76);crate(190,0,140,36);
 }else if(region===2){
  // Broken archival ring, segmented masonry and exposed inner gold circuitry.
  const r=250,cy=275;
  for(let i=0;i<28;i++){const a=-Math.PI*.48+i*Math.PI*1.84/28;if(i>=18&&i<=21)continue;const x=Math.cos(a)*r,y=cy+Math.sin(a)*r;box([x,y,0],[48,68,74],i%4?0xc1bca7:0xa1a294,PAINT,[0,0,a-Math.PI/2],true);box([x*.9,cy+(y-cy)*.9,41],[34,9,4],0xb49652,METAL,[0,0,a-Math.PI/2]);}
  for(const x of [-280,280]){box([x,165,0],[55,330,80],C.stone,NATURAL,[0,0,0],true);for(let y=25;y<320;y+=45)box([x,y,43],[59,5,8],0x8f998e,METAL);}
  for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(100+i*50),z=170+i*20,h=130+(i%3)*38;cylinder([x,h/2,z],13,h,0xc8c3ad,PAINT,[0,0,0],true,12);cylinder([x,h,z],20,12,C.stone,NATURAL);box([x,h+10,z],[43,8,42],C.ivory,PAINT);}
  for(let i=0;i<10;i++){const x=-280+i*62,z=-100-Math.sin(i*7)*55;stone([x,18,z],[30,24,36],0xaaa995,i);box([x,25,z],[40,35,32],C.ivory,PAINT,[.2,i*.4,.3]);}
  for(let i=0;i<5;i++)box([0,3,90+i*45],[140,5,30],0x999b89,NATURAL);for(const x of [-92,92])for(let z=100;z<300;z+=65)lamp(x,0,z);crate(270,0,180,35);
 }else if(region===3){
  // Habitat terraces and a partially glazed conservatory; leafy growth is geometry.
  cylinder([0,92,-60],185,184,C.ivory,PAINT,[0,0,0],true,48);
  for(const y of [12,94,177]){torus([0,y,-60],187,4,C.steel,METAL,[Math.PI/2,0,0]);}
  for(let n=0;n<14;n++){
   const a=n*Math.PI/7,x=Math.sin(a)*184,z=-60+Math.cos(a)*184;
   for(const y of [49,137])e.window([x,y,z],65,52,a,n%5===1);
   for(const y of [97,180]){const q=[Math.sin(a)*190,y,-60+Math.cos(a)*190];e.fixture(q,a);}
   beam([Math.sin(a)*188,10,-60+Math.cos(a)*188],[Math.sin(a)*188,178,-60+Math.cos(a)*188],2,C.steel);
  }
  // Two worn balcony bands follow the curved shell. The original collision
  // cylinder remains unchanged; these are shallow façade attachments.
  for(const y of [96,179]){
   torus([0,y,-60],194,4,C.patch,METAL,[Math.PI/2,0,0],Math.PI*2);
   for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    const p0=[Math.sin(a)*198,y+18,-60+Math.cos(a)*198],p1=[Math.sin(b)*198,y+18,-60+Math.cos(b)*198];
    beam([p0[0],y,p0[2]],p0,1.2);beam(p0,p1,1.2);
   }
  }

  for(let ring=0;ring<5;ring++){const a=ring*Math.PI/11,rr=Math.cos(a)*182,y=184+Math.sin(a)*160;torus([0,y,-60],rr,3.5,C.steel,METAL,[Math.PI/2,0,0]);}
  for(let n=0;n<16;n++){const a=n*Math.PI/8;for(let j=0;j<5;j++){const a0=j*Math.PI/10,a1=(j+1)*Math.PI/10;beam([Math.sin(a)*182*Math.cos(a0),184+160*Math.sin(a0),-60+Math.cos(a)*182*Math.cos(a0)],[Math.sin(a)*182*Math.cos(a1),184+160*Math.sin(a1),-60+Math.cos(a)*182*Math.cos(a1)],3.5,C.steel);}}
  add(new T.SphereGeometry(1,32,12,0,Math.PI*1.8,0,Math.PI/2),[0,184,-60],[179,157,179],0x688a81,GLASS);
  for(let y=195;y<340;y+=30){const rr=182*Math.sqrt(Math.max(0,1-((y-184)/160)**2));solid([0,y,-60],[rr*2,30,rr*2]);}
  for(const side of [-1,1]){room(side*235,50,90,120,90,0xbec3a8);room(side*230,-100,100,100,130,0x9dab98);box([side*230,136,-100],[124,7,125],C.steel,METAL);rail([side*280,140,-165],[side*280,140,-35]);for(let i=0;i<5;i++)greenery([side*235+(i%2)*30,134,-140+i*22],22,i+side);}
  for(let i=0;i<11;i++){const a=i*Math.PI*2/11;greenery([Math.sin(a)*196,177,-60+Math.cos(a)*196],29+(i%3)*7,i);}
  e.pipe([[-288,110,103],[-292,96,110],[-292,20,110],[-263,13,118],[-205,13,118]],3);e.valve([-264,16,123],7);
  for(const side of [-1,1]){for(let i=0;i<13;i++)box([side*282,6+i*10,-140+i*13],[25,4,16],C.steel,METAL);e.rail([side*294,10,-141],[side*294,137,19]);}
  for(const x of [-110,80]){e.round([x,88,143],[80,3,25],0x9da393,2,METAL);e.fixture([x,84,154]);}
  box([0,7,180],[300,14,90],C.steel,METAL);rail([-150,14,225],[150,14,225]);for(const x of [-140,140])lamp(x,14,180);crate(-150,0,260,28);
 }else if(region===4){
  // Truncated central communications tower and its collapsed lattice boom.
  cylinder([0,38,-20],115,76,C.dark,DARK,[0,0,0],true,32);cylinder([0,230,-20],66,390,C.ivory,PAINT,[0,0,0],true,24,59);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;add(new T.CylinderGeometry(115.6,115.6,55,3,1,true,a+.012,Math.PI/8-.024),[0,39,-20],[1,1,1],i===7?C.patch:C.ivory,PAINT);}
  for(const y of [10,69])torus([0,y,-20],116,2.3,C.steel,METAL,[Math.PI/2,0,0]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;e.vent([Math.sin(a)*117,36,-20+Math.cos(a)*117],33,23,a);}

  for(let h=50;h<410;h+=50){torus([0,h,-20],68,3.5,C.steel,METAL,[Math.PI/2,0,0]);for(let n=0;n<8;n++){const a=n*Math.PI/4;panel([Math.sin(a)*67,h+20,-20+Math.cos(a)*67],[34,43,4],n%3?C.ivory:C.rust,[0,a,0]);}}
  for(const side of [-1,1])truss([side*30,410,-20],[side*30+260,36,-180],26);truss([230,40,-180],[320,22,-230],30);
  for(let i=0;i<7;i++)beam([Math.cos(i)*45,410,-20+Math.sin(i)*45],[Math.cos(i)*63,445+(i%3)*18,-20+Math.sin(i)*63],3,C.dark,DARK);
  for(const side of [-1,1]){cylinder([side*250,55,120],28,110,C.steel,METAL,[0,0,0],true);dish([side*250,110,120],100,.4,side*.6);room(side*245,250,90,90,70,0xb8b7a8);lamp(side*190,0,250);}
  // The damaged relay stays quiet: capped conduits replace a glowing runway.
  for(let i=0;i<7;i++){const z=140+i*24;box([22,1.5,z],[45,3,21],C.dark,DARK);for(let j=0;j<5;j++)box([5+j*8,3,z],[1.4,2,20],C.steel,METAL);}
  e.pipe([[-58,58,53],[-83,30,88],[-116,12,123],[-155,8,168]],4);
  for(const p of [[-62,100,4],[62,150,-26]])e.vent(p,31,36,p[0]<0?-Math.PI/2:Math.PI/2);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;beam([Math.sin(a)*90,8,-20+Math.cos(a)*90],[Math.sin(a)*64,110,-20+Math.cos(a)*64],4,C.steel);}
  crate(-150,0,-160,32);
 }else if(region===5){
  // Ribbed minehead: tunnel portals, ore hoist and supply tram.
  for(const side of [-1,1]){room(side*190,0,115,190,220,0x919c97);for(let y=35;y<220;y+=50){box([side*190,y,99],[112,5,10],C.steel,METAL);box([side*190,y+12,103],[60,4,3],C.amber,GLOW);}}
  for(let z=-110;z<=140;z+=50){for(const side of [-1,1]){truss([side*100,0,z],[side*100,190,z],20);beam([side*100,190,z],[0,235,z],8,C.steel);solid([side*100,95,z],[24,190,24]);}beam([-100,190,z],[100,190,z],5,C.rust);}
  box([0,3,0],[170,6,270],C.dark,DARK);for(const x of [-45,45])beam([x,8,-120],[x,8,190],3,C.steel);
  for(const x of [-58,58])box([x,42,-70],[8,60,90],C.rust,PAINT,[0,0,0],true);box([0,14,-70],[120,20,95],C.dark,DARK,[0,0,0],true);for(let i=0;i<5;i++)stone([(i%3-1)*32,40,-70+Math.sin(i)*25],[27,22,25],0x688a91,i);
  for(const side of [-1,1]){truss([side*170,220,-70],[side*170,340,-70],20);beam([side*170,340,-70],[side*170,340,140],8,C.rust);lamp(side*120,0,165);for(let i=0;i<3;i++)crate(side*225,0,160+i*32,30);}
  beam([-170,340,-70],[170,340,-70],9,C.rust);beam([0,340,-70],[0,248,-70],2,C.steel);torus([0,240,-70],15,3,C.rust,METAL);
 }else if(region===6){
  // Mining headframe and a hanging inspection cage; the foreground lane stays open.
  for(const side of [-1,1])for(const z of [-140,80]){truss([side*115,0,z],[side*70,445,z],32);solid([side*100,220,z],[55,440,50]);}
  for(const z of [-140,80]){truss([-70,445,z],[70,445,z],35);for(let h=100;h<400;h+=100)truss([-105+h*.08,h,z],[105-h*.08,h,z],20);}
  for(const x of [-78,78])truss([x,445,-155],[x,445,195],28);box([0,458,10],[190,8,350],C.steel,METAL);for(const x of [-91,91])rail([x,464,-160],[x,464,180]);
  for(const x of [-38,38]){cylinder([x,490,125],35,18,C.rust,METAL,[0,0,Math.PI/2]);beam([x,490,125],[x,200,125],2,C.steel);}
  box([0,195,125],[110,12,80],C.steel,METAL,[0,0,0],true);box([0,295,125],[110,10,80],C.rust,PAINT);
  for(const x of [-52,52])for(const z of [87,163])beam([x,200,z],[x,295,z],4,C.steel);for(let x=-45;x<=45;x+=15)beam([x,200,164],[x,295,164],1.5,C.steel);
  cylinder([0,40,-100],65,80,C.dark,DARK,[0,0,0],true,24);for(let y=30;y<100;y+=20)torus([0,y,-100],67,5,C.rust,METAL,[Math.PI/2,0,0]);
  room(-250,80,120,140,120,0x8d8c7e);room(250,-50,120,120,90,0x9d9d90);for(const x of [-200,200])lamp(x,0,190,0xff9278);crate(-245,0,200,34);crate(240,0,100,35);
 }else if(region===7){
  // Radio dish and slit observatory; separate fine ribs keep a recognizable silhouette.
  cylinder([-160,130,-45],78,260,C.ivory,PAINT,[0,0,0],true,24);for(let h=20;h<260;h+=45)torus([-160,h,-45],80,4,C.steel,METAL,[Math.PI/2,0,0]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;for(const y of [74,166,220])e.window([-160+Math.sin(a)*78,y,-45+Math.cos(a)*78],31,25,a,i===0&&y===74);}
  e.pipe([[-220,243,-7],[-228,225,-7],[-228,29,-7],[-215,22,22]],2.8);
  box([-160,275,-45],[190,15,180],C.steel,METAL);
  e.rail([-249,284,40],[-71,284,40],22);e.rail([-249,284,-128],[-249,284,40],22);
  for(let i=0;i<20;i++)box([-246+i*9,284,0],[1,1,76],C.patch,METAL);
for(const side of [-1,1])beam([-160+side*56,280,-45],[-160+side*25,365,-45],9,C.rust);dish([-160,355,-45],160,.65,-.5);
  cylinder([175,65,60],135,130,C.ivory,PAINT,[0,0,0],true,32);torus([175,135,60],139,7,C.steel,METAL,[Math.PI/2,0,0]);
  for(let i=0;i<20;i++){const a=i*Math.PI/10;
   add(new T.CylinderGeometry(135.8,135.8,112,3,1,true,a+.008,Math.PI/10-.016),[175,65,60],[1,1,1],i===12?C.patch:i%3?C.ivory:0xb3b8ad,PAINT);
   for(const y of [16,115])cylinder([175+Math.sin(a+.04)*137,y,60+Math.cos(a+.04)*137],1.3,2.5,C.steel,METAL,[Math.PI/2,a+.04,0],false,6);
  }
  for(const y of [10,123])torus([175,y,60],136.5,2.2,C.steel,METAL,[Math.PI/2,0,0]);
  e.vent([175,39,198],47,20);e.fixture([175,117,199]);
  e.pipe([[302,120,95],[311,104,95],[311,23,95],[297,16,113]],2.3);

  for(let part=0;part<2;part++)add(new T.SphereGeometry(1,20,12,part?Math.PI+.12:.12,Math.PI-.24,0,Math.PI/2),[175,138,60],[132,132,132],C.ivory,PAINT);
  for(let y=150;y<270;y+=25){const rr=134*Math.sqrt(Math.max(0,1-((y-138)/134)**2));solid([175,y,60],[rr*2,25,rr*2]);}
  for(let n=0;n<12;n++){const a=n*Math.PI/6;for(let j=0;j<5;j++){const a0=j*Math.PI/10,a1=(j+1)*Math.PI/10;beam([175+Math.sin(a)*134*Math.cos(a0),138+134*Math.sin(a0),60+Math.cos(a)*134*Math.cos(a0)],[175+Math.sin(a)*134*Math.cos(a1),138+134*Math.sin(a1),60+Math.cos(a)*134*Math.cos(a1)],2.6,C.steel);}}
  beam([175,170,60],[175,265,-5],20,C.dark,DARK);cylinder([175,265,-5],27,10,C.blue,GLASS,[.7,0,0]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;e.window([175+Math.sin(a)*135,83,60+Math.cos(a)*135],40,28,a,i===0);}
  room(-135,205,145,90,80,0xb8c0bc);lamp(-205,0,265);lamp(-65,0,265);for(let i=0;i<4;i++)crate(265,0,-130+i*34,28);
 }
 return k.finish();
}

export function landmarkRoadClearance(world,x,y){
 let best=Infinity;
 for(const road of world.roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));}
 return best;
}

export function landmarkBoundaryClearance(world,x,y){
 const distances=[world.surfaceWidth-100-x];
 if(y>2500)distances.push(x-100);
 if(x>5000)distances.push(y-100);
 if(x>6000)distances.push(world.surfaceHeight-100-y);
 return Math.min(...distances);
}

export function chooseLandmarkPlacements(world){
 if(typeof ExoRegionLandmarkData!=='undefined')return ExoRegionLandmarkData.placements.map(p=>({...p}));
 const out=[];
 for(let region=0;region<8;region++){
  if(region===7){
   // The eastern shoulder retains the northern mountain skyline, while its
   // broad 240-unit blend avoids cutting a cliff into the summit approach.
   const peak=world.features.find(f=>f.id==='north'),x=peak.x+1200,y=peak.y+150,z=world.surfaceElevation(x,y);
   out.push({region,name:REGION_LANDMARK_NAMES[region],x,y,z,radius:350,fade:240});continue;
  }
  const c=world.surfaceCamps[region];let best=null;
  for(let ring=0;ring<14&&!best;ring++)for(let n=0;n<32;n++){
   const a=-Math.PI/2+n*Math.PI*2/32+region*.17,r=900+ring*180,x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r;
   if(x<750||y<750||x>world.surfaceWidth-750||y>world.surfaceHeight-750||landmarkRoadClearance(world,x,y)<700)continue;
   if([-550,0,550].some(dx=>[-550,0,550].some(dy=>landmarkBoundaryClearance(world,x+dx,y+dy)<1700)))continue;
   if(world.surfaceCamps.some(v=>Math.hypot(x-v.x,y-v.y)<750)||world.caves.some(v=>Math.hypot(x-v.x,y-v.y)<900)||world.structures.some(v=>Math.hypot(x-v.x,y-v.y)<Math.hypot(v.w,v.d)/2+600)||out.some(v=>Math.hypot(x-v.x,y-v.y)<1200))continue;
   if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(x,y,40))continue;
   if(typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.influence(x,y)>.01)continue;
   if(world.slope(x,y)>.25)continue;
   const z=world.surfaceElevation(x,y);if(Array.from({length:8},(_,i)=>world.surfaceElevation(x+Math.sin(i*Math.PI/4)*420,y+Math.cos(i*Math.PI/4)*420)).some(h=>Math.abs(h-z)>65))continue;
   best={region,name:REGION_LANDMARK_NAMES[region],x,y,z,radius:460,fade:80};break;
  }
  if(!best)throw new Error('No clear landmark placement for region '+region);
  out.push(best);
 }
 return out;
}

export function createRegionalLandmarks(scene,maps,world){
 const materials=materialFamily(maps),placements=chooseLandmarkPlacements(world),rows=[],collisionBoxes=[],stats={regions:[],visibleRegions:0,visibleTriangles:0};
 for(const p of placements){const {group,solids}=construct(p.region,materials,p),triangles=group.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);if(triangles>(p.region===3?68000:44000)||group.children.length>6)throw new Error('Regional scenery exceeds asset budget: '+p.region+' / '+triangles+' triangles');scene.add(group);group.visible=false;rows.push({p,group,triangles});collisionBoxes.push(...solids);stats.regions.push({...p,triangles,drawGroups:group.children.length,collisionBoxes:solids.length});}
 let previous='';
 function update(u,W){const key=(W.cave?'inside':'surface')+Math.floor(u.x/100)+','+Math.floor(u.y/100);if(key===previous)return;previous=key;stats.visibleRegions=stats.visibleTriangles=0;for(const r of rows){r.group.visible=!W.cave&&Math.hypot(u.x-r.p.x,u.y-r.p.y)<4500;if(r.group.visible){stats.visibleRegions++;stats.visibleTriangles+=r.triangles;}}}
 return {update,stats,placements,collisionBoxes,groups:rows.map(r=>r.group),dispose(){for(const r of rows){scene.remove(r.group);r.group.traverse(o=>o.geometry?.dispose());}materials.forEach(m=>m.dispose());}};
}
