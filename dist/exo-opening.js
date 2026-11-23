/* Playable cockpit awakening. Progress is independent of the Academy and is
   resumable between controls; replay never writes over a player's opening. */
const ExoOpening=(()=>{
 const KEY='exo-opening-v1',stages=['power','release','escape','done'];
 function create({storage,completed=false}={}){
  let stage=completed?'done':'power',replay=false,running=false,ready=false,root=null,shown='',origin=null;
  if(!completed)try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(stages.includes(saved?.stage))stage=saved.stage;}catch{}
  const save=()=>{if(!replay)try{storage?.setItem(KEY,JSON.stringify({stage}));}catch{}};
  function start(point,asReplay=false){running=true;replay=asReplay;origin={x:point.x,y:point.y};if(asReplay)stage='power';ready=false;shown='';return stage!=='done';}
  function act(){if(stage==='power'){stage='release';save();return 'power';}if(stage==='release'&&ready){stage='escape';save();return 'release';}return null;}
  function update(unit,isReady){ready=!!isReady;if(stage==='escape'&&ready&&origin&&Math.hypot(unit.x-origin.x,unit.y-origin.y)>=235&&!unit.flight){stage='done';save();return true;}return false;}
  function mount(parent){if(stage==='done')return;if(root?.isConnected&&root.parentNode===parent)return;root=document.createElement('section');root.id='exo-opening';root.setAttribute('aria-label','迫降驾驶舱');parent.appendChild(root);shown='';}
  function draw(parent){
   if(!running||stage==='done'){root?.remove();root=null;parent?.classList.remove('in-opening','opening-locked');return;}
   if(!parent)return;mount(parent);parent.classList.add('in-opening');parent.classList.toggle('opening-locked',stage!=='escape');
   const key=stage+ready;if(key===shown)return;shown=key;root.dataset.stage=stage;root.classList.toggle('is-ready',ready);
   const copy={power:['备用电源离线','舱盖卡住了。先让机甲醒过来。','接通备用电源','E'],release:['液压锁没有松开','通讯里传来两下敲击。有人还在。',ready?'扳下紧急释放杆':'液压泵正在恢复压力…','E'],escape:['舱盖已打开','先离开残骸。谷口那盏灯还亮着。','WASD / 摇杆 · 驾驶机甲离开残骸','']},c=copy[stage];
   root.innerHTML=`<div class="opening-glass" aria-hidden="true"><i></i><i></i><b>EV–04 / EMERGENCY</b></div><div class="opening-breath" aria-hidden="true"></div><section class="opening-console"><span class="opening-overline">${stage==='power'?'迫降后 · 时间不明':'AEGIS / 辅助电源'}</span><h1>${c[0]}</h1><p role="status">${c[1]}</p>${stage==='escape'?`<div class="opening-move">${c[2]}</div>`:`<button class="opening-switch" ${stage==='release'&&!ready?'disabled':''} onclick="Exo.openingAct()"><i aria-hidden="true"></i><span>${c[2]}</span><kbd>${c[3]}</kbd></button>`}<small>${stage==='escape'?'拖动画面环顾四周 · G 切换视角':'可点击控制杆，也可按 E。'}</small></section>`;
  }
  function finish(){stage='done';save();}
  return {start,act,update,draw,finish,get active(){return running&&stage!=='done';},get locked(){return running&&(stage==='power'||stage==='release');},get stage(){return stage;},get replay(){return replay;}};
 }
 return {create};
})();
if(typeof module!=='undefined')module.exports=ExoOpening;
