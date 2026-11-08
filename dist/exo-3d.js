/* Native WebGL triangle meshes, lighting, depth buffer and procedural terrain. No billboard mech. */
const Exo3D=(()=>{
 let canvas=null,gl=null,program=null,buffer=null,loc={},lost=false;const meshes=new Map();
 const vs=`attribute vec3 p;attribute vec3 n;attribute vec3 color;uniform vec3 eye;uniform vec3 cameraRight;uniform vec3 cameraUp;uniform vec3 cameraForward;uniform vec2 lens;uniform vec2 depthRange;varying vec3 C;varying vec3 N;varying vec3 W;varying float distanceFog;void main(){vec3 rel=p-eye;float x=dot(rel,cameraRight),y=dot(rel,cameraUp),z=max(.01,dot(rel,cameraForward));float near=depthRange.x,far=depthRange.y;gl_Position=vec4(x*lens.x,y*lens.y,((far+near)/(far-near))*z-(2.0*far*near)/(far-near),z);C=color;N=normalize(n);W=p;distanceFog=clamp((z-1700.0)/5200.0,0.0,1.0);}`;
 const fs=`precision mediump float;varying vec3 C;varying vec3 N;varying vec3 W;varying float distanceFog;uniform highp vec3 eye;uniform float terrainPass;float hash(vec2 p){p=mod(p,256.0);return fract(sin(dot(p,vec2(12.9898,78.233)))*4375.8545);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}void main(){vec3 normal=normalize(N),lightDir=normalize(vec3(-.65,-.35,.8)),viewDir=normalize(eye-W),halfDir=normalize(lightDir+viewDir);float diffuse=.34+.66*max(0.,dot(normal,lightDir)),specular=pow(max(0.,dot(normal,halfDir)),28.);vec3 col=C*diffuse;if(terrainPass>.5){float broad=noise(W.xy*.004);float grit=noise(W.xy*.16);float fracture=abs(sin(W.x*.033+noise(W.xy*.019)*5.)*sin(W.y*.027+noise(W.yx*.024)*4.));float crack=1.-smoothstep(.01,.055,fracture);col*=.72+.35*grit+.15*broad;col=mix(col,vec3(.38,.21,.12),smoothstep(.63,.85,broad)*.42);col*=1.-crack*.3;float mineral=smoothstep(.96,.995,grit)*(1.-broad);col+=vec3(.13,.18,.18)*mineral;}else{col+=vec3(.38,.44,.47)*specular*.38;}gl_FragColor=vec4(mix(col,vec3(.39,.38,.36),distanceFog),1.0);}`;
 function init(){const next=document.getElementById('exo-gl');if(next===canvas&&gl&&!lost)return true;canvas=next;if(!canvas)return false;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!gl||!gl.createShader)return false;const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3D shader link failed');buffer=gl.createBuffer();loc={p:gl.getAttribLocation(program,'p'),n:gl.getAttribLocation(program,'n'),color:gl.getAttribLocation(program,'color'),eye:gl.getUniformLocation(program,'eye'),right:gl.getUniformLocation(program,'cameraRight'),up:gl.getUniformLocation(program,'cameraUp'),forward:gl.getUniformLocation(program,'cameraForward'),lens:gl.getUniformLocation(program,'lens'),depth:gl.getUniformLocation(program,'depthRange'),terrainPass:gl.getUniformLocation(program,'terrainPass')};gl.enable(gl.DEPTH_TEST);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});canvas.addEventListener('webglcontextrestored',()=>{lost=false;gl=null;meshes.clear()});lost=false;return true}catch{gl=null;return false}}
 // Keep orbit input, collision and rendering separate: projection never advances the camera.
 const cameraPoses=new WeakMap();
 const cameraKey=c=>[c.x,c.y,c.z,c.yaw,c.pitch,c.distance,c.focusHeight,c.flight,ExoWorld.cave?.id].join(':');
 function resetOrbit(c){c.orbitYaw=c.yaw;c.orbitPitch=c.pitch;delete c.boomDistance;cameraPoses.delete(c);}
 function orbitDrag(c,dx,dy){
  c.orbitYaw=(c.orbitYaw??c.yaw)-dx*.0032;
  c.orbitPitch=Math.max(.12,Math.min(1.05,(c.orbitPitch??c.pitch)+dy*.0026));
 }
 function stepOrbit(c,dt,reduced=false){
  const a=dt<=0?0:reduced?1:1-Math.exp(-dt*24);
  c.yaw+=((c.orbitYaw??c.yaw)-c.yaw)*a;
  c.pitch+=((c.orbitPitch??c.pitch)-c.pitch)*a;
  // Rebase both angles together, so crossing 360 degrees never reverses the orbit.
  if(Math.abs(c.yaw)>Math.PI*4){const turns=Math.trunc(c.yaw/(Math.PI*2))*Math.PI*2;c.yaw-=turns;c.orbitYaw=Number.isFinite(c.orbitYaw)?c.orbitYaw-turns:c.yaw;}
 }
 function cameraPose(c){
  const yaw=Number.isFinite(c.yaw)?c.yaw:0,pitch=Number.isFinite(c.pitch)?c.pitch:.58,distance=Number.isFinite(c.distance)?c.distance:950;
  const ground=Number.isFinite(c.z)?c.z:ExoWorld.elevation(c.x,c.y),target=[c.x,c.y,ground+(c.focusHeight??68)];
  let eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.cos(yaw)*Math.cos(pitch)*distance,target[2]+Math.sin(pitch)*distance];
  if(!c.flight&&!ExoWorld.cave&&typeof ExoCanyonV2!=='undefined')eye=ExoCanyonV2.constrainCamera(target,eye);
  if(ExoWorld.constrainCamera)eye=ExoWorld.constrainCamera(target,eye);
  const terrainAt=(x,y)=>Math.max(ExoWorld.elevation(Math.max(100,Math.min(ExoWorld.width-100,x)),Math.max(100,Math.min(ExoWorld.height-100,y))),c.flight&&typeof ExoCanyonV2!=='undefined'?(ExoCanyonV2.flightSurface?.(x,y)??-Infinity):-Infinity);
  // Shorten the boom at terrain instead of pitching the whole camera up a mountain.
  const d=eye.map((v,i)=>v-target[i]),steps=Math.max(1,Math.ceil(Math.hypot(...d)/18)),rayClearance=24;
  for(let i=1;i<=steps;i++){const t=i/steps,x=target[0]+d[0]*t,y=target[1]+d[1]*t,z=target[2]+d[2]*t;if(z<terrainAt(x,y)+rayClearance){const safe=Math.max(.001,(i-1)/steps);eye=target.map((v,k)=>v+d[k]*safe);break;}}
  if(typeof window!=='undefined'&&window.ExoPremium?.ready&&window.ExoPremium.constrainCamera)eye=window.ExoPremium.constrainCamera(target,eye);
  return {eye,target,terrainEye:terrainAt(eye[0],eye[1]),rayClearance};
 }
 function prepareCamera(c,dt){
  const pose=cameraPose(c),d=pose.eye.map((v,i)=>v-pose.target[i]),safe=Math.hypot(...d);
  // Obstruction response is immediate; opening space restores distance gently.
  c.boomDistance=c.boomDistance==null? safe:Math.min(safe,c.boomDistance+(safe-c.boomDistance)*(1-Math.exp(-Math.max(0,dt)*6)));
  pose.eye=pose.target.map((v,i)=>v+d[i]*c.boomDistance/Math.max(.001,safe));
  cameraPoses.set(c,{key:cameraKey(c),pose});
 }
 function view(c,w,h){
  const cached=cameraPoses.get(c),pose=cached?.key===cameraKey(c)?cached.pose:cameraPose(c),{eye,target,terrainEye,rayClearance}=pose;
  const d=target.map((v,i)=>v-eye[i]),length=Math.max(.001,Math.hypot(...d)),forward=d.map(v=>v/length),rightLength=Math.hypot(forward[1],forward[0]),right=rightLength>1e-6?[-forward[1]/rightLength,forward[0]/rightLength,0]:[1,0,0],up=[forward[1]*right[2]-forward[2]*right[1],forward[2]*right[0]-forward[0]*right[2],forward[0]*right[1]-forward[1]*right[0]],f=1/Math.tan(((c.fov||54)*Math.PI/180)/2);
  return {eye,forward,right,up,lens:[f/Math.max(.35,w/Math.max(1,h)),f],near:12,far:9000,target,terrainEye,rayClearance};
 }
 function project(x,y,z,c,w,h){const v=view(c,w,h),r=[x-v.eye[0],y-v.eye[1],z-v.eye[2]],dot=a=>r[0]*a[0]+r[1]*a[1]+r[2]*a[2],d=dot(v.forward);if(d<=.01)return {x:-1e4,y:-1e4,s:0,d};const nx=dot(v.right)*v.lens[0]/d,ny=dot(v.up)*v.lens[1]/d;return {x:(nx*.5+.5)*w,y:(.5-ny*.5)*h,s:h*.5*v.lens[1]/d,d}}
 function unproject(x,y,c,w,h,z=ExoWorld.elevation(c.x,c.y)){const v=view(c,w,h),nx=x/w*2-1,ny=1-y/h*2,dir=[v.forward[0]+v.right[0]*nx/v.lens[0]+v.up[0]*ny/v.lens[1],v.forward[1]+v.right[1]*nx/v.lens[0]+v.up[1]*ny/v.lens[1],v.forward[2]+v.right[2]*nx/v.lens[0]+v.up[2]*ny/v.lens[1]],t=(z-v.eye[2])/dir[2];return {x:v.eye[0]+dir[0]*t,y:v.eye[1]+dir[1]*t}}
 function tri(out,a,b,c,color){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const [i,p] of [a,b,c].entries())out.push(...p,...n,...(Array.isArray(color[0])?color[i]:color))}
 function box(out,x,y,z,sx,sy,sz,color,angle=0){const p=[];for(let i=0;i<8;i++){const a=(i&1?1:-1)*sx/2,b=(i&2?1:-1)*sy/2;p.push([x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle),z+(i&4?1:-1)*sz/2])}for(const f of [[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]]){tri(out,p[f[0]],p[f[1]],p[f[2]],color);tri(out,p[f[0]],p[f[2]],p[f[3]],color)}}
 function cone(out,x,y,z,r,h,color,segments=7){for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;tri(out,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],[x-r*.1,y-r*.1,z+h],color)}}
 function mesh(cx,cy,lod=1,includeBeacons=true){lod=ExoWorld.cave?1:lod;const key=(ExoWorld.cave?.id||'surface')+':'+cx+','+cy+':'+lod+(includeBeacons?'':':no-beacons');if(meshes.has(key))return meshes.get(key);const a=[],size=1000,vertices=new Map();let step=25*lod;
  function vertex(px,py){const key=px+','+py;if(vertices.has(key))return vertices.get(key);const h=ExoWorld.elevation(px,py),influence=!ExoWorld.cave&&typeof ExoCanyonV2!=='undefined'?ExoCanyonV2.influence(px,py):0,v=.95+.05*Math.sin(px*.04+py*.013);
   let road=0,color=ExoWorld.cave?[.2*v,.29*v,.3*v]:ExoWorld.terrainColor(px,py).map(c=>c*v);
   if(!ExoWorld.cave){const d=ExoWorld.roadDistance(px,py),blend=Math.max(0,Math.min(1,(145-d)/65)),dirt=[.47*v,.41*v,.32*v];road=blend;color=color.map((c,i)=>c+(dirt[i]-c)*blend)}
   const result={p:[px,py,h],color,road};vertices.set(key,result);return result;
  }
  // Retain the full grid wherever distant simplification would move the surface
  // by more than two world units. Shared tile edges always keep every near sample.
  while(lod>1){let safe=true;outer:for(let x=cx*size;x<(cx+1)*size;x+=step)for(let y=cy*size;y<(cy+1)*size;y+=step){const h00=vertex(x,y).p[2],h10=vertex(x+step,y).p[2],h11=vertex(x+step,y+step).p[2],h01=vertex(x,y+step).p[2];for(let dx=25;dx<step;dx+=25)for(let dy=25;dy<step;dy+=25){const u=dx/step,v=dy/step,approx=u>=v?h00*(1-u)+h10*(u-v)+h11*v:h00*(1-v)+h11*u+h01*(v-u);if(Math.abs(vertex(x+dx,y+dy).p[2]-approx)>2){safe=false;break outer;}}}if(safe)break;lod/=2;step=25*lod;}
  for(let x=cx*size;x<(cx+1)*size;x+=step)for(let y=cy*size;y<(cy+1)*size;y+=step){if(ExoWorld.cave&&!ExoWorld.inside(x+step/2,y+step/2))continue;const p=[vertex(x,y),vertex(x+step,y),vertex(x+step,y+step),vertex(x,y+step)];if(lod>1&&(x===cx*size||y===cy*size||x+step===(cx+1)*size||y+step===(cy+1)*size)){const ring=[];for(let side=0;side<4;side++){const A=p[side].p,B=p[(side+1)%4].p,edge=(A[0]===B[0]&&(A[0]===cx*size||A[0]===(cx+1)*size))||(A[1]===B[1]&&(A[1]===cy*size||A[1]===(cy+1)*size)),n=edge?lod:1;for(let j=0;j<n;j++)ring.push(vertex(A[0]+(B[0]-A[0])*j/n,A[1]+(B[1]-A[1])*j/n));}const center=vertex(x+step/2,y+step/2);for(let j=0;j<ring.length;j++)tri(a,center.p,ring[j].p,ring[(j+1)%ring.length].p,[center.color,ring[j].color,ring[(j+1)%ring.length].color]);}else for(const ids of [[0,1,2],[0,2,3]])tri(a,...ids.map(i=>p[i].p),ids.map(i=>p[i].color))}
  if(includeBeacons&&!ExoWorld.cave)for(const p of ExoWorld.beacons){if(Math.floor(p.x/size)!==cx||Math.floor(p.y/size)!==cy)continue;
   if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(p.x,p.y)){const q=ExoCanyonV2.local(p.x,p.y);if(ExoCanyonV2.clearance(q.x,q.y)<3)continue}
   const z=ExoWorld.elevation(p.x,p.y);box(a,p.x,p.y,z+18,10,10,36,[.19,.28,.28]);box(a,p.x,p.y,z+39,13,13,8,[.4,.95,.83]);
  }
  const result=new Float32Array(a);result.roadCoverage=new Float32Array(a.length/9);for(let i=0;i<a.length;i+=9){const v=vertices.get(a[i]+','+a[i+1]);result.roadCoverage[i/9]=v&&Math.abs(a[i+2]-v.p[2])<.001?v.road:0;}meshes.set(key,result);return result;
 }
 function releaseMeshes(keep){for(const key of meshes.keys())if(!keep.has(key.replace(':no-beacons','')))meshes.delete(key)}
 function mech(out,u,t,motion){
  const h=ExoWorld.elevation(u.x,u.y)+(u.altitude||0),a=u.angle,ca=Math.cos(a),sa=Math.sin(a),walk=motion.moving&&!u.flight?Math.sin(u.distance*.07):0;
  const steel=[.37,.42,.45],lightSteel=[.52,.56,.56],ivory=[.72,.71,.64],dark=[.09,.13,.15],rubber=[.055,.075,.08],cyan=[.24,.82,.93],amber=[.95,.48,.16];
  const xy=(x,y)=>[u.x+x*ca-y*sa,u.y+x*sa+y*ca];
  const point=(x,y,z,base=h)=>{const p=xy(x,y);return [p[0],p[1],base+z]};
  function part(x,y,z,sx,sy,sz,col,base=h){const p=xy(x,y);box(out,p[0],p[1],base+z,sx,sy,sz,col,a)}
  function bone(from,to,r,col){limb(out,point(...from),point(...to),r,col,7)}
  function armor(x,y,z,width,length,height,col){const q=[[-width*.5,length*.5,0],[width*.5,length*.5,0],[width*.42,-length*.5,0],[-width*.42,-length*.5,0],[0,-length*.1,height]].map(v=>point(x+v[0],y+v[1],z+v[2]));for(const f of [[0,1,4],[1,2,4],[2,3,4],[3,0,4],[0,3,2],[0,2,1]])tri(out,q[f[0]],q[f[1]],q[f[2]],col)}
  contactShadow(out,u.x,u.y,46,55);
  part(0,3,53,39,29,18,dark);part(0,2,68,45,29,28,steel);armor(0,-8,82,43,35,16,ivory);
  part(0,10,86,31,18,24,steel);limb(out,point(0,9,76),point(0,9,103),13,dark,8);
  part(0,-13,94,27,20,17,lightSteel);armor(0,-22,100,26,20,9,ivory);part(0,-33,100,21,4,7,cyan);
  part(0,20,78,29,7,22,dark);part(-10,23,80,5,4,15,cyan);part(10,23,80,5,4,15,cyan);
  bone([11,-2,76],[18,12,98],2.2,amber);bone([-11,-2,76],[-18,12,98],2.2,amber);
  for(const side of [-1,1]){
    const stride=walk*side,hip=[side*17,5,55],knee=[side*20,-2+stride*10,30],footLocal=[side*21,-18+stride*15],fw=xy(footLocal[0],footLocal[1]),footGround=u.flight?h:ExoWorld.elevation(fw[0],fw[1]);
    bone(hip,knee,7,dark);limb(out,point(...knee),[fw[0],fw[1],footGround+11],6,dark,7);
    armor(side*18,1+stride*6,39,18,27,10,ivory);part(side*20,-7+stride*11,23,17,19,22,steel);
    box(out,fw[0],fw[1],footGround+6,24,38,12,rubber,a);box(out,fw[0]+sa*7,fw[1]-ca*7,footGround+12,20,26,8,ivory,a);
    const ankle=point(side*20,-8+stride*11,22),toe=[fw[0]-Math.sin(a)*12,fw[1]+Math.cos(a)*-12,footGround+9];limb(out,ankle,toe,2.3,amber,6);
    part(side*34,1,86,27,30,20,ivory);armor(side*36,-8,92,25,31,11,lightSteel);
    const shoulder=[side*34,2,82],elbow=[side*40,-8-stride*7,61],wrist=[side*39,-25-stride*8,48];
    bone(shoulder,elbow,6,dark);bone(elbow,wrist,5,dark);part(side*40,-9-stride*7,62,15,18,25,steel);part(side*39,-25-stride*8,48,14,24,12,ivory);
    bone([side*29,3,82],[side*37,-7-stride*7,64],2,amber);bone([side*36,-12-stride*7,60],[side*38,-25-stride*8,50],1.8,lightSteel);
    part(side*13,22,69,13,17,27,dark);part(side*13,25,64,7,9,16,steel);
    if(motion.boosting||u.flight){const jet=point(side*13,31,54);cone(out,jet[0],jet[1],jet[2],5,28,cyan,7)}
  }
  // Framed cockpit, independent sensors, shoulder hardpoints and reactor vents.
  for(const side of [-1,1]){
    part(side*12,-35,101,3,5,12,dark);bone([side*9,-30,105],[side*7,-22,113],2.2,steel);
    part(side*34,9,99,20,16,6,dark);
    for(let j=0;j<3;j++){part(side*34,6+j*5,103,14,2,2,amber);part(side*14,28,73+j*5,10,3,2,lightSteel)}
    bone([side*22,8,51],[side*22,2+walk*side*10,31],2,lightSteel);
    const jet=point(side*13,31,57);limb(out,point(side*13,24,65),jet,5,steel,10);
    if(motion.boosting||u.flight)limb(out,jet,point(side*13,48+Math.sin(t*.03)*4,40),3,cyan,8);
  }
  part(0,-35,101,2,5,9,dark);part(-8,-28,114,6,8,5,cyan);part(8,-28,114,7,8,5,amber);
  const recoil=Math.max(0,u.recoil||0),kick=recoil*10;
  part(40,-39+kick,57,18,37,17,dark);part(40,-42+kick,68,14,33,6,steel);
  limb(out,point(40,-45+kick,57),point(40,-99+kick,57),5,lightSteel,12);
  limb(out,point(40,-91+kick,57),point(40,-100+kick,57),8,dark,12);
  limb(out,point(40,-100+kick,57),point(40,-102+kick,57),4,cyan,12);
  for(let j=0;j<5;j++)part(40,-38-j*7+kick,48,20,3,3,ivory);
  if(recoil>.45){const muzzle=point(40,-104+kick,57);limb(out,muzzle,point(40,-123-recoil*18,57),3+recoil*3,[1,.83,.43],8)}
  const antenna=point(10,-4,112);limb(out,antenna,point(12,-2,132),1.2,lightSteel,5);const tip=point(12,-2,133);box(out,tip[0],tip[1],tip[2],3,3,3,amber,a);
 }
 function contactShadow(out,x,y,rx,ry){for(let ring=0;ring<3;ring++){const scale=1-ring*.24,col=[.11-ring*.025,.14-ring*.025,.15-ring*.025];for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,p=(angle)=>{const px=x+Math.cos(angle)*rx*scale,py=y+Math.sin(angle)*ry*scale;return [px,py,ExoWorld.elevation(px,py)+1.5+ring*.2]};tri(out,[x,y,ExoWorld.elevation(x,y)+1.5+ring*.2],p(a),p(b),col)}}}
 function limb(out,a,b,r,color,sides=6){const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d);if(length<.001)return;const axis=d.map(v=>v/length),seed=Math.abs(axis[2])>.9?[1,0,0]:[0,0,1],cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],first=cross(axis,seed),scale=Math.hypot(...first),u=first.map(v=>v/scale),v=cross(axis,u),ring=(p,t)=>p.map((q,i)=>q+r*(Math.cos(t)*u[i]+Math.sin(t)*v[i]));for(let i=0;i<sides;i++){const t=i/sides*Math.PI*2,q=(i+1)/sides*Math.PI*2,a1=ring(a,t),a2=ring(a,q),b1=ring(b,t),b2=ring(b,q);tri(out,a1,a2,b2,color);tri(out,a1,b2,b1,color);tri(out,b,b1,b2,color)}}
 function basalt(out,r){const floor=ExoWorld.elevation(r.x,r.y),seed=Math.abs(Math.sin(r.x*.02+r.y*.01));for(let i=0;i<7;i++){const t=i/6*Math.PI*2,radius=i===6?0:r.r*.5,x=r.x+Math.cos(t)*radius,y=r.y+Math.sin(t)*radius,z=floor+(i===6?r.r*1.5:r.r*(.5+.7*Math.abs(Math.sin(i*2.1+seed))));limb(out,[x,y,floor-5],[x-5,y+4,z],r.r*.34,[.28+i*.012,.29+i*.01,.29+i*.008],6);if(i%2===0)limb(out,[x-6,y-6,floor],[x-4,y-3,floor+(z-floor)*.7],2,[.42,.27,.16],4)}}
 function prowler(out,e,unit,time){
  const heavy=e.type==='heavy',size=e.level===4?1.6:e.level===3?1.22:e.level===2?1:.78,heading=e.state==='chase'?Math.atan2(unit.x-e.x,-(unit.y-e.y)):Math.sin(e.id*1.7)*1.2;
  const floor=ExoWorld.elevation(e.x,e.y),stride=e.state==='chase'?Math.sin(time*8+e.id):Math.sin(time*2+e.id)*.12;
  const armor=e.level===4?[.49,.24,.17]:heavy?[.68,.64,.53]:[.49,.49,.43],dark=[.14,.18,.19],edge=[.32,.34,.33],amber=e.alert>0?[1,.36,.06]:[.95,.58,.15];
  const point=(x,y,z)=>[e.x+size*(x*Math.cos(heading)-y*Math.sin(heading)),e.y+size*(x*Math.sin(heading)+y*Math.cos(heading)),floor+z*size];
  const part=(x,y,z,sx,sy,sz,color)=>{const p=point(x,y,z);box(out,...p,sx*size,sy*size,sz*size,color,heading)};
  const bone=(a,b,r,col)=>limb(out,point(...a),point(...b),r*size,col);
  function plate(x,y,z,width,length,height,col){const points=[[-width/2,length/2,0],[width/2,length/2,0],[width*.4,-length/2,0],[-width*.4,-length/2,0],[0,-length*.35,height]].map(p=>point(x+p[0],y+p[1],z+p[2]));for(const f of [[0,1,4],[1,2,4],[2,3,4],[3,0,4]])tri(out,points[f[0]],points[f[1]],points[f[2]],col)}
  contactShadow(out,e.x,e.y,48*size,70*size);
  part(0,0,39,27,51,23,dark);part(0,-32,42,24,32,21,edge);
  for(let i=0;i<5;i++){plate(0,20-i*12,49,38-i*2,23,12,armor);for(const side of [-1,1])plate(side*17,18-i*11,39,15,20,8,edge)}
  plate(0,-39,52,29,39,12,armor);part(0,-52,39,11,4,7,amber);part(-10,-43,42,4,12,5,amber);part(10,-43,42,4,12,5,amber);
  for(const front of [-1,1])for(const side of [-1,1]){const gait=stride*side*front,y=front*20,footY=y+gait*12,footZ=4+Math.max(0,gait)*8;bone([side*12,y,43],[side*29,y+7,25],6,dark);bone([side*29,y+7,25],[side*32,footY,footZ],5,edge);plate(side*23,y,38,18,25,9,armor);plate(side*31,footY+1,18,13,21,6,armor);part(side*32,footY-5,footZ,14,21,7,armor);for(const toe of [-1,1])bone([side*32+toe*4,footY-10,footZ],[side*32+toe*4,footY-17,2],2,dark)}
  for(let i=0;i<5;i++){bone([Math.sin(time*1.5)*i*.8,27+i*10,34-i*4],[Math.sin(time*1.5)*(i+1)*.8,37+i*10,30-i*4],Math.max(2,7-i),edge);plate(0,31+i*10,37-i*4,18-i*2,17,5,armor)}
  // Rank-specific silhouettes: antenna scout, bladed assault, armored artillery, crowned apex.
  if((e.level||1)===1){for(const side of [-1,1])bone([side*9,-30,54],[side*19,-50,72],1.6,amber)}
  if(e.level>=2){for(const side of [-1,1]){bone([side*13,-31,51],[side*24,-46,75],3,armor);plate(side*30,-10,48,13,35,17,armor)}}
  if(e.level>=3){for(let i=0;i<5;i++){const p=point(0,20-i*12,60);cone(out,...p,5*size,(18+i*2)*size,armor,5)}for(const side of [-1,1]){part(side*22,4,61,17,31,18,edge);bone([side*22,0,65],[side*22,-39,65],5,dark);part(side*22,-40,65,8,4,8,amber)}}
  if(e.level===4){const red=[1,.16,.22];for(const side of [-1,1]){bone([side*15,-29,61],[side*32,-38,101],5,armor);plate(side*39,9,56,32,53,29,armor);bone([side*19,-45,36],[side*27,-63,27],4,armor);part(side*12,-48,48,6,9,6,red)}part(0,-31,65,13,15,14,red)}
 }
 function geology(out,unit,yaw=0){if(ExoWorld.interior){for(const p of ExoWorld.interior.deck.walls)box(out,p.x,p.y,260,p.w,p.d,520,[.2,.3,.4]);return;}if(ExoWorld.cave){for(const room of ExoWorld.rooms){for(let i=0;i<40;i++){const angle=i/40*Math.PI*2,x=room.x+Math.cos(angle)*room.r,y=room.y+Math.sin(angle)*room.r,front=(x-unit.x)*Math.sin(yaw)+(y-unit.y)*Math.cos(yaw);if(ExoWorld.rooms.some(r=>r!==room&&Math.hypot(x-r.x,y-r.y)<r.r+35)||front>80)continue;const z=ExoWorld.elevation(x,y);box(out,x,y,z+120,65,65,240,[.19,.25,.27],angle);cone(out,x,y,z+245,25,-105,[.29,.33,.32],6);if(i%4===0)cone(out,x*.98+room.x*.02,y*.98+room.y*.02,z,12,55,[.28,.66,.65],5)}}box(out,ExoWorld.entry.x,ExoWorld.entry.y,-88,150,100,8,[.28,.48,.46]);cone(out,1570,400,-80,28,70,[.3,.8,.82],6);return}
  for(const c of ExoWorld.caves){if(Math.hypot(c.x-unit.x,c.y-unit.y)>2600)continue;const z=ExoWorld.elevation(c.x,c.y);box(out,c.x,c.y+5,z+48,102,14,96,[.025,.04,.045]);for(const side of [-1,1]){box(out,c.x+side*65,c.y,z+65,35,68,130,[.3,.32,.31],side*.13);basalt(out,{x:c.x+side*115,y:c.y-18,r:68});box(out,c.x+side*48,c.y+15,z+50,5,8,70,[.27,.8,.7])}box(out,c.x,c.y,z+134,155,70,28,[.39,.4,.36]);if(c.kind==='地洞'){box(out,c.x,c.y+75,z+2,130,130,5,[.06,.1,.12]);for(const side of [-1,1])box(out,c.x+side*62,c.y+75,z+35,5,130,70,[.53,.4,.26])}}
 }
 function attackWarnings(out,combat){if(!combat)return;
  const point=(x,y)=>[x,y,ExoWorld.elevation(x,y)+3],amber=[1,.45,.18],green=[.48,.76,.19];
  function ring(x,y,r,w,col){for(let i=0;i<48;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24,q=(t,r)=>point(x+Math.cos(t)*r,y+Math.sin(t)*r),v=[q(a,r),q(b,r),q(b,Math.max(0,r-w)),q(a,Math.max(0,r-w))];tri(out,v[0],v[1],v[2],col);tri(out,v[0],v[2],v[3],col)}}
  for(const e of combat.enemies){const a=e.action;if(e.hp<=0||a?.phase!=='windup')continue;
   if(a.kind==='charge'||a.kind==='pounce'){const dx=a.target.x-a.from.x,dy=a.target.y-a.from.y,len=Math.hypot(dx,dy)||1,n=Math.ceil(len/30),w=a.kind==='charge'?32:20;for(let i=0;i<n;i++){const p=[];for(const [t,k] of [[i/n,-1],[(i+1)/n,-1],[(i+1)/n,1],[i/n,1]])p.push(point(a.from.x+dx*t-dy/len*w*k,a.from.y+dy*t+dx/len*w*k));tri(out,p[0],p[1],p[2],amber);tri(out,p[0],p[2],p[3],amber)}}
   else if(a.kind==='mortar')ring(a.target.x,a.target.y,110,6,amber);else ring(e.x,e.y,a.kind==='shockwave'?260:55,5,amber);
  }
  for(const h of combat.hazards||[])ring(h.x,h.y,h.radius,h.kind==='pool'?h.radius:6,h.kind==='pool'?green:amber);
 }
 function upload(data){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),gl.DYNAMIC_DRAW);for(const [name,off] of [['p',0],['n',12],['color',24]]){gl.enableVertexAttribArray(loc[name]);gl.vertexAttribPointer(loc[name],3,gl.FLOAT,false,36,off)}gl.drawArrays(gl.TRIANGLES,0,data.length/9)}
 function render(o){if(typeof window!=='undefined'&&window.ExoPremium?.ready){try{return window.ExoPremium.render(o,{view,mesh,sceneGeometry,releaseMeshes})}catch(error){window.ExoPremium.fail(error)}}if(!init())return false;const {w,h,c,unit,motion,rocks,sites,combat}=o,dpr=Math.min(1.5,window.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);const v=view(c,w,h);gl.uniform3fv(loc.eye,v.eye);gl.uniform3fv(loc.right,v.right);gl.uniform3fv(loc.up,v.up);gl.uniform3fv(loc.forward,v.forward);gl.uniform2fv(loc.lens,v.lens);gl.uniform2f(loc.depth,v.near,v.far);gl.uniform1f(loc.terrainPass,1);const gx=Math.floor(c.x/1000),gy=Math.floor(c.y/1000),radius=ExoWorld.cave?2:4,keep=new Set();for(let x=gx-radius;x<=gx+radius;x++)for(let y=gy-radius;y<=gy+radius;y++){keep.add((ExoWorld.cave?.id||'surface')+':'+x+','+y);upload(mesh(x,y))}releaseMeshes(keep);gl.uniform1f(loc.terrainPass,0);upload(sceneGeometry(o));return true}
 function sceneGeometry(o,includeMech=true,includeEnemies=true,includePlayerFX=true,includeLandscape=true){const {c,unit,motion,rocks,sites,combat}=o;const a=[];if(includeEnemies)attackWarnings(a,combat);if(includeLandscape)geology(a,unit,c.yaw||0);for(const r of rocks){if(!includeLandscape)continue;if(Math.hypot(r.x-c.x,r.y-c.y)>3000)continue;basalt(a,r);}for(const s of sites){const z=ExoWorld.elevation(s.x,s.y);box(a,s.x,s.y,z+22,45,45,44,[.28,.36,.41]);box(a,s.x,s.y,z+80,6,6,120,[.56,.62,.64]);box(a,s.x,s.y,z+138,20,20,8,[.3,.85,.93]);}for(const camp of (includeLandscape?ExoWorld.camps:[])){if(includeLandscape)box(a,camp.x,camp.y,ExoWorld.elevation(camp.x,camp.y)-1,200,160,5,[.25,.4,.42]);for(const dx of [-90,90])box(a,camp.x+dx,camp.y,ExoWorld.elevation(camp.x,camp.y)+23,8,8,45,[.3,.9,.75])}if(!ExoWorld.cave&&typeof ExoTerrainCourse!=='undefined'){const rover=o.terrain?ExoTerrainCourse.rover(o.terrain):null;if(rover){const floor=ExoWorld.elevation(rover.x,rover.y),z=floor+(rover.sink?5:rover.slip?10:18),body=rover.blocked?[.35,.48,.52]:rover.slip||rover.sink?[.82,.39,.22]:[.75,.69,.4];box(a,rover.x,rover.y,z,27,35,16,body);for(const x of [-18,18])box(a,rover.x+x,rover.y,z-5,9,40,13,[.15,.21,.24]);box(a,rover.x,rover.y,z+15,4,4,20,rover.blocked?[.95,.48,.27]:[.65,.88,.87]);if(rover.sink)for(let i=0;i<6;i++)cone(a,rover.x-38+i*15,rover.y+22,floor+3,5,12,[.45,.3,.19],5)}}if(o.fireCourse?.active&&(includeLandscape||typeof ExoTrainingGround==='undefined')){const p=ExoFireControl.base,z=ExoWorld.elevation(p.x,p.y);box(a,p.x,p.y,z+1,220,170,5,[.25,.42,.43]);for(const dx of [-105,105])box(a,p.x+dx,p.y,z+45,8,8,90,[.33,.8,.72]);box(a,p.x+110,p.y+40,z+40,28,35,75,[.32,.4,.44])}if(includeMech)mech(a,unit,o.now,motion);if(combat){if(includePlayerFX){for(const m of combat.missiles||[])if(m.delay<=0)box(a,m.x,m.y,(Number.isFinite(m.z)?m.z:ExoWorld.elevation(m.x,m.y)+90),7,20,7,[1,.7,.3],m.angle-Math.PI/2);const swing=combat.saber;if(swing){const q=swing.angle+1.3-swing.age/swing.duration*2.6;box(a,unit.x+Math.sin(q)*85,unit.y-Math.cos(q)*85,ExoWorld.elevation(unit.x,unit.y)+(unit.altitude||0)+65,5,150,6,[1,.35,.9],q)}for(const p of combat.weaponFX||[])if(p.kind==='blast')cone(a,p.x,p.y,ExoWorld.elevation(p.x,p.y)+5,20+(1-p.ttl/p.total)*90,35,[1,.6,.25],12)}for(const e of combat.enemies){if(!includeEnemies||e.hp<=0||Math.hypot(e.x-c.x,e.y-c.y)>2000)continue;prowler(a,e,unit,combat.time);}for(const b of combat.bolts)if(b.enemy?includeEnemies:includePlayerFX)box(a,b.x,b.y,(Number.isFinite(b.z)?b.z:ExoWorld.elevation(b.x,b.y)+50),5,13,5,b.enemy?(b.kind==='spit'?[.55,.9,.22]:[1,.35,.18]):[.4,.9,1]);for(const d of combat.drops)box(a,d.x,d.y,ExoWorld.elevation(d.x,d.y)+8,14,14,14,[.8,.67,.3])}return a;}
 return {prepare:o=>typeof window!=='undefined'&&window.ExoPremium?.prepare?.(o,{view,mesh,sceneGeometry,releaseMeshes}),releaseMeshes,resetOrbit,orbitDrag,stepOrbit,prepareCamera,sceneGeometry,render,view,project,unproject,mesh,box,cone,mech,prowler,basalt,geology,contactShadow,shaderSources:{vs,fs}};
})();
if(typeof module!=='undefined')module.exports=Exo3D;
