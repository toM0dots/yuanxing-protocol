/* Lamp wiring: the junction box opened when repairing a dead lamp. Wires leave
   the battery side in a fixed order; the lamp-head terminals are shuffled.
   Drag a wire to its terminal, or tap the wire then the terminal, or use Tab /
   Enter. Colours fade on old hardware, so every colour also carries a shape. */
const ExoLampWiring=(()=>{
 const NS='http://www.w3.org/2000/svg';
 const WIRES=[
  {color:'#d9a441',name:'琥珀',mark:'●'},{color:'#5fb8a6',name:'青绿',mark:'▲'},
  {color:'#c2553f',name:'锈红',mark:'■'},{color:'#d8d2bd',name:'象牙',mark:'◆'},
  {color:'#6f8fc9',name:'钢蓝',mark:'✚'}
 ];
 let open=null;
 const seeded=seed=>{let s=[...String(seed)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7)||7;return ()=>((s=(s*16807)%2147483647)/2147483647);};
 function el(tag,attrs={},parent){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent?.appendChild(e);return e;}
 const curve=(x1,y1,x2,y2)=>{const m=(x1+x2)/2;return `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`;};
 function sound(ok){try{if(typeof ExoAmbience!=='undefined')ExoAmbience.wire?.(ok);}catch{}}
 function close(done){
  if(!open)return;const o=open;open=null;
  o.dialog.close();o.dialog.remove();
  (done?o.onDone:o.onCancel)?.();
 }
 function start({title='检修灯',seed='lamp',count,onDone,onCancel}={}){
  if(open)close(false);
  const rnd=seeded(seed),n=count||3+Math.floor(rnd()*3),wires=WIRES.slice(0,n);
  const order=wires.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  if(order.every((v,i)=>v===i))order.push(order.shift());
  const dialog=document.createElement('dialog');dialog.className='lamp-wiring';dialog.setAttribute('aria-label','接线修灯');
  dialog.innerHTML=`<header><span class="lw-kicker">现场检修</span><h2>${title}</h2><button class="lw-close" aria-label="取消接线">×</button></header><p class="lw-brief">灯头的线全断了。按颜色和标记把电池端接回灯头端，接对会锁住。</p><div class="lw-board"></div><footer><span class="lw-progress" role="status">0 / ${n} 已接通</span><span class="lw-help">拖动连线 · 或先点线头再点接线柱 · Esc 取消</span></footer>`;
  document.body.appendChild(dialog);
  const W=560,H=72+n*58,L=96,R=W-96,row=i=>58+i*58;
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,class:'lw-svg',role:'group','aria-label':'接线板'},dialog.querySelector('.lw-board'));
  // Housing: battery block on the left, lamp head on the right, worn plate between.
  el('rect',{x:18,y:20,width:52,height:H-40,rx:6,class:'lw-block'},svg);
  el('text',{x:44,y:H-8,class:'lw-label','text-anchor':'middle'},svg).textContent='电池端';
  el('rect',{x:W-70,y:20,width:52,height:H-40,rx:6,class:'lw-block'},svg);
  el('text',{x:W-44,y:H-8,class:'lw-label','text-anchor':'middle'},svg).textContent='灯头端';
  for(let i=0;i<6;i++)el('path',{d:`M${150+rnd()*260},${20+rnd()*(H-40)} l${20+rnd()*60},${rnd()*8-4}`,class:'lw-scratch'},svg);
  const links=el('g',{},svg),live=el('path',{class:'lw-live',d:''},svg);
  const state={done:new Set(),pick:null};
  const left=wires.map((w,i)=>{
   const g=el('g',{class:'lw-node lw-left',tabindex:0,role:'button','aria-label':'电池端 '+w.name+' '+w.mark},svg);
   el('path',{d:`M70,${row(i)} L${L-14},${row(i)}`,stroke:w.color,class:'lw-stub'},g);
   el('circle',{cx:L,cy:row(i),r:15,fill:w.color,class:'lw-cap'},g);
   el('text',{x:L,y:row(i)+5,class:'lw-mark','text-anchor':'middle'},g).textContent=w.mark;
   return {g,i,x:L,y:row(i),w};
  });
  const right=order.map((wi,slot)=>{
   const w=wires[wi],g=el('g',{class:'lw-node lw-right',tabindex:0,role:'button','aria-label':'灯头端 '+w.name+' '+w.mark},svg);
   el('path',{d:`M${R+14},${row(slot)} L${W-70},${row(slot)}`,stroke:w.color,class:'lw-stub lw-faded'},g);
   el('circle',{cx:R,cy:row(slot),r:15,class:'lw-post'},g);
   el('circle',{cx:R,cy:row(slot),r:6,fill:w.color,class:'lw-tag'},g);
   el('text',{x:R+26,y:row(slot)+5,class:'lw-mark lw-mark-faint'},g).textContent=w.mark;
   return {g,wi,x:R,y:row(slot),w};
  });
  const progress=dialog.querySelector('.lw-progress');
  const toSvg=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  function select(a){state.pick=a;left.forEach(n=>n.g.classList.toggle('is-picked',n===a));if(!a)live.setAttribute('d','');}
  function attempt(a,b){
   if(!a||!b||state.done.has(a.i))return;
   if(b.wi===a.i){
    state.done.add(a.i);sound(true);
    el('path',{d:curve(a.x,a.y,b.x,b.y),stroke:a.w.color,class:'lw-link'},links);
    a.g.classList.add('is-done');b.g.classList.add('is-done');a.g.setAttribute('tabindex','-1');b.g.setAttribute('tabindex','-1');
    progress.textContent=state.done.size+' / '+n+' 已接通';select(null);
    if(state.done.size===n){dialog.classList.add('is-powered');progress.textContent='通电了';setTimeout(()=>close(true),900);}
    else left.find(x=>!state.done.has(x.i))?.g.focus();
   }else{
    sound(false);b.g.classList.add('is-wrong');a.g.classList.add('is-wrong');setTimeout(()=>{b.g.classList.remove('is-wrong');a.g.classList.remove('is-wrong');},420);
    progress.textContent='接错了，火花一闪。看清标记再试。';select(null);
   }
  }
  // Pointer: drag from a wire end, or tap wire then terminal.
  let drag=null;
  for(const a of left){
   a.g.addEventListener('pointerdown',e=>{if(state.done.has(a.i))return;e.preventDefault();drag={a,moved:false};select(a);svg.setPointerCapture(e.pointerId);});
   a.g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(a);right.find(b=>!b.g.classList.contains('is-done'))?.g.focus();}});
  }
  svg.addEventListener('pointermove',e=>{if(!drag)return;const p=toSvg(e);drag.moved=true;live.setAttribute('d',curve(drag.a.x,drag.a.y,p.x,p.y));live.setAttribute('stroke',drag.a.w.color);});
  svg.addEventListener('pointerup',e=>{if(!drag)return;const p=toSvg(e),a=drag.a,moved=drag.moved;drag=null;live.setAttribute('d','');
   const b=right.find(b=>Math.hypot(b.x-p.x,b.y-p.y)<30);if(b){attempt(a,b);return;}if(moved)select(null);});
  for(const b of right){
   b.g.addEventListener('click',()=>{if(state.pick)attempt(state.pick,b);});
   b.g.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&state.pick){e.preventDefault();attempt(state.pick,b);}});
  }
  // While the panel is open, no key reaches the mech: keys stop at the dialog.
  dialog.addEventListener('keydown',e=>e.stopPropagation());   // key-ups still pass, so no movement key stays held
  dialog.addEventListener('cancel',e=>{e.preventDefault();close(false);});
  dialog.querySelector('.lw-close').addEventListener('click',()=>close(false));
  open={dialog,onDone,onCancel};
  dialog.showModal();left[0].g.focus();
  return {close:()=>close(false)};
 }
 return {start,get open(){return !!open;},cancel:()=>close(false)};
})();
if(typeof module!=='undefined')module.exports=ExoLampWiring;
