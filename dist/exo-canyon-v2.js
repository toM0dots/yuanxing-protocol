/* K09 legacy coordinates and valley floor; the retired cliff sheet owns no collision. */
const ExoCanyonV2=(()=>{
 const origin={x:3600,y:6100},scale=18,baseHeight=28,extent=70*scale;
 const data=typeof ExoCanyonData==='undefined'?null:ExoCanyonData;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // The retired terraced massif has no remaining aerial collision surface.
 function flightSurface(){return -Infinity;}
 function local(x,y){return {x:(x-origin.x)/scale,y:(origin.y-y)/scale}}
 function world(x,y,z=0){return {x:origin.x+x*scale,y:origin.y-y*scale,z:baseHeight+z*scale}}
 function noise(x,y){return .52*Math.sin(x*1.71+y*.63)+.29*Math.sin(x*.43-y*1.37)+.19*Math.sin(x*3.11+y*2.07)}
 function groundLocal(x,y){
  if(!data)return .22*noise(x*.24,y*.24)-.45*Math.exp(-Math.pow((x-7)/5.8,2));
  const f=data.floor,u=clamp((x-f.xmin)/f.dx,0,f.nx-1.000001),v=clamp((y-f.ymin)/f.dy,0,f.ny-1.000001),i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*f.nx+i,z=f.heights;
  return (a>=b?z[k]*(1-a)+z[k+1]*(a-b)+z[k+f.nx+1]*b:z[k]*(1-b)+z[k+f.nx+1]*a+z[k+f.nx]*(b-a))/1000;
 }
 function inZone(x,y,pad=0){const p=local(x,y);return Math.abs(p.x)<=70+pad&&p.y>=-60-pad&&p.y<=80+pad}
 function influence(x,y){const p=local(x,y),q=Math.hypot((p.x-12)/74,(p.y+4)/76),t=clamp((1.75-q)/.75,0,1);return t*t*(3-2*t)}
 function elevation(x,y,base){const p=local(x,y),f=influence(x,y);return base*(1-f)+(baseHeight+groundLocal(p.x,p.y)*scale)*f}
 function floorDelta(x,y){const p=local(x,y);return groundLocal(p.x,p.y)*scale*influence(x,y)}
 // v87: old massif, cave-roof and talus were removed together. Building and
 // natural terrain collision remain owned by ExoWorld; no invisible old wall.
 const clearance=()=>100,ceiling=()=>327.67;
 const blocked=()=>false,atPortal=()=>false,collide=()=>false;
 const constrainCamera=(target,eye)=>eye;
 const spawn=world(6,-32);
 return {flightSurface,origin,scale,baseHeight,extent,spawn,local,world,noise,groundLocal,influence,elevation,floorDelta,inZone,atPortal,clearance,ceiling,blocked,collide,constrainCamera};
})();
if(typeof module!=='undefined')module.exports=ExoCanyonV2;
