/* Perspective 2.5D renderer: projected ground + depth-sorted elevated objects. */
const ExoScene=(()=>{
 const F=680,ALT=350,D=850;
 const labelFont='500 13px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
 const overlayStates=new WeakMap();
 function clearOverlay(g,w,h){
  let state=overlayStates.get(g);
  if(!state){
   state={dirty:true};overlayStates.set(g,state);
   // The transparent HUD is often completely empty while exploring. Repeated
   // full-size clears still submit a new canvas to the browser compositor.
   // Track every painting operation so labels/effects always clear next frame.
   for(const name of ['fill','stroke','fillRect','strokeRect','fillText','strokeText','drawImage','putImageData','drawFocusIfNeeded']){
    const paint=g[name];if(paint)g[name]=function(...args){state.dirty=true;return paint.apply(this,args);};
   }
  }
  if(state.dirty){g.clearRect(0,0,w,h);state.dirty=false;}
 }
 function worldLabel(g,text,x,y){g.font=labelFont;g.textAlign='center';g.lineJoin='round';g.lineWidth=3;g.strokeStyle='#07141de6';g.strokeText(text,x,y);g.fillText(text,x,y);}
 function project(x,y,z,c,w,h){if(c.webgl3D&&Number.isFinite(c.yaw)&&typeof Exo3D!=='undefined')return Exo3D.project(x,y,ExoWorld.elevation(c.x,c.y)+z,c,w,h);const focal=Math.min(F,h*1.15),d=D+c.y-y,s=focal/Math.max(80,d);return {x:w/2+(x-c.x)*s,y:h*.17+(ALT-z)*s,s,d}}
 function unproject(x,y,c,w,h){if(c.webgl3D&&Number.isFinite(c.yaw)&&typeof Exo3D!=='undefined')return Exo3D.unproject(x,y,c,w,h);const focal=Math.min(F,h*1.15),d=ALT*focal/Math.max(30,y-h*.17);return {x:c.x+(x-w/2)*d/focal,y:c.y+D-d}}
 let terrain=null,source=null;
 function groundTexture(image){if(terrain&&source===image)return terrain;if(!image.complete||!image.naturalWidth)return null;source=image;terrain=document.createElement('canvas');terrain.width=2400;terrain.height=1600;const g=terrain.getContext('2d');g.fillStyle='#303b40';g.fillRect(0,0,2400,1600);g.drawImage(image,200,134,2000,1333);for(const [x,y,x2,y2] of [[200,0,400,0],[2200,0,2000,0],[0,134,0,300],[0,1467,0,1300]]){const v=g.createLinearGradient(x,y,x2,y2);v.addColorStop(0,'#303b40');v.addColorStop(1,'#303b4000');g.fillStyle=v;if(y===0)g.fillRect(Math.min(x,x2),134,Math.abs(x2-x),1333);else g.fillRect(200,Math.min(y,y2),2000,Math.abs(y2-y))}return terrain}
 const ridges=[];for(let i=0;i<27;i++){const x=30+i*76;for(const y of [24,1320])ridges.push({x,y,r:65+Math.sin(i*3)*20,z:85+(i*37%90),ridge:true});}for(let i=0;i<17;i++)for(const x of [15,1990])ridges.push({x,y:i*82,r:65+(i*13%35),z:110+(i*27%85),ridge:true});
 function rock(g,r,c,w,h){const p=project(r.x,r.y,0,c,w,h);if(p.d<100||p.x<-r.r*p.s*2||p.x>w+r.r*p.s*2)return;const rx=r.r*p.s,ry=rx*.32,top=project(r.x-12,r.y-10,r.z||r.r*.9,c,w,h);g.fillStyle='#07101466';g.beginPath();g.ellipse(p.x+rx*.25,p.y+ry*.2,rx*1.1,ry,0,0,7);g.fill();g.fillStyle=r.ridge?'#38454e':'#4c595f';g.beginPath();g.moveTo(p.x-rx,p.y);g.lineTo(top.x-rx*.17,top.y+ry*.2);g.lineTo(top.x+rx*.25,top.y);g.lineTo(p.x+rx,p.y);g.closePath();g.fill();g.fillStyle=r.ridge?'#202e38':'#2e3d46';g.beginPath();g.moveTo(top.x+rx*.25,top.y);g.lineTo(p.x+rx,p.y);g.lineTo(p.x+rx*.08,p.y+ry);g.lineTo(top.x-rx*.17,top.y+ry*.2);g.closePath();g.fill();g.strokeStyle='#a5bec033';g.lineWidth=1;g.beginPath();g.moveTo(p.x-rx,p.y);g.lineTo(top.x-rx*.17,top.y+ry*.2);g.lineTo(top.x+rx*.25,top.y);g.stroke()}
 // Names belong to the place the pilot is approaching, not every object on the horizon.
 function landmarkLabels(g,{unit,c,w,h,sites,found}){
  const nav=ExoWorld.navigation?.(unit),destination=nav?.target,ground=ExoWorld.elevation(c.x,c.y),candidates=[];
  const add=(point,name,color,height=70)=>{
   const distance=Math.hypot(point.x-unit.x,point.y-unit.y),selected=destination&&Math.hypot(destination.x-point.x,destination.y-point.y)<125;
   if(distance>(selected?1600:500))return;
   if(ExoWorld.structuresBlocked?.({...unit,z:ExoWorld.elevation(unit.x,unit.y)+100},{...point,z:ExoWorld.elevation(point.x,point.y)+height}))return;
   const q=project(point.x,point.y,ExoWorld.elevation(point.x,point.y)+height-ground,c,w,h);
   if(q.d<35||q.x<55||q.x>w-55||q.y<110||q.y>h-115)return;
   candidates.push({name,color,q,distance,selected});
  };
  if(!ExoWorld.cave&&!ExoWorld.interior){
   for(const camp of ExoWorld.camps)if(Math.hypot(camp.x-unit.x,camp.y-unit.y)>160)add(camp,camp.name,'#a8c8c2',50);
   for(const [i,site] of sites.entries())add(site,found.has(i)?site.name:'未辨认的信号','#bfd2d2',120);
   for(const site of ExoWorld.caves)add(site,site.name,'#a5cbbb',110);
   if(typeof ExoFacilities!=='undefined')for(const building of ExoWorld.structures){const a=building.entrance,near=Math.hypot(a.x-unit.x,a.y-unit.y)<180;add(a,ExoFacilities.label(building)+(near?' · E':''),'#b4d1d2',130);}
  }else if(ExoWorld.cave&&!ExoWorld.interior&&ExoWorld.caveData){add(ExoWorld.entry,'返回地表','#a5cbbb');add(ExoWorld.caveData.core,ExoWorld.cave.id==='survey'?'勘测核心':'矿核','#c8bea1');}
  const shown=[];
  for(const item of candidates.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.distance-b.distance)){
   if(shown.some(other=>Math.abs(other.q.x-item.q.x)<180&&Math.abs(other.q.y-item.q.y)<42))continue;
   g.save();g.globalAlpha=item.selected?.9:.72;g.fillStyle=item.color;worldLabel(g,item.name,item.q.x,item.q.y);g.restore();shown.push(item);if(shown.length===2)break;
  }
 }
 function draw(g,{w,h,c,unit,images,now,motion,footprints,particles,scan,target,found,reduced,rocks,sites,combat,terrain,fireCourse}){
  const rendered=typeof Exo3D!=='undefined'&&Exo3D.render({w,h,c,unit,images,now,motion,rocks,sites,combat,terrain,fireCourse,reduced});c.webgl3D=!!rendered;if(rendered){const status=document.getElementById('exo-render-warning');if(status)status.textContent='';clearOverlay(g,w,h);const ground=ExoWorld.elevation(c.x,c.y);for(const e of combat.enemies){if(e.hp<=0||ExoWorld.interior&&ExoWorld.structuresBlocked({x:unit.x,y:unit.y,z:100},{x:e.x,y:e.y,z:75}))continue;const p=project(e.x,e.y,ExoWorld.elevation(e.x,e.y)+(ExoSandbox.profile(e).height||75)+(e.jumpZ||0)-ground,c,w,h);if(p.d<20||p.d>2500)continue;g.fillStyle='#18252c';g.fillRect(p.x-23,p.y,46,4);g.fillStyle='#edaa83';g.fillRect(p.x-23,p.y,46*e.hp/e.max,4);if(e.id===combat.target){const ready=fireCourse?.active||combat.targetInfo?.kind==='fireable',covered=combat.targetInfo?.kind==='blocked';g.strokeStyle=ready?'#adebd8':covered?'#e6a98d':'#d7cc9e';g.setLineDash(ready?[]:[4,4]);g.strokeRect(p.x-30,p.y-8,60,48);g.setLineDash([]);if(!fireCourse?.active){g.font='10px monospace';g.fillStyle='#f4cfab';worldLabel(g,ExoSandbox.name(e),p.x,p.y-9)}}}landmarkLabels(g,{unit,c,w,h,sites,found});if(scan&&now-scan.time<1500){g.strokeStyle='#98e4ec88';g.beginPath();g.ellipse(w/2,h*.58,(now-scan.time)*.2,(now-scan.time)*.05,0,0,7);g.stroke()}return}
  const warning=document.getElementById('exo-render-warning');if(warning)warning.textContent='此设备未能启动 WebGL，正在使用兼容画面。建议开启浏览器硬件加速。';
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#111e30');sky.addColorStop(.2,'#738b94');sky.addColorStop(.37,'#465861');sky.addColorStop(1,'#1a2831');g.fillStyle=sky;g.fillRect(0,0,w,h);
  // Distant layers use different camera offsets, producing atmospheric parallax.
  for(let layer=0;layer<3;layer++){g.fillStyle=['#465d6a','#3c515e','#324652'][layer];g.beginPath();g.moveTo(0,h*.33);for(let x=0;x<=w+20;x+=20){const q=x+c.x*(.018+layer*.017);g.lineTo(x,h*(.17+layer*.027)-Math.sin(q*.011+layer)*18-Math.sin(q*.023+3)*9)}g.lineTo(w,h*.36);g.closePath();g.fill()}
  const texture=groundTexture(images.surface),top=Math.floor(h*.23);
  for(let sy=top;sy<h;sy+=3){const p=unproject(0,sy,c,w,h),p2=unproject(w,sy+3,c,w,h),left=p.x,span=p2.x-left,wy=p.y;g.fillStyle=`rgb(${39+Math.floor((sy/h)*8)},${52+Math.floor((sy/h)*4)},62)`;g.fillRect(0,sy,w,4);if(texture&&wy>=-134&&wy<1466&&span>0){const a=Math.max(-200,left),b=Math.min(2200,left+span);if(b>a){const dy=Math.max(1,Math.abs(p2.y-wy));g.drawImage(texture,a+200,Math.max(0,wy+134),b-a,Math.min(dy,1600-(wy+134)),(a-left)/span*w,sy,(b-a)/span*w,4)}}}
  for(const f of footprints){const p=project(f.x,f.y,0,c,w,h);if(p.d<100)continue;g.fillStyle='#08111666';g.fillRect(p.x-13*p.s,p.y,7*p.s,4*p.s);g.fillRect(p.x+6*p.s,p.y,7*p.s,4*p.s)}
  for(const [i,s] of sites.entries()){const p=project(s.x,s.y,0,c,w,h);if(p.d<120)continue;g.strokeStyle=found.has(i)?'#a2efcf':'#e4b788';g.lineWidth=1.3;g.beginPath();g.ellipse(p.x,p.y,35*p.s,12*p.s,0,0,7);g.stroke();const t=project(s.x,s.y,62,c,w,h);g.strokeStyle='#9ad8e5aa';g.beginPath();g.moveTo(p.x,p.y);g.lineTo(t.x,t.y);g.stroke();g.fillStyle='#b7eafa';g.fillRect(t.x-3,t.y-3,6,6);g.font='11px system-ui';g.textAlign='center';g.fillStyle='#e4eced';if(Math.hypot(s.x-unit.x,s.y-unit.y)<=500)g.fillText(found.has(i)?s.name:'未辨认的信号',t.x,t.y-12)}
  if(target){const p=project(target.x,target.y,0,c,w,h);g.strokeStyle='#efc893';g.beginPath();g.ellipse(p.x,p.y,14*p.s,5*p.s,0,0,7);g.stroke()}
  if(scan){const age=(now-scan.time)/1000;if(age<2){g.strokeStyle=`rgba(137,234,242,${1-age/2})`;g.beginPath();for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,p=project(scan.x+Math.cos(a)*age*190,scan.y+Math.sin(a)*age*190,0,c,w,h);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)}g.stroke()}}
  const objects=[...ridges,...rocks,...(combat?combat.enemies.filter(e=>e.hp>0).map(e=>({...e,enemy:e})):[]),{x:unit.x,y:unit.y,mech:true}].sort((a,b)=>a.y-b.y);
  for(const o of objects){if(o.enemy){ExoSandbox.enemyDraw(g,o.enemy,project(o.x,o.y,0,c,w,h),combat.target===o.id,combat.time);continue}if(!o.mech){rock(g,o,c,w,h);continue}const p=project(unit.x,unit.y,unit.altitude||0,c,w,h),size=145*p.s,bob=motion.moving&&!reduced?Math.sin(unit.distance*.16)*2:0;g.save();g.translate(p.x,p.y);g.fillStyle='#0007';g.beginPath();g.ellipse(5,3,size*.31,size*.1,0,0,7);g.fill();if(motion.boosting){g.fillStyle='#8aebef99';for(const x of [-size*.19,size*.19]){g.beginPath();g.ellipse(x,-size*.2,6,size*.28,0,0,7);g.fill()}}g.translate(0,bob);g.rotate(motion.moving&&!reduced?Math.sin(unit.distance*.08)*.018:0);if(Math.sin(unit.angle)<-.15)g.scale(-1,1);if(images.mech.complete&&images.mech.naturalWidth){const sw=size*images.mech.naturalWidth/images.mech.naturalHeight;g.drawImage(images.mech,-sw/2,-size,sw,size)}else{g.fillStyle='#b7cbd0';g.fillRect(-20,-65,40,65)}g.restore()}
  for(const p of particles){const q=project(p.x,p.y,5,c,w,h);g.fillStyle=`rgba(178,181,170,${p.t*.23})`;g.beginPath();g.ellipse(q.x,q.y,(5+(1-p.t)*24)*q.s,6*q.s,0,0,7);g.fill()}
  const fog=g.createLinearGradient(0,h*.19,0,h*.51);fog.addColorStop(0,'#b0c5cb88');fog.addColorStop(.35,'#91a9b344');fog.addColorStop(1,'#91a9b300');g.fillStyle=fog;g.fillRect(0,h*.19,w,h*.33);
  if(combat)ExoSandbox.overlay(g,combat,unit,c,w,h,project);
  const edge=Math.min(unit.x-100,1900-unit.x,unit.y-100,1230-unit.y);if(edge<130){g.fillStyle=`rgba(165,182,189,${Math.max(0,(130-edge)/130)*.12})`;g.fillRect(0,0,w,h)}
 }
 return {project,unproject,draw,ridges,clearOverlay};
})();
if(typeof module!=='undefined')module.exports=ExoScene;
