/* Short live scenes and one complete expedition beyond K–09. The radio never
   pauses walking or asks the player to read a chapter before continuing. */
const ExoFieldStory=(()=>{
 const KEY='exo-field-story-v1',relay={x:5200,y:12230,radius:170,name:'断帆山 · 失联中继'},refuge={x:4284,y:6406};
 const bearing=((Math.atan2(refuge.x-relay.x,-(refuge.y-relay.y))*180/Math.PI)+360)%360;
 let state={heard:[],relayYaw:90,relayPower:false,relayBattery:false,relayComplete:false},queue=[],caption=null,captionLeft=0,root=null,relayPanel=null,last='',lastPanel='';
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v){state.heard=Array.isArray(v.heard)?v.heard.filter(x=>typeof x==='string'):[];state.relayYaw=Number.isFinite(v.relayYaw)?((v.relayYaw%360)+360)%360:90;for(const k of ['relayPower','relayBattery','relayComplete'])state[k]=v[k]===true;}}catch{}
 state.relayPower=state.relayBattery;
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
 const scenes={
  power:[['AEGIS','备用电源接通。主频道没有回应。'],['短波杂音','……咚。咚。']],
  escaped:[['AEGIS','谷口还有灯。沿车辙走，别走进碎石坡。'],['陆寻','前面那盏灭了。左边的检修包里，也许还有电池。']],
  washout:[['AEGIS','停一下。地图上的路已经塌了。'],['陆寻','那就先信眼前的路。东侧有灯。']],
  mother:[['陆寻','母亲走的时候说，三年就回来。'],['陆寻','我把照片放回侧袋。十五年了，先找到活着的人。']],
  captain:[['沈砚 · 残留讯号','如果下面还有人，把他们带回有光的地方。'],['AEGIS','这不是实时呼叫。录音停在逃生舱被锁上的那一刻。']],
  refuge:[['老林','听见脚步了。别关机，让我看看你的瞄准架。'],['老林','东侧接驳坪有几台守卫。先试几枪，把偏差带回来。']],
  stabilizer:[['老林','站稳。最后一颗螺栓……好了。'],['老林','南线中继又断了。河对岸的山脊上有天线，替我把它转回 K–09。'],['AEGIS','旧桥还在。浅滩和碎石坡要先测，别再相信旧地图。']],
  south:[['老林 · 短波','我在维修间守着。把山上的天线接回来，南线的人才能找到我们。']],
  arrival:[['AEGIS','天线偏离了 K–09。先接通电源，再慢慢调整朝向。']],
  linked:[['K–09 · 老林','收到了。你的声音很清楚。'],['老林','我会把南线的人往灯下引。回来吧，维修间给你留了位置。']]
 };
 function say(id,once=true){if(once&&state.heard.includes(id))return false;const rows=scenes[id];if(!rows)return false;if(once){state.heard.push(id);save();}queue.push(...rows.map(([speaker,text])=>({speaker,text,duration:Math.max(4.5,text.length*.16)})));return true;}
 function cue(speaker,text){queue.push({speaker,text,duration:Math.max(4.5,text.length*.14)});}
 function mount(){const field=document.getElementById('exo-field');if(!field)return;if(root?.isConnected&&root.parentNode===field)return;root=document.createElement('aside');root.id='exo-live-radio';root.setAttribute('aria-live','polite');root.setAttribute('aria-label','短波通讯');root.hidden=true;field.appendChild(root);last='';}
 function update(dt,{unit,world,finished=false,reducedMotion=false}={}){
  mount();if(!root)return;
  if(finished&&!state.relayComplete)say('south');
  if(finished&&!world.cave&&!world.interior&&Math.hypot(unit.x-relay.x,unit.y-relay.y)<350)say('arrival');
  if(relayPanel?.isConnected&&(world.cave||world.interior||unit.flight||Math.hypot(unit.x-relay.x,unit.y-relay.y)>230))closeRelay();
  if(caption){captionLeft-=dt;if(captionLeft<=0)caption=null;}
  if(!caption&&queue.length){caption=queue.shift();captionLeft=caption.duration;}
  const key=caption?caption.speaker+caption.text:'';if(key===last)return;last=key;root.hidden=!caption;
  if(caption){root.innerHTML='<span class="live-radio-speaker"></span><p></p><i class="live-radio-wave" aria-hidden="true"></i>';root.querySelector('span').textContent=caption.speaker;root.querySelector('p').textContent=caption.text;}
 }
 function objective(){return state.relayComplete?{id:'homeward',title:'南线有了回应',instruction:'K–09 已收到你的讯号。可以回维修间，也可以沿支路寻找还没亮起的灯。',action:'explore',label:'回到旅途中',point:null,finished:true}:{id:'relay',title:'让南线听见我们',instruction:'沿旧桥和山路登上断帆山，把失联的天线转回 K–09。危险近路可以先派探测车。',action:'relay',label:'接通山脊中继',point:{...relay},x:relay.x,y:relay.y,radius:relay.radius,finished:false};}
 const signal=()=>Math.max(0,Math.cos((state.relayYaw-bearing)*Math.PI/180));
 function openRelay(){mount();if(!root)return;relayPanel?.remove();relayPanel=document.createElement('section');relayPanel.id='exo-relay-console';relayPanel.setAttribute('aria-label','山脊中继控制台');root.parentNode.appendChild(relayPanel);lastPanel='';drawRelay();}
 function drawRelay(){if(!relayPanel?.isConnected)return;const cells=typeof ExoLampRepair==='undefined'?0:ExoLampRepair.summary().cells,key=[state.relayPower,state.relayComplete,state.relayBattery,cells].join(':');if(key===lastPanel){updateSignal();return;}lastPanel=key;
  relayPanel.innerHTML=`<header><span>南线中继 / 手动检修</span><button onclick="Exo.closeRelay()" aria-label="收起中继控制台">×</button></header><h2>${state.relayComplete?'K–09 已接通':'把天线转向维修间'}</h2><p>${state.relayPower?'慢慢旋转天线，接收灯越亮，方向越接近。':'机甲可以临时供电；留下一块电池，这盏灯就能在你离开后继续亮着。'}</p><div class="relay-power"><button ${state.relayBattery||cells<1?'disabled':''} onclick="Exo.relayPower('battery')">留一块电池 · 持续引路</button><button ${state.relayPower?'disabled':''} onclick="Exo.relayPower('mech')">机甲供电 · 45 能量</button></div><label for="relay-bearing">天线朝向 <output id="relay-angle">${Math.round(state.relayYaw)}°</output></label><input id="relay-bearing" type="range" min="0" max="359" step="1" value="${state.relayYaw}" oninput="Exo.relayTurn(+this.value)"><div class="relay-turn"><button onclick="Exo.relayNudge(-5)">向左 5° · Q</button><button onclick="Exo.relayNudge(5)">向右 5° · R</button></div><div class="relay-reception"><i id="relay-signal-bar" style="width:${state.relayPower?signal()*100:0}%"></i></div><p id="relay-signal-text" class="relay-signal" role="status">${!state.relayPower?'未通电':signal()>.97?'K–09 载波稳定，可以呼叫。':signal()>.7?'听见载波了，再慢慢调整。':'只有杂音。维修间在山脊的北偏西方向。'}</p><button id="relay-transmit" class="primary" ${!state.relayPower||signal()<.97||state.relayComplete?'disabled':''} onclick="Exo.relayTransmit()">${state.relayComplete?'呼叫已送达':'呼叫 K–09 · E'}</button><small>${state.relayBattery?'电池将留在这里，给后来的旅人指路。':'临时供电会在你收起控制台后断开。'}</small>`;
 }
 function updateSignal(){if(!relayPanel?.isConnected)return;const find=id=>relayPanel.querySelector('#'+id),input=find('relay-bearing');if(input)input.value=state.relayYaw;find('relay-angle').textContent=Math.round(state.relayYaw)+'°';find('relay-signal-bar').style.width=(state.relayPower?signal()*100:0)+'%';find('relay-signal-text').textContent=!state.relayPower?'未通电':signal()>.97?'K–09 载波稳定，可以呼叫。':signal()>.7?'听见载波了，再慢慢调整。':'只有杂音。维修间在山脊的北偏西方向。';find('relay-transmit').disabled=!state.relayPower||signal()<.97||state.relayComplete;}
 function turn(degrees){if(!Number.isFinite(degrees))return;state.relayYaw=((degrees%360)+360)%360;save();drawRelay();}
 function power(battery=false){state.relayPower=true;if(battery)state.relayBattery=true;save();drawRelay();}
 function transmit(){if(!state.relayPower||signal()<.97||state.relayComplete)return false;state.relayComplete=true;save();say('linked');drawRelay();return true;}
 function closeRelay(){relayPanel?.remove();relayPanel=null;if(!state.relayBattery){state.relayPower=false;save();}}
 return {relay,bearing,say,cue,update,objective,openRelay,closeRelay,drawRelay,turn,power,transmit,signal,get panelOpen(){return !!relayPanel?.isConnected;},get state(){return {...state,heard:[...state.heard]};}};
})();
if(typeof module!=='undefined')module.exports=ExoFieldStory;
