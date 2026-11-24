/* Renderer-independent world objects. Positions use the game's x/y ground
   plane; elevation is z. Consumers change objects through patch/transaction,
   never through meshes. Only authored differences belong in this save. */
const ExoThings=(()=>{
 const KEY='exo-things-v1',CELL=300,MAX_ACTIVE=300;
 const copy=v=>JSON.parse(JSON.stringify(v));
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const safeKey=k=>!['__proto__','prototype','constructor'].includes(k);
 const finite=(v,f=0)=>Number.isFinite(v)?v:f;
 const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return Object.freeze(o);};
 function normalise(input){
  if(!input||typeof input.id!=='string'||!safeKey(input.id)||typeof input.kind!=='string')throw Error('Invalid Thing');
  const t={material:'metal',physics:'fixed',mass:1,x:0,y:0,z:0,radius:20,context:'surface',location:'world',...copy(input)};
  for(const k of ['x','y','z','mass','radius'])t[k]=finite(t[k]);
  t.mass=Math.max(0,t.mass);t.radius=Math.max(1,t.radius);t.state={...(input.state||{})};
  if(t.kind==='battery')t.state.charge=Math.max(0,Math.min(1,finite(t.state.charge,1)));
  return freeze(t);
 }
 function create({placements=[],storage,key=KEY}={}){
  const defaults=new Map(),objects=new Map(),grid=new Map(),buckets=new Map(),locations=new Map(),located=new Map(),listeners=new Set();
  let flags={},depth=0,queued=[],dirty=false,revision=0,error=null,restored=false,active=[],sleeping=[];
  function bucket(t){return t.location==='world'?t.context+':'+Math.floor(t.x/CELL)+':'+Math.floor(t.y/CELL):null;}
  function index(t){const previous=located.get(t.id);if(previous!==t.location){locations.get(previous)?.delete(t.id);if(!locations.has(t.location))locations.set(t.location,new Set());locations.get(t.location).add(t.id);located.set(t.id,t.location);}const old=buckets.get(t.id),next=bucket(t);if(old===next)return;if(old){grid.get(old)?.delete(t.id);if(!grid.get(old)?.size)grid.delete(old);}buckets.delete(t.id);if(next){if(!grid.has(next))grid.set(next,new Set());grid.get(next).add(t.id);buckets.set(t.id,next);}}
  for(const row of placements){const t=normalise(row);if(defaults.has(t.id))throw Error('Duplicate Thing '+t.id);defaults.set(t.id,t);objects.set(t.id,t);index(t);}
  function snapshot(){
   const changes={},added={};
   for(const [id,t] of objects){const base=defaults.get(id);if(!base){added[id]=t;continue;}const delta={};for(const k of Object.keys(t)){if(k==='state'){const state={};for(const s of Object.keys(t.state))if(safeKey(s)&&!equal(t.state[s],base.state[s]))state[s]=t.state[s];if(Object.keys(state).length)delta.state=state;}else if(!equal(t[k],base[k]))delta[k]=t[k];}if(Object.keys(delta).length)changes[id]=delta;}
   return {version:1,changes,added,flags:copy(flags)};
  }
  function persist(){if(!dirty)return true;try{storage?.setItem(key,JSON.stringify(snapshot()));dirty=false;error=null;return true;}catch(e){error='进度暂时无法保存，先别关闭页面。';return false;}}
  function emit(event){queued.push(freeze({...event,revision:++revision}));dirty=true;if(!depth){persist();dispatch();}}
  function dispatch(){const events=queued;queued=[];for(const event of events)for(const listener of listeners)try{listener(event);}catch(e){console.warn('Thing event listener failed',e);}}
  function transaction(fn,{save=true}={}){
   if(depth){depth++;try{return fn();}finally{depth--;}}
   const before=new Map(objects),oldFlags=copy(flags),oldRevision=revision;depth=1;
   try{const result=fn();depth=0;if(save&&!persist())throw Error(error);dispatch();return result;}
   catch(e){depth=0;objects.clear();grid.clear();buckets.clear();locations.clear();located.clear();for(const [id,t] of before){objects.set(id,t);index(t);}flags=oldFlags;revision=oldRevision;queued=[];dirty=false;throw e;}
  }
  function patch(id,delta,reason='change'){
   const before=objects.get(id);if(!before)return null;
   if(Object.entries(delta).every(([k,v])=>k==='state'?Object.entries(v||{}).every(([s,n])=>equal(n,before.state[s])):equal(v,before[k])))return before;
   const clean=Object.fromEntries(Object.entries(delta).filter(([k])=>safeKey(k)&&k!=='id'));
   const after=normalise({...before,...clean,state:{...before.state,...clean.state}});if(equal(before,after))return before;
   objects.set(id,after);index(after);emit({type:'changed',id,reason,before,after});return after;
  }
  function add(row,reason='spawn'){if(objects.has(row.id))return objects.get(row.id);const t=normalise(row);objects.set(t.id,t);index(t);emit({type:'added',id:t.id,reason,after:t});return t;}
  function flag(name,value){if(!safeKey(name))return;if(equal(flags[name],value))return;flags[name]=copy(value);emit({type:'flag',name,value:copy(value)});}
  function near(point,radius=600,{context=point.context||'surface',kind,limit=MAX_ACTIVE}={}){
   const found=[],r2=radius*radius;for(let x=Math.floor((point.x-radius)/CELL);x<=Math.floor((point.x+radius)/CELL);x++)for(let y=Math.floor((point.y-radius)/CELL);y<=Math.floor((point.y+radius)/CELL);y++){
    for(const id of grid.get(context+':'+x+':'+y)||[]){const t=objects.get(id);if(kind&&t.kind!==kind)continue;const d2=(t.x-point.x)**2+(t.y-point.y)**2;if(d2<=r2)found.push({t,d2});}
   }
   found.sort((a,b)=>a.d2-b.d2||a.t.id.localeCompare(b.t.id));return found.slice(0,limit).map(v=>v.t);
  }
  function wake(point){const rows=near(point,1500,{limit:MAX_ACTIVE});active=[];sleeping=[];for(const t of rows)(Math.hypot(t.x-point.x,t.y-point.y)<=600?active:sleeping).push(t);return active;}
  try{
   const raw=JSON.parse(storage?.getItem(key)||'null');if(raw&&raw.version!==1)throw Error('Unsupported Thing save');if(raw?.version===1){
    for(const [id,row] of Object.entries(raw.added||{}))if(safeKey(id)&&row?.id===id&&!defaults.has(id)){const t=normalise(row);objects.set(id,t);index(t);}
    for(const [id,delta] of Object.entries(raw.changes||{})){const base=objects.get(id);if(!base||!delta||typeof delta!=='object')continue;const fields=Object.fromEntries(Object.entries(delta).filter(([k])=>safeKey(k)&&k!=='id'));const t=normalise({...base,...fields,state:{...base.state,...fields.state}});objects.set(id,t);index(t);}
    flags=Object.fromEntries(Object.entries(raw.flags||{}).filter(([k])=>safeKey(k)));restored=true;
   }
  }catch(e){error='物件存档损坏，原文件未改动。';}
  function signal(kind,detail={}){const event=freeze({type:'signal',kind,...detail});for(const listener of listeners)try{listener(event);}catch(e){console.warn('Thing signal listener failed',e);}}
  return {get:id=>objects.get(id)||null,all:()=>Array.from(objects.values()),contents:location=>Array.from(locations.get(location)||[],id=>objects.get(id)),near,wake,patch,add,transaction,signal,flag,getFlag:name=>flags[name],snapshot,save:persist,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},get active(){return active;},get sleeping(){return sleeping;},get revision(){return revision;},get restored(){return restored;},get error(){return error;},get count(){return objects.size;}};
 }
 return {KEY,CELL,MAX_ACTIVE,create};
})();
if(typeof module!=='undefined')module.exports=ExoThings;
