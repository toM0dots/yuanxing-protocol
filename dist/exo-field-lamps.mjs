import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {createCampusMaterials,createCampusBuilder} from './exo-campus-materials.mjs';
import {partitionStaticMeshes} from './exo-render-optimization.mjs?v=20261107-performance89';

/* Salvaged survey lantern family. The silhouette comes from the existing K09
   approach artwork: battery housing, sealed optical tube, metal cage and handle.
   X/Y are horizontal expedition coordinates; z is the supporting ground height.
   Geometry is batched by material, not one mesh or PointLight per lantern. */
export function createFieldLampBatch(maps={}){
 const inherited=createCampusMaterials(maps),steel=inherited[0];
 inherited.slice(1).forEach(material=>material.dispose());
 steel.name='Field lantern / scuffed enamel and exposed steel';steel.roughness=.63;steel.metalness=.62;steel.envMapIntensity=1.1;
 const steelCompile=steel.onBeforeCompile;
 steel.onBeforeCompile=shader=>{steelCompile(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 // Fine paint loss and scuff lines supplement the shared full-size panel scan.
 vec3 lp=campusP;float chip=fract(sin(dot(floor(lp*5.7),vec3(12.9898,78.233,38.17)))*43758.5453);
 float cut=smoothstep(.992,.999,chip);float scratch=pow(.5+.5*sin(lp.y*3.8+lp.x*.22+lp.z*.14),40.)*step(.76,chip);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.39,.41,.36),cut*.25+scratch*.12);
 `);};steel.customProgramCacheKey=()=> 'field-painted-steel-v81';
 const rubber=new T.MeshStandardMaterial({name:'Field lantern / seals and cable',color:0xffffff,vertexColors:true,roughness:.91,metalness:.03});
 const luminous=new T.MeshStandardMaterial({name:'Field lantern / shielded optical core',color:0xffffff,vertexColors:true,emissive:0x7ca38c,emissiveIntensity:.72,roughness:.38,metalness:.02,envMapIntensity:.45});
 const glass=new T.MeshPhysicalMaterial({name:'Field lantern / ribbed protective glass',color:0xffffff,vertexColors:true,metalness:0,roughness:.24,clearcoat:.85,clearcoatRoughness:.16,transparent:true,opacity:.27,depthWrite:false,envMapIntensity:.85});
 const materials=[steel,rubber,luminous,glass],b=createCampusBuilder(materials),pools=[],fixtures=[];
 let root=null,disposed=false;
 function add({x,y,z=0,height=58,color=0xa4e8bb,seed=0,groundGlow=true,groundAt=null}={}){
  if(root||disposed)throw new Error('Add field lanterns before finishing their batch.');
  if(![x,y,z,height,seed].every(Number.isFinite)||height<=0)throw new Error('Field lantern coordinates and height must be finite.');
  const scale=height/58,yaw=seed*.83,cs=Math.cos(yaw),sn=Math.sin(yaw),tone=new T.Color(color),metal=0x65726a,edge=0x929b8d,seal=0x202d29;
  const at=(a,h,c)=>[x+(a*cs-c*sn)*scale,z+h*scale,y+(a*sn+c*cs)*scale];
  const size=s=>s.map(v=>v*scale);
  const box=(a,h,c,w,d,v,t=metal,k=0)=>b.box(at(a,h,c),size([w,v,d]),t,[0,yaw,0],k);
  const cylinder=(a,h,c,r,l,t=metal,k=0,segments=16,axis=[0,0,0])=>{const g=new T.CylinderGeometry(r,r,l,segments,1);g.applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(...axis)));b.add(g,at(a,h,c),[scale,scale,scale],t,[0,yaw,0],k);};
  const beam=(a,c,r,t=metal,k=0)=>{const A=new T.Vector3(...a),B=new T.Vector3(...c),g=new T.CylinderGeometry(r,r,A.distanceTo(B),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());b.add(g,[x,z,y],[scale,scale,scale],t,[0,yaw,0],k);};
  const ring=(h,r,tube,t=metal,k=0)=>{const g=new T.TorusGeometry(r,tube,4,20);g.rotateX(Math.PI/2);b.add(g,at(0,h,0),[scale,scale,scale],t,[0,yaw,0],k);};
  function casing(a,h,c,w,d,v,t){
   const r=.8,shape=new T.Shape();shape.moveTo(-w/2+r,-v/2);shape.lineTo(w/2-r,-v/2);shape.lineTo(w/2,-v/2+r);shape.lineTo(w/2,v/2-r);shape.lineTo(w/2-r,v/2);shape.lineTo(-w/2+r,v/2);shape.lineTo(-w/2,v/2-r);shape.lineTo(-w/2,-v/2+r);shape.closePath();
   const g=new T.ExtrudeGeometry(shape,{depth:d-1.2,bevelEnabled:true,bevelSize:.6,bevelThickness:.6,bevelSegments:1,steps:1});g.translate(0,0,-(d-1.2)/2);b.add(g,at(a,h,c),[scale,scale,scale],t,[0,yaw,0]);
  }
  // Broad removable battery pack with corner protectors and a recessed service lid.
  box(0,1.8,0,24,20,3.6,seal,1);casing(0,8.4,0,23,18,11.6,metal);
  casing(0,14.8,0,24.5,19.5,3.1,edge);
  for(const side of [-1,1]){box(side*8.5,8.2,0,2.2,19.6,12,seal,1);box(side*9,15.9,0,2.4,16,1.2,0xb2b5a2);}
  box(0,8.4,9.35,12,.8,6.6,seal,1);box(0,8.4,9.85,9,.45,4.3,0x7e8876);
  for(const sx of [-1,1])for(const sy of [-1,1])cylinder(sx*9.6,16.9,sy*6.9,1,1.1,0xb3b8a8,0,6);
  for(const sx of [-1,1])cylinder(sx*9.2,8.1,10.2,.65,1,edge,0,6,[Math.PI/2,0,0]);
  // Cable gland and a short loose service loop tucked inside the base footprint.
  cylinder(12.2,8,0,2.1,3.8,seal,1,12,[0,0,Math.PI/2]);
  const cable=[[13.6,8,0],[14.6,5,2],[11.5,2.4,7.5],[6,2.4,8.5]].map(p=>new T.Vector3(...p));
  b.add(new T.TubeGeometry(new T.CatmullRomCurve3(cable),10,.85,6,false),[x,z,y],[scale,scale,scale],seal,[0,yaw,0],1);
  // Turned socket, rubber O-ring, cast guard flanges and a sealed optical tube.
  cylinder(0,18.6,0,5.8,4.2,metal);cylinder(0,20.9,0,7.8,1.5,seal,1);
  cylinder(0,23,0,10.1,3.1,edge);cylinder(0,25.1,0,8.8,1.6,seal,1);
  const profile=[[0,26],[5.5,26],[6.7,27.2]];
  // Molded annular diffuser ribs break up the cylinder and catch real highlights.
  for(let j=0;j<8;j++)profile.push([6.6,28+j*2.5],[7.1,28.7+j*2.5],[6.65,29.6+j*2.5]);
  profile.push([6.5,48],[5.8,49],[0,49]);
  const opticalProfile=profile.map(p=>new T.Vector2(...p));
  b.add(new T.LatheGeometry(opticalProfile,20),at(0,0,0),[scale,scale,scale],tone.getHex(),[0,yaw,0],2);
  // Vertical fine ribs make the diffuser read as an optical part rather than a
  // bright flat bar; its luminous center remains visible through the glass.
  for(let i=0;i<10;i++){const a=i*Math.PI/5;cylinder(Math.cos(a)*7.1,37.5,Math.sin(a)*7.1,.24,21,0xd2ebd8,2,6);}
  b.add(new T.CylinderGeometry(8.65,8.65,24.1,24,1,true),at(0,37.2,0),[scale,scale,scale],0xc2e1cf,[0,yaw,0],3);
  ring(27.2,8.85,.75,edge);ring(48.6,8.85,.75,edge);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.5,px=Math.cos(a)*9.6,py=Math.sin(a)*9.6;beam([px,23.5,py],[px,51,py],.85,metal);cylinder(px,52.1,py,.9,1,edge,0,6);}
  ring(37.5,9.65,.52,metal);cylinder(0,50.7,0,10.1,3.2,metal);
  b.add(new T.CylinderGeometry(7.4,10.3,2.3,20),at(0,53.2,0),[scale,scale,scale],edge,[0,yaw,0]);
  cylinder(0,54.5,0,4.1,.9,seal,1);
  // A low folding handle and hinge lugs finish the silhouette.
  for(const side of [-1,1]){cylinder(side*4.3,54.2,0,1.2,1.8,metal,0,10,[0,0,Math.PI/2]);beam([side*4.3,54.1,0],[side*4.3,57,0],.6,edge);}
  beam([-4.3,57,0],[4.3,57,0],.6,edge);
  if(groundGlow){
   const floor=(px,py)=>{const value=groundAt?groundAt(px,py):z;if(!Number.isFinite(value))throw new Error('Field lantern ground sampler must return finite heights.');return value+.45;};
   const vertices=[x,floor(x,y),y],colors=[tone.r,tone.g,tone.b,.13],indices=[],n=24,radius=23*scale;
   for(let row=0;row<2;row++)for(let i=0;i<=n;i++){
    const a=i/n*Math.PI*2,r=[.5,1][row]*radius;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;vertices.push(px,floor(px,py),py);colors.push(tone.r,tone.g,tone.b,[.075,0][row]);
    if(i<n){const k=1+row*(n+1)+i;if(!row)indices.push(0,k+1,k);else indices.push(k-n-1,k+1,k,k-n-1,k-n,k+1);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,4));g.setAttribute('uv',new T.Float32BufferAttribute(vertices.filter((_,i)=>i%3!==1).map(v=>v/40),2));g.setIndex(indices);g.computeVertexNormals();pools.push(g);
  }
  fixtures.push({x,y,z,height,color,seed,radius:16*scale,coreZ:z+37.2*scale});return fixtures[fixtures.length-1];
 }
 function finish(){
  if(disposed)throw new Error('Field lantern batch is disposed.');if(root)return root;
  root=b.finish();root.name='Caged field lanterns';root.userData.fixtures=fixtures;root.userData.fixtureCount=fixtures.length;
  root.traverse(o=>{
   if(o.material===glass||o.material===luminous)o.castShadow=false;
   if(o.material===steel){const uv=o.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*6,uv.getY(i)*6);}
  });
  if(pools.length){const geometry=mergeGeometries(pools);pools.forEach(g=>g.dispose());pools.length=0;const material=new T.MeshBasicMaterial({name:'Field lantern / subtle ground spill',vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});materials.push(material);const mesh=new T.Mesh(geometry,material);mesh.name='Lantern ground spill';mesh.userData.cameraIgnore=true;root.add(mesh);}
  // Road lanterns span the whole world. Keep every bolt, rib and texture, but
  // submit only spatial ranges visible to the camera or the shadow camera.
  const batches=partitionStaticMeshes(root,320);
  for(const batch of batches)materials.push(batch.material);
  return root;
 }
 function dispose(){if(disposed)return;disposed=true;root?.removeFromParent();root?.traverse(o=>{if(o.isBatchedMesh){o.customDepthMaterial?.dispose();o.dispose();}else o.geometry?.dispose();});pools.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 return {add,finish,dispose,get root(){return root},get materials(){return materials}};
}
