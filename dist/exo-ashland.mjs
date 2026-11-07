import * as T from './assets/ev01/three.module.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=45';
import {mergeVertices} from './assets/ev01/BufferGeometryUtils.mjs';
import {GLTFLoader} from './assets/ev01/GLTFLoader.mjs';

export async function loadAshland(){
 const loader=new T.TextureLoader(),names=['ash-color','ash-normal'];
 const [wreck,...maps]=await Promise.all([new GLTFLoader().loadAsync(new URL('./assets/wreck-v1/echo9-orbital-wreck.glb',import.meta.url).href),...names.map(n=>loader.loadAsync(new URL('./assets/ashland-v1/'+n+(n.endsWith('normal')?'-rough.png':'.jpg'),import.meta.url).href))]);
 maps.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(i===0)t.colorSpace=T.SRGBColorSpace;});
 maps[1].userData.normalRough=true;return {wreck:wreck.scene,maps:{...Object.fromEntries(names.map((n,i)=>[n,maps[i]])),'ash-rough':maps[1]}};
}
export function climate(x,y){return .26+.64*Math.exp(-(((x-13400)/3300)**2+((y-8000)/2700)**2));}
const hash=n=>{const x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x)};
const flameVertex=`varying vec2 uvFire;varying float cameraDistance;void main(){uvFire=uv;vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
vec4 view=modelViewMatrix*p;cameraDistance=length(view.xyz);gl_Position=projectionMatrix*view;}`;
const flameFragment=`uniform float time;uniform float smoke;varying vec2 uvFire;varying float cameraDistance;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec2 uv=uvFire;float n=noise(vec2(uv.x*5.,uv.y*7.-time*(smoke>.5?.28:2.3)))+.4*noise(vec2(uv.x*13.,uv.y*16.-time*3.));
float width=mix(.48,.13,uv.y),body=1.-smoothstep(width*.35,width,abs(uv.x-.5)+n*.07);
float a=body*smoothstep(0.,.08,uv.y)*(1.-smoothstep(.35,1.,uv.y+n*.15));
vec3 c=mix(vec3(1.,.09,.008),vec3(1.,.88,.33),pow(1.-uv.y,3.));
if(smoke>.5){float cloud=1.-smoothstep(.12,.56,length((uv-.5)*vec2(1.,.9))+n*.1);a=cloud*(.18+n*.08);c=mix(vec3(.10,.12,.13),vec3(.28,.31,.30),n);}
a*=1.-smoothstep(1500.,3200.,cameraDistance);if(a<.008)discard;gl_FragColor=vec4(c,a);}`;

export function createAshland(scene,assets,metalMaps,W){
 const site=ExoWreckWorld.site,group=new T.Group();group.name='ORPHEUS crash field';scene.add(group);
 const wreck=assets.wreck;wreck.position.set(site.x,site.base,site.y);wreck.scale.setScalar(site.scale);group.add(wreck);
 const materials=new Set();wreck.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material;if(materials.has(m))return;materials.add(m);m.envMapIntensity=.45;m.dithering=true;
  if(/rubble|debris|concrete|stone/i.test(m.name)){m.color.setHex(0x555b59);m.normalMap=assets.maps['ash-normal'];m.roughnessMap=assets.maps['ash-rough'];m.roughness=1;applyPackedPBR(m);return;}
  if(!/light|glass|emiss/i.test(m.name)){const painted=/ivory/i.test(m.name);m.normalMap=metalMaps['panel-normal'];m.roughnessMap=metalMaps['panel-rough'];m.normalScale=new T.Vector2(.065,.065);m.roughness=.95;m.metalness=painted?.18:Math.min(.65,m.metalness);m.envMapIntensity=.20;
   if(painted)m.map=metalMaps['panel-color'];
   m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.68,roughnessFactor);');if(painted)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 plateSample=texture2D(map,vMapUv).rgb;float wear=dot(plateSample,vec3(.2126,.7152,.0722));diffuseColor.rgb*=clamp(.65+wear*.65,.65,1.05);`);};m.customProgramCacheKey=()=> 'wreck-weathered-v32-'+painted;m.needsUpdate=true;}

 applyPackedPBR(m);});
 const original=new T.IcosahedronGeometry(1,3);original.deleteAttribute('normal');const geo=mergeVertices(original,1e-5);original.dispose();const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=.83+.16*Math.sin(x*9+z*5)*Math.cos(y*8)+.08*Math.sin(z*14);pos.setXYZ(i,x*r,y*r*.65,z*r);}geo.computeVertexNormals();
 const rockMat=new T.MeshStandardMaterial({name:'Ashland basalt',map:assets.maps['ash-color'],normalMap:assets.maps['ash-normal'],roughnessMap:assets.maps['ash-rough'],normalScale:new T.Vector2(.5,.5),color:0x69767b,roughness:1,metalness:.08});
 applyPackedPBR(rockMat);const rocks=new T.InstancedMesh(geo,rockMat,160);rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);const dummy=new T.Object3D();
 for(let i=0;i<160;i++){const a=hash(i+1)*Math.PI*2,r=460+hash(i+2)*1100,x=site.x+Math.cos(a)*r,y=site.y+Math.sin(a)*r;let size=8+hash(i+3)*43;
  if(Math.abs(x-site.x)<180&&y<site.y)size*=.2;
  dummy.position.set(x,W.elevation(x,y)-size*.10,y);dummy.rotation.set(hash(i+4),hash(i+5)*7,hash(i+6)*.3);dummy.scale.set(size*(.8+hash(i+7)),size,size*(.8+hash(i+8)));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
 }rocks.instanceMatrix.needsUpdate=true;
 const vents=[];
 for(let i=0;i<12;i++){const a=hash(i+300)*Math.PI*2,r=650+hash(i+301)*850;vents.push({x:site.x+Math.cos(a)*r,y:site.y+Math.sin(a)*r,size:45+hash(i+302)*65,seed:hash(i+303)});}
 for(let i=0;i<20;i++){const a=hash(i+500)*Math.PI*2,r=200+hash(i+501)*1800;vents.push({x:13400+Math.cos(a)*r,y:8000+Math.sin(a)*r,size:50+hash(i+502)*90,seed:hash(i+503)});}
 const fireMat=new T.ShaderMaterial({vertexShader:flameVertex,fragmentShader:flameFragment,uniforms:{time:{value:0},smoke:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
 const smokeMat=fireMat.clone();smokeMat.uniforms.smoke.value=1;smokeMat.blending=T.NormalBlending;
 const quad=new T.PlaneGeometry(1,1),fires=new T.InstancedMesh(quad,fireMat,vents.length*2),smoke=new T.InstancedMesh(quad,smokeMat,vents.length*2);fires.frustumCulled=smoke.frustumCulled=false;fires.instanceMatrix.setUsage(T.DynamicDrawUsage);smoke.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(fires,smoke);
 // Jagged, low-profile charred patches tie each flame to the scanned ground.
 const patches=new T.Group();scene.add(patches);const scorchMat=new T.MeshStandardMaterial({map:assets.maps['ash-color'],color:0x303a3b,roughness:1,polygonOffset:true,polygonOffsetFactor:-2});
 for(const [j,v] of vents.entries()){const vertices=[],uv=[],indices=[],segments=12;vertices.push(v.x,W.elevation(v.x,v.y)+.8,v.y);uv.push(.5,.5);
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,r=v.size*(.9+hash(j*20+i)*.65),x=v.x+Math.cos(a)*r,y=v.y+Math.sin(a)*r;vertices.push(x,W.elevation(x,y)+.8,y);uv.push(Math.cos(a)*.5+.5,Math.sin(a)*.5+.5);if(i)indices.push(0,i+1,i);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,scorchMat);m.receiveShadow=true;patches.add(m);
 }
 const emberPositions=[],emberSeeds=[];
 for(const [i,v] of vents.entries())for(let j=0;j<6;j++){emberPositions.push(v.x+(hash(i*9+j)-.5)*v.size,W.elevation(v.x,v.y)+15,v.y+(hash(i*11+j)-.5)*v.size);emberSeeds.push(hash(i*17+j));}
 const emberGeometry=new T.BufferGeometry();emberGeometry.setAttribute('position',new T.Float32BufferAttribute(emberPositions,3));emberGeometry.setAttribute('seed',new T.Float32BufferAttribute(emberSeeds,1));
 const emberMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`attribute float seed;uniform float time;varying float fade;void main(){float age=fract(time*.18+seed);vec3 p=position+vec3(age*75.,age*(100.+seed*160.),sin(age*4.+seed*9.)*18.);vec4 mv=modelViewMatrix*vec4(p,1.);fade=sin(age*3.14159)*(1.-smoothstep(1200.,2500.,length(mv.xyz)));gl_PointSize=clamp(2300./max(1.,-mv.z),1.,3.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float fade;void main(){float a=(1.-smoothstep(.1,.5,length(gl_PointCoord-.5)))*fade;gl_FragColor=vec4(1.,.35,.04,a);}`,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const embers=new T.Points(emberGeometry,emberMaterial);embers.frustumCulled=false;scene.add(embers);
 const ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3();
 function constrainCamera(target,eye){if(W.cave||Math.hypot(target[0]-site.x,target[1]-site.y)>2100)return eye;wreck.updateMatrixWorld(true);origin.set(target[0],target[2],target[1]);direction.set(eye[0],eye[2],eye[1]).sub(origin);const distance=direction.length();if(distance<.01)return eye;ray.set(origin,direction.normalize());ray.near=0;ray.far=distance+24;const hit=ray.intersectObject(wreck,true)[0];if(!hit)return eye;const t=Math.min(1,Math.max(1,hit.distance-24)/distance);return target.map((v,i)=>v+(eye[i]-v)*t);}
 function update(u,camera,time,reduced=false){const visible=!W.cave;group.visible=visible&&Math.hypot(u.x-site.x,u.y-site.y)<4900;patches.visible=visible;fires.visible=smoke.visible=embers.visible=visible;emberMaterial.uniforms.time.value=reduced?0:time;fireMat.uniforms.time.value=smokeMat.uniforms.time.value=reduced?0:time;let count=0;
  for(const v of vents){if(Math.hypot(v.x-u.x,v.y-u.y)>2800)continue;const z=W.elevation(v.x,v.y);
   for(let j=0;j<2;j++){const phase=v.seed*6+j*2.1,t=reduced?.5:(time*.07+v.seed+j*.5)%1;dummy.quaternion.copy(camera.quaternion);dummy.position.set(v.x+j*12,z+v.size*.58,v.y);dummy.scale.set(v.size*(.75+Math.sin(time*4+phase)*.08),v.size*1.35,1);dummy.updateMatrix();fires.setMatrixAt(count,dummy.matrix);
    dummy.position.set(v.x+Math.sin(phase)*35+t*75,z+v.size*(1.2+t*2.7),v.y+t*30);dummy.scale.set(v.size*(1.5+t*1.8),v.size*(2+t*2.3),1);dummy.updateMatrix();smoke.setMatrixAt(count,dummy.matrix);count++;}
  }fires.count=smoke.count=count;fires.instanceMatrix.needsUpdate=smoke.instanceMatrix.needsUpdate=true;
 }
 return {group,wreck,rocks,fires,smoke,embers,vents,constrainCamera,update,dispose(){scene.remove(group,fires,smoke,embers,patches);emberGeometry.dispose();emberMaterial.dispose();geo.dispose();rockMat.dispose();quad.dispose();fireMat.dispose();smokeMat.dispose();scorchMat.dispose();patches.children.forEach(m=>m.geometry.dispose());}};
}
