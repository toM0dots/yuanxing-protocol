/* The K–09 annex dossier uses the same coordinates as physical collision and lessons. */
const ExoTrainingUI = (() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const info={
    fire:{number:'01',code:'FIRE CONTROL',name:'瞄准训练',eyebrow:'第 7 集 · 老林的工位',tag:'练好瞄准，守住机库',brief:'炮口在迫降时受了损。老林修好了机库南侧的靶场，等你来试射。先记录子弹为什么打偏，再训练瞄准辅助，带着更准的机甲守住防线。',purpose:'靶场面向南侧拦弹墙，西侧留有安全通道。射击、维修和测试都能在这里完成。',steps:[['记录每次射击','换几个距离和位置开火，记录磁场、目标移动和高低差对瞄准的影响。'],['教机甲修正偏差','回到工位，用射击记录训练模型。误差足够小，就能安装瞄准辅助。'],['再出发，看看准不准','安装后重新出击。新射击只用于独立测试，不会自动加入训练。']]},
    terrain:{number:'02',code:'FIELD NOTES',name:'地形勘测',eyebrow:'K–09 · 为撤离队探路',tag:'先探路，再放心出发',brief:'沿断脊河谷勘测河岸、陡坡和洞口。机甲留在稳固路面，让探测车先试，再用沿途记录学会判断，减少装甲损伤。',purpose:'先收集六处真实地形的通行结果，再继续前往四段未参与学习的新路线，检查判断是否可靠。',steps:[['试走六种地形','沿青灯找到观察点，派出探测车。记录地面承重、坡度、抓地力，以及能否通过。'],['学会判断哪条路安全','用测量结果训练决策树，看看它根据什么决定通过或绕行。'],['试试四段新路线','继续在河谷寻找四段未参与训练的路，边走边检查规则。桥面和青灯绕行路始终可走。']]}
  };
  const normalize=kind=>kind==='terrain'?'terrain':'fire';
  const stateObject=value=>value&&typeof value==='object'?value:{};
  function status(kind,value){
    const s=stateObject(value),done=kind==='fire'?s.completed:s.unlocked;
    if(done)return {label:kind==='fire'?'瞄准已校准':'地形辅助已安装',detail:kind==='fire'?'瞄准辅助已通过独立测试':'四段新路线全部判断正确',done:true};
    if(kind==='fire')return {label:s.active?'正在校准瞄准':s.installed?'瞄准辅助已安装':s.logs?.length?'射击记录已保存':'准备好就出发',detail:s.logs?.length?`${s.logs.filter(p=>p.role==='train').length} 条训练记录`:'先去靶场，记录几次射击',done:false};
    return {label:s.active?'沿途勘测中':s.rows?.length?'测量结果已保存':'准备好就出发',detail:`已测地形 ${s.rows?.length||0} / 6 · 新路线测试 ${s.checks?.filter(p=>p.correct).length||0} / 4`,done:false};
  }
  function schematic(kind='fire',unit=null){
    if(kind==='terrain'&&typeof ExoTerrainWildsUI!=='undefined')return ExoTerrainWildsUI.schematic(unit);
    const G=ExoTrainingGround,b=G.bounds,scale=Math.min(692/(b.maxY-b.minY),286/(b.maxX-b.minX));
    // North points left; long campus axis remains readable in landscape and on phones.
    const p=q=>({x:34+(q.y-b.minY)*scale,y:75+(b.maxX-q.x)*scale});
    const pt=q=>{const a=p(q);return `${a.x.toFixed(1)},${a.y.toFixed(1)}`;};
    const rect=(bounds,cls)=>{const a=p({x:bounds.maxX,y:bounds.minY});return `<rect class="${cls}" x="${a.x.toFixed(1)}" y="${a.y.toFixed(1)}" width="${((bounds.maxY-bounds.minY)*scale).toFixed(1)}" height="${((bounds.maxX-bounds.minX)*scale).toFixed(1)}" rx="5"/>`;};
    const terminal=G.terminals.find(t=>t.id===kind),site=G[kind],siteCenter=p({x:(site.bounds.minX+site.bounds.maxX)/2,y:(site.bounds.minY+site.bounds.maxY)/2});
    let player='';
    if(unit&&unit.x>=b.minX&&unit.x<=b.maxX&&unit.y>=b.minY&&unit.y<=b.maxY){const a=p(unit);player=`<g class="tg-map-player"><circle cx="${a.x}" cy="${a.y}" r="8"/><circle cx="${a.x}" cy="${a.y}" r="3"/></g>`;}
    return `<svg class="tg-map" viewBox="0 0 760 420" role="img" aria-label="K–09 维修靶场地图。左侧是北方，西侧维护路通往河谷勘测路线。"><title>K–09 维修靶场 / ${esc(info[kind].name)}</title><defs><pattern id="tg-map-grid-${kind}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8cc8c1" stroke-opacity=".06" stroke-width="1"/></pattern></defs><rect width="760" height="420" fill="url(#tg-map-grid-${kind})"/><path class="tg-map-contour" d="M0 91C65 60 90 85 131 60S215 77 281 39M0 110C55 85 87 110 132 83S220 99 286 61M0 363C76 337 119 372 203 352S331 387 452 365 621 397 760 370M0 385C76 359 119 394 203 374S331 409 452 387 621 419 760 392"/>${rect(G.fire.bounds,'tg-map-zone '+(kind==='fire'?'selected':''))}<g class="tg-map-roads">${[G.approach,...G.links].map(line=>`<polyline points="${line.map(pt).join(' ')}"/>`).join('')}</g>${rect(G.campaign.trench,'tg-map-washout')}<g class="tg-map-targets">${G.fire.layouts.map(([x,y])=>{const a=p({x,y});return `<circle cx="${a.x}" cy="${a.y}" r="7"/><path d="M${a.x-11} ${a.y}h22M${a.x} ${a.y-11}v22"/>`;}).join('')}</g><g class="tg-map-terminals">${G.terminals.filter(t=>t.id==='fire').map(t=>{const a=p(t);return `<rect x="${a.x-12}" y="${a.y-13}" width="24" height="26" rx="3"/><path d="M${a.x-5} ${a.y-5}h10v8h-10zM${a.x} ${a.y+3}v4"/>`;}).join('')}</g><g class="tg-map-text"><text x="${siteCenter.x}" y="44" class="tg-map-focus" text-anchor="middle">${esc(info[kind].name)}</text><text x="39" y="310">通往 K–09</text><text x="${p(G.terminals[0]).x}" y="370" text-anchor="middle">瞄准工位</text><text x="38" y="402">← N / 峡谷机库</text><text x="721" y="402" text-anchor="end">K–09 MAINTENANCE ANNEX</text></g>${player}<circle class="tg-map-terminal-focus" cx="${p(terminal).x}" cy="${p(terminal).y}" r="19"/></svg>`;
  }
  function panel(kind='fire',unit=null,states={}){
    if(kind==='terrain'&&typeof ExoTerrainWildsUI!=='undefined')return ExoTerrainWildsUI.panel(states.terrain,unit);
    kind=normalize(kind);const i=info[kind],s=stateObject(states[kind]),st=status(kind,s),G=ExoTrainingGround;
    const terminal=G.terminals.find(t=>t.id===kind),surface=typeof ExoWorld==='undefined'||!ExoWorld.cave,near=!!unit&&surface&&!unit.flight&&Math.hypot(unit.x-terminal.x,unit.y-terminal.y)<terminal.r,canBegin=near||!!s.active;
    const action=canBegin?(kind==='terrain'?(s.active?'继续收集数据':'开始练习'):(s.active?'继续瞄准训练':'看看怎么练')):'前往练习工位';
    return `<div class="tg-dossier" data-training="${kind}"><nav class="tg-tabs" aria-label="选择练习">${Object.keys(info).map(key=>`<button ${key===kind?'aria-current="page"':''} onclick="Exo.visitTraining('${key}')">${info[key].name}</button>`).join('')}</nav><header class="tg-header"><div><span class="tg-eyebrow">${i.eyebrow}</span><h2>${i.name}</h2></div><span class="tg-status ${st.done?'complete':''}"><i></i>${st.label}</span></header><p class="tg-brief">${i.brief}</p><section class="tg-launch"><div><strong>${st.detail}</strong><span>${s.active?'进度已保存，随时可以继续':near?'已抵达工位':'沿维护路到达工位，就能开始'}</span></div><button class="primary" onclick="Exo.${canBegin?'beginTraining':'navigateTraining'}('${kind}')">${action} <span aria-hidden="true">→</span></button></section><figure class="tg-map-frame">${schematic(kind,surface?unit:null)}<figcaption><span><i></i> 维护通道</span><span><i class="sample"></i> 训练区</span><span><i class="validation"></i> 独立测试</span><span><i class="player"></i> 你的位置</span></figcaption></figure><ol class="tg-steps">${i.steps.map(([title,copy],n)=>`<li><span>0${n+1}</span><div><h3>${title}</h3><p>${copy}</p></div></li>`).join('')}</ol>${kind==='terrain'&&typeof ExoTerrainWildsUI!=='undefined'?ExoTerrainWildsUI.teaser(s):''}<details class="tg-shuttle"><summary>想快一点到达？</summary><p>搭乘接驳车直接到工位，已有记录和模型都会保留。</p><button onclick="Exo.transferTraining('${kind}')">直接到${kind==='fire'?'瞄准':'驾驶'}工位 ↗</button></details></div>`;
  }
  function summary(states={}){
    return `<section class="tg-summary"><header><span class="tg-eyebrow">K–09 · 边走边学</span><h3>修好机甲，继续探路。</h3><p>老林的维修间是旅途中的歇脚处。南侧靶场能校准受损炮口；沿维护路继续向南，就要靠沿途观察判断哪段路还能走。</p></header><div class="tg-summary-sites">${Object.keys(info).map(key=>{const i=info[key],s=status(key,states[key]);return `<button onclick="Exo.visitTraining('${key}')"><span class="tg-summary-number">${key==='fire'?'瞄':'路'}</span><span><strong>${key==='fire'?'维修间 · 校准瞄准':'南部河谷 · 沿途勘测'}</strong><em>${s.detail}</em></span><span class="tg-summary-arrow" aria-hidden="true">→</span></button>`;}).join('')}</div></section>`;
  }
  function overlay(ctx,args={}){
    const {unit,c,w,h,project}=args;
    if(!ctx||!unit||!c||!project||args.fire?.active||args.terrain?.active||typeof ExoWorld!=='undefined'&&ExoWorld.cave)return;
    const G=ExoTrainingGround,ground=ExoWorld.elevation(c.x,c.y),ordered=G.terminals.map(t=>({t,d:Math.hypot(unit.x-t.x,unit.y-t.y)})).sort((a,b)=>a.d-b.d);
    ctx.save();ctx.textAlign='center';ctx.font='500 11px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
    for(const [index,{t,d}] of ordered.entries()){
      if(d>950||ExoWorld.structuresBlocked?.({...unit,z:ExoWorld.elevation(unit.x,unit.y)+100},{...t,z:G.level+70}))continue;
      const p=project(t.x,t.y,ExoWorld.elevation(t.x,t.y)+70-ground,c,w,h);if(p.d<35||p.x<30||p.x>w-30||p.y<80||p.y>h-90)continue;
      ctx.globalAlpha=d>600?.4:.8;ctx.strokeStyle='#aacabc';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.stroke();
      if(index===0&&d<600&&d>t.r){const text=t.name+' · '+Math.round(d/18)+' m';ctx.globalAlpha=.8;ctx.strokeStyle='#0a161be6';ctx.lineWidth=3;ctx.strokeText(text,p.x,p.y-12);ctx.fillStyle='#c4d6ca';ctx.fillText(text,p.x,p.y-12);}
    }
    ctx.restore();
  }
  return {panel,summary,schematic,status,overlay};
})();
if(typeof module!=='undefined')module.exports=ExoTrainingUI;
