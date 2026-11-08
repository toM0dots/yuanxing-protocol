/* Shared asset/render lifecycle: never label the compatibility world as the Blender map. */
const ExoMapStatus=(()=>{
 const assets=new Set(),transfers=new Map();let state='loading',reason='',started=Date.now(),stage='',stageDone=0,stageTotal=1;
 const total=8;
 function loaded(name){assets.add(name);started=Date.now();if(state!=='error'&&!stage)state=assets.size>=total&&![...transfers.values()].some(t=>!t.done)?'preparing':'loading'}
 function progress(name,received,bytes,done=false){transfers.set(name,{received,bytes:Math.max(bytes,received),done});started=Date.now();}
 function phase(detail,completed=0,count=1){if(state==='error')return;state='preparing';stage=detail;stageDone=completed;stageTotal=Math.max(1,count);started=Date.now();}
 function rendered(){if(state!=='error')state='ready'}
 function fail(kind='asset'){state='error';reason=kind}
 function snapshot(){
  if(state==='loading'&&Date.now()-started>90000)fail('timeout');
  const messages={asset:'地图还没有下载完成。检查网络后，可以点击“重新加载”再试一次。',timeout:'地图下载有些慢。检查网络后，可以点击“重新加载”再试一次。',graphics:'浏览器暂时无法显示 3D 地图。请开启浏览器的硬件加速，或换一个支持 WebGL 的浏览器重试。'};
   const rows=[...transfers.values()],bytes=rows.reduce((n,t)=>n+t.bytes,0),received=rows.reduce((n,t)=>n+t.received,0);
   const percent=state==='ready'?100:stage?70+Math.floor(29*Math.min(1,stageDone/stageTotal)):bytes?Math.floor(70*received/bytes):Math.round(assets.size/total*100);
   return {state,initializing:transfers.size>0||!!stage,loaded:assets.size,total,percent:Math.min(100,percent),title:state==='error'?'地图暂时无法打开':state==='ready'?'K–09 · 层岩峡谷已就绪':state==='preparing'?'正在准备出发':'正在带上机甲与沿途的景物',detail:state==='error'?messages[reason]||messages.asset:stage?stage:bytes?`已下载 ${(received/1048576).toFixed(1)} / ${(bytes/1048576).toFixed(1)} MB · 下次进入会使用浏览器缓存`:state==='preparing'?'正在准备峡谷与机甲，请稍等。':`已下载 ${assets.size} / ${total} 组地图资源 · 第一次进入会稍久一些`,blocked:state!=='ready'};
 }
 return {loaded,progress,phase,rendered,fail,snapshot};
})();
if(typeof window!=='undefined')window.ExoAssetProgress=ExoMapStatus;
if(typeof module!=='undefined')module.exports=ExoMapStatus;
