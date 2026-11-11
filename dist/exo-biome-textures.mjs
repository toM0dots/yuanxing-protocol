import {loadGameTexture} from './exo-asset-loader.mjs?v=20261110-hero8';
import * as T from './assets/ev01/three.module.mjs';
const hash=(x,y=0)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
let maps;
// Authored tileable botanical textures, generated once without DOM/canvas. The
// albedo contains individual fibres/leaves; alpha is actual cutout coverage.
export function biomeTextures(){if(maps)return maps;const size=256;
 const pixels=new Uint8Array(size*size*4),leaves=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=hash(x,y),fib=hash(Math.floor(x/2),Math.floor((y+Math.sin(x*.3)*5)/7)),patch=.5+.25*Math.sin(x*.049)+.25*Math.cos(y*.073),straw=n>.955;
  pixels.set(straw?[112+n*18,106+n*12,63+n*10,160]:[30+patch*22+fib*13+n*12,49+patch*29+fib*17+n*15,19+patch*14+fib*8+n*9,70+fib*100+n*50],i);
 }
 function ellipse(cx,cy,rx,ry,a,color){const ca=Math.cos(a),sa=Math.sin(a),r=Math.ceil(Math.max(rx,ry));for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(size,cy+r);y++)for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(size,cx+r);x++){
  const dx=x-cx,dy=y-cy,u=(dx*ca+dy*sa)/rx,v=(-dx*sa+dy*ca)/ry,q=u*u+v*v;if(q>1)continue;const i=(y*size+x)*4,vein=Math.exp(-v*v*350)*15,light=1-q*.18+hash(x,y)*.13;leaves.set([color[0]*light+vein,color[1]*light+vein,color[2]*light,Math.min(255,(1-q)*1600)],i);
 }}
 for(let k=0;k<33;k++){const t=k/32,cy=226-t*195,cx=128+Math.sin(t*5)*19;ellipse(cx,cy,2.3,8,-.2,[61,63,36]);if(k%2===0)for(const sign of [-1,1]){const a=sign*(.60+hash(k)*.45),lx=cx+sign*(19+hash(k+8)*22),ly=cy-7;ellipse(lx,ly,13+hash(k+3)*7,26+hash(k+5)*6,a,[73+hash(k)*25,112+hash(k+1)*30,40+hash(k+2)*15]);}}
 function tex(data,name){const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.name=name;t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;}
 maps={grass:tex(pixels,'Meadow / interlaced grass and dry fibres'),leaves:tex(leaves,'Woodland / fine paired leaves and branchlets')};return maps;
}

export async function loadBiomeScans(){
 const names=['grass-color','grass-height','forest-color','forest-height','bark-color','bark-normal','bark-roughness','foliage-atlas'];
 const entries=await Promise.all(names.map(async name=>{const atlas=name==='foliage-atlas',vegetation=atlas||name.startsWith('bark-'),tex=await loadGameTexture(new URL('./assets/'+(vegetation?'vegetation-v88/':'biomes-v87/')+name+(atlas?'.png':'.jpg'),import.meta.url).href);tex.wrapS=tex.wrapT=atlas?T.ClampToEdgeWrapping:T.RepeatWrapping;tex.anisotropy=4;if(atlas||name.endsWith('color'))tex.colorSpace=T.SRGBColorSpace;return [name,tex];}));return Object.fromEntries(entries);
}
