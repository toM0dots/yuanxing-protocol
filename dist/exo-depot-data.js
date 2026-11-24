/* A maintenance yard: the same reusable objects can be moved into Act 1
   after the M3 playtest. The numbers are QA names, not quest counters. */
const ExoDepotData=(()=>{
 const entry={x:5980,y:7460,name:'K–09 东侧备件库',radius:140};
 const at=(id,kind,x,y,extra={})=>({id:'depot:'+id,kind,name:kind,x,y,zone:'depot',material:'metal',physics:'fixed',mass:70,radius:28,state:{rewired:true,powered:false},...extra});
 const socket=(id,kind,x,y,name,extra={})=>at(id,kind,x,y,{name,socket:{capacity:1},...extra});
 const cell=(id,x,y,location='world')=>at(id,'battery',x,y,{name:'应急电池',physics:'carry',mass:8,radius:13,location,state:{charge:1}});
 const setups=[
  {n:1,x:5880,y:7240,caption:'灯箱的电池仓空了。'},
  {n:2,x:6190,y:7270,caption:'两段铜排之间，正好缺一只金属箱。'},
  {n:3,x:6450,y:7300,caption:'水漫过铜脚，泵那端还接着线。'},
  {n:4,x:5750,y:6940,caption:'缝针沿着亮线爬；地上的电池也有电。'},
  {n:11,x:6080,y:6750,caption:'沟两边的电箱，还连着一根旧电缆。'},
  {n:12,x:6450,y:6960,caption:'单槽旁塞着一块备用电池，接线已经发黑。'},
  {n:5,x:6280,y:6660,caption:'门前的机架卡住了，吊环还完好。'},
  {n:6,x:5770,y:6740,caption:'这根旧支柱足够长，倒下后能搭过排水沟。'},
  {n:7,x:6100,y:6550,caption:'卷门连着压板，松开就会落回去。'},
  {n:8,x:6510,y:6620,caption:'高台边留着固定锚桩，可以收索攀上去。'}
 ];
 function placements(){return [
  at('gate','gate',5980,7400,{name:'备件库入口',radius:100,size:[230,130,14],solid:true,state:{open:false}}),
  socket('lamp','lamp',5880,7170,'检修灯'),cell('lamp-cell',5820,7250),
  socket('feed','terminal',6120,7180,'西侧电箱'),cell('feed-cell',6070,7280),
  at('bridge-crate','crate',6190,7310,{name:'铜边工具箱',physics:'carry',mass:32,radius:45,size:[88,54,70],solid:true}),
  at('door','door',6260,7180,{name:'配电间卷门',radius:29,size:[120,140,16],solid:true}),
  at('water','water',6480,7220,{name:'积水检修坑',material:'water',mass:0,radius:115,state:{wet:true,powered:false}}),
  at('pump','pump',6570,7220,{name:'排水泵',radius:32,size:[50,65,45]}),cell('water-cell',6380,7320),
  socket('seam-lamp','lamp',5740,6820,'北侧路灯'),cell('seam-feed',5740,6820,'socket:depot:seam-lamp'),
  at('seam','creature',5740,6840,{name:'缝针',species:'seam',material:'organic',physics:'push',mass:12,radius:18,state:{stunned:0,shockCooldown:0}}),
  at('lure-store','cache',5680,6960,{name:'备用电池匣',radius:24}),cell('lure-cell',5680,6960,'cache:depot:lure-store'),
  socket('cable-feed','terminal',6080,6820,'沟西电箱'),cell('cable-cell',6020,6730),
  at('cable','cable',6190,6820,{name:'架空旧电缆',radius:4,ends:['depot:cable-feed','depot:cable-door']}),
  at('cable-door','door',6300,6820,{name:'东库卷门',radius:28,size:[120,140,16],solid:true}),
  socket('single','terminal',6470,6820,'单槽应急电箱'),cell('single-feed',6470,6820,'socket:depot:single'),cell('extra-cell',6390,6930),
  at('filter','filter',6260,7370,{name:'未拆封滤筒',physics:'carry',mass:18,radius:25,size:[35,55,35]}),
  at('spares','cache',5880,7370,{name:'备用电池箱',radius:26}),cell('spare-a',5880,7370,'cache:depot:spares'),cell('spare-b',5880,7370,'cache:depot:spares'),
  at('reel','reel',5960,7300,{name:'老林留下的牵引卷索',radius:24,state:{taken:false}}),
  at('debris','debris',6280,6510,{name:'卡门的旧机架',physics:'tow',towable:true,mass:35,radius:48,size:[100,62,82],solid:true,hookRadius:13,hookHeight:48}),
  at('debris-door','door',6280,6480,{name:'装卸间门洞',size:[125,145,18],radius:28,solid:true,manualOpen:true,state:{open:true,rewired:true}}),
  at('pylon','pylon',5770,6480,{name:'锈蚀支柱',physics:'tow',towable:true,mass:90,radius:23,height:240,hookRadius:13,hookHeight:130,state:{fallen:false,rewired:true}}),
  at('ditch','gap',5770,6600,{name:'排水沟',material:'stone',radius:95,size:[170,50,120],solid:true}),
  at('cart','cart',6080,6620,{name:'满载零件的平板车',physics:'tow',towable:true,mass:90,radius:48,size:[90,45,130],solid:true,hookRadius:15,hookHeight:30}),
  at('plate','plate',6080,6370,{name:'装卸压板',mass:4,radius:65,threshold:80,size:[130,5,130],state:{pressed:false}}),
  at('plate-door','door',6080,6210,{name:'装卸通道卷门',radius:28,size:[145,145,18],solid:true,controls:['depot:plate']}),
  at('winch-anchor','anchor',6510,6420,{name:'高台锚桩',anchor:true,towable:true,mass:1000,radius:25,hookRadius:15,hookHeight:35}),
  at('wrap-anchor','anchor',6000,6490,{name:'检修锚桩',anchor:true,towable:true,mass:1000,radius:25,hookRadius:18,hookHeight:35}),
  at('anchor-feed','terminal',6000,6450,{name:'锚桩接地电箱',socket:{capacity:1},radius:24}),
  {id:'tow:cable',kind:'cable',name:'牵引索',material:'metal',physics:'fixed',mass:2,radius:2,location:'stowed',ends:[],state:{rewired:true,powered:false}}
 ];}
 const access=[[5350,7580],[5680,7510],[5980,7460],[5960,7300],[5680,7300],[5660,6740],[5770,6740],[6100,6740],[6220,6740],[6280,6670],[6510,6650]].map(([x,y])=>({x,y}));
 function route(from,to){const nearest=p=>access.reduce((a,b,i)=>Math.hypot(b.x-p.x,b.y-p.y)<Math.hypot(access[a].x-p.x,access[a].y-p.y)?i:a,0);let a=nearest(from),b=nearest(to),prefix=[from];if(Math.hypot(from.x-access[a].x,from.y-access[a].y)>400){a=0;prefix=typeof ExoStoryRoute!=='undefined'?ExoStoryRoute.route(from,access[0])||[from,access[0]]:[from,access[0]];}const steps=[];for(let i=a;i!==b;i+=a<b?1:-1)steps.push(access[i]);steps.push(access[b]);return [...prefix,...steps,to].filter((p,i,all)=>!i||Math.hypot(p.x-all[i-1].x,p.y-all[i-1].y)>.1);}
 const workLanes=[[5660,7040,120,690],[5780,7420,360,140],[6280,6610,180,340],[6080,6470,150,580],[5770,6610,140,420],[6510,6540,170,330]];
 function reserved(x,y,pad=0){return workLanes.some(([cx,cy,w,d])=>Math.abs(x-cx)<w/2+pad&&Math.abs(y-cy)<d/2+pad);}
 function elevation(x,y,base){
  // The ditch and the ledge are terrain, so geometry, feet and the worker
  // sample one surface. Smooth skirts join the existing landscape.
  const smooth=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
  if(Math.abs(x-5770)<110&&Math.abs(y-6600)<90)base-=50*smooth((110-Math.abs(x-5770))/30)*smooth((90-Math.abs(y-6600))/30);
  if(Math.abs(x-6510)<155&&Math.abs(y-6400)<135)base+=140*smooth((155-Math.abs(x-6510))/34)*smooth((135-Math.abs(y-6400))/34);
  return base;
 }
 return {entry,setups,placements,elevation,reserved,route};
})();
if(typeof module!=='undefined')module.exports=ExoDepotData;
