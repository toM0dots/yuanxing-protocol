import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {applyPackedPBR} from './exo-packed-materials.mjs?v=59';

/* K–09 industrial material family. Reuses the already loaded Poly Haven CC0
   scans in assets/hangar-v1/provenance.json and canyon-v2/canyon-manifest.json.
   UVs measure physical surface distance; 18 game units correspond to one metre.
   No baked lighting, downloaded media, generated images or per-frame textures. */
export const CAMPUS_SURFACES={armor:0,glass:1,light:2,concrete:3,aggregate:4,deck:5,soil:6,stone:7,paint:8};
export function createCampusMaterials(maps={}){
  const std=(name,options)=>new T.MeshStandardMaterial({name,vertexColors:true,roughness:.83,metalness:.15,envMapIntensity:.55,dithering:true,...Object.fromEntries(Object.entries(options).filter(([,value])=>value!==undefined))});
  const material=[
    std('K09 / weathered painted steel',{map:maps['panel-color'],normalMap:maps['panel-normal'],roughnessMap:maps['panel-rough']||maps['panel-normal'],normalScale:new T.Vector2(.48,.48),metalness:.48,roughness:.84}),
    std('K09 / instrument glass',{metalness:.28,roughness:.24,emissive:0x152426,emissiveIntensity:.25}),
    new T.MeshBasicMaterial({name:'K09 / embedded status light',vertexColors:true,toneMapped:false}),
    std('K09 / cast mineral concrete',{map:maps['rock-diff'],roughnessMap:maps['rock-rough'],bumpMap:maps['rock-height'],bumpScale:.9,metalness:0,roughness:.97}),
    std('K09 / compacted mineral apron',{map:maps['trail-diff'],roughnessMap:maps['trail-rough'],bumpMap:maps['trail-height'],bumpScale:1.35,metalness:0,roughness:.99,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
    std('K09 / worn tread plate',{map:maps['metal-color'],normalMap:maps['metal-normal'],roughnessMap:maps['metal-rough']||maps['metal-normal'],normalScale:new T.Vector2(.7,.7),metalness:.58,roughness:.85}),
    std('K09 / loose survey regolith',{map:maps['trail-diff'],roughnessMap:maps['trail-rough'],bumpMap:maps['trail-height'],bumpScale:1.05,metalness:0,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
    std('K09 / fractured survey bedrock',{map:maps['rock-diff'],roughnessMap:maps['rock-rough'],bumpMap:maps['rock-height'],bumpScale:1.8,metalness:.015,roughness:.94}),
    std('K09 / abraded safety paint',{metalness:.06,roughness:.94,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
  ];
  const mapped=[0,3,4,5,6,7];
  for(const index of mapped){
    const m=material[index];m.userData.minimumRoughness=index===0?.55:index===5?.57:.75;
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 campusP;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncampusP=position;');
      shader.fragmentShader='varying vec3 campusP;\n'+shader.fragmentShader;
      // Normal/roughness are supplied as the existing packed lossless scan.
      // Mineral height is the alpha channel of the packed sRGB color image.
      if(m.bumpMap)shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',T.ShaderChunk.bumpmap_pars_fragment.replace(/texture2D\( bumpMap, ([^)]+) \)\.x/g,'texture2D( bumpMap, $1 ).a'));
      const remap=index===0?`float scanL=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
sampledDiffuseColor.rgb=mix(vec3(scanL),sampledDiffuseColor.rgb,.20)*3.0+vec3(.18);`:
        index===5?`float scanL=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
sampledDiffuseColor.rgb=mix(vec3(scanL),sampledDiffuseColor.rgb,.25)*2.1+vec3(.12);`:
        index===3?`float scanL=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
sampledDiffuseColor.rgb=vec3(.48)+vec3(scanL)*.95;`:
        `sampledDiffuseColor.rgb=sampledDiffuseColor.rgb*1.65+vec3(.055);`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
vec4 sampledDiffuseColor=texture2D(map,vMapUv);
${remap}
diffuseColor.rgb*=sampledDiffuseColor.rgb;
#endif
float campusDust=.5+.5*sin(campusP.x*.031+sin(campusP.z*.019)*2.7)*sin(campusP.z*.027+campusP.y*.014);
float settled=clamp(1.-(campusP.y-18.)/85.,0.,1.)*${index===0?'.22':'.10'};
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.18,1.08,.88),campusDust*.38+settled);
diffuseColor.rgb*=.90+campusDust*.16;`);
    };
    m.customProgramCacheKey=()=>`k09-campus-physical-v73-${index}`;
    applyPackedPBR(m);
  }
  material[8].onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 campusMarkP;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncampusMarkP=position;');
    shader.fragmentShader='varying vec3 campusMarkP;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat wear=fract(sin(dot(floor(campusMarkP.xz*1.7),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.45,1.,smoothstep(.08,.38,wear));');
  };
  material[8].customProgramCacheKey=()=> 'k09-worn-markings-v73';
  return material;
}

export function createCampusBuilder(materials){
  const bins=materials.map(()=>[]),counts=materials.map(()=>0),density=[144,90,40,72,54,42,48,56,40];
  function add(geometry,position,size,color,rotation=[0,0,0],kind=0){
    let g=geometry;if(g.index){g=g.toNonIndexed();geometry.dispose();}
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...size)));
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,scale=density[kind],tone=new T.Color(color),colors=new Float32Array(p.count*3);
    // Assign UV orientation per triangle, not per vertex: bevels otherwise
    // interpolate unrelated axes and smear a scan across every rounded edge.
    for(let i=0;i<p.count;i+=3){const nx=Math.abs(n.getX(i)+n.getX(i+1)+n.getX(i+2)),ny=Math.abs(n.getY(i)+n.getY(i+1)+n.getY(i+2)),nz=Math.abs(n.getZ(i)+n.getZ(i+1)+n.getZ(i+2));for(let j=i;j<i+3;j++){
      const x=p.getX(j),y=p.getY(j),z=p.getZ(j);uv.setXY(j,(ny>=nx&&ny>=nz?x:nx>=nz?z:x)/scale,(ny>=nx&&ny>=nz?z:y)/scale);
      colors.set([tone.r,tone.g,tone.b],j*3);
    }}
    g.setAttribute('color',new T.BufferAttribute(colors,3));bins[kind].push(g);counts[kind]++;
  }
  function roundedBox(w,h,d){
    const radius=Math.min(2.2,Math.min(w,h,d)*.12),g=new T.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,n=g.attributes.normal,half=[w/2,h/2,d/2];
    for(let i=0;i<p.count;i++){
      const raw=[p.getX(i),p.getY(i),p.getZ(i)],point=raw.map((v,k)=>Math.abs(v)<half[k]-.001?Math.sign(v)*(half[k]-radius):v),core=point.map((v,k)=>Math.max(-half[k]+radius,Math.min(half[k]-radius,v))),normal=new T.Vector3(...point.map((v,k)=>v-core[k])).normalize();
      p.setXYZ(i,core[0]+normal.x*radius,core[1]+normal.y*radius,core[2]+normal.z*radius);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    return g;
  }
  function box(position,size,color,rotation=[0,0,0],kind=0){
    const bevel=kind!==2&&kind!==8&&Math.min(...size)>8&&Math.max(...size)>30;
    add(bevel?roundedBox(...size):new T.BoxGeometry(...size),position,[1,1,1],color,rotation,kind);
  }
  const cylinder=(p,s,c,r=[0,0,0],k=0)=>add(new T.CylinderGeometry(1,1,1,16),p,s,c,r,k);
  const sphere=(p,s,c,k=0)=>add(new T.SphereGeometry(1,12,8),p,s,c,[0,0,0],k);
  function beam(a,b,r,color,kind=0){const A=new T.Vector3(...a),B=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,A.distanceTo(B),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());add(g,[0,0,0],[1,1,1],color,[0,0,0],kind);}
  function finish(){const group=new T.Group();bins.forEach((list,i)=>{if(!list.length)return;const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,materials[i]);mesh.name=materials[i].name;mesh.castShadow=![2,4,6,8].includes(i);mesh.receiveShadow=i!==2;mesh.userData.surface=i;mesh.userData.physicalTileSize=density[i];mesh.userData.parts=counts[i];group.add(mesh);});return group;}
  return {add,box,cylinder,sphere,beam,finish};
}
