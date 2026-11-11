/* Event-driven expedition progression. No render assets, polling storage, or repeat-kill XP. */
const ExoProgress = (() => {
  const KEY='exo-expedition-v1';
  const ranks=[['失联驾驶员',0],['外勤勘探员',160],['深层探路者',420],['机甲工程师',820],['中继指挥官',1400],['远星领航员',2200],['回声守望者',3300]];
  const upgrades={cannon:['脉冲校准','脉冲炮伤害，每级 +8%'],regen:['能量回收','非推进时能量恢复，每级 +12%'],missile:['弹舱循环','导弹冷却，每级缩短 8%']};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({storage,structures=[],sites=[],camps=[],caves=[],lore=ExoLore,label=s=>s.id,onAward=null}={}) {
    const catalog=new Map(), earned=new Set(), read=new Set(), levels={cannon:0,regen:0,missile:0};
    let xp=0,queue=[],current=null,shownFor=0,lastPoll=-Infinity,lastToast=0,revision=0,drawn=-1,lastObjective='',recent='',storageOK=true,choice=null,activeSite=null;
    function add(id,kind,title,body,reward=0,extra={}) {catalog.set(id,{id,kind,title,body,reward,...extra});}
    add('arrival','signal','仍有灯亮着','AEGIS：我们已与舰队失联。先找一座灯还亮着的建筑。检查设备和留下的物件，看看人们离开前做过什么。发现会自动记进随身日记。',0,{lead:'AEGIS：先调查仍有电的建筑。空机库里，可能留着人们离开的方向。'});
    camps.forEach((c,i)=>{const r=lore.regions[i];add('region:'+i,'region',r[0],r[2],40,{lead:r[1],location:c.name,target:{...c}});});
    for(const r of ExoGreenTrail.records)add(r.id,'trail',r.title,r.body,r.reward,{source:r.source,location:r.location,region:r.region,view:r.view});
    if(typeof ExoStoryRoute!=='undefined')for(const r of ExoStoryRoute.detours)add('detour:'+r.id,'trail',r.name+' · '+r.object,r.observation,25,{region:8,location:'青灯林道 / '+r.name,target:{x:r.x,y:r.y},thread:'evacuation'});
    add('trail:k09:complete','trail','K–09 的归路仍然畅通','三份留言拼出了这条路的故事：绿色路灯靠独立电池供电，撤离后仍有人回来维护。如今，你也为下一位经过的人留下了这条归路。',35,{region:8,view:'interior',location:'K–09 / 留灯的人'});
    add('wreck','region','坠落前的最后一分钟','ORPHEUS–7 的断面由外向内熔化，说明它先遭到轨道攻击，再坠入荒原。黑匣子残留一个来自星环盲区的前导码；目前无法确认发送者。',60,{lead:'AEGIS：ORPHEUS–7 并非自然失事。黑匣子最后接收的信号来自星环盲区。'});
    sites.forEach((s,i)=>add('beacon:'+i,'beacon',lore.beacons[i][0],lore.beacons[i][1],60,{location:s.name,target:{...s},lead:lore.beacons[i][1]}));
    for(const s of structures){
      const name=label(s),target={...s.entrance,name},intro=lore.siteIntro?.(s);
      add('facility:'+s.id,'facility',name+' · 现场调查',intro?intro.question+'\n'+intro.body:'接驳大厅恢复了本地连接。沿灯带寻找设备旁的记录，再用原始资料核对这里发生过什么。',50,{location:name,target,structure:s.id,thread:intro?.thread,question:intro?.question,lead:'AEGIS：'+(intro?.lead||name+' 的本地记录仍可读取。先调查本层设备，再接通两处电源前往下一层。')});
      for(let floor=1;floor<3;floor++)add('deck:'+s.id+':'+floor,'depth','B'+(floor+1)+' · '+name,['','已进入 B2。把设备读数和本层留下的交接记录放在一起，看看是否吻合。','已进入 B3。这里保存着封存资料；读完现场记录、清理守卫后，再核对核心中的结论。'][floor],35,{location:name,structure:s.id});
      for(let i=0;i<6;i++){
        const r=lore.siteRecord?.(s,i)||lore.record(s.type,i);
        add('log:'+s.id+':'+i,'log',r.title,r.body,45,{...r,location:name+' / B'+(Math.floor(i/2)+1),structure:s.id,index:i});
        add('relay:'+s.id+':'+i,'power',name+' · 供电 '+(i+1),'本地供电已恢复。',20,{structure:s.id});
      }
      const fallback=lore.cores[s.type]||lore.cores.hangar,c=lore.siteCore?.(s)||{title:fallback[0],body:fallback[1]};
      add('core:'+s.id,'core',c.title,c.body,180,{...c,location:name,structure:s.id,lead:'AEGIS：'+c.body});
    }
    for(const c of caves){add('cave:'+c.id,'depth',c.name+' · 灯标向下','天然岩厅之间有人工铺设的青色灯标。它们连向洞网深处的核心。打开地图寻找通道；入口升降台始终可以返回地表。',60,{location:c.name,lead:'AEGIS：灯标通向洞网深处。它们为什么留在这里，要靠沿途记录核对。'});add('cavecore:'+c.id,'core',c.id==='basalt'?'三次敲击的回应':'深井没有沉睡',c.id==='basalt'?'天然矿核与设施的回声频谱相吻合。缓存里夹着三次来源不明的敲击，以及一段运输车识别码。识别码说明撤离者到过这里，敲击的发出者仍待核验。地下的线索需要与盆地中继的离线密钥一起核验。':'深井核心仍在执行某种封锁。边界的利维坦不是可挑战的普通敌人；警戒区在关闭高功率信号后也不会消失。另一个弱小的人类前导码，正从更深处传来。',220,{location:c.name});}
    ['侦察异兽','重装异兽','远程异兽','巢穴领主'].forEach((name,i)=>add('species:'+(i+1),'combat',name+' · 初次遭遇','AEGIS 记下了这种异兽的攻击方式。留意它蓄力时的动作，向侧面加速躲开。再次击败同类还能拾取合金，但不会重复获得探索经验。',[30,40,55,70][i]));
    add('lesson:1','protocol','链路恢复','你用实测射击数据校准了受损火控。AEGIS 可以区分传感偏差与真正的威胁，窄带握手的第一项校验通过。',180,{lead:'AEGIS：火控校验通过。这一次，我们依据自己的数据判断，而不是失真的远程指令。'});
    add('lesson:2','protocol','道路由你验证','你在未参与训练的路线验证了通行模型。AEGIS 获得自主通行授权，能为地下撤离线评估下一段道路。',220,{lead:'AEGIS：未知路线验证通过。我们终于可以为后来的人，留下一条经过验证的路。'});
    add('ending:signal','ending','第一卷终章 · 向星环回应','你选择在盲区窗口发送一次窄带识别脉冲。六座信标依次点亮，回应只有两个字：“收到。”身份校验尚未完成，但这一次信号不是旧缓存的重放。AEGIS 保持静默，等待下一次握手。地表与地下仍可继续探索。',250);
    add('ending:silent','ending','第一卷终章 · 为归来者留灯','你选择暂不回应天空，把已验证的通行与避难记录留在地表维护网。灯带依次亮起，一段来自地下的人类识别码回传：“道路已收到。”轨道上的身份仍是谜；你先为还在这颗星球上的人留了一条归路。地表与地下仍可继续探索。',250);
    // These interpretations belong to their original discoveries; they never unlock one another.
    const fieldNotes={
      'wreck':['signal','ORPHEUS–7 在坠落前遭到轨道攻击；最后一个信号的发送者仍不明。'],
      'trail:k09:1':['lamps','K–09 的运输车辆优先接走了需要照护的人，路灯使用临时接入的独立电池。'],
      'trail:k09:2':['lamps','最后一辆车离开后，仍有人修好了两盏灯。录音者是否归队还不能确认。'],
      'trail:k09:3':['lamps','晚于撤离日的电池批次说明有人回来维护过这条路。'],
      'trail:k09:complete':['lamps','撤离、留守维修与后来的补给记录接上了：这条路被人持续照料过。'],
      'beacon:0':['silence','阵列主动改变了信号方向，通讯异常并非只有设备损坏这一种解释。'],
      'beacon:1':['evacuation','地表履带痕支持运输车辆曾经过这里，不能单凭痕迹判断乘员结局。'],
      'beacon:2':['echo','矿脉与井下信号节律相同；它们的关系还需其他记录核对。','hypothesis'],
      'beacon:3':['echo','地下结构早于殖民设施存在。'],
      'beacon:4':['lamps','峡谷灯标是人工布置、经过验证的路线标记。'],
      'beacon:5':['signal','缓存里有待签署的识别码，尚未发送。'],
      'cavecore:basalt':['evacuation','运输车识别码证明撤离者到过洞网；三次敲击的来源仍待核验。'],
      'cavecore:deep':['signal','深处有未完成身份核验的人类格式信号。','hypothesis'],
      'ending:signal':['signal','这次回应不是旧缓存重放，但身份校验还没有完成。'],
      'ending:silent':['lamps','地下回传了道路接收信息；轨道回应者的身份仍未确认。']
    };
    for(const [id,[thread,meaning,confidence='confirmed']] of Object.entries(fieldNotes)){const e=catalog.get(id);if(e)Object.assign(e,{thread,meaning,confidence});}
    const isRecord=e=>e.kind!=='power';
    function rank(){let n=0;while(n+1<ranks.length&&xp>=ranks[n+1][1])n++;return n;}
    const spent=()=>Object.values(levels).reduce((a,b)=>a+b,0), points=()=>rank()-spent();
    function save(){try{storage?.setItem(KEY,JSON.stringify({version:1,earned:[...earned],read:[...read],levels,choice}));storageOK=!!storage;}catch{storageOK=false;}}
    try{const raw=JSON.parse(storage?.getItem(KEY)||'null');if(raw?.version===1){for(const id of Array.isArray(raw.earned)?raw.earned:[])if(catalog.has(id)&&!id.startsWith('ending:'))earned.add(id);if(['signal','silent'].includes(raw.choice)){choice=raw.choice;earned.add('ending:'+choice);}xp=[...earned].reduce((sum,id)=>sum+catalog.get(id).reward,0);for(const id of Array.isArray(raw.read)?raw.read:[])if(earned.has(id))read.add(id);for(const key of Object.keys(levels)){const n=raw.levels?.[key];levels[key]=Number.isInteger(n)&&n>=0&&n<=2?Math.min(n,Math.max(0,points())):0;}}}catch{storageOK=false;}
    function award(id,{quiet=false,persist=true}={}){const e=catalog.get(id);if(!e||earned.has(id))return false;const before=rank();earned.add(id);xp+=e.reward;revision++;try{onAward?.(e,{quiet})}catch(error){console.warn('Award hook failed',error)}if(!quiet){recent=(e.reward?'+'+e.reward+' XP · ':'')+e.title;if(isRecord(e)&&!['combat','log','facility','depth'].includes(e.kind))queue.push(id);if(rank()>before){queue.push('rank');recent='升到 Lv.'+(rank()+1)+' · 获得 1 个升级点';}}if(persist)save();return true;}
    function migrate({found=[],facilities,fire=false,terrain=false}={}){for(const i of found)award('beacon:'+i,{quiet:true,persist:false});for(const s of structures){const p=facilities?.(s);if(!p)continue;if(p.visited?.length||p.logs?.length||p.relays?.length||p.vault)award('facility:'+s.id,{quiet:true,persist:false});for(const n of [1,2])if(p.visited?.some(i=>Math.floor(i/13)===n))award('deck:'+s.id+':'+n,{quiet:true,persist:false});for(const i of p.logs||[])award('log:'+s.id+':'+i,{quiet:true,persist:false});for(const i of p.relays||[])award('relay:'+s.id+':'+i,{quiet:true,persist:false});if(p.vault)award('core:'+s.id,{quiet:true,persist:false});}if(fire)award('lesson:1',{quiet:true,persist:false});if(terrain)award('lesson:2',{quiet:true,persist:false});save();}
    function scanTrail(unit,enabled=true){
      if(!enabled)return null;const r=ExoGreenTrail.near(unit);if(!r)return null;
      award(r.id,{quiet:true});if(ExoGreenTrail.progress(earned).count===3)award('trail:k09:complete',{quiet:true});return r.id;
    }
    function purchase(key){if(!(key in upgrades)||points()<1||levels[key]>=2)return false;levels[key]++;revision++;save();return true;}
    function respec(){for(const key in levels)levels[key]=0;revision++;save();}
    function bonuses(enabled=true){return enabled?{cannon:1+levels.cannon*.08,regen:levels.regen*.12,missileCooldown:1-levels.missile*.08}:{cannon:1,regen:0,missileCooldown:1};}
    function complete(kind){return [...earned].some(id=>catalog.get(id).kind===kind);}
    function objective(){
      const entered=complete('facility'),hasLog=complete('log'),hasCore=[...earned].some(id=>id.startsWith('core:'));
      const facility=structures.find(s=>earned.has('facility:'+s.id)&&!earned.has('core:'+s.id))||structures.find(s=>s.id==='camp-0-0')||structures[0];
      const relay=structures.find(s=>s.id==='camp-4-0')||structures.find(s=>s.type==='relay');
      const beacon=sites.findIndex((s,i)=>!earned.has('beacon:'+i)),count=sites.filter((s,i)=>earned.has('beacon:'+i)).length;
      const steps=[
        {title:'调查仍有电的建筑',detail:'从 HELIOS 01 接驳口进入。按 E 交互；地图可查看其他设施。',done:entered,action:{kind:'facility',id:facility?.id}},
        {title:'留意设备旁的痕迹',detail:'靠近设备旁的物件，按 E 打开、转动或收听。发现会自动记进日记，无需停下来阅读。',done:hasLog,action:{kind:'facility',id:facility?.id}},
        {title:'让瞄准重新准确',detail:'完成第一章瞄准训练：记录射击结果，教机甲修正偏差。',done:earned.has('lesson:1'),action:{kind:'lesson',id:1}},
        {title:'验证一条可走的路',detail:'在南部原野沿途采集地形记录，再到未参与训练的新路段检验判断，找到安全通道。',done:earned.has('lesson:2'),action:{kind:'lesson',id:2}},
        {title:'带回设施深处的核心',detail:'任选一座设施，每层接通两处电源。到达 B3 后击败守卫，带回核心。',done:hasCore,action:{kind:'facility',id:facility?.id}},
        {title:'沿灯标进入玄武岩山洞',detail:'前往山洞前哨，进入天然洞网并回收最深处矿核。建议先分配机甲升级点。',done:earned.has('cavecore:basalt'),action:{kind:'cave',id:'basalt'}},
        {title:'取回中继离线密钥',detail:'调查盆地离线中继，在 B3 回收核心。恢复本地供电不会自动触发广播。',done:!!choice||!!relay&&earned.has('core:'+relay.id),action:{kind:'facility',id:relay?.id}},
        {title:'找到六座旧信标 · '+count+'/'+sites.length,detail:'前往迫降荒原，走近六处地标后按 E 扫描。先找哪一处都可以。',done:count===sites.length,action:{kind:'beacon',id:beacon}},
        {title:'决定如何回应星环',detail:'找到所有线索后，由你决定：回应星环，还是保持静默，为地下的幸存者留一条归路。',done:!!choice,action:{kind:'choice'}}
      ];const index=steps.findIndex(s=>!s.done);return {steps,index:index<0?steps.length-1:index,finished:!!choice,...steps[index<0?steps.length-1:index]};
    }
    function finish(value){if(!['signal','silent'].includes(value)||choice||objective().index!==8)return false;choice=value;award('ending:'+value);return true;}
    function record(id){const e=catalog.get(id);if(!e||!earned.has(id))return null;read.add(id);revision++;save();return e;}
    const confidenceText=e=>e.confidence==='hypothesis'?'待核实的解释':'记录能确认的事';
    const discoveredSite=s=>earned.has('facility:'+s.id)||earned.has('core:'+s.id)||[...earned].some(id=>id.startsWith('log:'+s.id+':')||id.startsWith('deck:'+s.id+':'));
    const allSiteEvidence=s=>earned.has('core:'+s.id)&&Array.from({length:6},(_,i)=>earned.has('log:'+s.id+':'+i)).every(Boolean);
    function siteCase(id){
      const s=structures.find(s=>s.id===id);if(!s)return null;
      const intro=lore.siteIntro?.(s),profile=lore.discovery?.get(s),name=label(s),known=discoveredSite(s);
      const evidence=Array.from({length:6},(_,i)=>catalog.get('log:'+id+':'+i)).filter(e=>e&&earned.has(e.id));
      const core=earned.has('core:'+id)?catalog.get('core:'+id):null;
      const confirmed=evidence.filter(e=>e.confidence!=='hypothesis'),hypotheses=evidence.filter(e=>e.confidence==='hypothesis');
      const priority=profile?.findingPriority||[4,3,2,1,0,5],preferred=priority.map(i=>evidence.find(e=>e.index===i)).filter(Boolean);
      const latest=core||preferred.find(e=>e.confidence!=='hypothesis')||preferred[0];
      const missing=Array.from({length:6},(_,i)=>i).find(i=>!earned.has('log:'+id+':'+i));
      let nextLead=null;
      if(!known)nextLead={siteId:id,index:-1,label:'前往'+name,detail:intro?.question||'到现场查看还保留着什么。',kind:'site'};
      else if(missing!==undefined){const r=catalog.get('log:'+id+':'+missing),clue=typeof ExoFieldClues!=='undefined'?ExoFieldClues.get(id,missing):null;nextLead={siteId:id,index:missing,label:'寻找'+(clue?'B'+(Math.floor(missing/2)+1)+' 的'+clue.object:r.clue||'B'+(Math.floor(missing/2)+1)+' 的现场记录'),detail:'可以先自己在房间里找，也可以查看位置。靠近物件后按 E 检查。',kind:'record'};}
      else if(!core)nextLead={siteId:id,index:6,label:'核对 B3 封存核心',detail:'六份记录已经收齐。到 B3 核心室完成交接，核对本站留下的完整资料。',kind:'core'};
      else {
        const preferred=structures.find(t=>t.id===profile?.nextSite),sameThread=structures.filter(t=>t.id!==id&&lore.siteIntro?.(t)?.thread===intro?.thread);
        const destination=preferred&&!allSiteEvidence(preferred)?preferred:sameThread.find(t=>discoveredSite(t)&&!allSiteEvidence(t))||sameThread.find(t=>!allSiteEvidence(t));
        if(destination)nextLead={siteId:destination.id,index:-1,label:'去'+label(destination)+'核对',detail:destination===preferred?profile.nextReason:'这个问题还有另一处现场可以调查：'+(lore.siteIntro?.(destination)?.question||label(destination)),kind:'site'};
      }
      const pointer=profile&&catalog.get('log:'+id+':'+profile.leadIndex),destination=structures.find(t=>t.id===profile?.nextSite);
      const crossLead=destination&&(core||pointer&&earned.has(pointer.id))?{siteId:destination.id,index:-1,label:(allSiteEvidence(destination)?'对照':'继续追查：')+label(destination),detail:profile.nextReason,kind:allSiteEvidence(destination)?'compare':'site',sourceId:pointer&&earned.has(pointer.id)?pointer.id:core.id}:null;
      return {id,name,known,question:intro?.question||'这里留下了什么？',context:intro?.body||'从设备与现场记录开始调查。',thread:intro?.thread||null,evidence,confirmed,hypotheses,core,count:evidence.length,complete:!!core&&evidence.length===6,summary:latest?.meaning||latest?.body||(known?'已经进入现场，尚未回收足够记录。先检查设备，再判断这里发生了什么。':'尚未进入现场。问题可以先记下，结论要等找到证据。'),summaryEvidence:latest?.id||null,summaryConfidence:latest?.confidence||'unknown',nextLead,crossLead};
    }
    function leadHTML(lead){return lead?'<aside class="exp-next-lead"><small>'+(lead.sourceId?'原件指向的另一处现场':'接下来可以查什么')+'</small><b>'+esc(lead.label)+'</b><p>'+esc(lead.detail)+'</p><div><button onclick="'+(lead.kind==='compare'?'Exo.openSiteStory(\''+esc(lead.siteId)+'\')':'Exo.followEvidence(\''+esc(lead.siteId)+'\','+lead.index+')')+'">'+(lead.kind==='compare'?'对照已回收资料':'查看位置与路线')+' ↗</button>'+(lead.sourceId?'<button class="exp-source-button" onclick="Exo.readRecord(\''+esc(lead.sourceId)+'\')">查看线索出处</button>':'')+'</div></aside>':'<p class="exp-hint">这条调查线的现场资料已全部回收。仍未确认的事会保留为疑问，不会自动补成结论。</p>';}
    function caseLeadsHTML(c){return leadHTML(c.crossLead?.siteId===c.nextLead?.siteId?c.crossLead:c.nextLead)+(c.crossLead&&c.crossLead.siteId!==c.nextLead?.siteId?leadHTML(c.crossLead):'');}
    function evidenceHTML(e){return '<button class="exp-evidence-link" onclick="Exo.readRecord(\''+esc(e.id)+'\')"><span>'+esc(e.source||e.location||'现场记录')+'</span><b>'+esc(e.title)+'</b><small>'+confidenceText(e)+(!read.has(e.id)?' · 未读':'')+' ↗</small></button>';}
    function caseSummaryHTML(c){return '<article class="exp-case-card"><div><span>'+esc(c.name)+'</span><small>'+c.count+'/6 份记录'+(c.core?' · 核心已核对':'')+'</small></div><h3>'+esc(c.question)+'</h3><p>'+esc(c.summary)+'</p><button onclick="Exo.openSiteStory(\''+esc(c.id)+'\')">查看这处现场的调查 ↗</button></article>';}
    function siteHTML(id){
      const c=siteCase(id);if(!c)return '<p>没有找到这处现场。</p>';if(typeof ExoDiary!=='undefined')return ExoDiary.site(c);
      const sections=[0,1,2].map(f=>{const found=c.evidence.filter(e=>Math.floor(e.index/2)===f);return '<section class="exp-case-deck"><h4>B'+(f+1)+' <span>'+found.length+'/2 份已回收</span></h4>'+(found.length?found.map(evidenceHTML).join(''):'<p>这一层还没有回收记录。</p>')+'</section>';}).join('');
      return '<article class="exp-journal exp-site-document"><div class="exp-eyebrow">本站调查 / 已回收 '+c.count+' 份记录</div><header class="exp-case-header"><small>'+esc(c.name)+'</small><h2>'+esc(c.question)+'</h2><p>'+esc(c.context)+'</p></header><section class="exp-case-reading"><small>'+(c.summaryConfidence==='unknown'?'调查尚未展开':c.summaryConfidence==='hypothesis'?'目前的解释 · 仍待核实':'目前能确认的事')+'</small><p>'+esc(c.summary)+'</p>'+(c.summaryEvidence?'<button onclick="Exo.readRecord(\''+esc(c.summaryEvidence)+'\')">核对这段判断的原始记录 ↗</button>':'')+'</section>'+caseLeadsHTML(c)+(c.known?'<h3 class="exp-section-title">本站证据 / '+c.count+' 份已回收</h3><div class="exp-case-decks">'+sections+'</div>'+(c.core?'<section class="exp-case-core"><h3>封存核心 · 已核对</h3>'+evidenceHTML(c.core)+'</section>':'<p class="exp-hint">封存核心尚未回收。未找到的原件和结论不会提前显示。</p>'):'')+'<footer><button onclick="Exo.journal(\'records\')">返回故事线索</button><button class="primary" onclick="closeModal()">继续探索</button></footer></article>';
    }
    function storyThreads(){
      const story=[...catalog.values()].filter(e=>earned.has(e.id)&&e.thread&&e.meaning),cases=structures.filter(discoveredSite).map(s=>siteCase(s.id));
      return (lore.discovery?.threads||[]).map(t=>{
        const evidence=story.filter(e=>e.thread===t.id),local=cases.filter(c=>c.thread===t.id&&c.summaryEvidence),findings=local.map(c=>catalog.get(c.summaryEvidence));
        const outside=evidence.filter(e=>!e.structure),fieldGroups=new Map();
        for(const e of outside)fieldGroups.set(e.id.startsWith('trail:k09:')?'trail:k09':e.id,e);
        findings.push(...fieldGroups.values());
        // Core conclusions stay prominent. Remaining site findings retain their
        // authored order, independent of the order in which the player arrived.
        const primary=[...findings.filter(e=>e.kind==='core'),...findings.filter(e=>e.kind!=='core')].slice(0,3);
        return {...t,evidence,findings,primary:findings.filter(e=>primary.includes(e)),additional:findings.filter(e=>!primary.includes(e))};
      });
    }
    function findingHTML(e){return '<li><p>'+esc(e.meaning)+'</p><small class="exp-confidence '+(e.confidence==='hypothesis'?'is-hypothesis':'')+'">'+confidenceText(e)+'</small><button class="exp-finding-source" onclick="Exo.readRecord(\''+esc(e.id)+'\')">依据：'+esc(e.location||e.source||'现场记录')+' · '+esc(e.title)+' ↗</button></li>';}
    function storyHTML(){
      const cases=structures.filter(discoveredSite).map(s=>siteCase(s.id)),threads=storyThreads();
      let html='<header class="exp-story-heading"><span>现场笔记 / 随证据更新</span><h2>把找到的事，一件件接起来</h2><p>先看每处现场能说明什么，再沿线索去核对。这里按问题整理故事；你可以从任何地点开始。</p></header>';
      const currentCase=activeSite&&siteCase(activeSite);if(currentCase?.known)html+='<div class="exp-current-case"><small>你所在的现场</small>'+caseSummaryHTML(currentCase)+'</div>';
      html+='<ol class="exp-account">'+threads.map(t=>'<li class="'+(t.evidence.length?'has-evidence':'no-evidence')+'"><span class="exp-account-number">'+String(t.order).padStart(2,'0')+'</span><div><h3>'+esc(t.question)+'</h3>'+(t.primary.length?'<ul class="exp-findings">'+t.primary.map(findingHTML).join('')+'</ul><details class="exp-thread-sources"><summary>'+t.evidence.length+' 份原始资料'+(t.additional.length?' · 另有 '+t.additional.length+' 处发现':'')+'</summary>'+(t.additional.length?'<ul class="exp-findings">'+t.additional.map(findingHTML).join('')+'</ul>':'')+t.evidence.map(evidenceHTML).join('')+'</details>':'<p>还没有足够现场资料。找到相关记录后，这一页才会写下判断。</p>')+'</div></li>').join('')+'</ol>';
      html+='<h3 class="exp-section-title">按地点继续调查 <small>'+cases.length+' 处已发现</small></h3><div class="exp-site-cases">'+(cases.length?cases.map(caseSummaryHTML).join(''):'<p class="exp-hint">进入任意一座建筑，调查设备旁留下的记录。每个地点都有自己的问题和后续线索。</p>')+'</div>';
      const originals=[...catalog.values()].filter(e=>earned.has(e.id)&&isRecord(e)&&!e.meaning&&e.kind!=='log'&&e.kind!=='core').reverse();
      if(originals.length)html+='<details class="exp-other-records"><summary>行程与通讯原件 · '+originals.length+' 份</summary><div class="exp-records">'+originals.map(e=>'<button onclick="Exo.readRecord(\''+esc(e.id)+'\')"><small>'+esc(e.location||({protocol:'练习完成',combat:'战术记录',signal:'现场通讯',ending:'第一卷终章'}[e.kind]||'现场发现'))+(!read.has(e.id)?' · 未读':'')+'</small><b>'+esc(e.title)+'</b><span>阅读原件 ↗</span></button>').join('')+'</div></details>';
      return html;
    }
    function facilityEvent(s,event,index){if(!s)return false;return award((event==='vault'?'core':event)+':'+s.id+(Number.isInteger(index)?':'+index:''));}
    function onDefeat(e,enabled=true){if(enabled)award('species:'+e.level);}
    function observe({unit,interior,cave,battle,enabled=true,wreck=false}){
      if(!enabled||battle?.down)return;
      activeSite=interior?.structure?.id||null;
      award('arrival');
      if(interior){award('facility:'+interior.structure.id);if(interior.level)award('deck:'+interior.structure.id+':'+interior.level);}
      else if(cave)award('cave:'+cave.id);
      else {camps.forEach((c,i)=>{if(Math.hypot(unit.x-c.x,unit.y-c.y)<700)award('region:'+i);});if(wreck)award('wreck');}
    }
    function toast(dt=0,blocked=false){if(blocked)return null;if(!current&&queue.length){current=queue.shift();shownFor=0;}if(!current)return null;shownFor+=dt;if(shownFor>14){current=null;return null;}if(current==='rank')return {id:'rank',title:'升级了 · '+ranks[rank()][0],body:'获得 1 个机甲升级点。打开“我的机甲”，可以强化武器或能量恢复。想换一种搭配时，也能免费重新分配。'};const e=catalog.get(current);return {id:e.id,title:e.title,body:e.lead||e.body};}
    function dismiss(){current=null;shownFor=0;}
    function hud(){return '<div class="exp-strip" aria-label="探索进度"><button id="exp-rank" onclick="Exo.journal(\'upgrades\')" aria-label="驾驶员等级与机甲升级"></button><button id="exp-objective" onclick="Exo.journal()" aria-label="查看当前目标"></button></div>';}
    function transmission(){return '<aside class="exp-transmission" id="exp-transmission" hidden aria-label="现场通讯"><div><span>AEGIS 的消息</span><button onclick="Exo.dismissStory()" aria-label="收起现场通讯">×</button></div><b id="exp-transmission-title"></b><p id="exp-transmission-copy" role="status"></p><button id="exp-transmission-read" onclick="Exo.readTransmission()">读完整段消息 ↗</button></aside>';}
    function targetFor(action){if(action?.kind==='facility'){const s=structures.find(s=>s.id===action.id);return s?{...s.entrance,name:label(s)}:null;}if(action?.kind==='cave'){const c=caves.find(c=>c.id===action.id);return c?{...c}:null;}if(action?.kind==='beacon')return sites[action.id];return null;}
    function update({now,dt,unit,interior,cave,battle,enabled,wreck,blocked=false,suppressStory=false}){
      if(now-lastPoll<500&&now>=lastPoll)return;const elapsed=lastPoll===-Infinity?0:Math.min(1,(now-lastPoll)/1000);lastPoll=now;
      activeSite=enabled&&interior?.structure?.id||null;
      if(dt>0&&!blocked)observe({unit,interior,cave,battle,enabled,wreck});
      if(typeof document==='undefined')return;
      const q=id=>document.getElementById(id),r=rank(),next=ranks[r+1],pct=next?Math.min(100,(xp-ranks[r][1])/(next[1]-ranks[r][1])*100):100,rankNode=q('exp-rank');
      if(drawn!==revision&&rankNode){rankNode.innerHTML='<span>Lv.'+(r+1)+' <b>'+ranks[r][0]+'</b>'+(points()?' <em>+'+points()+'</em>':'')+'</span><i style="width:'+pct+'%"></i>';rankNode.title=recent||'探索经验 '+xp;drawn=revision;}
      const o=objective(),localCase=activeSite&&siteCase(activeSite),trail=ExoGreenTrail.progress(earned),localTrail=enabled&&!interior&&!cave&&ExoGreenTrail.active(unit)&&trail.next,text=localCase?'随身日记 · '+localCase.name:localTrail?'留灯的人 · '+trail.count+'/3 · '+trail.next.name+' '+Math.round(Math.hypot(unit.x-trail.next.x,unit.y-trail.next.y)/18)+' m':enabled?'当前目标 · '+(o.finished?'第一卷已完成 · 继续探索':o.title):'练习进行中 · 查看进度',on=q('exp-objective');if(on&&text!==lastObjective){on.textContent=text+' ↗';on.title=enabled?(localCase?(localCase.nextLead?.label||'查看本站已回收的记录'):localTrail?trail.next.hint:o.detail):'查看练习进度，或结束练习返回探索';on.setAttribute?.('onclick',localCase?"Exo.openSiteStory('"+localCase.id+"')":enabled?'Exo.journal()':"Exo.hub('training')");lastObjective=text;}
      const danger=battle?.down||battle?.bolts?.some(b=>b.enemy)||battle?.hazards?.length||battle?.enemies?.some(e=>e.hp>0&&Math.hypot(e.x-unit.x,e.y-unit.y)<650);
      const message=toast(elapsed,suppressStory||blocked||!enabled||!!danger),panel=q('exp-transmission');if(panel){panel.hidden=!message;if(message){q('exp-transmission-title').textContent=message.title;q('exp-transmission-copy').textContent=message.body;q('exp-transmission-read').textContent=message.id==='rank'?'分配升级点 ↗':'已存入旅途记录 · 阅读全文 ↗';}}
    }
    function mount(){drawn=-1;lastObjective='';lastPoll=-Infinity;}
    function tabs(active){return '<nav class="exp-tabs" aria-label="探索手册">'+[['journey','当前目标'],['records','故事线索'],['regions','地区图册'],['upgrades','机甲升级']].map(([id,name])=>'<button aria-pressed="'+(active===id)+'" onclick="Exo.journal(\''+id+'\')">'+name+'</button>').join('')+'</nav>';}
    function journal(tab='journey'){
      if(tab==='records'&&typeof ExoDiary!=='undefined')return ExoDiary.index(structures.filter(discoveredSite).map(s=>siteCase(s.id)),[...catalog.values()].filter(e=>earned.has(e.id)&&isRecord(e)),storyThreads(),storageOK?'':'这页还没保存成功。请先不要刷新或关闭游戏。');
      if(!['journey','records','regions','upgrades'].includes(tab))tab='journey';
      const r=rank(),next=ranks[r+1],o=objective(),unread=[...earned].filter(id=>isRecord(catalog.get(id))&&!read.has(id)).length;
      let html='<div class="exp-journal"><div class="exp-eyebrow">ECHO–9 / 你的探索手册</div><section class="exp-profile"><div><small>EV–04 AEGIS · Lv.'+(r+1)+'</small><h2>'+ranks[r][0]+'</h2></div><div><b>'+xp+' <small>XP</small></b><small>'+(next?'距离下一级还需 '+(next[1]-xp)+' XP':'已达最高驾驶员等级')+'</small></div></section><progress max="'+(next?next[1]-ranks[r][1]:1)+'" value="'+(next?xp-ranks[r][1]:1)+'" aria-label="驾驶员升级进度"></progress>'+tabs(tab);
      if(!storageOK)html+='<p class="exp-save-warning" role="status">这次没能保存进度。请暂时不要刷新或关闭页面，否则这次新找到的记录会丢失。</p>';
      if(tab==='journey'){
        const c=activeSite&&siteCase(activeSite);if(c?.known)html+='<div class="exp-current-case"><small>你所在的现场 · 可以先完成这里的调查</small>'+caseSummaryHTML(c)+'</div>';
        html+='<section class="exp-current"><span>第一卷 / 第九次握手 · '+o.steps.filter(s=>s.done).length+'/9</span><h3>'+esc(o.finished?'为后来者留一条路':o.title)+'</h3><p>'+esc(o.finished?'第一卷的故事已经结束，探索还可以继续。去看看其他建筑、深井和地区，找齐殖民地留下的故事。':o.detail)+'</p>'+(o.finished?'':o.action.kind==='choice'?'<p>线索已经齐了。接下来，选择你想留下的回应；选择后会保存在这次旅途中。</p><button onclick="Exo.chooseEnding(\'signal\')">向星环发送窄带回应</button><button onclick="Exo.chooseEnding(\'silent\')">保持静默，为地下留灯</button>':'<button class="primary" onclick="Exo.trackJourney()">'+(o.action.kind==='lesson'?'开始练习':o.action.kind==='facility'?'查看目的地与路线':'为我指路')+' ↗</button>')+'</section><details class="exp-optional-trail"><summary>K–09 · 留灯的人 / 可选探索</summary>'+ExoGreenTrail.panel([...earned])+'</details><p class="exp-hint">想先去哪里都可以，进度会一直保留。探索新地点、找到记录、接通电源和完成练习都能获得经验；重复击败同类异兽不增加经验。</p><ol class="exp-trail">'+o.steps.map((s,i)=>'<li class="'+(s.done?'done':i===o.index?'active':'')+'"><span>'+(s.done?'✓':String(i+1).padStart(2,'0'))+'</span><div><b>'+esc(s.title)+'</b><small>'+(s.done?'已完成':i===o.index?'接下来做这件事':'也可以先做，进度会保留')+'</small></div></li>').join('')+'</ol><button onclick="Exo.journal(\'records\')">查看旅途记录 · '+unread+' 条未读</button>';
      }else if(tab==='regions'){
        html+=ExoRegionArt.gallery([...earned],structures);
      }else if(tab==='upgrades'){
        html+=(typeof ExoArmory!=='undefined'?ExoArmory.panelHTML():'')+'<section class="exp-current"><span>机甲升级</span><h3>'+points()+' 点可用</h3><p>每升一级可获得 1 个升级点，每项最多升 2 级。选错也没关系，随时可以免费重新分配。强化会在自由探索中生效，练习和战斗试炼使用固定数值。</p></section><div class="exp-upgrades">'+Object.entries(upgrades).map(([key,[name,desc]])=>'<article><div><h3>'+name+'</h3><span>'+levels[key]+' / 2</span></div><p>'+desc+'</p><button '+(points()<1||levels[key]>=2?'disabled':'')+' onclick="Exo.upgrade(\''+key+'\')">'+(levels[key]>=2?'已满级':points()<1?'还需 1 个升级点':'使用 1 点升级')+'</button></article>').join('')+'</div><button '+(!spent()?'disabled':'')+' onclick="Exo.respec()">重新分配升级点 · 免费</button><p class="exp-hint">新地区 +40 XP · 新设施 +50 · 记录 +45 · 供电 +20 · 设施核心 +180 · 天然矿核 +220。返回营地或战败都不会扣除经验。</p>';
      }else{
        html+=storyHTML();
      }
      return html+'<footer><span>自动保存 · '+(storageOK?'保存在当前浏览器':'仅本次会话')+'</span><button onclick="closeModal()">继续探索</button></footer></div>';
    }
    function recordHTML(id){
      const e=record(id);if(!e)return '<p>这条记录尚未发现。</p>';
      const c=e.structure&&siteCase(e.structure),related=e.thread?[...earned].map(id=>catalog.get(id)).filter(r=>r.id!==e.id&&r.thread===e.thread&&r.meaning&&r.structure!==e.structure).slice(-2):[];
      if(typeof ExoDiary!=='undefined')return ExoDiary.entry(e,c,related);
      return '<article class="exp-journal exp-document"><div class="exp-eyebrow">'+esc(e.location||'AEGIS / 现场档案')+'</div><h2>'+esc(e.title)+'</h2><small>'+esc(e.source||'已保存在当前浏览器')+'</small>'+(c?'<div class="exp-record-question"><span>这份记录正在回答</span><button onclick="Exo.openSiteStory(\''+esc(c.id)+'\')">'+esc(c.question)+' ↗</button></div>':'')+ExoRegionArt.recordArt(e,structures)+'<p>'+esc(e.body)+'</p>'+(e.meaning&&e.meaning!==e.body?'<section class="exp-case-reading '+(e.confidence==='hypothesis'?'is-hypothesis':'')+'"><small>AEGIS 整理 / '+confidenceText(e)+'</small><p>'+esc(e.meaning)+'</p></section>':'')+(related.length?'<details class="exp-thread-sources"><summary>与其他地点已找到的记录对照</summary>'+related.map(evidenceHTML).join('')+'</details>':'')+(c?caseLeadsHTML(c):'')+(e.id.startsWith('trail:')?ExoGreenTrail.panel([...earned]):'')+'<p class="exp-hint">发现已记下 · 首次发现 '+e.reward+' XP</p><footer><button onclick="Exo.journal(\'records\')">返回故事线索</button><button class="primary" onclick="closeModal()">继续探索</button></footer></article>';
    }
    return {connectionsHTML(){return typeof ExoDiary!=='undefined'?ExoDiary.connections(storyThreads()):storyHTML();},scanTrail,get trailEarned(){return ExoGreenTrail.records.filter(r=>earned.has(r.id)).map(r=>r.id);},award,migrate,purchase,respec,bonuses,objective,finish,record,recordHTML,siteCase,siteHTML,storyThreads,facilityEvent,onDefeat,observe,toast,dismiss,hud,transmission,update,mount,journal,targetFor,save,
      get current(){return current;},get state(){return {xp,rank:rank()+1,points:points(),levels:{...levels},earned:[...earned],read:[...read],choice};}};
  }
  return {create,ranks,upgrades,KEY};
})();
if(typeof module!=='undefined')module.exports=ExoProgress;
