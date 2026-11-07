/* Shared world geometry for the open spacecraft wreck; game coordinates are X/Y, height Z. */
const ExoWreckWorld=(()=>{
 const site={x:5500,y:6500,base:-20,scale:22,name:'坠舰荒原 / ORPHEUS–7'};
 const profile=[[-23,11.5],[-22,12.4],[-20,13.8],[-16,14.8],[-10,15],[-3,15],[4,14.8],[11,14.4],[17,13.7],[22,12.4]];
 const local=(x,y,z=site.base)=>({x:(x-site.x)/site.scale,z:(y-site.y)/site.scale,y:(z-site.base)/site.scale});
 function radius(z){for(let i=1;i<profile.length;i++)if(z<=profile[i][0]){const [a,r]=profile[i-1],[b,s]=profile[i];return r+(s-r)*Math.max(0,(z-a)/(b-a));}return profile.at(-1)[1];}
 function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),h=(a,b)=>{const q=Math.sin(a*127.1+b*311.7)*43758.5453;return q-Math.floor(q)};return (h(ix,iy)*(1-sx)+h(ix+1,iy)*sx)*(1-sy)+(h(ix,iy+1)*(1-sx)+h(ix+1,iy+1)*sx)*sy;}
 function influence(x,y){const p=local(x,y),d=Math.hypot(p.x/35,p.z/48);return 1-Math.min(1,Math.max(0,(d-.78)/.55));}
 function elevation(x,y,base){if(Math.abs(x-site.x)>7000||Math.abs(y-site.y)>7000)return base;const p=local(x,y),f=influence(x,y),smooth=f*f*(3-2*f),dx=x-site.x,dy=y-site.y;
  // The old angle*7/13 teeth and 51-unit erosion noise made a jagged wall
  // around the wreck. Broad asymmetric shoulders join the regional watershed.
  const east=210*Math.exp(-Math.pow((dx-1350)/1050,2)-Math.pow((dy+350)/1850,2));
  const south=130*Math.exp(-Math.pow((dx+100)/1800,2)-Math.pow((dy-1550)/1050,2));
  const west=130*Math.exp(-Math.pow((dx+1250)/1000,2)-Math.pow((dy-300)/1600,2));
  const feather=typeof ExoCanyonV2!=='undefined'?1-ExoCanyonV2.influence(x,y):1;
  const rim=(east+south+west)*feather;
  let z=base+rim;z+=(site.base-z)*smooth;
  if(Math.abs(p.x)<6.4&&p.z>=-29&&p.z<=-19.4)z=Math.max(z,site.base+(.08+(p.z+29)/9.6*3.77)*site.scale);
  if(Math.abs(p.x)<6.6&&p.z>=-19.4&&p.z<=20.8)z=Math.max(z,site.base+3.85*site.scale);
  return z;
 }
 function solid(x,y,z,margin=0){const p=local(x,y,z),m=margin/site.scale;if(p.z< -23-m||p.z>22+m)return false;
  if(p.z< -19.2&&Math.abs(p.x)<6.8-m&&p.y<11.7-m)return false;
  const r=radius(p.z),d=Math.hypot(p.x,p.y-15);return d>r-1.3-m&&d<r+.75+m;
 }
 function roof(x,y){const p=local(x,y);if(p.z< -23||p.z>22||Math.abs(p.x)>radius(p.z))return -Infinity;return site.base+(15+Math.sqrt(Math.max(0,radius(p.z)**2-p.x**2)))*site.scale;}
 const spawn={x:site.x,y:site.y-35*site.scale};
 return {site,profile,local,radius,influence,elevation,solid,roof,spawn};
})();
if(typeof module!=='undefined')module.exports=ExoWreckWorld;
