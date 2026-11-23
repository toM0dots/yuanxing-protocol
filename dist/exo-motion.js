/* Frame-rate-independent kinematic model for the 2.5D exploration prototype. */
const ExoMotion=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const rocks=[{x:520,y:490,r:92},{x:1110,y:920,r:90},{x:1520,y:480,r:115},{x:710,y:1120,r:105}];
 const sites=typeof ExoSurvey!=='undefined'?ExoSurvey.sites:[];
 function create(){return {x:270,y:1090,vx:0,vy:0,angle:0,energy:100,distance:0,altitude:0,flight:null}}
 function resetFlight(s){s.flight=null;s.altitude=0;s.flightNotice='';}
 function aerialSurface(x,y,obstacles=[]){let z=Math.max(ExoWorld.elevation(x,y),ExoWorld.structureHeight?.(x,y)??-Infinity);if(typeof ExoCanyonV2!=='undefined')z=Math.max(z,ExoCanyonV2.flightSurface?.(x,y)??-Infinity);for(const r of obstacles)if(Math.hypot(x-r.x,y-r.y)<r.r+30)z=Math.max(z,ExoWorld.elevation(r.x,r.y)+r.r*1.55);return z;}
 function canLand(x,y,obstacles=[]){if(aerialSurface(x,y,obstacles)-ExoWorld.elevation(x,y)>20)return false;if(obstacles.some(r=>Math.hypot(x-r.x,y-r.y)<r.r+34)||ExoWorld.slope(x,y)>1.1)return false;if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(x,y)){const p=ExoCanyonV2.local(x,y);if(ExoCanyonV2.clearance(p.x,p.y)<2.5)return false;}return true;}
 function toggleFlight(s){
  if(s.flight){s.flight.mode=s.flight.mode==='landing'?'hover':'landing';s.flightNotice=s.flight.mode==='landing'?'正在减速 · 请移到平坦空地降落':'已取消降落 · 保持悬停';return true;}
  if(ExoWorld.cave){s.flightNotice='这里的空间不足以起飞，请先返回地表。';return false;}
  if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(s.x,s.y)){const p=ExoCanyonV2.local(s.x,s.y);if(ExoCanyonV2.ceiling(p.x,p.y)<100){s.flightNotice='上方有岩顶，请驾驶到开阔处起飞。';return false;}}
  if((ExoWorld.structureHeight?.(s.x,s.y)??-Infinity)>ExoWorld.elevation(s.x,s.y)+100){s.flightNotice='上方有建筑顶棚，请到室外再起飞。';return false;}
  if(s.jetpack===false){s.flightNotice='还没有喷气背包。收集能源晶核与合金，在 Esc › 机甲与升级 中研制后才能起飞。';return false;}
  if(s.energy<10){s.flightNotice='能量还不够。恢复到 10 点后就能起飞。';return false;}
  s.energy-=10;s.flight={mode:'hover',z:ExoWorld.elevation(s.x,s.y),vz:0,height:320,bank:0,pitch:0,boostLock:false,clearance:0};s.flightNotice='已起飞 · R 上升，C 下降，空格加速，V 降落';return true;
 }
 function stepFlight(s,input,dt,boost,vertical=0){const f=s.flight;if(!f)return;dt=clamp(dt,0,.05);const stationary={moving:false,boosting:false,speed:Math.hypot(s.vx,s.vy),flying:true};if(!dt)return stationary;
  if(ExoWorld.cave){resetFlight(s);s.vx=s.vy=0;return {...stationary,flying:false};}
  let ix=input.x,iy=input.y,n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}if(vertical){if(vertical>0)f.mode='hover';f.height=clamp(f.height+vertical*330*dt,100,1600);}
  if(s.energy<2)f.boostLock=true;if(f.boostLock&&s.energy>=30)f.boostLock=false;
  const active=boost&&n>.1&&!f.boostLock&&f.mode!=='landing'&&s.altitude>90,speed=f.mode==='landing'?280:active?1850:620,k=1-Math.exp(-dt*(n>.1?3.8:6));
  s.vx+=(ix*speed-s.vx)*k;s.vy+=(iy*speed-s.vy)*k;
  const ox=s.x,oy=s.y,obstacles=[...rocks,...ExoWorld.rocks(s.x,s.y)],nx=clamp(s.x+s.vx*dt,100,ExoWorld.width-100),ny=clamp(s.y+s.vy*dt,100,ExoWorld.height-100);
  const currentFloor=aerialSurface(ox,oy,obstacles),landing=f.mode==='landing',landable=canLand(nx,ny,obstacles);let pathFloor=currentFloor;
  const steps=Math.max(1,Math.ceil(Math.hypot(nx-ox,ny-oy)/18));for(let i=1;i<=steps;i++)pathFloor=Math.max(pathFloor,aerialSurface(ox+(nx-ox)*i/steps,oy+(ny-oy)*i/steps,obstacles));
  const aheadX=clamp(nx+s.vx*.45,100,ExoWorld.width-100),aheadY=clamp(ny+s.vy*.45,100,ExoWorld.height-100),aheadFloor=aerialSurface(aheadX,aheadY,obstacles);
  let goal=landing?(landable?ExoWorld.elevation(nx,ny):pathFloor+100):Math.max(currentFloor+f.height,pathFloor+90,aheadFloor+140);
  f.vz+=(clamp((goal-f.z)*2.5,-220,active?650:430)-f.vz)*(1-Math.exp(-dt*7));f.z+=f.vz*dt;
  // Swept clearance stops the body before steep cliffs while thrusters climb.
  if(pathFloor>f.z-25&&Math.hypot(nx-ox,ny-oy)>.1){s.vx*=.45;s.vy*=.45;f.obstructed=true;}else{s.x=nx;s.y=ny;f.obstructed=false;}
  const surface=aerialSurface(s.x,s.y,obstacles);f.z=Math.max(f.z,surface+((landing&&landable)?0:2));s.altitude=Math.max(0,f.z-ExoWorld.elevation(s.x,s.y));f.clearance=Math.max(0,f.z-surface);
  const velocity=Math.hypot(s.vx,s.vy);if(velocity>12){const angle=Math.atan2(s.vx,-s.vy),turn=Math.atan2(Math.sin(angle-s.angle),Math.cos(angle-s.angle));s.angle+=turn*Math.min(1,dt*4.5);f.bank+=(-clamp(turn,-1,1)*.4*clamp(velocity/620,0,1)-f.bank)*(1-Math.exp(-dt*5));}else f.bank*=Math.exp(-dt*5);
  f.pitch+=(clamp(velocity/1850,0,1)*.55-f.pitch)*(1-Math.exp(-dt*5));s.energy=clamp(s.energy+(active?-28:14*(s.energyRegenMultiplier??1))*dt,0,100);s.distance+=Math.hypot(s.x-ox,s.y-oy);
  s.flightNotice=landing?(landable?'正在降落 · V 取消':'这里无法降落 · 请移到平坦空地'):f.obstructed?'正在上升，避开前方地形':f.boostLock?'能量恢复中 · 稍后可再次加速':active?'高速推进':'自由飞行 · R 上升 / C 下降';
  if(landing&&landable&&f.clearance<3&&Math.abs(f.vz)<25){resetFlight(s);s.vx*=.25;s.vy*=.25;s.flightNotice='已平稳着陆';return {moving:false,boosting:false,speed:velocity,flying:false,landed:true};}
  return {moving:velocity>12,boosting:active,speed:velocity,flying:true};
 }
 function stick(dx,dy,r=48){const len=Math.hypot(dx,dy),m=Math.min(1,len/r);return len<5?{x:0,y:0}:{x:dx/len*m,y:dy/len*m}}
 function step(s,input,dt,boost=false){dt=clamp(dt,0,.05);let ix=input.x,iy=input.y;const marginX=ix<0?s.x-100:(ExoWorld.width-100)-s.x,marginY=iy<0?s.y-100:(ExoWorld.height-100)-s.y;ix*=clamp(marginX/75,.05,1);iy*=clamp(marginY/75,.05,1);let n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n}const jets=s.jetpack!==false,active=boost&&s.energy>1&&n>.1,speed=(active?(jets?245:175):125)*(ExoWorld.cave?1:Math.max(.42,1-ExoWorld.slope(s.x,s.y)*.28)),k=1-Math.exp(-dt*7);s.vx+=(ix*speed-s.vx)*k;s.vy+=(iy*speed-s.vy)*k;const ox=s.x,oy=s.y;s.x=clamp(s.x+s.vx*dt,100,(ExoWorld.width-100));s.y=clamp(s.y+s.vy*dt,100,(ExoWorld.height-100));for(const r of [...(ExoWorld.cave?[]:rocks),...ExoWorld.rocks(s.x,s.y)]){const dx=s.x-r.x,dy=s.y-r.y,d=Math.hypot(dx,dy),limit=r.r+22;if(d<limit){if(typeof ExoContact!=='undefined'){ExoContact.circle(s,r.x,r.y,limit,{material:'rock'});continue;}s.x=r.x+(d?dx/d:1)*limit;s.y=r.y+(d?dy/d:0)*limit;s.vx*=.25;s.vy*=.25}}ExoWorld.limits(s,{x:ox,y:oy});ExoWorld.collideStructures?.(s,{x:ox,y:oy});const v=Math.hypot(s.vx,s.vy);if(v>8){const a=Math.atan2(s.vx,-s.vy),delta=Math.atan2(Math.sin(a-s.angle),Math.cos(a-s.angle));s.angle+=delta*Math.min(1,dt*8)}s.energy=clamp(s.energy+(active?(jets?-22:-9):12*(s.energyRegenMultiplier??1))*dt,0,100);s.distance+=Math.hypot(s.x-ox,s.y-oy);return {moving:v>8,boosting:active&&jets,sprinting:active,speed:v}}
 return {clamp,rocks,sites,create,stick,step,resetFlight,toggleFlight,stepFlight,aerialSurface,canLand};
})();
if(typeof module!=='undefined')module.exports=ExoMotion;
