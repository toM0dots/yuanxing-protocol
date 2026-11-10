/* Shared contact response for EV-04 and everything it bumps into.
   Obstacles used to zero the mech's whole velocity (or snap it back a frame),
   which made every brush against a wall, rock or crate a dead stop. Contacts now
   remove only the velocity going into the surface, keep most of the sliding
   component, add a small rebound, and report how hard the hit was so the camera,
   body and sound can answer it. */
const ExoContact=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const state={shake:0,leanX:0,leanY:0,last:0,count:0,touch:0,lastStrength:0};
 const listeners=new Set();
 // n points out of the obstacle toward the mech. Returns the impact speed.
 function slide(u,nx,ny,{bounce=.14,keep=.9,material='metal',x=u.x,y=u.y}={}){
  const vx=u.vx||0,vy=u.vy||0,vn=vx*nx+vy*ny;
  if(vn>=0)return 0;
  // Pressing into a surface keeps it touched; only a fresh or harder hit
  // reports, and friction applies on impact rather than every sliding frame.
  const t=typeof performance!=='undefined'?performance.now():Date.now(),pressing=t-state.touch<320;state.touch=t;
  const k=pressing?.99:keep,rebound=pressing?0:bounce,tx=vx-vn*nx,ty=vy-vn*ny;
  u.vx=tx*k-vn*rebound*nx;u.vy=ty*k-vn*rebound*ny;
  report(-vn,material,x,y,nx,ny,pressing);
  return -vn;
 }
 // Axis-aligned box {x,y,w,d}; margin is the mech's body radius.
 function box(u,b,margin=24,opts={}){
  const dx=u.x-b.x,dy=u.y-b.y,hx=b.w/2+margin,hy=b.d/2+margin;
  if(Math.abs(dx)>=hx||Math.abs(dy)>=hy)return 0;
  const px=hx-Math.abs(dx),py=hy-Math.abs(dy);
  if(px<py){const s=Math.sign(dx||1);u.x=b.x+s*hx;return slide(u,s,0,{...opts,x:b.x+s*b.w/2,y:u.y});}
  const s=Math.sign(dy||1);u.y=b.y+s*hy;return slide(u,0,s,{...opts,x:u.x,y:b.y+s*b.d/2});
 }
 function circle(u,cx,cy,r,opts={}){
  const dx=u.x-cx,dy=u.y-cy,d=Math.hypot(dx,dy);
  if(d>=r)return 0;
  const nx=d?dx/d:1,ny=d?dy/d:0;u.x=cx+nx*r;u.y=cy+ny*r;
  return slide(u,nx,ny,{...opts,x:cx+nx*(r-24),y:cy+ny*(r-24)});
 }
 // Separate a move that left the walkable area along whichever axis is still
 // free, so walls guide the mech instead of catching it.
 function wall(u,previous,free,opts={}){
  if(free(u.x,u.y))return 0;
  if(previous&&free(u.x,previous.y)){const s=Math.sign(previous.y-u.y)||-Math.sign(u.vy||1);u.y=previous.y;return slide(u,0,s,opts);}
  if(previous&&free(previous.x,u.y)){const s=Math.sign(previous.x-u.x)||-Math.sign(u.vx||1);u.x=previous.x;return slide(u,s,0,opts);}
  if(previous&&free(previous.x,previous.y)){
   const mx=previous.x-u.x,my=previous.y-u.y,m=Math.hypot(mx,my)||1;u.x=previous.x;u.y=previous.y;return slide(u,mx/m,my/m,opts);
  }
  return -1;
 }
 function report(speed,material,x,y,nx=0,ny=0,pressing=false){
  if(!(speed>32))return 0;
  const strength=clamp((speed-32)/190,0,1),now=typeof performance!=='undefined'?performance.now():Date.now();
  // Sliding along a wall reports every frame; only fresh or harder hits count.
  if((pressing||now-state.last<220)&&strength<(state.lastStrength||0)+.25)return 0;
  state.last=now;state.lastStrength=strength;state.count++;
  state.shake=Math.max(state.shake,.25+strength*.75);
  state.leanX+=nx*(.35+strength);state.leanY+=ny*(.35+strength);
  const event={speed,strength,material,x,y,nx,ny};
  try{(typeof ExoAmbience!=='undefined'?ExoAmbience:null)?.contact?.(material,strength,x,y);}catch{}
  for(const fn of listeners)try{fn(event);}catch{}
  return strength;
 }
 function tick(dt){const k=Math.exp(-dt*8);state.shake*=k;state.leanX*=Math.exp(-dt*6);state.leanY*=Math.exp(-dt*6);if(state.shake<.002)state.shake=0;}
 return {slide,box,circle,wall,report,tick,state,on:fn=>(listeners.add(fn),()=>listeners.delete(fn))};
})();
if(typeof module!=='undefined')module.exports=ExoContact;
