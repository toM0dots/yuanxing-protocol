/* The bridge owns presentation callbacks and legacy adapters. Rule modules
   receive data and callbacks only, and can run under Node without the DOM. */
const ExoSystems=(()=>{
 const things=ExoThings.create({placements:[...ExoThingData.batteries({lamps:ExoLampRepair.all(),relay:ExoFieldStory.relay}),...ExoDepotData.placements()],storage:localStorage});
 const carry=ExoCarry.create(things,{home:ExoThingData.home});
 const rules=ExoRules.create(things),tow=ExoTow.create(things),signals=[];let bracing=false;
 let confirm=null,tickAt=0,available=!things.error,saveWarning=things.error,warned=false;const legacyLamp=ExoLampRepair.state;const stats={tickMs:0,maxTickMs:0,active:0,sleeping:0};
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')||{};}catch{return {};}};
 if(available)try{carry.migrate({lamp:read('exo-lamps-v1'),relay:read('exo-field-story-v1').relayBattery===true});}catch(e){available=false;saveWarning='无法保存物件进度，电池操作暂时停用；旧存档没有改动。';}
 const lampLevel=l=>{const t=things.get(l.id);if(!t?.socket||!t.state.rewired)return 0;const n=carry.contents(l.id).filter(b=>b.state.charge>0).length;return n?l.kind==='spare'&&n===1?.55:1:t.state.powered?.55:0;};
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
 const enabled=t=>t.kind==='gate'||t.zone!=='depot'||things.getFlag('depotOpen');
 function systemLabel(t){
  if(t.kind==='reel')return '取下牵引卷索';
  if(t.anchor)return tow.state.mode==='attached'?'把索绕过锚桩 · E':'锚桩 · 按住 X 瞄准挂钩';
  if(['tow','push'].includes(t.physics)&&t.mass>40)return t.name+' · 用牵引索，R 撑稳';
  if(t.kind==='cache')return things.contents('cache:'+t.id).length?'取一块电池':'电池箱空了';
  if(t.kind==='creature')return t.state.feeding?'缝针正沿着电流取食':'缝针 · 它没有敌意';
  if(t.kind==='gate')return t.state.open?'进入备件库':'老林还没交出备件库钥匙';
  if(t.socket){const n=carry.contents(t.id).length;if(t.state.broken)return n?'取出电池 · 断线待修':'按住 E 接回断线';return n?'取回电池 · 按住 E 加接会过载':'接入电池 · '+t.name;}
  if(['carry','push'].includes(t.physics)&&t.mass<=40)return carry.hand()?'手里有东西，按 Z 放下':'抱起'+t.name+' · Z 放下';
  if(t.kind==='pump')return t.state.powered?'泵转起来了':'水泵停着，铜脚泡在积水里';
  if(t.kind==='door')return t.state.open?'门已通电，通路打开了':'门没电，留意接地的铜边';
  return t.name;
 }
 function interaction(unit,world){if(!available||unit.flight)return null;const p=point(unit,world),rows=things.near(p,110).filter(t=>enabled(t)&&clear(unit,t,world));const device=rows.find(t=>t.zone==='depot'&&!['water','cable','battery'].includes(t.kind)&&!(t.kind==='gate'&&t.state.open)),battery=rows.find(t=>t.kind==='battery');if(battery&&(!device||carry.count<4))return {kind:'thing',id:battery.id,point:battery,label:'拾起电池 · '+carry.count+'/4',detail:'背架',priority:2};const t=device;return t?{kind:'system',id:t.id,point:t,label:systemLabel(t),detail:t.name,priority:2}:null;}
 function announce(r,unit){if(r?.message)ExoFieldStory.cue('AEGIS',r.message,{replace:true});if(r?.sound)try{ExoAmbience.lamp(r.sound,unit.x,unit.y);}catch{}return r;}
 function batteryAction(unit,world,id){try{
  if(!available)return announce({message:saveWarning},unit);
  if(unit.flight)return announce({message:'先落地，再取放电池。'},unit);
  const u=point(unit,world),options={canReach:t=>enabled(t)&&clear(unit,t,world),canPlace:p=>!world.solidStructure?.(p.x,p.y,world.elevation(p.x,p.y)+20,16)&&clear(unit,{...p,context:u.context},world)&&Math.abs(world.elevation(p.x,p.y)-world.elevation(unit.x,unit.y))<35};
  if(id){const t=carry.nearest(u,options.canReach);if(!t||t.id!==id)return false;return announce(carry.take(id),unit);}
  return announce(carry.toggle(u,options),unit);
 }catch(e){return announce({message:'背架没有改动：保存失败，请先留在页面里。'},unit);}}
 function act(id,unit,world,{held=false}={}){if(typeof ExoMapStatus!=='undefined'&&ExoMapStatus.snapshot().blocked)return false;const t=things.get(id);if(!available||unit.flight||!t||!enabled(t)||t.context!==context(world)||Math.hypot(t.x-unit.x,t.y-unit.y)>115||!clear(unit,t,world))return false;let r;try{rules.refresh(point(unit,world));if(t.kind==='reel'){things.transaction(()=>{things.flag('towUnlocked',true);things.patch(id,{location:'equipped',state:{taken:true}},'reel-equipped');});r={message:'卷索装好了。按住 X 瞄准吊环，松开发射；先试几个距离。',sound:'take'};}else if(t.anchor){r={message:tow.wrap(id,point(unit,world))?'索已绕过锚桩。':'按住 X 瞄准锚桩，松开抛钩。'};}else if(t.socket){if(held)r=t.state.broken?rules.power.rewire(id):carry.insert(id,{overload:true});else r=carry.contents(id).length?carry.remove(id):t.state.broken?{message:'按住 E，把断线接回去。'}:carry.insert(id);}else if(t.kind==='cache')r=carry.cache(id);else if(['carry','push'].includes(t.physics)&&t.kind!=='creature')r=carry.lift(id);else r={message:systemLabel(t)};rules.refresh(point(unit,world));things.save();return announce(r,unit);}catch{return announce({message:'操作未保存，请先留在页面里。'},unit);}}
 const legacyFinished=!!read('exo-campaign-v1').done?.includes('stabilizer');
 if(available&&legacyFinished&&!things.getFlag('depotOpen'))things.transaction(()=>{things.flag('depotOpen',true);things.patch('depot:gate',{state:{open:true}},'depot-unlocked');},{save:false});
 let saveAt=0,time=0,lastSoundAt=-10,lastUnit=null,setupSeen=new Set();
 things.subscribe(e=>{if(e.type==='signal'&&e.message&&lastUnit)announce({message:e.message},lastUnit);if(e.type==='signal'&&['hook-hit','hook-miss','pylon-toppled'].includes(e.kind)&&lastUnit)try{ExoAmbience.contact('metal',e.kind==='pylon-toppled'?1:.4,e.x||lastUnit.x,e.y||lastUnit.y);}catch{}const t=e.after||things.get(e.id);if(!t)return;if(e.type==='signal'||e.reason==='overload'){signals.push({kind:e.kind||e.reason,id:t.id,x:t.x,y:t.y,until:time+1.2});if(signals.length>24)signals.shift();}if(e.type==='changed'&&e.before&&e.before.state.powered!==t.state.powered&&t.zone==='depot'&&lastUnit&&Math.hypot(t.x-lastUnit.x,t.y-lastUnit.y)<500&&time-lastSoundAt>.5){lastSoundAt=time;try{ExoAmbience.lamp(t.state.powered?'light':'dark',t.x,t.y);}catch{}}});
 function update(dt,{unit,world,battle,campaign,camera={},brace=false}){
  if(!available){if(!warned){warned=true;announce({message:saveWarning},unit);}return;}time+=dt;lastUnit=unit;unit.context=context(world);const physicsStart=performance.now();unit.towClimbing=false;unit.systemStun=Math.max(0,(unit.systemStun||0)-dt);
  const actors=[{id:'player',x:unit.x,y:unit.y,player:true,airborne:!!unit.flight||(unit.altitude||0)>25},...(battle?.enemies||[]).filter(e=>e.hp>0).map(e=>({id:'enemy:'+e.id,x:e.x,y:e.y,enemy:e}))];
  tow.step(dt,{unit,angle:-(camera.yaw||0),height:(x,y)=>world.elevation(x,y),braced:brace||bracing,stabilizer:campaign?.stabilizer??legacyFinished,actors,onStun:(a,n)=>{if(a.player)unit.systemStun=1.2;else if(a.enemy){a.enemy.stagger=Math.max(a.enemy.stagger||0,n);a.enemy.action=null;}},blocked:(a,b,r)=>motionBlocked(a,b,r,world)});
  if(!unit.flight&&!unit.towClimbing){let support=0;for(const t of things.near(point(unit,world),300).filter(t=>t.kind==='pylon'&&t.state.fallen)){const end={x:t.x+Math.cos(t.state.fallAngle)*t.height,y:t.y+Math.sin(t.state.fallAngle)*t.height};if(ExoTow.segmentDistance(unit,t,end)<24)support=Math.max(support,world.elevation(t.x,t.y)+18-world.elevation(unit.x,unit.y));}unit.altitude=Math.max(support,(unit.altitude||0)-dt*170,0);}
  stats.physicsMs=performance.now()-physicsStart;stats.maxPhysicsMs=Math.max(stats.maxPhysicsMs||0,stats.physicsMs);tickAt+=dt;if(tickAt<.1)return;const tick=Math.min(.2,tickAt);tickAt=0;const started=performance.now();
  if((campaign?.finished??legacyFinished)&&!things.getFlag('depotOpen'))things.transaction(()=>{things.flag('depotOpen',true);things.patch('depot:gate',{state:{open:true}},'depot-unlocked');},{save:false});
  if(things.getFlag('depotOpen')&&!things.getFlag('depotInvitation')){ExoFieldStory.cue('老林','东侧备件库还能用。沿检修路过去，拿些电池；卷索也留在那儿。');things.flag('depotInvitation',true);}
  if(things.getFlag('depotOpen')&&!things.getFlag('depotVisited')&&!world.interior&&!world.cave&&Math.hypot(unit.x-ExoDepotData.entry.x,unit.y-ExoDepotData.entry.y)<140)things.flag('depotVisited',true);
  rules.tick(tick,{point:point(unit,world),actors,onShock:(a,n)=>{if(a.player&&battle){battle.hp=Math.max(1,battle.hp-n);battle.sparks?.push({x:unit.x,y:unit.y,t:.4,hurt:true});announce({message:'积水带电，装甲擦伤。退到干地上。',sound:'dark'},unit);}else if(a.enemy){a.enemy.stagger=Math.max(a.enemy.stagger||0,n);a.enemy.action=null;}}});
  if(!world.interior&&!world.cave&&things.getFlag('depotOpen'))for(const s of ExoDepotData.setups)if(!setupSeen.has(s.n)&&Math.hypot(unit.x-s.x,unit.y-s.y)<95){setupSeen.add(s.n);ExoFieldStory.cue('AEGIS',s.caption);}
  const overflow=things.getFlag('legacyOverflow');if(overflow&&!things.getFlag('overflowNoticed')){ExoFieldStory.cue('老林',`背架装不下的 ${overflow} 块电池，我替你放在 K–09 门口了。`);things.flag('overflowNoticed',true);}
  saveAt+=tick;if(saveAt>=1){saveAt=0;if(!things.save()){if(!warned){warned=true;announce({message:things.error},unit);}}else warned=false;}while(signals[0]?.until<time)signals.shift();
  stats.tickMs=performance.now()-started;stats.maxTickMs=Math.max(stats.maxTickMs,stats.tickMs);stats.active=things.active.length;stats.sleeping=things.sleeping.length;
 }
 function collide(previous,unit,world){if(!available||unit.flight||world.interior||world.cave)return;const rise=world.elevation(unit.x,unit.y)-world.elevation(previous.x,previous.y);if(rise>12&&things.near(point(unit,world),240).some(t=>t.anchor)&&!unit.towClimbing&&(unit.altitude||0)<rise){unit.x=previous.x;unit.y=previous.y;unit.vx=unit.vy=0;}for(const t of things.near(point(unit,world),200)){if(!t.solid||t.state.open||t.location!=='world')continue;if(t.kind==='gap'&&things.near(point(unit,world),300).some(b=>b.kind==='pylon'&&b.state.fallen&&ExoTow.segmentDistance(unit,b,{x:b.x+Math.cos(b.state.fallAngle)*b.height,y:b.y+Math.sin(b.state.fallAngle)*b.height})<24))continue;const size=t.size||[t.radius*2,50,t.radius*2],dx=Math.abs(unit.x-t.x),dy=Math.abs(unit.y-t.y);if(dx<size[0]/2+24&&dy<size[2]/2+24){unit.x=previous.x;unit.y=previous.y;unit.vx=unit.vy=0;break;}}}
 function objective(){if(typeof window!=='undefined'&&window.ExoSystemsPlaytest){const id=!tow.enabled?'reel':!tow.summary().installed?'pylon':'debris',t=things.get('depot:'+id),p=id==='pylon'?{...t,x:5770,y:6740,name:'旧支柱 · 试投位置'}:id==='debris'?{...t,x:6280,y:6670,name:'备件库装卸区'}:t;return {id:'depot-playtest',title:!tow.enabled?'老林留下的卷索':!tow.summary().installed?'试着挂住旧支柱':'让旧库房重新运转',instruction:!tow.enabled?'先到门内取卷索；周围的电箱和水泵也能试试。':!tow.summary().installed?'换几个距离抛钩，比较落点，再拟合并安装修正。':'试着拖开机架、倒柱搭桥、把车拉到压板上，或收索登上高台。',point:{...p},...p,label:!tow.enabled?'取下牵引卷索':!tow.summary().installed?'试投旧支柱':'探索备件库',action:'explore'};}if(!available||!things.getFlag('depotOpen')||things.getFlag('depotVisited'))return null;return {id:'depot',title:'老林留的备件',instruction:'沿 K–09 东侧检修路去备件库，带回电池和卷索。',point:{...ExoDepotData.entry},...ExoDepotData.entry,label:'前往东侧备件库',action:'explore'};}
 function motionBlocked(a,b,r,world){const z=world.elevation(b.x,b.y)+(b.z||0)+35;if(world.solidStructure?.(b.x,b.y,z,Math.min(r,24)))return true;if(world.structuresBlocked?.({...a,z:world.elevation(a.x,a.y)+(a.z||0)+35},{...b,z}))return true;if(!world.cave&&!world.interior&&typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.blocked(a,b))return true;if(a.id&&things.near({...b,context:a.context||'surface'},180).some(t=>t.id!==a.id&&t.solid&&!t.state.open&&ExoTow.segmentDistance(t,a,b)<r+(t.radius||20)))return true;return (world.rocks?.(b.x,b.y)||[]).some(rock=>ExoTow.segmentDistance(rock,a,b)<(rock.r||rock.radius||20)+r);}
 function constrainCamera(target,eye,world){
  if(world.cave||world.interior)return eye;const delta=eye.map((n,i)=>n-target[i]),length=Math.hypot(...delta);let nearest=1;
  for(const t of things.near({x:target[0],y:target[1],context:'surface'},Math.min(1200,length+180))){if(!t.solid||t.state.open||t.kind==='gap')continue;const size=t.size||[t.radius*2,50,t.radius*2],z=world.elevation(t.x,t.y)+(t.z||0),low=[t.x-size[0]/2-12,t.y-size[2]/2-12,z-12],high=[t.x+size[0]/2+12,t.y+size[2]/2+12,z+size[1]+12];let enter=0,leave=1;
   for(let i=0;i<3;i++){if(Math.abs(delta[i])<1e-6){if(target[i]<low[i]||target[i]>high[i]){enter=2;break;}}else{const a=(low[i]-target[i])/delta[i],b=(high[i]-target[i])/delta[i];enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));}}
   if(enter<=leave&&enter<nearest)nearest=Math.max(.06,enter-16/Math.max(1,length));
  }return nearest<1?target.map((n,i)=>n+delta[i]*nearest):eye;
 }
 function towBegin(unit,world,camera){if(!available)return;return tow.begin(point(unit,world),-(camera.yaw||0));}
 function towRelease(unit,world){if(!available)return;return tow.release(point(unit,world));}
 function towCalibrate(){if(available&&tow.enabled)return tow.calibrate();}
 function towHUD(){const s=tow.summary(),t=things.get(tow.state.targetId||tow.state.aim?.id),mode=tow.state.mode;if(mode==='aiming')return t?t.name+' · '+(tow.state.aim.distance/18).toFixed(1)+' m':'转动视角，寻找带吊环的物件';if(mode==='throwing')return '挂钩飞出…';if(mode==='attached')return t?.mass>40&&!tow.state.braced&&!tow.state.wrap&&!t.anchor?'太重了 · 按 R 撑稳':'按住收索 · 轻按松开';if(s.installed)return s.test?'新试投 '+s.test+' 次 · 偏差 '+(s.after/18).toFixed(2)+' m（此前 '+(s.before/18).toFixed(1)+' m）':'换个距离试投，检验修正';return s.train?'已记录 '+s.train+' 次 · 换远近距离试试':'按住瞄准 · 松开发射';}
 addEventListener('pagehide',()=>things.save());
 return {things,carry,rules,tow,towBegin,towRelease,towCalibrate,towHUD,get bracing(){return bracing;},toggleBrace(){bracing=!bracing;return bracing;},signals,stats,act,collide,constrainCamera,objective,get time(){return time;},get available(){return available;},context,point,interaction,batteryAction,announce,update};
})();
