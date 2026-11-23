import * as T from './assets/ev01/three.module.mjs';
// Ten reused route chevrons and one arrival ring: no lights, textures or
// per-frame geometry allocation. Depth testing keeps the guide on the ground.
export function createRouteGuide(scene,W){
 const root=new T.Group();root.name='Active walking route';scene.add(root);
 const shape=new T.Shape();shape.moveTo(-17,8);shape.lineTo(0,-10);shape.lineTo(17,8);shape.lineTo(17,17);shape.lineTo(0,0);shape.lineTo(-17,17);shape.closePath();
 const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.scale(1.6,1,1.6);
 const material=new T.MeshBasicMaterial({color:0xaff5d3,transparent:true,opacity:.86,toneMapped:false,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
 const arrows=new T.InstancedMesh(geometry,material,10);arrows.frustumCulled=false;arrows.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(arrows);
 const ringGeometry=new T.RingGeometry(63,66,48);ringGeometry.rotateX(-Math.PI/2);
 const ring=new T.Mesh(ringGeometry,material);root.add(ring);const dummy=new T.Object3D();let at=-Infinity;
 function update(u,now,disabled=false){
  root.visible=!disabled&&!W.cave&&!W.interior&&!u.flight;const nav=root.visible?W.navigation(u):null;if(!nav){root.visible=false;return;}
  if(now-at<100)return;at=now;
  const points=ExoGuidance.breadcrumbs(u,nav.route.points);arrows.count=points.length;
  points.forEach((p,i)=>{dummy.position.set(p.x,W.elevation(p.x,p.y)+18,p.y);dummy.rotation.set(0,p.angle,0);dummy.updateMatrix();arrows.setMatrixAt(i,dummy.matrix);});arrows.instanceMatrix.needsUpdate=true;
  ring.visible=Math.hypot(u.x-nav.target.x,u.y-nav.target.y)<650;
  ring.position.set(nav.target.x,W.elevation(nav.target.x,nav.target.y)+12,nav.target.y);
 }
 return {root,update,dispose(){root.removeFromParent();geometry.dispose();ringGeometry.dispose();material.dispose();}};
}
