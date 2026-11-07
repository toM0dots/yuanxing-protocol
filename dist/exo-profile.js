// Opt-in, local-only diagnostics. Normal play incurs no profiling queries.
(()=>{
 if(!['127.0.0.1','localhost','::1'].includes(location.hostname)||!new URLSearchParams(location.search).has('profile'))return;
 addEventListener('load',()=>{const panel=document.createElement('div');panel.id='region-qa';panel.style.cssText='position:fixed;bottom:0;left:180px;z-index:10000;background:#101923cc;padding:4px;color:white;font:11px monospace';for(let i=0;i<9;i++){const b=document.createElement('button');b.textContent='Region '+(i+1);b.onclick=()=>{closeModal();Exo.inspectRegion(i)};panel.append(b)}const output=document.createElement('span');output.id='qa-stats';panel.append(output);document.body.append(panel);setInterval(()=>{const s=window.ExoPremium?.stats;output.textContent=s?' '+s.fps+' FPS / '+s.draws+' draws':''},1000)});
 const scope='total';
 let previous=0,start=0,stamp=0,frames=0,warm=30,totals={},intervals=[],gl,ext,active=null,pending=[],gpu=[];
 const mark=name=>{const now=performance.now();totals[name]=(totals[name]||0)+now-stamp;stamp=now;};
 const fixed=new URLSearchParams(location.search).has('benchmark');
 window.ExoPerf={fixed,time(now){return fixed?10000:now;},suspend(){previous=0;},
  begin(now){start=stamp=performance.now();if(previous)intervals.push(now-previous);previous=now;},mark,
  gpuBegin(renderer,label='total'){
   if(label!==scope)return;
   if(!gl){gl=renderer.getContext();ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');const info=gl.getExtension('WEBGL_debug_renderer_info');console.info('EXO GPU',info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),'timer',!!ext);}
   if(!ext)return;
   while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
   if(pending.length<4){active=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,active);}
  },
  gpuEnd(label='total'){if(label!==scope)return;if(active){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;}},
  finish(state){mark('overlay/HUD');totals.cpu=(totals.cpu||0)+performance.now()-start;frames++;
   if(warm-->0){totals={};intervals=[];frames=0;gpu=[];return;}
   if(frames<60)return;
   const sorted=intervals.slice().sort((a,b)=>a-b),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
   console.info('EXO PROFILE '+JSON.stringify({...state,benchmark:fixed,fps:+(1000/mean).toFixed(1),p95:+sorted[Math.floor(sorted.length*.95)].toFixed(2),ms:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,+(v/frames).toFixed(2)])),scope,gpu:gpu.length?+(gpu.reduce((a,b)=>a+b,0)/gpu.length).toFixed(2):null}));totals={};intervals=[];frames=0;gpu=[];
  }
 };
})();
