/* The playable opening of 回声之下. The 40-episode outline is a roadmap,
   not forty invented playable missions. Lesson storage remains independent. */
const ExoCampaign = (() => {
  const KEY = 'exo-campaign-v1';
  const episodes = [
    ['坠落后的呼吸','舰队失联。陆寻独自从峡谷中的驾驶舱醒来。岩壁后有一束青光，AEGIS 却无法确认是谁留下的。','story'],
    ['地图说这里能走','旧地图还把损坏的道路标为安全。到警戒灯旁查看路况，再从安全的一侧绕过去。','field'],
    ['灯为什么还亮着','沿着青色灯光走进峡谷，查看灯箱旁的遗物，看看灾后是谁回来修好了这些灯。','field'],
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
      const previousUnit=lastUnit;
      lastInsideRefuge=!!insideRefuge;
      lastUnit=finitePoint(unit)?{x:unit.x,y:unit.y,flight:!!unit.flight}:null;
      if(interior||cave){if(!insideRefuge)lastUnit=null;}
      evidence=telemetry(fireCourse);
      if(!started)return false;
      const before=revision, id=current();
      if(id==='route'&&grounded()&&places.route.length) {
        routeIndex=Math.min(routeIndex,places.route.length-1);
        const target=places.route[routeIndex];
        const crossed=target&&grounded()&&previousUnit&&!previousUnit.flight&&distance(previousUnit,lastUnit)<=320&&(()=>{
          const dx=lastUnit.x-previousUnit.x,dy=lastUnit.y-previousUnit.y,t=Math.max(0,Math.min(1,((target.x-previousUnit.x)*dx+(target.y-previousUnit.y)*dy)/(dx*dx+dy*dy||1)));
          return Math.hypot(target.x-previousUnit.x-dx*t,target.y-previousUnit.y-dy*t)<=(target.radius||110);
        })();
        if(target&&(at(target)||crossed)){routeIndex++;change();if(routeIndex===places.route.length)advance('route');}
      } else if(id==='lamps') {
        const has=value=>earned instanceof Set?earned.has(value):Array.isArray(earned)&&earned.includes(value);
        const found=lampIds.filter(has);
        if(found.length!==scanned.length){scanned=found;change();}
        if(scanned.length>=1)advance('lamps');
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
      if(id==='crash'){action='acknowledge';event='crash-read';label='接管 EV–04';instruction='恢复备用电源，打开卡住的舱盖。通讯里似乎还有人。';}
      if(id==='route'){point=places.route[routeIndex]||places.spawn;instruction=(places.route[routeIndex]?.instruction||(['先到警戒灯旁看看断路。旧地图不一定可靠，要亲眼确认哪里能走。','沿青色灯带从安全的一侧绕过去。留在地面驾驶，逐段查看路况。'][Math.min(routeIndex,1)]));}
      if(id==='lamps'){const next=lampIds.findIndex(v=>!scanned.includes(v));point=places.lamps[next];instruction='灯箱旁有撤离时留下的东西。靠近按 E 看看谁走过这里。支路上的遗物可以稍后再找。';}
      if(id==='mother'){action='acknowledge';event='mother-memory';label='停下查看合影';point=places.mother||null;if(point&&!at(point)){action='navigate';label='沿步道寻找休息点';}instruction='“三年。”母亲林遥临行时这样说。陆寻七岁时记住的承诺，已经过去十五年。'+(point&&!at(point)?' 到林道前方的休息点停一停，陆寻想看看驾驶舱侧袋里的旧合影。':'');}
      if(id==='captain'){action='acknowledge';event='captain-memory';label='接通路边通话器';point=places.captain||null;if(point&&!at(point)){action='navigate';label='走到撤离通话点';}instruction='沈砚从外面锁死舱盖：“如果下面还有人，把他们带回有光的地方。”七个频道仍没有回应。'+(point&&!at(point)?' 继续沿步道，去看看倒在路边的通话器。':'');}
      if(id==='refuge'){point=places.refuge;instruction='沿撤离步道绕到高灯下，从机库南面接驳口找到老林。';if(refugeReached&&atRefuge()){action='acknowledge';event='refuge-briefed';label='和老林交谈';instruction='老林：“东侧接驳坪的电接好了，可那些家伙也快到了。先去试几枪，远近都试试。把记录带回来，我们一起把瞄准调准。”';}}
      if(id==='model'){point=places.range;action='fire';label='沿维护路去试射';instruction='到维修间东南侧的接驳坪，记录至少 8 次射击，包含近、中、远距离和移动目标。回来训练模型，再安装瞄准辅助。已有记录 '+evidence.samples+' 发。';}
      if(id==='defense'){point=places.range;action='fire';label='继续保卫维修站';instruction='开启瞄准辅助，击败三台主要敌人。近、中、远距离各需一发偏差小于 2° 的新射击，用来独立测试。已完成距离 '+evidence.bands+'/3。';}
      if(id==='stabilizer'){point=places.refuge;instruction='返回 K–09 维修间，安装老林修复的稳定架。安装后，能量恢复速度提高 10%。';if(atRefuge()){action='acknowledge';event='stabilizer-installed';label='安装稳定架 · 恢复动力';}}
      if(!id&&typeof ExoFieldStory!=='undefined')return {...ExoFieldStory.objective(),index:9,episode:9,done:done.length,total:beats.length,actComplete:true};
      if(!id){action='explore';label='继续旅途';instruction='维修间的灯还亮着。带上探测车，沿维护路核对南侧的河岸与山路。';}
      return {id:id||'complete',index,episode:episode.episode,title:id?episode.title:'第一幕完成 · 灯仍亮着',instruction,action,label,event,point:point?{...point}:null,...(point?{x:point.x,y:point.y,radius:point.radius||110}:{}),finished:!id,done:done.length,total:beats.length};
    }
    function button(o){
      return o.action==='acknowledge'?'<button class="primary campaign-primary" onclick="Exo.storyMoment()">'+escape(o.label)+' <span aria-hidden="true">→</span></button>':'<button class="primary campaign-primary" onclick="Exo.trackCampaign()">'+escape(o.label)+' <span aria-hidden="true">→</span></button>';
    }
    function panel(){
      const o=objective();
      return '<div class="campaign-panel"><section class="campaign-hero"><div class="campaign-kicker">随行笔记 / 回声之下</div><h2>'+escape(o.title)+'</h2><p>'+escape(o.instruction)+'</p>'+button(o)+'</section><p class="campaign-pencil">灯还亮着，就有人走过这里。</p>'+(done.length?'<details class="campaign-recap"><summary>翻看已经走过的路</summary>'+episodes.slice(0,done.length).map(e=>'<article><h3>'+escape(e.title)+'</h3><p>'+escape(e.description)+'</p></article>').join('')+'</details>':'')+'<p class="campaign-save">'+(storageOK?'旅途会自动保存。遗物和旧照片留在随身日记里，可以有空时再翻。':'当前浏览器无法保存进度。关闭页面前请留意。')+'</p></div>';
    }
    function hud(){return '<button class="campaign-hud" id="campaign-hud" onclick="Exo.campaign()" aria-label="打开当前剧情目标"><strong id="campaign-hud-title"></strong><span id="campaign-hud-distance"></span><span id="campaign-hud-episode" hidden></span><small id="campaign-hud-detail" hidden></small></button>';}
    function updateHUD(root=typeof document!=='undefined'?document:null){
      if(!root)return;const o=objective(),d=finitePoint(lastUnit)&&o.point?Math.round(distance(lastUnit,o.point)/18)+' m · ':'';
      const key=[revision,o.id,o.action,evidence.samples,evidence.test,evidence.bands,d].join(':');
      const title=root.getElementById('campaign-hud-title');if(!title)return;
      if(key===lastDrawn&&title.textContent)return;lastDrawn=key;
      const tag=root.getElementById('campaign-hud-episode'),detail=root.getElementById('campaign-hud-detail');
      if(tag)tag.textContent=o.actComplete?'南线 / 短波通讯':'回声之下';
      const prompts={crash:'按 E 接管机甲。沿青灯寻找一条能走的路。'};
      const pointName=typeof ExoGuidance!=='undefined'?ExoGuidance.name(o):o.title;
      const instruction=prompts[o.id]||(o.action==='acknowledge'?'已到达 · 按 E '+o.label:o.id==='lamps'?'前往'+pointName+' · 靠近按 E 查看遗物。':['mother','captain','refuge','stabilizer'].includes(o.id)?'前往'+pointName+' · 青灯和路面折线会指路。':o.instruction);

      title.textContent=o.action==='acknowledge'?o.label:o.point?'前往 '+pointName:o.title;if(detail)detail.textContent=instruction;root.getElementById('campaign-hud')?.setAttribute('title',instruction);
    }
    return {start,checkpoint,configure,observe,award,objective,panel,hud,updateHUD,telemetry,bonuses:()=>({stabilizer:stabilizer?1.1:1}),get state(){return {version:1,started,done:[...done],routeIndex,scanned:[...scanned],refugeReached,stabilizer,storageOK,revision,lastMessage,checkpoint:savedCheckpoint?{...savedCheckpoint}:null,finished:done.length===beats.length};}};
  }
  return {KEY,episodes,beats,lampIds,create};
})();
if(typeof module!=='undefined')module.exports=ExoCampaign;
