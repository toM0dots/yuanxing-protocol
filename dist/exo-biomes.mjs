import * as T from './assets/ev01/three.module.mjs';
import {biomeTextures} from './exo-biome-textures.mjs?v=20261107-loading90';
import {treeGeometry,grassGeometry,understoryGeometry,floraRandom as rand} from './exo-flora-meshes.mjs?v=20261107-vegetation88';
import {indexExactGeometry,createInstanceCuller} from './exo-render-optimization.mjs?v=20261107-performance89';

function plantMaterial(material,clock,{wind=0,wood=false,ground=false,focus=null}={}){
 material.userData.skipDepthPrepass=true;material.alphaToCoverage=true;
 material.onBeforeCompile=s=>{
  s.uniforms.floraTime=clock;if(focus)s.uniforms.floraFocus=focus;
  s.vertexShader='attribute float groveFade;attribute float barkPale;varying float groveOpacity;varying float paleBark;varying vec3 plantWorld;uniform float floraTime;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
groveOpacity=groveFade;paleBark=barkPale;
plantWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;
float windPhase=floraTime*1.15+plantWorld.x*.017+plantWorld.z*.009;
float bend=${ground?'min(1.,position.y/14.)':'smoothstep(.25,1.05,position.y)'};
transformed.x+=${wind.toFixed(4)}*bend*(sin(windPhase)+.35*sin(windPhase*1.7+position.y*3.));
transformed.z+=${(wind*.45).toFixed(4)}*bend*sin(windPhase*.79+1.3);`);
  s.fragmentShader=(focus?'uniform vec3 floraFocus;':'')+'varying float groveOpacity;varying float paleBark;varying vec3 plantWorld;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>

float plantFade=groveOpacity${ground?'*(1.-smoothstep(760.,1150.,distance(cameraPosition.xz,plantWorld.xz)))':''};
${focus?`// Keep branches touching the lens from filling the frame, then open a
// narrow sightline to the pilot. Distant crowns keep their silhouettes.
plantFade*=smoothstep(22.,115.,distance(cameraPosition,plantWorld));
vec3 sight=floraFocus-cameraPosition;float sightLength=max(1.,length(sight));vec3 sightDirection=sight/sightLength;
float sightT=dot(plantWorld-cameraPosition,sightDirection)/sightLength;
vec3 sightRight=normalize(cross(sightDirection,vec3(0.,1.,0.))+vec3(.00001,0.,0.));vec3 sightUp=cross(sightRight,sightDirection);
vec3 sightOffset=plantWorld-cameraPosition-sight*sightT;
vec2 sightScreen=vec2(dot(sightOffset,sightRight)/(8.+abs(sightT)*52.),dot(sightOffset,sightUp)/(8.+abs(sightT)*80.));
if(sightT>.015&&sightT<.98)plantFade*=smoothstep(.72,1.30,length(sightScreen));`:''}
if(plantFade<.01)discard;
diffuseColor.a*=plantFade;`);
  // Ground blades use upward diffuse normals on both faces, preventing the
  // reverse side from turning into black spikes under the hemisphere light.
  if(ground)s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal*=faceDirection;');
  if(wood)s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float barkScar=smoothstep(.86,.97,sin(plantWorld.y*.37+sin(plantWorld.x*.25)*1.8)*.5+.5);
vec3 birch=mix(vec3(.62,.63,.54),vec3(.19,.21,.17),barkScar*.75);
diffuseColor.rgb=mix(diffuseColor.rgb,birch*(.78+.22*diffuseColor.r),paleBark*.90);
float dampFoot=0.;
#ifdef USE_MAP
dampFoot=1.-smoothstep(0.,32.,vMapUv.y*12.);
#endif
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.68,.82,.58),dampFoot*.14);`);
  else s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
diffuseColor.rgb*=vec3(.88,1.02,.87);`);
 };
 material.customProgramCacheKey=()=>`flora-v92-lens-${wind}-${wood}-${ground}`;
}

export function createBiomes(scene,W,maps={}){
 const root=new T.Group();root.name='Natural woodland / mixed canopy, clearings and meadow';scene.add(root);
 const tex=biomeTextures(),clock={value:0},focus={value:new T.Vector3()},atlas=maps['foliage-atlas']||tex.leaves;
 atlas.minFilter=T.LinearMipmapLinearFilter;atlas.magFilter=T.LinearFilter;atlas.anisotropy=4;
 const bark=new T.MeshStandardMaterial({name:'Woodland / scanned bark and birch scars',color:0xc6c0a9,roughness:1,map:maps['bark-color']||null,normalMap:maps['bark-normal']||null,normalScale:new T.Vector2(.55,.55),roughnessMap:maps['bark-roughness']||null,vertexColors:true});
 const foliage=new T.MeshStandardMaterial({name:'Woodland / botanical leaf and needle cutouts',map:atlas,color:0xe4e8cf,alphaTest:.38,side:T.DoubleSide,roughness:.89,metalness:0,vertexColors:true,emissive:0x20291a,emissiveIntensity:.20});
 const grassMat=new T.MeshStandardMaterial({name:'Meadow / fine curved blades and seed heads',color:0x819560,roughness:.95,side:T.DoubleSide,vertexColors:true});
 const underMat=foliage.clone();underMat.name='Woodland / ferns and loose understory';
 plantMaterial(bark,clock,{wood:true,focus});plantMaterial(foliage,clock,{wind:.0045,focus});plantMaterial(grassMat,clock,{wind:.65,ground:true});plantMaterial(underMat,clock,{wind:.32,ground:true});
 function instance(geo,material,count,name,shadow=false){const m=new T.InstancedMesh(indexExactGeometry(geo),material,count);m.geometry.setAttribute('groveFade',new T.InstancedBufferAttribute(new Float32Array(count).fill(1),1));m.name=name;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.castShadow=shadow;m.receiveShadow=true;m.count=0;root.add(m);return m;}
 const sets=Array.from({length:8},(_,i)=>{const g=treeGeometry(i);return {wood:instance(g.wood,bark,240,'Woodland / '+g.species+' trunk '+i,true),leaf:instance(g.leaf,foliage,240,'Woodland / '+g.species+' canopy '+i)};});
 const treeBounds=sets.map(s=>{s.wood.geometry.computeBoundingBox();s.leaf.geometry.computeBoundingBox();return s.wood.geometry.boundingBox.clone().union(s.leaf.geometry.boundingBox).getBoundingSphere(new T.Sphere());});
 const grasses=Array.from({length:3},(_,i)=>instance(grassGeometry(i),grassMat,2200,['Meadow / fine grasses','Meadow / dry seed grasses','Meadow / low broadleaf cover'][i]));
 const fern=instance(understoryGeometry(true),underMat,700,'Woodland / fern colonies'),shrub=instance(understoryGeometry(false),underMat,500,'Woodland / regenerating shrubs');
 const groundMeshes=[...grasses,fern,shrub],groundCuller=createInstanceCuller(false,{radiusPadding:2,maxDistance:1150}),dummy=new T.Object3D(),color=new T.Color(),view=new T.Frustum(),projection=new T.Matrix4(),bound=new T.Sphere(),groundCache=new Map();let key='',records=[],currentUnit=null;
 function dirty(m,bounds=false){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.geometry.attributes.groveFade.needsUpdate=true;if(bounds)m.computeBoundingSphere();}
 function cull(camera,shadowFrustum=null){if(!root.visible||!camera||!currentUnit)return;const u=currentUnit;
  camera.updateMatrixWorld();view.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  for(const set of sets)for(const m of Object.values(set))m.count=0;
  for(const r of records){const t=r.tree,cx=t.x,cz=t.y;r.opacity=1;bound.copy(r.bound);bound.radius+=4;
   const inView=view.intersectsSphere(bound);if(!inView&&!shadowFrustum?.intersectsSphere(bound))continue;
   const horizon=1-T.MathUtils.smoothstep(Math.hypot(cx-u.x,cz-u.y),2100,2800);
   for(const m of Object.values(sets[t.variant])){if(m===sets[t.variant].leaf&&!inView)continue;const i=m.count++;if(i>=m.instanceMatrix.count){m.count=m.instanceMatrix.count;continue;}m.setMatrixAt(i,r.matrix);m.setColorAt(i,r.color);m.geometry.attributes.groveFade.setX(i,r.opacity*horizon);}
  }
  for(const set of sets)for(const m of Object.values(set)){m.frustumCulled=false;dirty(m);}
  // These plants cast no shadows. Drop only instances outside the view or
  // entirely beyond the shader's existing fade, with room for wind movement.
  groundCuller.prepare(camera);for(const m of groundMeshes)groundCuller.cull(m);
 }
 function allowed(x,y,padding=0){return !(typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.influence(x,y)>.65)&&W.roadDistance(x,y)>70+padding&&!W.structures.some(s=>Math.abs(x-s.x)<s.w/2+65+padding&&Math.abs(y-s.y)<s.d/2+65+padding)&&!W.landmarks.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+35+padding)&&!(typeof ExoTrainingGround!=='undefined'&&ExoTrainingGround.reserved(x,y,25+padding))&&!(typeof ExoTerrainWilds!=='undefined'&&ExoTerrainWilds.reserved(x,y,25+padding));}
 function groundTile(gx,gy){const k=gx+','+gy;if(groundCache.has(k))return groundCache.get(k);const plants=[],x=gx*75,y=gy*75,b=W.biome(x+37,y+37);if(b.grass>.055&&W.slope(x+37,y+37)<.72){
   for(let j=0;j<7;j++){const seed=gx*1723+gy*47+j*319,xx=x+rand(seed)*75,yy=y+rand(seed+7)*75,edge=T.MathUtils.smoothstep(W.roadDistance(xx,yy),70,205),density=b.grass*(.93-.56*b.woods)*(.25+.75*b.patch)*edge;
    if(rand(seed+13)>density||!allowed(xx,yy))continue;const type=rand(seed+17)<.22+b.dry*.45?1:rand(seed+21)<.22?2:0;
    plants.push({x:xx,y:yy,z:W.elevation(xx,yy)-.35,type,scale:.65+rand(seed+11)*.70,angle:rand(seed+3)*Math.PI*2,seed});
   }
   const seed=gx*3181+gy*733;if(rand(seed+5)<b.woods*.42){const xx=x+rand(seed+19)*75,yy=y+rand(seed+27)*75;if(allowed(xx,yy,45))plants.push({x:xx,y:yy,z:W.elevation(xx,yy)-.7,type:rand(seed+13)<.70?3:4,scale:.55+rand(seed+31)*1.10,angle:rand(seed+33)*Math.PI*2,seed});}
  }
  if(groundCache.size>1800)groundCache.delete(groundCache.keys().next().value);groundCache.set(k,plants);return plants;
 }
 function update(u,camera,time=0,reduced=false){currentUnit=u;clock.value=reduced?0:time;focus.value.set(u.x,W.elevation(u.x,u.y)+60+(u.altitude||0),u.y);root.visible=!W.cave&&!W.interior;if(!root.visible)return;const k=Math.floor(u.x/250)+','+Math.floor(u.y/250);if(k===key)return;key=k;records=[];
  for(const set of sets)for(const m of Object.values(set))m.count=0;
  for(const t of W.nearbyTrees(u.x,u.y,5)){const set=sets[t.variant];if(set.wood.count>=240)continue;dummy.position.set(t.x,t.z-1.5,t.y);dummy.rotation.set(0,t.angle,0);dummy.scale.set(t.h*t.width,t.h,t.h*t.width);dummy.updateMatrix();const c=new T.Color().setHSL(.18+rand(t.seed)*.06,.10+rand(t.seed+7)*.09,.72+rand(t.seed+11)*.14);records.push({tree:t,matrix:dummy.matrix.clone(),bound:treeBounds[t.variant].clone().applyMatrix4(dummy.matrix),color:c,opacity:1});for(const m of Object.values(set)){m.setMatrixAt(m.count,dummy.matrix);m.setColorAt(m.count,c);m.geometry.attributes.groveFade.setX(m.count,1);m.count++;}}
  for(const set of sets)for(const m of Object.values(set))dirty(m,true);
  for(const m of groundMeshes)m.count=0;const gx=Math.floor(u.x/75),gy=Math.floor(u.y/75);
  for(let x=gx-17;x<=gx+17;x++)for(let y=gy-17;y<=gy+17;y++)for(const p of groundTile(x,y)){const m=groundMeshes[p.type];if(m.count>=m.instanceMatrix.count)continue;dummy.position.set(p.x,p.z,p.y);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();m.setMatrixAt(m.count,dummy.matrix);m.setColorAt(m.count,color.setHSL(.18+rand(p.seed+5)*.08,.13+rand(p.seed+9)*.12,.63+rand(p.seed+8)*.20));m.geometry.attributes.groveFade.setX(m.count,1);m.count++;}
  groundMeshes.forEach(m=>dirty(m,true));
 }
 return {root,sets,grass:grasses[0],grasses,fern,shrub,update,cull};
}
