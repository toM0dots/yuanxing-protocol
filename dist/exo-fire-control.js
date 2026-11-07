/* Chapter 01: combat telemetry -> linear regression -> deployed fire-control correction.
   Fictional angular emitter drift; deterministic teaching simulation, not real ballistics. */
const ExoFireControl = (() => {
  const site=typeof ExoTrainingGround!=='undefined'?ExoTrainingGround.fire:null;
  const base = site?.base||{x:3000,y:2700,r:120};
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rad = Math.PI/180;
  const layouts = site?.layouts||[[2920,2320,true],[3160,2180,true],[2840,2000,true],[2680,2160,false],[3350,2010,false],[3370,2400,false]];
  function battle(attempt=0) {
    return {hp:100,kills:0,scrap:0,time:0,cooldown:0,invulnerable:2,down:0,target:null,bolts:[],sparks:[],drops:[],alarm:0,beams:[],signals:[],shots:0,hits:0,mainKills:0,
      enemies:layouts.map(([x,y,main],id)=>({...ExoSandbox.enemy(id,x+(attempt>1?Math.sin(id+attempt)*32:0),y+(attempt>1?Math.cos(id+attempt)*28:0),main?(id===2?3:2):1),hx:x,hy:y,main,attack:1+id*.15,alert:0,vx:0,vy:0,strafe:id%2?1:-1})),message:''};
  }
  function fresh(){return {active:false,phase:'brief',logs:[],w:0,windW:0,leadW:0,heightW:0,b:0,steps:0,history:[],installed:null,assist:false,trim:0,attempt:0,attempts:[],completed:false,fitIds:[],battle:battle(),message:'炮口在迫降时受了损。换几个距离和位置试射，看看磁场、目标移动和高低差会让子弹偏向哪里。每次开火都会自动留下记录。',uiPending:null}}
  function samples(s){return s.logs.filter(p=>p.role==='train')}
  const range=750;
  function band(d){return d<80?'close':d<=220?'near':d<=450?'mid':'far'}
  function spread(rows,key){const a=rows.map(p=>p[key]);return a.length?Math.max(...a)-Math.min(...a):0}
  function coverage(s){const rows=samples(s),xs=rows.map(p=>p.distance),counts={near:0,mid:0,far:0};for(const p of rows){const b=band(p.distance);if(b in counts)counts[b]++}const span=rows.length?Math.max(...xs)-Math.min(...xs):0,windSpan=spread(rows,'wind'),leadSpan=spread(rows,'lead'),heightSpan=spread(rows,'height'),moving=rows.filter(p=>Math.abs(p.lead)>.08).length;return {count:rows.length,span,windSpan,leadSpan,heightSpan,moving,...counts,fitReady:rows.length>=5&&span>=35,ready:rows.length>=8&&counts.near>=2&&counts.mid>=2&&counts.far>=2&&span>=400&&windSpan>=.3&&moving>=2&&leadSpan>=.12}}
  function coverageText(c){return `近 ${Math.min(2,c.near)}/2 · 中 ${Math.min(2,c.mid)}/2 · 远 ${Math.min(2,c.far)}/2 · 移动目标 ${Math.min(2,c.moving)}/2`}
  function validation(s){const out={near:0,mid:0,far:0};for(const p of s.logs.filter(p=>p.role==='test'&&p.assisted&&Math.abs(p.residual)<2)){const b=band(p.distance);if(b in out)out[b]++}return out}
  function field(u){return clamp((Math.sin((u.x-(site?site.base.x-180:2820))/115)+.65*Math.cos(((site?10270-u.y:u.y)-2180)/92))/1.65,-1,1)}
  function features(u,e){const d=distance(u,e),nx=(e.x-u.x)/(d||1),ny=(e.y-u.y)/(d||1),lateral=(-ny*(e.vx||0)+nx*(e.vy||0))/90;return {distance:d,x:d/500,wind:field(u),lead:clamp(lateral,-1,1),height:clamp((ExoWorld.elevation(e.x,e.y)-ExoWorld.elevation(u.x,u.y))/120,-1,1)}}
  function predict(model,p){return model.w*p.x+model.windW*p.wind+model.leadW*p.lead+model.heightW*p.height+model.b}
  function loss(s,model=s){const rows=samples(s);return rows.length?rows.reduce((sum,p)=>sum+(predict(model,p)-p.y)**2,0)/rows.length:null}
  function drift(d,id,f={}){return 2.8+9*d/500+4.2*(f.wind||0)+5.4*(f.lead||0)+3.1*(f.height||0)+.16*Math.sin(id*2.13)}
  function available(s,u,rocks=[]){return s.battle.enemies.filter(e=>e.hp>0&&distance(e,u)<=range&&!ExoSandbox.blocked(u,e,rocks)).sort((a,b)=>distance(a,u)-distance(b,u))}
  function aim(s,u,rocks=[]){const a=available(s,u,rocks);return a.find(e=>e.id===s.battle.target)||a[0]||null}
  function cycle(s,u,rocks=[]){const a=available(s,u,rocks);if(!a.length)return;const i=a.findIndex(e=>e.id===s.battle.target);s.battle.target=a[(i+1)%a.length].id}
  function deploy(s,u){s.active=true;s.phase='field';s.attempt++;s.battle=battle(s.attempt);s.trim=0;s.assist=!!s.installed;s.uiPending=null;Object.assign(u,{...(site?.spawn||{x:3000,y:2570}),vx:0,vy:0,energy:100});s.message=s.installed?'瞄准辅助已开启。你来驾驶、选目标和开火，模型负责修正偏差。这一轮的新射击只用于独立测试，不会自动加入训练。':'猎脊兽闯进了 K–09 靶场，正在逼近维修站。按住开火，看看子弹偏向哪里；拖动瞄准修正滑块，可以手动把准星调回来。';save(s)}
  function alert(s,e){const b=s.battle;b.alarm=8;e.alert=12;let n=0;for(const other of b.enemies){if(other.hp>0&&distance(e,other)<650){other.alert=12;other.state='chase';if(other.id!==e.id){n++;b.signals.push({from:{x:e.x,y:e.y},to:{x:other.x,y:other.y},t:1.2})}}}return n}
  function fire(s,u,rocks=[]){
    const b=s.battle;if(!s.active||s.phase!=='field'||b.down||b.cooldown>0)return false;
    const e=aim(s,u,rocks);if(!e){s.message='现在没有能打到的目标。向橙色敌人标记靠近，并避开遮挡；最大射程为 750 m。';b.cooldown=.2;return false}
    b.target=e.id;b.cooldown=.55;
    const id=(s.logs.at(-1)?.id||0)+1,f=features(u,e),d=f.distance,correction=s.trim+(s.assist&&s.installed?predict(s.installed,f):0);
    const measured=drift(d,id,f)-correction,angle=Math.atan2(e.y-u.y,e.x-u.x)+measured*rad,dx=Math.cos(angle),dy=Math.sin(angle);
    // Hits use the actual corrected ray. No hit bonus, hidden accuracy multiplier or scripted win.
    let victim=null,travel=range;
    for(const other of b.enemies){if(other.hp<=0)continue;const ox=other.x-u.x,oy=other.y-u.y,along=ox*dx+oy*dy,cross=Math.abs(ox*dy-oy*dx);if(along>0&&along<=travel&&cross<23&&!ExoSandbox.blocked(u,other,rocks)){victim=other;travel=along}}
    const hit=!!victim;
    b.shots++;if(hit)b.hits++;
    // Optical tracer telemetry reports signed angular residual from the commanded aim axis.
    // Required compensation = correction already applied + measured residual. Misses are valid samples.
    const row={id,schema:3,...f,correction,residual:measured,y:correction+measured,lateral:Math.tan(measured*rad)*d,hit,role:s.installed?'test':'train',attempt:s.attempt,assisted:!!(s.assist&&s.installed)};
    s.logs.push(row);if(s.logs.length>240){const i=s.logs.findIndex(p=>p.role==='test');s.logs.splice(i<0?0:i,1)}
    b.beams.push({from:{x:u.x,y:u.y},to:{x:u.x+dx*travel,y:u.y+dy*travel},t:.3,hit});
    s.message=`${hit?'命中':'偏'+(measured>=0?'右':'左')+' '+Math.abs(row.lateral).toFixed(0)+' m'} · #${id} 已记录：${Math.round(d)} m / 磁场 ${f.wind>=0?'+':''}${f.wind.toFixed(2)} / 横移 ${f.lead>=0?'+':''}${f.lead.toFixed(2)} / 高差 ${f.height>=0?'+':''}${f.height.toFixed(2)}。`;
    if(victim){victim.hp=Math.max(0,victim.hp-40*(1-ExoSandbox.profile(victim).armor));b.sparks.push({x:victim.x,y:victim.y,t:.45});if(victim.hp===0){b.kills++;if(victim.main)b.mainKills++;s.message=`${victim.main?'重装猎脊兽':'侦察猎脊兽'}已击败 · 主要敌人 ${b.mainKills}/3。`;if(b.mainKills===3){s.completed=true;s.phase='won';finishAttempt(s,'clear');s.uiPending='complete';s.message='维修附站安全了。再检查近、中、远距离的独立测试是否齐全，然后回维修间找老林。'}}else{const n=alert(s,victim);s.message=`敌人受伤了，正呼叫 ${n} 台附近的同伴！保持移动；需要休整时，按“撤回维修”，射击记录会保留。`}}
    if(!hit&&coverage(s).ready&&!s.installed)s.message+=' 记录已经够了，随时可以撤回维修并训练瞄准辅助。';
    save(s);return true;
  }
  function finishAttempt(s,outcome){if(!s.attempt||s.attempts.some(a=>a.id===s.attempt))return;s.attempts.push({id:s.attempt,shots:s.battle.shots,hits:s.battle.hits,assisted:!!s.installed,outcome});s.attempts=s.attempts.slice(-20)}
  function withdraw(s,u,reason='withdraw'){finishAttempt(s,reason);s.phase='workshop';s.uiPending=null;s.battle.bolts=[];s.battle.hp=100;s.battle.down=0;s.battle.alarm=0;Object.assign(u,{x:base.x,y:base.y,vx:0,vy:0,energy:100});s.message=reason==='defeat'?'机甲已救回并修好。别担心，刚才的射击记录都在。':'回到维修平台了。命中和打偏的射击都已保存，都能用来改进瞄准。';save(s)}
  function tick(s,u,dt){
    if(!s.active||s.phase!=='field'||dt<=0)return;dt=Math.min(.05,dt);const b=s.battle;b.time+=dt;b.cooldown=Math.max(0,b.cooldown-dt);b.invulnerable=Math.max(0,b.invulnerable-dt);b.alarm=Math.max(0,b.alarm-dt);
    for(const key of ['beams','signals','sparks']){for(const p of b[key])p.t-=dt;b[key]=b[key].filter(p=>p.t>0)}
    if(b.down){b.down-=dt;if(b.down<=0){withdraw(s,u,'defeat');s.uiPending='workshop'}return}
    const safe=distance(u,base)<base.r;if(safe)b.hp=Math.min(100,b.hp+22*dt);
    for(const e of b.enemies){if(e.hp<=0)continue;e.attack=Math.max(0,e.attack-dt);e.alert=Math.max(0,e.alert-dt);const d=distance(e,u),chase=!safe&&(e.alert>0||d<190);e.state=chase?'chase':'patrol';
      const ox=e.x,oy=e.y,goal=chase?u:{x:e.hx,y:e.hy},n=distance(e,goal);if(n>(chase?125:3)){const speed=chase?ExoSandbox.profile(e).speed:28,rx=(goal.x-e.x)/n,ry=(goal.y-e.y)/n,orbit=chase&&n<520?.42:0,nx=rx-ry*orbit*e.strafe,ny=ry+rx*orbit*e.strafe,norm=Math.hypot(nx,ny);e.x+=nx/norm*speed*dt;e.y+=ny/norm*speed*dt}if(site){e.x=clamp(e.x,site.bounds.minX+50,site.bounds.maxX-50);e.y=clamp(e.y,site.bounds.minY+160,site.bounds.maxY-90);ExoWorld.collideStructures(e,{x:ox,y:oy});}e.vx=(e.x-ox)/dt;e.vy=(e.y-oy)/dt;
      if(chase&&d<550&&e.attack===0)ExoSandbox.attack(b,e,u)
    }
    for(const p of b.bolts){const previous={x:p.x,y:p.y};p.x+=p.vx*dt;p.y+=p.vy*dt;p.ttl-=dt;if(site&&ExoSandbox.blocked(previous,p,[])){p.ttl=0;continue;}if(distance(p,u)<26){p.ttl=0;if(!safe&&b.invulnerable===0){b.hp=Math.max(0,b.hp-p.damage);b.invulnerable=.3}}}
    b.bolts=b.bolts.filter(p=>p.ttl>0);if(b.hp<=0){b.down=2;s.message='机甲撑不住了，正在自动救回。射击记录已经保存。';u.vx=u.vy=0}
    if(b.hp>0&&b.hp<35)s.message='装甲快撑不住了！保持移动，或点“撤回维修”。记录会保留，不必硬撑。';
    b.target=aim(s,u)?.id??null;
  }
  function train(s,n=1){if(!coverage(s).fitReady)return false;const rows=samples(s),keys=['w','windW','leadW','heightW','b'];if(!s.history.length)s.history.push(loss(s));for(let i=0;i<n;i++){const grad={w:0,windW:0,leadW:0,heightW:0,b:0};for(const p of rows){const e=predict(s,p)-p.y,k=2*e/rows.length;grad.w+=k*p.x;grad.windW+=k*p.wind;grad.leadW+=k*p.lead;grad.heightW+=k*p.height;grad.b+=k}for(const key of keys)s[key]-=.1*grad[key];s.steps++;if(i%10===0)s.history.push(loss(s))}s.fitIds=rows.map(p=>p.id);s.history=s.history.slice(-80);save(s);return true}
  function set(s,k,v){const limits={w:[-20,24],windW:[-12,12],leadW:[-12,12],heightW:[-12,12],b:[-12,12]};if(!limits[k]||!Number.isFinite(v))return;s[k]=clamp(v,...limits[k]);s.fitIds=samples(s).map(p=>p.id);save(s)}
  function canInstall(s){return coverage(s).ready&&loss(s)<1}
  function install(s){if(!canInstall(s))return false;s.installed={w:s.w,windW:s.windW,leadW:s.leadW,heightW:s.heightW,b:s.b,ids:samples(s).map(p=>p.id)};s.assist=true;save(s);return true}
  function importTests(s){for(const p of s.logs)p.role='train';s.installed=null;s.assist=false;s.fitIds=[];s.history=[];save(s)}
  function metrics(s){const raw=s.logs.filter(p=>!p.assisted),assisted=s.logs.filter(p=>p.assisted),rate=rows=>rows.length?Math.round(rows.filter(p=>p.hit).length/rows.length*100):null;const tests=s.logs.filter(p=>p.role==='test'&&p.assisted);return {raw:rate(raw),assisted:rate(assisted),rawN:raw.length,assistedN:assisted.length,testN:tests.length,testError:tests.length?tests.reduce((a,p)=>a+Math.abs(p.residual),0)/tests.length:null}}
  function save(s){try{localStorage.setItem('exo-fire-control-v1',JSON.stringify({curriculum:3,logs:s.logs,w:s.w,windW:s.windW,leadW:s.leadW,heightW:s.heightW,b:s.b,steps:s.steps,installed:s.installed,attempt:s.attempt,attempts:s.attempts,completed:s.completed}))}catch{}}
  function restore(){const s=fresh();try{const v=JSON.parse(localStorage.getItem('exo-fire-control-v1'));if(!v)return s;s.attempt=Number.isInteger(v.attempt)&&v.attempt>=0?v.attempt:0;s.attempts=Array.isArray(v.attempts)?v.attempts.filter(a=>Number.isInteger(a.id)&&Number.isFinite(a.shots)&&Number.isFinite(a.hits)).slice(-20):[];s.completed=v.completed===true;if(v.curriculum!==3){s.message='瞄准训练已升级为多变量模型，会同时考虑距离、磁场、目标横移和高低差。旧记录只有距离，无法用于新模型；请重新试射，收集完整记录。';return s}if(Array.isArray(v.logs))s.logs=v.logs.filter(p=>p.schema===3&&Number.isInteger(p.id)&&p.id>0&&Number.isFinite(p.distance)&&p.distance>=0&&p.distance<=range&&['x','wind','lead','height','correction','residual','y','lateral'].every(k=>Number.isFinite(p[k]))&&['train','test'].includes(p.role)).slice(-240);for(const k of ['w','windW','leadW','heightW','b'])if(Number.isFinite(v[k]))s[k]=clamp(v[k],k==='w'?-20:-12,k==='w'?24:12);s.steps=Number.isInteger(v.steps)&&v.steps>=0?v.steps:0;if(v.installed&&['w','windW','leadW','heightW','b'].every(k=>Number.isFinite(v.installed[k]))&&Array.isArray(v.installed.ids)){s.installed={...v.installed,ids:v.installed.ids.filter(Number.isInteger)};s.assist=true}}catch{}return s}
  function brief(s){return `<div class="fc-panel"><div class="fc-eyebrow">第 7 集 · 老林的瞄准训练</div><h2>让每一发打得更准</h2><figure class="fc-threat"><img src="assets/visual-v13/stalker-valley.webp" alt="琥珀色核心、分层装甲与四足关节的机械猎脊兽"><figcaption>留意两件事：猎脊兽会侧移包抄，不同位置的磁场也会影响瞄准。</figcaption></figure><p>迫降震偏了炮口，磁场、敌人的横向移动和地形高差又让子弹更难打准。多换几个位置试射，机甲才能学会在不同情况下修正瞄准。</p><p><b>任务：</b>走近、退远，换几个位置，并试着打正在横向移动的敌人。每次开火都会自动记录距离、磁场、目标移动和高低差。</p><div class="fc-brief-grid"><div><b>01 / 换几个距离</b><p>近、中、远距离各射击至少 2 次，总共至少 8 次。最远和最近的记录需相差 400 m。</p></div><div><b>02 / 试试移动目标</b><p>移动到不同磁场区域，等敌人侧移时再开火。至少记录 2 次对移动目标的射击。</p></div><div><b>03 / 回工位校准</b><p>用射击记录训练模型，让它一起考虑距离、磁场、目标移动和高低差，算出该修正多少。</p></div></div><button class="primary" onclick="closeModal();Exo.courseDeploy()">${s.logs.length?'继续射击，补充记录':'出发，记录射击'} →</button>${s.logs.length?'<button onclick="Exo.courseWorkshop()">打开瞄准设置</button>':''}<p class="fc-footnote">需要休整时可返回北侧工位。手机：左摇杆移动，右侧按钮开火。电脑：WASD 移动，F 开火，T 换目标，Q / R 手动修正。敌人靠近或受伤后会侧移包抄，记得保持移动。</p></div>`}
  function panel(s){const c=coverage(s),m=metrics(s),params=[['w','距离影响 w₁',-20,24],['windW','磁场影响 w₂',-12,12],['leadW','移动提前量 w₃',-12,12],['heightW','高低差补偿 w₄',-12,12],['b','炮口基础偏差 b',-12,12]];return `<div class="fc-panel"><div class="fc-eyebrow">维修工位 · 瞄准设置</div><h2>用射击记录，修正瞄准偏差。</h2><p>${s.message}</p><div class="fc-data-strip"><div><strong>${c.count}</strong><span>射击记录</span></div><div><strong>${Math.round(c.span)} m</strong><span>最大射击距离差</span></div><div><strong>${c.moving}</strong><span>移动目标记录</span></div></div><div class="fc-distance-bands">${[['near','近距 80–220 m'],['mid','中距 >220–450 m'],['far','远距 >450–750 m']].map(([key,label])=>`<div class="${c[key]>=2?'ready':''}"><b>${c[key]} / 2</b><small>${label}</small></div>`).join('')}</div><div class="fc-condition-bands"><div class="${c.windSpan>=.3?'ready':''}"><b>${c.windSpan.toFixed(2)}</b><small>磁场变化 ≥ 0.30</small></div><div class="${c.moving>=2&&c.leadSpan>=.12?'ready':''}"><b>${c.moving} 发</b><small>移动目标至少 2 发</small></div><div><b>${c.heightSpan.toFixed(2)}</b><small>高低差变化 · 供模型参考</small></div></div><p class="fc-quality">${c.ready?'需要的记录已经齐了。点击“自动校准”，让模型根据这些记录调整瞄准。':'需要至少 8 发：近、中、远各 2 发，距离跨度至少 400 m；换几个磁场区域，并记录至少 2 发移动目标。高低差也会记录，但没有最低要求。'} ${c.fitReady?'现在可以先试着校准；补齐不同情况下的记录后，才能安装辅助。':'先记录至少 5 发，且最远与最近距离相差至少 35 m，就能开始校准。'}</p><canvas id="fc-chart" width="620" height="280" aria-label="瞄准模型图。横轴是距离，纵轴是所需修正角度。青线表示磁场、横移和高差都为零时的预测；橙点与短线之间表示每次射击的预测误差。"></canvas><p class="fc-chart-note">橙点是实测所需的修正角度，短线越短，预测越准。青线只表示磁场、横移和高差都为 0 的情况，所以不必穿过每个橙点。</p><div class="fc-fit-controls multi">${params.map(([key,label,min,max])=>`<label>${label} <output id="fc-${key}-value">${s[key].toFixed(2)}${key==='b'?'°':''}</output><input id="fc-${key}" type="range" min="${min}" max="${max}" step=".1" value="${s[key]}" oninput="Exo.courseSet('${key}',+this.value)"></label>`).join('')}</div><div id="fc-fit-status" role="status"></div><div class="fc-buttons"><button onclick="Exo.courseTrain(1)" ${c.fitReady?'':'disabled'}>校准一次</button><button onclick="Exo.courseTrain(1200)" ${c.fitReady?'':'disabled'}>自动校准 · 1200 步</button><button id="fc-install" class="primary" onclick="Exo.courseInstall()">安装瞄准辅助并出发 →</button><button onclick="closeModal();Exo.courseDeploy()">继续射击，补充记录</button></div><div id="fc-panel-status" role="status"></div><details><summary>每次射击都记录了什么？</summary><p>传感器记录四项输入，也叫特征：<b>[归一化距离、局部磁场、目标横移、高低差]</b>。再测量修正之后还偏了多少。已修正的角度加上剩余偏差，就是这次射击实际需要的修正量。</p><div class="fc-table"><table><thead><tr><th>射击</th><th>距离</th><th>磁场</th><th>横移</th><th>高差</th><th>所需修正</th><th>结果</th></tr></thead><tbody>${s.logs.slice(-10).map(p=>`<tr><td>#${p.id}${p.role==='test'?' · 测试':''}</td><td>${Math.round(p.distance)}m</td><td>${p.wind>=0?'+':''}${p.wind.toFixed(2)}</td><td>${p.lead>=0?'+':''}${p.lead.toFixed(2)}</td><td>${p.height>=0?'+':''}${p.height.toFixed(2)}</td><td>${p.y.toFixed(1)}°</td><td>${p.hit?'命中':'打偏'}</td></tr>`).join('')}</tbody></table></div><p>模型要靠这些记录分辨各种因素的影响。如果始终站在同一个位置打静止目标，就很难判断偏差究竟来自距离、磁场还是目标移动。</p></details><details><summary>想了解背后的 AI 原理？</summary><p>四项读数是特征，五个滑块控制模型参数。模型把各项特征乘以对应参数，再加上基础偏差，得到修正角度，这叫多变量线性回归。MSE 是预测误差平方的平均值，越小越好；自动校准使用梯度下降来降低它。</p><p>这种模型用于航天器多传感器标定、工业机器人误差补偿、能耗预测和风险评分。现实系统会有更多特征和非线性关系；这一关保留线性结构，让你能看见每个变量如何改变决策。</p></details>${m.testN?`<div class="fc-test-report">独立测试 ${m.testN} 发 · 平均瞄准偏差 ${m.testError.toFixed(2)}°。近距合格记录 ${validation(s).near} 发 · 中距 ${validation(s).mid} 发 · 远距 ${validation(s).far} 发（偏差 &lt; 2°）。这些新记录没有用于当前模型的训练。加入训练后，需要重新出击测试。<button onclick="Exo.courseImport()">加入训练，重新校准</button></div>`:''}<button onclick="closeModal();Exo.courseExit()">返回自由探索 · 保留记录</button></div>`}
  function chart(s){
    const el=document.getElementById('fc-chart');if(!el)return;
    const g=el.getContext('2d'),left=48,bottom=236,x=d=>left+d/range*540,y=v=>bottom-(v+12)/44*210;
    g.fillStyle='#0c1923';g.fillRect(0,0,620,280);g.font='11px system-ui';g.textAlign='left';
    const coverageNow=coverage(s);
    for(const [a,b,key] of [[80,220,'near'],[220,450,'mid'],[450,750,'far']]){g.fillStyle=coverageNow[key]>=2?'#214a3c88':'#53331f44';g.fillRect(x(a),24,x(b)-x(a),212)}
    for(const v of [-10,0,10,20,30]){g.strokeStyle='#2b4350';g.beginPath();g.moveTo(left,y(v));g.lineTo(596,y(v));g.stroke();g.fillStyle='#a7bec8';g.fillText(v+'°',8,y(v)+4)}
    for(let i=0;i<=5;i++)g.fillText(i*150+'',x(i*150)-8,255);
    g.fillText('所需修正角度',48,17);g.fillText('射击距离 m',515,273);g.save();g.beginPath();g.rect(left,24,548,212);g.clip();g.strokeStyle='#83e3e8';g.lineWidth=2;g.beginPath();g.moveTo(x(0),y(s.b));g.lineTo(x(range),y(s.w*range/500+s.b));g.stroke();
    for(const p of samples(s)){g.strokeStyle='#db9d6b66';g.lineWidth=1;g.beginPath();g.moveTo(x(p.distance),y(p.y));g.lineTo(x(p.distance),y(predict(s,p)));g.stroke();g.fillStyle=Math.abs(p.lead)>.08?'#ffe39a':'#f4a87f';g.beginPath();g.arc(x(p.distance),y(p.y),Math.abs(p.lead)>.08?5:4,0,7);g.fill()}
    g.restore();
    const l=loss(s),ready=canInstall(s),status=document.getElementById('fc-fit-status');
    if(status)status.textContent=`MSE ${l===null?'—':l.toFixed(3)} deg² · 已更新 ${s.steps} 次 · ${ready?'误差已达标，可以安装瞄准辅助了。':'安装前需补齐 8 发多种情况的记录，并将 MSE 降到 1 以下。'}`;
    for(const k of ['w','windW','leadW','heightW','b']){const label=document.getElementById('fc-'+k+'-value'),input=document.getElementById('fc-'+k);if(label)label.textContent=s[k].toFixed(2)+(k==='b'?'°':'');if(input)input.value=s[k]}
    const button=document.getElementById('fc-install');if(button){button.disabled=false;button.dataset.ready=ready?'true':'false';button.setAttribute?.('aria-disabled',String(!ready));button.textContent=ready?'安装瞄准辅助并出发 →':'看看还差什么 →'}
  }
  function report(s){const m=metrics(s);return `<div class="fc-panel"><div class="fc-eyebrow">第 8 集 · 守住 K–09</div><h2>守住了！再看看瞄准进步了多少。</h2><p>${s.installed?'你记录的每次射击，帮助模型修正了瞄准偏差。走位、选目标和开火，仍然由你决定。':'你靠手动修正突破了封锁。现在可以用这些射击记录训练模型，让机甲也学会修正瞄准。'}</p><div class="fc-data-strip"><div><strong>${m.raw===null?'—':m.raw+'%'}</strong><span>辅助关闭 · ${m.rawN} 发</span></div><div><strong>${m.assisted===null?'—':m.assisted+'%'}</strong><span>辅助开启 · ${m.assistedN} 发</span></div><div><strong>${m.testError===null?'—':m.testError.toFixed(2)+'°'}</strong><span>新射击平均瞄准偏差</span></div></div><p>这里的命中率来自你实际打出的每一发。两轮的距离和走位可能不同，不能只比较命中率；平均瞄准偏差更能反映模型调准了多少。</p><p class="fc-tip">独立测试合格记录：近 ${validation(s).near} / 中 ${validation(s).mid} / 远 ${validation(s).far}。近、中、远距离各需至少 1 发使用辅助、偏差小于 2° 的新记录，才能完成这段主线。这些记录不参与训练；缺哪个距离，下轮就补哪个。</p><button class="primary" onclick="Exo.returnToStory()">回去找老林 · 继续主线 →</button><button onclick="Exo.courseWorkshop()">查看射击记录与模型</button><button onclick="closeModal();Exo.courseDeploy()">再打一轮</button></div>`}
  function overlay(g,s,u,c,w,h,project){
    if(!s.active)return;
    const b=s.battle,ground=ExoWorld.elevation(c.x,c.y),p=(x,y,z=45)=>project(x,y,ExoWorld.elevation(x,y)+z-ground,c,w,h);
    g.save();g.textAlign='center';g.font='11px system-ui';
    const target=b.enemies.find(e=>e.id===b.target&&e.hp>0);
    if(target){const q=p(target.x,target.y,70);if(q.d>65&&q.d<1900&&q.x>0&&q.x<w&&q.y>65&&q.y<h-60){const r=Math.min(25,Math.max(12,20*q.s));g.strokeStyle=target.alert>0?'#dcaa87':'#c4d9bd';g.lineWidth=1;g.globalAlpha=.8;for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.beginPath();g.moveTo(q.x+x*r,q.y+y*(r-6));g.lineTo(q.x+x*r,q.y+y*r);g.lineTo(q.x+x*(r-6),q.y+y*r);g.stroke();}g.globalAlpha=1;}}
    for(const beam of b.beams){const a=p(beam.from.x,beam.from.y,62),z=p(beam.to.x,beam.to.y,40);g.strokeStyle=beam.hit?'#b8e7ce':'#ddb08d';g.lineWidth=1.5+beam.t*4;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(z.x,z.y);g.stroke();g.beginPath();g.arc(z.x,z.y,5,0,7);g.stroke();}
    for(const v of b.signals){const a=p(v.from.x,v.from.y,60),z=p(v.to.x,v.to.y,60),t=1-v.t/1.2;g.setLineDash([3,9]);g.strokeStyle='#cf90663d';g.lineWidth=1;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(z.x,z.y);g.stroke();g.setLineDash([]);g.fillStyle='#deb790';g.beginPath();g.arc(a.x+(z.x-a.x)*t,a.y+(z.y-a.y)*t,3,0,7);g.fill();}
    const q=p(base.x,base.y,8),d=Math.hypot(base.x-u.x,base.y-u.y);
    if(d<500&&q.d>30&&q.x>20&&q.x<w-20&&q.y>80&&q.y<h-80){g.strokeStyle='#a9c9b566';g.lineWidth=1;g.beginPath();g.ellipse(q.x,q.y,base.r*q.s,base.r*q.s*.32,0,0,7);g.stroke();if(d<180){g.fillStyle='#b7ccbb';g.strokeStyle='#0a161be6';g.lineWidth=3;g.strokeText('安全维修区',q.x,q.y+16);g.fillText('安全维修区',q.x,q.y+16);}}
    if(b.invulnerable>0&&b.invulnerable<.31){g.fillStyle='#ff725c16';g.fillRect(0,0,w,h);}
    g.restore();
  }
  return {base,range,band,field,features,predict,coverageText,validation,fresh,battle,samples,coverage,loss,drift,available,aim,cycle,deploy,fire,tick,withdraw,train,set,canInstall,install,importTests,metrics,save,restore,brief,panel,chart,report,overlay};
})();
if(typeof module!=='undefined')module.exports=ExoFireControl;
