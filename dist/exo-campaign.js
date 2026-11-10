/* The playable opening of 回声之下. The 40-episode outline is a roadmap,
   not forty invented playable missions. Lesson storage remains independent. */
const ExoCampaign = (() => {
  const KEY = 'exo-campaign-v1';
  const episodes = [
    ['坠落后的呼吸','舰队失联。陆寻独自从峡谷中的驾驶舱醒来。岩壁后有一束青光，AEGIS 却无法确认是谁留下的。','story'],
    ['地图说这里能走','旧地图还把损坏的道路标为安全。到警戒灯旁查看路况，再从安全的一侧绕过去。','field'],
    ['灯为什么还亮着','沿着青色灯光走进峡谷，扫描三处维护记录，看看灾后是谁回来修好了这些灯。','field'],
    ['没有寄出的二十七秒','母亲林遥说过三年就回来。十五年后，陆寻带着没能说出口的话来到这里。','story'],
    ['最后一次舰队呼叫','沈砚从外侧锁上逃生舱：如果下面还有人，把他们带回有光的地方。','story'],
    ['来的人不是救援队','抵达 K–09 维修间。老林需要一台能守住接驳口的机甲，陆寻则需要先修好瞄准系统。','field'],
    ['第七发为什么偏了','到维修间东南侧的接驳路，在不同距离和情况下试射。用自己的记录训练瞄准模型，再装进 EV–04。','field'],
    ['第一次用训练救人','守住维修附站，击败三台封锁道路的敌人。用安装后的新射击测试瞄准效果，这些记录不参与训练。','field'],
    ['稳定架的代价','带着测试结果回到维修间，安装老林修好的稳定架。之后探索时，机甲恢复能量会更快。','field'],
    ['袖口上的名字','进入地下栖息站，认识一百二十六名幸存者与阿禾。','planned'],
    ['温室的红色警报','温室频繁误报，影响了大家的生计。用未参与训练的新数据测试识别模型，查清它是否可靠。','planned'],
    ['父亲留下的录音','阿禾交出梁述的记录仪，矿区调查开始。','planned'],
    ['九秒之后少一拍','重看被归为普通共振的异常，追查数据怎样被忽略。','planned'],
    ['它不是来杀人的','观察机械生命维护设备的行为，区分维修者与攻击者。','planned'],
    ['山站起来了','利维坦改变可通行路线，玩家必须观察并绕行。','planned'],
    ['别打会发光的地方','掠翼袭击运输车队；识别目标，保护车队与供能设施。','planned'],
    ['六个人与八只滤筒','救下的人与有限的滤筒，让资源问题变成具体的选择。','planned'],
    ['第四分钟敲门声','老林讲述阿禾当年的逃生，过去与眼前的救援交汇。','planned'],
    ['先修风机还是先找母亲','在公共供给与私人追寻之间分配时间和能源。','planned'],
    ['封门签名','确认林遥参与关闭东支井，留下完整证据。','planned'],
    ['没有走过的出口','阿禾在废弃梯井遇险；重新核验旧的撤离路线。','planned'],
    ['一艘船还活着','回栖号的六名船员传来讯息：他们还活着，等待轨道上的接应。','planned'],
    ['你听到的不是他','面对 AI 补全的声音，及时停止错误操作可以保护相位桥。','planned'],
    ['两个没有闭合的圆','进入古老文明的保存设施，辨认维护接口。','planned'],
    ['谁在保护谁','发现防御系统保护的对象，重新理解守卫的行动。','planned'],
    ['母亲留下的反对意见','林遥的错误与坚持都进入调查记录。','planned'],
    ['床位号','在旧休眠设施确认母亲已经去世。','planned'],
    ['三个地球年，十五年的误差','观看母亲留下的最后录像，继续寻找仍然活着的人。','planned'],
    ['八十三个活人','重新联系深井避难室，确认八十三名幸存者。','planned'],
    ['最快的路线不带伤员','调整机甲的移动路线，把身后的伤员拖架也考虑进去，再到现场试走。','planned'],
    ['不能把保存舱一起打碎','越过第六信标前的重装守门者，同时保护保存舱。','planned'],
    ['十七分钟的窗口','分配好能源，在有限的时间里安排攻击和检修。','planned'],
    ['第六座信标','协同使用已验证的 AI 能力，完成六座信标同步。','planned'],
    ['两张不能相加的名单','地下撤离和轨道接应都需要资源。两边都有人在等，你必须做出取舍。','planned'],
    ['先开地下','选择先支援哪一方；此前准备影响还能保留多少方案。','planned'],
    ['第三道门','逐道打开隔离门，执行地下撤离。','planned'],
    ['一台机甲做成的桥','控制负载，让 EV–04 成为伤员的临时桥梁。','planned'],
    ['第三次回复没有来','继续搜寻失联者，承担救援留下的后果。','planned'],
    ['不能被删掉的名字','公开事故与救援的完整历史，保留不同人的声音。','planned'],
    ['灯亮以后','修复机甲再出发，探索与学习仍将继续。','planned']
  ].map(([title,description,kind],i)=>Object.freeze({episode:i+1,title,description,kind}));
  const beats = ['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'];
  const lampIds = ['trail:k09:1','trail:k09:2','trail:k09:3'];
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const defaultPoints = {
    spawn:{x:3708,y:7500}, route:[],
    lamps:[{x:3619.8,y:5949.34},{x:3834,y:5760.34},{x:3690,y:5616.34}],
    refuge:{x:4284,y:6406,radius:125}, range:{x:3780,y:7480,radius:140}
  };
  function create({storage,points={},fireAPI}={}) {
    if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
    if(fireAPI===undefined&&typeof ExoFireControl!=='undefined')fireAPI=ExoFireControl;
    let places={...defaultPoints,...points}, done=[], routeIndex=0, scanned=[], started=false, stabilizer=false;
    let storageOK=!!storage, revision=0, lastUnit=null, lastInsideRefuge=false, refugeReached=false, lastMessage='', lastDrawn='', savedCheckpoint=null, evidence={samples:0,test:0,bands:0,kills:0};
    const validCheckpoint=p=>finitePoint(p)&&p.x>=0&&p.x<=20000&&p.y>=0&&p.y<=13330&&Number.isFinite(p.angle);
    try {
      const saved=JSON.parse(storage?.getItem(KEY)||'null');
      if(saved?.version===1) {
        const ids=Array.isArray(saved.done)?saved.done:[];
        for(const id of beats){if(!ids.includes(id))break;done.push(id);}
        started=saved.started===true||done.length>0;
        routeIndex=Number.isInteger(saved.routeIndex)&&saved.routeIndex>=0?saved.routeIndex:0;
        scanned=lampIds.filter(id=>Array.isArray(saved.scanned)&&saved.scanned.includes(id));
        refugeReached=saved.refugeReached===true&&done.length>=5;
        stabilizer=done.includes('stabilizer');
        if(started&&validCheckpoint(saved.checkpoint))savedCheckpoint={x:saved.checkpoint.x,y:saved.checkpoint.y,angle:saved.checkpoint.angle};
      }
    } catch {storageOK=false;}
    const current = () => beats[done.length]||null;
    const grounded = () => finitePoint(lastUnit)&&!lastUnit.flight;
    const at = p => grounded()&&finitePoint(p)&&distance(lastUnit,p)<=(p.radius||110);
    const atRefuge = () => lastInsideRefuge||at(places.refuge);
    function save(){try{storage?.setItem(KEY,JSON.stringify({version:1,started,done,routeIndex,scanned,refugeReached,checkpoint:savedCheckpoint}));storageOK=!!storage;}catch{storageOK=false;}}
    function change(){revision++;save();}
    function advance(id){if(current()!==id)return false;done.push(id);lastMessage=episodes[done.length-1].title+' · 已记录';change();return true;}
    function start(){if(started)return false;started=true;change();return true;}
    function checkpoint(point){if(!started||!validCheckpoint(point)||point.flight)return false;savedCheckpoint={x:point.x,y:point.y,angle:Math.atan2(Math.sin(point.angle),Math.cos(point.angle))};save();return true;}
    function configure(config={}){places={...places,...(config.points||config)};if(current()==='route')routeIndex=Math.min(routeIndex,Math.max(0,places.route.length-1));revision++;return objective();}
    function telemetry(fire){
      if(!fire)return {model:false,defense:false,samples:0,test:0,bands:0,kills:0};
      const logs=Array.isArray(fire.logs)?fire.logs:[], train=logs.filter(p=>p.role==='train');
      const installed=fire.installed, ids=new Set(installed?.ids||[]);
      const usable=logs.filter(p=>p.role==='test'&&p.assisted&&!ids.has(p.id)&&Number.isFinite(p.residual)&&Math.abs(p.residual)<2);
      const bands=new Set(usable.map(p=>p.distance<80?'close':p.distance<=220?'near':p.distance<=450?'mid':p.distance<=750?'far':'outside').filter(b=>['near','mid','far'].includes(b)));
      const finiteModel=installed&&['w','windW','leadW','heightW','b'].every(k=>Number.isFinite(installed[k]));
      const fitted=finiteModel&&ids.size>=8&&train.filter(p=>ids.has(p.id)).length>=8;
      // Use the lesson's own coverage and loss checks when present, so campaign
      // evidence follows the installed model rather than uninstalled slider edits.
      const model=!!(fitted&&(!fireAPI||(fireAPI.coverage(fire).ready&&fireAPI.loss(fire,installed)<1)));
      const defense=!!(model&&fire.completed&&usable.length>=3&&bands.size===3);
      return {model,defense,samples:train.length,test:usable.length,bands:bands.size,kills:fire.battle?.mainKills||0};
    }
    function observe({unit,fireCourse,earned=[],enabled=true,interior=null,cave=null,insideRefuge=false,battle=null}={}) {
      if(!enabled||battle?.down){lastUnit=null;lastInsideRefuge=false;return false;}
      lastInsideRefuge=!!insideRefuge;
      lastUnit=finitePoint(unit)?{x:unit.x,y:unit.y,flight:!!unit.flight}:null;
      if(interior||cave){if(!insideRefuge)lastUnit=null;}
      evidence=telemetry(fireCourse);
      if(!started)return false;
      const before=revision, id=current();
      if(id==='route'&&grounded()&&places.route.length) {
        routeIndex=Math.min(routeIndex,places.route.length-1);
        const target=places.route[routeIndex];
        if(target&&at(target)){routeIndex++;change();if(routeIndex===places.route.length)advance('route');}
      } else if(id==='lamps') {
        const has=value=>earned instanceof Set?earned.has(value):Array.isArray(earned)&&earned.includes(value);
        const found=lampIds.filter(has);
        if(found.length!==scanned.length){scanned=found;change();}
        if(scanned.length===3)advance('lamps');
      } else if(id==='refuge'&&atRefuge()) {
        if(!refugeReached){refugeReached=true;change();}
      } else if(id==='model'&&evidence.model)advance('model');
      else if(id==='defense'&&evidence.defense)advance('defense');
      return revision!==before;
    }
    function award(event) {
      const id=current();
      if(event==='crash-read'&&id==='crash'){start();return advance(id);}
      if(event==='mother-memory'&&id==='mother'&&(!places.mother||at(places.mother)))return advance(id);
      if(event==='captain-memory'&&id==='captain'&&(!places.captain||at(places.captain)))return advance(id);
      if(event==='refuge-briefed'&&id==='refuge'&&refugeReached&&atRefuge())return advance(id);
      if(event==='stabilizer-installed'&&id==='stabilizer'&&atRefuge()){stabilizer=true;return advance(id);}
      return false;
    }
    function objective(){
      const index=Math.min(done.length,8), id=current(), episode=episodes[index];
      let point=null,action='navigate',label='标记下一步位置',instruction='',event=null;
      if(id==='crash'){action='acknowledge';event='crash-read';label='接管 EV–04';instruction='点击“接管 EV–04”，先检查驾驶舱。舰队失联了，AEGIS 暂时也找不到可靠信号；我们得自己寻找线索。';}
      if(id==='route'){point=places.route[routeIndex]||places.spawn;instruction=(places.route[routeIndex]?.instruction||(['先到警戒灯旁看看断路。旧地图不一定可靠，要亲眼确认哪里能走。','沿青色灯带从安全的一侧绕过去。留在地面驾驶，逐段查看路况。'][Math.min(routeIndex,1)]))+' · 路段 '+Math.min(routeIndex+1,places.route.length)+'/'+places.route.length;}
      if(id==='lamps'){const next=lampIds.findIndex(v=>!scanned.includes(v));point=places.lamps[next];instruction='沿青灯林道逐处查看遗物，靠近后按 E。琥珀色灯的小路会绕回主路。已找到 '+scanned.length+'/3。';}
      if(id==='mother'){action='acknowledge';event='mother-memory';label='停下查看合影';point=places.mother||null;if(point&&!at(point)){action='navigate';label='沿步道寻找休息点';}instruction='“三年。”母亲林遥临行时这样说。陆寻七岁时记住的承诺，已经过去十五年。'+(point&&!at(point)?' 到林道前方的休息点停一停，陆寻想看看驾驶舱侧袋里的旧合影。':'');}
      if(id==='captain'){action='acknowledge';event='captain-memory';label='听完残留录音';point=places.captain||null;if(point&&!at(point)){action='navigate';label='走到撤离通话点';}instruction='沈砚从外面锁死舱盖：“如果下面还有人，把他们带回有光的地方。”七个频道仍没有回应。'+(point&&!at(point)?' 继续沿步道，去看看倒在路边的通话器。':'');}
      if(id==='refuge'){point=places.refuge;instruction='沿撤离步道绕到高灯下，从机库南面接驳口找到老林。';if(refugeReached&&atRefuge()){action='acknowledge';event='refuge-briefed';label='和老林交谈';instruction='老林：“东侧接驳坪的电接好了，可那些家伙也快到了。先去试几枪，远近都试试。把记录带回来，我们一起把瞄准调准。”';}}
      if(id==='model'){point=places.range;action='fire';label='沿维护路去试射';instruction='到维修间东南侧的接驳坪，记录至少 8 次射击，包含近、中、远距离和移动目标。回来训练模型，再安装瞄准辅助。已有记录 '+evidence.samples+' 发。';}
      if(id==='defense'){point=places.range;action='fire';label='继续保卫维修站';instruction='开启瞄准辅助，击败三台主要敌人。近、中、远距离各需一发偏差小于 2° 的新射击，用来独立测试。已完成距离 '+evidence.bands+'/3。';}
      if(id==='stabilizer'){point=places.refuge;instruction='返回 K–09 维修间，安装老林修复的稳定架。安装后，能量恢复速度提高 10%。';if(atRefuge()){action='acknowledge';event='stabilizer-installed';label='安装稳定架 · 恢复动力';}}
      if(!id){action='explore';label='查看南行探路记录';instruction='归路打通了，机甲也重新站稳了。旧地图在断路处失过准，南侧河谷的路况同样需要亲眼核对。带上探测车，沿维护路继续勘察河岸、山脊与洞穴；这是自由探索，后续主线仍在制作中。';}
      return {id:id||'complete',index,episode:episode.episode,title:id?episode.title:'第一幕完成 · 灯仍亮着',instruction,action,label,event,point:point?{...point}:null,...(point?{x:point.x,y:point.y,radius:point.radius||110}:{}),finished:!id,done:done.length,total:beats.length};
    }
    function button(o){
      return o.action==='acknowledge'?'<button class="primary campaign-primary" onclick="Exo.campaignAcknowledge(\''+o.event+'\')">'+escape(o.label)+' <span aria-hidden="true">→</span></button>':'<button class="primary campaign-primary" onclick="Exo.trackCampaign()">'+escape(o.label)+' <span aria-hidden="true">→</span></button>';
    }
    function panel(){
      const o=objective();
      return '<div class="campaign-panel"><section class="campaign-hero"><div class="campaign-kicker">ECHO–9 / 回声之下</div><div class="campaign-heading"><div><h2>先找到一条归路。</h2><p>跟着青灯找到老林，修好机甲，去寻找仍在等待救援的人。</p></div><div class="campaign-progress"><strong>'+done.length+'<small> / 9</small></strong><span>第一幕进度</span></div></div><div class="campaign-meter" role="progressbar" aria-label="第一幕进度" aria-valuemin="0" aria-valuemax="9" aria-valuenow="'+done.length+'"><i style="width:'+done.length/9*100+'%"></i></div></section><section class="campaign-active"><div class="campaign-step-number">'+(o.finished?'✓':String(o.episode).padStart(2,'0'))+'</div><div><span class="campaign-kicker">'+(o.finished?'K–09 · 第一幕完成':'当前任务 · 第 '+String(o.episode).padStart(2,'0')+' 集')+'</span><h3>'+escape(o.title)+'</h3><p>'+escape(o.instruction)+'</p>'+button(o)+'</div></section><div class="campaign-route-caption"><span>坠落点</span><i>→</i><span>损坏道路</span><i>→</i><span>青灯归路</span><i>→</i><span>K–09 维修间</span><i>→</i><span>修复与守卫</span><i>→</i><span>南行探路</span></div><ol class="campaign-beats">'+episodes.slice(0,9).map((e,i)=>'<li class="'+(i<done.length?'is-complete':i===done.length?'is-current':'is-waiting')+'"><span class="campaign-beat-index">'+(i<done.length?'✓':String(e.episode).padStart(2,'0'))+'</span><div><div class="campaign-beat-title"><h4>'+escape(e.title)+'</h4><small>'+ (e.kind==='story'?'剧情记录':'现场任务')+'</small></div><p>'+escape(e.description)+'</p></div></li>').join('')+'</ol><section class="campaign-side"><div><span class="campaign-kicker">维修间以南 · 可随时探索</span><h3>旧地图以外的路</h3><p>旧地图留下的是灾前的道路。如今的裂隙、河水与松动岩层，都需要重新查看。维修间外的青灯继续向南，经过河岸、断崖与旧勘测洞。把探测车带上，留在稳固路面记录它的试走结果，再判断下一段路；这条路将由你亲自核对。</p></div><button onclick="Exo.visitTraining(\'terrain\')">查看原野勘测路线 ↗</button></section><details class="campaign-roadmap"><summary><span>40 集故事路线</span><small>前 9 集可以游玩 · 后 31 集为制作规划</small></summary><p class="campaign-note">这里保留了 40 集故事的顺序和标题。灰色章节还在规划中，暂时不能游玩。完成第一幕后，你仍然可以探索九境或沿途收集与核对观察记录。</p><ol start="10">'+episodes.slice(9).map(e=>'<li><span>'+String(e.episode).padStart(2,'0')+'</span><div><h4>'+escape(e.title)+'</h4><p>'+escape(e.description)+'</p></div><small>制作规划</small></li>').join('')+'</ol></details><p class="campaign-save">'+(storageOK?'进度会自动保存在当前浏览器。收起工具、重试或重读记录，都不会丢失已完成的任务。':'这个浏览器暂时无法保存进度。你可以继续玩，但关闭页面后可能需要重新开始。')+'</p></div>';
    }
    function hud(){return '<button class="campaign-hud" id="campaign-hud" onclick="Exo.campaign()" aria-label="打开当前剧情目标"><span id="campaign-hud-episode"></span><strong id="campaign-hud-title"></strong><small id="campaign-hud-detail"></small></button>';}
    function updateHUD(root=typeof document!=='undefined'?document:null){
      if(!root)return;const o=objective(),d=finitePoint(lastUnit)&&o.point?Math.round(distance(lastUnit,o.point)/18)+' m · ':'';
      const key=[revision,o.id,o.action,evidence.samples,evidence.test,evidence.bands,d].join(':');
      const title=root.getElementById('campaign-hud-title');if(!title)return;
      if(key===lastDrawn&&title.textContent===o.title)return;lastDrawn=key;
      const tag=root.getElementById('campaign-hud-episode'),detail=root.getElementById('campaign-hud-detail');
      if(tag)tag.textContent=o.finished?'第一幕 / 完成':'主线 · EP'+String(o.episode).padStart(2,'0');
      const prompts={crash:'点这里打开当前任务，再选择“接管 EV–04”。',mother:'点这里读完母亲的回忆，再继续旅程。',captain:'点这里听完舰长的嘱托，再去寻找幸存者。'};
      const instruction=prompts[o.id]||(o.action==='acknowledge'?(o.id==='refuge'?'点这里与老林交谈，了解下一步。':o.id==='stabilizer'?'点这里安装稳定架，能量恢复速度将提高 10%。':o.instruction):o.instruction);
      title.textContent=o.title;if(detail)detail.textContent=d+instruction;
    }
    return {start,checkpoint,configure,observe,award,objective,panel,hud,updateHUD,telemetry,bonuses:()=>({stabilizer:stabilizer?1.1:1}),get state(){return {version:1,started,done:[...done],routeIndex,scanned:[...scanned],refugeReached,stabilizer,storageOK,revision,lastMessage,checkpoint:savedCheckpoint?{...savedCheckpoint}:null,finished:done.length===beats.length};}};
  }
  return {KEY,episodes,beats,lampIds,create};
})();
if(typeof module!=='undefined')module.exports=ExoCampaign;
