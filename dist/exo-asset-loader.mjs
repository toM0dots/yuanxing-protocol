import * as T from './assets/ev01/three.module.mjs';
import {GLTFLoader} from './assets/ev01/GLTFLoader.mjs';
import {packedAssets} from './exo-asset-manifest.mjs?v=20261110-hero8';

const base=new URL('./',import.meta.url);
const status=()=>globalThis.ExoAssetProgress;
export const yieldToInput=()=>new Promise(resolve=>setTimeout(resolve,0));

// Each fallback uses the original file; neither models nor texture resolution
// depend on support for the smaller transport format.
export async function assetBytes(input,{fetcher=globalThis.fetch,unpack=globalThis.DecompressionStream,usePacked=true}={}){
 const url=new URL(input,base),key=url.href.slice(base.href.length).split('?')[0],entry=packedAssets[key];
 const compressed=usePacked&&entry&&(!entry.packed.endsWith('.gz')||typeof unpack==='function');
 const packed=compressed?new URL(entry.packed,base):null;
 if(packed)packed.searchParams.set('v',entry.sha256.slice(0,12));
 const choices=compressed?[packed,url]:[url];
 let error;
 for(const [attempt,target] of choices.entries()){
  const expected=attempt===0&&compressed?entry.bytes:entry?.originalBytes||0;
  status()?.progress(key,0,expected);
  const controller=new AbortController();let timeout;
  const activity=()=>{clearTimeout(timeout);timeout=setTimeout(()=>controller.abort(),45000);};
  try{
   activity();const response=await fetcher(target.href,{signal:controller.signal});
   if(!response.ok)throw new Error('Asset response '+response.status+': '+key);
   const total=Number(response.headers.get('content-length'))||expected,chunks=[];let loaded=0;
   if(response.body?.getReader){
    const reader=response.body.getReader();
    for(;;){const part=await reader.read();if(part.done)break;activity();chunks.push(part.value);loaded+=part.value.byteLength;status()?.progress(key,loaded,total);}
   }else{const bytes=new Uint8Array(await response.arrayBuffer());chunks.push(bytes);loaded=bytes.byteLength;}
   clearTimeout(timeout);
   let buffer=new Uint8Array(loaded),offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
   // Some hosts decode gzip themselves; only decode an actual gzip stream.
   if(target.pathname.endsWith('.gz')&&buffer[0]===31&&buffer[1]===139){
    buffer=new Uint8Array(await new Response(new Blob([buffer]).stream().pipeThrough(new unpack('gzip'))).arrayBuffer());
   }
   status()?.progress(key,loaded,loaded,true);
   return buffer.buffer;
  }catch(reason){error=reason;}finally{clearTimeout(timeout);}
 }
 throw error;
}

export async function loadGameModel(url){
 const source=new URL(url,base),bytes=await assetBytes(source);
 await yieldToInput();
 return new GLTFLoader().parseAsync(bytes,new URL('./',source).href);
}

export async function loadGameTexture(url){
 async function decode(bytes){const blobURL=URL.createObjectURL(new Blob([bytes]));try{return await new T.TextureLoader().loadAsync(blobURL);}finally{URL.revokeObjectURL(blobURL);}}
 const bytes=await assetBytes(url);
 try{return await decode(bytes);}
 catch(error){
  const source=new URL(url,base),entry=packedAssets[source.href.slice(base.href.length).split('?')[0]];
  if(!entry)throw error;
  return decode(await assetBytes(source,{usePacked:false}));
 }
}
