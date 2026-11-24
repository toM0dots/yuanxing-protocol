/* The two knocks are an exchange, timed independently of the simulation FPS.
   Replay and old saves retain their own campaign/checkpoint progress. */
const ExoOpening=(()=>{
 const KEY='exo-opening-v1',stages=['power','listen','knock','reply','release','escape','done'];
 function create({storage,completed=false,clock=()=>performance.now(),onKnock=()=>{}}={}){
  let stage=completed?'done':'power',knocks=0,replay=false,running=false,ready=false,root=null,shown='',origin=null,phaseAt=0,sounded=0,lastKnock=-Infinity;
  if(!completed)try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(stages.includes(saved?.stage))stage=saved.stage;knocks=Math.min(1,Math.max(0,saved?.knocks|0));}catch{}
  const save=()=>{if(!replay)try{storage?.setItem(KEY,JSON.stringify({stage,knocks}));}catch{}};
  function phase(next){stage=next;phaseAt=clock();sounded=0;save();}
  function start(point,asReplay=false){running=true;replay=asReplay;origin={x:point.x,y:point.y};if(asReplay){stage='power';knocks=0;}phaseAt=clock();sounded=0;lastKnock=-Infinity;ready=false;shown='';return stage!=='done';}
  function act(){
   if(!running)return null;
   if(stage==='power'){phase('listen');return 'power';}
   if(stage==='knock'&&clock()-lastKnock>=220){lastKnock=clock();knocks++;onKnock(false);if(knocks===2)phase('reply');else save();return 'knock';}
   if(stage==='release'&&ready){phase('escape');return 'release';}return null;
  }
  function update(unit,isReady){
   ready=!!isReady;if(!running)return false;
   if(stage==='listen'||stage==='reply'){
    const elapsed=clock()-phaseAt;
    // A stalled frame must not collapse two audible knocks into one.
    if(sounded===0&&elapsed>=550){onKnock(true);sounded=1;phaseAt=clock()-550;}
    else if(sounded===1&&elapsed>=930){onKnock(true);sounded=2;phaseAt=clock()-930;}
    else if(sounded===2&&elapsed>=1500)phase(stage==='listen'?'knock':'release');
   }
   if(stage==='escape'&&ready&&origin&&Math.hypot(unit.x-origin.x,unit.y-origin.y)>=235&&!unit.flight){phase('done');return true;}return false;
  }
  function mount(parent){if(stage==='done')return;if(root?.isConnected&&root.parentNode===parent)return;root=document.createElement('section');root.id='exo-opening';root.setAttribute('aria-label','迫降驾驶舱');parent.appendChild(root);shown='';}
  function draw(parent){
   if(!running||stage==='done'){root?.remove();root=null;parent?.classList.remove('in-opening','opening-locked');return;}
   if(!parent)return;mount(parent);parent.classList.add('in-opening');parent.classList.toggle('opening-locked',stage!=='escape');
   const key=stage+ready+knocks+sounded;if(key===shown)return;shown=key;root.dataset.stage=stage;root.classList.toggle('is-ready',ready);
   const copy={power:['备用电源离线','舱盖卡住了。先让机甲醒过来。','接通备用电源'],listen:['有声音','短波里传来两下敲击。','听一听…'],knock:['有人在听吗？','按两下舱壁，回应刚才的敲击。',knocks?'再敲一下':'敲击舱壁'],reply:['等一等…','杂音里，又传来两下敲击。','等待回应…'],release:['有人回应了','信号来自谷口。出去找找。',ready?'扳下紧急释放杆':'液压泵正在恢复压力…'],escape:['舱盖已打开','先离开残骸。谷口那盏灯还亮着。','WASD / 摇杆 · 离开残骸']},c=copy[stage],waiting=['listen','reply'].includes(stage),disabled=waiting||stage==='release'&&!ready;
   root.innerHTML=`<div class="opening-glass" aria-hidden="true"><i></i><i></i><b>EV–04 / EMERGENCY</b><span class="opening-signal">${ready?'现场视野 / 裂纹检测':'环境模型不可用 · 正在恢复现场视野'}</span></div><div class="opening-breath" aria-hidden="true"></div><section class="opening-console"><span class="opening-overline">${stage==='power'?'迫降后 · 时间不明':'短波频道 / 信号微弱'}</span><h1>${c[0]}</h1><p role="status">${c[1]}</p>${stage==='escape'?`<div class="opening-move">${c[2]}</div>`:`<button class="opening-switch ${stage==='knock'?'opening-knock':''}" ${disabled?'disabled':''} onclick="Exo.openingAct()"><i aria-hidden="true"></i><span>${c[2]}</span>${stage==='knock'?`<span class="opening-knock-marks" aria-hidden="true"><b class="${knocks>0?'answered':''}"></b><b></b></span>`:''}${waiting?'':'<kbd>E</kbd>'}</button>`}<small>${stage==='escape'?'拖动画面环顾四周 · G 切换视角':waiting?'':stage==='knock'?'每按一次 E，或点击一次，敲一下。':'点击控制杆，或按 E。'}</small></section>`;
  }
  function finish(){stage='done';save();}
  return {start,act,update,draw,finish,get active(){return running&&stage!=='done';},get locked(){return running&&!['escape','done'].includes(stage);},get stage(){return stage;},get replay(){return replay;}};
 }
 return {create};
})();
if(typeof module!=='undefined')module.exports=ExoOpening;
