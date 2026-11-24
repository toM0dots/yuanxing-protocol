// An explicit playtest link has its own storage, seeded once after EP09.
// Normal game links never enter this path or change their saves.
(()=>{
 if(new URLSearchParams(location.search).get('playtest')!=='systems110')return;
 const real=window.localStorage,prefix='exo-playtest-systems110:';
 const store={getItem:k=>real.getItem(prefix+k),setItem:(k,v)=>real.setItem(prefix+k,String(v)),removeItem:k=>real.removeItem(prefix+k)};
 Object.defineProperty(window,'localStorage',{value:store});window.ExoSystemsPlaytest=true;
 if(!store.getItem('exo-campaign-v1')){
  store.setItem('exo-opening-v1','{"stage":"done"}');
  store.setItem('exo-lamps-v1',JSON.stringify({cells:2,fixed:[],caches:[],drawn:{}}));
  store.setItem('exo-campaign-v1',JSON.stringify({version:1,started:true,done:['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'],routeIndex:4,scanned:[],refugeReached:true,checkpoint:{x:5980,y:7460,angle:0}}));
 }
})();
