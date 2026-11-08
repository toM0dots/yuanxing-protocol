/* One streamed surface. Nine camps share continuous terrain and an overland network. */
const ExoWorld=(()=>{
 const facility=()=>typeof ExoFacilities!=="undefined"?ExoFacilities.active:null;
 const landmarkData=typeof ExoRegionLandmarkData!=='undefined'?ExoRegionLandmarkData:{placements:[],collisionBoxes:[]};
 const detailSolid=(x,y,z,margin=0)=>landmarkData.collisionBoxes.some(b=>z>b.z-margin&&z<b.z+b.h+margin&&Math.abs(x-b.x)<b.w/2+margin&&Math.abs(y-b.y)<b.d/2+margin);
 const training=typeof ExoTrainingGround!=='undefined'?ExoTrainingGround:null;
 const wilds=typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null;
 const scale=10,surfaceWidth=2000*scale,surfaceHeight=1333*scale;
 const surfaceCamps=[{x:270,y:1090,name:'迫降营地',risk:1},{x:4200,y:2800,name:'矿区前哨',risk:2},{x:10200,y:2200,name:'遗迹营地',risk:2},{x:6800,y:9000,name:'峡谷营地',risk:2},{x:12000,y:7600,name:'盆地中继',risk:3},{x:7400,y:6600,name:'山洞前哨',risk:2},{x:16100,y:9600,name:'深井前哨',risk:4},{x:17400,y:3600,name:'群峰观测站',risk:3},{x:3708,y:6676,name:'K–09 层岩峡谷',risk:1}];
 const features=[
  {id:'crown',kind:'peak',x:8900,y:4700,rx:1500,ry:1800,z:720,name:'断冠群峰',text:'山脊抬升，沟槽切开山体。沿低坡接近峰顶，俯瞰西侧洞口。'},
  {id:'north',kind:'peak',x:16400,y:2400,rx:1800,ry:1200,z:880,name:'北境冰蚀峰',text:'连续锯齿山脊。重装守卫在山脚巡逻。'},
  {id:'basin',kind:'basin',x:13400,y:8000,rx:2100,ry:1600,z:-260,name:'沉降盆地',text:'低于周边的宽阔盆底，边缘有环状岩壁。开阔地适合拉开交战距离。'},
  {id:'rift',kind:'rift',x:10100,y:10600,rx:2300,ry:430,z:-200,name:'长夜裂谷',text:'狭长裂谷与两侧台地，坡道通往谷底。'},
  {id:'sink',kind:'pit',x:17000,y:10500,rx:1050,ry:900,z:-410,name:'陨落天坑',text:'塌陷形成的深坑。西北井口的升降机可通往地下巢穴。'}
 ];
 const caves=[{id:'basalt',name:'玄武岩山洞',kind:'山洞',x:7500,y:6300,risk:2,desc:'十四座相连的岩厅、矿脉、地下湖与废弃矿站。沿灯标深入晶体洞网，寻找最深处的核心。'},{id:'deep',name:'陨落地洞',kind:'地洞',x:16400,y:9850,risk:4,desc:'十八座巨型洞厅组成的深层迷宫。探索熔晶裂隙、遗迹和领主巢穴，回收深井核心。'}];
 const entry={x:1200,y:1630,name:'洞口升降台',risk:1};let cave=null,rooms=[],tunnels=[],caveBlocks=null;
 const caveSystems={};
 for(const id of ['basalt','deep']){const deep=id==='deep',extra=deep?[[2800,650,600],[4200,1300,700],[6000,800,640],[7800,1500,800],[9500,1000,650],[9900,3000,710],[8300,4200,820],[6500,3200,640],[4800,3500,780],[3000,3200,600],[2400,5200,650],[4500,6000,780],[6500,5400,680],[7800,6400,800],[9800,6900,750]]:[[2700,700,420],[3800,1200,580],[5000,650,500],[6500,1100,620],[7300,2500,530],[6100,3600,700],[4500,3000,630],[2900,2700,480],[2200,4200,560],[3900,4900,710],[5700,5500,650]],names=['入口岩厅','回声廊厅','旧矿井','水晶林','柱石圣堂','地下湖岸','远古遗迹','矿工驿站','熔晶裂隙','荧光穹顶','坠落大厅','黑曜廊道','失落工坊','核心岩厅','静默矿藏','巨兽墓场','深渊天井','领主巢穴'];
  const rs=[[1200,1420,430],[1200,850,370],[1570,400,390],...extra].map(([x,y,r],i)=>({x,y,r,id:i,name:names[i],theme:['crystal','stone','ruin','crystal','stone','lake','ruin','ruin','magma'][i%9]})),links=[];
  for(let i=1;i<rs.length;i++)links.push({a:rs[i-1],b:rs[i],r:150+(i%3)*25});for(const [a,b] of deep?[[3,12],[4,11],[6,9],[10,15],[14,16]]:[[3,10],[4,9],[6,8],[9,12]])links.push({a:rs[a],b:rs[b],r:145});
  caveSystems[id]={id,width:deep?11000:8500,height:deep?8400:6800,rooms:rs,tunnels:links,core:rs.at(-1)};
 }
 const closest=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {x:a.x+dx*t,y:a.y+dy*t}};
 function caveDistance(x,y){if(facility())return ExoFacilities.distance(x,y);let d=-Infinity;for(const r of rooms)d=Math.max(d,r.r-Math.hypot(x-r.x,y-r.y));for(const t of tunnels){const p=closest({x,y},t.a,t.b);d=Math.max(d,t.r-Math.hypot(x-p.x,y-p.y));}return d;}
 function caveCeiling(x,y){if(facility())return facility().deck.ceiling;return 390+90*Math.sin(x*.0017)*Math.cos(y*.0021)+70*Math.sin(y*.003);}
 function caveRoom(u){if(facility())return ExoFacilities.roomAt(u);return rooms.slice().sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0]||null;}

 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Coordinates are shared by terrain, collision, atlas and navigation. Canyon access
 // follows the open southern basin; it never cuts through the authored massif.
 const roads=[
  [0,1,[[1100,1700],[2600,2150]]],
  [1,2,[[5700,2600],[7400,1900]]],
  [2,7,[[12800,1600],[14600,1000],[18400,1200],[18600,2800]]],
  [7,4,[[18100,5100],[15800,6100],[14000,6300]]],
  [4,6,[[13600,8800],[15100,9000]]],
  [6,3,[[14600,11400],[12100,12000],[8500,11700],[6500,9700]]],
  [3,5,[[7000,8200],[7300,7400],[7400,7000]]],
  [5,1,[[6900,6000],[6000,5000],[5900,3800]]],
  [8,3,[[3708,7060],[3885,7160],[3885,7340],[4500,7610],[5000,8200],[4930,9000],[4710,9430],[4400,9770],[4660,9700],[5310,9630],[6080,9600],[6500,9700],[6800,9000]]]
 ].map(([from,to,via],id)=>({id,from,to,points:[surfaceCamps[from],...via.map(([x,y])=>({x,y})),surfaceCamps[to]]}));
 const story=typeof ExoStoryRoute!=='undefined'?ExoStoryRoute:null;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const roadSegments=[],roadCells=new Map(),beacons=[];
 function projection(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),q={x:a.x+dx*t,y:a.y+dy*t};return {...q,t,d:distance(p,q)}}
 for(const road of roads){road.length=0;let nextBeacon=320;for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],length=distance(a,b),s={a,b,length,road,index:i,offset:road.length};roadSegments.push(s);road.length+=length;
  for(let x=Math.floor((Math.min(a.x,b.x)-220)/1000);x<=Math.floor((Math.max(a.x,b.x)+220)/1000);x++)for(let y=Math.floor((Math.min(a.y,b.y)-220)/1000);y<=Math.floor((Math.max(a.y,b.y)+220)/1000);y++){const key=x+','+y;if(!roadCells.has(key))roadCells.set(key,[]);roadCells.get(key).push(s)}
  for(;nextBeacon<length;nextBeacon+=1150){const t=nextBeacon/length,side=(Math.floor((road.length+nextBeacon)/1150)%2?1:-1);beacons.push({x:a.x+(b.x-a.x)*t-(b.y-a.y)/length*105*side,y:a.y+(b.y-a.y)*t+(b.x-a.x)/length*105*side})}nextBeacon-=length;
 }}
 function roadDistance(x,y){let d=story?.roadDistance(x,y)??Infinity;for(const s of roadCells.get(Math.floor(x/1000)+','+Math.floor(y/1000))||[])d=Math.min(d,projection({x,y},s.a,s.b).d);return d}
 if(story){for(let i=beacons.length-1;i>=0;i--)if(story.roadDistance(beacons[i].x,beacons[i].y)<220)beacons.splice(i,1);beacons.push(...story.beacons);}
 function routeTo(u,destination){if(!Number.isInteger(destination)||!surfaceCamps[destination]||cave||facility())return null;
  // Dijkstra from the destination, retaining each actual road polyline.
  const costs=surfaceCamps.map(()=>Infinity),next=[],remaining=new Set(surfaceCamps.map((_,i)=>i));costs[destination]=0;
  while(remaining.size){const n=[...remaining].sort((a,b)=>costs[a]-costs[b])[0];remaining.delete(n);for(const r of roads){const other=r.from===n?r.to:r.to===n?r.from:-1;if(other<0)continue;const cost=costs[n]+r.length;if(cost<costs[other]){costs[other]=cost;next[other]={road:r,to:n}}}}
  let hit=null;for(const s of roadSegments){const p=projection(u,s.a,s.b);if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.blocked(u,p))continue;if(!hit||p.d<hit.p.d)hit={s,p}}
  if(!hit)return null;const {s,p}=hit,r=s.road,along=s.offset+s.length*p.t;
  const towardStart=along+costs[r.from]<=r.length-along+costs[r.to];let n=towardStart?r.from:r.to;
  const points=[{x:u.x,y:u.y},{x:p.x,y:p.y},...(towardStart?r.points.slice(0,s.index).reverse():r.points.slice(s.index))].map(q=>({x:q.x,y:q.y}));
  while(n!==destination){const step=next[n];if(!step)return null;const pts=step.road.from===n?step.road.points:[...step.road.points].reverse();points.push(...pts.slice(1).map(q=>({x:q.x,y:q.y})));n=step.to}
  const clean=points.filter((q,i)=>!i||distance(q,points[i-1])>.01);return {destination,points:clean,length:clean.reduce((sum,q,i)=>sum+(i?distance(q,clean[i-1]):0),0)};
 }
 let activeRoute=null;
 function navigateTo(u,i){activeRoute=routeTo(u,i);return activeRoute}
 function navigatePoint(u,target){
  if(cave||facility()||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y)||target.x<100||target.y<100||target.x>surfaceWidth-100||target.y>surfaceHeight-100)return null;
  const destination=surfaceCamps.map((c,i)=>({i,d:distance(c,target)})).sort((a,b)=>a.d-b.d)[0].i,route=routeTo(u,destination);
  if(!route)return null;
  const end=route.points.at(-1);route.points.push({x:target.x,y:target.y});route.length+=distance(end,target);route.target={x:target.x,y:target.y,name:target.name||'探索目标'};activeRoute=route;return route;
 }
 function navigatePath(u,points,target){if(cave||facility()||!points?.length||!target)return null;const path=[{x:u.x,y:u.y},...points].filter((p,i,a)=>!i||distance(p,a[i-1])>.1);activeRoute={destination:8,points:path,target:{...target},length:path.reduce((sum,p,i)=>sum+(i?distance(p,path[i-1]):0),0)};return activeRoute;}
 function cancelRoute(){activeRoute=null}
 function navigation(u){if(!activeRoute||cave||facility())return null;const target=activeRoute.target||surfaceCamps[activeRoute.destination],points=activeRoute.points;
  if(distance(u,target)<(target.radius||150))return {target,arrived:true,remaining:0,next:target,route:activeRoute};
  let best=null;for(let i=1;i<points.length;i++){const p=projection(u,points[i-1],points[i]);if(!best||p.d<best.p.d)best={p,i}}
  if(!best)return null;let remain=distance(best.p,points[best.i]);for(let i=best.i+1;i<points.length;i++)remain+=distance(points[i-1],points[i]);
  let next=best.p;if(best.p.d<160){let look=training?.reserved(u.x,u.y,200)?60:240,start=best.p;for(let i=best.i;i<points.length;i++){const d=distance(start,points[i]);if(d>=look){next={x:start.x+(points[i].x-start.x)*look/d,y:start.y+(points[i].y-start.y)*look/d};break}look-=d;next=points[i];start=next}}
  return {target,arrived:false,remaining:remain+best.p.d,next,offRoad:best.p.d>260,route:activeRoute};
 }
 function inside(x,y,margin=0){return facility()?ExoFacilities.inside(x,y,margin):caveDistance(x,y)>margin}
 function edge(x,y){return (cave||facility())?caveDistance(x,y):Math.min(x-100,surfaceWidth-100-x,y-100,surfaceHeight-100-y)}
 // Overlapping, elongated watersheds form continuous ranges, not isolated domes.
 // Ridges are warped at two scales; broad shoulders remain smooth underfoot.
 const ranges=[
  [2700,4250,1900,760,-.85,250],[5850,4000,2250,950,.45,350],
  [8550,4690,2400,1120,-.22,520],[11500,3800,2550,1000,-.38,440],
  [14300,2700,2450,1150,-.30,510],[16900,2050,2050,1000,.28,600],
  [9300,8900,2400,800,.22,220],[14700,11250,2700,1000,-.17,240]
 ].map(([x,y,rx,ry,angle,h])=>({x,y,rx,ry,c:Math.cos(angle),s:Math.sin(angle),h}));
 function rangeHeight(x,y){let h=0;for(const r of ranges){const dx=x-r.x,dy=y-r.y,u=(dx*r.c+dy*r.s)/r.rx,v=(-dx*r.s+dy*r.c+125*Math.sin(x*.0016+y*.0011))/r.ry;h+=r.h*Math.exp(-u*u*1.55-v*v*2.1)*(.80+.20*Math.cos(u*4.2+Math.sin(v*2.3)));}return h;}
 // The same habitat weights drive ground colour and deterministic vegetation.
 function biome(x,y){const wet=Math.exp(-Math.pow((x-7600)/4100,2)-Math.pow((y-8300)/2700,2)),west=Math.exp(-Math.pow((x-3050)/3000,2)-Math.pow((y-4650)/3700,2)),east=Math.exp(-Math.pow((x-14800)/2500,2)-Math.pow((y-5700)/1700,2)),burn=Math.exp(-Math.pow((x-5500)/1300,2)-Math.pow((y-6500)/1500,2)),high=clamp((surfaceElevation(x,y)-350)/650,0,1),patch=clamp(.50+.22*Math.sin(x*.0043+Math.sin(y*.0037)*1.8)+.18*Math.sin(y*.0057+x*.0021)+.10*Math.sin(x*.013-y*.009),0,1),grove=clamp((patch-.18)/.61,0,1),grass=clamp(Math.max(wet,west*.94,east*.8)*(1-burn*.88)*(1-high*high*(3-2*high)*.72),0,1),forest=clamp((wet*.88+west*.35+east*.30-.25)*1.6*(1-burn)*(1-high),0,1),woods=forest*(.20+.80*grove*grove*(3-2*grove));return {grass,woods,patch,dry:1-grass,forest};}
 const terrainPalettes=[[.43,.40,.32],[.30,.39,.28],[.40,.43,.43],[.27,.38,.24],[.29,.35,.37],[.29,.39,.30],[.30,.31,.34],[.60,.65,.65],[.31,.39,.27]];
 function terrainColor(x,y){let sum=0,r=0,g=0,b=0;for(let i=0;i<surfaceCamps.length;i++){const c=surfaceCamps[i],site=landmarkData.placements[i],d=Math.min((x-c.x)**2+(y-c.y)**2,site?(x-site.x)**2+(y-site.y)**2:Infinity)+250000,w=1/(d*d),p=terrainPalettes[i];sum+=w;r+=p[0]*w;g+=p[1]*w;b+=p[2]*w;}return [r/sum,g/sum,b/sum];}
 function surfaceElevation(x,y){const e=Math.min(x-100,surfaceWidth-100-x,y-100,surfaceHeight-100-y),rim=clamp(1-e/1100,0,1);let z=25*Math.sin(x*.0018)*Math.sin(y*.0023)+15*Math.sin((x+y)*.004)+rim*rim*(140+90*Math.sin(x*.0013+y*.0008)**2);
  z+=rangeHeight(x,y);
  for(const f of features){if(f.kind==='peak')continue;const q=Math.hypot((x-f.x)/f.rx,(y-f.y)/f.ry);z+=f.z*Math.exp(-q*q*1.55);if(f.kind==='pit'||f.kind==='basin')z+=(f.kind==='pit'?95:65)*Math.exp(-Math.pow((q-1.15)/.48,2));}
  if(typeof ExoCanyonV2!=='undefined')z=ExoCanyonV2.elevation(x,y,z);
  if(typeof ExoWreckWorld!=='undefined')z=ExoWreckWorld.elevation(x,y,z);
  if(structuresReady){
   let core=0;for(const p of landmarkData.placements){const distance=Math.hypot(x-p.x,y-p.y),t=clamp(1-(distance-p.radius)/Math.max(p.fade,680),0,1);const fade=clamp((distance-p.radius)/140,0,1);core=Math.max(core,1-fade*fade*(3-2*fade));if(t>0)z+=(p.z-z)*t*t*(3-2*t);}
   let nearest=null,distance=Infinity;for(const s of structures){const d=Math.hypot(Math.max(Math.abs(x-s.x)-s.w/2-45,0),Math.max(Math.abs(y-s.y)-s.d/2-45,0));if(d<distance){distance=d;nearest=s;}}
   if(nearest){const f=clamp(1-distance/420,0,1),t=f*f*(3-2*f),weight=core>=1?0:t*(1-core)/Math.max(.000001,1-core*t);z+=(nearest.z-z)*weight;}
  }
  if(structuresReady&&wilds)z=wilds.elevation(x,y,z);
  return training?training.elevation(x,y,z):z;
 }
 function elevation(x,y){if(facility())return 0;if(!cave)return surfaceElevation(x,y);return (cave.id==='deep'?-500:-160)+18*Math.sin(x*.003)*Math.cos(y*.004)+8*Math.sin(x*.012+y*.007)}
 function limits(s,previous){if(facility()){ExoFacilities.collide(s,previous);return;}if(cave){if(!inside(s.x,s.y,35)){const choices=[];for(const r of rooms){const dx=s.x-r.x,dy=s.y-r.y,d=Math.hypot(dx,dy)||1;choices.push({x:r.x+dx/d*(r.r-38),y:r.y+dy/d*(r.r-38)});}for(const t of tunnels){const p=closest(s,t.a,t.b),dx=s.x-p.x,dy=s.y-p.y,d=Math.hypot(dx,dy)||1;choices.push({x:p.x+dx/d*(t.r-38),y:p.y+dy/d*(t.r-38)});}const p=choices.filter(p=>inside(p.x,p.y,35)).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(p){s.x=p.x;s.y=p.y;}else if(previous){s.x=previous.x;s.y=previous.y;}s.vx*=.3;s.vy*=.3;}return;}
  const e=edge(s.x,s.y);if(e<380){const f=clamp(e/380,.04,1);if((s.x<480&&s.vx<0)||(s.x>surfaceWidth-480&&s.vx>0))s.vx*=f;if((s.y<480&&s.vy<0)||(s.y>surfaceHeight-480&&s.vy>0))s.vy*=f}s.x=clamp(s.x,100,surfaceWidth-100);s.y=clamp(s.y,100,surfaceHeight-100);if(typeof ExoCanyonV2!=='undefined')ExoCanyonV2.collide(s,previous);
  if(wilds?.cliffBlocked(previous,s,surfaceElevation)){s.x=previous.x;s.y=previous.y;s.vx*=.15;s.vy*=.15;}
 }
 function region(x,y){if(facility())return facility().name+' / B'+(facility().level+1)+' / '+(ExoFacilities.roomAt({x,y})?.name||'连接廊道');if(cave)return cave.name+' / '+(caveRoom({x,y})?.name||'连接廊道');if(training?.region(x,y))return training.region(x,y);if(wilds?.contains(x,y))return y>11330?'断帆山 / 河谷勘测路线':'回声河谷 / 河岸旧路';const landmark=landmarkData.placements.find(p=>Math.hypot(x-p.x,y-p.y)<900);if(landmark)return surfaceCamps[landmark.region].name+' / '+landmark.name;if(typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.influence(x,y)>.1)return ExoWreckWorld.site.name;if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(x,y,18))return 'K–09 层岩峡谷';const near=features.find(f=>Math.hypot((x-f.x)/f.rx,(y-f.y)/f.ry)<1.5);const habitat=biome(x,y);if(!near&&habitat.woods>.45)return '回声谷地 / 林间旧路';if(!near&&habitat.grass>.48)return x<9000?'西麓草甸':'东麓草甸';return near?near.name:x<2400&&y<2200?'迫降荒原':y>surfaceHeight*.62?'风蚀峡谷':x>surfaceWidth*.65?'遗迹高原':'蓝晶矿海'}
 function scene(x,y){if(facility())return 'facility';if(cave)return 'cavern';if(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(x,y,18))return 'canyon-v2';const near=features.find(f=>Math.hypot((x-f.x)/f.rx,(y-f.y)/f.ry)<1.65);if(near&&near.kind==='peak')return 'highland';if(near&&['basin','rift','pit'].includes(near.kind))return 'basin';return 'basalt'}
 function rocks(cx,cy){if(facility()||cave?.id==='survey')return [];if(cave){const pillars=[{x:980,y:1260,r:65},{x:1430,y:1370,r:70},{x:1010,y:800,r:55},{x:1380,y:740,r:48},{x:1770,y:440,r:65}];for(const r of rooms.slice(3))if(Math.hypot(r.x-cx,r.y-cy)<2200)for(let i=0;i<4;i++){const a=i*1.7+r.id*.7;const p={x:r.x+Math.cos(a)*r.r*.6,y:r.y+Math.sin(a)*r.r*.6,r:35+(r.id*17+i*23)%50};if(tunnels.every(t=>{const q=closest(p,t.a,t.b);return Math.hypot(q.x-p.x,q.y-p.y)>t.r+70;}))pillars.push(p);}return pillars;}const encounter=typeof ExoRoadsideEncounter==='undefined'?null:ExoRoadsideEncounter,out=encounter?encounter.obstacles.filter(p=>Math.hypot(p.x-cx,p.y-cy)<2100):[];
  for(let gx=Math.floor(cx/500)-3;gx<=Math.floor(cx/500)+3;gx++)for(let gy=Math.floor(cy/500)-3;gy<=Math.floor(cy/500)+3;gy++){const n=Math.abs(Math.sin(gx*127.1+gy*311.7)*43758.5453)%1,x=gx*500+100+n*300,y=gy*500+100+(n*3.7%1)*300;if(encounter?.contains(x,y,120)||wilds?.reserved(x,y)||training?.reserved(x,y)||landmarkData.placements.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+150)||(typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(x,y,20))||(typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.influence(x,y)>.5)||(x>2400&&x<3650&&y>1400&&y<3100)||(x>4900&&x<5700&&y>3100&&y<4500)||x<2200&&y<1450||x<300||y<300||x>surfaceWidth-300||y>surfaceHeight-300||roadDistance(x,y)<210||structures.some(s=>Math.abs(x-s.x)<s.w/2+160&&Math.abs(y-s.y)<s.d/2+160||Math.hypot(x-s.entrance.x,y-s.entrance.y)<270)||surfaceCamps.some(c=>Math.hypot(c.x-x,c.y-y)<250)||caves.some(c=>Math.hypot(c.x-x,c.y-y)<180))continue;out.push({x,y,r:40+n*65})}return out;
 }
 // Deterministic trunk locations are shared by visuals, movement, weapons and
 // flight. Clear circulation stays clear, including the three surviving lamps.
 const vegetationCache=new Map(),random=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a)};
 function vegetationTile(gx,gy){const key=gx+','+gy;if(vegetationCache.has(key))return vegetationCache.get(key);const trees=[];
  const candidate=(a,b,i)=>{const seed=a*7393+b*1931+i*319;return {seed,x:a*500+random(seed)*500,y:b*500+random(seed+31)*500,priority:random(seed+67)};};
  for(let i=0;i<16;i++){
   const {seed,x,y,priority}=candidate(gx,gy,i);
   if(typeof ExoRoadsideEncounter!=='undefined'&&ExoRoadsideEncounter.contains(x,y,200))continue;
   if(x<250||y<250||x>surfaceWidth-250||y>surfaceHeight-250)continue;
   const b=biome(x,y);if(random(seed+4)>b.woods*.90||roadDistance(x,y)<255)continue;
   // Stable minimum spacing across tile boundaries, without planting rows.
   let crowded=false;for(let dx=-1;dx<=1&&!crowded;dx++)for(let dy=-1;dy<=1&&!crowded;dy++)for(let n=0;n<16;n++){if(!dx&&!dy&&n===i)continue;const other=candidate(gx+dx,gy+dy,n);if(other.priority<priority&&Math.hypot(x-other.x,y-other.y)<92){crowded=true;break;}}if(crowded)continue;
   if((typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.influence(x,y)>.45)||training?.reserved(x,y,130)||wilds?.reserved(x,y,80)||structures.some(s=>Math.abs(x-s.x)<s.w/2+190&&Math.abs(y-s.y)<s.d/2+190||Math.hypot(x-s.entrance.x,y-s.entrance.y)<310)||landmarkData.placements.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+160)||surfaceCamps.some(p=>Math.hypot(x-p.x,y-p.y)<280)||caves.some(p=>Math.hypot(x-p.x,y-p.y)<230))continue;
   if(Math.abs(x-3760)<220&&y>5450&&y<6830)continue;
   if(rocks(x,y).some(p=>Math.hypot(x-p.x,y-p.y)<p.r+65))continue;
   const z=surfaceElevation(x,y),grade=Math.hypot(surfaceElevation(x+18,y)-surfaceElevation(x-18,y),surfaceElevation(x,y+18)-surfaceElevation(x,y-18))/36;if(grade>.65)continue;
   const cohort=random(seed+101),species=cohort<.31?0:cohort<.59?1:cohort<.81?2:3,variant=species*2+(random(seed+111)>.5?1:0),h=species===3?145+random(seed+9)*100:species===1?240+random(seed+9)*115:species===2?300+random(seed+9)*130:260+random(seed+9)*140,width=.83+random(seed+83)*.35;
   trees.push({x,y,z,h,width,r:h*width*[.024,.013,.021,.015][species],angle:random(seed+23)*Math.PI*2,variant,species,seed});
  }
  if(vegetationCache.size>256)vegetationCache.delete(vegetationCache.keys().next().value);vegetationCache.set(key,trees);return trees;
 }
 function nearbyTrees(x,y,radius=1){const out=[],cx=Math.floor(x/500),cy=Math.floor(y/500);for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)out.push(...vegetationTile(cx+dx,cy+dy));return out;}
 function treeSolid(x,y,z,margin=0){return nearbyTrees(x,y,1).some(t=>Math.hypot(x-t.x,y-t.y)<t.r+margin&&z>t.z-5&&z<t.z+t.h*.80);}
 function collideTrees(u,previous){for(const t of nearbyTrees(u.x,u.y)){const dx=u.x-t.x,dy=u.y-t.y,d=Math.hypot(dx,dy),radius=t.r+30;if(d<radius){u.x=t.x+(d?dx/d:1)*radius;u.y=t.y+(d?dy/d:0)*radius;u.vx=(u.vx||0)*.2;u.vy=(u.vy||0)*.2;}}}
 function nearestCamp(u){if(facility())return facility().deck.entry;return (cave?[entry]:surfaceCamps).slice().sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0]}
 function portal(u){if(facility())return null;if(cave)return Math.hypot(u.x-entry.x,u.y-entry.y)<180?{...entry,id:'exit',name:'返回地表'}:null;return caves.find(c=>Math.hypot(c.x-u.x,c.y-u.y)<180)||null}
 function setCave(id){if(facility())ExoFacilities.leave();cave=id?caves.find(c=>c.id===id)||null:null;rooms=cave?caveSystems[cave.id].rooms:[];tunnels=cave?caveSystems[cave.id].tunnels:[];caveBlocks=null;return cave}
 function slope(x,y){return Math.hypot(elevation(x+20,y)-elevation(x-20,y),elevation(x,y+20)-elevation(x,y-20))/40}
 function danger(u){if(cave||facility()||wilds?.contains(u.x,u.y))return null;const zones=[];if(u.y>2500)zones.push({distance:u.x-100,x:180,y:u.y,name:'西缘吞噬带'});if(u.x>5000)zones.push({distance:u.y-100,x:u.x,y:180,name:'北境虚空裂隙'});zones.push({distance:surfaceWidth-100-u.x,x:surfaceWidth-180,y:u.y,name:'东界巨兽领地'});if(u.x>6000)zones.push({distance:surfaceHeight-100-u.y,x:u.x,y:surfaceHeight-180,name:'南境灭绝荒原'});const z=zones.sort((a,b)=>a.distance-b.distance)[0];return z&&z.distance<1450?{...z,fatal:z.distance<320}:null;}
 let structuresReady=false;
 const layout=typeof ExoWorldLayout!=='undefined'?ExoWorldLayout:{facilities:[],lifts:[]};
 const structures=[...layout.lifts,...layout.facilities].map(p=>({...p,entrance:{...p.entrance},z:surfaceElevation(p.x,p.y)}));
 if(typeof ExoCanyonV2!=='undefined'){const C=ExoCanyonV2,p=C.world(38,0);structures.push({id:'k09-hero-hangar',name:'K–09 撤离机库',x:p.x,y:p.y,z:surfaceElevation(p.x,p.y),w:36*C.scale,d:22*C.scale,h:38*C.scale,visualScale:1,type:'hangar',sector:8,entrance:C.world(38,-17)});}
 structuresReady=true;
 // Add the survey cave after the explicit facility manifest: no extra lift,
 // no shifted building IDs, and no changes to existing save destinations.
 if(wilds){caves.push({...wilds.cave});caveSystems.survey=wilds.caveData;}
 function buildingPortal(u){if(cave||facility())return null;return structures.filter(s=>Math.hypot(s.entrance.x-u.x,s.entrance.y-u.y)<150).sort((a,b)=>Math.hypot(a.entrance.x-u.x,a.entrance.y-u.y)-Math.hypot(b.entrance.x-u.x,b.entrance.y-u.y))[0]||null;}
 function structureBoxes(s){const {x,y,w,d,h}=s,t=18*(s.visualScale||1);if(['hangar','lift','mining'].includes(s.type))return [{x:x-w/2,y,w:t,d,h},{x:x+w/2,y,w:t,d,h},{x,y:y-d/2,w,d:t,h},{x:x-w*.36,y:y+d/2,w:w*.28,d:t,h},{x:x+w*.36,y:y+d/2,w:w*.28,d:t,h}];return [{x,y,w,d,h}];}
 function structureHeight(x,y){if(cave||facility())return -Infinity;let z=Math.max(training?.roof(x,y)??-Infinity,typeof ExoWreckWorld!=='undefined'?ExoWreckWorld.roof(x,y):-Infinity);for(const t of nearbyTrees(x,y,1))if(Math.hypot(x-t.x,y-t.y)<t.r+28)z=Math.max(z,t.z+t.h*.85);for(const b of landmarkData.collisionBoxes)if(Math.abs(x-b.x)<b.w/2+24&&Math.abs(y-b.y)<b.d/2+24)z=Math.max(z,b.z+b.h);for(const s of structures)if(Math.abs(x-s.x)<s.w/2+28&&Math.abs(y-s.y)<s.d/2+28)z=Math.max(z,s.z+s.h+(s.visualScale||1)*(['relay','mining'].includes(s.type)?260:s.type==='observatory'?110:50));return z;}
 function caveSolids(){if(cave?.id==='survey')return [];return caveBlocks||(caveBlocks=rooms.filter(r=>r.theme==='ruin').flatMap(r=>[-1,1].map(side=>{const x=r.x+side*r.r*.48,y=r.y-r.r*.45;return {x,y,z:elevation(x,y),w:80,d:60,h:110};}).concat({x:r.x,y:r.y-r.r*.58,z:elevation(r.x,r.y),w:r.r*.9,d:60,h:30})));}
 function collideStructures(u,previous){if(!cave&&!facility()){training?.collide(u,previous);collideTrees(u,previous);}if(!cave&&!facility()&&typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.solid(u.x,u.y,elevation(u.x,u.y)+70,24)){if(previous){u.x=previous.x;u.y=previous.y;}u.vx=u.vy=0;return;}if(facility()){ExoFacilities.collide(u,previous);return;}const bodyBase=elevation(u.x,u.y),boxes=cave?caveSolids():structures.filter(s=>Math.hypot(u.x-s.x,u.y-s.y)<Math.hypot(s.w,s.d)/2+60).flatMap(structureBoxes).concat(landmarkData.collisionBoxes.filter(b=>b.z<bodyBase+110&&b.z+b.h>bodyBase+10&&Math.abs(u.x-b.x)<b.w/2+30&&Math.abs(u.y-b.y)<b.d/2+30));for(const b of boxes){const dx=u.x-b.x,dy=u.y-b.y,hx=b.w/2+24,hy=b.d/2+24;if(Math.abs(dx)<hx&&Math.abs(dy)<hy){if(hx-Math.abs(dx)<hy-Math.abs(dy))u.x=b.x+(dx<0?-hx:hx);else u.y=b.y+(dy<0?-hy:hy);u.vx=(u.vx||0)*.2;u.vy=(u.vy||0)*.2;}}}
 function solidStructure(x,y,z,margin=0,skipTrees=false){if(!skipTrees&&!cave&&!facility()&&treeSolid(x,y,z,margin))return true;if(!cave&&!facility()&&training?.solid(x,y,z,margin))return true;if(!cave&&!facility()&&detailSolid(x,y,z,margin))return true;if(!cave&&!facility()&&typeof ExoWreckWorld!=='undefined'&&ExoWreckWorld.solid(x,y,z,margin))return true;if(facility())return ExoFacilities.solid(x,y,z,margin);if(cave)return caveSolids().some(b=>z>b.z-10&&z<b.z+b.h+margin&&Math.abs(x-b.x)<b.w/2+margin&&Math.abs(y-b.y)<b.d/2+margin);for(const s of structures){if(Math.hypot(x-s.x,y-s.y)>Math.hypot(s.w,s.d)/2+60)continue;if(z<s.z-10||z>s.z+s.h+20)continue;for(const b of structureBoxes(s))if(Math.abs(x-b.x)<b.w/2+margin&&Math.abs(y-b.y)<b.d/2+margin)return true;if(z>s.z+s.h-15&&Math.abs(x-s.x)<s.w/2+margin&&Math.abs(y-s.y)<s.d/2+margin)return true;}return false;}
 function structuresBlocked(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/20));for(let i=0;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=Number.isFinite(a.z)&&Number.isFinite(b.z)?a.z+(b.z-a.z)*t:elevation(x,y)+65;if(solidStructure(x,y,z,5))return true;}return false;}
 function constrainCamera(target,eye){const d=eye.map((v,i)=>v-target[i]),n=Math.max(1,Math.ceil(Math.hypot(...d)/18));for(let i=1;i<=n;i++){const t=i/n,x=target[0]+d[0]*t,y=target[1]+d[1]*t,z=target[2]+d[2]*t;if((cave&&(!inside(x,y,35)||z>elevation(x,y)+caveCeiling(x,y)-20))||solidStructure(x,y,z,12,true)){const safe=Math.max(.05,(i-1)/n);return target.map((v,k)=>v+d[k]*safe);}}return eye;}
 return {vegetationTile,nearbyTrees,ranges,rangeHeight,biome,landmarks:landmarkData.placements,terrainColor,get interior(){return facility()},buildingPortal,constrainCamera,structuresBlocked,solidStructure,structures,structureBoxes,structureHeight,collideStructures,danger,caveDistance,caveCeiling,caveRoom,caveSystems,get caveData(){return cave?caveSystems[cave.id]:null},roads,beacons,roadDistance,routeTo,navigateTo,navigatePoint,navigatePath,cancelRoute,navigation,scale,surfaceWidth,surfaceHeight,surfaceCamps,features,caves,get rooms(){return facility()?.deck.rooms||rooms},get tunnels(){return facility()?.deck.links.map(t=>({...t,r:t.w/2}))||tunnels},entry,inside,setCave,portal,slope,surfaceElevation,get cave(){return facility()||cave},get width(){if(facility())return facility().deck.width;return cave?caveSystems[cave.id].width:surfaceWidth},get height(){if(facility())return facility().deck.height;return cave?caveSystems[cave.id].height:surfaceHeight},get camps(){if(facility())return [facility().deck.entry];return cave?[entry]:surfaceCamps},edge,elevation,limits,region,scene,rocks,nearestCamp};
})();
if(typeof module!=='undefined')module.exports=ExoWorld;
