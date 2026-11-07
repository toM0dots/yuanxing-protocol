/* K–09 field memories, attached to the existing Blender guidance lamps.
   Canyon local metres -> world units (18:1). No additional GPU assets. */
const ExoGreenTrail = (() => {
  const radius = 5.8 * ExoCanyonV2.scale;
  const records = [
    {
      id:'trail:k09:1', name:'路口灯箱', title:'最后一辆车没有等天亮',
      local:[1.1,8.37], stand:[6,8], view:'approach',
      source:'K–09 维护网 / 撤离当夜 / 纸质命令的扫描副本',
      body:'命令最初写着“设备优先”。有人用油污把它划掉，改成了“孩子、伤员、不能自己走的人”。最后一辆运输车没有装矿石，装的是温室的氧气瓶、学校的水箱，还有十七张折叠床。\n\n司机在交接栏留下两行字：“前面道路断了，跟着绿色的灯走。不要跟着天上的闪光。”签名已经被雨水和砂尘磨掉，只剩一个很深的笔尖凹痕。\n\n灯箱里的备用电池是临时接上的。电网早就停了，这盏灯却一直亮到现在。AEGIS 在记录里补上一行：“道路仍可通行。我们会继续往里找。”',
      hint:'沿开阔河床向北，靠近河谷路口的第一组青绿灯。'
    },
    {
      id:'trail:k09:2', name:'旧路检修桩', title:'不是所有告别都来得及说完',
      local:[13,18.87], stand:[9,18], view:'interior',
      source:'K–09 维护网 / 旧路值守器 / 语音转写，末尾损坏',
      body:'“阿遥，你看见这段记录，就说明你已经走过检修桩了。别回头找我。后面的灯有两盏不亮，我去换电池，很快就跟上。”\n\n录音停了六秒。随后传来拉开工具箱、把什么东西塞进衣袋的声音。那个人再次开口时，已经没有刚才那么平静。\n\n“你的红围巾在座位下面。我知道你说不冷。带上吧，夜里会降温。到了驿站，帮我把水烧上。”\n\n录音结束前没有爆炸声，只有一句没能说完的话。AEGIS 无法确认录音者是否归队。检修桩旁的工单却很清楚：两盏灯都修好了，签字时间比最后一辆车离开晚了十九分钟。',
      hint:'沿旧路向北，靠近右侧仍亮着的检修灯。'
    },
    {
      id:'trail:k09:3', name:'林缘补给灯', title:'有人回来过',
      local:[5,26.87], stand:[9,26], view:'reference',
      source:'K–09 维护网 / 林缘补给点 / 不同时期的两份留言',
      body:'补给箱的旧清单上只有三项：水、氧气、应急电池。第四项是手写的：“给落单的人留一份。”\n\n旧封条之下压着一张更晚的维护纸条。没有姓名，也没有精确日期：“灯已经换好。壶也烧过了。我们没能一直等在原地，但沿线都留下了可以过夜的地方。如果你回来，请继续往有灯的地方走。”\n\n新电池的批次晚于撤离日。有人在灾难之后走回过这条路。至于那个人等的人有没有回来，箱子里没有答案。\n\n你把松开的电池盖重新扣紧。AEGIS 没有发送广播，只在本地档案写下：“K–09 的归路仍然畅通。下一位经过这里的人，不必从黑暗里开始。”',
      hint:'继续沿林缘左侧灯带前进，到补给灯旁读一读留下的纸条。'
    }
  ].map((r,i)=>({...r,index:i,region:8,location:'K–09 / '+r.name,reward:35,...ExoCanyonV2.world(...r.local)}));
  const active = (unit,world=ExoWorld) => !world.cave && ExoCanyonV2.inZone(unit.x,unit.y);
  function near(unit,world=ExoWorld) {
    if(!active(unit,world)||unit.flight)return null;
    let best=null,distance=radius;
    for(const r of records){const d=Math.hypot(unit.x-r.x,unit.y-r.y);if(d<distance&&!ExoCanyonV2.blocked(unit,r)){best=r;distance=d;}}
    return best;
  }
  function progress(earned) {
    const has=id=>earned instanceof Set?earned.has(id):earned.includes(id);
    return {count:records.filter(r=>has(r.id)).length,next:records.find(r=>!has(r.id))||null};
  }
  function panel(earned) {
    const state=progress(earned);
    return '<section class="exp-current exp-green-trail"><span>K–09 / 可选探索 · '+state.count+'/3</span><h3>留灯的人</h3><p>'+(state.next?state.next.hint+' 靠近灯标按 E，读一份留下的消息。可以按任何顺序探索。':'你找齐了三份留言。有人在撤离后回来过，为落单的人换好了电池。')+'</p><div class="exp-trail-records">'+records.map(r=>earned.includes(r.id)?'<button onclick="Exo.readRecord(\''+r.id+'\')">✓ '+r.name+' · 重读</button>':'<span>'+String(r.index+1).padStart(2,'0')+' / '+r.name+' · 还没找到</span>').join('')+'</div><p class="exp-hint">每找到一份留言获得 35 经验，找齐三份再得 35 经验。留言会自动保存，随时可以回来重读。</p></section>';
  }
  // Labels use the existing HUD canvas. Never expose a signal through rock.
  function draw(g,{unit,c,w,h},earned,project) {
    if(!active(unit))return;
    const next=progress(earned).next,nearby=near(unit),r=nearby||next;
    if(!r||Math.hypot(unit.x-r.x,unit.y-r.y)>1100||ExoCanyonV2.blocked(unit,r))return;
    const z=ExoWorld.elevation(r.x,r.y)+44-ExoWorld.elevation(c.x,c.y),p=project(r.x,r.y,z,c,w,h);
    if(p.d<20||p.x<45||p.x>w-45||p.y<45||p.y>h-60)return;
    g.save();g.textAlign='center';g.font='600 13px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';g.lineWidth=4;g.strokeStyle='#071a20';g.fillStyle='#b9f7db';
    const text=(nearby?'E · ':'◇ ')+r.name+' · '+Math.round(Math.hypot(unit.x-r.x,unit.y-r.y)/18)+' m';
    g.strokeText(text,p.x,p.y-18);g.fillText(text,p.x,p.y-18);g.beginPath();g.arc(p.x,p.y,4,0,Math.PI*2);g.stroke();g.fill();g.restore();
  }
  return {records,radius,active,near,progress,panel,draw};
})();
if(typeof module!=='undefined')module.exports=ExoGreenTrail;
