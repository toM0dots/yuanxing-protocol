/* The bridge owns presentation callbacks and legacy adapters. Rule modules
   receive data and callbacks only, and can run under Node without the DOM. */
const ExoSystems=(()=>{
 const things=ExoThings.create({placements:ExoThingData.batteries({lamps:ExoLampRepair.all(),relay:ExoFieldStory.relay}),storage:localStorage});
 const carry=ExoCarry.create(things,{home:ExoThingData.home});
 let confirm=null,tickAt=0,available=!things.error,saveWarning=things.error,warned=false;const legacyLamp=ExoLampRepair.state;const stats={tickMs:0,maxTickMs:0,active:0,sleeping:0};
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')||{};}catch{return {};}};
 if(available)try{carry.migrate({lamp:read('exo-lamps-v1'),relay:read('exo-field-story-v1').relayBattery===true});}catch(e){available=false;saveWarning='无法保存物件进度，电池操作暂时停用；旧存档没有改动。';}
 const lampLevel=l=>{const t=things.get(l.id);if(!t?.socket||!t.state.rewired)return 0;const n=carry.contents(l.id).filter(b=>b.state.charge>0).length;return n?l.kind==='spare'&&n===1?.55:1:0;};
 const lampState=()=>({cells:carry.count,fixed:ExoLampRepair.broken.filter(l=>things.get(l.id)?.state.rewired).map(l=>l.id),caches:ExoLampRepair.caches.filter(l=>!things.contents('cache:'+l.id).length).map(l=>l.id),drawn:Object.fromEntries(ExoLampRepair.spares().map(l=>[l.id,2-carry.contents(l.id).length]))});
 function lampAct(l,now,choice){
  if(l.kind==='cache')return carry.cache(l.id);
  if(l.kind==='broken'){
   if(choice==='take')return carry.remove(l.id);
   if(lampLevel(l))return {message:l.name+'已经亮着。'};
   if(!carry.count)return {message:'背架上没有电池。先找路边的检修包。'};
   return things.get(l.id).state.rewired?carry.insert(l.id):{wiring:true,message:'打开接线盒，把断线接回去。'};
  }
  const n=carry.contents(l.id).length;
  if((choice==='return'||choice==='auto'&&n<2&&carry.count)&&n<2){confirm=null;return carry.insert(l.id);}
  if(choice==='return')return {message:'插槽已经装满了。'};
  if(carry.count>=4)return {message:'背架满了。先放下一块电池。'};
  if(n===1&&(!confirm||confirm.id!==l.id||now-confirm.at>5000)){confirm={id:l.id,at:now};return {confirm:true,message:'取走最后一块电池，这盏灯就会熄灭。再按一次确认。'};}
  confirm=null;return carry.remove(l.id);
 }
 function repair(l){if(l.kind!=='broken')return {message:'这不是待修灯箱。'};let r;things.transaction(()=>{r=carry.insert(l.id);if(r.ok)things.patch(l.id,{state:{rewired:true,broken:false}},'lamp-rewired');});return r.ok?{...r,lit:l.id,message:'灯亮了，后来的人也能看见这段路。'}:r;}
 if(available)ExoLampRepair.bindInventory({level:lampLevel,act:lampAct,repair,state:lampState,summary:()=>({cells:carry.count,fixed:lampState().fixed.length,total:ExoLampRepair.broken.length,caches:ExoLampRepair.caches.length-lampState().caches.length}),taken:id=>!things.contents('cache:'+id).length,useCell:()=>carry.insert(ExoThingData.relayId).ok});
 else ExoLampRepair.bindInventory({level:l=>l.kind==='spare'?(2-(legacyLamp.drawn[l.id]||0))/2:legacyLamp.fixed.includes(l.id)?1:0,state:()=>legacyLamp,summary:()=>({cells:legacyLamp.cells,fixed:legacyLamp.fixed.length,total:ExoLampRepair.broken.length,caches:ExoLampRepair.caches.length-legacyLamp.caches.length}),taken:id=>legacyLamp.caches.includes(id),act:()=>({message:saveWarning}),repair:()=>({message:saveWarning}),useCell:()=>false});
 if(available)ExoFieldStory.bindBattery(()=>carry.contents(ExoThingData.relayId).some(t=>t.state.charge>0));
 const context=world=>world.interior?'interior:'+world.interior.structure.id+':'+world.interior.level:world.cave?'cave:'+world.cave.id:'surface';
 function point(unit,world){return {...unit,context:context(world)};}
 function clear(unit,target,world){if(target.context!==context(world))return false;return !world.structuresBlocked?.({...unit,z:world.elevation(unit.x,unit.y)+70},{...target,z:world.elevation(target.x,target.y)+20})&&(world.cave||world.interior||typeof ExoCanyonV2==='undefined'||!ExoCanyonV2.blocked(unit,target));}
 function interaction(unit,world){if(!available||unit.flight)return null;const battery=carry.nearest(point(unit,world),t=>clear(unit,t,world));return battery?{kind:'thing',id:battery.id,point:battery,label:'拾起电池 · '+carry.count+'/4',detail:'背架',priority:2}:null;}
 function announce(r,unit){if(r?.message)ExoFieldStory.cue('AEGIS',r.message,{replace:true});if(r?.sound)try{ExoAmbience.lamp(r.sound,unit.x,unit.y);}catch{}return r;}
 function batteryAction(unit,world,id){try{
  if(!available)return announce({message:saveWarning},unit);
  if(unit.flight)return announce({message:'先落地，再取放电池。'},unit);
  const u=point(unit,world),options={canReach:t=>clear(unit,t,world),canPlace:p=>!world.solidStructure?.(p.x,p.y,world.elevation(p.x,p.y)+20,16)&&clear(unit,{...p,context:u.context},world)&&Math.abs(world.elevation(p.x,p.y)-world.elevation(unit.x,unit.y))<35};
  if(id){const t=carry.nearest(u,options.canReach);if(!t||t.id!==id)return false;return announce(carry.take(id),unit);}
  return announce(carry.toggle(u,options),unit);
 }catch(e){return announce({message:'背架没有改动：保存失败，请先留在页面里。'},unit);}}
 function update(dt,{unit,world}){if(!available){if(!warned){warned=true;announce({message:saveWarning},unit);}return;}tickAt+=dt;if(tickAt<.1)return;tickAt%=.1;const started=performance.now();things.wake(point(unit,world));const overflow=things.getFlag('legacyOverflow');if(overflow&&!things.getFlag('overflowNoticed')){ExoFieldStory.cue('老林',`背架装不下的 ${overflow} 块电池，我替你放在 K–09 门口了。`);things.flag('overflowNoticed',true);}stats.tickMs=performance.now()-started;stats.maxTickMs=Math.max(stats.maxTickMs,stats.tickMs);stats.active=things.active.length;stats.sleeping=things.sleeping.length;}
 return {things,carry,stats,get available(){return available;},context,point,interaction,batteryAction,announce,update};
})();
