/* One spring and kinematic sliding, never a rigid-body world. All durable
   outcomes (positions, toppled pylons, fitted model) live in Things. */
const ExoTow=(()=>{
 const MAX_RANGE=460,SPRING=6,DAMPING=5;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const eligible=t=>t.location==='world'&&(t.towable||['tow','push'].includes(t.physics)||t.physics==='carry'&&t.mass>12)&&t.kind!=='creature'&&!t.state.fallen;
 const bias=d=>({right:7+.065*d+.15*Math.sin(d*.08),forward:3+.025*d+.09*Math.cos(d*.05)});
 function fit(rows){
  if(rows.length<4||Math.max(...rows.map(r=>r.distance))-Math.min(...rows.map(r=>r.distance))<90)return null;
  const n=rows.length,sx=rows.reduce((s,r)=>s+r.distance,0),sxx=rows.reduce((s,r)=>s+r.distance*r.distance,0),den=n*sxx-sx*sx;if(Math.abs(den)<1e-8)return null;
  const line=key=>{const sy=rows.reduce((s,r)=>s+r[key],0),sxy=rows.reduce((s,r)=>s+r.distance*r[key],0),slope=(n*sxy-sx*sy)/den;return {slope,intercept:(sy-slope*sx)/n};};
  return {right:line('right'),forward:line('forward'),ids:rows.map(r=>r.id)};
 }
 function create(things){
  if(!things.error&&things.get('tow:cable')?.location==='world')things.transaction(()=>things.patch('tow:cable',{location:'stowed',ends:[],state:{powered:false}},'cable-restored-stowed'),{save:false});
  const restored=things.getFlag('towLesson')||{},rows=(Array.isArray(restored.rows)?restored.rows:[]).filter(r=>r&&['distance','error','right','forward','id'].every(k=>Number.isFinite(r[k]))).slice(-48);
  let proposed=restored.proposed||null,installed=restored.installed||null,serial=Math.max(0,...rows.map(r=>r.id||0));
  const validModel=m=>m&&['right','forward'].every(k=>Number.isFinite(m[k]?.slope)&&Number.isFinite(m[k]?.intercept));if(!validModel(installed))installed=null;if(!validModel(proposed))proposed=null;
  const state={mode:'idle',aim:null,shot:null,targetId:null,rest:0,tension:0,reeling:false,wrap:null,braced:false,tip:null,message:'',velocity:{x:0,y:0},marks:[]};
  let time=0,pressedAt=0,toppleTime=0;
  const enabled=()=>!!things.getFlag('towUnlocked');
  function save(){things.flag('towLesson',{rows,proposed,installed});}
  function say(message,kind='tow'){state.message=message;things.signal(kind,{message});return message;}
  function aim(unit,angle=unit.angle||0){
   const dx=Math.sin(angle),dy=-Math.cos(angle),options=things.near(unit,MAX_RANGE).filter(t=>eligible(t)&&(t.zone!=='depot'||things.getFlag('depotOpen'))).map(t=>{const d=dist(t,unit),dot=((t.x-unit.x)*dx+(t.y-unit.y)*dy)/(d||1);return {t,d,dot};}).filter(v=>v.d>=35&&v.dot>.91).sort((a,b)=>(1-a.dot)*1800+a.d*.12-((1-b.dot)*1800+b.d*.12));
   const target=options[0]?.t;state.aim=target?{id:target.id,x:target.x,y:target.y,z:(target.z||0)+(target.hookHeight||45),distance:dist(unit,target),angle}:{id:null,x:unit.x+dx*280,y:unit.y+dy*280,z:0,distance:280,angle};return state.aim;
  }
  function begin(unit,angle){if(!enabled())return say('先去东侧备件库取牵引卷索。');if(unit.flight)return say('先落地，再使用牵引索。');pressedAt=time;if(state.mode==='attached'){state.reeling=true;return;}if(state.mode==='throwing')return;state.mode='aiming';aim(unit,angle);}
  function release(unit){if(state.mode==='aiming')return launch(unit,state.aim);if(state.mode==='attached'){state.reeling=false;if(time-pressedAt<.22)detach();}}
  function launch(unit,target){
   if(!enabled()||!target||target.distance>MAX_RANGE)return false;
   const distance=dist(unit,target),angle=target.angle??Math.atan2(target.x-unit.x,-(target.y-unit.y)),error=bias(distance),correction=installed?{right:installed.right.intercept+installed.right.slope*distance,forward:installed.forward.intercept+installed.forward.slope*distance}:{right:0,forward:0};
   const right=error.right-correction.right,forward=error.forward-correction.forward,sn=Math.sin(angle),cs=Math.cos(angle);
   const landing={x:target.x+cs*right+sn*forward,y:target.y+sn*right-cs*forward,z:target.z||0};
   state.mode='throwing';state.shot={id:++serial,targetId:target.id,from:{x:unit.x,y:unit.y,z:unit.altitude||0},desired:{x:target.x,y:target.y,z:target.z||0},landing,age:0,duration:.28+distance/1000,distance,right:error.right,forward:error.forward,error:Math.hypot(right,forward),role:installed?'test':'train'};state.tip={...state.shot.from};return true;
  }
  function detach(){state.mode='idle';state.targetId=null;state.reeling=false;state.wrap=null;state.tension=0;state.velocity={x:0,y:0};if(things.get('tow:cable'))things.transaction(()=>things.patch('tow:cable',{location:'stowed',ends:[],state:{powered:false}},'cable-detached'),{save:false});say('牵引索收回。');}
  function cancel(){if(state.mode==='aiming')state.mode='idle';state.reeling=false;}
  function calibrate(){
   if(installed)return say('修正已装入，接下来的新投掷只做独立测试。');
   if(!proposed){proposed=fit(rows.filter(r=>r.role==='train'));if(!proposed)return say('还需要四次落点，并拉开至少两个投掷距离。');save();return say('偏差随距离增大，修正已算好；点击「安装修正」试试。');}
   installed=JSON.parse(JSON.stringify(proposed));save();return say('修正已装入。换个距离试投，新记录不会再参与拟合。');
  }
  function wrap(id,unit){const anchor=things.get(id);if(state.mode!=='attached'||!anchor?.anchor||dist(anchor,unit)>100)return false;state.wrap=id;const target=things.get(state.targetId);state.rest=dist(anchor,target)+dist(unit,anchor);say('索绕过锚桩了，牵引更稳。');return true;}
  function finishShot(unit,ctx){
   const shot=state.shot,t=things.get(shot.targetId),hit=!!t&&eligible(t)&&dist(shot.landing,t)<=(t.hookRadius||13)&&!ctx.blocked?.(shot.from,t,2);
   if(shot.targetId){rows.push({...shot,from:undefined,desired:undefined,landing:undefined,age:undefined,duration:undefined,hit});if(rows.length>48)rows.shift();save();}
   state.marks.push({...shot.landing,desired:shot.desired,until:time+18,hit});if(state.marks.length>8)state.marks.shift();
   things.signal(hit?'hook-hit':'hook-miss',{id:shot.targetId,x:shot.landing.x,y:shot.landing.y,desired:shot.desired});
   if(hit){state.mode='attached';state.targetId=t.id;state.rest=dist(unit,t)+5;state.velocity={x:0,y:0};state.tip=null;say(installed?'挂住了；按住 X 收索，轻按 X 松开。':'挂住了，近处的偏差小一些；按住 X 收索。');}
   else{state.mode='idle';state.tip=null;say(installed?'落点已记入独立测试，调整方向再试。':fit(rows.filter(r=>r.role==='train'))?'落点够了，点击「拟合修正」。':'挂钩落偏了。换个距离再试，让 AEGIS 比较落点。');}
   state.shot=null;
  }
  function step(dt,ctx){
   dt=clamp(dt,0,.05);time+=dt;const {unit}=ctx;if(!enabled())return;state.braced=!!ctx.braced&&!!ctx.stabilizer;
   while(state.marks[0]?.until<time)state.marks.shift();
   if(state.mode==='aiming')aim(unit,ctx.angle??unit.angle);
   if(state.mode==='throwing'){const s=state.shot;s.age+=dt;const f=Math.min(1,s.age/s.duration);state.tip={x:s.from.x+(s.landing.x-s.from.x)*f,y:s.from.y+(s.landing.y-s.from.y)*f,z:s.from.z+(s.landing.z-s.from.z)*f+Math.sin(f*Math.PI)*65};if(f>=1)finishShot(unit,ctx);return;}
   if(state.mode!=='attached')return;
   const target=things.get(state.targetId);if(!target||target.context!==(unit.context||'surface')||target.location!=='world'||unit.flight||dist(unit,target)>MAX_RANGE+160){detach();return;}
   const anchor=state.wrap&&things.get(state.wrap),origin=anchor||unit,dx=origin.x-target.x,dy=origin.y-target.y,d=Math.hypot(dx,dy)||1,path=target.anchor&&!anchor?Math.hypot(d,ctx.height(target.x,target.y)+(target.z||0)-ctx.height(unit.x,unit.y)-(unit.altitude||0)):d+(anchor?dist(unit,anchor):0);
   if(state.reeling)state.rest=Math.max(target.anchor?12:35,state.rest-dt*85);const stretch=Math.max(0,path-state.rest),strength=anchor?260:state.braced?120:40;state.tension=Math.min(200,stretch*SPRING);state.tip={x:target.x,y:target.y,z:(target.z||0)+(target.hookHeight||45)};
   if(target.anchor&&!anchor){
    if(state.reeling&&stretch>0){const floor=ctx.height(unit.x,unit.y),top=ctx.height(target.x,target.y)+(target.z||0),foot=floor+(unit.altitude||0),dz=top-foot,length=Math.hypot(dx,dy,dz)||1,step=Math.min(length,Math.min(100,stretch*2)*dt),next={x:unit.x-dx/length*step,y:unit.y-dy/length*step};if(!ctx.blocked?.(unit,next,24)){unit.x=next.x;unit.y=next.y;unit.altitude=Math.max(0,foot+dz/length*step-ctx.height(unit.x,unit.y));unit.towClimbing=true;unit.vx=unit.vy=0;}if(d<35&&Math.abs(dz)<10){unit.altitude=0;detach();say('脚下稳了，已经到达高台。');}}
   }else if(target.mass<=strength&&stretch>.2){
    if(target.kind==='pylon'){
     toppleTime+=dt;if(toppleTime>.4){const angle=Math.atan2(dy,dx),end={x:target.x+Math.cos(angle)*(target.height||210),y:target.y+Math.sin(angle)*(target.height||210)};things.transaction(()=>things.patch(target.id,{state:{fallen:true,fallAngle:angle,tilted:true}},'pylon-toppled'),{save:false});for(const actor of ctx.actors||[])if(segmentDistance(actor,target,end)<45)ctx.onStun?.(actor,6);for(const c of things.near(target,300).filter(t=>t.kind==='creature'))if(segmentDistance(c,target,end)<45)things.transaction(()=>things.patch(c.id,{state:{stunned:6}},'pylon-stun'),{save:false});things.signal('pylon-toppled',{id:target.id,x:target.x,y:target.y});detach();say('支柱倒下了，横梁搭住了沟两边。');}
    }else{
     toppleTime=0;const acceleration=Math.min(170,state.tension/Math.max(8,target.mass)*85);state.velocity.x+=(dx/d*acceleration-state.velocity.x*DAMPING)*dt;state.velocity.y+=(dy/d*acceleration-state.velocity.y*DAMPING)*dt;const next={x:target.x+state.velocity.x*dt,y:target.y+state.velocity.y*dt},travel=dist(target,next),rise=ctx.height(next.x,next.y)-ctx.height(target.x,target.y);
     if(travel>0&&!ctx.blocked?.(target,next,target.radius)&&rise<Math.max(4,travel*.85)){things.transaction(()=>things.patch(target.id,{...next,state:{tilted:Math.abs(rise)/Math.max(.01,travel)>.7}},'towed'),{save:false});}else state.velocity={x:0,y:0};
    }
   }else{state.velocity={x:0,y:0};toppleTime=0;}
   const end=things.get(state.targetId);if(end){let start=anchor;if(!start)start=things.near(unit,40).find(t=>t.id!==end.id&&t.material==='metal'&&t.kind!=='cable'&&t.kind!=='battery');const row={id:'tow:cable',kind:'cable',material:'metal',physics:'fixed',mass:2,radius:2,x:(unit.x+end.x)/2,y:(unit.y+end.y)/2,context:unit.context||'surface',location:'world',ends:start?[start.id,end.id]:[],state:{rewired:true}};things.transaction(()=>things.get(row.id)?things.patch(row.id,row,'cable-contact'):things.add(row,'cable-laid'),{save:false});}
  }
  function summary(){const train=rows.filter(r=>r.role==='train'),test=rows.filter(r=>r.role==='test'),mean=a=>a.length?Math.sqrt(a.reduce((n,r)=>n+r.error*r.error,0)/a.length):null;return {train:train.length,test:test.length,before:mean(train),after:mean(test),ready:!!fit(train),proposed:!!proposed,installed:!!installed,rows:rows.map(r=>({...r})),model:installed};}
  return {state,aim,begin,release,launch,step,detach,cancel,calibrate,wrap,summary,get enabled(){return enabled();},get time(){return time;}};
 }
 function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
 return {create,fit,bias,eligible,segmentDistance,MAX_RANGE};
})();
if(typeof module!=='undefined')module.exports=ExoTow;
