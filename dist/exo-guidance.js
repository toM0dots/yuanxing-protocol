/* One proximity resolver supplies the E key, touch prompt and world label.
   Only the object actually within reach can act. Guidance never awards clues. */
const ExoGuidance=(()=>{
 const REACH=160,NOTICE=440;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const names={crash:'迫降驾驶舱',route:'断路警戒灯',lamps:'青灯林道',mother:'撤离休息点 · 旧合影',captain:'撤离通话点 · 通话器',refuge:'K–09 · 老林',model:'东侧接驳坪',defense:'东侧接驳坪',stabilizer:'K–09 · 稳定架'};
 function name(o){if(o?.id==='route'&&o.point?.name)return o.point.name;if(o?.id==='lamps'&&o.point){const r=ExoGreenTrail.records.find(r=>distance(r,o.point)<5);if(r)return r.name;}return names[o?.id]||o?.title||'沿途灯标';}
 function clear(u,p,world){return !world.cave&&!world.interior&&!u.flight&&(!world.structuresBlocked?.({...u,z:world.elevation(u.x,u.y)+70},{...p,z:world.elevation(p.x,p.y)+45}))&&(typeof ExoCanyonV2==='undefined'||!ExoCanyonV2.blocked(u,p));}
 const waylightCache=new WeakMap();
 function waylights(world){
  if(!waylightCache.has(world)){
   const canyon=typeof ExoCanyonV2==='undefined'?null:ExoCanyonV2;
   const points=(world.beacons||[]).filter(p=>{if(!canyon?.inZone(p.x,p.y))return true;const q=canyon.local(p.x,p.y);return canyon.clearance(q.x,q.y)>=3;});
   for(const [i,camp] of (world.surfaceCamps||[]).entries()){
    if(i===8&&typeof ExoStoryRoute!=='undefined')continue;
    for(const side of [-1,1])points.push({x:camp.x+side*90,y:camp.y});
   }
   waylightCache.set(world,points.map(p=>({...p,id:'waylight:'+Math.round(p.x)+':'+Math.round(p.y),kind:'waylight',name:p.side?'支路路标灯':'青灯路标'})));
  }
  return waylightCache.get(world);
 }
 function resolve({unit:u,world,objective:o,disabled=false,earned=[]}){
  if(disabled||world.cave||world.interior||u.flight)return null;
  if(o?.action==='acknowledge'&&(!o.point||distance(u,o.point)<=o.radius)&&(!o.point||clear(u,o.point,world)))return {kind:'story',id:o.id,point:o.point||u,label:o.label,detail:'主线 · 停下来看看',priority:0};
  const list=[],add=(kind,point,label,detail,priority,extra={})=>{const d=distance(u,point);if(d<=REACH&&clear(u,point,world))list.push({kind,id:point.id,point,label,detail,priority,d,...extra});};
  if(typeof ExoLampRepair!=='undefined')for(const lamp of ExoLampRepair.all()){
   const read=earned.includes(lamp.id),required=o?.id==='lamps'&&o.point&&distance(lamp,o.point)<5;
   add('lamp',lamp,lamp.kind==='cache'?'检查'+lamp.name:'查看'+lamp.name,lamp.kind==='spare'?(read?'维护灯箱 · 记录已保存':'主线线索 · 灯箱旁有遗物'):lamp.kind==='cache'?'补给 · 应急电池':ExoLampRepair.level(lamp)?'已修复 · 灯仍亮着':'可检修 · 需要一块电池',required?1:lamp.kind==='spare'&&!read?2:lamp.kind==='cache'&&!ExoLampRepair.taken(lamp.id)?3:5,{lamp});
  }
  if(typeof ExoStoryRoute!=='undefined')for(const clue of ExoStoryRoute.detours)add('detour',clue,'查看'+clue.object,'支路发现 · 可以稍后再来',6,{clue});
  const station=typeof ExoTrainingGround!=='undefined'?ExoTrainingGround.near(u):null;
  if(station)add('station',station,station.name,'沿途工具',7,{station});
  for(const lamp of waylights(world))add('lamp',lamp,'查看'+lamp.name,lamp.side?'琥珀支路 · 会绕回主路':'青灯主路 · 指向下一处故事地点',10,{lamp});
  const score=p=>p.priority<=2?-1000+p.priority*100+p.d:p.d+p.priority*3;
  return list.sort((a,b)=>score(a)-score(b))[0]||null;
 }
 function label(o,u){if(!o?.point)return o?.label||'';const d=distance(u,o.point);return d<=NOTICE?'前方 '+name(o):'前往 '+name(o);}
 // Fixed-spacing samples along the route. Never draw a straight shortcut
 // across a bend; renderer uses depth testing so rock conceals the projection.
 function breadcrumbs(u,points,count=10,spacing=110){
  let best=null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((u.x-a.x)*dx+(u.y-a.y)*dy)/(l2||1))),p={x:a.x+dx*t,y:a.y+dy*t},d=distance(u,p);if(!best||d<best.d)best={i,p,d};}
  if(!best)return [];const result=[];let a=best.p,left=55;
  for(let i=best.i;i<points.length&&result.length<count;i++){const b=points[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l<.01){a=b;continue;}while(left<l&&result.length<count){result.push({x:a.x+dx*left/l,y:a.y+dy*left/l,angle:Math.atan2(dx,dy)});left+=spacing;}left-=l;a=b;}
  return result;
 }
 function draw(g,{unit,c,w,h},target,objective,project){
  const point=target?.point||(objective?.point&&distance(unit,objective.point)<NOTICE?objective.point:null);if(!point||!clear(unit,point,ExoWorld))return;
  const p=project(point.x,point.y,ExoWorld.elevation(point.x,point.y)+80-ExoWorld.elevation(c.x,c.y),c,w,h);
  if(p.d<20||p.x<80||p.x>w-80||p.y<90||p.y>h-120)return;
  const text=target?'E · '+target.label:name(objective)+' · '+Math.ceil(distance(unit,point)/18)+' m';
  g.save();g.font='600 15px system-ui, "PingFang SC", sans-serif';g.textAlign='center';g.lineWidth=5;g.strokeStyle='#071a20';g.fillStyle=target?'#d4ffe9':'#b7ead6';g.strokeText(text,p.x,p.y-18);g.fillText(text,p.x,p.y-18);g.beginPath();g.moveTo(p.x-6,p.y-7);g.lineTo(p.x,p.y);g.lineTo(p.x+6,p.y-7);g.stroke();g.restore();
 }
 return {REACH,NOTICE,distance,name,label,clear,resolve,waylights,breadcrumbs,draw};
})();
if(typeof module!=='undefined')module.exports=ExoGuidance;
