import * as T from './assets/ev01/three.module.mjs';

export const spaceVertex=`
varying vec3 skyDirection;
void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}
`;
export const spaceFragment=`
precision highp float;
varying vec3 skyDirection;
uniform float skyTime; uniform float stormMix;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(7.2,9.1,4.3);a*=.5;}return v;}
vec3 stars(vec2 uv,float scale,float chance){vec2 cell=floor(uv*scale),f=fract(uv*scale);float h=hash(vec3(cell,scale));vec2 center=vec2(hash(vec3(cell,1)),hash(vec3(cell,9)));float r=length(f-center);float aa=max(fwidth(uv.x*scale),.03);float light=(1.-smoothstep(.025,.025+aa*1.2,r))*step(1.-chance,h);return mix(vec3(.6,.76,1.),vec3(1.,.83,.62),hash(vec3(cell,3)))*light;}
float sphere(vec3 d,vec3 center,float radius){float b=dot(d,center),q=b*b-dot(center,center)+radius*radius;return q>0.&&b>0.?b-sqrt(q):1e5;}
vec3 gasGiant(vec3 n){float cloud=fbm(n*16.),latitude=n.y+.022*sin(n.x*8.+cloud*6.);
 float bands=.5+.10*sin(latitude*26.)+.045*sin(latitude*61.+cloud)+.025*sin(latitude*112.+cloud*5.);
 vec3 c=mix(vec3(.55,.51,.49),vec3(.77,.69,.58),bands);
 float storm=exp(-pow((n.x+.28)/.22,2.)-pow((n.y+.22)/.065,2.));
 c=mix(c,vec3(.74,.59,.46),storm*.18+smoothstep(.66,.82,cloud)*.08);return c*(.97+.04*cloud);}
void main(){vec3 d=normalize(skyDirection),sun=normalize(vec3(-.65,.23,-.45));
 float horizon=exp(-max(d.y,0.)*4.);
 vec3 zenith=mix(vec3(.075,.105,.17),vec3(.12,.17,.23),stormMix);
 vec3 horizonColor=mix(vec3(.82,.42,.19),vec3(.32,.41,.50),stormMix);
 float sunset=pow(max(0.,dot(d,sun)),7.);vec3 color=mix(zenith,horizonColor,horizon)+vec3(.34,.15,.035)*sunset*(1.-stormMix*.8);
 float lane=exp(-pow(dot(d,normalize(vec3(.35,.84,.22)))-.24,2.)*32.);
 float clouds=fbm(d*5.+vec3(3,0,1)),filament=fbm(d*19.);
 color+=lane*pow(clouds,2.)*mix(vec3(.095,.035,.17),vec3(.02,.15,.18),filament)*.28;
 color*=1.-lane*smoothstep(.62,.82,filament)*.45;
 vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
 color+=(stars(uv,1050.,.025)+stars(uv,520.,.012)*.8+stars(uv,210.,.018)*.8)*smoothstep(.22,.65,d.y)*.3;
 // Astronomical geometry is evaluated in direction space: it follows camera
 // rotation but has no local travel parallax, and terrain can occlude it.
 // The pale giant hangs above the southbound recovery route. Its scale and
 // atmospheric veil match the K–09 approach paintings without local parallax.
 vec3 center=normalize(vec3(-.251,.242,-.937))*40.;float radius=10.6;
 float planetT=sphere(d,center,radius);
 if(planetT<1e4){vec3 n=normalize(d*planetT-center);float light=max(0.,dot(n,sun));vec3 c=gasGiant(n)*(.84+.16*light);float rim=pow(1.-max(0.,dot(n,-d)),4.);color=mix(color,c+vec3(.17,.10,.045)*rim,.84);}
 vec3 ringN=normalize(vec3(.25,.91,.33));float denominator=dot(d,ringN);
 float ringT=dot(center,ringN)/(abs(denominator)>.001?denominator:.001);vec3 q=d*ringT-center;float ringR=length(q);
 if(ringT>0.&&ringT<planetT&&ringR>12.6&&ringR<19.5){float rings=.52+.07*sin(ringR*2.7)+.035*sin(ringR*7.3);float edge=smoothstep(12.6,13.6,ringR)*(1.-smoothstep(18.4,19.5,ringR));float gap=1.-smoothstep(.08,.19,abs(ringR-16.5));float opacity=edge*(.30+.16*rings)*(1.-gap*.65);color=mix(color,vec3(.78,.65,.49)*(.91+rings*.12),opacity);}
 vec3 moon=normalize(vec3(.62,.38,-.77))*46.;float moonT=sphere(d,moon,1.9);
 if(moonT<1e4){vec3 n=normalize(d*moonT-moon);float craters=fbm(n*26.);color=mix(vec3(.18,.20,.26),vec3(.6,.64,.67),craters)*(.12+.88*max(0.,dot(n,sun)));}
 // Layered atmospheric cloud banks over the visible ringed planet.
 vec3 cloudP=d*vec3(5.5,8.,5.5)+vec3(skyTime*.0015,0.,skyTime*.0004);
 float bank=fbm(cloudP),detail=fbm(cloudP*3.3+bank*2.);
 float cover=smoothstep(.48,.75,bank+detail*.12)*smoothstep(-.05,.12,d.y);
 vec3 cloudDark=mix(vec3(.12,.14,.20),vec3(.15,.22,.29),stormMix);
 vec3 cloudLight=mix(vec3(.79,.48,.26),vec3(.46,.57,.64),stormMix);
 vec3 cloudColor=mix(cloudDark,cloudLight,smoothstep(.39,.66,bank)*.48+pow(max(0.,dot(d,sun)),8.)*.48);
 color=mix(color,cloudColor,cover*(.36+stormMix*.22)*(planetT<1e4?.24:1.));
 float glow=pow(max(0.,dot(d,sun)),600.);color+=mix(vec3(1.,.55,.18),vec3(.80,.87,.79),stormMix)*glow*(1.-cover*.94);
 color=mix(horizonColor*.55,color,smoothstep(-.12,.02,d.y));
 color=mix(color,vec3(.34,.35,.355),smoothstep(.24,0.,d.y)*.78);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}
`;

export function createSpaceSky(renderer){
 const geometry=new T.SphereGeometry(7800,32,20),material=new T.ShaderMaterial({vertexShader:spaceVertex,fragmentShader:spaceFragment,uniforms:{skyTime:{value:0},stormMix:{value:.3}},side:T.BackSide,depthWrite:false,depthTest:true,toneMapped:false,fog:false});
 const mesh=new T.Mesh(geometry,material);mesh.name='ECHO9 celestial sky';mesh.renderOrder=1000;mesh.frustumCulled=false;
 const targets=[];let cached=null;
 if(renderer){
  // The celestial backdrop is static. Bake both weather endpoints once, preserving
  // the authored planet/rings/clouds, then blend them with two texture samples.
  const bakeScene=new T.Scene();bakeScene.add(mesh);const previous=renderer.getRenderTarget();
  for(const weather of [0,1]){const target=new T.WebGLCubeRenderTarget(1024,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});targets.push(target);material.uniforms.stormMix.value=weather;const capture=new T.CubeCamera(1,9000,target);capture.update(renderer,bakeScene);}
  renderer.setRenderTarget(previous);bakeScene.remove(mesh);
  cached=new T.ShaderMaterial({vertexShader:spaceVertex,fragmentShader:'varying vec3 skyDirection;uniform samplerCube clearSky;uniform samplerCube stormSky;uniform float stormMix;void main(){vec3 d=normalize(skyDirection);gl_FragColor=mix(textureCube(clearSky,d),textureCube(stormSky,d),stormMix);\n#include <colorspace_fragment>\n}',uniforms:{clearSky:{value:targets[0].texture},stormSky:{value:targets[1].texture},stormMix:{value:.3}},side:T.BackSide,depthWrite:false,depthTest:true,toneMapped:false,fog:false});mesh.material=cached;
 }
 return {mesh,update(camera,underground=false,storm=.3,time=0){mesh.position.copy(camera.position);mesh.visible=!underground;(cached||material).uniforms.stormMix.value=storm;if(!cached)material.uniforms.skyTime.value=time},dispose(){geometry.dispose();material.dispose();cached?.dispose();targets.forEach(t=>t.dispose())}};
}
