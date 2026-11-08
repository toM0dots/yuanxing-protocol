import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {scannedMaterial} from './exo-world-details.mjs?v=20261108-inspection92b';
import {createCampusMaterials,createCampusBuilder} from './exo-campus-materials.mjs';
import {createFieldLampBatch} from './exo-field-lamps.mjs?v=20261107-performance89';

/* Physical survey country beside K–09. The world module owns every traversable
   height and route; this layer adds rock/weathering, river water and equipment.
   Scans are the same CC0 surfaces already loaded for the campus and canyon. */
const noise=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const asPoint=p=>Array.isArray(p)?{x:p[0],y:p[1]}:p;
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
function distanceToLines(x,y,lines){let distance=Infinity;for(const line of lines)for(let i=1;i<line.length;i++)distance=Math.min(distance,segmentDistance(x,y,line[i-1],line[i]));return distance;}
function ribbon(points,width,height,step=28){
 const p=[],uv=[],indices=[];let offset=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),count=Math.max(1,Math.ceil(length/step)),nx=-dy/length,ny=dx/length,start=p.length/3;
  for(let j=0;j<=count;j++){const t=j/count,x=a.x+dx*t,y=a.y+dy*t,w=typeof width==='function'?width(x,y,offset+length*t):width;
   for(const side of [-1,1]){const px=x+nx*w*.5*side,py=y+ny*w*.5*side;p.push(px,height(px,py,side,offset+length*t),py);uv.push((side+1)/2,(offset+length*t)/90);}
   if(j<count){const k=start+j*2;indices.push(k,k+1,k+3,k,k+3,k+2);}
  }offset+=length;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function erodedStone(seed){
 const sides=12,rings=8,p=[],uv=[],indices=[];
 for(let ring=0;ring<=rings;ring++){
  // Basalt breaks along tilted beds and vertical joints. Broad, unequal facets
  // read as fallen strata instead of the old rounded river-pebble silhouette.
  const t=ring/rings,y=t*2-1,bulge=ring===0?.46:ring===rings?.35:.87+.07*Math.sin(t*6+seed),strata=1+.11*Math.sin(Math.floor(t*4)*2.8+seed);
  for(let j=0;j<=sides;j++){
   const angle=j/sides*Math.PI*2,r=bulge*strata*(.82+.17*Math.sin(angle*3+seed)+.10*Math.cos(angle*5-seed*2)),bend=y*.18+.06*Math.sin(y*2+seed);
   p.push(Math.cos(angle)*r+bend,y+.09*Math.cos(angle*2+seed),Math.sin(angle)*r*(.82+.11*Math.cos(angle*5+seed)));uv.push(j/sides,t);
   if(ring<rings&&j<sides){const k=ring*(sides+1)+j;indices.push(k,k+sides+1,k+sides+2,k,k+sides+2,k+1);}
  }
 }
 for(const top of [false,true]){
  const center=p.length/3,y=top?1:-1;p.push(y*.18+.06*Math.sin(y*2+seed),y,0);uv.push(.5,top?1:0);
  const row=(top?rings:0)*(sides+1);for(let j=0;j<sides;j++){if(top)indices.push(row+j,center,row+j+1);else indices.push(row+j,row+j+1,center);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function makeSignAtlas(labels){
 if(typeof document==='undefined'||!labels.length)return null;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128*labels.length;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 for(let i=0;i<labels.length;i++){
  const y=i*128;ctx.fillStyle='#273b40';ctx.fillRect(0,y,1024,128);ctx.fillStyle='#83938b';ctx.fillRect(0,y,7,128);ctx.fillStyle='#182c31';ctx.fillRect(16,y+8,1000,112);
  ctx.font='500 36px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle='#c4cec4';ctx.fillText(labels[i].name,36,y+56);
  ctx.font='22px monospace';ctx.fillStyle='#90aaa5';ctx.fillText(labels[i].caption||'K–09 / FIELD SURVEY',38,y+97);
  for(let j=0;j<38;j++){const x=noise(i+4,j)*1024,dy=noise(j,i+12)*128;ctx.strokeStyle=j%3?'#14252b70':'#b0b5a740';ctx.lineWidth=1+noise(j,42)*2;ctx.beginPath();ctx.moveTo(x,y+dy);ctx.lineTo(x+6+noise(j,21)*60,y+dy-3);ctx.stroke();}
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}

export function createTerrainWilds(scene,world,maps={},supplied){
 const data=supplied||(typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null);
 const root=new T.Group();root.name='K09 / broken-water survey country';scene.add(root);
 if(!data)return {root,update(){root.visible=false},dispose(){scene.remove(root)}};
 const materials=createCampusMaterials(maps),hardware=createCampusBuilder(materials),rockMaterial=scannedMaterial(maps,{color:0x999b96}),soilMaterial=scannedMaterial(maps,{color:0x93998c,ground:true,vegetation:false});
 soilMaterial.polygonOffset=true;soilMaterial.polygonOffsetFactor=-1;soilMaterial.polygonOffsetUnits=-1;
 // Feather the track into the existing surface, with mineral scatter and two
 // broken wheel ruts. All vertices still use the world's physical elevation.
 soilMaterial.transparent=true;soilMaterial.depthWrite=false;
 const compileSoil=soilMaterial.onBeforeCompile;soilMaterial.onBeforeCompile=shader=>{
  compileSoil(shader);shader.vertexShader='varying vec2 trackUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntrackUV=uv;');
  shader.fragmentShader='varying vec2 trackUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`float grit=fract(sin(dot(floor(surfaceP.xz*1.3),vec2(12.9898,78.233)))*43758.5453);
float ragged=.05*sin(trackUV.y*5.1)+.032*sin(trackUV.y*13.7)+.025*(grit-.5);
float trackEdge=smoothstep(.02,.26,trackUV.x+ragged)*(1.-smoothstep(.74,.98,trackUV.x-ragged));
float wheelRuts=exp(-pow((trackUV.x-.34)/.055,2.))+exp(-pow((trackUV.x-.66)/.055,2.));
diffuseColor.rgb*=1.-wheelRuts*(.07+.07*sin(trackUV.y*33.));diffuseColor.a*=trackEdge*(.62+grit*.22);
#include <alphatest_fragment>`);
 };soilMaterial.customProgramCacheKey=()=> 'k09-eroded-service-track-v80';
 const rockParts=[],pathParts=[],waterUniform={value:0},lights=[],lamps=createFieldLampBatch(maps);
 const paths=(data.paths||[]).map(path=>({...path,points:(path.points||path).map(asPoint)}));
 const lines=paths.map(path=>path.points),height=(x,y)=>world.surfaceElevation?world.surfaceElevation(x,y):world.elevation(x,y);
 const atPath=(x,y)=>typeof data.safePathDistance==='function'?data.safePathDistance(x,y):distanceToLines(x,y,lines);
 const box=(x,y,z,w,d,h,color=0x88918d,kind=0,angle=0)=>hardware.box([x,z+h/2,y],[w,h,d],color,[0,angle,0],kind);
 const beam=(a,b,r=3,color=0x6e7c79,kind=0)=>hardware.beam([a.x,a.z,a.y],[b.x,b.z,b.y],r,color,kind);
 function rock(x,y,z,rx,ry,rz,seed){
  // Clearance accounts for the entire eroded mesh plus the mech's body, not
  // merely the boulder's center. Decorative stone never narrows the safe road.
  if(atPath(x,y)<Math.max(rx,ry,rz*.15)*1.3+82)return;
  const g=erodedStone(seed);g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,z,y),new T.Quaternion().setFromEuler(new T.Euler(.05*Math.sin(seed),seed*.71,.07*Math.cos(seed))),new T.Vector3(rx,rz,ry)));rockParts.push(g);
 }
 function lamp(x,y,amber=false,size=1){lamps.add({x,y,z:height(x,y),height:58*size,color:amber?0xe8c18f:0xa4e8bb,seed:lights.length,groundAt:height});lights.push({x,y});}

 // Worn footways follow the actual collision surface. Their modest width leaves
 // visual room to choose the conspicuous, unstable shortcuts beside them.
 for(const path of paths){
  if(path.safe===false)continue;
  if(path.id!=='bridge')pathParts.push(ribbon(path.points,(x,y,d)=>(path.width||76)*(1.04+.08*Math.sin(d*.026)+.06*Math.sin(d*.073)),(x,y)=>height(x,y)+.8,18));
  if(!['ridge','valley'].includes(path.id))continue;
  let n=0;for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length;
   for(let d=310;d<length;d+=670){const x=a.x+(b.x-a.x)*d/length,y=a.y+(b.y-a.y)*d/length;if(data.sample?.(x,y)?.kind==='water')continue;const side=n++%2?1:-1;lamp(x+nx*((path.width||76)*.5+23)*side,y+ny*((path.width||76)*.5+23)*side,true,.65);}
  }
 }

 // The river uses a continuous ribbon with the same centerline and water level
 // as the physical riverbed. Small world-space waves move light, never collision.
 let water=null;
 if(data.river){
  const r=data.river,points=(r.points||[]).map(asPoint),width=r.width||180,waterLevel=r.waterLevel??r.z??4;
  if(points.length>1){
   const waterMat=new T.MeshStandardMaterial({name:'Mineral river / flowing surface',color:0x264b50,roughness:.43,metalness:0,envMapIntensity:.22,side:T.DoubleSide});
   waterMat.onBeforeCompile=shader=>{
    shader.uniforms.surveyTime=waterUniform;
    shader.vertexShader='varying vec3 riverP; uniform float surveyTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nriverP=position; transformed.y+=sin(position.x*.06+position.z*.025-surveyTime*1.8)*.34+sin(position.z*.09+surveyTime*.9)*.19;');
    shader.fragmentShader='varying vec3 riverP; uniform float surveyTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple=sin(riverP.x*.075+riverP.z*.024-surveyTime*1.8)*sin(riverP.z*.12+surveyTime*.7);float streak=pow(.5+.5*sin(riverP.x*.11+sin(riverP.z*.019)*2.2-surveyTime*.6),14.);diffuseColor.rgb*=.86+ripple*.12+streak*.26;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(riverP.x*.075+riverP.z*.024-surveyTime*1.8)*.065,0.,cos(riverP.z*.12+surveyTime*.7)*.075));');
   };waterMat.customProgramCacheKey=()=> 'k09-survey-river-v79';
   water=new T.Mesh(ribbon(points,width,()=>waterLevel,24),waterMat);water.name='Continuous river / physical centerline';water.receiveShadow=true;root.add(water);
   const foamMaterial=new T.MeshStandardMaterial({color:0x8caaa4,roughness:.8,metalness:0,transparent:true,opacity:.38,depthWrite:false,side:T.DoubleSide});
   const foamParts=[];
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length;
    for(let d=28;d<length;d+=50){const t=d/length,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
     for(const side of [-1,1]){const seed=i*100+d+side,offset=width*(.51+.08*noise(seed)),px=x+nx*offset*side,py=y+ny*offset*side;if(atPath(px,py)<65)continue;
      const z=height(px,py),size=12+noise(seed,2)*22;rock(px,py,z+size*.18,size*1.5,size,size*.46,seed);
      if(noise(seed,5)>.57){const half=8+noise(seed,7)*16;foamParts.push(ribbon([{x:x+nx*width*.44*side,y:y+ny*width*.44*side},{x:x+nx*width*.44*side+(b.x-a.x)/length*half,y:y+ny*width*.44*side+(b.y-a.y)/length*half}],2.5,()=>waterLevel+.6,12));}
     }
    }
   }
   if(foamParts.length){const geometry=mergeGeometries(foamParts);foamParts.forEach(g=>g.dispose());const foam=new T.Mesh(geometry,foamMaterial);foam.name='Riverbank mineral foam';root.add(foam);}
  }
 }

 // Bridge hardware is sized by the same physical deck definition as navigation.
 // No obstruction is placed inside the driving lane.
 if(data.bridge){
  const br=data.bridge,x=br.x,y=br.y,z=br.z??height(x,y),length=br.length||310,width=br.width||130,angle=br.angle||0;
  const at=(along,across,h=0)=>({x:x+Math.cos(angle)*along-Math.sin(angle)*across,y:y+Math.sin(angle)*along+Math.cos(angle)*across,z:z+h});
  const platform=(along,across,w,d,h,color,kind=0,offset=0)=>{const p=at(along,across,offset);box(p.x,p.y,p.z,w,d,h,color,kind,-angle);};
  platform(0,0,length,width,8,0x606d6b,5,-8);
  for(let d=-length/2+12;d<length/2;d+=25)platform(d,0,3,width-8,.9,0x8c9387,8,.15);
  for(const side of [-1,1]){
   const rail=side*(width/2+7);beam(at(-length/2,rail,-13),at(length/2,rail,-13),7,0x596b68);
   for(let d=-length/2;d<=length/2;d+=65){beam(at(d,rail),at(d,rail,50),3.2,0x7f8c83);box(at(d,rail).x,at(d,rail).y,z+43,8,8,6,0xb3b392,8);}
   beam(at(-length/2,rail,48),at(length/2,rail,48),3.2,0x8b9384);
   for(let d=-length/2;d<length/2;d+=65)beam(at(d,rail,9),at(Math.min(length/2,d+65),rail,42),2.4,0x63736d);
   for(const d of [-length*.33,length*.33]){const p=at(d,rail,-85);box(p.x,p.y,p.z,18,18,82,0x5b6661);}
  }
  for(const along of [-length/2-36,length/2+36]){const p=at(along,(along<0?-1:1)*(width/2+16));lamp(p.x,p.y,true,.75);}
 }

 // Organic stone detail follows the authored slopes. Large pieces sit well off
 // the path; shallow fragments provide scale without forming invisible walls.
 const bounds=data.bounds;
 if(bounds){let index=0;for(let x=bounds.minX+45;x<bounds.maxX;x+=110)for(let y=bounds.minY+45;y<bounds.maxY;y+=110){
  const seed=index++,px=x+(noise(seed,2)-.5)*65,py=y+(noise(seed,7)-.5)*65,d=atPath(px,py);if(d<100||noise(seed,8)<.42)continue;
  const h=height(px,py),sample=data.sample?.(px,py);if(sample?.kind==='water'||h<(data.river?.waterLevel??-100)+3)continue;
  const slope=Math.hypot(height(px+12,py)-height(px-12,py),height(px,py+12)-height(px,py-12))/24;
  if(slope>.23&&slope<2.5){const size=15+noise(seed,12)*34;rock(px,py,h-size*.21,size*(1.4+noise(seed)),size*.7,size*(.4+noise(seed,4)*.5),seed);}
  else if(noise(seed,11)>.84){const size=5+noise(seed,12)*10;rock(px,py,h,size*1.6,size,size*.35,seed);}
 }}

 // Broken ledges sit partly inside the physical cliff surface. These low relief
 // pieces follow its slope; the shared elevation owns the large ridge shape.
 // Keep their full footprint outside safe trails and avoid a regular pillar grid.
 if(bounds){let index=0;for(let x=bounds.minX+80;x<bounds.maxX;x+=155)for(let y=data.river.points[0].y+280;y<bounds.maxY;y+=145){
  const seed=4200+index++,px=x+(noise(seed,1)-.5)*104,py=y+(noise(seed,4)-.5)*100;
  if(noise(seed,7)<.40||atPath(px,py)<220)continue;
  const z=height(px,py),dx=(height(px+18,py)-height(px-18,py))/36,dy=(height(px,py+18)-height(px,py-18))/36,slope=Math.hypot(dx,dy);
  if(slope<.6||slope>5||z<90)continue;
  const size=28+noise(seed,8)*43;
  rock(px,py,z-size*.35,size*1.55,size*.65,size*.75,seed);
  if(noise(seed,3)>.50){const downhill=1/(slope||1),tx=px-dx*downhill*60,ty=py-dy*downhill*60;rock(tx,ty,height(tx,ty)+5,size*.6,size*.35,size*.25,seed+8);}
 }}

 // A real, dark recess and eroded vault make the survey cave readable from the
 // approach. Its interaction point remains in the clear apron in front.
 if(data.cave){
  const c=data.cave,angle=c.angle??Math.PI,ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux,z=height(c.x,c.y),center={x:c.x+ux*72,y:c.y+uy*72},positions=[],uvs=[],indices=[];
  const sides=28,depths=5;
  for(let layer=0;layer<=depths;layer++)for(let edge=0;edge<2;edge++)for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI,r=(edge?172:94)*(1+.045*Math.sin(j*2.3+layer*.7)),h=(edge?218:132)*(1+.045*Math.sin(j*1.7)),depth=layer/depths*170;
   const across=Math.cos(a)*r;positions.push(center.x+nx*across+ux*depth,z+Math.sin(a)*h-6,center.y+ny*across+uy*depth);uvs.push(j/sides,layer/depths);
  }
  const row=sides+1,stride=row*2;
  for(let layer=0;layer<depths;layer++)for(let edge=0;edge<2;edge++)for(let j=0;j<sides;j++){const k=layer*stride+edge*row+j;if(edge)indices.push(k,k+stride+1,k+1,k,k+stride,k+stride+1);else indices.push(k,k+1,k+stride+1,k,k+stride+1,k+stride);}
  for(let j=0;j<sides;j++){const k=j;indices.push(k,k+row,k+row+1,k,k+row+1,k+1);}
  const arch=new T.BufferGeometry();arch.setAttribute('position',new T.Float32BufferAttribute(positions,3));arch.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));arch.setIndex(indices);arch.computeVertexNormals();rockParts.push(arch);
  const mouthShape=new T.Shape();mouthShape.moveTo(-93,-7);for(let j=0;j<=20;j++){const a=Math.PI-j/20*Math.PI;mouthShape.lineTo(Math.cos(a)*93,Math.sin(a)*132-7);}mouthShape.closePath();
  const darkness=new T.Mesh(new T.ShapeGeometry(mouthShape),new T.MeshBasicMaterial({color:0x071517,side:T.DoubleSide}));darkness.position.set(center.x+ux*161,z,center.y+uy*161);darkness.rotation.y=Math.PI/2-angle;darkness.name='Survey cave / shadowed interior';root.add(darkness);
  for(const side of [-1,1]){
   const x=center.x+nx*side*149,y=center.y+ny*side*149;rock(x,y,z+49,60,80,91,side+48);
   const q={x:c.x+nx*side*112-ux*20,y:c.y+ny*side*112-uy*20};if(side===1)lamp(q.x,q.y,true,.7);
   beam({x:center.x+nx*side*101,y:center.y+ny*side*101,z:z+1},{x:center.x+nx*side*101,y:center.y+ny*side*101,z:z+67},3,0x72847d);
  }
  for(let i=0;i<4;i++){const x=center.x+ux*(30+i*35),y=center.y+uy*(30+i*35);box(x+nx*82,y+ny*82,z+3,5,5,7,0x699e93,2);}
 }

 // Small survey stakes identify places where the rover can gather evidence.
 // They do not enclose the terrain or advertise the correct classification.
 const observations=[...(data.trainingSamples||[]),...(data.testSamples||[])];
 for(const [i,sample] of observations.entries()){
  const p=sample.observationPoint||sample.observation||sample,x=p.x,y=p.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  const z=height(x,y),side=i%2?1:-1;
  box(x+side*42,y,z,5,5,39,0x6e7d76);box(x+side*42,y,z+27,16,4,11,0xaaa285,8);box(x+side*42,y,z+38,6,6,3,0x9caa91,2);
 }

 const landmarks=(data.landmarks||[]).filter(p=>p.x!==undefined&&p.y!==undefined&&['trailhead','junction'].includes(p.kind));
 const atlas=makeSignAtlas(landmarks.map((p,i)=>({name:p.name,caption:p.caption||`K–09 / SURVEY ${String(i+1).padStart(2,'0')}`})));
 if(atlas){
  const signMat=new T.MeshStandardMaterial({name:'Weathered field route stencils',map:atlas,roughness:.94,metalness:.08,side:T.DoubleSide});
  for(let i=0;i<landmarks.length;i++){
   const p=landmarks[i],x=p.x+60,y=p.y+55,z=height(x,y),angle=p.signAngle??Math.PI/2;
   for(const side of [-1,1]){const dx=Math.cos(angle)*side*49,dy=-Math.sin(angle)*side*49;box(x+dx,y+dy,z,6,6,98,0x6b7771);}
   const g=new T.PlaneGeometry(122,29);const uv=g.attributes.uv;for(let j=0;j<uv.count;j++)uv.setY(j,1-(i+1-uv.getY(j))/landmarks.length);
   const sign=new T.Mesh(g,signMat);sign.position.set(x,z+90,y);sign.rotation.y=angle;sign.castShadow=true;root.add(sign);
  }
 }

 if(rockParts.length){const merged=mergeGeometries(rockParts);rockParts.forEach(g=>g.dispose());const rocks=new T.Mesh(merged,rockMaterial);rocks.name='Eroded strata and riverbank scree';rocks.castShadow=rocks.receiveShadow=true;root.add(rocks);}
 if(pathParts.length){const merged=mergeGeometries(pathParts);pathParts.forEach(g=>g.dispose());const pathsMesh=new T.Mesh(merged,soilMaterial);pathsMesh.name='Survey paths / shared traversable surface';pathsMesh.receiveShadow=true;root.add(pathsMesh);}
 root.add(hardware.finish(),lamps.finish());
 const center={x:(bounds?.minX+bounds?.maxX)/2||5500,y:(bounds?.minY+bounds?.maxY)/2||9400};
 return {root,update(unit,W=world,time=0,reduced=false){root.visible=!W.cave&&!W.interior&&Math.hypot(unit.x-center.x,unit.y-center.y)<6200;if(root.visible)waterUniform.value=reduced?0:time;},dispose(){scene.remove(root);lamps.dispose();const mats=new Set(),textures=new Set();root.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material)});for(const m of mats){if(atlas&&m.map===atlas)textures.add(m.map);m.dispose();}for(const map of textures)map.dispose();}};
}
