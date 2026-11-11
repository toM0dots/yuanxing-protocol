/* Lamps the player keeps lit. Dark lanterns stand along the first-act route;
   each takes one salvaged cell and then stays lit for good. Cells are scarce:
   three roadside caches hold one each, and the three K-09 message lamps run on
   two cells apiece. Take one and that lamp dims; take both and it goes dark;
   put a cell back and it lights again. The map slowly fills with the lights
   the player chose to keep on. State lives in this browser. */
const ExoLampRepair=(()=>{
 const KEY='exo-lamps-v1',REACH=125;
 const empty=()=>({cells:0,fixed:[],caches:[],drawn:{}});
 let state=empty(),reader=()=>false,confirm=null;
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object')state={cells:Math.max(0,Math.min(9,raw.cells|0)),fixed:Array.isArray(raw.fixed)?raw.fixed.filter(x=>typeof x==='string'):[],caches:Array.isArray(raw.caches)?raw.caches.filter(x=>typeof x==='string'):[],drawn:raw.drawn&&typeof raw.drawn==='object'?Object.fromEntries(Object.entries(raw.drawn).map(([k,v])=>[k,Math.max(0,Math.min(2,v|0))])):{}};}catch{}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
 // Off the road shoulder, on the left of travel, so lamps never block the trail.
 function shoulder(a,b,t,side=1,offset=62){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return {x:x-dy/l*offset*side,y:y+dx/l*offset*side};}
 const broken=[
  {id:'lamp:crash-bend',name:'谷口折返灯',...shoulder([1830,8930],[2100,8450],.6)},
  {id:'lamp:crash-ridge',name:'车辙坡灯',...shoulder([2450,8010],[2890,7770],.5,-1)},
  {id:'lamp:rest-path',name:'休息点小路灯',...shoulder([3770,5370],[4410,5580],.5)},
  {id:'lamp:refuge-turn',name:'维修间转角灯',...shoulder([4780,5830],[4760,6520],.5,-1)},
  {id:'lamp:dock-road',name:'接驳路中段灯',...shoulder([4510,6850],[5000,7100],.85)},
  {id:'lamp:river-road',name:'河谷路标灯',...shoulder([5000,8200],[4930,9000],.5,-1)}
 ].map(l=>({...l,kind:'broken'}));
 const caches=[
  {id:'cache:belongings',name:'车辙旁的补给箱',x:2706,y:7052},
  {id:'cache:lookout',name:'望哨下的电池箱',x:2586,y:5596},
  {id:'cache:cargo',name:'货架上的应急电池',x:5066,y:5548}
 ].map(c=>({...c,kind:'cache'}));
 // The three K-09 message lamps (ExoGreenTrail) each carry two cells.
 const spares=()=>(typeof ExoGreenTrail!=='undefined'?ExoGreenTrail.records:[]).map(r=>({id:r.id,name:r.name,x:r.x,y:r.y,kind:'spare'}));
 const all=()=>[...broken,...caches,...spares()];
 // 1 lit, .55 dimmed, 0 dark.
 function level(item){if(item.kind==='broken')return state.fixed.includes(item.id)?1:0;if(item.kind==='spare'){const d=state.drawn[item.id]||0;return d===0?1:d===1?.55:0;}return 0;}
 const cacheFull=c=>!state.caches.includes(c.id);
 function near(u){
  if(!u||u.flight)return null;let best=null,dist=REACH;
  for(const item of all()){
   if(item.kind==='spare'&&!reader(item.id))continue;      // read the message first
   const d=Math.hypot(u.x-item.x,u.y-item.y);if(d>=dist)continue;
   if(item.kind==='broken'&&level(item)===1)continue;
   if(item.kind==='cache'&&!cacheFull(item))continue;
   best=item;dist=d;
  }
  return best;
 }
 function label(item){
  if(!item)return '';
  if(item.kind==='cache')return '取出电池';
  if(item.kind==='broken')return state.cells>0?'打开接线盒，修好'+item.name:'查看'+item.name;
  const d=state.drawn[item.id]||0;
  if(d>0&&state.cells>0)return '把电池装回'+item.name;
  return d===0?'从'+item.name+'取一块电池':'取走最后一块电池';
 }
 function act(item,now=Date.now()){
  const left=()=>'（电池 '+state.cells+'）';
  if(item.kind==='cache'){
   if(!cacheFull(item))return {message:'箱子已经空了。'};
   state.caches.push(item.id);state.cells++;save();
   return {message:'从'+item.name+'取出一块应急电池。'+left(),sound:'take'};
  }
  if(item.kind==='broken'){
   if(level(item)===1)return {message:item.name+'已经亮着。'};
   if(state.cells<1)return {message:item.name+'的电池仓是空的。需要一块电池：路边的补给箱里或许还有，K–09 的灯箱里也各装着两块。'};
   return {wiring:true,message:'打开'+item.name+'的接线盒。'};
  }
  const d=state.drawn[item.id]||0;
  if(d>0&&state.cells>0){
   state.drawn[item.id]=d-1;state.cells--;save();confirm=null;
   return {message:'你把电池装回'+item.name+'。'+(d-1===0?'灯重新亮稳了。':'灯又亮了起来，只是还暗着一些。')+left(),sound:'light'};
  }
  if(d===0){state.drawn[item.id]=1;state.cells++;save();return {message:'取下一块电池。'+item.name+'暗了一些，但还亮着。'+left(),sound:'take'};}
  if(d===1){
   if(!confirm||confirm.id!==item.id||now-confirm.at>5000){confirm={id:item.id,at:now};return {message:'这是'+item.name+'里最后一块电池。取走它，这盏灯就会熄灭。再按一次 E 确认。'};}
   confirm=null;state.drawn[item.id]=2;state.cells++;save();
   return {message:item.name+'熄了。这段路又回到黑暗里。'+left(),sound:'dark'};
  }
  return {message:item.name+'里已经没有电池了。'};
 }
 // Called once the wiring is reconnected (exo-lamp-wiring.js).
 function repair(item){
  if(item.kind!=='broken'||level(item)===1)return {message:item.name+'已经亮着。'};
  if(state.cells<1)return {message:'没有电池了。'};
  state.cells--;state.fixed.push(item.id);save();
  const lit=state.fixed.length;
  return {message:'灯亮了。这段路以后不必摸黑走。（电池 '+state.cells+'）'+(lit===broken.length?' 沿线的灯都亮着了。':''),sound:'light',lit:item.id};
 }
 function summary(){return {cells:state.cells,fixed:state.fixed.length,total:broken.length,caches:caches.length-state.caches.length};}
 return {broken,caches,spares,all,near,label,act,repair,level,summary,taken:id=>state.caches.includes(id),setReader(fn){reader=typeof fn==='function'?fn:()=>false;},get state(){return JSON.parse(JSON.stringify(state));},reset(){state=empty();save();}};
})();
if(typeof module!=='undefined')module.exports=ExoLampRepair;
