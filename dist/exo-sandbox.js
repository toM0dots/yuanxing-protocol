/* Local deterministic sandbox combat, deliberately separate from learning algorithms. */
const ExoSandbox=(()=>{
 const base={x:270,y:1090,r:145},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ranks=[{name:'侦察兽',hp:60,speed:64,damage:7,rate:2.4,aggro:320,armor:0,fan:1,drop:1},{name:'突击兽',hp:100,speed:48,damage:10,rate:1.9,aggro:420,armor:0,fan:1,drop:2},{name:'重装守卫',hp:180,speed:28,damage:16,rate:2.5,aggro:500,armor:.25,fan:2,drop:3},{name:'巢穴领主',hp:340,speed:35,damage:18,rate:1.7,aggro:580,armor:.35,fan:3,drop:6}];
 ranks.forEach((r,i)=>Object.assign(r,[{species:'裂齿猎虫',height:70,tactic:'快速贴近，蓄力后扑击；拉开距离时喷射酸液。横移避开青色眼睛朝向。'},{species:'裂甲冲锋兽',height:110,tactic:'低头蓄力后沿橙色直线冲锋。侧向躲开，趁撞击后的停顿反击。'},{species:'孢囊炮蛛',height:115,tactic:'保持距离抛射孢子，落点会留下腐蚀区。看到绿色弹体与落点圆圈就离开。'},{species:'巢穴领主',height:205,tactic:'交替使用扇形弹幕与扩散冲击波。半血后攻击加快；远离蓄力的大圆圈。'}][i]));
 const profile=e=>ranks[Math.max(0,Math.min(3,(e.level||1)-1))];
 const name=e=>'Lv.'+(e.level||1)+' '+profile(e).species;
 function enemy(id,x,y,level=1){const p=ranks[level-1];return {id,x,y,hx:x,hy:y,vx:0,vy:0,level,hp:p.hp,max:p.hp,type:level>=3?'heavy':'scout',state:'patrol',phase:id*1.7,attack:1,respawn:0,action:null,attackCount:0,jumpZ:0,distance:0}}
 // The crash, broken road and lamp trail are a quiet authored passage.
 // Derive it from route data so moving the opening cannot expose it to ambient spawns.
 function openingCorridor(x,y,pad=0){
  if(typeof ExoStoryRoute!=='undefined')return ExoStoryRoute.roadDistance(x,y,true)<180+pad;
  if(typeof ExoTrainingGround==='undefined')return false;
  const g=ExoTrainingGround.campaign,points=[...(g.approach||[g.start,g.caution]),...g.bypass,g.exit];
  if(typeof ExoCanyonV2!=='undefined')points.push(ExoCanyonV2.spawn);
  if(typeof ExoGreenTrail!=='undefined')points.push(...ExoGreenTrail.records.map(p=>({x:p.x,y:p.y})));
  return points.some((p,i)=>i&&segmentDistance({x,y},points[i-1],p)<140+pad);
 }
 function create(cave=null){let spawns;if(cave?.id==='survey'){spawns=[];}else if(cave){spawns=[[1190,1190,2],[1280,850,cave.risk>=4?3:2],[1480,480,cave.risk>=4?4:3],[1680,280,2]];const data=ExoWorld.caveSystems?.[cave.id];if(data)for(const r of data.rooms.slice(3))for(let i=0;i<3;i++){const a=i*Math.PI*2/3+r.id;spawns.push([r.x+Math.cos(a)*r.r*.28,r.y+Math.sin(a)*r.r*.28,Math.min(4,Math.max(1,cave.risk-1+(r.id%3===0?1:0)+(i===0&&r===data.core?2:0)))]);}}else{spawns=[[690,890,1],[830,540,1],[1100,630,2],[1430,850,1],[1680,1030,2],[1520,270,2],[780,300,1],[1220,1140,1],[1750,600,2],[390,440,1]];for(const c of ExoWorld.surfaceCamps.slice(1))for(let i=0;i<6;i++){const a=i/6*Math.PI*2,cy=c===ExoWorld.surfaceCamps[8]?c.y+1400:c.y;spawns.push([c.x+Math.cos(a)*600,cy+Math.sin(a)*600,Math.min(4,Math.max(1,i===4?Math.min(3,c.risk+1):c.risk+(i===0?0:-1)))])}}
 if(!cave&&typeof ExoRoadsideEncounter!=='undefined'){spawns=spawns.filter(([x,y])=>!ExoRoadsideEncounter.contains(x,y,500));spawns.push([ExoRoadsideEncounter.enemy.x,ExoRoadsideEncounter.enemy.y,2]);}
 return {hp:100,kills:0,scrap:0,time:0,cooldown:0,invulnerable:0,down:0,target:null,bolts:[],hazards:[],enemyFX:[],sparks:[],drops:[],core:false,cave:!!cave,enemies:spawns.filter(([x,y])=>cave||(!openingCorridor(x,y,650)&&(typeof ExoTrainingGround==='undefined'||!ExoTrainingGround.reserved(x,y,150))&&(typeof ExoTerrainWilds==='undefined'||!ExoTerrainWilds.contains(x,y,900)))).map(([x,y,l],i)=>enemy(i,x,y,l)),message:cave?.id==='survey'?'这里是勘测洞。青灯沿岩床引路；白色薄壳和湿滑斜面可能损伤机甲，先看清地形再走。':cave?'洞口升降台可修复。沿灯标探索大型洞网，打开地图查看各岩厅；击败深处守卫后扫描回收核心。':'准备好了。打开地图选一个想去的地方，或沿着路灯自由探索。遇到异兽时留意地面预警，向侧面加速躲开。'}}
 function attack(s,e,u){const p=profile(e),angle=Math.atan2(u.y-e.y,u.x-e.x);for(let i=0;i<p.fan;i++){const a=angle+(i-(p.fan-1)/2)*.16;s.bolts.push({x:e.x,y:e.y,vx:Math.cos(a)*210,vy:Math.sin(a)*210,ttl:2.7,damage:p.damage,enemy:true})}e.attack=p.rate}
 function point(u){return {x:u.x,y:u.y,z:ExoWorld.elevation(u.x,u.y)+(u.altitude||0)+65}}
 function enemyPoint(e){return {x:e.x,y:e.y,z:ExoWorld.elevation(e.x,e.y)+Math.min(110,profile(e).height*.65)+(e.jumpZ||0)}}
 function dist3(a,b){return Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0))}
 function segment3(p,a,b){if(!Number.isFinite(a.z)||!Number.isFinite(b.z))return segmentDistance(p,a,b);const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t)}
 function blockedAir(a,b,rocks){if(ExoWorld.structuresBlocked?.(a,b))return true;const steps=Math.max(1,Math.ceil(dist3(a,b)/18));for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;let floor=ExoWorld.elevation(x,y);if(typeof ExoCanyonV2!=='undefined')floor=Math.max(floor,ExoCanyonV2.flightSurface?.(x,y)??-Infinity);if(z<floor+2)return true;for(const r of rocks)if(Math.hypot(x-r.x,y-r.y)<r.r+5&&z<ExoWorld.elevation(r.x,r.y)+r.r*1.55)return true;}return false;}
 function blocked(a,b,rocks){if(ExoWorld.structuresBlocked?.(a,b))return true;if(!ExoWorld.cave&&Number.isFinite(a.z)&&Number.isFinite(b.z))return blockedAir(a,b,rocks);if(!ExoWorld.cave&&typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.blocked(a,b))return true;if(ExoWorld.cave){const n=Math.ceil(dist(a,b)/24);for(let i=0;i<=n;i++){const t=i/(n||1);if(!ExoWorld.inside(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,-8))return true}}return rocks.some(r=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((r.x-a.x)*dx+(r.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(a.x+dx*t-r.x,a.y+dy*t-r.y)<r.r+5})}
 const cannonRange=u=>u.flight?1000:460, detectionRange=u=>u.flight?1400:780;
 const targetDistance=(u,e)=>u.flight?dist3(point(u),enemyPoint(e)):dist(u,e);
 function targets(s,u){return s.enemies.filter(e=>e.hp>0&&targetDistance(u,e)<=detectionRange(u)).sort((a,b)=>targetDistance(u,a)-targetDistance(u,b)||a.id-b.id)}
 function targetState(s,u,rocks=[]){
  const list=targets(s,u);let e=list.find(e=>e.id===s.selectedTarget)||list.find(e=>e.id===s.target)||list[0];
  if(!e){s.selectedTarget=null;s.target=null;return s.targetInfo={kind:'none',distance:0,range:cannonRange(u)}}
  s.target=e.id;const distance=targetDistance(u,e),covered=blocked(u.flight?point(u):u,u.flight?enemyPoint(e):e,rocks);
  return s.targetInfo={id:e.id,kind:covered?'blocked':distance>cannonRange(u)?'detected':'fireable',distance,range:cannonRange(u)};
 }
 function cycleTarget(s,u,rocks=[]){const list=targets(s,u);if(!list.length){s.target=s.selectedTarget=null;return null}const next=list[(list.findIndex(e=>e.id===s.target)+1)%list.length];s.selectedTarget=s.target=next.id;targetState(s,u,rocks);return next}
 function aim(s,u,rocks,range=460){const list=targets(s,u).filter(e=>targetDistance(u,e)<=range&&!blocked(u.flight?point(u):u,u.flight?enemyPoint(e):e,rocks));return list.find(e=>e.id===s.selectedTarget)||list[0]||null}
 // Player weapons use the same collision and reward rules as the cannon.
 function weapons(s){s.missiles??=[];s.weaponFX??=[];s.saberCooldown??=0;s.missileCooldown??=0;s.weaponSerial??=0;return s}
 function enemyEffect(s,kind,p,extra={}){s.enemyFX??=[];s.enemySerial=(s.enemySerial||0)+1;s.enemyFX.push({kind,x:p.x,y:p.y,z:p.z,ttl:1.05,total:1.05,seed:s.enemySerial,...extra});if(s.enemyFX.length>64)s.enemyFX.shift();}
 function phase(e,name,duration){e.action.phase=name;e.action.time=e.action.duration=duration;}
 function damageEnemy(s,e,damage,kind='plasma',source=null){
  if(e.hp<=0)return false;const dealt=damage*(1-profile(e).armor);e.hp=Math.max(0,e.hp-dealt);
  const dx=e.x-(source?.x??e.x),dy=e.y-(source?.y??e.y-1),length=Math.hypot(dx,dy)||1;
  e.hitReaction={x:dx/length,y:dy/length,time:.34,total:.34,strength:Math.min(1.5,dealt/30)};
  e.poise=(e.poise||0)+dealt*(kind==='saber'?1.35:1);e.poiseTime=1.2;
  if(e.hp>0&&!(e.staggerGuard>0)&&e.poise>=[35,55,85,120][(e.level||1)-1]){e.stagger=.42;e.staggerGuard=1.5;e.poise=0;e.action=null;e.jumpZ=0;e.attack=Math.max(e.attack,.65);e.vx=e.vy=0;}
  s.sparks.push({x:e.x,y:e.y,t:.4});weapons(s).weaponFX.push({kind:kind==='saber'?'slashHit':'hit',x:e.x,y:e.y,z:enemyPoint(e).z,ttl:.42,total:.42,seed:++s.weaponSerial});
  if(e.hp===0){s.onDefeat?.(e);e.action=null;e.vx=e.vy=0;s.kills++;e.respawn=40;e.death={age:0,duration:12,jump:e.jumpZ||0,side:dx>=0?1:-1};s.drops.push({x:e.x,y:e.y,value:profile(e).drop});s.message='异兽倒下了。靠近残骸回收合金，继续留意周围的动静。'}return true;
 }
 function saber(s,u,rocks=[]){weapons(s);if(s.down||s.saberCooldown>0)return false;
  if(u.energy<12){s.message='还需要恢复能量。光束军刀消耗 12 点能量，松开加速后会更快恢复。';return false}
  const e=aim(s,u,rocks,160);if(e){u.angle=Math.atan2(e.x-u.x,-(e.y-u.y));s.target=e.id}
  u.energy-=12;s.saberCooldown=.85;s.saber={age:0,duration:.64,phase:'windup',angle:u.angle,hit:[]};s.message='光束军刀 · 前方扇形斩击，消耗 12 能量。';return true;
 }
 function launchMissiles(s,u,rocks=[]){weapons(s);if(s.down||s.missileCooldown>0)return false;
  if(u.energy<30){s.message='能量还不够，恢复到 30 点后就能发射导弹。';return false}
  const e=aim(s,u,rocks,u.flight?1400:780);if(!e){s.message='还没有锁定目标。靠近雷达上的敌人，并绕开挡住视线的岩石。';return false}
  u.energy-=30;s.target=e.id;s.missileCooldown=5.5*(s.expeditionBonus?.missileCooldown??1);const angle=Math.atan2(e.y-u.y,e.x-u.x);
  for(let i=0;i<3;i++)s.missiles.push({id:++s.weaponSerial,x:u.x,y:u.y,angle:angle+(i-1)*.38,speed:240,age:0,ttl:4,...(u.flight?{z:point(u).z,pitch:.2}:{}),delay:.18+i*.14,socket:i%2,target:e.id,damage:42,trail:[]});
  s.message='三联追踪导弹已发射 · 爆炸可伤害附近敌人。';return true;
 }
 function blast(s,p,rocks,damage=42){weapons(s).weaponFX.push({kind:'blast',x:p.x,y:p.y,z:p.z,ttl:.95,total:.95,seed:++s.weaponSerial});
  for(const e of s.enemies){const target=Number.isFinite(p.z)?enemyPoint(e):e,d=Number.isFinite(p.z)?dist3(target,p):dist(e,p);if(e.hp>0&&d<105&&!blocked(p,target,rocks))damageEnemy(s,e,damage*(1-.5*d/105),'missile',p)}
 }
 function clearWeapons(s){weapons(s);s.missiles=[];s.weaponFX=[];s.enemyFX=[];s.saber=null;s.saberCooldown=0;s.missileCooldown=0}
 function tickWeapons(s,u,dt,rocks){weapons(s);s.saberCooldown=Math.max(0,s.saberCooldown-dt);s.missileCooldown=Math.max(0,s.missileCooldown-dt);
  for(const p of s.weaponFX)p.ttl-=dt;s.weaponFX=s.weaponFX.filter(p=>p.ttl>0);
  const a=s.saber;if(a){a.age+=dt;a.phase=a.age<.17?'windup':a.age<=.35?'strike':'recover';u.angle=a.angle;
   if(a.age>=.17&&a.age<=.35)for(const e of s.enemies){const angle=Math.atan2(e.x-u.x,-(e.y-u.y))-a.angle,delta=Math.atan2(Math.sin(angle),Math.cos(angle));
    if(e.hp>0&&!a.hit.includes(e.id)&&(u.flight?dist3(point(u),enemyPoint(e)):dist(e,u))<160&&Math.abs(delta)<1.3&&!blocked(u.flight?point(u):u,u.flight?enemyPoint(e):e,rocks)){a.hit.push(e.id);damageEnemy(s,e,70,'saber',u)}}
   if(a.age>=a.duration)s.saber=null;
  }
  for(const m of s.missiles){if(m.delay>0){m.delay-=dt;m.x=u.x;m.y=u.y;if(Number.isFinite(m.z))m.z=point(u).z;continue}m.age+=dt;m.ttl-=dt;const target=s.enemies.find(e=>e.id===m.target&&e.hp>0);
   if(target){const desired=Math.atan2(target.y-m.y,target.x-m.x),turn=Math.atan2(Math.sin(desired-m.angle),Math.cos(desired-m.angle));m.angle+=Math.max(-3.2*dt,Math.min(3.2*dt,turn));if(Number.isFinite(m.z)){const pitch=Math.atan2(enemyPoint(target).z-m.z,Math.max(1,dist(target,m)));m.pitch+=Math.max(-2.8*dt,Math.min(2.8*dt,pitch-m.pitch));}}
   m.speed=Math.min(Number.isFinite(m.z)?720:520,m.speed+480*dt);const old={x:m.x,y:m.y,z:m.z},cp=Math.cos(m.pitch||0),next={x:m.x+Math.cos(m.angle)*cp*m.speed*dt,y:m.y+Math.sin(m.angle)*cp*m.speed*dt,...(Number.isFinite(m.z)?{z:m.z+Math.sin(m.pitch)*m.speed*dt}:{})};
   // A blocked flight terminates at the last clear position, never behind cover.
   if(blocked(old,next,rocks)){m.ttl=0;blast(s,old,rocks,m.damage);continue}
   m.x=next.x;m.y=next.y;if(Number.isFinite(next.z))m.z=next.z;m.trail.push({x:m.x,y:m.y,z:m.z,age:m.age});if(m.trail.length>12)m.trail.shift();
   const hit=s.enemies.filter(e=>e.hp>0&&(Number.isFinite(m.z)?segment3(enemyPoint(e),old,m):segmentDistance(e,old,m))<30).sort((a,b)=>dist(a,old)-dist(b,old))[0];
   if(hit){m.ttl=0;blast(s,m,rocks,m.damage)}
  }s.missiles=s.missiles.filter(m=>m.ttl>0);
 }
 function fire(s,u,rocks=[]){
  if(s.down||s.cooldown>0)return false;
  const info=targetState(s,u,rocks),e=s.aimAssist!==false&&info.kind==='fireable'?s.enemies.find(e=>e.id===s.target):null;
  weapons(s);s.cooldown=.22;s.weaponFX.push({kind:'muzzle',x:u.x,y:u.y,ttl:.13,total:.13,seed:++s.weaponSerial});
  s.message=e?'脉冲炮命中范围内 · T 切换目标，侧向推进躲开攻击。':info.kind==='blocked'?'前方有遮挡，炮弹会被挡住。绕到侧面寻找射击角度。':info.kind==='detected'?'目标在脉冲炮射程外。靠近后开火，或用 K 发射追踪导弹。':'向机甲面向的方向开火 · 移动可调整朝向。';
  const source=u.flight?point(u):{x:u.x,y:u.y},angle=Number.isFinite(u.angle)?u.angle:0,pitch=u.flight?.pitch||0;
  const dest=e?(u.flight?enemyPoint(e):e):{x:source.x+Math.sin(angle)*Math.cos(pitch)*100,y:source.y-Math.cos(angle)*Math.cos(pitch)*100,...(u.flight?{z:source.z+Math.sin(pitch)*100}:{})};
  const length=Math.max(1,u.flight?dist3(source,dest):dist(source,dest)),speed=u.flight?1100:820;
  s.bolts.push({...source,vx:(dest.x-source.x)/length*speed,vy:(dest.y-source.y)/length*speed,...(u.flight?{vz:(dest.z-source.z)/length*speed}:{}),ttl:cannonRange(u)/speed,damage:30*(s.expeditionBonus?.cannon??1),enemy:false,id:++s.weaponSerial,origin:source,age:0});return true;
 }
 function pushOut(e,rocks){ExoWorld.collideStructures?.(e);for(const r of rocks){const dx=e.x-r.x,dy=e.y-r.y,d=Math.hypot(dx,dy),limit=r.r+25;if(d<limit){e.x=r.x+(d?dx/d:1)*limit;e.y=r.y+(d?dy/d:0)*limit}}e.x=Math.max(120,Math.min(ExoWorld.width-120,e.x));e.y=Math.max(120,Math.min(ExoWorld.height-120,e.y));if(ExoWorld.cave||typeof ExoCanyonV2!=='undefined'&&ExoCanyonV2.inZone(e.x,e.y))ExoWorld.limits(e)}
 function recover(s,u){const camp=ExoWorld.nearestCamp(u);s.recoveryPosition={x:camp.x,y:camp.y};s.hp=100;s.down=0;s.invulnerable=3;s.bolts=[];s.hazards=[];clearWeapons(s);for(const e of s.enemies){e.action=null;e.jumpZ=0}u.x=camp.x;u.y=camp.y;u.vx=u.vy=0;u.energy=100;u.flight=null;u.altitude=0;s.message='已返回'+camp.name+'，装甲修复完成。发现的记录和拾取的材料都还在。'}
 function hurt(s,u,damage,safe){if(safe||s.invulnerable>0||s.down)return false;s.hp=Math.max(0,s.hp-damage);s.invulnerable=.3;s.sparks.push({x:u.x,y:u.y,t:.4,hurt:true});s.message='装甲受损！向侧面加速躲开，留意敌人蓄力和地面的预警。';return true}
 function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)}
 function beginAttack(e,u){const d=dist(e,u),level=e.level||1;let kind=level===1?(d<170&&(u.altitude||0)<90?'pounce':'spit'):level===2?'charge':level===3?'mortar':d<260&&(u.altitude||0)<90&&e.attackCount%2===0?'shockwave':'volley';
  const duration={pounce:.55,spit:.3,charge:.85,mortar:.65,shockwave:1.1,volley:.65}[kind],dx=u.x-e.x,dy=u.y-e.y,n=d||1;
  let target={x:u.x,y:u.y};if(kind==='charge'||kind==='pounce'){const range=Math.min(kind==='charge'?460:230,d+70);target={x:e.x+dx/n*range,y:e.y+dy/n*range}}
  if(kind==='mortar')target={x:u.x+Math.max(-70,Math.min(70,(u.vx||0)*.35)),y:u.y+Math.max(-70,Math.min(70,(u.vy||0)*.35))};
  e.action={kind,phase:'windup',time:duration,duration,from:{x:e.x,y:e.y},target,hit:false};e.attackCount++;
 }
 function finishAction(e){e.action=null;e.jumpZ=0;e.attack=profile(e).rate*((e.level===4&&e.hp/e.max<.5)?.65:1)}
 function tickAction(s,e,u,dt,rocks,safe){const a=e.action;if(!a)return false;if(safe){finishAction(e);return false}a.time-=dt;
  if(a.phase==='windup'&&a.time<=0){
   if(a.kind==='charge'||a.kind==='pounce'){phase(e,'dash',a.kind==='charge'?.8:.6);a.dashStart={x:e.x,y:e.y};enemyEffect(s,'launch',e,{level:e.level,owner:e.id});}
   else if(a.kind==='mortar'){s.hazards.push({kind:'impact',owner:e.id,x:a.target.x,y:a.target.y,from:{x:e.x,y:e.y},radius:110,delay:1.25,total:1.25,damage:22});enemyEffect(s,'mortarLaunch',enemyPoint(e),{level:3,owner:e.id});phase(e,'release',.24)}
   else if(a.kind==='shockwave'){s.hazards.push({kind:'shockwave',owner:e.id,x:e.x,y:e.y,radius:8,previous:0,maxRadius:260,speed:230,damage:24,hit:false});enemyEffect(s,'slam',e,{level:4,owner:e.id});phase(e,'release',.28)}
   else {const count=a.kind==='volley'?(e.hp/e.max<.5?7:5):1,angle=Math.atan2(a.target.y-e.y,a.target.x-e.x);for(let i=0;i<count;i++){const q=angle+(i-(count-1)/2)*.17;s.bolts.push({x:e.x,y:e.y,vx:Math.cos(q)*(a.kind==='spit'?235:220),vy:Math.sin(q)*(a.kind==='spit'?235:220),ttl:2.8,damage:profile(e).damage,enemy:true,kind:a.kind,owner:e.id,level:e.level,...(u.flight?{z:enemyPoint(e).z,vz:(point(u).z-enemyPoint(e).z)/Math.max(.1,dist(e,u)/(a.kind==='spit'?235:220))}:{})})}enemyEffect(s,a.kind==='spit'?'spitLaunch':'volleyLaunch',enemyPoint(e),{level:e.level,owner:e.id});phase(e,'release',.20)}
   return true;
  }
  if(a.phase==='dash'){
   const old={x:e.x,y:e.y},dx=a.target.x-a.dashStart.x,dy=a.target.y-a.dashStart.y,n=Math.hypot(dx,dy)||1,speed=a.kind==='charge'?520:360;
   const candidate={x:e.x+dx/n*speed*dt,y:e.y+dy/n*speed*dt};
   if(blocked(old,candidate,rocks)){phase(e,'recover',.85);enemyEffect(s,'chargeImpact',e,{level:e.level,owner:e.id});e.jumpZ=0;return true}
   e.x=candidate.x;e.y=candidate.y;pushOut(e,rocks);
   if((u.altitude||0)<90&&!a.hit&&segmentDistance(u,old,e)<(a.kind==='charge'?48:42)&&!blocked(e,u,rocks)){a.hit=true;hurt(s,u,a.kind==='charge'?19:10,safe)}
   e.jumpZ=a.kind==='pounce'?Math.sin(Math.max(0,1-a.time/a.duration)*Math.PI)*45:0;
   if(a.time<=0||dist(e,a.target)<35){phase(e,'recover',a.kind==='charge'?.9:.5);enemyEffect(s,a.kind==='charge'?'chargeImpact':'pounceImpact',e,{level:e.level,owner:e.id});e.jumpZ=0}
  }else if(a.phase==='release'&&a.time<=0)phase(e,'recover',a.kind==='shockwave'?.65:.38);else if(a.phase==='recover'&&a.time<=0)finishAction(e);
  return true;
 }
 function tickHazards(s,u,dt,rocks,safe){for(const h of s.hazards){
   if(h.kind==='impact'){h.delay-=dt;if(h.delay<=0){if((u.altitude||0)<90&&dist(h,u)<h.radius&&!blocked(h,u,rocks))hurt(s,u,h.damage,safe);s.sparks.push({x:h.x,y:h.y,t:.6});enemyEffect(s,'sporeImpact',h,{level:3,owner:h.owner});h.kind='pool';h.radius=80;h.ttl=2.6;h.pulse=.6}}
   else if(h.kind==='pool'){h.ttl-=dt;h.pulse-=dt;if(h.pulse<=0){h.pulse=.6;if((u.altitude||0)<90&&dist(h,u)<h.radius&&!blocked(h,u,rocks))hurt(s,u,4,safe)}}
   else if(h.kind==='shockwave'){h.previous=h.radius;h.radius+=h.speed*dt;const d=dist(h,u);if((u.altitude||0)<90&&!h.hit&&d>=h.previous-26&&d<=h.radius+26&&!blocked(h,u,rocks)){h.hit=true;hurt(s,u,h.damage,safe)}}
  }s.hazards=s.hazards.filter(h=>h.kind==='impact'||h.kind==='pool'&&h.ttl>0||h.kind==='shockwave'&&h.radius<h.maxRadius);
 }
 function tick(s,u,dt,rocks=[]){dt=Math.min(.05,Math.max(0,dt));if(dt===0)return;s.hazards??=[];s.enemyFX??=[];for(const f of s.enemyFX)f.ttl-=dt;s.enemyFX=s.enemyFX.filter(f=>f.ttl>0);s.time+=dt;const danger=ExoWorld.danger?.(u);if(danger?.fatal&&!s.down){s.hp=0;s.down=3;clearWeapons(s);u.vx=u.vy=0;s.message='你进入了利维坦禁区，机甲已无法行动。正在带你返回安全营地。';return;}s.cooldown=Math.max(0,s.cooldown-dt);s.invulnerable=Math.max(0,s.invulnerable-dt);if(s.down){s.down-=dt;if(s.down<=0)recover(s,u);return}targetState(s,u,rocks);
  const quietOpening=!s.trial&&!s.cave&&!ExoWorld.cave&&openingCorridor(u.x,u.y),safe=quietOpening||(u.altitude||0)<100&&(ExoWorld.camps.some(c=>dist(u,c)<base.r)||(!ExoWorld.cave&&typeof ExoTrainingGround!=='undefined'&&ExoTrainingGround.contains(u.x,u.y,80)));if(safe)s.hp=Math.min(100,s.hp+18*dt);
  for(const e of s.enemies){
   if(e.hp<=0){e.action=null;if(e.death){e.death.age+=dt;e.jumpZ=e.death.jump*Math.max(0,1-e.death.age/.3);}else e.jumpZ=0;e.respawn-=dt;if(!s.cave&&e.respawn<=0&&dist(e,u)>550){e.x=e.hx;e.y=e.hy;e.hp=e.max;e.death=null;e.hitReaction=null;e.stagger=0;e.poise=0;e.state='patrol';e.attack=1}continue}
   if(e.hitReaction)e.hitReaction.time=Math.max(0,e.hitReaction.time-dt);e.staggerGuard=Math.max(0,(e.staggerGuard||0)-dt);e.poiseTime=Math.max(0,(e.poiseTime||0)-dt);if(!e.poiseTime)e.poise=0;if(e.stagger>0){e.stagger=Math.max(0,e.stagger-dt);e.vx=e.vy=0;continue}
   if(dist(e,u)>1800){e.action=null;e.jumpZ=0;e.vx=e.vy=0;continue}
   const old={x:e.x,y:e.y},rank=profile(e),d=dist(e,u);e.attack=Math.max(0,e.attack-dt);let dx,dy;
   if(!safe&&d<rank.aggro){e.state='chase';dx=u.x-e.x;dy=u.y-e.y;if(!e.action&&e.attack===0&&d<(e.level===3?600:460)&&!blocked(e,u,rocks))beginAttack(e,u);
    if(e.level===3){if(d<280){dx=-dx;dy=-dy}else if(d<440){dx=0;dy=0}}
    else if(e.level===1&&d>170){const side=e.id%2?1:-1,tx=dx;dx-=dy*.3*side;dy+=tx*.3*side}
   }else{e.state='patrol';if(e.action)finishAction(e);dx=e.hx+Math.cos(s.time*.3+e.phase)*65-e.x;dy=e.hy+Math.sin(s.time*.3+e.phase)*55-e.y}
   const acting=tickAction(s,e,u,dt,rocks,safe),n=Math.hypot(dx,dy),speed=e.state==='chase'?rank.speed:20;
   if(!acting&&n>3&&(e.state!=='chase'||d>(e.level===1?105:125)||e.level===3&&d<280)){e.x+=dx/n*speed*dt;e.y+=dy/n*speed*dt;pushOut(e,rocks)}
   e.vx=(e.x-old.x)/dt;e.vy=(e.y-old.y)/dt;e.distance=(e.distance||0)+Math.hypot(e.x-old.x,e.y-old.y);
  }
  tickHazards(s,u,dt,rocks,safe);tickWeapons(s,u,dt,rocks);
  for(const b of s.bolts){const old={x:b.x,y:b.y,z:b.z};const travel=Math.min(dt,Math.max(0,b.ttl));b.x+=b.vx*travel;b.y+=b.vy*travel;if(Number.isFinite(b.z))b.z+=(b.vz||0)*travel;b.ttl-=dt;b.age=(b.age||0)+dt;if(blocked(old,b,rocks)){b.ttl=0;if(b.enemy)enemyEffect(s,b.kind==='spit'?'acidImpact':'volleyImpact',old,{level:b.level||1,owner:b.owner});else weapons(s).weaponFX.push({kind:'hit',...old,ttl:.42,total:.42,seed:++s.weaponSerial});continue}if(b.enemy){if(Number.isFinite(b.z)?segment3(point(u),old,b)<40:(u.altitude||0)<90&&segmentDistance(u,old,b)<27){b.ttl=0;enemyEffect(s,b.kind==='spit'?'acidImpact':'volleyImpact',point(u),{level:b.level||1,owner:b.owner});hurt(s,u,b.damage,safe)}}else{const e=s.enemies.find(e=>e.hp>0&&(Number.isFinite(b.z)?segment3(enemyPoint(e),old,b)<36:segmentDistance(e,old,b)<32));if(e){b.ttl=0;damageEnemy(s,e,b.damage,'plasma',b.origin||old)}}}
  s.bolts=s.bolts.filter(b=>b.ttl>0);for(const p of s.sparks)p.t-=dt;s.sparks=s.sparks.filter(p=>p.t>0);s.drops=s.drops.filter(p=>{if(dist(p,u)<65){s.scrap+=p.value||1;s.message='已回收 '+(p.value||1)+' 份合金。消耗 2 份可修复 40 点装甲。';return false}return true});if(s.hp===0){clearWeapons(s);s.down=3;s.message='机甲暂时无法行动，3 秒后会自动返回营地。';u.vx=u.vy=0}
 }
 function repair(s){if(s.down)return false;if(s.hp>=100){s.message='装甲完好，无需修复。';return false}if(s.scrap<2){s.message='修复需要 2 份合金。合金不够时，可以回迫降营地免费修复。';return false}s.scrap-=2;s.hp=Math.min(100,s.hp+40);s.message='现场修复完成：装甲 +40。';return true}
 function enemyDraw(g,e,p,selected,time){const z=p.s;if(p.d<120||e.hp<=0)return;g.save();g.translate(p.x,p.y);g.scale(z,z);g.fillStyle='#0006';g.beginPath();g.ellipse(0,0,35,10,0,0,7);g.fill();g.translate(0,-29-Math.sin(time*3+e.id)*3);g.strokeStyle='#677c88';g.lineWidth=5;for(const x of [-1,1]){g.beginPath();g.moveTo(x*12,0);g.lineTo(x*35,12);g.lineTo(x*40,23);g.stroke()}g.fillStyle=e.type==='heavy'?'#726257':'#485a69';g.beginPath();g.moveTo(0,-23);g.lineTo(27,-8);g.lineTo(19,17);g.lineTo(-19,17);g.lineTo(-27,-8);g.closePath();g.fill();g.strokeStyle='#b4b0a0';g.lineWidth=1;g.stroke();g.fillStyle='#ff8970';g.fillRect(-11,-7,22,5);g.fillStyle='#1c2b36';g.fillRect(-25,-39,50,4);g.fillStyle='#e69b77';g.fillRect(-25,-39,50*e.hp/e.max,4);if(selected){g.strokeStyle='#ffd2a1';g.lineWidth=1;g.strokeRect(-36,-49,72,77)}g.restore()}
 function overlay(g,s,u,c,w,h,project){for(const b of s.bolts){const a=project(b.x-b.vx*.03,b.y-b.vy*.03,30,c,w,h),p=project(b.x,b.y,30,c,w,h);if(p.d<120)continue;g.strokeStyle=b.enemy?'#ff9775':'#9cefff';g.lineWidth=b.enemy?2:3;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(p.x,p.y);g.stroke()}for(const v of s.sparks){const p=project(v.x,v.y,32,c,w,h);g.strokeStyle=v.hurt?'#f98a75':'#b5f4ff';for(let i=0;i<7;i++){const a=i*6.28/7,r=(.45-v.t)*80*p.s;g.beginPath();g.moveTo(p.x+Math.cos(a)*r*.5,p.y+Math.sin(a)*r*.5);g.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);g.stroke()}}for(const d of s.drops){const p=project(d.x,d.y,12,c,w,h);if(p.d<120)continue;g.fillStyle='#e3ce8f';g.fillRect(p.x-5,p.y-5,10,10)}const p=project(base.x,base.y,0,c,w,h);if(p.d>120){g.strokeStyle='#8fdfcb';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y,base.r*p.s,base.r*p.s*.32,0,0,7);g.stroke();g.fillStyle='#b8f4df';g.font='12px system-ui';g.textAlign='center';g.fillText('迫降营地 / 免费修复',p.x,p.y+20)}if(s.invulnerable>0&&s.invulnerable<.3){g.fillStyle='#d6685514';g.fillRect(0,0,w,h)}}
 return {cannonRange,detectionRange,targetState,cycleTarget,openingCorridor,enemyEffect,point,enemyPoint,dist3,segment3,weapons,saber,launchMissiles,tickWeapons,damageEnemy,clearWeapons,base,ranks,profile,name,enemy,attack,beginAttack,tickAction,tickHazards,create,blocked,aim,fire,tick,repair,recover,enemyDraw,overlay};
})();
if(typeof module!=='undefined')module.exports=ExoSandbox;
