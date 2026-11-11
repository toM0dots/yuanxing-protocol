/* Staged mech development. The mech starts with the pulse gun only; energy
   cores and alloy from kills and exploration develop the jet pack, then the
   beam saber, then the missile cannon, always in that order. Saved per browser. */
const ExoArmoryLib=(()=>{
 const KEY='exo-armory-v1';
 const MATERIALS={energy:{name:'能源晶核',short:'晶核',hint:'供能类 · 击败异兽、接通电源和找到记录可获得'},metal:{name:'合金',short:'合金',hint:'金属类 · 击败异兽、发现新地点和设施可获得；也用于现场修复'}};
 const STAGES=[
  {id:'pulse',name:'脉冲炮',key:'F',cost:null,desc:'右臂脉冲炮。出发时唯一可用的武器。'},
  {id:'jetpack',name:'喷气背包',key:'V / 空格',cost:{energy:6,metal:8},desc:'背部推进器上线：可以起飞（V），地面推进冲刺会点燃喷口。研制前只能用腿部小跑。'},
  {id:'saber',name:'光束军刀',key:'J',cost:{energy:10,metal:14},desc:'近身扇形斩击，硬直更强。需要先完成喷气背包。'},
  {id:'cannon',name:'导弹炮',key:'K',cost:{energy:16,metal:22},desc:'肩部导弹舱，三联追踪导弹。需要先完成光束军刀。'}
 ];
 // Per creature rank: [metal, energy]. Respawned creatures drop again.
 const DROPS=[[2,1],[3,1],[3,3],[8,6]];
 // First-time discoveries: material reward by record kind.
 const EXPLORE={region:{metal:3},facility:{metal:3},depth:{energy:2},log:{energy:2},power:{energy:1},trail:{energy:2},beacon:{energy:3,metal:2},core:{energy:6,metal:6},combat:{metal:2},protocol:{energy:5,metal:5}};
 function create({storage=null}={}){
  let state={version:1,energy:0,metal:0,owned:['pulse'],retro:false,announced:[]},storageOK=true,revision=0;
  try{const raw=JSON.parse(storage?.getItem(KEY)||'null');if(raw?.version===1){
   state.energy=Math.max(0,Math.floor(+raw.energy||0));state.metal=Math.max(0,Math.floor(+raw.metal||0));state.retro=!!raw.retro;
   // Owned stages must be a prefix of the development order.
   const owned=Array.isArray(raw.owned)?raw.owned:[];let n=1;while(n<STAGES.length&&owned.includes(STAGES[n].id))n++;state.owned=STAGES.slice(0,n).map(s=>s.id);
   state.announced=Array.isArray(raw.announced)?raw.announced.filter(id=>STAGES.some(s=>s.id===id)):[];
  }}catch{storageOK=false}
  function save(){revision++;try{storage?.setItem(KEY,JSON.stringify(state));storageOK=!!storage}catch{storageOK=false}}
  const has=id=>state.owned.includes(id);
  const next=()=>STAGES.find(s=>!has(s.id))||null;
  const affordable=s=>!!s&&!!s.cost&&state.energy>=s.cost.energy&&state.metal>=s.cost.metal;
  function add(kind,n,persist=true){n=Math.floor(n);if(!(kind in MATERIALS)||!n)return 0;const before=state[kind];state[kind]=Math.max(0,state[kind]+n);if(state[kind]!==before&&persist)save();return state[kind]-before;}
  function build(id){const s=next();if(!s||s.id!==id||!affordable(s))return false;state.energy-=s.cost.energy;state.metal-=s.cost.metal;state.owned.push(s.id);save();return s;}
  // Exploration rewards, called once per newly earned progress record.
  function explore(entry){const r=entry&&EXPLORE[entry.kind];if(!r)return null;for(const k of Object.keys(r))add(k,r[k],false);save();return r;}
  // Record kind from a progress id, for crediting earlier saves.
  const KIND_PREFIX=[['region:','region'],['wreck','region'],['facility:','facility'],['deck:','depth'],['cave:','depth'],['log:','log'],['relay:','power'],['core:','core'],['cavecore:','core'],['beacon:','beacon'],['species:','combat'],['lesson:','protocol'],['trail:','trail'],['detour:','trail']];
  const kindOf=id=>(KIND_PREFIX.find(([p])=>String(id).startsWith(p))||[])[1]||null;
  // One-time credit for exploration completed before staged development existed.
  function retro(entries=[]){entries=entries.map(e=>typeof e==='string'?{kind:kindOf(e)}:e);if(state.retro)return null;const total={energy:0,metal:0};for(const e of entries){const r=e&&EXPLORE[e.kind];if(r)for(const k of Object.keys(r))total[k]+=r[k];}state.energy+=total.energy;state.metal+=total.metal;state.retro=true;save();return total;}
  function dropsFor(level=1){const [metal,energy]=DROPS[Math.max(0,Math.min(3,(level||1)-1))];return [{kind:'metal',value:metal},{kind:'energy',value:energy}];}
  // Battles keep session counters (scrap = alloy, cores = energy). Any change
  // made by combat code since the last frame flows into the saved store, and the
  // battle is then refreshed from it, so repairs and facility rewards just work.
  let synced=null;
  function sync(b){if(!b)return;
   // Switching battles copies counters from the previous one; start a fresh
   // mirror so the copy itself is never counted as a gain.
   if(b!==synced||!b._armory){
    // First bank anything the previous battle earned since its last sync
    // (a reward collected in the same frame as leaving a facility or cave).
    if(synced?._armory){const pm=(synced.scrap||0)-synced._armory.metal,pe=(synced.cores||0)-synced._armory.energy;if(pm)add('metal',pm,false);if(pe)add('energy',pe,false);if(pm||pe)save();synced._armory={metal:synced.scrap||0,energy:synced.cores||0};}
    b._armory={metal:b.scrap||0,energy:b.cores||0};synced=b;}
   const dm=(b.scrap||0)-b._armory.metal,de=(b.cores||0)-b._armory.energy;if(dm)add('metal',dm,false);if(de)add('energy',de,false);if(dm||de)save();
   b.scrap=b._armory.metal=state.metal;b.cores=b._armory.energy=state.energy;}
  // A single notice the first time the next stage becomes affordable.
  function notice(){const s=next();if(!affordable(s)||state.announced.includes(s.id))return null;state.announced.push(s.id);save();return '材料足够研制'+s.name+'。打开 Esc › 机甲与升级，完成研制。';}
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function costHTML(c){return c?'<span class="arm-cost"><i class="arm-energy">晶核 '+c.energy+'</i><i class="arm-metal">合金 '+c.metal+'</i></span>':'<span class="arm-cost">初始装备</span>'}
  function panelHTML(){const n=next();
   return '<section class="exp-current arm-panel"><span>机甲研制 · 按顺序解锁</span><h3>'+(n?'下一项：'+esc(n.name):'全部系统已上线')+'</h3>'+
    '<div class="arm-stock"><b class="arm-energy">'+MATERIALS.energy.name+' '+state.energy+'</b><b class="arm-metal">'+MATERIALS.metal.name+' '+state.metal+'</b></div>'+
    '<p>'+esc(MATERIALS.energy.hint)+'。'+esc(MATERIALS.metal.hint)+'。</p></section><ol class="arm-stages">'+
    STAGES.map((s,i)=>{const owned=has(s.id),isNext=n&&n.id===s.id,ok=isNext&&affordable(s);
     return '<li class="'+(owned?'owned':isNext?'next':'locked')+'"><div><small>'+String(i+1).padStart(2,'0')+' · '+esc(s.key)+'</small><h4>'+esc(s.name)+'</h4><p>'+esc(s.desc)+'</p></div>'+costHTML(s.cost)+
      (owned?'<em>已上线</em>':isNext?'<button '+(ok?'':'disabled')+' onclick="Exo.develop(\''+s.id+'\')">'+(ok?'研制':'材料不足')+'</button>':'<em>需先完成上一项</em>')+'</li>'}).join('')+'</ol>';}
  function snapshot(){return {energy:state.energy,metal:state.metal,owned:[...state.owned],next:next()?.id||null,storageOK}}
  return {has,next,affordable,add,build,explore,retro,kindOf,dropsFor,sync,notice,panelHTML,snapshot,get energy(){return state.energy},get metal(){return state.metal},get revision(){return revision}};
 }
 return {create,KEY,STAGES,MATERIALS,DROPS,EXPLORE};
})();
if(typeof window!=='undefined'){let storage=null;try{storage=window.localStorage}catch{}window.ExoArmory=ExoArmoryLib.create({storage});}
if(typeof module!=='undefined')module.exports=ExoArmoryLib;
