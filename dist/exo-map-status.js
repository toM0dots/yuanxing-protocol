/* Shared asset/render lifecycle: never label the compatibility world as the Blender map. */
const ExoMapStatus=(()=>{
 const assets=new Set();let state='loading',reason='',started=Date.now();
 const total=8;
 function loaded(name){assets.add(name);if(state!=='error')state=assets.size>=total?'preparing':'loading'}
 function rendered(){if(state!=='error')state='ready'}
 function fail(kind='asset'){state='error';reason=kind}
 function snapshot(){
  if(state==='loading'&&Date.now()-started>90000)fail('timeout');
  const messages={asset:'地图还没有下载完成。检查网络后，可以点击“重新加载”再试一次。',timeout:'地图下载有些慢。检查网络后，可以点击“重新加载”再试一次。',graphics:'浏览器暂时无法显示 3D 地图。请开启浏览器的硬件加速，或换一个支持 WebGL 的浏览器重试。'};
  return {state,loaded:assets.size,total,percent:Math.min(100,Math.round(assets.size/total*100)),title:state==='error'?'地图暂时无法打开':state==='ready'?'K–09 · 层岩峡谷已就绪':state==='preparing'?'快好了，正在准备场景':'正在前往层岩峡谷',detail:state==='error'?messages[reason]||messages.asset:state==='preparing'?'正在准备峡谷与机甲，请稍等。':`已下载 ${assets.size} / ${total} 组地图资源 · 第一次进入会稍久一些`,blocked:state!=='ready'};
 }
 return {loaded,rendered,fail,snapshot};
})();
if(typeof module!=='undefined')module.exports=ExoMapStatus;
