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
  {n:12,x:6450,y:6960,caption:'单槽旁塞着一块备用电池，接线已经发黑。'}
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
  at('spares','cache',5880,7370,{name:'备用电池箱',radius:26}),cell('spare-a',5880,7370,'cache:depot:spares'),cell('spare-b',5880,7370,'cache:depot:spares')
 ];}
 return {entry,setups,placements};
})();
if(typeof module!=='undefined')module.exports=ExoDepotData;
