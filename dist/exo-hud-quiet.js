/* Quiet HUD (v95): decides when each text block is fresh or settled. The HUD
   re-renders its markup freely, so this watches content instead of owning it.
   Numbers (distances, counts) are ignored so a ticking distance does not keep
   a block lit. Hold H, hover or focus a block to bring it back. */
const ExoQuietHUD=(()=>{
 const KEY='exo-quiet-hud-v1';
 let on=true;try{on=localStorage.getItem(KEY)!=='off';}catch{}
 const blocks=[
  {sel:'.hud-stack .campaign-hud',hold:n=>3800+n*90,max:11000},
  {sel:'#hud-facility',hold:n=>3200+n*55,max:8000},
  {sel:'#exp-transmission',hold:n=>6500+n*85,max:16000},
  {sel:'#field-observation',hold:n=>7500+n*85,max:18000}
 ];
 const seen=new WeakMap(),MOVE=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ']);
 const now=()=>performance.now();
 let movingUntil=0,lastMove=now(),started=now(),moves=0,peekUntil=0;
 const signature=el=>el.hidden?'':(el.textContent||'').replace(/[\d.]+/g,'#').replace(/\s+/g,' ').trim();
 function tick(){
  const t=now(),body=document.body;if(!body)return;
  body.classList.toggle('q-on',on);
  for(const b of blocks)for(const el of document.querySelectorAll(b.sel)){
   const sig=signature(el);let s=seen.get(el);
   if(!s||s.sig!==sig){s={sig,at:t,hold:Math.min(b.max,b.hold(sig.length))};seen.set(el,s);}
   if(el.matches(':hover')||el.contains(document.activeElement)||t<peekUntil)s.at=t;
   el.classList.toggle('q-settled',on&&!!sig&&t-s.at>s.hold);
  }
  const moving=t<movingUntil;
  body.classList.toggle('q-moving',on&&moving);
  body.classList.toggle('q-idle',!moving&&(t-lastMove>12000||t<peekUntil));
  if(moves>3||t-started>45000)body.classList.add('q-learned');
  const keys=document.querySelector('.hud-keyboard');
  if(keys&&!keys.querySelector('.q-peek-hint')){const hint=document.createElement('span');hint.className='q-peek-hint';hint.innerHTML='<kbd>H</kbd> 提示';keys.appendChild(hint);}
 }
 function moved(extra=1400){movingUntil=now()+extra;lastMove=now();}
 function reveal(ms=6000){peekUntil=now()+ms;tick();}
 addEventListener('keydown',e=>{
  if(e.target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;
  const k=(e.key||'').toLowerCase();
  if(MOVE.has(k)){if(!e.repeat)moves++;moved();}
  else if(k==='h'&&!e.repeat)reveal();
 });
 addEventListener('keyup',e=>{if(MOVE.has((e.key||'').toLowerCase()))moved(1200);});
 addEventListener('pointerdown',e=>{if(e.target?.closest?.('#exo-joystick,#exo-boost')){moves++;moved(1800);}},{passive:true});
 addEventListener('pointermove',e=>{if(e.buttons&&e.target?.closest?.('#exo-joystick'))moved(1200);},{passive:true});
 setInterval(tick,250);
 return {reveal,tick,setEnabled(v){on=!!v;try{localStorage.setItem(KEY,on?'on':'off');}catch{}tick();},get enabled(){return on;}};
})();
if(typeof module!=='undefined')module.exports=ExoQuietHUD;
