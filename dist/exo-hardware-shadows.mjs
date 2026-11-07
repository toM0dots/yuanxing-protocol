import * as T from './assets/ev01/three.module.mjs';

// Exact separable form of Three r164's 16-comparison PCF-soft kernel.
// Four hardware bilinear depth comparisons retain the same filter weights.
const hardwareShadow=`
uniform highp sampler2DShadow exoSunDepth;
float exoDirectionalShadow(vec2 mapSize,float bias,vec4 coord){
 coord.xyz/=coord.w;coord.z+=bias;
 if(coord.x<0.||coord.x>1.||coord.y<0.||coord.y>1.||coord.z>1.)return 1.;
 vec2 texel=1./mapSize,f=fract(coord.xy*mapSize+.5),uv=coord.xy-f*texel;
 vec2 a=2.-f,b=1.+f,lo=-1.+1./a,hi=1.+f/b;
 float s=texture(exoSunDepth,vec3(uv+lo*texel,coord.z))*a.x*a.y;
 s+=texture(exoSunDepth,vec3(uv+vec2(hi.x,lo.y)*texel,coord.z))*b.x*a.y;
 s+=texture(exoSunDepth,vec3(uv+vec2(lo.x,hi.y)*texel,coord.z))*a.x*b.y;
 s+=texture(exoSunDepth,vec3(uv+hi*texel,coord.z))*b.x*b.y;
 return s/9.;
}`;
export function createHardwareShadows(light){
 const size=light.shadow.mapSize,depth=new T.DepthTexture(size.x,size.y,T.UnsignedIntType);
 depth.compareFunction=T.LessEqualCompare;depth.minFilter=depth.magFilter=T.LinearFilter;
 const target=new T.WebGLRenderTarget(size.x,size.y,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthTexture:depth});
 light.shadow.map=target;const patched=new WeakSet();
 function prepare(scene){scene.traverseVisible(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m?.isMeshStandardMaterial||patched.has(m))continue;patched.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=(s,r)=>{compile.call(m,s,r);s.uniforms.exoSunDepth={value:depth};s.fragmentShader=hardwareShadow+'\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )','exoDirectionalShadow( directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, vDirectionalShadowCoord[ i ] )'));
  };m.customProgramCacheKey=()=>key+'|hardware-pcf-v59';m.needsUpdate=true;
 }});}
 return {prepare,dispose(){target.dispose();depth.dispose();}};
}
