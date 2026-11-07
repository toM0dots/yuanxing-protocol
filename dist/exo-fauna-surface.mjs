import * as T from './assets/ev01/three.module.mjs';

// Original biological cuticle maps, shared by every species and LOD. There are
// no image downloads or canvas dependencies, so the same material is available
// in the game, the Node geometry checks and the local review scene.
const SIZE=512,TAU=Math.PI*2;
const height=new Float32Array(SIZE*SIZE),colour=new Uint8Array(SIZE*SIZE*4),normal=new Uint8Array(SIZE*SIZE*4),rough=new Uint8Array(SIZE*SIZE*4);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function grain(x,y){let n=(x*374761393+y*668265263)^0x5e1b0a17;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(u,v,frequency,seed=0){
  const x=u*frequency,y=v*frequency,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),wrap=n=>(n%frequency+frequency)%frequency;
  const a=grain(wrap(ix)+seed,wrap(iy)),b=grain(wrap(ix+1)+seed,wrap(iy)),c=grain(wrap(ix)+seed,wrap(iy+1)),d=grain(wrap(ix+1)+seed,wrap(iy+1));
  return (a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;
}
for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const u=x/SIZE,v=y/SIZE,i=y*SIZE+x;
  // Fine branching growth striae and pores of keratin-like cuticle. The
  // subdued broad mottling has no stone cracks or rock-scale albedo blobs.
  const warp=noise(u,v,5,13),wU=u+(warp-.5)*.10,wV=v+(noise(u,v,7,57)-.5)*.06;
  const macro=noise(wU,wV,8,29)*.6+noise(wU,wV,21,71)*.4;
  const micro=noise(wU,wV,61,181),pores=noise(wU,wV,79,379),fine=grain(x,y);
  const stria=Math.pow(Math.max(0,Math.cos(TAU*(u*27+noise(u,v,11,89)*.45))),10);
  const pit=Math.max(0,.31-pores)*.42;
  height[i]=.46+macro*.065+micro*.045+pores*.038+stria*.046-pit+(fine-.5)*.007;
  const a=clamp(211+(macro-.5)*140+(micro-.5)*38-stria*23-pit*120,139,249),o=i*4;
  colour.set([a,Math.max(0,a-4),Math.max(0,a-10),255],o);
  const r=clamp(206+(macro-.5)*47+(micro-.5)*19+pit*65-stria*11,169,238);rough.set([r,r,r,255],o);
}
for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const dx=(height[y*SIZE+(x+1)%SIZE]-height[y*SIZE+(x+SIZE-1)%SIZE])*10.5;
  const dy=(height[((y+1)%SIZE)*SIZE+x]-height[((y+SIZE-1)%SIZE)*SIZE+x])*10.5;
  const d=1/Math.hypot(dx,dy,1),i=(y*SIZE+x)*4;
  normal.set([Math.round((-.5*dx*d+.5)*255),Math.round((-.5*dy*d+.5)*255),Math.round((.5*d+.5)*255),255],i);
}
function texture(data,name,colorSpace=T.NoColorSpace){const t=new T.DataTexture(data,SIZE,SIZE,T.RGBAFormat);t.name=name;t.colorSpace=colorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
export const faunaMaps=Object.freeze({color:texture(colour,'Chitin / biological cuticle',T.SRGBColorSpace),normal:texture(normal,'Chitin / fine pores and branching striae'),roughness:texture(rough,'Chitin / waxy cuticle roughness')});
export function faunaMaterial(name,options={}){
  return new T.MeshStandardMaterial({name,map:faunaMaps.color,normalMap:faunaMaps.normal,normalScale:new T.Vector2(.85,.85),roughnessMap:faunaMaps.roughness,roughness:.78,metalness:0,...options});
}

// Compatibility entry point used by the world loader. Organic cuticle uses
// its own maps; applying the world's bedrock scan made living tissue look like
// stone sculptures. No new downloads or transparent material passes are added.
export function applyFaunaScan(material,_worldMaps){
  material.map=faunaMaps.color;material.normalMap=faunaMaps.normal;
  material.normalScale.set(.85,.85);material.bumpMap=null;
  material.roughnessMap=faunaMaps.roughness;
  material.roughness=material.name.includes('chamber')?.72:.78;
  material.userData.surfaceSource='Original biological cuticle maps v75';
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
#ifdef USE_COLOR
float cuticleMask=smoothstep(.035,.095,dot(vColor.rgb,vec3(.2126,.7152,.0722)));
roughnessFactor=mix(.87,max(.38,roughnessFactor*.78),cuticleMask);
#endif`);
  };
  material.customProgramCacheKey=()=> 'fauna-biological-cuticle-v81';
  material.needsUpdate=true;return true;
}
