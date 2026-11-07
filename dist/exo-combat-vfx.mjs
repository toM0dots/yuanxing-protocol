import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';

const UP=new T.Vector3(0,1,0),IDENTITY=new T.Quaternion();
export const VFX={white:0xe9fbff,cyan:0x42dfff,pink:0xff48c8,amber:0xffae4a,green:0xc1e956,dust:0x72655b};
export const hash=n=>{const q=Math.sin(n*127.1+31.7)*43758.5453;return q-Math.floor(q)};
function missileGeometry(){
 const parts=[],lathe=new T.LatheGeometry([[0,-.5],[.08,-.5],[.11,-.38],[.11,.24],[.075,.39],[0,.5]].map(p=>new T.Vector2(...p)),12);
 parts.push(lathe.toNonIndexed());
 for(let i=0;i<4;i++){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([.08,-.40,0,.24,-.49,0,.08,-.12,0,.08,-.12,0,.24,-.49,0,.08,-.40,0],3));g.computeVertexNormals();g.rotateY(i*Math.PI/2);parts.push(g)}
 const g=mergeGeometries(parts.map(p=>{p.deleteAttribute('uv');return p}),false);parts.forEach(p=>p.dispose());return g;
}
const vertex=`attribute float effectAlpha; varying float vAlpha; varying vec3 vTint; varying vec2 vUv; varying vec3 vNormal;
void main(){vAlpha=effectAlpha;vTint=instanceColor;vUv=uv;vNormal=normalize(mat3(modelViewMatrix)*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const fragment=`uniform float soft;varying float vAlpha;varying vec3 vTint;varying vec2 vUv;varying vec3 vNormal;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){float a=vAlpha;vec3 c=vTint;
 if(soft>.5){vec2 p=vUv-.5;float n=noise(vUv*6.)*.16+noise(vUv*15.)*.07;float d=length(p)*2.;a*=1.-smoothstep(.28,.98,d+n);c*=.72+.28*noise(vUv*5.);}
 else {float facing=abs(vNormal.z);a*=.55+.45*facing;}
 if(a<.008)discard;gl_FragColor=vec4(c,a);}`;

// Fixed-capacity instancing keeps hundreds of particles to eight draw calls.
export function createCombatVFX(scene,name='Combat effects',enhanced=false){
 const group=new T.Group();group.name=name;scene.add(group);const dummy=new T.Object3D(),color=new T.Color(),delta=new T.Vector3(),center=new T.Vector3(),quat=new T.Quaternion();
 const specs={ball:[new T.SphereGeometry(1,10,7),160],beam:[new T.CylinderGeometry(1,1,1,8),240],ring:[new T.TorusGeometry(1,.025,4,40),96],smoke:[new T.PlaneGeometry(1,1),160],missile:[missileGeometry(),32],debris:[new T.IcosahedronGeometry(1,0),96],disc:[new T.CircleGeometry(1,32),64]};
 const buckets={};let peak=0;
 for(const [kind,[geometry,capacity]] of Object.entries(specs)){
  if(!geometry.attributes.uv)geometry.setAttribute('uv',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
  const alpha=new T.InstancedBufferAttribute(new Float32Array(capacity),1);alpha.setUsage(T.DynamicDrawUsage);geometry.setAttribute('effectAlpha',alpha);
  const solid=kind==='missile'||kind==='debris';let material;
  if(solid){material=new T.MeshStandardMaterial({color:0xffffff,roughness:.6,metalness:kind==='missile'?.5:.1});material.userData.skipDepthPrepass=true;material.onBeforeCompile=s=>{s.vertexShader='attribute float effectAlpha;varying float vEffectAlpha;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEffectAlpha=effectAlpha;');s.fragmentShader='varying float vEffectAlpha;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(vEffectAlpha<.06)discard;');};}
  else material=new T.ShaderMaterial({vertexShader:enhanced?('uniform float soft;\n'+vertex.replace('vec4(position,1.)','vec4(vec3(position.x*(soft>2.5&&soft<3.5?.12+.88*sin(uv.y*3.14159265):1.),position.y,position.z*(soft>2.5&&soft<3.5?.12+.88*sin(uv.y*3.14159265):1.)),1.)')):vertex,fragmentShader:enhanced?fragment.replace('if(soft>.5)',`if(soft>3.5){float facing=abs(vNormal.z);a*=pow(facing,1.8);}
 else if(soft>2.5){a*=smoothstep(0.,.12,vUv.y)*(1.-smoothstep(.82,1.,vUv.y));}
 else if(soft>1.5){float d=length(vUv-.5)*2.;a*=pow(max(0.,1.-d),2.4);c=mix(c,vec3(1.),pow(max(0.,1.-d),8.)*.7);}
 else if(soft>.5)`):fragment,uniforms:{soft:{value:kind==='smoke'?1:enhanced?(kind==='disc'?2:kind==='beam'?3:kind==='ball'?4:0):0}},transparent:true,depthWrite:false,blending:kind==='smoke'||kind==='disc'&&!enhanced?T.NormalBlending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
  const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name=kind;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.setColorAt(0,color);mesh.instanceColor.setUsage(T.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=solid;group.add(mesh);buckets[kind]={mesh,alpha,capacity,used:0};
 }
 function put(kind,p,size,tint,opacity=1,q=IDENTITY){const b=buckets[kind];if(!b||b.used>=b.capacity||opacity<=0)return;const i=b.used++;dummy.position.copy(p);dummy.quaternion.copy(q);if(typeof size==='number')dummy.scale.setScalar(size);else dummy.scale.set(size[0],size[1],size[2]);dummy.updateMatrix();b.mesh.setMatrixAt(i,dummy.matrix);b.mesh.setColorAt(i,color.setHex(tint));b.alpha.setX(i,Math.min(1,opacity));}
 function beam(a,b,r,tint,opacity=1){delta.copy(b).sub(a);const length=delta.length();if(length<.001)return;center.copy(a).add(b).multiplyScalar(.5);quat.setFromUnitVectors(UP,delta.divideScalar(length));put('beam',center,[r,length,r],tint,opacity,quat)}
 function ring(p,r,tint,opacity=1,normal=UP){quat.setFromUnitVectors(new T.Vector3(0,0,1),normal);put('ring',p,r,tint,opacity,quat)}
 function smoke(p,size,opacity=.2,tint=VFX.dust,camera=null){put('smoke',p,[size,size,1],tint,opacity,camera?.quaternion||IDENTITY)}
 function glow(p,size,tint,opacity=1,camera=null){put('disc',p,typeof size==='number'?[size,size,1]:size,tint,opacity,camera?.quaternion||IDENTITY)}
 function impact(p,age,duration,seed,tint,scale=1,camera=null,reduced=false){
  const t=T.MathUtils.clamp(age/duration,0,1),fade=1-t;if(t>=1)return;
  if(t<.32){put('ball',p,(5+t*48)*scale,VFX.white,(1-t/.32)*.8);put('ball',p,(10+t*70)*scale,tint,(1-t/.32)*.3)}
  ring(p,(8+t*115)*scale,tint,fade*.6);
  const count=reduced?3:10;
  for(let i=0;i<count;i++){const a=hash(seed+i)*Math.PI*2,r=(25+hash(seed+i+41)*95)*t*scale,v=new T.Vector3(Math.cos(a)*r,(20+hash(seed+i+55)*85)*t*scale-t*t*65*scale,Math.sin(a)*r),tip=p.clone().add(v);beam(tip.clone().addScaledVector(v,-.12*fade),tip,1.1*scale,tint,fade);if(i<4)put('debris',tip,[2*scale,3*scale,4*scale],0x5d5951,fade);}
  if(!reduced)for(let i=0;i<4;i++){const a=i*2.4+seed;smoke(p.clone().add(new T.Vector3(Math.cos(a)*t*22*scale,(5+t*45)*scale,Math.sin(a)*t*22*scale)),(12+t*68)*scale,fade*.23,0x4b4a48,camera);}
 }
 return {group,buckets,put,beam,ring,smoke,glow,impact,begin(){for(const b of Object.values(buckets))b.used=0;},end(){let total=0;for(const b of Object.values(buckets)){b.mesh.count=b.used;b.mesh.visible=b.used>0;b.mesh.instanceMatrix.needsUpdate=true;b.mesh.instanceColor.needsUpdate=true;b.alpha.needsUpdate=true;total+=b.used;}peak=Math.max(peak,total);},get peak(){return peak},get capacity(){return Object.values(buckets).reduce((n,b)=>n+b.capacity,0)},get draws(){return Object.values(buckets).filter(b=>b.used).length},dispose(){scene.remove(group);for(const b of Object.values(buckets)){b.mesh.geometry.dispose();b.mesh.material.dispose();b.mesh.dispose();}}};
}
