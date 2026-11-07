/* Stable facility identities, deliberately placed as parts of a landscape.
   One major landmark owns each skyline; these are the supporting entrances,
   work sheds and service stations, not another pair of megastructures. */
const ExoWorldLayout=(()=>{
 const raw=[
  ['camp-0-0',2315.6176421450664,3173.7102634831117,1,'hangar',0,'HELIOS 01 · 旗舰机库'],
  ['camp-0-1',6671,3263,.30,'hangar',0,'旧舰队补给库'],
  ['camp-1-0',4100,4150,.42,'refinery',1,'蓝晶矿道泵站'],
  ['camp-1-1',5000,2150,.27,'refinery',1,'矿区冷却井'],
  ['camp-2-0',12014,2943,.40,'observatory',2,'遗迹测绘站'],
  ['camp-2-1',11597,4764,.26,'observatory',2,'断环档案入口'],
  ['camp-3-0',8250,8500,.45,'habitat',3,'峡谷温室供水站'],
  ['camp-3-1',9000,10400,.28,'habitat',3,'废弃运输站'],
  ['camp-4-0',11001,7559,.42,'relay',4,'盆地离线中继'],
  ['camp-4-1',11796,9227,.23,'relay',4,'风暴监测节点'],
  ['camp-5-0',9242,7270,.40,'mining',5,'玄武岩矿务入口'],
  ['camp-5-1',9372,9171,.25,'mining',5,'旧矿道通风井'],
  ['camp-6-0',15917,7970,.45,'mining',6,'深井货运站'],
  ['camp-6-1',14203,10095,.27,'mining',6,'东支井检修口'],
  ['camp-7-0',16426,3826,.38,'observatory',7,'群峰下站'],
  ['camp-7-1',14553,2951,.25,'observatory',7,'山脊气象站'],
  ['camp-8-0',5800,8400,.27,'hangar',8,'K–09 东侧备件库'],
  ['camp-8-1',8300,10300,.25,'hangar',8,'旧货运线检修口']
 ];
 const facilities=raw.map(([id,x,y,size,type,sector,name])=>({id,x,y,w:1120*size,d:920*size,h:840*size,visualScale:4*size,type,sector,name,entrance:{x,y:y+620*size}}));
 const lifts=[
  {id:'lift-0',x:8000,y:6000,w:546,d:390,h:409.5,visualScale:1.95,type:'lift',sector:5,name:'玄武岩矿井升降站',entrance:{x:8000,y:6270},caveEntrance:{x:7500,y:6300}},
  {id:'lift-1',x:16900,y:9550,w:546,d:390,h:409.5,visualScale:1.95,type:'lift',sector:6,name:'陨落深井升降站',entrance:{x:16900,y:9820},caveEntrance:{x:16400,y:9850}}
 ];
 return {version:2,facilities,lifts,openingCorridor:{minX:2600,maxX:5200,minY:7200,maxY:11300},minimumRouteClearance:130};
})();
if(typeof module!=='undefined')module.exports=ExoWorldLayout;
