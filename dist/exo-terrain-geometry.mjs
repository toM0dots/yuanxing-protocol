import * as T from './assets/ev01/three.module.mjs';
import {indexExactGeometry} from './exo-render-optimization.mjs?v=20261107-performance89';
export function terrainGeometry(data,elevation,smooth=true,indexed=true){
 const count=data.length/9,p=new Float32Array(count*3),n=new Float32Array(count*3),c=new Float32Array(count*3),color=new T.Color(),normals=new Map();
 for(let i=0;i<count;i++){
  const k=i*9,j=i*3,x=data[k],y=data[k+1],z=data[k+2],len=Math.hypot(data[k+3],data[k+4],data[k+5])||1;
  p.set([x,z,y],j);n.set([data[k+3]/len,data[k+5]/len,data[k+4]/len],j);
  if(smooth){
   const key=x+','+y;let sample=normals.get(key);
   if(!sample){const floor=elevation(x,y),dx=elevation(x+3,y)-elevation(x-3,y),dy=elevation(x,y+3)-elevation(x,y-3),length=Math.hypot(dx,6,dy);sample={floor,normal:[-dx/length,6/length,-dy/length]};normals.set(key,sample);}
   if(Math.abs(z-sample.floor)<16)n.set(sample.normal,j);
  }
  color.setRGB(data[k+6],data[k+7],data[k+8],T.SRGBColorSpace);c.set([color.r,color.g,color.b],j);
 }
 const g=new T.BufferGeometry(),indices=new Uint32Array(count);for(let i=0;i<count;i+=3){indices[i]=i;indices[i+1]=i+2;indices[i+2]=i+1}g.setIndex(new T.BufferAttribute(indices,1));g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('roadCoverage',new T.BufferAttribute(data.roadCoverage||new Float32Array(count),1));return smooth&&indexed?indexExactGeometry(g):g;
}
