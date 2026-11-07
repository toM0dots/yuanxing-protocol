/* Chapter 02: collect labels in the field, build a visible decision tree,
   then watch an autonomous rover validate on held-out terrain. */
const ExoTerrainCourse=(()=>{
 const wilds=typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null;
 const site=typeof ExoTrainingGround!=='undefined'?ExoTrainingGround.terrain:null;
 const specs=[
  [.26,.22,.88,'脆壳浅滩'],[.72,.28,.44,'低坡岩床'],[.78,.76,.82,'晶须陡坡'],
  [.42,.38,.64,'粉化台地'],[.64,.71,.36,'风化斜面'],[.67,.50,.31,'压实坡肩'],
  [.47,.25,.93,'覆沙薄壳'],[.76,.72,.76,'磁晶爬坡'],[.69,.64,.46,'断层斜坡'],[.57,.49,.28,'狭窄硬路']
 ];
 const trainXY=site?.trainXY||[[5000,3350],[5300,3350],[5600,3350],[5000,3700],[5300,3700],[5600,3700]];
 const testXY=site?.testXY||[[5050,4140],[5400,4140],[5050,4490],[5400,4490]];
 const patches=specs.map(([strength,slope,grip,name],id)=>{const xy=id<6?trainXY[id]:testXY[id-6],natural=wilds?(id<6?wilds.trainingSamples[id]:wilds.testSamples[id-6]):null;return {id,x:xy[0],y:xy[1],strength,slope,grip,name,...natural,test:id>=6}});
 const truth=p=>p.strength>=.5&&(p.slope<=.55||p.grip>=.7);
 function classify(model,p){
  const path=[];
  path.push('承重 '+p.strength.toFixed(2)+(p.strength>=model.strength?' ≥ ':' < ')+model.strength.toFixed(2));
  if(p.strength<model.strength)return {pass:false,reason:'地面承重不足',path};
  path.push('坡度 '+p.slope.toFixed(2)+(p.slope<=model.slope?' ≤ ':' > ')+model.slope.toFixed(2));
  if(p.slope<=model.slope)return {pass:true,reason:'坡度较缓，可以通过',path};
  path.push('抓地力 '+p.grip.toFixed(2)+(p.grip>=model.grip?' ≥ ':' < ')+model.grip.toFixed(2));
  return p.grip>=model.grip?{pass:true,reason:'抓地力足够，可以爬坡',path}:{pass:false,reason:'坡陡且抓地力不足，容易打滑',path};
 }
 const predict=(s,p)=>classify(s,p).pass;
 function fresh(){return {active:false,phase:'brief',rows:[],strength:.34,slope:.74,grip:.46,checks:[],unlocked:false,overlay:true,probe:null,validationIndex:0,validationDelay:0,uiPending:null,message:'河谷的水边、陡坡和洞内薄壳都可能损伤机甲。沿路找到六处不同地形，在稳固的观察点派出探测车。把真实的通行结果记下来，再让机甲学会判断。'}}
 const observation=p=>p.observationPoint||p;
 const distance=(p,u)=>Math.hypot(observation(p).x-u.x,observation(p).y-u.y);
 const nearest=u=>patches.slice().sort((a,b)=>distance(a,u)-distance(b,u))[0];
 function focus(s,u){if(s.probe)return patches[s.probe.id];if(s.phase==='validate')return patches.filter(p=>p.test&&!s.checks.some(r=>r.id===p.id)).sort((a,b)=>distance(a,u)-distance(b,u))[0]||nearest(u);return patches.filter(p=>!p.test&&!s.rows.some(r=>r.id===p.id)).sort((a,b)=>distance(a,u)-distance(b,u))[0]||nearest(u); }
 function metrics(s,rows=s.rows){let correct=0,falseSafe=0,falseBlock=0;for(const p of rows){const pred=predict(s,p);correct+=+(pred===p.pass);falseSafe+=+(pred&&!p.pass);falseBlock+=+(!pred&&p.pass)}return {correct,total:rows.length,falseSafe,falseBlock}}
 function outcome(p){if(truth(p))return p.slope>.55?'climb':'pass';return p.strength<.5?'sink':'slip'}
 function set(s,key,v){if(!['strength','slope','grip'].includes(key)||!Number.isFinite(v))return;s[key]=Math.max(0,Math.min(1,v));s.checks=[];s.unlocked=false;s.probe=null;s.validationDelay=0;s.phase=s.rows.length===6?'workshop':'collect';s.uiPending=null}
 function beginProbe(s,p,from,auto=false){s.probe={id:p.id,t:0,from:{x:from.x,y:from.y},decision:predict(s,p),auto};return true}
 function launch(s,u){
  if(!s.active||s.probe)return false;
  const p=nearest(u),d=distance(p,u);
  if(d>95){s.message='最近的测量点还在 '+Math.round(d/18)+' m 外。沿青灯走到稳固的观察点，就能派出探测车。';return false}
  if(p.test){if(s.phase!=='validate'){s.message='这段路线先留作独立验证。记录六处沿途地形、学好判断规则后，再来这里检验。';return false}if(s.checks.some(r=>r.id===p.id)){s.message='这段新路线已经检验过。打开地图，继续前往另一处验证点。';return false}beginProbe(s,p,u,true);s.message='探测车正在检查 '+p.name+'，看看模型建议是否可靠。';return true}
  if(s.rows.some(r=>r.id===p.id)){s.message=p.name+'已经测过了。换一个地点试试，模型需要不同地形的记录。';return false}
  s.phase='collect';beginProbe(s,p,u,false);s.message='探测车出发了。先测量地面，再试着通过，记录成功还是失败……';return true;
 }
 function finishValidation(s){
  const ok=s.checks.length===4&&s.checks.every(r=>r.correct);
  s.probe=null;s.validationDelay=0;
  if(ok){s.unlocked=true;s.phase='complete';s.message='四段新路线都判断对了！风险提示与自动制动已安装，继续沿河谷探索时就能使用。';s.uiPending='complete'}
  else{s.unlocked=false;s.phase='workshop';const bad=s.checks.filter(r=>!r.correct);s.message='这次有 '+bad.length+' 段路线判断错误：'+bad.map(r=>patches[r.id].name).join('、')+'。测试记录没有加入训练。打开驾驶日志，检查判断门槛后再试。';s.uiPending='workshop'}
  save(s);
 }
 function tick(s,dt){
  if(dt<=0)return false;
  if(!s.probe)return false;
  s.probe.t+=dt;if(s.probe.t<3.15)return false;
  const p=patches[s.probe.id],actual=truth(p),decision=s.probe.decision,kind=outcome(p);
  if(!p.test){
   s.rows.push({id:p.id,x:p.x,y:p.y,name:p.name,strength:p.strength,slope:p.slope,grip:p.grip,pass:actual,outcome:kind});
   s.rows.sort((a,b)=>a.id-b.id);
   const result=kind==='sink'?'表层塌陷':kind==='slip'?'横向打滑':kind==='climb'?'抓住晶体表面，顺利爬坡':'稳定通过';
   s.message=p.name+'：'+result+'。已记录：地面承重 '+p.strength.toFixed(2)+'，坡度 '+p.slope.toFixed(2)+'，抓地力 '+p.grip.toFixed(2)+'；结果：'+(actual?'可通行':'危险')+'。已记录 '+s.rows.length+'/6。';
   s.phase=s.rows.length===6?'workshop':'collect';s.probe=null;if(s.rows.length===6)s.uiPending='workshop';
  }else{
   const correct=decision===actual,route=classify(s,p);
   s.checks.push({id:p.id,correct,decision,actual,path:route.path});
   s.validationIndex++;
   s.probe=null;
   if(s.validationIndex>=4){finishValidation(s);return true}
   s.validationDelay=0;
   s.message=p.name+'：模型判断'+(decision?'可通行':'应绕行')+'，实测结果'+(actual?'可通行':'危险')+'。'+(correct?'判断正确。':'判断错误。')+' 打开地图，沿青灯前往下一处观察点。';
  }
  save(s);return true;
 }
 function candidates(rows,key){const a=[...new Set(rows.map(p=>p[key]))].sort((x,y)=>x-y),out=[0,1];for(let i=0;i<a.length-1;i++)out.push((a[i]+a[i+1])/2);return out}
 function train(s){
  if(s.rows.length<4)return false;
  let best=null;
  for(const a of candidates(s.rows,'strength'))for(const b of candidates(s.rows,'slope'))for(const c of candidates(s.rows,'grip')){
   const trial={strength:a,slope:b,grip:c},m=metrics(trial,s.rows),score=m.correct*100-m.falseSafe*35-m.falseBlock*8-Math.abs(a-.5)-Math.abs(b-.55)-Math.abs(c-.7);
   if(!best||score>best.score)best={a,b,c,score,m};
  }
  s.strength=best.a;s.slope=best.b;s.grip=best.c;s.checks=[];s.unlocked=false;s.phase='workshop';s.message='已根据 '+s.rows.length+' 条沿途记录调整判断门槛，优先避免把危险地面当成安全路。另外四段验证路线的数据没有用于训练。';save(s);return true;
 }
 function startValidation(s,u){
  if(s.rows.length<6||s.probe)return false;
  s.active=true;s.phase='validate';s.checks=[];s.unlocked=false;s.validationIndex=0;s.validationDelay=0;s.uiPending=null;
  s.message='规则已装入探测车。沿河谷找到四处未用于训练的新路线，在观察点按 E 或派车检验。';save(s);return true;
 }
 function save(s){try{localStorage.setItem('exo-terrain-course-v2',JSON.stringify({ids:s.rows.map(p=>p.id),strength:s.strength,slope:s.slope,grip:s.grip,unlocked:s.unlocked,overlay:s.overlay,schema:3,validatedIds:s.checks.map(p=>p.id),validating:s.phase==='validate'}))}catch{}}
 function restore(){
  const s=fresh();
  try{const v=JSON.parse(localStorage.getItem('exo-terrain-course-v2'));if(v&&Array.isArray(v.ids)&&v.ids.every(i=>Number.isInteger(i)&&i>=0&&i<6)){
   s.rows=[...new Set(v.ids)].map(i=>({...patches[i],pass:truth(patches[i]),outcome:outcome(patches[i])}));
   for(const k of ['strength','slope','grip'])if(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1)s[k]=v[k];
   const hasChecks=Object.hasOwn(v,'validatedIds'),validChecks=Array.isArray(v.validatedIds)&&v.validatedIds.every(i=>Number.isInteger(i)&&i>=6&&i<10);
   if(validChecks&&s.rows.length===6)s.checks=[...new Set(v.validatedIds)].map(id=>{const p=patches[id],route=classify(s,p),actual=truth(p);return {id,correct:route.pass===actual,decision:route.pass,actual,path:route.path};});
   s.validationIndex=s.checks.length;s.unlocked=v.unlocked===true&&(!hasChecks||s.checks.length===4&&s.checks.every(p=>p.correct));s.overlay=v.overlay!==false;
   s.phase=s.unlocked?'complete':v.validating===true&&validChecks&&s.rows.length===6&&s.checks.length<4?'validate':s.rows.length===6?'workshop':s.rows.length?'collect':'brief';
   if(s.phase==='validate')s.message='已保留 '+s.checks.length+' / 4 段新路线的检验记录。继续前往还没检验的观察点。';
  }}catch{}
  return s;
 }
 function treeHtml(s){
  return '<div class="terrain-tree" aria-label="三级地形决策树"><div class="tree-node root"><span>先看地面承重</span><b>≥ <output id="terrain-strength-value">'+s.strength.toFixed(2)+'</output></b><small>低于门槛：可能下陷，建议绕行</small></div><i></i><div class="tree-node"><span>再看坡度</span><b>≤ <output id="terrain-slope-value">'+s.slope.toFixed(2)+'</output></b><small>不高于门槛：可以通过；否则看抓地力</small></div><i></i><div class="tree-node"><span>最后看抓地力</span><b>≥ <output id="terrain-grip-value">'+s.grip.toFixed(2)+'</output></b><small>达到门槛：可以爬坡；否则建议绕行</small></div></div>';
 }
 function panel(s){
  const m=metrics(s),ready=s.rows.length===6;
  return '<div class="cal-panel terrain-panel"><span class="exo-tag">断脊河谷 · 沿途勘测记录</span><h2>把沿途记录，变成判断依据。</h2><p>'+s.message+'</p><div class="fc-data-strip"><div><strong>'+s.rows.length+'/6</strong><span>已测地形</span></div><div><strong>'+m.correct+'/'+m.total+'</strong><span>训练记录判断正确</span></div><div><strong>'+m.falseSafe+'</strong><span>误判为安全</span></div></div>'+treeHtml(s)+'<div class="terrain-sliders"><label>地面承重门槛<input id="terrain-strength" type="range" min="0" max="1" step=".01" value="'+s.strength+'" oninput="Exo.terrainSet(\'strength\',+this.value)"></label><label>坡度门槛<input id="terrain-slope" type="range" min="0" max="1" step=".01" value="'+s.slope+'" oninput="Exo.terrainSet(\'slope\',+this.value)"></label><label>抓地力门槛<input id="terrain-grip" type="range" min="0" max="1" step=".01" value="'+s.grip+'" oninput="Exo.terrainSet(\'grip\',+this.value)"></label></div><canvas id="terrain-chart" width="640" height="300" aria-label="地面承重与坡度的训练记录图；环形点表示抓地力达到门槛的地形"></canvas><div id="terrain-results"></div><div class="fc-buttons"><button onclick="Exo.terrainTrain()" '+(s.rows.length>=4?'':'disabled')+'>自动调整判断门槛</button><button class="primary" onclick="Exo.terrainValidate()" '+(ready?'':'disabled')+'>安装规则 · 去检验新路线 →</button><button onclick="closeModal();Exo.terrainResume()">继续沿途勘测</button></div><p id="terrain-status" role="status">'+(ready?'六处沿途记录已齐。接下来亲自找到四段新路线检验，验证记录不会加入训练。':'还需要测量 '+(6-s.rows.length)+' 处地形。')+'</p><details><summary>一次探路都记录了什么？</summary><p>每次探路记录四件事：地面承重、坡度、抓地力，以及是否成功通过。前三项叫特征，通过或失败的结果叫标签。有了实际结果，模型才有依据学习怎样判断。</p><div class="fc-table"><table><thead><tr><th>地形</th><th>承重</th><th>坡度</th><th>抓地力</th><th>实际结果</th><th>当前判断</th></tr></thead><tbody>'+s.rows.map(p=>'<tr><td>'+p.name+'</td><td>'+p.strength.toFixed(2)+'</td><td>'+p.slope.toFixed(2)+'</td><td>'+p.grip.toFixed(2)+'</td><td>'+(p.pass?'可通行':'危险')+'</td><td>'+(predict(s,p)?'可通行':'建议绕行')+'</td></tr>').join('')+'</tbody></table></div></details><details><summary>想了解背后的 AI 原理？</summary><p>每一步只问一个问题，再根据答案选择下一步，这就是决策树。在这里，先判断地面能否承重，再看坡度；遇到陡坡，还要检查抓地力。你能沿着这些步骤看懂模型为什么建议通过或绕行。</p><p>类似结构用于无人车地形分类、工业故障筛查、医学分诊和信用风控。真实系统还会考虑更多特征、概率和不确定性；这里用三层树，让你看清每一步判断。</p></details><button onclick="Exo.wildsMap()">打开河谷勘测地图</button><button onclick="closeModal();Exo.terrainExit()">收起勘测工具 · 保留记录</button></div>';
 }
 function chart(s){
  const el=document.getElementById('terrain-chart');if(!el)return;const g=el.getContext('2d'),L=48,Tp=24,W=560,H=224,x=v=>L+v*W,y=v=>Tp+(1-v)*H;
  g.fillStyle='#0b1821';g.fillRect(0,0,640,300);
  for(let i=0;i<28;i++)for(let j=0;j<14;j++){const p={strength:(i+.5)/28,slope:(j+.5)/14,grip:.5};g.fillStyle=predict(s,p)?'#174c4a':'#4a2928';g.globalAlpha=.26;g.fillRect(x(i/28),y((j+1)/14),W/28+1,H/14+1)}
  g.globalAlpha=1;g.strokeStyle='#59717c';g.strokeRect(L,Tp,W,H);g.font='11px system-ui';g.fillStyle='#a9c1cb';g.fillText('地面承重 →',548,278);g.save();g.translate(13,160);g.rotate(-Math.PI/2);g.fillText('坡度 →',0,0);g.restore();
  for(const p of s.rows){g.beginPath();g.arc(x(p.strength),y(p.slope),p.grip>=s.grip?8:5,0,Math.PI*2);g.fillStyle=p.pass?'#8ce4c5':'#f0a17a';g.fill();g.lineWidth=p.grip>=s.grip?3:1;g.strokeStyle='#e7f6f5';g.stroke();g.fillStyle='#dce9ec';g.fillText(String(p.id+1),x(p.strength)+10,y(p.slope)+4)}
  g.fillStyle='#9fb7c1';g.fillText('带圆环的点：抓地力已达到爬坡门槛',48,292);
 }
 function refresh(s){
  for(const k of ['strength','slope','grip']){const input=document.getElementById('terrain-'+k),out=document.getElementById('terrain-'+k+'-value');if(input)input.value=s[k];if(out)out.textContent=s[k].toFixed(2)}
  const results=document.getElementById('terrain-results');if(results){const m=metrics(s);results.innerHTML='<p>训练记录判断正确 '+m.correct+'/'+m.total+' · 误判为安全 '+m.falseSafe+' · 误判为危险 '+m.falseBlock+'。把危险地面误判为安全最容易造成事故，所以训练时优先减少这类错误。</p>'}
  chart(s);
 }
 function overlay(g,s,u,c,w,h,project){
  if((!s.active&&!s.unlocked)||ExoWorld.cave)return;
  const ground=ExoWorld.elevation(c.x,c.y),target=focus(s,u);
  g.save();g.textAlign='center';g.font='500 11px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
  for(const p of patches){
   const d=Math.hypot(p.x-u.x,p.y-u.y),active=s.probe?.id===p.id,selected=p===target;
   if(d>500&&!active)continue;
   const q=project(p.x,p.y,ExoWorld.elevation(p.x,p.y)+28-ground,c,w,h);
   if(q.d<35||q.x<25||q.x>w-25||q.y<75||q.y>h-80)continue;
   const known=s.rows.find(r=>r.id===p.id),checked=s.checks.find(r=>r.id===p.id),color=checked?(checked.correct?'#b2d5b2':'#dba087'):known?(known.pass?'#b2d5b2':'#cca88b'):p.test?'#c3b18e':'#b5d4cd';
   g.globalAlpha=selected?.95:known||checked?.3:.5;g.strokeStyle=color;g.fillStyle=color;g.lineWidth=1;
   g.beginPath();g.arc(q.x,q.y,selected?5:2.5,0,Math.PI*2);g.stroke();
   if(active){g.globalAlpha=.6;g.beginPath();g.arc(q.x,q.y,10+(s.probe.t*7)%12,0,Math.PI*2);g.stroke();}
   if(selected&&(d<=500||active)){
    const label=p.name+(active?' · 探测中':known?' · 已测量':checked?' · 已核对':'');
    g.globalAlpha=.92;g.strokeStyle='#0a161be6';g.lineWidth=3;g.strokeText(label,q.x,q.y-15);g.fillText(label,q.x,q.y-15);
   }
  }
  g.restore();
 }
 function rover(s){
  if(!s.probe)return null;const p=patches[s.probe.id],t=Math.min(1,s.probe.t/2.75),actual=truth(p),kind=outcome(p),attempt=!p.test||s.probe.decision,limit=!attempt?.18:actual?1:kind==='sink'?.52:.62,move=Math.min(t,limit),side=kind==='slip'&&t>.42?Math.sin((t-.42)*15)*32*(t-.42):0,dx=p.x-s.probe.from.x,dy=p.y-s.probe.from.y,len=Math.hypot(dx,dy)||1;return {x:s.probe.from.x+dx*move-side*dy/len,y:s.probe.from.y+dy*move+side*dx/len,slip:kind==='slip'&&t>.45,sink:kind==='sink'&&t>.46,climb:kind==='climb',blocked:!attempt,outcome:kind}}
 function report(s){return '<div class="fc-panel terrain-report"><span class="exo-tag">K–09 · 新路线测试完成</span><h2>判断规则已通过沿途验证。</h2><p>探测车用你收集的测量结果学会了一套判断规则：先看承重，再看坡度和抓地力。刚才四段新路线都判断正确，说明这套规则通过了本次独立测试。野外仍要观察：模型建议绕行时，机甲会在危险边缘制动；桥面和青灯道路是可靠的备用路线。</p><div class="terrain-checks">'+s.checks.map((r,i)=>'<div class="'+(r.correct?'ok':'bad')+'"><b>'+(i+1)+' · '+patches[r.id].name+'</b><span>模型判断：'+(r.decision?'可通行':'建议绕行')+' / 实测：'+(r.actual?'可通行':'危险')+'</span><small>'+r.path.join(' → ')+'</small></div>').join('')+'</div><button class="primary" onclick="closeModal();Exo.terrainExit()">继续探索河谷 →</button><button onclick="Exo.wildsMap()">查看河谷路线</button><button onclick="closeModal();Exo.terrainExit()">收起勘测工具</button><button onclick="Exo.terrainPanel()">查看判断规则</button></div>'}
 return {patches,observation,truth,classify,predict,outcome,fresh,nearest,focus,metrics,set,launch,tick,train,startValidation,save,restore,panel,chart,refresh,overlay,rover,report};
})();
if(typeof module!=='undefined')module.exports=ExoTerrainCourse;
