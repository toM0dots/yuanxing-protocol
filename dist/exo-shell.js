/* Shared, on-demand navigation. No scene assets or work added to the frame loop. */
const ExoShell = (() => {
  const sections = [
    ['journey','当前任务','从这里找到下一步，也可以回顾走过的路。','M4 5h6v14H4zM14 5h6v14h-6M7 9h0M17 9h0'],
    ['map','地图','看看附近有什么，选一个想去的地方。','m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16'],
    ['mech','我的机甲','把探索中获得的升级点，用在你喜欢的能力上。','M8 3h8v5H8zM5 11h14v7H5zM8 18v3M16 18v3M2 11v6M22 11v6'],
    ['archive','随身日记','翻开随身的旧日记，看看沿途记下的发现。','M4 4h16v17H4zM8 8h8M8 12h8M8 16h5'],
    ['training','沿途学习','沿路观察、记录，让机甲学会判断前方风险。','m12 3 9 5v8l-9 5-9-5V8zM9 8l7 4-7 4z'],
    ['settings','设置','按你的习惯，调整这段旅程。','M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6']
  ];
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
  function title({hasSortie=false,state,objective,campaign}) {
    return `<section class="exo-intro exo-title"><header class="exo-title-top"><span>远星远征队 <i>·</i> ECHO–9</span><span>EV–04 AEGIS</span></header><div class="exo-intro-content"><span class="exo-tag">ECHO–9 / 失联远征记录</span><h1>远星协议</h1><p class="exo-title-story">和你的机甲一起，找到回家的路。<br>观察、尝试，让每一次判断更可靠。</p><div class="exo-title-status"><span>${hasSortie||campaign?.started?'接着上次的冒险':'你的旅程，从这里开始'}</span><p>${esc(objective.title)}</p><small>驾驶员 ${state.rank} 级 <i>·</i> ${state.xp} 经验 <i>·</i> 自动保存进度</small></div><div class="exo-actions"><button class="hot" onclick="Exo.resume()">${hasSortie||campaign?.started?'继续冒险':'开始冒险'} <span aria-hidden="true">→</span></button><button onclick="Exo.hub('journey')">看看当前任务 <span aria-hidden="true">↗</span></button></div><nav class="exo-title-links" aria-label="标题菜单"><button onclick="Exo.hub('training')">探索与学习</button><button onclick="Exo.freeExplore()">自由探索</button><button onclick="Exo.hub('archive')">随身日记</button><button onclick="Exo.hub('settings')">设置</button><button onclick="Exo.landing()">故事开场</button></nav><p class="exo-disclaimer">${hasSortie?'准备好了，就回到刚才停下的地方。':'不必一开始就懂 AI。跟着青色路灯，一步一步学会。'}</p></div><div class="exo-intro-coordinate"><span>回声之下 · 第一幕</span><br>沿着青灯，寻找归路。</div></section>`;
  }
  function panel({section='journey',content,state,inWorld=false,activity='准备出发',detail=''}) {
    const active=sections.find(s=>s[0]===section)||sections[0];
    return `<section class="exo-shell" data-section="${section}"><div class="exo-console-wear" aria-hidden="true"><span>FIELD REPAIR / 04</span><i></i><b class="exo-crash-id">EV–04</b></div><aside class="exo-shell-rail"><div class="exo-shell-brand"><b>远星协议</b><small>驾驶日志</small><span class="exo-shell-serial" aria-hidden="true">AEGIS / LOGBOOK—04</span></div><nav aria-label="驾驶日志导航">${sections.map(([id,label,desc,path],i)=>`<button id="exo-nav-${id}" ${id===active[0]?'aria-current="page"':''} onclick="Exo.hub('${id}')">${icon(path)}<span>${label}</span><small class="exo-nav-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</small></button>`).join('')}</nav><div class="exo-shell-pilot"><span>EV–04 AEGIS</span><strong>驾驶员 Lv.${state.rank}</strong><small>${state.xp} 经验 · ${state.points} 升级点</small></div></aside><div class="exo-shell-main"><header class="exo-shell-heading"><div><span class="exo-log-overline" aria-hidden="true">EV–04 / FIELD LOG</span><small>${esc(activity)}${inWorld?' · 游戏已暂停':''}</small><h2 tabindex="-1" id="exo-terminal-heading">${esc(detail||active[1])}</h2><p>${esc(active[2])}</p></div><span class="exo-log-page" aria-hidden="true">${String(sections.indexOf(active)+1).padStart(2,'0')}<i>/ 06</i></span></header><div class="exo-shell-content">${content}</div></div><footer class="exo-shell-footer"><span>${inWorld?'驾驶已暂停。准备好后继续。':'任务与记录 · 随时查阅'} <kbd>Esc</kbd></span><div>${inWorld?'<button onclick="Exo.intro()">返回首页</button>':''}<button class="${inWorld?'primary':''}" onclick="closeModal()">${inWorld?'回到游戏':'返回首页'} <span aria-hidden="true">↗</span></button></div></footer></section>`;
  }
  function training({fire=false,terrain=false,trial=false}) {
    const active=fire||terrain||trial;
    return `${active?`<section class="exo-shell-callout"><div><small>当前活动</small><h3>${fire?'瞄准训练':terrain?'野外地形勘测':'战斗练习'}</h3><p>记录已保存，回到世界后可以接着探索。</p></div><button onclick="Exo.endTraining()">结束当前活动</button></section>`:''}<details class="exo-other-modes"><summary>想换个玩法？ <span>战斗练习 · AI 学院</span></summary><div class="exo-mode-row"><div><h3>试试武器，认识异兽</h3><p>选一只异兽，练习攻击和闪避。这是单独的练习，不会推进主线。</p></div><button onclick="Exo.combatTrial()">开始练习 →</button></div><div class="exo-mode-row"><div><h3>AI 学院</h3><p>用图解和小实验，弄懂游戏里的 AI 是怎么学会判断的。</p></div><button onclick="Exo.archive()">去看看 →</button></div></details>`;
  }
  function settings({muted=true,fullCockpit=false,inWorld=false,stats=null}) {
    return `<section class="exo-shell-settings"><div><h3>声音</h3><p>打开后，可以听到操作音效和提示音。</p></div><button id="exo-sound" aria-pressed="${!muted}" onclick="Exo.audioToggle()">声音：${muted?'关':'开'}</button></section><section class="exo-shell-settings"><div><h3>驾驶界面</h3><p>${inWorld?'简洁模式只显示常用信息；完整模式会增加驾驶仪表。':'开始驾驶后，可以在这里切换简洁模式和完整仪表。'}</p></div><button id="exo-cockpit-setting" ${inWorld?'':'disabled'} aria-pressed="${fullCockpit}" onclick="Exo.toggleCockpit()">${fullCockpit?'切换简洁模式':'显示完整仪表'}</button></section><section class="exo-shell-settings"><div><h3>画面状态</h3><p>${stats?`当前帧率 ${esc(stats.fps)} FPS · 帧率越高，动作越流畅`:'开始驾驶后，这里会显示画面流畅度。'}</p></div></section><div class="exo-shell-cards exo-shell-cards-small"><article><h3>操控指南</h3><p>忘了怎么移动、飞行或攻击？随时回来看看。</p><button onclick="Exo.help()">查看按键 →</button></article><article><h3>序章</h3><p>回到故事的开头，重温降落前的最后一段消息。</p><button onclick="closeModal();Exo.landing()">播放短片 →</button></article></div><details class="exo-shell-credits"><summary>制作与素材</summary><p>AEGIS 机甲、ORPHEUS–7 坠舰与 HELIOS 机库使用 Blender 模型。扫描材质：Poly Haven · CC0。</p></details>`;
  }
  function controls(mode='explore') {
    const common=[['W A S D / 方向键','移动'],['鼠标拖动','环绕镜头'],['空格 / Shift','推进'],['Esc','打开 / 关闭驾驶日志'],['M','地图']];
    const special=mode==='fire'?[['F','开火'],['T','切换目标'],['Q / R','微调修正角']]:mode==='terrain'?[['F / E','派出探测车']]:[['F','脉冲炮'],['J','光束军刀'],['K','追踪导弹'],['E','扫描 / 互动'],['V','起飞 / 着陆'],['R / C','上升 / 下降']];
    return `<p class="exo-shell-lead">${mode==='fire'?'瞄准训练':mode==='terrain'?'野外地形勘测':'自由探索'} · 操控指南</p><dl class="exo-key-guide">${[...common,...special].map(([key,action])=>`<div><dt><kbd>${key}</kbd></dt><dd>${action}</dd></div>`).join('')}</dl><p class="exp-hint">触屏：左下摇杆移动，拖动画面旋转视角，右侧按钮攻击与推进。支持多指操作。轻点地面可自动前往；“视角复位”可恢复默认镜头。</p>${mode==='explore'?'<p class="exp-hint">起飞需要开阔地表，着陆需要平坦空地。军刀消耗 12 能量，导弹消耗 30；巡航恢复能量。红色边界之外是致命禁区。</p>':''}<button onclick="Exo.hub('settings')">← 返回设置</button>`;
  }
  function archiveNav(view='records') {
    return `<nav class="exo-shell-subnav" aria-label="随身日记分类"><button ${view==='records'?'aria-current="page"':''} onclick="Exo.journal('records')">随身日记</button><button ${view==='regions'?'aria-current="page"':''} onclick="Exo.journal('regions')">地区图册</button><button ${view==='visual'?'aria-current="page"':''} onclick="Exo.visualArchive()">远星画册</button></nav>`;
  }
  function destinations() {
    return `<details class="exo-shell-destinations"><summary>想直接去目的地？</summary><div class="fc-buttons"><button onclick="Exo.freeExplore()">K–09 层岩峡谷</button><button onclick="Exo.wreckExplore()">ORPHEUS 坠舰荒原</button><button onclick="Exo.flagship()">HELIOS 旗舰机库</button></div></details>`;
  }
  return {sections,title,panel,training,settings,controls,archiveNav,destinations};
})();
if(typeof module!=='undefined')module.exports=ExoShell;
