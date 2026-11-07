import * as T from './assets/ev01/three.module.mjs';

// Facade supports, door frames and service equipment extend beyond the logical
// floor rectangle. Camera clearance uses their actual visible triangles.
export function createBuildingCameraGuard(buildings){
 const ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(0,1,0),offset=new T.Vector3(),bounds=new WeakMap();
 const offsets=[[0,0],[22,0],[-22,0],[0,22],[0,-22]],clearance=28;
 return function constrainCamera(target,eye){
  origin.set(target[0],target[2],target[1]);direction.set(eye[0],eye[2],eye[1]).sub(origin);const length=direction.length();if(length<1)return eye;direction.divideScalar(length);
  right.crossVectors(direction,axis);if(right.lengthSq()<.001)right.set(1,0,0);else right.normalize();up.crossVectors(right,direction).normalize();
  const candidates=[];
  for(const group of buildings.values()){
   if(!group.visible)continue;let box=bounds.get(group);if(!box){group.updateMatrixWorld(true);box=new T.Box3().setFromObject(group);bounds.set(group,box);}
   if(box.distanceToPoint(origin)<=length+clearance+22)candidates.push(group);
  }
  if(!candidates.length)return eye;
  let safe=length;ray.near=0;ray.far=length+clearance;
  for(const [x,y] of offsets){offset.copy(origin).addScaledVector(right,x).addScaledVector(up,y);ray.set(offset,direction);const hit=ray.intersectObjects(candidates,true)[0];if(hit)safe=Math.min(safe,Math.max(1,hit.distance-clearance));}
  return safe<length?target.map((value,i)=>value+(eye[i]-value)*safe/length):eye;
 };
}
