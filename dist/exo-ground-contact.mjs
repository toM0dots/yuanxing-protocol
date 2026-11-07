import * as T from './assets/ev01/three.module.mjs';

// Small terrain-conforming contact shade; one draw, no screen-sized AO pass.
// The sun shadow still handles the long silhouette. This anchors the feet even
// under overcast skies or inside a larger cliff's shadow.
export function createGroundContact(scene){
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r2=dx*dx+dy*dy;
  pixels[(y*size+x)*4+3]=Math.round(Math.max(0,Math.exp(-r2*3.8)-Math.exp(-3.8))*255);
 }
 const texture=new T.DataTexture(pixels,size,size);texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1,6,6),material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.name='AEGIS soft foot contact';mesh.renderOrder=2;scene.add(mesh);
 let key='';
 return {mesh,update(unit,world,surfaceHeight=world.elevation){
  const altitude=unit.flight?Math.max(0,unit.altitude||0):0;
  mesh.visible=altitude<260;material.opacity=.48*Math.max(0,1-altitude/260);
  if(!mesh.visible)return;
  const next=[Math.round(unit.x/2),Math.round(unit.y/2),Math.round(altitude/8),world.cave?.id||'surface'].join(':');
  if(next===key)return;key=next;
  const p=geometry.attributes.position,uv=geometry.attributes.uv,spread=1+altitude/180;
  for(let i=0;i<p.count;i++){
   const x=unit.x+(uv.getX(i)-.5)*116*spread,z=unit.y+(.5-uv.getY(i))*94*spread;
   // Authored aprons and survey beds sit above the collision terrain. Their
   // visible surface must receive the contact shade rather than hide it.
   p.setXYZ(i,x,surfaceHeight(x,z)+.8,z);
  }
  p.needsUpdate=true;geometry.computeBoundingSphere();
 },dispose(){scene.remove(mesh);geometry.dispose();material.dispose();texture.dispose();}};
}
