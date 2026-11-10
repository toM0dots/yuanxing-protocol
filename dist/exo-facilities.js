/* Deterministic, persistent three-deck expeditions beneath each surface complex. */
const ExoFacilities=(()=>{
 const themes={
  hangar:{name:'重装机库',color:0x62dce9,rooms:['接驳大厅','装甲货仓','警戒闸厅','东侧配电室','机甲装配厅','维修车间','飞行档案室','发动机仓','西侧配电室','补给站','武器试验厅','指挥核心','封存机库'],logs:['旧式机体的维修记录显示：这座设施曾同时维护整支轨道机甲中队。','离站命令被中断。未发出的航行日志仍留在指挥核心中。']},
  refinery:{name:'深层精炼厂',color:0xebb569,rooms:['卸货大厅','原料仓库','净化闸厅','冷却配电室','反应堆大厅','泵机车间','工艺档案室','分离罐区','主控配电室','检修站','压力控制室','精炼核心','废弃滤芯库'],logs:['矿料需要经过三层分离与冷却。主电网断开后，安全系统封闭了下层。','回收日志记载了一种稀有合金，其最后一批样本封存在主控核心。']},
  observatory:{name:'深空观测所',color:0xae9cf0,rooms:['访客中庭','仪器库','警戒大厅','阵列配电室','星图大厅','镜片车间','观测档案室','光谱实验室','信标配电室','维护站','深空通信室','观测核心','隐秘观测舱'],logs:['望远镜捕捉到了星环背后的重复信号。三座地下阵列分别保存一个波段。','观测员留下的最后一行坐标指向核心档案，但没有写下目标的名字。']},
  habitat:{name:'殖民栖息站',color:0x8dd9a3,rooms:['居住中庭','物资仓库','隔离大厅','生命维持室','生态温室','设备工坊','殖民档案室','休眠舱区','循环配电室','医疗站','撤离指挥室','殖民核心','封存休眠室'],logs:['水循环在撤离后仍然运行。温室记录保存着最早一批殖民者的种植方案。','所有休眠舱均已清空，只有中央档案中的返航名单没有被带走。']},
  relay:{name:'轨道中继塔',color:0x70b8ff,rooms:['信号中庭','线缆仓库','屏蔽大厅','天线配电室','通信阵列厅','模块工坊','信号档案室','数据机房','主网配电室','维护站','信道控制室','中继核心','加密机房'],logs:['这座中继塔负责把九个地区的信号送往轨道。停机前，所有频道都收到了同一段噪声。','备用核心仍保留一份离线密钥。重新接通两组供电即可访问下一层。']},
  mining:{name:'行星采掘站',color:0xe9ae6b,rooms:['矿运中庭','矿石仓库','安全闸厅','钻机配电室','重型钻机厅','机械工坊','地质档案室','输送分拣区','矿井配电室','补给站','深层控制室','采掘核心','遗弃矿藏室'],logs:['钻探样本揭示了人工金属层。矿工停止开采后，记录被转移到最深层控制室。','一条封闭支路绕过主传送带，通往仍有能源信号的旧矿藏室。']},
  lift:{name:'地下升降枢纽',color:0x69e1bd,rooms:['升降中庭','设备仓库','检修闸厅','牵引配电室','巨型绞盘厅','维修工坊','运行档案室','备用电池库','安全配电室','救援站','运输控制室','枢纽核心','封存维修舱'],logs:['运输网络不仅通向天然洞网，还连接三层大型维修与控制设施。','紧急撤离程序保留在核心控制器中。完成维护后，可从任意一层撤回地表。']}
 };
 const roomStories=globalThis.ExoRoomStoryData||(typeof require==='function'?require('./exo-room-story-data.js'):null);
 const layouts=new Map(),records={},dressing=new Map();let active=null,dirty=false,savedAt=0;
 try{const raw=JSON.parse(localStorage.getItem('exo-facilities-v1')||'{}');for(const [id,s] of Object.entries(raw)){if(!/^(camp-\d-\d|lift-\d|k09-hero-hangar)$/.test(id)||!s||typeof s!=='object')continue;records[id]={visited:Array.isArray(s.visited)?s.visited.filter(Number.isInteger).filter(v=>v>=0&&v<39):[],relays:Array.isArray(s.relays)?s.relays.filter(Number.isInteger).filter(v=>v>=0&&v<6):[],caches:Array.isArray(s.caches)?s.caches.filter(Number.isInteger).filter(v=>v>=0&&v<12):[],logs:Array.isArray(s.logs)?s.logs.filter(Number.isInteger).filter(v=>v>=0&&v<6):[],cleared:Array.isArray(s.cleared)?s.cleared.filter(Number.isInteger).filter(v=>v>=0&&v<60):[],vault:!!s.vault,seconds:Math.max(0,Math.min(360000,+s.seconds||0))};}}catch{}
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rectDistance=(r,x,y)=>Math.min(r.w/2-Math.abs(x-r.x),r.d/2-Math.abs(y-r.y));
 function progress(s){return records[s.id]||(records[s.id]={visited:[],relays:[],caches:[],logs:[],cleared:[],vault:false,seconds:0});}
 function save(){if(!dirty)return;try{localStorage.setItem('exo-facilities-v1',JSON.stringify(records));dirty=false;}catch{}}
 const seedOf=s=>[...s.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
 function label(s){return s.name||(s.id==='camp-0-0'?'HELIOS 01 · 旗舰机库':themes[s.type].name+' '+String(s.sector+1).padStart(2,'0')+'–'+(s.id.endsWith('1')?'B':'A'));}
 function legacyLayout(s){if(layouts.has(s.id))return layouts.get(s.id);const seed=seedOf(s),theme=themes[s.type],decks=[];
  for(let level=0;level<3;level++){
   const spacing=1200+(seed%3)*50,mirror=(seed+level)%2,vertical=(seed+level)%3===0,width=6800,height=5700,rooms=[],links=[],nodes=[],props=[];
   const transform=(x,y)=>({x:mirror?width-x:x,y});
   for(let i=0;i<12;i++){const row=vertical?i%3:Math.floor(i/4),col=vertical?Math.floor(i/3):i%4,px=vertical?col:row%2?3-col:col,py=vertical&&col%2?2-row:row,p=transform(1000+px*spacing,1050+py*spacing);rooms.push({...p,w:920+(seed+i*17)%3*40,d:900+(i+level)%3*45,id:i,name:theme.rooms[i],kind:i===4?s.type:i===0?'arrival':i===11?'command':i===9?'medical':i===3||i===8?'power':i===6?'archive':'storage'});}
   // Optional wing off the easternmost middle room, mirrored with the blueprint.
   const anchor=rooms.reduce((a,r)=>Math.abs(r.y-(1050+spacing))<10&&(!a||(mirror?r.x<a.x:r.x>a.x))?r:a,null),secret={...transform(1000+3*spacing+1400,1050+spacing),w:780,d:820,id:12,name:theme.rooms[12],kind:'secret'};rooms.push(secret);
   for(let i=1;i<12;i++)links.push({a:rooms[i-1],b:rooms[i],w:320});links.push({a:anchor,b:secret,w:270});
   const corridors=links.map(t=>({x:(t.a.x+t.b.x)/2,y:(t.a.y+t.b.y)/2,w:Math.abs(t.a.x-t.b.x)+t.w,d:Math.abs(t.a.y-t.b.y)+t.w})),rects=[...rooms,...corridors];
   const position=(r,sx=0,sy=0)=>({x:r.x+sx,y:r.y+sy});
   nodes.push({...position(rooms[0],0,200),id:'back',kind:level===0?'exit':'back',name:level===0?'地表接驳舱':'返回上一层',room:0});
   nodes.push({...position(rooms[11],0,-220),id:'next',kind:level===2?'vault':'next',name:level===2?'封存核心':'前往 B'+(level+2)+' 层',room:11});
   for(const [j,i] of [3,8].entries())nodes.push({...position(rooms[i],-250,-180),id:'relay-'+j,kind:'relay',index:level*2+j,name:['东侧供电','西侧供电'][j],room:i});
   for(const [j,i] of [1,5,9,12].entries())nodes.push({...position(rooms[i],i===12?150:230,220),id:'cache-'+j,kind:'cache',index:level*4+j,name:i===12?'隐秘物资箱':'补给箱',room:i});
   for(const [j,i] of [4,6].entries()){const record=typeof ExoLore!=='undefined'&&ExoLore.siteRecord?ExoLore.siteRecord(s,level*2+j):{title:'设施记录 '+(level*2+j+1),body:typeof ExoLore!=='undefined'&&ExoLore.record?ExoLore.record(s.type,level*2+j).body:theme.logs[j]};nodes.push({...position(rooms[i],-280,210),id:'log-'+j,kind:'log',index:level*2+j,clue:typeof ExoFieldClues!=='undefined'?ExoFieldClues.get(s,level*2+j):null,name:record.title,text:record.body+' [B'+(level+1)+' / '+label(s)+']',room:i});}
   for(const r of rooms){if(r.id===0)continue;for(const side of [-1,1])props.push({x:r.x+side*(r.w/2-90),y:r.y+side*(r.d/2-165),w:90,d:200,h:170,kind:r.kind==='archive'?'server':'crate',room:r.id});if(r.id===4)props.push({x:r.x+130,y:r.y-190,w:180,d:230,h:260,kind:s.type,room:r.id});}
   if(s.id==='camp-0-0'){rooms[0].name='轨道接驳机库';rooms[4].name='涡轮装配大厅';rooms[12].name='冷却检修暗室';if(level===2)rooms[11].name='深层反应堆';for(const id of [0,11]){const r=rooms[id];props.push({x:r.x+(id===11?-180:130),y:r.y+(id===11?-220:-190),w:180,d:230,h:275,kind:'reactor',room:id});}for(const side of [-1,1]){const r=rooms[0];props.push({x:r.x+side*320,y:r.y-260,w:150,d:170,h:340,kind:'service-arm',room:0});}}
   const deck={level,width,height,ceiling:520,rooms,links,rects,nodes,props,spawn:position(rooms[0],0,0),end:position(rooms[11],0,0),entry:{...position(rooms[0]),name:'B'+(level+1)+' 接驳大厅',risk:1},routeLength:links.slice(0,11).reduce((sum,t)=>sum+dist(t.a,t.b),0)};
   deck.walls=walls(rects);decks.push(deck);
  }
  const result={id:s.id,structure:s,theme,decks,estimatedMinutes:10};layouts.set(s.id,result);return result;
 }
 // A building's public name defines its working program, independently of the
 // older exterior mesh type. Colors are numeric sRGB hex values for renderers.
 const programs={
  hangar:{name:'撤离与机甲整备',accent:0xb69b62,light:0xffdfac,floor:0x727c7a,wall:0x81867d,shape:'bays',summary:'机甲在这里接受检查、装配和撤离整备。',decks:['接驳与整备','动力与维修','撤离指挥'],rooms:'撤离接驳大厅|装甲备件仓|消磁检查闸|整备供电室|机甲整备大厅|液压维修间|航行记录室|发动机拆装间|应急供电室|驾驶员补给站|撤离装载厅|撤离指挥舱|封存零件库',purposes:'arrival|cargo|bench|power|hangar|bench|archive|hangar|power|battery|cargo|command|cargo',centers:['机甲整备大厅','发动机大修厅','撤离待命机库']},
  logistics:{name:'货运与仓储',accent:0xb4986c,light:0xffe1b3,floor:0x7b7d73,wall:0x7c8074,shape:'freight',summary:'货物在接收区核验，沿装载线进入分区仓位。',decks:['收货与调度','分拣与暂存','封存与发运'],rooms:'货运接收厅|整箱暂存库|货物检查闸|输送线供电室|装卸转运大厅|货架维修间|货运清单室|分拣输送间|发运供电室|包装补给间|发运检查厅|货运调度舱|滞留货物库',purposes:'cargo|cargo|conveyor|power|conveyor|bench|archive|cargo|power|cargo|conveyor|command|cargo',centers:['装卸转运大厅','分拣输送大厅','发运装载大厅']},
  pump:{name:'矿道排水',accent:0x72a6a0,light:0xcce4db,floor:0x667976,wall:0x83968b,shape:'process',summary:'矿道积水先沉降过滤，再由分级泵组提升至地表。',decks:['进水与过滤','加压与分流','深层排水'],rooms:'进水检修厅|滤网备件库|沉砂隔离闸|进水供电室|主泵机房|阀门检修间|排水运行档案|缓冲水罐间|备用泵供电室|密封件补给间|回流控制间|排水调度舱|封存过滤间',purposes:'pump|cargo|pump|power|pump|bench|archive|pump|power|bench|pump|command|pump',centers:['沉砂过滤泵房','分流加压泵房','深层提升泵房']},
  cooling:{name:'矿区冷却循环',accent:0x79a9b0,light:0xcde3ed,floor:0x6b7f85,wall:0x81949a,shape:'split',summary:'热回水经过换热器与冷却列，再送回矿区设备。',decks:['热回水回收','换热与冷却','冷却剂储备'],rooms:'冷却回水厅|管件备件库|泄漏隔离闸|循环供电室|换热列大厅|冷却设备工坊|热负荷记录室|冷却剂储罐间|冷却列供电室|检漏补给间|温差控制间|冷却调度舱|备用换热间',purposes:'cooling|cargo|cooling|power|cooling|bench|archive|pump|power|battery|cooling|command|cooling',centers:['热回水集管厅','换热器列大厅','低温储备大厅']},
  survey:{name:'遗迹测绘',accent:0x9fa4bd,light:0xe3dfd0,floor:0x767d81,wall:0x92938c,shape:'court',summary:'测绘队在这里比对地形、岩芯与遗迹断面的坐标。',decks:['采样与测量','标定与重建','封存测绘成果'],rooms:'样本接收厅|测量仪器库|样本检查闸|测量供电室|立体测绘大厅|光学标定间|测绘成果档案|岩芯比对间|重建阵列供电室|野外补给间|地层复核厅|测绘分析舱|封存样本间',purposes:'survey|cargo|survey|power|survey|bench|archive|survey|power|bench|survey|command|archive',centers:['样本测量大厅','坐标标定大厅','遗迹重建大厅']},
  archive:{name:'断环档案保全',accent:0x9c91ad,light:0xe5d7bd,floor:0x6d7475,wall:0x8f918a,shape:'archive',summary:'纸本、数据匣和离线副本分别存放，检索终端保留转移记录。',decks:['接收与检索','离线库藏','封存与校验'],rooms:'档案接收厅|待编目资料库|除尘检查闸|检索供电室|离线档案大厅|载体修复间|索引校验室|密集资料库|保全供电室|封装补给间|备份核对厅|档案保全舱|封存原件库',purposes:'archive|archive|bench|power|archive|bench|archive|archive|power|cargo|archive|command|archive',centers:['索引检索大厅','离线密集库藏','封存原件大厅']},
  greenhouse:{name:'温室与供水',accent:0x8ba77c,light:0xe1e6bb,floor:0x6d7c68,wall:0x8a967b,shape:'garden',summary:'供水管、营养液与育苗架组成封闭循环，保留撤离前的种植批次。',decks:['净水与育苗','栽培与循环','种源与备用供水'],rooms:'温室供水接驳厅|育苗器材库|种植隔离闸|净水供电室|循环栽培大厅|灌溉检修间|种植批次档案|营养液配制间|温室供电室|营养液补给间|种源检查厅|供水循环控制舱|封存种源间',purposes:'greenhouse|cargo|greenhouse|power|greenhouse|bench|archive|pump|power|greenhouse|greenhouse|command|greenhouse',centers:['净水育苗大厅','循环栽培大厅','种源保全大厅']},
  relay:{name:'离线信号中继',accent:0x7babbc,light:0xcbe0eb,floor:0x657780,wall:0x7d8d92,shape:'switch',summary:'各地区线路在屏蔽机房内交叉接续，离线数据仍有独立电源。',decks:['线路接入','信道交换','离线备份'],rooms:'线路接入厅|线缆备件库|屏蔽隔离闸|输入供电室|交换阵列大厅|模块检修间|信号日志档案|离线机房|备用供电室|电池维护间|信道核对厅|中继路由舱|封存备份机房',purposes:'relay|cargo|relay|power|relay|bench|archive|relay|power|battery|relay|command|relay',centers:['线路配线大厅','信道交换大厅','离线备份大厅']},
  weather:{name:'山地气象监测',accent:0xb3a078,light:0xd9e3e5,floor:0x747c7c,wall:0x8c928b,shape:'ridge',summary:'风压、雨量与电磁扰动经独立传感线路进入地下标定间。',decks:['传感接入','校准与比对','预警与存档'],rooms:'传感接入大厅|探头备件库|气密检查闸|传感供电室|气象标定大厅|探头检修间|历史天气档案|风压比对间|预警供电室|野外观测补给间|预警核对厅|天气分析舱|封存观测间',purposes:'weather|cargo|weather|power|weather|bench|archive|weather|power|battery|weather|command|weather',centers:['传感标定大厅','风压比对大厅','预警校验大厅']},
  mining:{name:'矿务与采掘',accent:0xb59465,light:0xffd9a7,floor:0x7b776a,wall:0x888272,shape:'mine',summary:'钻探、岩芯分拣与矿务调度分区运作，检修线避开输送设备。',decks:['矿样与检修','钻探与分拣','深层矿务'],rooms:'矿务接驳大厅|矿具备件库|粉尘隔离闸|钻探供电室|钻机检修大厅|刀具维修间|矿务地层档案|矿样分拣间|输送供电室|矿工补给间|深层检查厅|矿务调度舱|封存岩芯库',purposes:'drill|cargo|ventilation|power|drill|bench|archive|conveyor|power|battery|survey|command|survey',centers:['矿样检修大厅','重型钻机大厅','深层岩芯大厅']},
  ventilation:{name:'矿道通风',accent:0x89a59a,light:0xd6e3cf,floor:0x707b76,wall:0x89948a,shape:'duct',summary:'送风、回风与过滤列隔开布置，风门记录标出旧矿道封闭的顺序。',decks:['进风与过滤','主风机与风门','回风与应急'],rooms:'进风检查厅|滤网备件库|粉尘隔离闸|送风供电室|主风机大厅|风门检修间|通风运行档案|回风过滤间|应急风机供电室|防护补给间|风量复核厅|通风调度舱|封存滤芯间',purposes:'ventilation|cargo|ventilation|power|ventilation|bench|archive|ventilation|power|battery|ventilation|command|ventilation',centers:['进风过滤大厅','主风机大厅','应急回风大厅']},
  lift:{name:'牵引与升降',accent:0xaf9c74,light:0xffdfb5,floor:0x727b78,wall:0x898d83,shape:'shaft',summary:'牵引绞盘、制动器与救援设备围绕升降井布置。',decks:['装载与牵引','制动与维护','救援与控制'],rooms:'升降接驳大厅|牵引备件库|装载安全闸|牵引供电室|绞盘机房|制动维修间|升降运行档案|备用电池间|安全供电室|救援器材间|轿厢检查厅|升降调度舱|封存牵引间',purposes:'winch|cargo|cargo|power|winch|bench|archive|battery|power|bench|winch|command|winch',centers:['牵引绞盘大厅','制动检修大厅','应急救援大厅']}
 };
 const sitePrograms={'camp-0-0':'hangar','camp-0-1':'logistics','camp-1-0':'pump','camp-1-1':'cooling','camp-2-0':'survey','camp-2-1':'archive','camp-3-0':'greenhouse','camp-3-1':'logistics','camp-4-0':'relay','camp-4-1':'weather','camp-5-0':'mining','camp-5-1':'ventilation','camp-6-0':'logistics','camp-6-1':'mining','camp-7-0':'lift','camp-7-1':'weather','camp-8-0':'logistics','camp-8-1':'logistics','lift-0':'lift','lift-1':'lift','k09-hero-hangar':'hangar'};
 const paths={
  bays:[[0,0],[1,0],[2,0],[3,0],[3,1],[2,1],[1,1],[0,1],[0,2],[1,2],[2,2],[3,2]],
  freight:[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[4,1],[3,1],[2,1],[1,1],[0,1]],
  process:[[0,0],[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[1,2],[2,2],[2,3],[1,3],[0,3]],
  split:[[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[3,0],[3,1],[2,1],[2,2],[3,2]],
  court:[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]],
  archive:[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[2,2],[1,2],[0,2],[0,1],[1,1],[2,1]],
  garden:[[0,0],[0,1],[0,2],[0,3],[1,3],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2],[2,3]],
  switch:[[0,0],[1,0],[1,1],[0,1],[0,2],[1,2],[2,2],[3,2],[3,1],[2,1],[2,0],[3,0]],
  ridge:[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3],[4,3],[4,4],[5,4],[5,5],[6,5]],
  mine:[[0,0],[0,1],[1,1],[1,2],[2,2],[2,3],[3,3],[3,2],[4,2],[4,1],[5,1],[5,0]],
  duct:[[0,0],[1,0],[2,0],[2,1],[3,1],[4,1],[5,1],[5,2],[4,2],[3,2],[2,2],[1,2]],
  shaft:[[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[1,3],[0,3],[0,2],[0,1],[1,1],[1,2]]
 };
 function programFor(s){const id=sitePrograms[s.id]||({refinery:'pump',observatory:'survey',habitat:'greenhouse',mining:'mining',relay:'relay',lift:'lift'}[s.type]||'hangar'),base=programs[id],program={...base,id};
  if(s.id==='camp-3-1'){program.name='旧站客货转运';program.decks=['接驳与行李','货物转运','末班调度'];program.summary='站台接续的客货线路已经停运，行李与货箱仍留在分拣区。';program.centers=['行李分拣大厅','货物转运大厅','末班发运大厅'];program.rooms='旧站接驳厅|滞留行李库|票货检查闸|站台供电室|行李分拣大厅|输送线维修间|末班运行档案|货物暂存间|发运供电室|包装补给间|装载检查厅|旧站调度舱|无人认领行李库';}
  if(s.id==='camp-6-0'){program.name='深井货物提升';program.decks=['井口接货','提升与分拣','发运调度'];program.summary='深井货物经提升机送入分拣线，再由地表运走。';program.centers=['井口接货大厅','货物提升大厅','分拣发运大厅'];program.rooms='井口接货厅|矿箱暂存库|载重检查闸|提升供电室|货物提升大厅|吊具维修间|深井货单室|分拣输送间|发运供电室|捆扎补给间|矿箱复核厅|货运提升调度舱|滞留矿箱库';}
  if(s.id==='camp-8-0'){program.name='机甲备件仓储';program.decks=['备件接收','分类与封存','配发与追踪'];program.summary='编号备件按机体系统分区存放，配发记录保留着撤离前的需求。';program.centers=['备件核验大厅','分类备件大厅','配发装箱大厅'];program.rooms='备件接收厅|装甲备件库|零件检查闸|库区供电室|分类备件大厅|零件修复间|配发记录室|动力备件库|配发供电室|包装耗材间|配件核对厅|备件配发舱|封存旧型号库';}
  if(s.id==='camp-8-1'){program.name='货运线检修';program.decks=['车辆接检','轨道与牵引检修','复检与放行'];program.summary='检修线承接旧货运线的车辆与牵引机构，检查台仍保留未完成工单。';program.centers=['货运车辆接检厅','牵引检修大厅','放行复检大厅'];program.rooms='检修接车厅|轮组备件库|车辆安全闸|检修供电室|牵引检修大厅|制动维修间|检修工单室|轨道部件间|复检供电室|检修补给间|放行复检厅|检修调度舱|停用吊具间';program.purposes='bench|cargo|bench|power|winch|bench|archive|bench|power|cargo|bench|command|winch';}
  if(s.id==='camp-6-1'){program.name='支井机械检修';program.centers=['支井设备检查厅','钻具维修大厅','支井复检大厅'];program.summary='东支井设备在这里拆检，故障零件与检修记录按批次保留。';}
  if(s.id==='camp-7-0'){program.name='群峰索道下站';program.decks=['索道接驳','牵引与制动','救援与调度'];program.centers=['索道牵引大厅','制动维护大厅','山地救援大厅'];program.summary='山地索道在此接入地下牵引机房，制动与救援设施保留着停运记录。';}
  return program;
 }
 function programLayout(s){
  if(layouts.has(s.id))return layouts.get(s.id);
  const seed=seedOf(s),program=programFor(s),theme={...themes[s.type],name:program.name,color:program.accent,logs:[program.summary,program.summary]},decks=[];
  // Three work stages use different aisle proportions and route orientations.
  // Every adjacent numbered room remains directly connected for navigation/save compatibility.
  for(let level=0;level<3;level++){
   const base=paths[program.shape],mirror=(seed+level)%2,turn=level===1,stretch=level===2;
   const xStep=program.id==='logistics'?1320:program.id==='greenhouse'?1460:program.id==='weather'?1220:1360;
   const yStep=program.id==='archive'?1220:program.id==='ventilation'?1520:program.id==='lift'?1450:1330;
   const raw=base.map(([x,y])=>turn?[y,x]:[x,y]),maxX=Math.max(...raw.map(p=>p[0])),maxY=Math.max(...raw.map(p=>p[1]));
   const width=2100+maxX*xStep+(stretch?240:0),height=2100+maxY*yStep,rooms=[],links=[],nodes=[],props=[];
   const names=program.rooms.split('|'),purposes=program.purposes.split('|');
   for(let i=0;i<12;i++){
    const [gx,gy]=raw[i],x=1000+(mirror?maxX-gx:gx)*xStep+(stretch&&gx>maxX/2?240:0),y=1000+gy*yStep;
    const big=[0,4,7,10,11].includes(i),wide=program.id==='logistics'||program.id==='hangar'||program.id==='greenhouse';
    const w=i===4?(wide?1280:1160):big?(wide?1160:1080):920+((i+level)%3)*40;
    const d=i===4?(program.id==='greenhouse'?1140:1060):big?(program.id==='archive'?900:1040):880+((i+seed)%3)*40;
    const purpose=purposes[i];rooms.push({x,y,w,d,id:i,name:i===4?program.centers[level]:i===0?program.decks[level]+'入口':names[i],kind:i===0?'arrival':i===11?'command':i===3||i===8?'power':i===6?'archive':purpose,purpose});
   }
   const anchor=rooms.reduce((a,r)=>r.x>a.x?r:a,rooms[1]),secret={x:anchor.x+1460,y:anchor.y,w:940,d:940,id:12,name:names[12],kind:'secret',purpose:purposes[12]};rooms.push(secret);
   for(let i=1;i<12;i++)links.push({a:rooms[i-1],b:rooms[i],w:program.id==='logistics'||program.id==='hangar'?390:program.id==='archive'?290:330});links.push({a:anchor,b:secret,w:280});
   const corridors=links.map(t=>({x:(t.a.x+t.b.x)/2,y:(t.a.y+t.b.y)/2,w:Math.abs(t.a.x-t.b.x)+t.w,d:Math.abs(t.a.y-t.b.y)+t.w})),rects=[...rooms,...corridors],position=(r,dx=0,dy=0)=>({x:r.x+dx,y:r.y+dy});
   nodes.push({...position(rooms[0],0,200),id:'back',kind:level===0?'exit':'back',name:level===0?'地表接驳舱':'返回上一层',room:0});
   nodes.push({...position(rooms[11],0,-220),id:'next',kind:level===2?'vault':'next',name:level===2?'封存核心':'前往 B'+(level+2)+' 层',room:11});
   for(const [j,i]of [3,8].entries())nodes.push({...position(rooms[i],-250,-180),id:'relay-'+j,kind:'relay',index:level*2+j,name:names[i],room:i});
   for(const [j,i]of [1,5,9,12].entries())nodes.push({...position(rooms[i],i===12?150:230,220),id:'cache-'+j,kind:'cache',index:level*4+j,name:i===12?'封存物资箱':'维护补给箱',room:i});
   for(const [j,i]of [4,6].entries()){
    const record=typeof ExoLore!=='undefined'&&ExoLore.siteRecord?ExoLore.siteRecord(s,level*2+j):{title:program.name+'记录 '+(level*2+j+1),body:program.summary};
    nodes.push({...position(rooms[i],-280,210),id:'log-'+j,kind:'log',index:level*2+j,clue:typeof ExoFieldClues!=='undefined'?ExoFieldClues.get(s,level*2+j):null,name:record.title,text:record.body+' [B'+(level+1)+' / '+label(s)+']',room:i});
   }
   // Reserved corner pockets keep every door, room center, guard and direct
   // interaction approach clear. Decorative geometry must stay in these bounds.
   const boxClear=(p,a,b,margin=48)=>{
    const hx=p.w/2+margin,hy=p.d/2+margin,dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
    for(const [origin,delta,min,max]of [[a.x,dx,p.x-hx,p.x+hx],[a.y,dy,p.y-hy,p.y+hy]]){if(Math.abs(delta)<.001){if(origin<min||origin>max)return true;}else{const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return true;}}
    return false;
   };
   const powerKind=program.id==='relay'?'battery':program.id==='greenhouse'||program.id==='pump'?'pump':'battery';
   const kindFor=(r)=>r.purpose==='power'?powerKind:r.purpose==='command'?(['survey','weather','relay','archive'].includes(program.id)?program.id:'relay'):r.purpose==='arrival'?(program.id==='hangar'?'hangar':'cargo'):r.purpose==='storage'?'cargo':r.purpose;
   for(const r of rooms){
    const main=kindFor(r),count=['archive','greenhouse'].includes(main)?4:['cargo','pump','cooling','relay'].includes(main)?3:2,kinds=Array(count).fill(main);
    if(r.id===4){kinds[0]=main;kinds[kinds.length-1]=level===2?'battery':'bench';}
    if(r.purpose==='power')kinds.length=2;
    if(program.id==='logistics'&&['camp-8-1','camp-6-0'].includes(s.id)&&[4,7,10].includes(r.id))kinds[0]=s.id==='camp-6-0'?'winch':'bench';
    const reserved=nodes.filter(n=>n.room===r.id).map(n=>[r,n]);for(const t of links)if(t.a===r||t.b===r)reserved.push([t.a,t.b]);
    if([2,5,8,10,11].includes(r.id))reserved.push([{x:r.x+140,y:r.y-150},{x:r.x+140,y:r.y-150}]);
    let placed=0;
    for(const [sx,sy]of [[1,-1],[-1,-1],[-1,1],[1,1]]){
     const kind=kinds[Math.min(placed,kinds.length-1)],hero=r.id===4&&placed===0,w=hero?310:kind==='cargo'?190:kind==='archive'||kind==='greenhouse'?220:180,d=hero?310:kind==='archive'?160:kind==='greenhouse'?250:210,h=hero?330:kind==='archive'?285:kind==='greenhouse'?220:240;
     const p={x:r.x+sx*(r.w/2-w/2-55),y:r.y+sy*(r.d/2-d/2-55),w,d,h,kind,room:r.id,variant:level};
     if(reserved.some(([a,b])=>!boxClear(p,a,b)))continue;
     if(props.some(q=>Math.abs(q.x-p.x)<(q.w+p.w)/2+25&&Math.abs(q.y-p.y)<(q.d+p.d)/2+25))continue;
     props.push(p);if(++placed>=kinds.length)break;
    }
   }
   const deck={level,title:program.decks[level],program:program.id,width:Math.max(width,secret.x+secret.w/2+500),height,ceiling:520,rooms,links,rects,nodes,props,spawn:position(rooms[0]),end:position(rooms[11]),entry:{...position(rooms[0]),name:'B'+(level+1)+' / '+program.decks[level],risk:1},routeLength:links.slice(0,11).reduce((sum,t)=>sum+dist(t.a,t.b),0)};
   deck.walls=walls(rects);decks.push(deck);
  }
  const result={id:s.id,structure:s,theme,program,decks,estimatedMinutes:10};layouts.set(s.id,result);return result;
 }
 function layout(s){
  if(!roomStories)throw Error('Room story layout has not loaded');
  if(s.id!=='camp-0-0')return roomStories.arrange(programLayout(s));
  const plan=legacyLayout(s);if(!plan.program){plan.program=programFor(s);for(const d of plan.decks){d.title=plan.program.decks[d.level];for(const r of d.rooms)r.purpose=r.kind;}}
  return roomStories.arrange(plan);
 }
 function walls(rects){const edges=[];for(const r of rects)for(const side of [-1,1])for(const axis of [0,1]){const at=(axis?r.y:r.x)+side*(axis?r.d:r.w)/2,lo=(axis?r.x:r.y)-(axis?r.w:r.d)/2,hi=(axis?r.x:r.y)+(axis?r.w:r.d)/2;let spans=[[lo,hi]];for(const q of rects){if(q===r)continue;const outside=at+side*.1,qAt=axis?q.y:q.x,qHalf=(axis?q.d:q.w)/2;if(Math.abs(outside-qAt)>=qHalf)continue;const a=(axis?q.x:q.y)-(axis?q.w:q.d)/2,b=(axis?q.x:q.y)+(axis?q.w:q.d)/2;spans=spans.flatMap(([s,e])=>b<=s||a>=e?[[s,e]]:[[s,Math.min(e,a)],[Math.max(s,b),e]].filter(([a,b])=>b-a>.1));}for(const [a,b] of spans)if(b-a>1)edges.push(axis?{x:(a+b)/2,y:at,w:b-a,d:18,axis,side}:{x:at,y:(a+b)/2,w:18,d:b-a,axis,side});}return edges;}
 function enter(s,level=0){save();const plan=layout(s);active={structure:s,plan,level,deck:plan.decks[level],id:'facility-'+s.id+'-'+level,name:label(s),kind:'facility',risk:Math.min(4,2+level)};savedAt=progress(s).seconds;dirty=true;return active;}
 function leave(){save();active=null;}
 function roomAt(u){return active?.deck.rooms.find(r=>rectDistance(r,u.x,u.y)>0)||null;}
 function inside(x,y,margin=0){return !!active&&active.deck.rects.some(r=>rectDistance(r,x,y)>margin);}
 function distance(x,y){return active?Math.max(...active.deck.rects.map(r=>rectDistance(r,x,y))):-Infinity;}
 function solid(x,y,z=65,margin=0){if(!active)return false;if(!inside(x,y,margin)||z>active.deck.ceiling-margin)return true;return solids().some(r=>z<r.h+margin&&Math.abs(x-r.x)<r.w/2+margin&&Math.abs(y-r.y)<r.d/2+margin);}
 function collide(u,previous){if(!active)return;const contact=typeof ExoContact!=='undefined';if(!inside(u.x,u.y,35)&&!(contact&&ExoContact.wall(u,previous,(x,y)=>inside(x,y,35),{material:'metal'})>=0)){if(previous&&inside(previous.x,previous.y,35)){u.x=previous.x;u.y=previous.y;}else{const p=active.deck.rects.map(r=>({x:Math.max(r.x-r.w/2+36,Math.min(r.x+r.w/2-36,u.x)),y:Math.max(r.y-r.d/2+36,Math.min(r.y+r.d/2-36,u.y))})).sort((a,b)=>dist(a,u)-dist(b,u))[0];u.x=p.x;u.y=p.y;}u.vx=u.vy=0;}for(const p of solids()){if(contact){ExoContact.box(u,p,28,{material:p.material||'metal'});continue;}const dx=u.x-p.x,dy=u.y-p.y,hx=p.w/2+28,hy=p.d/2+28;if(Math.abs(dx)<hx&&Math.abs(dy)<hy){if(hx-Math.abs(dx)<hy-Math.abs(dy))u.x=p.x+Math.sign(dx||1)*hx;else u.y=p.y+Math.sign(dy||1)*hy;u.vx=u.vy=0;}}}
 // Hand-dressed furniture registers its footprints here so it is solid too.
 function solids(){const extra=active&&dressing.get(active.id);return extra?active.deck.props.concat(extra):active.deck.props;}
 function setDressing(id,boxes){if(boxes?.length)dressing.set(id,boxes);else dressing.delete(id);}
 function near(u){if(!active)return null;return active.deck.nodes.filter(n=>dist(n,u)<155).sort((a,b)=>dist(a,u)-dist(b,u))[0]||null;}
 function done(n){const p=progress(active.structure);return n.kind==='relay'?p.relays.includes(n.index):n.kind==='cache'?p.caches.includes(n.index):n.kind==='log'?p.logs.includes(n.index):n.kind==='vault'?p.vault:false;}
 function powered(level=active?.level){const p=progress(active.structure);return p.relays.includes(level*2)&&p.relays.includes(level*2+1);}
 function objective(){if(!active)return '';const p=progress(active.structure);return p.vault?'核心已带回 · 继续探索，或返回地表':!powered()?'接通本层电源 '+p.relays.filter(i=>Math.floor(i/2)===active.level).length+'/2 · 靠近橙色终端按 E':active.level<2?'电源已接通 · 去升降舱前往下一层':'电源已接通 · 击败守卫，回收核心';}
 function tick(u,dt,battle){if(!active||dt<=0||battle.down)return;const p=progress(active.structure),room=roomAt(u);p.seconds+=dt;dirty=true;if(room&&!p.visited.includes(active.level*13+room.id)){p.visited.push(active.level*13+room.id);}for(const e of battle.enemies)if(e.hp<=0&&!p.cleared.includes(active.level*20+e.id)){p.cleared.push(active.level*20+e.id);}if(p.seconds-savedAt>5){savedAt=p.seconds;save();}}
 function battle(){const b=ExoSandbox.create();b.cave=true;b.enemies=[];b.message='已进入 '+active.name+' · B'+(active.level+1)+'。沿照明通道前进，找到橙色终端接通电源。按 M 可以查看各个房间。';const p=progress(active.structure);for(const [j,id] of [2,5,8,10,11].entries()){const r=active.deck.rooms[id],level=id===11&&active.level===2?4:1+(j+active.level)%3,e=ExoSandbox.enemy(j,r.x+140,r.y-150,level);if(p.cleared.includes(active.level*20+j)){e.hp=0;e.respawn=Infinity;}b.enemies.push(e);}return b;}
 function interact(u,b){const n=near(u);if(!n)return {message:objective()};const p=progress(active.structure);if(n.kind==='exit')return {exit:true};if(n.kind==='back')return {level:active.level-1,back:true};
  if(done(n))return n.kind==='log'?{message:n.clue?.observation||n.text,log:n.text,title:n.name,event:'log',index:n.index,clue:n.clue,repeat:true}:{message:n.name+' · 已完成，进度已保存。'};
  if(n.kind==='next'){if(!powered())return {message:'升降舱还没有电。先接通本层两处橙色供电终端，按 M 查看它们的位置。'};return {level:active.level+1};}
  if(['relay','vault'].includes(n.kind)&&b.enemies.some(e=>e.hp>0&&dist(e,n)<500))return {message:'附近的守卫还在，暂时无法操作终端。先击败它们再来。'};
  if(n.kind==='relay'){p.relays.push(n.index);b.hp=Math.min(100,b.hp+25);dirty=true;save();return {event:'relay',index:n.index,message:n.name+' 已接通 · 装甲 +25。'+objective()};}
  if(n.kind==='cache'){p.caches.push(n.index);b.scrap+=3;b.hp=Math.min(100,b.hp+20);dirty=true;save();return {message:'补给已回收 · 合金 +3 / 装甲 +20。'};}
  if(n.kind==='log'){p.logs.push(n.index);dirty=true;save();return {event:'log',index:n.index,message:n.clue?.observation||n.text,log:n.text,title:n.name,clue:n.clue,repeat:false};}
  if(n.kind==='vault'){if(p.relays.length<6)return {message:'核心还没有解锁。需要接通三层的全部 6 处电源。'};p.vault=true;b.scrap+=18;dirty=true;save();return {message:'核心已带回，获得 18 份合金。可以继续找物资，或打开地图返回地表。',complete:true,event:'vault'};}
  return {message:objective()};
 }
 return {themes,label,layout,enter,leave,progress,save,inside,distance,solid,collide,setDressing,near,done,powered,objective,tick,battle,interact,roomAt,get active(){return active}};
})();
if(typeof module!=='undefined')module.exports=ExoFacilities;
