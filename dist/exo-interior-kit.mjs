import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {createCampusMaterials,createCampusBuilder} from './exo-campus-materials.mjs';

// Manufactured components use the same metres, CC0 scans and packed PBR maps
// as the exterior. Shapes are authored in physical units before batching.
export const FINISH={paint:0,glass:1,light:2,metal:5,mark:8};
export const PALETTE={case:0x7e837b,steel:0x747c78,dark:0x252d2c,rubber:0x131a19,ivory:0xa5a597,amber:0xad8752,green:0x8cbaa4,white:0xddd2b6};
const up=new T.Vector3(0,1,0);
export function createInteriorMaterials(maps={}){
 const mats=createCampusMaterials(maps);
 mats[0].metalness=.32;mats[0].roughness=.78;mats[0].envMapIntensity=.3;
 mats[1].color.setHex(0xb2c9c3);mats[1].roughness=.23;mats[1].metalness=.12;
 mats[5].metalness=.7;mats[5].roughness=.64;mats[5].envMapIntensity=.5;
 const markingCompile=mats[8].onBeforeCompile;
 mats[8].onBeforeCompile=shader=>{markingCompile(shader);shader.fragmentShader=shader.fragmentShader.replace('dot(floor(campusMarkP.xz*1.7),vec2(12.9898,78.233))','dot(floor(campusMarkP*2.3),vec3(12.9898,78.233,38.17))').replace('mix(.45,1.,smoothstep(.08,.38,wear))','mix(.66,1.,smoothstep(.08,.25,wear))');};
 mats[8].customProgramCacheKey=()=> 'interior-worn-enamel-v81';
 return mats;
}
export function createInstrumentAtlas(){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');if(!c)return null;
 const titles=['电源监测','维护记录','气密 / 循环','路径接驳'];
 for(let i=0;i<4;i++){
  const x=(i%2)*256,y=Math.floor(i/2)*256;c.fillStyle='#101e20';c.fillRect(x,y,256,256);
  c.fillStyle='#aec3b2';c.font='18px "PingFang SC",sans-serif';c.fillText(titles[i],x+18,y+34);c.fillStyle='#567b74';c.fillRect(x+18,y+46,220,1);
  c.font='11px monospace';c.fillText('K09 / SERVICE  '+String(i+1).padStart(2,'0'),x+18,y+66);
  c.strokeStyle='#344f4c';c.lineWidth=1;for(let n=0;n<5;n++){c.beginPath();c.moveTo(x+20,y+95+n*23);c.lineTo(x+234,y+95+n*23);c.stroke();}
  c.strokeStyle=i===0?'#cead76':'#86b6a1';c.lineWidth=2;c.beginPath();for(let n=0;n<70;n++){const py=y+138+Math.sin(n*.18+i)*12+Math.sin(n*.51)*4+(i===0&&n>34&&n<40?-29:0);if(n)c.lineTo(x+20+n*3,py);else c.moveTo(x+20,py);}c.stroke();
  for(let n=0;n<3;n++){c.fillStyle='#29413e';c.fillRect(x+20+n*74,y+205,60,23);c.fillStyle=n===2?'#c4ac7c':'#a9c4b6';c.font='12px monospace';c.fillText(['24.8','081','待命'][n],x+26+n*74,y+221);}
  c.fillStyle='#02090924';for(let n=0;n<128;n++)c.fillRect(x,y+n*2,256,1);
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const material=new T.MeshStandardMaterial({name:'Recessed maintenance instrument displays',map:texture,emissiveMap:texture,emissive:0xaac2b5,emissiveIntensity:.42,roughness:.3,metalness:.08});
 return {texture,material,dispose(){texture.dispose();material.dispose();}};
}
export function createInteriorBuilder(materials,atlas){
 const b=createCampusBuilder(materials),screens=[];
 function tube(points,r,color=PALETTE.dark,kind=0){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));b.add(new T.TubeGeometry(curve,Math.max(8,points.length*4),r,8,false),[0,0,0],[1,1,1],color,[0,0,0],kind);}
 function ring(p,r,t,color=PALETTE.steel,rotation=[0,0,0],kind=5){b.add(new T.TorusGeometry(r,t,6,24),p,[1,1,1],color,rotation,kind);}
 function bolt(p,r=2.3,rotation=[Math.PI/2,0,0]){b.add(new T.CylinderGeometry(r,r,r*.65,6),p,[1,1,1],PALETTE.steel,rotation,5);}
 function flange(p,r,rotation=[0,0,0]){b.cylinder(p,[r,4,r],PALETTE.case,rotation,0);const q=new T.Quaternion().setFromEuler(new T.Euler(...rotation));for(let i=0;i<6;i++){const angle=i*Math.PI/3,v=new T.Vector3(Math.cos(angle)*r*.78,3,Math.sin(angle)*r*.78).applyQuaternion(q).add(new T.Vector3(...p));bolt(v.toArray(),2.2,rotation);}}
 function vent(p,w,h,rotation=[0,0,0]){const groupMatrix=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
  const part=(point,size,color,angle=[0,0,0],kind=0)=>{const pos=new T.Vector3(...point).applyMatrix4(groupMatrix);b.box(pos.toArray(),size,color,[angle[0]+rotation[0],angle[1]+rotation[1],angle[2]+rotation[2]],kind);};
  part([0,0,0],[w,h,7],PALETTE.dark);for(const side of [-1,1]){part([side*(w/2+2),0,2],[5,h+8,5],PALETTE.steel);part([0,side*(h/2+2),2],[w+8,5,5],PALETTE.steel);}for(let y=-h/2+9;y<h/2;y+=10)part([0,y,5],[w-10,3.5,9],PALETTE.case,[.35,0,0]);
 }
 function screen(p,w,h,index=0,rotation=[0,0,0]){if(!atlas){b.box(p,[w,h,1.2],0x668c80,rotation,1);return;}const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(index%2+uv.getX(i))/2,1-(Math.floor(index/2)+1-uv.getY(i))/2);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));screens.push(g);}
 function luminaire(p,width=105){const [x,y,z]=p;b.box([x,y+4,z],[width+18,14,37],PALETTE.dark);b.box([x,y-4,z],[width,5,25],PALETTE.white,[0,0,0],2);for(const side of [-1,1]){b.box([x+side*(width/2+4),y-2,z],[6,12,37],PALETTE.steel);b.box([x,y-7,z+side*15],[width+5,3,3],PALETTE.steel);}for(let i=-2;i<=2;i++)b.box([x+i*width/5,y-8,z],[2,2,30],PALETTE.case);}
 function cylinderVessel(p,r,h,color=PALETTE.case){const pts=[];for(const [radius,height] of [[r*.58,0],[r*.84,4],[r,h*.09],[r,h*.88],[r*.88,h*.96],[r*.56,h]])pts.push(new T.Vector2(radius,height));b.add(new T.LatheGeometry(pts,24),p,[1,1,1],color,[0,0,0],0);for(const y of [h*.16,h*.8])ring([p[0],p[1]+y,p[2]],r+2,3,PALETTE.dark,[Math.PI/2,0,0],0);b.cylinder([p[0],p[1]+h+6,p[2]],[r*.22,12,r*.22],PALETTE.steel,[0,0,0],5);}
 function finish(){const group=b.finish();if(screens.length){const g=mergeGeometries(screens);screens.forEach(x=>x.dispose());const m=new T.Mesh(g,atlas.material);m.name='Instrument glass / printed circuitry';group.add(m);}return group;}
 return {...b,tube,ring,bolt,flange,vent,screen,luminaire,cylinderVessel,finish};
}
