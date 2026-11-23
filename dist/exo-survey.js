/* Surveyed information is separate from old discovery credit. Visiting a place
   does not silently calibrate it, and old expedition/lesson saves are untouched. */
const ExoSurveyLib=(()=>{
 const KEY='exo-survey-v1',HOME={x:4284,y:6406,radius:155,name:'K–09 · 维修间门前'};
 const sites=[
  {id:0,x:3885,y:7340,camp:8,regions:[8,0],name:'归路信标',area:'K–09 与西部荒原',bias:-108,detail:'灯下的检修柜里留着一只没拆封的滤筒。',cargo:'filter'},
  {id:1,x:6800,y:9000,camp:3,regions:[3],name:'河谷信标',area:'河谷草甸',bias:144,detail:'车辙绕过河岸软土。旧图里的直路，已经被水冲断。'},
  {id:2,x:7400,y:6600,camp:5,regions:[5,1],name:'矿道信标',area:'西部矿区与山洞',bias:-162,detail:'泵站留下一只密封阀。老林那边的育苗槽，也许还能用。',cargo:'valve'},
  {id:3,x:10200,y:2200,camp:2,regions:[2],name:'遗迹信标',area:'遗迹台地',bias:90,detail:'被风沙埋住的灯脚，还刻着返程方向。'},
  {id:4,x:17400,y:3600,camp:7,regions:[7],name:'群峰信标',area:'北境群峰',bias:-126,detail:'山口的旧标高已经失准。风声里，终于能分出人的呼叫。'},
  {id:5,x:16100,y:9600,camp:6,regions:[6,4],name:'深井信标',area:'盆地与东支井',bias:180,detail:'两名检修员听见了 K–09。柜里还有折叠铺架，能给他们腾个地方。',cargo:'berths'}
 ].map(s=>Object.freeze({...s,radius:175,type:'地形测绘信标',desc:s.detail}));
 const cargo={filter:{name:'备用滤筒',title:'让风机重新转起来',after:'滤筒换好了。风机不再喘振，门口能听见平稳的气流。'},valve:{name:'水泵密封阀',title:'给育苗槽接上水',after:'水回到了育苗槽。老林把遮住叶子的防尘布卷到一边。'},berths:{name:'折叠铺架',title:'给回来的人留个位置',after:'两名检修员沿新校准的灯路回来了。棚下多了杯子、行囊和有人睡过的铺位。'}};
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function create({storage=null}={}){
  let state={version:1,calibrated:[],carrying:[],installed:[],visited:[]},revision=0;
  try{const v=JSON.parse(storage?.getItem(KEY)||'null');if(v?.version===1){state.calibrated=sites.filter(s=>v.calibrated?.includes(s.id)).map(s=>s.id);state.installed=Object.keys(cargo).filter(k=>v.installed?.includes(k));state.carrying=Object.keys(cargo).filter(k=>v.carrying?.includes(k)&&!state.installed.includes(k));state.visited=Array.from({length:9},(_,i)=>i).filter(i=>v.visited?.includes(i));}
   const old=JSON.parse(storage?.getItem('exo-expedition-v1')||'null');for(let i=0;i<9;i++)if(old?.earned?.includes('region:'+i)&&!state.visited.includes(i))state.visited.push(i);
  }catch{}
  const save=()=>{revision++;try{storage?.setItem(KEY,JSON.stringify(state));}catch{}};
  const calibrated=id=>state.calibrated.includes(id),installed=id=>state.installed.includes(id);
  const known=region=>sites.some(s=>s.regions.includes(region)&&calibrated(s.id));
  const canReturn=region=>state.visited.includes(region);
  const grounded=(u,w)=>u&&Number.isFinite(u.x)&&Number.isFinite(u.y)&&!u.flight&&!w.cave&&!w.interior;
  const near=(u,w,p)=>grounded(u,w)&&distance(u,p)<=p.radius;
  function visit(u,w){if(!grounded(u,w))return;let changed=false;w.surfaceCamps.forEach((c,i)=>{if(distance(u,c)<260&&!state.visited.includes(i)){state.visited.push(i);changed=true;}});if(distance(u,HOME)<HOME.radius&&!state.visited.includes(8)){state.visited.push(8);changed=true;}if(changed)save();}
  function sample(id,u,w){const s=sites[id];if(!s||!near(u,w,s)||calibrated(id)||u.energy<12)return null;u.energy-=12;
   // Two observations fit a constant datum correction. The third is held out.
   const points=[{x:s.x-90,y:s.y},{x:s.x+90,y:s.y},{x:s.x,y:s.y+110}];
   return {id,trim:0,points:points.map(p=>{const actual=w.surfaceElevation(p.x,p.y)/18;return {...p,actual,old:actual+s.bias/18};})};
  }
  const error=(session,test=false)=>!session?Infinity:Math.abs(session.points[test?2:0].old+session.trim-session.points[test?2:0].actual);
  function tune(session,value){if(!session||!Number.isFinite(value))return false;session.trim=Math.round(Math.max(-12,Math.min(12,value))*2)/2;return true;}
  function calibrate(session,u,w){const s=sites[session?.id];if(!s||calibrated(s.id)||!near(u,w,s)||!Number.isFinite(session.trim)||Math.abs(s.bias/18+session.trim)>.6||error(session,true)>.6)return false;state.calibrated.push(s.id);save();return s;}
  function take(id,u,w){const s=sites[id],k=s?.cargo;if(!s||!k||!calibrated(id)||!near(u,w,s)||state.carrying.includes(k)||installed(k))return false;state.carrying.push(k);save();return k;}
  function deliver(u,w){if(!near(u,w,HOME)||!state.carrying.length)return [];const items=[...state.carrying];state.installed.push(...items);state.carrying=[];save();return items;}
  function objective(){const pending=state.carrying.length>0;const supply=sites.find(s=>calibrated(s.id)&&s.cargo&&!installed(s.cargo)&&!state.carrying.includes(s.cargo));const next=supply||sites.find(s=>!calibrated(s.id));
   if(pending)return {id:'refuge-return',title:'把带回来的东西用起来',instruction:'回 K–09，把'+state.carrying.map(k=>cargo[k].name).join('、')+'交给老林。维修间门口的 E 可以交付、休整和保存。',action:'refuge',label:'回维修间',point:HOME,...HOME,finished:false};
   if(next)return {id:'survey:'+next.id,title:supply?'带走检修柜里的物资':'去'+next.name+'，核对旧图',instruction:supply?next.detail+' 靠近信标，取出物资带回维修间。':'沿青灯抵达'+next.name+'。接上现场扫描，对齐旧标高，再用另一处测点核验。',action:'survey',label:supply?'取出检修物资':'校准'+next.name,point:next,...{x:next.x,y:next.y,radius:next.radius},finished:false};
   return {id:'survey-complete',title:'六座信标都有了回应',instruction:'已复测的地区可以查看道路、路灯与入口。K–09 给回来的人留了位置；沿支路继续寻找遗物，或回去休整。',action:'refuge',label:'回 K–09 看看',point:HOME,...HOME,finished:true};
  }
  return {sites,cargo,home:HOME,known,calibrated,installed,canReturn,grounded,near,visit,sample,error,tune,calibrate,take,deliver,objective,get revision(){return revision},get state(){return {...state,calibrated:[...state.calibrated],carrying:[...state.carrying],installed:[...state.installed],visited:[...state.visited]};}};
 }
 return {create,sites,cargo,HOME,KEY};
})();
const ExoSurvey=ExoSurveyLib.create({storage:typeof localStorage==='undefined'?null:localStorage});
if(typeof module!=='undefined')module.exports=ExoSurveyLib;
