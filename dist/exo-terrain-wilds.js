/* Authored survey valley: one coordinate source for ground, water, routes and lessons.
   Expedition X/Y are horizontal; Z is height. 18 units = one metre. */
const ExoTerrainWilds=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const bounds={minX:4300,maxX:6800,minY:9550,maxY:12650};
 const spawn={x:4400,y:9770,name:'南谷勘测路口'};
 const peak={x:5340,y:11955,rx:1250,ry:800,height:780,name:'断帆山'};
 const ridgeNodes=[{x:4930,y:12120,rx:540,ry:410,height:380},{x:5510,y:11910,rx:460,ry:520,height:290},{x:6080,y:12110,rx:510,ry:430,height:270},{x:5530,y:12635,rx:700,ry:560,height:1090,fracture:.18}];
 const river={name:'回声河',points:[[3450,10660],[3710,10710],[3990,10860],[4300,11080],[4500,11165],[4700,11200],[4950,11220],[5200,11200],[5460,11150],[5700,11130],[5930,11185],[6200,11250],[6520,11335],[6800,11400],[7100,11465],[7370,11620],[7660,11660]].map(([x,y])=>({x,y})),width:160,waterLevel:-12};
 const bridge={x:4700,y:11200,length:300,width:140,z:24,angle:Math.PI/2,name:'旧勘测桥'};
 const cave={id:'survey',x:4410,y:10630,angle:Math.PI,name:'回声勘测洞',kind:'山洞',risk:1,desc:'沿地下硬岩脊走完一圈；湿滑侧壁和薄壳地面需要先测再判断。入口随时可以返回。'};
 const path=(id,name,coords,width=100,safe=true)=>({id,name,points:coords.map(([x,y,z=18])=>({x,y,z})),width,safe});
 const paths=[
  path('approach','南侧勘测路',[[3740,8510],[3810,8770],[3740,9140],[3750,9450],[3850,9580],[4090,9650],[4250,9750],[4400,9770]],100),
  path('riverbank','北岸旧路',[[4400,9770],[4490,9950],[4520,10140],[4480,10340],[4410,10630],[4430,10760],[4540,10880],[4700,11000]],110),
  path('bank-observation','河岸观察支路',[[4700,11000],[4790,11015]],90),
  path('bridge','旧勘测桥',[[4700,11000],[4700,11200,24],[4700,11360,30],[4810,11400,36],[4930,11400,36],[5050,11380,36]],120),
  path('ridge','断帆山折返路',[[5050,11380,36],[4890,11410,60],[4670,11450,95],[4490,11540,145],[4500,11610,175],[4630,11650,215],[4880,11670,280],[5220,11620,355],[5450,11620,410],[5590,11650,450],[5650,11730,490],[5610,11820,535],[5600,11920,585],[5550,11985,620],[5340,12035,660],[5090,12040,710],[4910,12070,750],[4890,12130,775],[5020,12200,780],[5200,12230,780]],110),
  path('valley','山脊回环',[[5200,12230,780],[5480,12285,740],[5750,12280,670],[6000,12230,590],[6120,12110,530],[6170,11970,450],[6200,11820,350],[6210,11640,240],[6200,11450,110],[6070,11410,70],[5800,11380,42],[5530,11385,39],[5300,11410,37],[5050,11380,36]],110),
  path('connection','旧设施联络路',[[4400,9770],[4660,9700],[4960,9650],[5310,9630],[5650,9656],[6080,9600],[6360,9620],[6500,9700]],90),
  path('ford','浅滩近路',[[6200,10980],[6250,11262,-24],[6200,11450,110]],95,false),
  path('scree','碎石直切坡',[[5800,11380,42],[5920,11710,470],[6000,12230,570]],70,false)
 ];
 const landmarks=[
  {id:'trailhead',...spawn,kind:'trailhead',description:'从维修间通往河谷。先在真实地形上采样，再决定往哪里走。'},
  {id:'cave',x:cave.x,y:cave.y,name:cave.name,kind:'cave',description:'可以进入的地下支路，沿硬岩脊回到入口。'},
  {id:'bridge',x:bridge.x,y:bridge.y,name:bridge.name,kind:'bridge',description:'跨过深水的稳妥路线；东侧覆沙浅滩更近，却不一定承得住机甲。'},
  {id:'summit',x:5200,y:12230,name:'断帆山观测脊',kind:'summit',description:'沿折返路上山，从高处看清河流、洞口和返回维修间的路。'},
  {id:'ford',x:6250,y:11262,name:'覆沙浅滩',kind:'ford',description:'浅色沙壳下面是冲刷松动的河床，先测承重再决定。'},
  {id:'junction',x:6500,y:9700,name:'峡谷联络路',kind:'junction',description:'接回九境主路，河谷是一段连续旅程。'}
 ];
 const specs=[[.26,.22,.88],[.72,.28,.44],[.78,.76,.82],[.42,.38,.64],[.64,.71,.36],[.67,.50,.31],[.47,.25,.93],[.76,.72,.76],[.69,.64,.46],[.57,.49,.28]];
 const locations=[
  [4790,11105,'脆壳河岸',4790,11015],[5050,11350,'低坡岩床',5050,11350],[5590,11650,'晶须攀坡',5590,11650],
  [4630,11730,'粉化山台',4630,11650],[5670,11920,'风化陡坡',5600,11920],[5210,12230,'压实山肩',5210,12230],
  [6250,11262,'覆沙浅滩',6200,11120],[6000,12180,'磁晶山脊',6000,12230],[6270,11820,'断层斜坡',6200,11820],[4450,10630,'洞口硬岩',4410,10630]
 ];
 const samples=locations.map(([x,y,name,ox,oy],id)=>({id,x,y,name,strength:specs[id][0],slope:specs[id][1],grip:specs[id][2],test:id>=6,observationPoint:{x:ox,y:oy,name:name+' · 观察点'}}));
 const trainingSamples=samples.slice(0,6),testSamples=samples.slice(6),trainXY=trainingSamples.map(p=>[p.x,p.y]),testXY=testSamples.map(p=>[p.x,p.y]);
 const hazards=[
  {id:'thin-bank',name:'脆壳河岸',kind:'sink',x:4790,y:11105,rx:90,ry:65,strength:.26,slope:.22,grip:.88,warning:'河岸表壳开裂，承重不足。沿硬岩岸线走向旧桥。'},
  {id:'powder-ledge',name:'粉化山台',kind:'sink',x:4630,y:11730,rx:140,ry:75,strength:.42,slope:.38,grip:.64,warning:'表层岩粉松散，重装机甲可能压塌薄层。沿折返路绕开。'},
  {id:'weathered-slope',name:'风化陡坡',kind:'slip',x:5670,y:11920,rx:85,ry:130,strength:.64,slope:.71,grip:.36,warning:'斜面承重尚可，但坡陡且抓地力不足。'},
  {id:'cliff-edge',name:'断帆山断崖',kind:'cliff',x:5100,y:11860,rx:280,ry:130,strength:.8,slope:.94,grip:.22,warning:'前方是陡坎。折返路从西侧绕上山脊。'},
  {id:'scree-shortcut',name:'松动碎石坡',kind:'slip',x:5920,y:11710,rx:190,ry:250,strength:.76,slope:.82,grip:.35,warning:'直切坡更近，但碎石会沿坡面滑动。可走东侧长坡。'},
  {id:'ford',name:'覆沙浅滩',kind:'water',x:6250,y:11262,rx:210,ry:120,strength:.47,slope:.25,grip:.93,warning:'浅滩沙壳下面被河水掏空。抓地力再高也不能弥补承重不足。'},
  {id:'fault-slope',name:'断层斜坡',kind:'slip',x:6270,y:11820,rx:85,ry:120,strength:.69,slope:.64,grip:.46,warning:'断层面上细砂打滑，沿岩脊内侧走。'}
 ];
 const caveRooms=[
  {x:1200,y:1420,r:360,id:0,name:'入口岩厅',theme:'stone'},
  {x:1800,y:1320,r:330,id:1,name:'旧勘测营',theme:'ruin'},
  {x:2350,y:900,r:360,id:2,name:'湿壁岩厅',theme:'lake'},
  {x:2900,y:1420,r:380,id:3,name:'薄壳空洞',theme:'stone'},
  {x:2350,y:1980,r:340,id:4,name:'回声矿脊',theme:'crystal'}
 ];
 const caveTunnels=[[0,1],[1,2],[2,3],[3,4],[4,1]].map(([a,b])=>({a:caveRooms[a],b:caveRooms[b],r:150}));
 const caveData={id:'survey',width:3800,height:2800,rooms:caveRooms,tunnels:caveTunnels,core:caveRooms[4]};
 const caveHazards=[
  {id:'cave-wet',name:'渗水岩壁',kind:'slip',x:2570,y:850,rx:110,ry:140,strength:.78,slope:.71,grip:.27,warning:'渗水使斜面打滑，沿中间干燥的岩脊通过。'},
  {id:'cave-crust',name:'地下薄壳',kind:'sink',x:3110,y:1500,rx:125,ry:145,strength:.31,slope:.3,grip:.7,warning:'岩壳下面有空洞。绕回灯标之间的坚实地面。'}
 ];
 function project(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);const px=a.x+dx*t,py=a.y+dy*t;return {x:px,y:py,z:(a.z??18)+((b.z??18)-(a.z??18))*t,t,d:Math.hypot(x-px,y-py)}}
 const safeSegments=paths.filter(p=>p.safe).flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,width:p.width,path:p})));
 const riverBounds={minX:Math.min(...river.points.map(p=>p.x)),maxX:Math.max(...river.points.map(p=>p.x)),minY:Math.min(...river.points.map(p=>p.y)),maxY:Math.max(...river.points.map(p=>p.y))};
 const inBox=(x,y,b,pad=0)=>x>=b.minX-pad&&x<=b.maxX+pad&&y>=b.minY-pad&&y<=b.maxY+pad;
 function closestPath(x,y,context=null){let best=null;const cs=context?.caveId==='survey'||context?.id==='survey'||context==='survey';const segments=cs?caveTunnels.map(t=>({...t,width:160})):safeSegments;for(const s of segments){const p=project(x,y,s.a,s.b);if(!best||p.d<best.d)best={...p,width:s.width,path:s.path}}return best;}
 const safePathDistance=(x,y,context=null)=>closestPath(x,y,context)?.d??Infinity;
 function contains(x,y,pad=0){return inBox(x,y,bounds,pad)||inBox(x,y,riverBounds,river.width/2+100+pad)&&riverPoint(x,y).d<river.width/2+100+pad;}
 function reserved(x,y,pad=0){return contains(x,y,pad)||safePathDistance(x,y)<95+pad;}
 function riverPoint(x,y){let best=null;for(let i=1;i<river.points.length;i++){const p=project(x,y,river.points[i-1],river.points[i]);if(!best||p.d<best.d)best={...p,index:i-1};}return best;}
 function onBridge(x,y,pad=0){return Math.abs(x-bridge.x)<=bridge.width/2+pad&&Math.abs(y-bridge.y)<=bridge.length/2+pad;}
 function sample(x,y,context=null,pad=0){
  const caveId=typeof context==='string'?context:context?.caveId||context?.id;
  if(caveId&&caveId!=='survey')return null;
  const underground=caveId==='survey';if(!underground&&!contains(x,y,100))return null;
  const near=closestPath(x,y,underground?'survey':null);if(near&&near.d<near.width/2+8&&!(!underground&&paths.find(p=>p.id==='ford')&&Math.hypot(x-6250,y-11262)<100))return null;
  const match=(underground?caveHazards:hazards).find(p=>Math.hypot((x-p.x)/(p.rx+pad),(y-p.y)/(p.ry+pad))<1);if(match)return match;
  if(!underground&&!onBridge(x,y,10)&&riverPoint(x,y).d<river.width/2+pad)return {id:'river',name:river.name+' · 深水河床',kind:'water',strength:.22,slope:.18,grip:.4,warning:'水下河床承重不明，机甲没有涉水密封。请走旧勘测桥。'};
  if(!underground&&y>11380&&Math.hypot((x-peak.x)/peak.rx,(y-peak.y)/peak.ry)<1.25){const grade=Math.hypot(elevation(x+12,y,0)-elevation(x-12,y,0),elevation(x,y+12,0)-elevation(x,y-12,0))/24;if(grade>1.15)return {id:'mountain-face',name:'断帆山陡壁',kind:'cliff',strength:.82,slope:.98,grip:.18,warning:'岩壁陡直，机甲无法直接攀上去。沿折返路绕向山脊。'};}
  return null;
 }
 function safePoint(x,y,context=null){const p=closestPath(x,y,context);return p?{x:p.x,y:p.y}: {...spawn};}
 // Shared facility data reserves genuine foundations without stale rectangular
 // cut-outs where the old oversized procedural buildings used to stand.
 const pads=typeof ExoWorldLayout!=='undefined'?[...ExoWorldLayout.facilities,...ExoWorldLayout.lifts]:[];
 function padWeight(x,y){let w=0;for(const p of pads){const d=Math.max(Math.abs(x-p.x)-p.w/2-65,Math.abs(y-p.y)-p.d/2-65,0);w=Math.max(w,1-smooth(d/90));}return w;}
 function elevation(x,y,base){
  if(!inBox(x,y,bounds,850)&&!inBox(x,y,riverBounds,320)&&!(x>3500&&x<4700&&y>8300&&y<10000))return base;
  const riverDistance=inBox(x,y,riverBounds,320)?riverPoint(x,y).d:Infinity;
  if(!contains(x,y,850)&&safePathDistance(x,y)>220&&riverDistance>220)return base;
  const edge=Math.min(x-bounds.minX,bounds.maxX-x,y-bounds.minY,bounds.maxY-y),blend=Math.max(smooth((edge+850)/850),1-smooth((riverDistance-160)/160));
  const q=Math.hypot((x-peak.x+105*Math.sin((y-11500)*.005))/peak.rx,(y-peak.y)/peak.ry),mass=Math.exp(-q*q*1.6);
  const strata=4*Math.sin(y*.007+x*.004)+2*Math.sin(x*.013-y*.006);
  let z=base+mass*(540*(.68+.32*Math.exp(-q*q*1.5))+strata);
  for(const r of ridgeNodes){const d=((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2;const broken=1-(r.fracture||0)*(.5+.3*Math.sin(x*.018+y*.007)+.2*Math.sin(x*.037-y*.012));z+=r.height*Math.exp(-d*1.4)*broken;}
  // Layered shoulders fade into the surrounding valley; no rectangular platform
  // boundary and no single flat-topped oval. The walkable cut follows each bend.
  const bank=smooth(1-(riverDistance-river.width/2)/120);
  if(bank>0)z+=(river.waterLevel-32+Math.min(32,riverDistance*.3)-z)*bank;
  const caveMass=Math.exp(-Math.pow((x-4280)/210,2)-Math.pow((y-cave.y)/300,2))*210;z+=caveMass;
  if(x>=cave.x-250&&x<=cave.x+50&&Math.abs(y-cave.y)<105)z+=(18-z)*(1-smooth((Math.abs(y-cave.y)-75)/30));
  const p=closestPath(x,y);if(p){const fade=240-130*Math.exp(-Math.pow((x-5350)/430,2)-Math.pow((y-11510)/300,2)),influence=1-smooth((p.d-p.width/2)/fade);z+=(p.z-z)*influence;}
  const bridgeEdge=Math.max(Math.abs(x-bridge.x)-bridge.width/2,Math.abs(y-bridge.y)-bridge.length/2,0);if(bridgeEdge<45)z+=(bridge.z-z)*(1-smooth(bridgeEdge/45));
  const preserve=padWeight(x,y);return base+(z-base)*blend*(1-preserve);
 }
 function cliffBlocked(from,to,heightAt){
  if(!from||!to||to.y<11380||!contains(to.x,to.y,30))return false;
  const path=closestPath(to.x,to.y);if(path&&path.d<path.width/2+20)return false;
  const distance=Math.hypot(to.x-from.x,to.y-from.y);if(distance<.001)return false;
  // The downhill escape remains available for old saves or a failed probe.
  // Climbing a near-vertical face requires the authored switchback instead.
  return heightAt(to.x,to.y)-heightAt(from.x,from.y)>distance*1.05+.35;
 }
 function route(start,target){
  if(!start||!target||!Number.isFinite(start.x)||!Number.isFinite(target.x))return null;
  const nodes=new Map(),key=p=>p.x+','+p.y,add=p=>{const k=key(p);if(!nodes.has(k))nodes.set(k,{...p,key:k,edges:[]});return nodes.get(k);};
  for(const s of safeSegments){const a=add(s.a),b=add(s.b),d=Math.hypot(a.x-b.x,a.y-b.y);a.edges.push({to:b.key,d});b.edges.push({to:a.key,d});}
  // Attach each endpoint to its nearest segment, preserving its projection on the road.
  function attach(p,id){let best=null;for(const s of safeSegments){const q=project(p.x,p.y,s.a,s.b);if(!best||q.d<best.q.d)best={s,q};}const n={...best.q,key:id,edges:[]};nodes.set(id,n);for(const end of [best.s.a,best.s.b]){const e=nodes.get(key(end)),d=Math.hypot(n.x-e.x,n.y-e.y);n.edges.push({to:e.key,d});e.edges.push({to:id,d});}return n;}
  const first=attach(start,'start'),last=attach(target,'goal'),cost=new Map([['start',0]]),prev=new Map(),todo=new Set(nodes.keys());
  while(todo.size){let at=null;for(const k of todo)if(at===null||(cost.get(k)??Infinity)<(cost.get(at)??Infinity))at=k;if(!Number.isFinite(cost.get(at)))break;todo.delete(at);if(at==='goal')break;for(const e of nodes.get(at).edges){const c=cost.get(at)+e.d;if(c<(cost.get(e.to)??Infinity)){cost.set(e.to,c);prev.set(e.to,at);}}}
  if(!cost.has('goal'))return null;const out=[];let k='goal';while(k){const p=nodes.get(k);out.push({x:p.x,y:p.y});k=prev.get(k);}out.reverse();
  const safeTarget=sample(target.x,target.y)?{x:last.x,y:last.y}:target;if(Math.hypot(out.at(-1).x-safeTarget.x,out.at(-1).y-safeTarget.y)>.1)out.push({x:safeTarget.x,y:safeTarget.y});return out.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>.1);
 }
 return {bounds,spawn,peak,ridgeNodes,river,bridge,cave,caveData,paths,landmarks,hazards,caveHazards,samples,trainingSamples,testSamples,trainXY,testXY,contains,reserved,elevation,sample,safePoint,safePathDistance,riverPoint,onBridge,cliffBlocked,route};
})();
if(typeof module!=='undefined')module.exports=ExoTerrainWilds;
