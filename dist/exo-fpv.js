/* First-person visor readouts (with Exo.toggleView / G): a heading tape across
   the top of the visor and arc gauges for armour and energy in the lower
   corners. The game loop calls update() only while first person is on; DOM
   writes are throttled and skipped when nothing changed. */
const ExoFPV=(()=>{
 const NAMES={0:'北',45:'东北',90:'东',135:'东南',180:'南',225:'西南',270:'西',315:'西北'};
 let root=null,last=0,shown={};
 const arc=(cls,label,side)=>`<div class="fpv-gauge fpv-${side}"><svg viewBox="0 0 120 70" aria-hidden="true"><path class="fpv-arc-bg" d="M10,62 A52,52 0 0 1 110,62"/><path class="fpv-arc ${cls}" d="M10,62 A52,52 0 0 1 110,62" pathLength="100"/></svg><b>--</b><small>${label}</small></div>`;
 function mount(){
  const field=document.getElementById('exo-field');if(!field)return null;
  if(root&&root.isConnected&&root.parentNode===field)return root;
  root=document.createElement('div');root.className='fpv-visor';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="fpv-tape"><div class="fpv-ticks"></div><i class="fpv-caret"></i><span class="fpv-deg">000°</span></div>${arc('fpv-armour','装甲','left')}${arc('fpv-energy','能量','right')}<div class="fpv-speed"><b>0</b><small>km/h</small></div>`;
  field.appendChild(root);shown={};return root;
 }
 function ticks(heading){
  // 150 degrees of tape around the current heading, one tick every 15.
  let html='';const start=Math.ceil((heading-75)/15)*15;
  for(let d=start;d<=heading+75;d+=15){const n=((d%360)+360)%360,x=(d-heading)/150*100+50,name=NAMES[n];html+=`<span style="left:${x.toFixed(2)}%" class="${name?'is-major':''}">${name||(n%30===0?String(n).padStart(3,'0'):'')}</span>`;}
  return html;
 }
 function set(el,key,value,fn){if(shown[key]===value)return;shown[key]=value;fn(el,value);}
 function update(yaw,unit,battle){
  const now=performance.now();if(now-last<66)return;last=now;
  const r=mount();if(!r)return;
  const heading=Math.round((((-yaw*180/Math.PI)%360)+360)%360);
  set(r.querySelector('.fpv-ticks'),'h',heading,(el,h)=>{el.innerHTML=ticks(h);r.querySelector('.fpv-deg').textContent=String(h).padStart(3,'0')+'°';});
  const hp=Math.max(0,Math.min(100,Math.round(battle?.hp??100))),en=Math.max(0,Math.min(100,Math.round(unit?.energy??100)));
  set(r.querySelector('.fpv-left'),'hp',hp,(el,v)=>{el.querySelector('.fpv-arc').style.strokeDasharray=v+' 100';el.querySelector('b').textContent=v;el.classList.toggle('is-low',v<35);});
  set(r.querySelector('.fpv-right'),'en',en,(el,v)=>{el.querySelector('.fpv-arc').style.strokeDasharray=v+' 100';el.querySelector('b').textContent=v;el.classList.toggle('is-low',v<20);});
  // 18 world units are one metre; report ground speed in km/h.
  const kmh=Math.round(Math.hypot(unit?.vx||0,unit?.vy||0)/18*3.6);
  set(r.querySelector('.fpv-speed'),'s',kmh,(el,v)=>{el.querySelector('b').textContent=v;});
 }
 return {update};
})();
if(typeof module!=='undefined')module.exports=ExoFPV;
