/* The field map starts with the walk the player is actually taking. */
const ExoStoryMap=(()=>{
 function panel(u,campaign){
  if(typeof ExoStoryRoute==='undefined')return '';
  const S=ExoStoryRoute,o=campaign?.objective(),sx=x=>(x-1450)/5100*700,sy=y=>(y-5050)/5350*600;
  const path=ps=>ps.map(p=>sx(p.x).toFixed(1)+','+sy(p.y).toFixed(1)).join(' ');
  const active=o?.id==='crash'?0:o?.id==='route'?1:o?.id==='lamps'?2:['mother','captain'].includes(o?.id)?3:['refuge','stabilizer'].includes(o?.id)?4:['model','defense'].includes(o?.id)?5:6;
  const nearby=S.detours.map(p=>({...p,d:Math.hypot(u.x-p.x,u.y-p.y)})).sort((a,b)=>a.d-b.d);
  const terrain=[];
  for(const [x,y,rx,ry]of [[2100,8750,380,850],[3050,6250,640,830],[4160,7400,450,500],[5650,9400,530,350]])terrain.push(`<ellipse cx="${sx(x)}" cy="${sy(y)}" rx="${rx/5100*700}" ry="${ry/5350*600}" fill="#71917b12" stroke="#8d9c7b35" stroke-width="12"/>`);
  const onMap=u.x>=1450&&u.x<=6550&&u.y>=5050&&u.y<=10400;
  const labels=[[8,22],[12,23],[-85,-20],[-52,-10],[-112,34],[-120,30],[12,24]];
  return `<section class="story-field-map"><div class="story-map-heading"><div><span class="campaign-kicker">K–09 / 随身路线图</span><h3>沿着青灯，走进故事</h3></div><span class="story-map-note">支路会绕回主路<br>想继续故事，随时标记当前任务</span></div><svg viewBox="0 0 700 600" role="img" aria-label="从迫降谷经断路、青灯林道、撤离休息点，到维修间与东侧接驳坪的故事路线；三条支路回到主路"><rect x="1" y="1" width="698" height="598" rx="8" fill="#12232b" stroke="#8f9c9166"/>${terrain.join('')}${S.paths.map(p=>`<polyline points="${path(p.points)}" fill="none" stroke="${p.kind==='side'?'#d2ad75':'#9cc9b0'}" stroke-width="${p.kind==='side'?2:4}" stroke-linecap="round" stroke-linejoin="round" ${p.kind==='side'?'stroke-dasharray="5 7"':''}/>`).join('')}${S.detours.map(p=>`<path d="M${sx(p.x)} ${sy(p.y)-6}l6 6-6 6-6-6z" fill="#d2ad75"/><title>${p.name} · 回到${p.returnTo}</title>`).join('')}${S.stops.map((p,i)=>`<g><circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${i===active?14:11}" fill="${i===active?'#cfb885':'#172e34'}" stroke="${i===active?'#f4e2ae':'#a6c7b2'}" stroke-width="2"/><text x="${sx(p.x)}" y="${sy(p.y)+4}" text-anchor="middle" fill="${i===active?'#14272b':'#d6ddd0'}" font-size="12">${i+1}</text><text x="${sx(p.x)+labels[i][0]}" y="${sy(p.y)+labels[i][1]}" fill="#ddd9c4" class="story-map-label" font-size="22">${p.name}</text></g>`).join('')}${o?.point?`<circle cx="${sx(o.x)}" cy="${sy(o.y)}" r="20" fill="none" stroke="#f3cf8c" stroke-dasharray="3 4"/>`:''}${onMap?`<circle cx="${sx(u.x)}" cy="${sy(u.y)}" r="6" fill="#fff7d9" stroke="#12232b" stroke-width="2"/>`:""}</svg><p class="story-map-legend">实线 · 青灯主路　虚线 · 琥珀支路　${onMap?"白点 · 你":"你在图外，可展开九境总览查看位置"}</p><ol class="story-route-order">${S.stops.map((p,i)=>`<li class="${i===active?'is-current':''}"><span>${i+1}</span><div><strong>${p.name}</strong><small>${p.note}</small></div></li>`).join('')}</ol><div class="story-side-paths"><h4>沿途可以绕去看看</h4><p>每条小路都有遗留物，也都有回到青灯的出口。探索不会跳过当前剧情。</p>${nearby.map(p=>`<button onclick="Exo.navigateDetour('${p.id}')"><strong>${p.name}</strong><small>绕行约 ${p.seconds} 秒 · 接回${p.returnTo}</small><span aria-hidden="true">↗</span></button>`).join('')}</div></section>`;
 }
 return {panel};
})();
if(typeof module!=='undefined')module.exports=ExoStoryMap;
