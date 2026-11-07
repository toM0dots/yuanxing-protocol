/* K–09 maintenance annex. One coordinate source for lessons, scenery and collision.
   X/Y are expedition units, Z is height; 18 units = one canyon metre. */
const ExoTrainingGround = (() => {
  const level = 18;
  const fire = {
    name:'K–09 · 瞄准训练场', base:{x:3780,y:7570,r:120}, spawn:{x:3780,y:7860},
    layouts:[[3700,7950,true],[3940,8090,true],[3620,8270,true],[3460,8110,false],[4130,8260,false],[4150,7870,false]],
    bounds:{minX:3310,maxX:4260,minY:7440,maxY:8430},
    fieldOrigin:{x:3600,y:8090}
  };
  const wilds=typeof ExoTerrainWilds!=='undefined'?ExoTerrainWilds:null;
  const terrain = {
    name:'南部原野 · 沿途地形勘测', spawn:wilds?.spawn||{x:4400,y:9770}, validationStart:wilds?.spawn||{x:4400,y:9770},
    trainXY:[[3430,8670],[3740,8670],[4050,8670],[3430,8960],[3740,8960],[4050,8960]],
    testXY:[[3540,9250],[3940,9250],[3540,9510],[3940,9510]],
    bounds:{minX:3320,maxX:4210,minY:8500,maxY:9650}
  };
  if(wilds?.trainingSamples)terrain.trainXY=wilds.trainingSamples.map(p=>[p.x,p.y]);
  if(wilds?.testSamples)terrain.testXY=wilds.testSamples.map(p=>[p.x,p.y]);
  const campaign = {
    start:{x:2050,y:8280,angle:Math.atan2(50,220)}, pod:{x:1900,y:8140}, caution:{x:3708,y:7360},
    approach:[{x:2050,y:8280},{x:2100,y:8060},{x:2190,y:7870},{x:2330,y:7680},{x:2540,y:7540},{x:2770,y:7460},{x:3020,y:7390},{x:3290,y:7350},{x:3500,y:7360},{x:3708,y:7360}],
    shoulders:[{x:2780,y:7900,rx:550,ry:600,height:610},{x:1650,y:7540,rx:600,ry:900,height:520}],
    approachWidth:240,approachFeather:260,
    bypass:[{x:3885,y:7340},{x:3885,y:7160}], exit:{x:3708,y:7060},
    trench:{minX:3400,maxX:3805,minY:7210,maxY:7290,depth:220}
  };
  const terminals = [
    {id:'fire',name:'老林的瞄准训练',x:3780,y:7500,r:115,episode:'EP 07–08',description:'记录射击 → 校准瞄准 → 独立测试'},
    {id:'terrain',name:'南部原野勘测路线',x:terrain.spawn.x,y:terrain.spawn.y,r:115,episode:'沿途学习',description:'调查河岸、山路与洞穴，让模型帮助判断前方路况'}
  ];
  const shelter={x:4000,y:7500,w:340,d:165,roof:level+170};
  const approach = [{x:3708,y:7060},{x:3885,y:7160},{x:3885,y:7340},{x:3780,y:7500}];
  const links = [
    [{x:3708,y:7400},{x:3780,y:7500}],
    [{x:3780,y:7500},{x:3470,y:7500},{x:3320,y:7490},{x:3210,y:7550},{x:3180,y:7760},{x:3180,y:8020},{x:3210,y:8240},{x:3230,y:8425},{x:3330,y:8510},{x:3540,y:8510},{x:3740,y:8510}],
    [{x:3740,y:8510},{x:3810,y:8770},{x:3740,y:9140},{x:3750,y:9450},{x:3850,y:9580},{x:4090,y:9650},{x:4250,y:9750},{x:4400,y:9770}]
  ];
  const bounds={minX:650,maxX:4470,minY:7040,maxY:9870};
  const collisionBoxes = [
    {id:'range-west',x:3320,y:7980,z:level,w:18,d:800,h:115},
    {id:'range-east',x:4240,y:7980,z:level,w:18,d:800,h:115},
    {id:'range-backstop',x:3780,y:8380,z:level,w:938,d:40,h:190},
    {id:'command-roof',x:shelter.x,y:shelter.y,z:shelter.roof,w:shelter.w,d:shelter.d,h:16},
    {id:'command-sign-south',x:4000,y:7586,z:level+188,w:309,d:8,h:44},
    {id:'command-sign-north',x:4000,y:7413,z:level+188,w:309,d:8,h:44},
    ...[[3840,7475],[3840,7565],[4160,7430],[4160,7565]].map(([x,y],i)=>({id:'command-post-'+i,x,y,z:level,w:17,d:17,h:170})),
    {id:'washout',x:(campaign.trench.minX+campaign.trench.maxX)/2,y:7250,z:-240,w:campaign.trench.maxX-campaign.trench.minX,d:80,h:380},
    {id:'escape-pod',...campaign.pod,z:level,w:54,d:110,h:82}
  ];
  const inside=(x,y,b,pad=0)=>x>=b.minX-pad&&x<=b.maxX+pad&&y>=b.minY-pad&&y<=b.maxY+pad;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
  function openingDistance(x,y){let distance=segmentDistance(x,y,campaign.pod,campaign.start);for(let i=1;i<campaign.approach.length;i++)distance=Math.min(distance,segmentDistance(x,y,campaign.approach[i-1],campaign.approach[i]));return distance;}
  function roadDistance(x,y){let distance=Infinity;for(const line of [[campaign.pod,campaign.start],campaign.approach,approach,...links])for(let i=1;i<line.length;i++)distance=Math.min(distance,segmentDistance(x,y,line[i-1],line[i]));return distance;}
  function contains(x,y,pad=0){return inside(x,y,fire.bounds,pad);}
  function reserved(x,y,pad=0){if(!inside(x,y,bounds,150+pad))return false;return contains(x,y,pad)||roadDistance(x,y)<62+pad||Math.hypot(x-campaign.pod.x,y-campaign.pod.y)<130+pad||inside(x,y,campaign.trench,45+pad);}
  function elevation(x,y,base){
    if(!inside(x,y,bounds,150))return base;
    let weight=0;
    for(const b of [fire.bounds]){const d=Math.max(b.minX-x,x-b.maxX,b.minY-y,y-b.maxY,0);weight=Math.max(weight,clamp(1-d/95,0,1));}
    weight=Math.max(weight,clamp(1-(roadDistance(x,y)-38)/65,0,1),clamp(1-(openingDistance(x,y)-campaign.approachWidth/2)/campaign.approachFeather,0,1),clamp(1-(Math.hypot(x-campaign.pod.x,y-campaign.pod.y)-60)/120,0,1));
    // Blend only outside the authored canyon mesh. The annex starts in its open basin.
    if(y<7190)weight*=clamp((y-7100)/90,0,1);
    let shoulder=0;
    for(const p of campaign.shoulders){const q=((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2,broken=.9+.06*Math.sin(x*.021+y*.009)+.04*Math.sin(y*.034-x*.013);shoulder+=p.height*Math.exp(-q*2)*broken;}
    // The opening valley folds out of the existing southern basin. Northward
    // feathering preserves the authored canyon floor and all chapter doors.
    const fade=clamp((y-7150)/200,0,1)*clamp((3350-x)/220,0,1);base+=shoulder*fade;
    const smooth=weight*weight*(3-2*weight);let result=base+(level-base)*smooth;
    const b=campaign.trench;
    if(inside(x,y,b,35)){const brokenEdge=5*Math.sin(x*.043)+3*Math.sin(x*.091),edge=Math.min(x-b.minX,b.maxX-x,y-b.minY+brokenEdge,b.maxY-y-brokenEdge),cut=clamp((edge+26)/44,0,1);result-=cut*cut*(3-2*cut)*b.depth;}
    return result;
  }
  function solid(x,y,z,margin=0){if(!inside(x,y,bounds,50+margin))return false;return collisionBoxes.some(b=>z>b.z-margin&&z<b.z+b.h+margin&&Math.abs(x-b.x)<b.w/2+margin&&Math.abs(y-b.y)<b.d/2+margin);}
  function collide(unit,previous){
    if(!inside(unit.x,unit.y,bounds,50))return;
    const altitude=unit.altitude||0;
    for(const b of collisionBoxes){if(b.z>level+altitude+100||b.z+b.h<level+altitude+10)continue;const hx=b.w/2+25,hy=b.d/2+25,dx=unit.x-b.x,dy=unit.y-b.y;if(Math.abs(dx)>=hx||Math.abs(dy)>=hy)continue;
      if(b.id==='washout'&&previous){unit.x=previous.x;unit.y=previous.y;}else if(hx-Math.abs(dx)<hy-Math.abs(dy))unit.x=b.x+(dx<0?-hx:hx);else unit.y=b.y+(dy<0?-hy:hy);
      unit.vx=(unit.vx||0)*.15;unit.vy=(unit.vy||0)*.15;
    }
  }
  function roof(x,y){if(!inside(x,y,bounds,50))return -Infinity;let height=-Infinity;for(const b of collisionBoxes)if(b.id!=='washout'&&Math.abs(x-b.x)<b.w/2+24&&Math.abs(y-b.y)<b.d/2+24)height=Math.max(height,b.z+b.h);return height;}
  function near(unit){return !unit.flight?terminals.find(p=>Math.hypot(unit.x-p.x,unit.y-p.y)<p.r)||null:null;}
  function region(x,y){
    if(inside(x,y,fire.bounds))return fire.name;
    if(openingDistance(x,y)<350)return x<3300?'K–09 / 迫降支谷':'K–09 / 坍塌旧路';
    for(let i=1;i<approach.length;i++)if(segmentDistance(x,y,approach[i-1],approach[i])<160)return 'K–09 / 维修间旧路';
    return null;
  }
  return {level,fire,terrain,campaign,terminals,shelter,approach,links,bounds,collisionBoxes,contains,reserved,roadDistance,elevation,solid,collide,roof,near,region};
})();
if(typeof module!=='undefined')module.exports=ExoTrainingGround;
