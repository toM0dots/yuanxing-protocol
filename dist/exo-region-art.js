/* On-demand colony survey archive. Images never enter the WebGL scene or frame loop. */
const ExoRegionArt = (() => {
  const labels = {reference:'地标全景', aerial:'高位勘测', approach:'地面路径', interior:'内部空间'};
  const notes = [
    ['迫降之后，仍有人为后来者留灯。','逃生舱的拖痕停在营地边缘，HELIOS 的维修灯仍然亮着。','从高处辨认逃生舱、帐篷与接驳机库；这曾是一处临时收容点。','沿灯标绕过散落物资，门口没有封锁路障。','空机位里的工单没有结清，氧气罐已经被装上撤离车。'],
    ['矿石留在地表，氧气被运往地下。','矿车停在蓝色矿脉旁，列车始终朝向同一个井口。','层层采掘台地曾日夜运转；如今只有备用电路沿轨道亮着。','车轮下的矿粉没有被清扫，人员转运优先于最后一批矿石。','精炼设备已停机，维护灯守着一条尚未复核的频谱记录。'],
    ['人类把营地建在一个更古老的世界上。','破裂的圆环没有殖民地制造标记，考察帐篷搭在它的阴影里。','广场、台阶与地下环形结构沿同一条轴线排列。','脚下台阶比殖民历史更久远，绿色路灯却是后来的人亲手安上的。','穹顶坍塌后，记录仪仍对准大厅中央的环。这里曾经在等待什么？'],
    ['空教室并不意味着没有人回来。','栖息站的温室仍在循环供水，通往下层的桥没有断。','住房、学校和温室共享一条撤离路径，桥上的灯一直亮着。','站在连接桥上，可以看见最后一辆转运车离开的方向。','桌椅留在原位，观察册被孩子带走。下一堂课的日期没有写下。'],
    ['中继塔倒下之后，维护信道还在。','主塔承受了定点打击，外围低功率设施保留下来。','从上方能分清撞击痕迹与主动停机：九境的静默并非同一种毁灭。','折断的桁架横过道路，绿色灯标绕开危险的残骸。','值班席空了，离线设备却没有被砸毁。最后的决定被留给现场的人。'],
    ['岩壁后的三次敲击，还没有得到解释。','地下湖映着矿站的暖光，玄武岩柱把道路带向更深处。','高位平台能看清湖岸、升降塔与相连的栈道。','贴着水面前行，沿灯标可以抵达岩壁里的矿工驿站。','床铺、干燥的靴子与水壶还在。这里为落单者留过一晚的安全。'],
    ['井底露出的，不是另一层岩石。','开采打穿古老金属层之后，巨型钻机停在半空。','环形台地一直下降，最深处的裂缝仍发出红光。','绿色路灯止于安全隔离栏；继续向前，便进入无人保证归程的区域。','控制室里留下了耳机与记录器，最后一次监听没有完成。'],
    ['星环遮住战火，也留下一个短暂窗口。','雪线之上的阵列保持静默，观测站仍等待一次正确的握手。','两座天线与光学穹顶通过桥梁相连，受损天线倒在雪坡里。','结霜的桥通向仍能工作的阵列，缆车停在云海上方。','望远镜仍指向环影的边缘，空椅旁的行李像是随时会被取走。'],
    ['跟着第一盏灯，走进岩层深处。','修理营地靠在层岩崖壁旁，天然拱门通向连续的洞穴。','落石堵住旧路，维护者沿宽阔台地重新标出了绕行路线。','从拱门下回望机库，营地的暖光仍然可见。','洞口的补给箱、工具和氧气瓶说明：这条路不只是矿道，也是归路。']
  ];
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get = id => Number.isInteger(id) ? ExoRegionData[id] : null;
  function discovered(id, earned=[], structures=[]) {
    const known=new Set(earned);
    return known.has('region:'+id) || structures.some(s=>s.sector===id && known.has('facility:'+s.id))
      || (id===5 && known.has('cave:basalt')) || (id===6 && known.has('cave:deep'));
  }
  function imageHTML(image, alt, thumbnail=false) {
    return `<img src="${thumbnail?image.thumb:image.src}" width="${image.width}" height="${image.height}" alt="${esc(alt)}" loading="${thumbnail?'lazy':'eager'}" decoding="async" onerror="ExoRegionArt.imageError(this)">`;
  }
  function imageError(img) {
    if(img.dataset.failed)return;
    img.dataset.failed='true';img.hidden=true;
    const message=document.createElement('span');message.className='region-image-error';message.setAttribute('role','status');message.textContent='影像暂时无法载入。可以切换视角重试，档案文字仍可阅读。';img.parentNode?.appendChild(message);
  }
  function gallery(earned=[], structures=[]) {
    const count=ExoRegionData.filter(r=>discovered(r.id,earned,structures)).length;
    return `<section class="region-index"><div class="exp-eyebrow">COLONY SURVEY / 九境勘测影像</div><h2>灯光还在的地方</h2><p>九个地区，三十六帧影像。沿道路实地抵达，恢复每处营地与建筑留下的私人记录。</p><span class="region-count">已实地发现 ${count} / 9 · 四个视角 / 地区</span><div class="region-grid">${ExoRegionData.map(r=>`<button class="region-card" onclick="Exo.regionArchive(${r.id})">${imageHTML(r.views[0],r.name,true)}<span><small>${String(r.id+1).padStart(2,'0')} / ${discovered(r.id,earned,structures)?'现场记录已恢复':'旧勘测影像 · 等待实地调查'}</small><b>${esc(r.name)}</b><em>${esc(notes[r.id][0])}</em></span></button>`).join('')}</div></section>`;
  }
  function dossier(id, view='reference', earned=[], structures=[], underground=false) {
    const region=get(id);if(!region)return '<p>没有找到这个地区的影像。</p>';
    const image=region.views.find(v=>v.view===view)||region.views[0],index=region.views.indexOf(image),visited=discovered(id,earned,structures);
    return `<article class="region-archive"><div class="exp-eyebrow">ECHO–9 / SURVEY ${String(id+1).padStart(2,'0')} · ${visited?'现场记录已恢复':'旧勘测影像'}</div><div class="region-heading"><div><h2>${esc(region.name)}</h2><p>${esc(notes[id][0])}</p></div><span>${id+1} / 9</span></div><figure class="region-hero">${imageHTML(image,region.name+' · '+labels[image.view])}<figcaption><b>${labels[image.view]}</b><span>${esc(notes[id][index+1])}</span></figcaption></figure><nav class="region-views" aria-label="选择勘测视角">${region.views.map(v=>`<button id="region-view-${v.view}" aria-pressed="${v.view===image.view}" onclick="Exo.regionArchive(${id},'${v.view}',true)">${imageHTML(v,region.name+' · '+labels[v.view],true)}<span>${labels[v.view]}</span></button>`).join('')}</nav><section class="region-field-note"><span>${visited?'AEGIS / 现场记录':'AEGIS / 实地调查'}</span><p>${esc(visited?ExoLore.regions[id][2]:'勘测影像已保存。前往当地营地，寻找仍有电的建筑；私人记录会随探索逐步恢复。')}</p></section><footer><button onclick="Exo.journal('regions')">九境图册</button><button ${id===0?'disabled':''} onclick="Exo.regionArchive(${id-1})">上一地区</button><button ${id===8?'disabled':''} onclick="Exo.regionArchive(${id+1})">下一地区</button>${underground?'<button onclick="Exo.travel()">查看当前层地图</button>':`<button onclick="Exo.navigateRegion(${id})">导航至营地 ↗</button><button class="primary" onclick="Exo.navigateLandmark(${id})">导航至实景地标 ↗</button>`}<button onclick="closeModal()">继续探索</button></footer></article>`;
  }
  function recordArt(entry, structures=[]) {
    let region=null,view='interior';
    if(entry.id.startsWith('region:')){region=Number(entry.id.split(':')[1]);view='reference';}
    else if(Number.isInteger(entry.region)){region=entry.region;view=entry.view||'interior';}
    else if(entry.structure)region=structures.find(s=>s.id===entry.structure)?.sector;
    else if(/^(cave|cavecore):basalt$/.test(entry.id))region=5;
    else if(/^(cave|cavecore):deep$/.test(entry.id))region=6;
    const data=get(region);if(!data)return '';
    const image=data.views.find(v=>v.view===view);
    return `<figure class="region-record">${imageHTML(image,data.name+' · '+labels[view])}<figcaption><span>${esc(data.name)} / ${labels[view]}</span><button onclick="Exo.regionArchive(${region},'${view}')">查看四个视角 ↗</button></figcaption></figure>`;
  }
  function atlasCards(camps, destination) {
    return `<div class="region-atlas-grid">${camps.map((c,i)=>`<article class="region-atlas-card ${destination===i?'atlas-selected':''}"><button class="region-map-image" onclick="Exo.regionArchive(${i})" aria-label="查看${esc(c.name)}的四个视角">${imageHTML(ExoRegionData[i].views[0],c.name,true)}<span>四个视角 ↗</span></button><b>${String(i+1).padStart(2,'0')} / ${esc(c.name)}</b><button onclick="Exo.navigate(${i})">设为驾驶目的地 → · 威胁 Lv.${c.risk}</button></article>`).join('')}</div>`;
  }
  return {gallery,dossier,recordArt,atlasCards,discovered,get,imageError};
})();
if(typeof module!=='undefined')module.exports=ExoRegionArt;
