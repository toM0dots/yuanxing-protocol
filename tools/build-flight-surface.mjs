// Conservative aerial clearance from the shipped Blender triangles (metres).
import fs from 'node:fs';
import * as T from '../dist/assets/ev01/three.module.mjs';
import {GLTFLoader} from '../dist/assets/ev01/GLTFLoader.mjs';
const bytes=fs.readFileSync('dist/assets/canyon-v2/canyon-authored.glb');
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');scene.updateMatrixWorld(true);
const bounds=new T.Box3().setFromObject(scene),step=1.5,xmin=Math.floor(bounds.min.x)-2,zmin=Math.floor(bounds.min.z)-2,nx=Math.ceil((bounds.max.x-xmin+2)/step)+1,nz=Math.ceil((bounds.max.z-zmin+2)/step)+1;
const top=new Float32Array(nx*nz).fill(-1000),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let triangles=0;
scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,index=g.index,count=index?index.count:p.count;
 for(let k=0;k<count;k+=3){a.fromBufferAttribute(p,index?index.getX(k):k).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,index?index.getX(k+1):k+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,index?index.getX(k+2):k+2).applyMatrix4(o.matrixWorld);triangles++;
  const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-9)continue;
  const x0=Math.max(0,Math.ceil((Math.min(a.x,b.x,c.x)-xmin)/step)),x1=Math.min(nx-1,Math.floor((Math.max(a.x,b.x,c.x)-xmin)/step)),z0=Math.max(0,Math.ceil((Math.min(a.z,b.z,c.z)-zmin)/step)),z1=Math.min(nz-1,Math.floor((Math.max(a.z,b.z,c.z)-zmin)/step));
  for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++){const x=xmin+i*step,z=zmin+j*step,wa=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,wb=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,wc=1-wa-wb;if(wa>=-1e-5&&wb>=-1e-5&&wc>=-1e-5)top[j*nx+i]=Math.max(top[j*nx+i],wa*a.y+wb*b.y+wc*c.y)}
 }
});
// Expand by one cell for the body radius and narrow features between samples.
const values=[];for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let h=-1000;for(let y=Math.max(0,j-1);y<=Math.min(nz-1,j+1);y++)for(let x=Math.max(0,i-1);x<=Math.min(nx-1,i+1);x++)h=Math.max(h,top[y*nx+x]);values.push(Math.ceil(h*100));}
const runs=[];for(const v of values){if(runs.length&&runs[runs.length-2]===v)runs[runs.length-1]++;else runs.push(v,1)}
const data={xmin,zmin,step,nx,nz,heights:runs};fs.writeFileSync('dist/assets/canyon-v2/canyon-flight.js','/* Aerial envelope sampled from the actual shipped Blender mesh. */\nconst ExoCanyonFlightData='+JSON.stringify(data)+';\nif(typeof module!=="undefined")module.exports=ExoCanyonFlightData;\n');
console.log(JSON.stringify({triangles,nx,nz,maxHeight:bounds.max.y,bytes:fs.statSync('dist/assets/canyon-v2/canyon-flight.js').size}));
