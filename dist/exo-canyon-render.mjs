import {loadGameModel,loadGameTexture} from './exo-asset-loader.mjs?v=20261107-loading90';
import * as T from './assets/ev01/three.module.mjs';

// Actual Blender vertices with the supplied scans projected in local metres.
export const canyonShader={
 vertex:'varying vec3 canyonPosition; varying vec3 canyonNormal;',
 fragment:`varying vec3 canyonPosition; varying vec3 canyonNormal;
uniform sampler2D canyonDiffuse; uniform sampler2D canyonRough; uniform sampler2D canyonHeight;
uniform float canyonMetres; uniform float canyonRelief; uniform float canyonFeather;
vec3 canyonWeights(){vec3 w=pow(abs(normalize(canyonNormal)),vec3(5.0));return w/max(dot(w,vec3(1.0)),0.0001);}
vec4 canyonSample(sampler2D tex){vec3 p=canyonPosition/canyonMetres;vec3 w=canyonWeights();return texture2D(tex,p.zy)*w.x+texture2D(tex,p.xz)*w.y+texture2D(tex,p.xy)*w.z;}`,
 color:`vec4 canyonTexel=canyonSample(canyonDiffuse);
// Broad mineral deposits and fine scan relief have different spatial scales.
// Reuse the scan alpha for crevice tint; no extra texture samples are needed.
float mineral=.5+.25*sin(canyonPosition.x*.17+sin(canyonPosition.z*.11)*2.)+.25*sin(canyonPosition.z*.23+canyonPosition.y*.14);
float shelf=smoothstep(.45,.93,normalize(canyonNormal).y);
float cavity=mix(.70,1.08,smoothstep(.12,.80,canyonTexel.a));
vec3 stoneTint=mix(vec3(.66,.70,.72),vec3(1.03,.91,.75),mineral);
vec3 dustTint=mix(vec3(.76,.75,.68),vec3(1.06,.98,.82),mineral);
diffuseColor.rgb *= canyonTexel.rgb*mix(stoneTint,dustTint,shelf)*cavity;
float canyonEdge=max(max(abs(canyonPosition.x)-70.0,canyonPosition.z-60.0),-canyonPosition.z-80.0); diffuseColor.a *= mix(1.0,1.0-smoothstep(0.0,20.0,canyonEdge),canyonFeather);`,
 roughness:'float roughnessFactor = clamp(canyonSample(canyonRough).g, 0.48, 1.0);',
 normal:`float canyonH=canyonTexel.a*canyonRelief;
vec3 canyonDx=dFdx(-vViewPosition),canyonDy=dFdy(-vViewPosition);
vec3 canyonR1=cross(canyonDy,normal),canyonR2=cross(normal,canyonDx);
float canyonDet=dot(canyonDx,canyonR1)*faceDirection;
normal=normalize(abs(canyonDet)*normal-sign(canyonDet)*(dFdx(canyonH)*canyonR1+dFdy(canyonH)*canyonR2));`
};
export function applyCanyonShader(shader,uniforms){Object.assign(shader.uniforms,uniforms);shader.vertexShader=canyonShader.vertex+'\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncanyonPosition=position;canyonNormal=normal;');shader.fragmentShader=canyonShader.fragment+'\n'+shader.fragmentShader;for(const [chunk,key] of [['map_fragment','color'],['roughnessmap_fragment','roughness'],['normal_fragment_maps','normal']])shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',canyonShader[key]);}
function surface(textures,prefix,metres,relief){const m=new T.MeshStandardMaterial({color:0xe5dfcf,roughness:1,metalness:.02,side:T.DoubleSide,transparent:prefix==='trail'});m.onBeforeCompile=s=>applyCanyonShader(s,{canyonDiffuse:{value:textures[prefix+'-diff']},canyonRough:{value:textures[prefix+'-rough']},canyonHeight:{value:textures[prefix+'-height']},canyonMetres:{value:metres},canyonRelief:{value:relief*18},canyonFeather:{value:prefix==='trail'?1:0}});m.customProgramCacheKey=()=> 'canyon-triplanar-v53';return m;}
function skirt(material){const p=[],f=[],C=ExoCanyonV2,edges=[[-70,-60,70,-60],[70,-60,70,80],[70,80,-70,80],[-70,80,-70,-60]],steps=70,rings=6;
 for(const [x0,y0,x1,y1] of edges){const start=p.length/3,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),ox=dy/len,oy=-dx/len;for(let r=0;r<=rings;r++)for(let i=0;i<=steps;i++){const x=x0+dx*i/steps+(ox+(i/steps*2-1)*dx/len)*r/rings*20,y=y0+dy*i/steps+(oy+(i/steps*2-1)*dy/len)*r/rings*20,w=C.world(x,y),z=(ExoWorld.elevation(w.x,w.y)-C.baseHeight)/C.scale;p.push(x,z,-y)}for(let r=0;r<rings;r++)for(let i=0;i<steps;i++){const a=start+r*(steps+1)+i;f.push(a,a+steps+2,a+1,a,a+steps+1,a+steps+2)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(f);g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.name='Terrain transition';mesh.receiveShadow=true;return mesh;
}
// Shared with the geometry test so it validates the surface actually rendered,
// including the hangar foundation introduced after the source GLB was authored.
export function conformCanyonFloor(geometry,C,W){
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-38)<31&&Math.abs(p.getZ(i))<24){
  const w=C.world(p.getX(i),-p.getZ(i));p.setY(i,(W.elevation(w.x,w.y)-C.baseHeight)/C.scale);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();return geometry;
}
export async function loadCanyon(onLoaded=()=>{}){const names=['rock-diff','rock-rough','trail-diff','trail-rough'];
 const tracked=(promise,name)=>promise.then(asset=>{onLoaded(name);return asset});
 const [asset,maps]=await Promise.all([tracked(loadGameModel(new URL('./assets/canyon-v2/canyon-equipment-v87.glb',import.meta.url).href),'canyon'),Promise.all(names.map(n=>tracked(loadGameTexture(new URL('./assets/canyon-v2/'+n+(n.endsWith('diff')?'-height.png':'.jpg'),import.meta.url).href),n)))]);
 const textures=Object.fromEntries(names.map((n,i)=>[n,maps[i]]));textures['rock-height']=textures['rock-diff'];textures['trail-height']=textures['trail-diff'];onLoaded('rock-height');onLoaded('trail-height');for(const [name,tex] of Object.entries(textures)){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;if(name.endsWith('diff'))tex.colorSpace=T.SRGBColorSpace}
 const root=asset.scene;root.name='K09 / retained site equipment';root.userData.scans=textures;
 // The entire old geological sheet, including its overlapping floor/skirt,
 // is replaced by the shared streamed terrain, with identical collision height.
 const retired=[];root.traverse(o=>{if(o.isMesh&&['floor','massif','ridge','talus'].includes(o.name))retired.push(o);});
 for(const o of retired){o.removeFromParent();o.geometry.dispose();}
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();});
 root.position.set(ExoCanyonV2.origin.x,ExoCanyonV2.baseHeight,ExoCanyonV2.origin.y);root.scale.setScalar(ExoCanyonV2.scale);root.updateMatrixWorld(true);return root;
}
