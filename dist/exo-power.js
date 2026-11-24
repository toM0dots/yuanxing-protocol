/* P1–P6 operate on Thing data. The renderer never decides a connection.
   Sleeping objects do not drain. A component is rebuilt on transfers and
   at 10 Hz for moving conductors. No world-wide scan or mesh raycasts. */
const ExoPower=(()=>{
 const DRAIN=1/2400,STUN=6,WATER_RANGE=120;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const live=t=>!t.state.broken&&t.state.rewired!==false;
 function create(things){
  let point=null,busy=false,last=null;const shockTimers=new Map();
  const allowed=t=>t.zone!=='depot'||things.getFlag('depotOpen');
  let topologyKey='',cachedNetwork=null;
  function solve(rows){
   const nodes=rows.filter(t=>allowed(t)&&live(t)&&(t.material==='metal'||t.material==='water')&&t.kind!=='creature'&&t.kind!=='cache'&&t.kind!=='gate');
   const feeds=nodes.map(t=>t.socket?things.contents('socket:'+t.id).filter(b=>b.state.charge>0).map(b=>b.id):t.kind==='battery'&&t.state.charge>0?[t.id]:[]);
   const key=nodes.map((t,i)=>[t.id,t.x,t.y,t.z,t.radius,t.material,t.kind,(t.ends||[]).join(','),feeds[i].join(',')].join('/')).join('|');
   if(key===topologyKey&&cachedNetwork)return cachedNetwork;
   const ids=new Map(nodes.map((t,i)=>[t.id,i])),parent=Int16Array.from(nodes,(_,i)=>i);
   const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
   const link=(i,j)=>{const a=root(i),b=root(j);if(a!==b)parent[b]=a;};
   for(let i=0;i<nodes.length;i++){
    const a=nodes[i];if(a.kind==='cable'){for(const id of a.ends||[]){const j=ids.get(id);if(j!==undefined)link(i,j);}continue;}
    for(let j=i+1;j<nodes.length;j++){
     const b=nodes[j];if(b.kind==='cable')continue;
     const water=a.material==='water'?a:b.material==='water'?b:null,reach=water?Math.min(WATER_RANGE,water.radius):(a.radius+b.radius+5),dx=a.x-b.x,dy=a.y-b.y;
     if(Math.abs((a.z||0)-(b.z||0))<35&&dx*dx+dy*dy<=reach*reach)link(i,j);
    }
   }
   const sourceGroups=new Map(),powered=new Map();
   for(let i=0;i<nodes.length;i++)if(feeds[i].length){const r=root(i);if(!sourceGroups.has(r))sourceGroups.set(r,[]);sourceGroups.get(r).push(...feeds[i]);}
   for(let i=0;i<nodes.length;i++){const feed=sourceGroups.get(root(i));if(feed?.length)powered.set(nodes[i].id,feed);}
   topologyKey=key;cachedNetwork={nodes,powered};return cachedNetwork;
  }
  function apply(rows,network){
   for(const t of rows){if(!allowed(t)||t.kind==='creature')continue;const powered=network.powered.has(t.id),state={powered};if(t.kind==='lamp')state.lit=powered;if(t.kind==='door')state.open=!!(powered||t.manualOpen||t.controls?.some(id=>things.get(id)?.state.pressed));if(Object.keys(state).some(k=>t.state[k]!==state[k]))things.patch(t.id,{state},powered?'power-on':'power-off');}
  }
  function refresh(p=point){if(!p||busy)return last;point={...p};busy=true;try{const rows=things.wake(point).filter(allowed);last=solve(rows);things.transaction(()=>apply(rows,last),{save:false});return last;}finally{busy=false;}}
  // A battery transfer cuts the component in the same input turn, before
  // the next 10 Hz tick. Ignore the derived-state events from that rebuild.
  const unsubscribe=things.subscribe(e=>{if(e.type==='changed'&&e.before&&(e.before.location!==e.after.location||e.reason==='overload'||e.reason==='rewire'||e.before.state.charge>0&&e.after.state.charge===0))refresh();});
  function tick(dt,ctx){
   point={...ctx.point};const rows=things.wake(point).filter(allowed);if(!rows.length)return;
   busy=true;try{things.transaction(()=>{
    let network=solve(rows);apply(rows,network);
    let depleted=false;const draining=new Set();for(const [id,feeds] of network.powered){const t=things.get(id);if(t.kind!=='battery')for(const feed of feeds)draining.add(feed);}
    for(const id of draining){const b=things.get(id);const charge=Math.max(0,b.state.charge-DRAIN*dt);depleted||=charge===0;things.patch(id,{state:{charge}},'battery-drain');}
    const targets=network.nodes.filter(t=>network.powered.has(t.id)&&t.material!=='water'&&t.kind!=='cable');
    for(const old of rows.filter(t=>t.kind==='creature'&&t.species==='seam')){
     const c=things.get(old.id),stunned=Math.max(0,(c.state.stunned||0)-dt),cooldown=Math.max(0,(c.state.shockCooldown||0)-dt);things.patch(c.id,{state:{stunned,shockCooldown:cooldown}},'creature-time');if(stunned)continue;
     const target=targets.filter(t=>distance(c,t)<520).sort((a,b)=>(distance(c,a)-(a.kind==='battery'?240:0))-(distance(c,b)-(b.kind==='battery'?240:0))||a.id.localeCompare(b.id))[0];if(!target)continue;
     const d=distance(c,target),step=Math.min(Math.max(0,d-20),26*dt);if(step>0)things.patch(c.id,{x:c.x+(target.x-c.x)/d*step,y:c.y+(target.y-c.y)/d*step,state:{feeding:false,target:target.id}},'seam-moving');
     else{things.patch(c.id,{state:{feeding:true,target:target.id}},'seam-feeding');for(const id of network.powered.get(target.id)||[]){const b=things.get(id);const charge=Math.max(0,b.state.charge-.018*dt);depleted||=charge===0;things.patch(id,{state:{charge}},'seam-drain');}}
    }
    if(depleted){const fresh=rows.map(t=>things.get(t.id));network=solve(fresh);apply(fresh,network);}last=network;
    const waters=network.nodes.filter(t=>t.material==='water'&&network.powered.has(t.id));
    for(const c0 of rows.filter(t=>t.kind==='creature')){const c=things.get(c0.id);if(!c.state.shockCooldown&&waters.some(w=>distance(w,c)<=Math.min(WATER_RANGE,w.radius))){things.patch(c.id,{state:{stunned:STUN,shockCooldown:8}},'water-stun');things.signal('stun',{id:c.id,seconds:STUN});}}
    for(const [id,v] of shockTimers){if(v<=dt)shockTimers.delete(id);else shockTimers.set(id,v-dt);}
    for(const actor of ctx.actors||[]){if(actor.airborne||shockTimers.has(actor.id))continue;if(waters.some(w=>distance(w,actor)<=Math.min(WATER_RANGE,w.radius))){shockTimers.set(actor.id,actor.player?2:8);ctx.onShock?.(actor,actor.player?1:STUN);}}
   },{save:false});}finally{busy=false;}
  }
  function rewire(id){const t=things.get(id);if(!t?.socket||!t.state.broken)return {ok:false,message:'接线完好。'};if(things.contents('socket:'+id).length)return {ok:false,message:'先取出电池，才能接回断线。'};things.transaction(()=>things.patch(id,{state:{broken:false,rewired:true}},'rewire'));return {ok:true,message:'断线接回去了，可以重新装电池。',sound:'light'};}
  return {tick,refresh,rewire,dispose:unsubscribe,get network(){return last;}};
 }
 return {create,DRAIN,STUN,WATER_RANGE};
})();
if(typeof module!=='undefined')module.exports=ExoPower;
