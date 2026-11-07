/* Terrain recognition leaves the proving ground here. This module has no DOM,
   storage, random outcomes or training-data writes, so field safety is testable. */
const ExoTerrainField=(()=>{
 const warningSeconds=1.6,damagePerRecovery=6,minimumArmor=25;
 const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 function create(){return {context:null,lastSafe:null,exposure:0,hazardId:null,cooldown:0,noticeId:null,noticeCooldown:0};}
 function reset(s){Object.assign(s,create());}
 function step(s,{unit,previous,model,battle,dt,data,course,context=null,enabled=true}){
  const result={message:'',damage:0,braked:false,recovered:false};
  unit.terrainRisk=null;
  if(unit.flight){reset(s);return result;}
  if(!enabled||!data||!course||dt<=0||battle?.down){s.exposure=0;s.hazardId=null;return result;}
  const key=context||'surface';
  if(s.context!==key){reset(s);s.context=key;}
  s.cooldown=Math.max(0,s.cooldown-dt);s.noticeCooldown=Math.max(0,s.noticeCooldown-dt);
  if(s.lastSafe&&Math.hypot(unit.x-s.lastSafe.x,unit.y-s.lastSafe.y)>350)s.lastSafe=null;
  const sample=(p,pad=0)=>data.sample(p.x,p.y,context,pad);
  const hazard=sample(unit),previousHazard=finitePoint(previous)?sample(previous):null;
  const unsafe=p=>p&&course.truth(p)===false;
  if(finitePoint(previous)&&!unsafe(previousHazard))s.lastSafe={x:previous.x,y:previous.y};
  const near=hazard||sample(unit,150);
  if(!near){if(!context&&data.contains&&!data.contains(unit.x,unit.y)){s.lastSafe=null;}s.exposure=0;s.hazardId=null;return result;}
  const trained=model?.unlocked===true,decision=trained?course.classify(model,near):null;
  unit.terrainRisk={id:near.id,name:near.name,kind:near.kind,inside:!!hazard,trained,pass:decision?.pass,reason:decision?.reason||near.warning||'先观察路面，必要时绕行',features:near};
  const notice=(message,id)=>{if(s.noticeId!==id||s.noticeCooldown<=0){result.message=message;s.noticeId=id;s.noticeCooldown=5;}};
  if(!hazard){s.exposure=0;s.hazardId=null;notice(trained?near.name+'：模型建议'+(decision.pass?'低速通过，仍需观察路面。':'绕行。接近危险地面时会自动制动。'):near.name+'：'+(near.warning||'地面可能不稳').replace(/[。！!]+$/,'')+'。先减速观察；收集沿途记录、检验规则后可开启风险辅助。','near:'+near.id);return result;}
  // The trained model decides whether to brake. Truth determines only the
  // physical outcome; a mistaken safe prediction is never silently corrected.
  const fallback=data.safePoint?.(unit.x,unit.y,context),brakePoint=s.lastSafe||(finitePoint(fallback)&&Math.hypot(fallback.x-unit.x,fallback.y-unit.y)<=350?fallback:null);
  if(trained&&decision.pass===false&&brakePoint){
   Object.assign(unit,{x:brakePoint.x,y:brakePoint.y,vx:0,vy:0});result.braked=true;s.exposure=0;
   notice('地形辅助已制动：'+hazard.name+'，'+decision.reason+'。请改走桥面或青灯标记的绕行路。','brake:'+hazard.id);return result;
  }
  if(!unsafe(hazard)){s.exposure=0;s.hazardId=null;return result;}
  if(s.hazardId!==hazard.id){s.hazardId=hazard.id;s.exposure=0;}
  s.exposure+=dt;
  unit.vx=(unit.vx||0)*.5;unit.vy=(unit.vy||0)*.5;
  // A short visible warning and movement drag precede any armor loss.
  notice(hazard.name+'：'+(hazard.warning||'地面正在失稳').replace(/[。！!]+$/,'')+'！立即退回结实路面。','enter:'+hazard.id);
  if(s.exposure>=warningSeconds&&s.cooldown<=0){
   const before=Math.max(0,Number(battle?.hp)||0);result.damage=Math.min(damagePerRecovery,Math.max(0,before-minimumArmor));
   if(battle)battle.hp=before-result.damage;
   const fallback=data.safePoint?.(unit.x,unit.y,context),safe=s.lastSafe||(finitePoint(fallback)?fallback:null);
   if(safe){Object.assign(unit,{x:safe.x,y:safe.y,vx:0,vy:0});result.recovered=true;}
   s.cooldown=4;s.exposure=0;
   result.message=hazard.name+'导致'+({water:'涉水冲击',river:'涉水冲击',cliff:'滑落擦伤',slip:'侧滑擦伤',sink:'地面塌陷'}[hazard.kind]||'通行损伤')+'，装甲 −'+result.damage+'。'+(safe?'安全绞盘已拉回稳固地面。':'请立即沿原路退回。')+(trained?'这次判断不可靠，打开沿途记录检查规则。':'用沿途记录学会判断，就能在进入前制动。');
   s.noticeId='recover:'+hazard.id;s.noticeCooldown=5;
  }
  return result;
 }
 return {create,reset,step,warningSeconds,damagePerRecovery,minimumArmor};
})();
if(typeof module!=='undefined')module.exports=ExoTerrainField;
