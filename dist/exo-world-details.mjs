import {biomeTextures} from './exo-biome-textures.mjs?v=20261107-loading90';
import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries,mergeVertices} from './assets/ev01/BufferGeometryUtils.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=59';
import {exteriorDetailKit,EXTERIOR,weatherExteriorMaterial} from './exo-exterior-kit.mjs?v=20261106-exterior86';

export function scannedMaterial(textures,{vertexColors=false,color=0xc6c5b8,ground=false,vegetation=true}={}){
 const material=new T.MeshStandardMaterial({name:ground?'Scanned terrain':'Scanned stones',color,vertexColors,roughness:.93,metalness:.035});
 const habitat=typeof ExoWorld!=='undefined'?ExoWorld.landmarks?.find(p=>p.region===3):null,summit=typeof ExoWorld!=='undefined'?ExoWorld.landmarks?.find(p=>p.region===7):null;
 material.onBeforeCompile=s=>{Object.assign(s.uniforms,{habitatCenter:{value:new T.Vector2(habitat?.x||8250,habitat?.y||8500)},summitCenter:{value:new T.Vector2(summit?.x||17600,summit?.y||2550)},worldGrass:{value:textures['grass-color']||biomeTextures().grass},worldGrassRelief:{value:textures['grass-height']||biomeTextures().grass},worldForest:{value:textures['forest-color']||textures['trail-diff']},worldForestRelief:{value:textures['forest-height']||textures['trail-diff']},worldRock:{value:textures['rock-diff']},worldDirt:{value:textures['trail-diff']},worldHeight:{value:textures['rock-height']},worldAsh:{value:textures['ash-color']||textures['trail-diff']}});
  s.vertexShader=(ground&&vegetation?'attribute float roadCoverage;':'')+'varying float surfaceRoad;varying vec3 surfaceP; varying vec3 surfaceN;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
surfaceRoad=${ground&&vegetation?'roadCoverage':'1.0'};
vec4 terrainVertex=vec4(position,1.0);vec3 terrainNormal=normal;
#ifdef USE_INSTANCING
terrainVertex=instanceMatrix*terrainVertex;terrainNormal=mat3(instanceMatrix)*terrainNormal;
#endif
surfaceP=(modelMatrix*terrainVertex).xyz;surfaceN=normalize(mat3(modelMatrix)*terrainNormal);`);
  s.fragmentShader='varying float surfaceRoad;varying vec3 surfaceP; varying vec3 surfaceN; uniform vec2 habitatCenter; uniform vec2 summitCenter; uniform sampler2D worldGrass; uniform sampler2D worldGrassRelief; uniform sampler2D worldForest; uniform sampler2D worldForestRelief; uniform sampler2D worldRock; uniform sampler2D worldDirt; uniform sampler2D worldHeight; uniform sampler2D worldAsh;\n'+s.fragmentShader;
  // Scan RGB already contains the material albedo. The old biome color was a
  // second full albedo multiplier, crushing the visible mineral detail.
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#ifdef USE_COLOR_ALPHA
diffuseColor*=vec4(mix(vec3(.72),vColor.rgb*2.4,.25),vColor.a);
#elif defined(USE_COLOR)
diffuseColor.rgb*=mix(vec3(.72),vColor*2.4,.25);
#endif`);
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec3 tw=pow(abs(normalize(surfaceN)),vec3(4.0));tw/=max(.0001,tw.x+tw.y+tw.z);vec3 tp=surfaceP/57.0;
// Offset, compress and resample the scan on vertical faces. A single repeated
// projection produced conspicuous columns across an entire cliff face.
vec2 sideX=vec2(tp.z*.51+sin(tp.y*.31)*.13,tp.y*1.15);
vec2 sideZ=vec2(tp.x*.51+sin(tp.y*.29+1.)*.13,tp.y*1.15);
vec4 rockX=mix(texture2D(worldRock,sideX),texture2D(worldRock,sideX.yx*1.71+vec2(.37,.19)),.42);
vec4 rockZ=mix(texture2D(worldRock,sideZ),texture2D(worldRock,sideZ.yx*1.71+vec2(.63,.41)),.42);
vec4 rockTexel=rockX*tw.x+texture2D(worldRock,tp.xz)*tw.y+rockZ*tw.z;vec3 rock=rockTexel.rgb;
vec2 groundUV=surfaceP.xz/58.0;
float macro=.5+.25*sin(surfaceP.x*.0017+sin(surfaceP.z*.0021)*2.)+.25*sin(surfaceP.z*.0031+surfaceP.x*.0007);
vec4 soilTexel=mix(texture2D(worldDirt,groundUV),texture2D(worldDirt,mat2(.8,-.6,.6,.8)*groundUV*.37+vec2(.23,.63)),.35);vec3 soil=soilTexel.rgb;
float wreckZone=1.-smoothstep(650.,2200.,distance(surfaceP.xz,vec2(5500.,6500.)));
float basinZone=1.-smoothstep(1400.,2800.,distance(surfaceP.xz,vec2(13400.,8000.)));
float ashZone=max(wreckZone*.83,basinZone)*smoothstep(.60,.96,abs(surfaceN.y));
vec3 ash=texture2D(worldAsh,surfaceP.xz/48.).rgb;
soil=mix(soil,ash*mix(vec3(.63,.75,.78),vec3(.92,.78,.64),macro),ashZone);
rock=mix(rock,vec3(dot(rock,vec3(.2126,.7152,.0722)))*vec3(.65,.77,.83),basinZone*.8+wreckZone*.2);rock*=mix(.69,1.12,macro);
// Weathering spans the world and every matching loose rock. Tilted mineral beds
// break large cliff faces; grain and damp hollows retain the authored CC0 scans.
float bedPhase=surfaceP.y*.026+sin(surfaceP.x*.009+surfaceP.z*.005)*.32+sin(surfaceP.z*.017)*.13;
float beds=.5+.5*sin(bedPhase+sin(bedPhase*.37)*.9);
float cliff=1.-smoothstep(.38,.83,abs(surfaceN.y));
float seam=1.-smoothstep(.03,.17,abs(sin(bedPhase)));
float brokenBed=.65+.35*smoothstep(.18,.8,macro+rockTexel.a*.25);
rock*=mix(1.,.83+beds*.24-seam*.08*brokenBed,cliff);
rock=mix(rock,vec3(dot(rock,vec3(.2126,.7152,.0722)))*vec3(.88,.97,1.08),cliff*(.24+.12*(1.-macro)));
float sediment=${ground?'smoothstep(.65,.96,abs(surfaceN.y))*.88':'0.0'};
float scanHeight=mix(rockTexel.a,soilTexel.a,sediment);
soil*=mix(vec3(.74,.80,.82),vec3(1.04,.98,.85),macro);
float fineGrain=texture2D(worldDirt,groundUV*3.7).a;
soil*=.90+.17*fineGrain;
float lowWet=(1.-smoothstep(-8.,42.,surfaceP.y))*smoothstep(.52,.94,abs(surfaceN.y));
soil=mix(soil,soil*vec3(.57,.68,.69),lowWet*.56);
// A damp inhabited terrace and exposed cold summit, feathered into the same
// continuous terrain scan. These change albedo only, never traversal heights.
float habitatZone=1.-smoothstep(350.,1550.,distance(surfaceP.xz,habitatCenter));
float summitZone=1.-smoothstep(360.,1450.,distance(surfaceP.xz,summitCenter));
float soilL=dot(soil,vec3(.2126,.7152,.0722));
soil=mix(soil,vec3(soilL)*vec3(.64,.82,.77),habitatZone*.75);
rock=mix(rock,vec3(dot(rock,vec3(.2126,.7152,.0722)))*vec3(.66,.80,.84),max(habitatZone*.65,summitZone*.7));
float snow=summitZone*smoothstep(.62,.91,surfaceN.y)*smoothstep(.55,.76,macro)*.72;
soil=mix(soil,vec3(.66,.72,.73)*(.83+.17*fineGrain),snow);
// Moisture collects in connected sheltered valleys. Grass, forest litter,
// ash and alpine stone remain distinct materials, feathered by terrain slope.
float wetMeadow=exp(-pow((surfaceP.x-7600.)/4100.,2.)-pow((surfaceP.z-8300.)/2700.,2.));
float westMeadow=exp(-pow((surfaceP.x-3050.)/3000.,2.)-pow((surfaceP.z-4650.)/3700.,2.));
float eastMeadow=exp(-pow((surfaceP.x-14800.)/2500.,2.)-pow((surfaceP.z-5700.)/1700.,2.));
float burn=exp(-pow((surfaceP.x-5500.)/1300.,2.)-pow((surfaceP.z-6500.)/1500.,2.));
float living=max(max(wetMeadow,westMeadow*.94),eastMeadow*.8)*(1.-burn*.88)*(1.-smoothstep(350.,1000.,surfaceP.y)*.72);
float plantPatch=clamp(.50+.22*sin(surfaceP.x*.0043+sin(surfaceP.z*.0037)*1.8)+.18*sin(surfaceP.z*.0057+surfaceP.x*.0021)+.10*sin(surfaceP.x*.013-surfaceP.z*.009),0.,1.);
float highForest=clamp((surfaceP.y-350.)/650.,0.,1.);
float forest=clamp((wetMeadow*.88+westMeadow*.35+eastMeadow*.30-.25)*1.6*(1.-burn)*(1.-highForest),0.,1.)*(.20+.80*smoothstep(.18,.79,plantPatch));
vec2 plantUV=surfaceP.xz/36.;
vec4 meadow=mix(texture2D(worldGrass,plantUV),texture2D(worldGrass,mat2(.8,-.6,.6,.8)*plantUV*.73+vec2(.31,.71)),.28);
vec3 litter=mix(texture2D(worldForest,plantUV*.82).rgb,texture2D(worldForest,mat2(.6,-.8,.8,.6)*plantUV*.47+vec2(.19,.63)).rgb,.28);
float plantRelief=mix(texture2D(worldGrassRelief,plantUV).r,texture2D(worldForestRelief,plantUV*.82).r,forest*.62);
vec3 livingSoil=mix(meadow.rgb*1.65*mix(vec3(1.02,1.00,.70),vec3(.62,1.16,.57),smoothstep(.35,.85,living))*(.92+.12*plantPatch),litter*vec3(.64,.77,.57),forest*.82);
// Low vegetation continues beyond mature trees. Patchy soil opens gradually
// through grass and scrub; no hard biome boundary or rectangular planting edge.
float grassCover=smoothstep(.065,.72,living*(.78+.22*plantPatch))*smoothstep(.56,.93,surfaceN.y);
grassCover*=1.-smoothstep(0.,1.,surfaceRoad);
soil=mix(soil,livingSoil,grassCover);scanHeight=mix(scanHeight,plantRelief,grassCover*.85);
diffuseColor.rgb*=mix(rock,soil,sediment)*mix(1.18,1.72,smoothstep(.08,.85,scanHeight));`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(.78+sediment*.12+(1.-scanHeight)*.13,.78,1.);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float terrainH=scanHeight*mix(.78,.65,sediment)+cliff*beds*.24;vec3 tx=dFdx(-vViewPosition),ty=dFdy(-vViewPosition);vec3 r1=cross(ty,normal),r2=cross(normal,tx);float det=dot(tx,r1)*faceDirection;normal=normalize(abs(det)*normal-sign(det)*(dFdx(terrainH)*r1+dFdy(terrainH)*r2));`);
  s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
#ifdef USE_FOG
float valleyHaze=smoothstep(900.,4300.,length(vViewPosition))*(1.-smoothstep(150.,780.,surfaceP.y))*.16;
gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,valleyHaze);
#endif`);
 };material.customProgramCacheKey=()=>ground?'world-scans-ground-v88-'+vegetation:'world-scans-rock-v88';return material;
}

const hull=new T.MeshStandardMaterial({vertexColors:true,metalness:.32,roughness:.84}),glass=new T.MeshStandardMaterial({name:'Exterior / weathered glazing',vertexColors:true,metalness:.36,roughness:.29,envMapIntensity:1.25}),lights=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false}),mineral=new T.MeshStandardMaterial({vertexColors:true,metalness:.32,roughness:.2,emissive:0x123b36,emissiveIntensity:.4});
weatherExteriorMaterial(glass,{glass:true});
export function configureWorldMaterials(maps){
 hull.map=maps['panel-color'];hull.normalMap=maps['panel-normal'];hull.roughnessMap=hull.normalMap;hull.normalScale=new T.Vector2(.35,.35);hull.roughness=.88;hull.envMapIntensity=.65;
 const compile=hull.onBeforeCompile;hull.onBeforeCompile=s=>{compile(s);s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','vec3 scan=texture2D(map,vMapUv).rgb;diffuseColor.rgb*=clamp(.60+sqrt(max(0.,dot(scan,vec3(.2126,.7152,.0722))))*1.5,.65,1.18);');};
 hull.customProgramCacheKey=()=> 'world-scanned-architecture-v86';hull.userData.minimumRoughness=.62;applyPackedPBR(hull);weatherExteriorMaterial(hull);hull.needsUpdate=true;
}
hull.onBeforeCompile=s=>{s.vertexShader='varying vec3 plateP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nplateP=position;');s.fragmentShader='varying vec3 plateP;\nfloat plateNoise(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float wear=.5+.25*sin(plateP.x*.53+plateP.z*.37)*sin(plateP.y*.41)+.25*sin(plateP.x*1.2+plateP.y*.67+plateP.z*.93);float stain=smoothstep(.55,.96,.5+.25*sin(plateP.x*.017+sin(plateP.z*.012)*2.)+.25*sin(plateP.y*.023+plateP.z*.008));diffuseColor.rgb*=.94+.07*wear-stain*.07;`);s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+stain*.25+wear*.08,0.0,1.0);');};hull.customProgramCacheKey=()=> 'weathered-architecture-v28';
export function builder(textureScale=1){const bins=[[],[],[],[]];
 function add(g,pos,size,color,rot=[0,0,0],kind=0){if(g.index){const original=g;g=g.toNonIndexed();original.dispose();}g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...size)));const positions=g.attributes.position,normals=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<positions.count;i+=3){const nx=Math.abs(normals.getX(i)+normals.getX(i+1)+normals.getX(i+2)),ny=Math.abs(normals.getY(i)+normals.getY(i+1)+normals.getY(i+2)),nz=Math.abs(normals.getZ(i)+normals.getZ(i+1)+normals.getZ(i+2));for(let j=i;j<i+3;j++){const x=positions.getX(j),y=positions.getY(j),z=positions.getZ(j);uv.setXY(j,(ny>=nx&&ny>=nz?x:nx>=nz?z:x)*textureScale/65,(ny>=nx&&ny>=nz?z:y)*textureScale/65);}} const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(a,3));bins[kind].push(g);}
 const box=(p,s,c,r=[0,0,0],k=0)=>add(new T.BoxGeometry(1,1,1),p,s,c,r,k),cylinder=(p,s,c,r=[0,0,0],k=0)=>add(new T.CylinderGeometry(1,1,1,20),p,s,c,r,k),sphere=(p,s,c,k=0)=>add(new T.SphereGeometry(1,20,14),p,s,c,[0,0,0],k);
 function beam(a,b,r,color){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,[0,0,0],[1,1,1],color);}
 function finish(){const group=new T.Group();for(let i=0;i<bins.length;i++)if(bins[i].length){const merged=mergeGeometries(bins[i]);bins[i].forEach(g=>g.dispose());const mesh=new T.Mesh(merged,[hull,glass,lights,mineral][i]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}return group;}
 return {add,box,cylinder,sphere,beam,finish};
}

export function createBuilding(original){const scale=original.visualScale||1,s={...original,w:original.w/scale,d:original.d/scale,h:original.h/scale};const b=builder(scale),{box,cylinder,sphere,beam}=b,w=s.w,d=s.d,h=s.h,ivory=EXTERIOR.ivory,dark=EXTERIOR.dark,steel=EXTERIOR.steel,accent=EXTERIOR.amber,e=exteriorDetailKit(b.add);
 // A buried footing with irregular repairs, rather than an exposed display plinth.
 e.round([0,-12,0],[w+19,25,d+20],0x737c78,6);
 for(const side of [-1,1])for(let i=0;i<5;i++){const z=-d/2+23+i*(d-46)/4;box([side*(w/2+4),4,z],[9,12,34+(i%2)*8],i%3?0x7b8178:0x525f5d);}
 for(const x of [-w*.32,w*.29]){box([x,1,d/2+9],[35,2,20],dark);for(let j=0;j<7;j++)box([x-15+j*5,2.4,d/2+9],[1.2,1,18],steel);}
 if(['hangar','mining','lift'].includes(s.type)){
  box([-w/2,h/2,0],[18,h,d],ivory);box([w/2,h/2,0],[18,h,d],ivory);box([0,h/2,-d/2],[w,h,18],0x778e99);
  // Rear service elevation is visible from the proving ground. Give it the
  // same construction detail as the entrance without changing the wall envelope.
  const rear=-d/2-13,bays=6,bayWidth=w/bays;
  box([0,12,rear-3],[w+12,24,14],dark);
  for(let i=0;i<bays;i++){
   const x=-w/2+(i+.5)*bayWidth;
   box([x,h*.43,rear],[bayWidth-5,h*.72,5],i%2?0x73858b:0x869397);
   for(const side of [-1,1])box([x+side*(bayWidth/2-3),h*.46,rear-5],[3,h*.86,8],dark);
   box([x,h*.80,rear-5],[bayWidth-14,h*.10,5],0x263c46);
   for(let k=0;k<5;k++)box([x,h*.765+k*h*.017,rear-9],[bayWidth-17,1.6,4],0x647b82);
   box([x,h*.22,rear-4],[bayWidth-17,h*.15,4],0x45565e);
   for(const dx of [-1,1])for(const y of [h*.17,h*.27])cylinder([x+dx*(bayWidth-23)/2,y,rear-7],[1.6,2,1.6],0xa6aca8,[Math.PI/2,0,0]);
   if(i===1||i===4){beam([x,18,rear-15],[x,h*.59,rear-15],3,0x9b9c86);beam([x,h*.59,rear-15],[x+bayWidth*.4,h*.65,rear-15],3,0x9b9c86);}
  }
  for(const y of [h*.34,h*.66])box([0,y,rear-3],[w,3,7],dark);
  box([0,h-8,rear-8],[w+18,12,18],dark);
  for(const x of [-w*.35,w*.35]){box([x,4,rear-21],[bayWidth*1.25,8,44],dark);beam([x,8,rear-36],[x,h*.42,rear-9],4,0x6a7c82);}
  for(const side of [-1,1]){box([side*w*.36,h/2,d/2],[w*.28,h,18],ivory);box([side*w*.22,85,d/2+13],[12,170,14],dark);e.fixture([side*w*.22,129,d/2+23],0,true);
   for(let i=0;i<4;i++){const z=-d/2+25+i*(d-50)/3;box([side*(w/2+12),h*.45,z],[12,h*.9,12],dark);beam([side*(w/2+34),0,z],[side*(w/2+9),h*.7,z],7,0x70828b);e.window([side*(w/2+10),142,z],36,29,side*Math.PI/2);}}
  box([0,h-22,d/2],[w,44,22],dark);e.round([0,h-19,d/2+13],[w*.68,13,6],ivory,3);for(const x of [-w*.28,w*.28])e.fixture([x,h-35,d/2+16]);
  for(let i=0;i<6;i++){e.round([-w/2+(i+.5)*w/6,h,0],[w/6-2,15,d+10],0xa8b2aa,5);box([-w/2+(i+.5)*w/6,h+10,-25],[w/6-10,7,75],dark);for(let j=0;j<5;j++)box([-w/2+(i+.5)*w/6,h+15,-55+j*15],[w/6-14,3,3],0x657b83);}
  for(let i=0;i<5;i++){const x=(i%2?-1:1)*(w*.34),z=-d*.3+Math.floor(i/2)*55;box([x,23,z],[38,46,42],i%2?0x657d75:0x8b6b49);box([x,44,z],[42,5,46],dark);for(const dx of [-14,14])box([x+dx,24,z+23],[3,34,3],ivory);}
  for(let i=-3;i<=3;i++)box([i*20,2,d/2+25],[10,3,22],i%2?dark:accent,[0,.4,0]);
  if(s.type==='mining'){for(const x of [-w/2-8,w/2+8])beam([x,0,-d/2],[x,350,-d/2],10,dark);box([0,350,-d/2],[w+80,24,24],accent);beam([65,350,-d/2],[65,205,-d/2],3,ivory);box([65,200,-d/2],[30,16,30],dark);}
  if(s.type==='lift'){cylinder([0,4,20],[68,8,68],dark);for(let i=0;i<12;i++){const a=i*Math.PI/6;box([Math.cos(a)*65,9,20+Math.sin(a)*65],[13,4,5],0x73eeeb,[0,-a,0],2);}box([0,135,-d/2+13],[100,85,6],0x152332);for(let i=0;i<4;i++)box([-25+i*17,135,-d/2+18],[5,55,2],accent,[0,0,0],2);}
 }else if(s.type==='refinery'){
  for(let i=-1;i<=1;i++){cylinder([i*83,87,0],[49,170,49],ivory);sphere([i*83,173,0],[49,27,49],0x748997);for(const y of [35,90,145])cylinder([i*83,y,0],[51,6,51],dark);box([i*83,80,49],[22,70,4],accent);for(let j=0;j<6;j++)box([i*83,59+j*8,52],[16,2,2],dark);beam([i*83,12,0],[i*83,12,100],10,0x6a9da4);}
  box([0,182,-67],[w+20,10,45],dark);for(const x of [-w/2,w/2]){beam([x,190,-85],[x,230,-85],3,ivory);beam([x,190,-47],[x,230,-47],3,ivory);}for(const z of [-85,-47])beam([-w/2,230,z],[w/2,230,z],3,ivory);
  for(let i=0;i<11;i++)box([w/2+15,12+i*16,-70],[24,5,32],ivory);
  for(const z of [-86,-54])beam([w/2+28,0,z],[w/2+28,200,z],3,dark);
  for(let i=-1;i<=1;i++){const x=i*83;beam([x-32,14,38],[x-32,160,38],5,0x5b8b95);beam([x-32,160,38],[x,160,38],5,dark);cylinder([x,202,0],[9,24,9],dark);cylinder([x,215,0],[15,5,15],accent);box([x+24,60,44],[18,28,8],dark);box([x+24,62,49],[11,14,2],0x85d4b9,[0,0,0],2);for(let j=0;j<6;j++)cylinder([x,12+j*30,0],[49.7,1.5,49.7],0x71848d);b.add(new T.TorusGeometry(11,2,6,16),[x,14,93],[1,1,1],accent);beam([x-8,6,93],[x+8,22,93],1.5,dark);beam([x-8,22,93],[x+8,6,93],1.5,dark);}
 }else if(s.type==='observatory'){
  cylinder([0,65,0],[115,130,115],ivory);cylinder([0,135,0],[124,12,124],dark);b.add(new T.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI/2),[0,140,0],[121,121,121],0x9faeb6);
  box([0,65,116],[60,110,8],dark);box([0,118,121],[65,5,5],accent,[0,0,0],2);for(let i=0;i<12;i++){const a=i*Math.PI/6;e.window([Math.cos(a)*115,86,Math.sin(a)*115],33,30,Math.PI/2-a,i===3);}
  cylinder([0,219,-43],[20,140,20],dark,[.7,0,0]);cylinder([0,268,-85],[26,14,26],ivory,[.7,0,0]);cylinder([0,274,-91],[19,4,19],0x4dcbd8,[.7,0,0],1);for(const x of [-80,80])box([x,142,60],[22,10,40],steel);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;for(let j=0;j<5;j++){const u=j*Math.PI/10,v=(j+1)*Math.PI/10;e.beam([Math.sin(a)*122*Math.cos(u),140+122*Math.sin(u),Math.cos(a)*122*Math.cos(u)],[Math.sin(a)*122*Math.cos(v),140+122*Math.sin(v),Math.cos(a)*122*Math.cos(v)],1.7);}}
  e.frame([0,65,122],65,112,ivory,10,5,8);e.fixture([0,125,123]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box([Math.sin(a)*114,19,Math.cos(a)*114],[46,19,3],steel,[0,a,0]);}

 }else if(s.type==='habitat'){
  // Stepped, rounded pressure modules: greenhouse utilities and transport housing.
  e.module([-69,0,0],132,214,98,{warm:true,seed:0});
  e.module([69,0,0],132,214,98,{color:0xb6bdb2,seed:1});
  e.module([-63,101,-35],138,142,96,{warm:true,seed:2});
  e.round([67,103,7],[132,9,209],steel,5);
  e.rail([7,109,111],[132,109,111]);e.rail([132,109,111],[132,109,-85]);
  for(let i=0;i<12;i++){const z=98-i*13;box([111,8+i*8.6,z],[32,4,15],steel);}
  e.beam([126,22,100],[126,126,-45],1.7);e.beam([94,22,100],[94,126,-45],1.7);
  e.pipe([[-131,186,83],[-138,181,83],[-138,35,83],[-126,28,91],[-88,28,91]],3);
  e.valve([-123,29,96],6);
  for(const p of [[-120,205,35],[-42,205,35],[20,111,113],[112,111,45]]){e.round([p[0],p[1]-5,p[2]],[29,12,18],0x5e6962,3);e.ivy(p,37+Math.abs(p[0])*.12,Math.abs(p[0])%7);}
  e.round([-68,86,119],[140,4,28],0x8c978d,2,0,[.08,0,0]);
  for(const x of [-128,-10])e.beam([x,66,109],[x,84,130],1.4);
 }else{
  box([0,65,0],[170,130,140],ivory);for(const side of [-1,1]){box([side*85,70,0],[4,35,100],0x39849c,[0,0,0],1);beam([side*60,130,-40],[side*16,430,-10],8,dark);beam([side*60,130,40],[side*16,430,10],8,dark);for(let i=0;i<5;i++)beam([side*50,150+i*50,-35],[side*22,195+i*50,20],3,0x7899a4);}
  for(let i=0;i<5;i++)box([0,160+i*55,0],[100-i*13,6,75-i*10],dark);sphere([0,435,0],[9,9,9],accent,2);
  for(const x of [-130,130]){box([x,58,0],[90,5,190],dark,[0,0,x<0?.3:-.3]);for(let i=0;i<6;i++)box([x,63,-75+i*30],[83,3,26],0x526c72,[0,0,x<0?.3:-.3],1);}
  b.add(new T.SphereGeometry(1,20,12,0,Math.PI*2,0,.7),[0,310,-25],[65,35,65],ivory,[1,0,0]);beam([0,308,-25],[0,340,-70],3,accent);
 }
 // Mounted service hardware breaks the large side elevations; each site has a
 // different maintenance side, seeded by its persistent facility identifier.
 const handed=s.id.endsWith('1')?-1:1;
 e.pipe([[handed*(w/2+12),h*.79,-d*.32],[handed*(w/2+17),h*.74,-d*.32],[handed*(w/2+17),23,-d*.32],[handed*(w/2+17),17,d*.19]],2.8);
 e.vent([handed*(w/2+11),h*.33,d*.09],45,32,handed*Math.PI/2);
 for(let i=0;i<3;i++){e.round([handed*(w/2+9),h*.57,-d*.24+i*d*.22],[5,h*.19,d*.16],i===1?0xa8ada1:steel,2);}
 if(original.entrance){const x=(original.entrance.x-original.x)/scale,z=(original.entrance.y-original.y)/scale;
  box([x,-1,z],[83,3,69],0x626e6b);
  for(let i=0;i<6;i++)box([x,1,z-28+i*11],[77,1,1.2],dark);
  e.frame([x,33,z],73,69,ivory,12,6,14);e.frame([x,33,z+5],61,58,dark,9,2.3,6);
  e.round([x,69,z-4],[87,7,29],steel,3);e.fixture([x+32,50,z+10],0,true);
  e.round([x-39,23,z],[9,28,12],dark,2);e.fixture([x-39,30,z+7]);
  for(const side of [-1,1]){e.beam([x+side*34,6,z-19],[x+side*34,60,z-3],2);box([x+side*34,3,z-15],[17,6,28],steel);}
 }

 if(original.caveEntrance){const x=(original.caveEntrance.x-original.x)/scale,z=(original.caveEntrance.y-original.y)/scale;box([x,1,z],[60,2,55],0x182d36);for(const side of [-1,1]){box([x+side*24,23,z],[6,46,12],0x657d88);box([x+side*20,25,z+7],[2,37,2],0x5ae5c7,[0,0,0],2);}box([x,48,z],[57,7,12],0x8fa2a9);}
 const group=b.finish();group.scale.setScalar(scale);group.name='Structure_'+s.id;group.position.set(s.x,s.z,s.y);group.userData.structure=original;return group;
}

function rockGeometry(seed){
 // The same buried collision-sized rocks, split into irregular mineral facets.
 // Keep the old envelope and instancing budget; avoid spherical pebble piles.
 const g=new T.IcosahedronGeometry(1,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=.91+.075*Math.sin(x*4.7+seed)*Math.cos(z*4.1-seed)+.045*Math.sin(y*9+x*3);
  const bed=Math.floor((y+1)*3),joint=1+.035*Math.sin(bed*3.4+seed);
  const cutX=Math.sign(x)*Math.pow(Math.abs(x),.72),cutZ=Math.sign(z)*Math.pow(Math.abs(z),.76);
  const ledge=y>.28?.37+(y-.28)*.34+.035*Math.sin(x*11+z*8+seed):y*.88;
  p.setXYZ(i,(cutX*r+y*.14)*joint,ledge,cutZ*r*(.88+.07*Math.sin(x*3+seed)));
 }
 g.computeVertexNormals();
 // Average lighting across neighboring facets without rounding the silhouette.
 // Retaining a little face normal keeps the mineral breaks readable up close.
 const source=g.clone();source.deleteAttribute('normal');source.deleteAttribute('uv');
 const smooth=mergeVertices(source);smooth.computeVertexNormals();
 const smoothP=smooth.attributes.position,smoothN=smooth.attributes.normal,n=g.attributes.normal,byPosition=new Map();
 const key=(a,i)=>[a.getX(i),a.getY(i),a.getZ(i)].map(v=>v.toFixed(4)).join(',');
 for(let i=0;i<smoothP.count;i++)byPosition.set(key(smoothP,i),new T.Vector3().fromBufferAttribute(smoothN,i));
 const normal=new T.Vector3();for(let i=0;i<p.count;i++){const average=byPosition.get(key(p,i));if(average){normal.fromBufferAttribute(n,i).multiplyScalar(.28).addScaledVector(average,.72).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);}}
 source.dispose();smooth.dispose();return g;
}
export function createWorldDetails(scene,textures,{exclude=new Set()}={}){
 const rockMat=scannedMaterial(textures),shapes=Array.from({length:4},(_,i)=>rockGeometry(i*2)),stones=shapes.map(g=>{const m=new T.InstancedMesh(g,rockMat,600);m.castShadow=m.receiveShadow=true;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}),dummy=new T.Object3D(),buildings=new Map();let lastKey='';
 function update(u,world){const prefix=world.cave?.id||'surface',key=prefix+':'+Math.floor(u.x/180)+','+Math.floor(u.y/180);if(key!==lastKey){lastKey=key;const counts=[0,0,0,0],rocks=[...(world.cave?[]:ExoMotion.rocks),...world.rocks(u.x,u.y)];
  function instance(x,y,z,sx,sy,sz,seed,color){const n=Math.abs(seed|0)%4,index=counts[n]++;if(index>=600){counts[n]=600;return;}dummy.position.set(x,z,y);dummy.rotation.set(Math.sin(seed)*.2,seed,Math.cos(seed)*.15);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();stones[n].setMatrixAt(index,dummy.matrix);stones[n].setColorAt(index,new T.Color(color));}
  for(const r of rocks){if(r.authoredEncounter)continue;if(Math.hypot(r.x-u.x,r.y-u.y)>2600)continue;const seed=r.x*.017+r.y*.023,color=world.cave?0x62747a:r.y>6000?0xa4a49c:r.x>9000?0x708d92:0x8e9a9d,z=world.elevation(r.x,r.y);instance(r.x,r.y,z+r.r*.6,r.r*.78,r.r*.85,r.r*.7,seed,color);for(let j=0;j<3;j++){const a=seed+j*2.3,x=r.x+Math.cos(a)*r.r*.6,y=r.y+Math.sin(a)*r.r*.6;instance(x,y,world.elevation(x,y)+r.r*.2,r.r*.38,r.r*.32,r.r*.36,seed+j+1,color);}}
  if(!world.interior)for(let x=Math.floor(u.x/200)-7;x<=Math.floor(u.x/200)+7;x++)for(let y=Math.floor(u.y/200)-7;y<=Math.floor(u.y/200)+7;y++){const seed=Math.abs(Math.sin(x*127.1+y*311.7)*43758.5453)%1,px=x*200+seed*170,py=y*200+(seed*7%1)*170;if(!world.cave&&typeof ExoTrainingGround!=='undefined'&&ExoTrainingGround.reserved(px,py,10))continue;if(world.cave&&!world.inside(px,py,50)||!world.cave&&typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(px,py,3))continue;if(!world.cave&&typeof ExoWreckWorld!=='undefined'){const p=ExoWreckWorld.local(px,py);if(Math.abs(p.x)<8&&p.z> -31&&p.z<23)continue;}if(!world.cave&&world.landmarks?.some(p=>Math.hypot(px-p.x,py-p.y)<p.radius+30))continue;if(!world.cave&&typeof ExoRoadsideEncounter!=='undefined'&&ExoRoadsideEncounter.contains(px,py))continue;const r=3+seed*12;instance(px,py,world.elevation(px,py)+r*.25,r,r*.6,r*.8,seed*100,0x8c8e80);}
  stones.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
 }
 const wanted=new Set();if(!world.cave)for(const s of world.structures){if(exclude.has(s.id)||Math.hypot(s.x-u.x,s.y-u.y)>4700)continue;wanted.add(s.id);if(!buildings.has(s.id)){const group=createBuilding(s);scene.add(group);buildings.set(s.id,group);}}
 for(const [id,g] of buildings)if(!wanted.has(id)){scene.remove(g);g.traverse(o=>o.geometry?.dispose());buildings.delete(id);}
 }
 return {update,stones,buildings,dispose(){for(const m of stones){scene.remove(m);m.geometry.dispose();}rockMat.dispose();for(const g of buildings.values()){scene.remove(g);g.traverse(o=>o.geometry?.dispose());}}};
}
