/* Authored first-act geography. Metres = world units / 18; walking = 125 units/s.
   The main trail has one forward reading order. Optional loops rejoin it.
   Shared by terrain, collision exclusions, navigation, lamps and the field map. */
const ExoStoryRoute=(()=>{
 const point=(x,y)=>({x,y}),line=a=>a.map(([x,y])=>point(x,y));
 const start={x:1950,y:9880,angle:-.48},pod=point(1860,10020);
 const approach=line([[1950,9880],[1740,9440],[1830,8930],[2100,8450],[2450,8010],[2890,7770],[3310,7520],[3708,7360]]);
 const lamps=[point(3370,6840),point(2770,6210),point(3260,5530)];
 const mother={x:3770,y:5370,radius:130},captain={x:4410,y:5580,radius:130},refuge={x:4284,y:6406,radius:140};
 const fireOffset=point(2050,540),range={x:5830,y:8110,radius:180};
 const paths=[
  {id:'crash',name:'迫降支谷',points:approach,kind:'main',quiet:true},
  {id:'washout',name:'断路侧道',points:line([[3708,7360],[3885,7340],[3885,7160],[3708,7060]]),kind:'main',quiet:true},
  {id:'lights',name:'青灯林道',points:[point(3708,7060),...lamps],kind:'main',quiet:true},
  {id:'memories',name:'旧撤离步道',points:[lamps[2],mother,captain,point(4780,5830),point(4760,6520),refuge],kind:'main',quiet:true},
  {id:'defense',name:'维修站东侧接驳路',points:[refuge,...line([[4510,6850],[5000,7100],[5350,7580],[5830,7980]]),range],kind:'main'},
  {id:'south',name:'南行河谷路',points:[range,...line([[5830,7960],[5260,7890],[5000,8200],[4930,9000],[4710,9430],[4400,9770]])],kind:'main'},
  {id:'belongings',name:'撤离车辙',points:[lamps[0],...line([[3050,7180],[2650,7000]]),lamps[1]],kind:'side',quiet:true},
  {id:'lookout',name:'林间眺望坡',points:[lamps[1],...line([[2380,6000],[2530,5540]]),lamps[2]],kind:'side',quiet:true},
  {id:'cargo',name:'遗落的货运道',points:[captain,...line([[5010,5500],[5150,6000],[4760,6520]])],kind:'side',quiet:true}
 ];
 const stops=[
  {id:'crash',name:'迫降谷',...start,episodes:'01',note:'醒来，沿车辙走出谷地。'},
  {id:'route',name:'断裂旧路',x:3708,y:7360,episodes:'02',note:'先看清路况，再绕过塌口。'},
  {id:'lamps',name:'青灯林道',...lamps[1],episodes:'03',note:'查看沿途三处遗物，拼出撤离经过。'},
  {id:'memory',name:'撤离休息点',...mother,episodes:'04–05',note:'停下来检查遗物，再接近仍亮灯的维修间。'},
  {id:'refuge',name:'K–09 维修间',...refuge,episodes:'06 / 09',note:'找老林修理；守住道路后回来安装稳定架。'},
  {id:'defense',name:'东侧接驳坪',...range,episodes:'07–08',note:'在同一条接驳路上试射、校准，再保护维修站。'},
  {id:'valley',name:'河谷与远方',x:4400,y:9770,episodes:'自由探索',note:'沿河岸勘测，支路通往洞穴与山脊。'}
 ];
 const detours=[
  {id:'belongings',name:'撤离车辙',x:2650,y:7000,object:'散落的行李',observation:'车辙绕开了掉落的行李。有人来不及装回去，只带走了氧气瓶；折叠床在车厢边缘留下了擦痕。',returnTo:'第二处青灯',seconds:18},
  {id:'lookout',name:'林间眺望坡',x:2530,y:5540,object:'临时望哨',observation:'一张椅子朝着来路，水壶已经倒空。这里能看见维修间的高灯，也能回望刚刚走过的林道。',returnTo:'第三处青灯',seconds:16},
  {id:'cargo',name:'遗落的货运道',x:5010,y:5500,object:'停在路边的货架',observation:'固定带被割开了，重货还在原地。空出的宽度足够一副担架通过，路灯指向维修间的接驳口。',returnTo:'维修间门前',seconds:14}
 ];
 const bounds={minX:1600,maxX:6400,minY:5100,maxY:10300};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),q=point(a.x+dx*t,a.y+dy*t);return {...q,t,d:distance(p,q)};}
 const segments=paths.flatMap(path=>path.points.slice(1).map((b,i)=>({a:path.points[i],b,path,length:distance(path.points[i],b)})));
 for(const d of detours)d.seconds=Math.round(segments.filter(s=>s.path.id===d.id).reduce((n,s)=>n+s.length,0)/125);
 const cells=new Map();
 for(const s of segments)for(let x=Math.floor((Math.min(s.a.x,s.b.x)-1000)/800);x<=Math.floor((Math.max(s.a.x,s.b.x)+1000)/800);x++)for(let y=Math.floor((Math.min(s.a.y,s.b.y)-1000)/800);y<=Math.floor((Math.max(s.a.y,s.b.y)+1000)/800);y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);}
 function nearest(x,y,quiet=false){let best=null;for(const s of segments){if(quiet&&!s.path.quiet)continue;const p=project({x,y},s.a,s.b);if(!best||p.d<best.d)best={...p,segment:s};}return best;}
 function roadDistance(x,y,quiet=false){if(x<bounds.minX-1000||x>bounds.maxX+1000||y<bounds.minY-1000||y>bounds.maxY+1000)return Infinity;let best=Infinity;for(const s of cells.get(Math.floor(x/800)+','+Math.floor(y/800))||[]){if(quiet&&!s.path.quiet)continue;const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,t=Math.max(0,Math.min(1,((x-s.a.x)*dx+(y-s.a.y)*dy)/(s.length*s.length||1)));best=Math.min(best,Math.hypot(x-s.a.x-dx*t,y-s.a.y-dy*t));}return best;}
 // Split the graph at projections. A detour can rejoin at either end; tracking
 // never draws a straight line across a cliff or asks players to restart a leg.
 function route(from,to){
  const a=nearest(from.x,from.y),b=nearest(to.x,to.y);if(!a||!b||a.d>2000||b.d>500)return null;
  const graph=new Map(),key=p=>p.x.toFixed(3)+','+p.y.toFixed(3),points=new Map();
  const link=(p,q,weight)=>{const u=key(p),v=key(q);points.set(u,p);points.set(v,q);if(!graph.has(u))graph.set(u,[]);if(!graph.has(v))graph.set(v,[]);const d=distance(p,q)*weight;graph.get(u).push({to:v,d});graph.get(v).push({to:u,d});};
  for(const s of segments){const ps=[{...s.a,t:0},{...s.b,t:1}];if(a.segment===s)ps.push(a);if(b.segment===s)ps.push(b);ps.sort((p,q)=>p.t-q.t);for(let i=1;i<ps.length;i++)link(ps[i-1],ps[i],s.path.kind==='side'?1.12:1);}
  const begin=key(a),end=key(b),cost=new Map([[begin,0]]),prev=new Map(),queue=new Set(graph.keys());
  while(queue.size){let u=null;for(const k of queue)if(u===null||(cost.get(k)??Infinity)<(cost.get(u)??Infinity))u=k;if(!Number.isFinite(cost.get(u)))break;queue.delete(u);if(u===end)break;for(const e of graph.get(u)||[]){const next=cost.get(u)+e.d;if(next<(cost.get(e.to)??Infinity)){cost.set(e.to,next);prev.set(e.to,u);}}}
  if(!cost.has(end))return null;const keys=[end];while(keys[0]!==begin){const p=prev.get(keys[0]);if(!p)return null;keys.unshift(p);}
  return [from,...keys.map(k=>points.get(k)),to].map(p=>point(p.x,p.y)).filter((p,i,all)=>!i||distance(p,all[i-1])>.1);
 }
 const beacons=[];
 for(const path of paths){
  const isSide=path.kind==='side',spacing=isSide?700:500;let next=isSide?300:220;
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],d=distance(a,b),side=isSide?-1:1;
   for(;next<d;next+=spacing){const t=next/d,p={x:a.x+(b.x-a.x)*t-(b.y-a.y)/d*85*side,y:a.y+(b.y-a.y)*t+(b.x-a.x)/d*85*side,side:isSide,path:path.id};
    if(![...lamps,...beacons].some(q=>distance(p,q)<190))beacons.push(p);
   }
   next-=d;
  }
 }
 return {version:91,start,pod,approach,lamps,mother,captain,refuge,range,fireOffset,paths,segments,stops,detours,bounds,beacons,roadDistance,nearest,route};
})();
if(typeof module!=='undefined')module.exports=ExoStoryRoute;
