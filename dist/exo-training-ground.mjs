import {drawStoryComposition} from './exo-room-story-art.mjs?v=20261110-props1';
import * as T from './assets/ev01/three.module.mjs';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {createCampusBuilder,createCampusMaterials} from './exo-campus-materials.mjs';
import {scannedMaterial} from './exo-world-details.mjs?v=20261111-ground105';
import {createFieldLampBatch} from './exo-field-lamps.mjs?v=20261107-performance89';

/* Authored maintenance architecture with physical-density scanned PBR surfaces.
   Signs and barriers keep the coordinate contract used by the lesson model. */
export function createTrainingGround(scene,world,data=globalThis.ExoTrainingGround,maps={}){
  // Classic scripts expose a lexical binding rather than a window property.
  data ||= typeof ExoTrainingGround!=='undefined'?ExoTrainingGround:null;
  if(!data)return {root:new T.Group(),surfaceHeight:(x,y)=>world.elevation(x,y),update(){},dispose(){}};
  const root=new T.Group();root.name='K09 / recovered maintenance route';scene.add(root);
  const materials=createCampusMaterials(maps),builder=createCampusBuilder(materials),steel=0x89959b,dark=0x546068,concrete=0xc1b4a0,cyan=0x72b4ab,amber=0xc0955c,paint=0xccbfa0;
  let offset={x:0,y:0};
  const translated=p=>[p[0]+offset.x,p[1],p[2]+offset.y];
  const b={...builder,box:(p,...args)=>builder.box(translated(p),...args),cylinder:(p,...args)=>builder.cylinder(translated(p),...args),sphere:(p,...args)=>builder.sphere(translated(p),...args),beam:(a,c,...args)=>builder.beam(translated(a),translated(c),...args)};
  const fireOffset=data.fire.offset||{x:0,y:0};
  const localBoxes=data.collisionBoxes.map(p=>p.id.startsWith('range-')||p.id.startsWith('command-')?{...p,x:p.x-fireOffset.x,y:p.y-fireOffset.y}:p);
  const Z=data.level,signGeometry=[],floorSurfaces=[],trackGeometry=[],lamps=createFieldLampBatch(maps);let lampSerial=0;
  const trackMaterial=scannedMaterial(maps,{color:0x91877a,vertexColors:true,ground:true,vegetation:false});
  trackMaterial.transparent=true;trackMaterial.depthWrite=false;trackMaterial.polygonOffset=true;trackMaterial.polygonOffsetFactor=-1;
  // Old service tracks wear into the same ground as the canyon. The irregular
  // edge fades into local sediment instead of outlining another rectangular pad.
  function groundTrack(points,width=72){
    points=points.map(p=>({x:p.x+offset.x,y:p.y+offset.y}));
    const positions=[],colors=[],indices=[],lanes=[-1,-.74,-.26,.26,.74,1],alpha=[0,.22,.48,.48,.22,0];let row=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],c=points[i],dx=c.x-a.x,dy=c.y-a.y,length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(length/34)),nx=-dy/length,ny=dx/length;
      for(let j=0;j<=steps;j++){
        const t=j/steps,x=a.x+dx*t,y=a.y+dy*t,w=width*(1+.11*Math.sin(x*.025+y*.019)+.08*Math.sin(y*.067));
        for(let k=0;k<lanes.length;k++){const px=x+nx*w*.5*lanes[k],py=y+ny*w*.5*lanes[k],tone=.43+.045*Math.sin(px*.08+py*.041);positions.push(px,world.elevation(px,py)+.8,py);colors.push(tone,tone*.94,tone*.83,alpha[k]);}
        if(j>0)for(let k=0;k<lanes.length-1;k++){const q=(row-1)*lanes.length+k;indices.push(q,q+1,q+lanes.length,q+1,q+lanes.length+1,q+lanes.length);}row++;
      }
    }
    const uv=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/65,positions[i+2]/65);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,4));g.setIndex(indices);g.computeVertexNormals();trackGeometry.push(g);
  }
  function surfaceHeight(x,y){
    let height=world.elevation(x,y);
    if(world.cave||world.interior||!data.contains(x,y,150))return height;
    for(const floor of floorSurfaces){
      const dx=x-floor.x,dy=y-floor.y,c=Math.cos(floor.rotation),s=Math.sin(floor.rotation);
      if(Math.abs(dx*c-dy*s)<=floor.w/2&&Math.abs(dx*s+dy*c)<=floor.d/2)height=Math.max(height,floor.height);
    }
    return height;
  }
  const box=(x,y,z,w,d,h,c=steel,k=0,rotation=0)=>b.box([x,z+h/2,y],[w,h,d],c,[0,rotation,0],k);
  const beam=(a,c,r=3,color=steel)=>b.beam([a[0],a[2],a[1]],[c[0],c[2],c[1]],r,color);
  function line(a,c,width,color=paint,z=Z+4.8,kind=8){const dx=c.x-a.x,dy=c.y-a.y;box((a.x+c.x)/2,(a.y+c.y)/2,z,width,Math.hypot(dx,dy),.3,color,kind,Math.atan2(dx,dy));}
  function dash(a,c,width=5,color=paint){const length=Math.hypot(c.x-a.x,c.y-a.y),dx=(c.x-a.x)/length,dy=(c.y-a.y)/length;for(let d=10;d<length;d+=64)line({x:a.x+dx*d,y:a.y+dy*d},{x:a.x+dx*Math.min(length,d+29),y:a.y+dy*Math.min(length,d+29)},width,color);}
  function post(x,y,color=cyan,height=80){x+=offset.x;y+=offset.y;lamps.add({x,y,z:world.elevation(x,y),height:height+8,color:color===cyan?0xa4e8bb:color===amber?0xe9c291:0xdbe3bf,seed:lampSerial++,groundAt:(px,py)=>world.elevation(px,py)});}
  function barrier(x,y,w=100,color=amber){box(x,y,Z,w,16,35,concrete,3);box(x,y,Z+34,w+5,19,7,dark);for(let dx=-w/2+14;dx<w/2;dx+=25)box(x+dx,y-8.5,Z+10,11,1,20,color,8,-.16);}
  function panel(x,y,w,d,c=concrete,kind=4){box(x,y,Z-5,w,d,7,0x938a77,3);box(x,y,Z+2.1,w-3,d-3,.3,c,kind);floorSurfaces.push({x:x+offset.x,y:y+offset.y,w,d,height:Z+2,rotation:0},{x:x+offset.x,y:y+offset.y,w:w-3,d:d-3,height:Z+2.4,rotation:0});}
  function frame(x,y,w,d,color){for(const side of [-1,1]){line({x:x-w/2,y:y+side*d/2},{x:x+w/2,y:y+side*d/2},4,color);line({x:x+side*w/2,y:y-d/2},{x:x+side*w/2,y:y+d/2},4,color);}}

  const labels=[['K–09 / MAINTENANCE','老林的维修附站'],['SALVAGED FIRING APRON','旧装卸坪 · 瞄准校准'],['VALLEY ACCESS','沿旧路进入河谷'],['FIELD NOTES','把路上的发现记下来'],['CHECK THE GROUND','旧地图不一定可靠'],['ROAD LOST / KEEP RIGHT','前方断路 · 沿青灯绕行'],['BACKSTOP / KEEP CLEAR','射击方向 → 拦截墙'],['OLD LIN / SERVICE BAY','先测量，再让机甲学习'],['LIGHT TRAIL / K–09','青灯主路 · 前往维修间'],['SIDE PATH / REJOINS','琥珀支路 · 会回到主路'],['EVACUATION REST','撤离休息点 · 遗物仍在'],['EAST APPROACH','东侧接驳路 · 校准与守卫']];
  let atlas;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;const g=canvas.getContext('2d');
    for(let i=0;i<labels.length;i++){const y=i*128;g.fillStyle='#18282e';g.fillRect(0,y,1024,128);g.fillStyle=i===4||i===5?'#dca66a':'#90dbcd';g.fillRect(0,y,12,128);g.font='500 25px monospace';g.fillText(labels[i][0],40,y+39);g.fillStyle='#e6e8d7';g.font='500 42px sans-serif';g.fillText(labels[i][1],38,y+99);}
    atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;
  }else {atlas=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);atlas.needsUpdate=true;}
  const signMaterial=new T.MeshStandardMaterial({map:atlas,roughness:.8,metalness:.08,emissive:0x111c1a,emissiveIntensity:.15,side:T.DoubleSide});
  function sign(x,y,z,w,index,faceNorth=true){
    const h=w/8,g=new T.PlaneGeometry(w,h),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,1-(index+1)/16+uv.getY(i)/16);
    g.rotateY(faceNorth?Math.PI:0);g.translate(x+offset.x,z+h/2,y+offset.y);signGeometry.push(g);
    // Keep the entire five-unit backing behind the printed face. A one-unit
    // offset buried the text plane 1.5 units inside its opaque backing.
    box(x,y+(faceNorth?4:-4),z-3,w+9,5,h+6,dark);
  }

  if(typeof ExoStoryRoute!=='undefined'){for(const route of ExoStoryRoute.paths)groundTrack(route.points,route.kind==='side'?62:108);}else for(const route of [data.approach,...data.links,...(data.campaign.approach?[data.campaign.approach]:[])])groundTrack(route,90);
  offset=fireOffset;
  for(const [x,y] of [[3350,7500],[3270,7980],[3440,8500]])post(x-39,y,cyan,30);

  // The firing direction points away from the inhabited canyon and is enclosed
  // by a tall sacrificial backstop. Open northern apron is the only firing entry.
  for(const x of [3500,3780,4060]){
    groundTrack([{x:x-24,y:7515},{x:x+13,y:7850},{x:x-9,y:8320}],160);
    panel(x,7790,122,108,0x777d77,5);
  }
  for(const [y,color] of [[7790,cyan],[8020,amber],[8240,paint]]){
    for(const x of [3500,3780,4060])line({x:x-48,y},{x:x+48,y},3,color);
    for(const x of [3385,4190])post(x,y,color,38);
  }
  for(const wall of localBoxes.filter(v=>v.id.startsWith('range-'))){
    box(wall.x,wall.y,wall.z,wall.w,wall.d,wall.h,wall.id==='range-backstop'?0xa9a18f:0xb1a99a,3);
    if(wall.id==='range-backstop'){
      for(let x=3345;x<4240;x+=84){box(x,wall.y-24,Z+8,65,9,159,dark);box(x,wall.y-30,Z+20,54,4,135,0x8c9695);box(x,wall.y+28,Z,18,75,150,steel);for(const z of [Z+32,Z+122])for(const dx of [-19,19])b.cylinder([x+dx,z,wall.y-33],[2.5,2,2.5],0xb4b5a8,[Math.PI/2,0,0]);}
      box(wall.x,wall.y,Z+wall.h,wall.w+28,62,14,dark);
      sign(3780,8356,Z+151,490,6);
    }else{
      box(wall.x,wall.y,Z+wall.h,27,wall.d+8,10,dark);
      for(let y=7610;y<8390;y+=125){box(wall.x,y,Z,32,24,wall.h+9,steel);box(wall.x+(wall.id==='range-west'?11:-11),y,Z+78,4,26,7,amber,2);}
    }
  }
  // Modular defenses have replaceable inserts, drain runs, fasteners and a
  // protected cable conduit, rather than a monolithic blank perimeter slab.
  for(const side of [-1,1]){
    const edge=side<0?3332:4228;
    box(edge,7970,Z+6,10,775,18,0x8a9086,5);
    beam([edge,7595,Z+36],[edge,8345,Z+36],3.2,0xb1afa2);
    for(let y=7660;y<8340;y+=165){
      box(edge-side*17,y,Z+2.6,24,67,2,0x656b67,5);
      for(let j=-3;j<=3;j++)box(edge-side*17,y+j*8,Z+5,19,2.5,.7,0x303a3b,8);
    }
    for(let y=7640;y<8380;y+=125){
      for(const height of [25,96])b.cylinder([edge,Z+height,y],[2.8,2.8,2.8],0xb3b4a6,[0,0,Math.PI/2]);
      box(edge,y+33,Z+50,2.5,44,27,0x7c898a);
    }
  }
  // Survey rails show the intended target area without introducing static fake enemies.
  for(const [px,py] of data.fire.layouts){
    const x=px-fireOffset.x,y=py-fireOffset.y;
    line({x:x-50,y:y+24},{x:x+50,y:y+24},8,0x202c2e);
    for(const dx of [-48,48])box(x+dx,y+24,Z,9,22,10,steel);
  }

  // Sheltered calibration bench, service conduit, lockers and radio antenna.
  panel(4000,7500,350,180,0xadb0a5,5);
  for(const {x,y} of localBoxes.filter(v=>v.id.startsWith('command-post-'))){
    box(x,y,Z,17,17,170,steel);box(x,y,Z,36,36,8,dark);beam([x,y,Z+125],[x+(x<4000?36:-36),y,Z+170],4,dark);
  }
  box(4000,7500,Z+170,340,165,16,dark);
  for(let x=3850;x<=4150;x+=60)box(x,7500,Z+187,43,150,7,steel);
  box(4000,7579,Z+166,280,4,5,cyan,2);
  sign(4000,7586,Z+191,300,1,false);sign(4000,7413,Z+191,300,0,true);
  for(const x of [3870,4125]){
    box(x,7470,Z,54,46,55,dark);box(x,7469,Z+54,58,53,9,steel);
    box(x,7477,Z+66,42,7,27,0x54847d);box(x,7482,Z+72,34,2,17,cyan,2);
    for(let i=0;i<3;i++)box(x-14+i*14,7500,Z+58,6,4,2,amber,2);
    for(let i=0;i<5;i++)box(x-15+i*7,7494,Z+18,3,2,23,0x303c40,8);
    box(x,7494,Z+8,39,3,4,steel);
    for(const side of [-1,1])b.cylinder([x+side*20,Z+44,7495],[2,2,2],paint,[Math.PI/2,0,0]);
  }
  for(let i=0;i<3;i++){box(3830,7465+i*28,Z,37,25,53,steel);box(3850,7465+i*28,Z+19,3,14,21,dark);}
  // Box-section roof ribs and service suspension, all within the existing canopy.
  for(let x=3860;x<=4140;x+=70){box(x,7500,Z+157,7,145,11,0x737f83);for(const y of [7445,7555])box(x,y,Z+147,13,12,10,dark);}
  beam([3850,7494,Z+153],[4150,7494,Z+153],2.7,0xb5b2a2);
  beam([4188,7440,Z],[4188,7440,Z+245],4,steel);beam([4150,7440,Z+214],[4226,7440,Z+214],3,paint);
  b.sphere([4188,Z+247,7440],[6,6,6],cyan,2);

  offset={x:0,y:0};
  // The maintenance lane continues directly into the natural survey valley.

  // The stale route ends in a real depression. Guardrails make the hazard
  // readable; the turquoise beacons draw a safe detour to its eastern side.
  const trench=data.campaign.trench,cx=(trench.minX+trench.maxX)/2,cy=(trench.minY+trench.maxY)/2,tw=trench.maxX-trench.minX,td=trench.maxY-trench.minY,depth=trench.depth||62;
  box(cx,cy,Z-depth,tw,td,2,0x222e31);
  for(const y of [trench.minY-7,trench.maxY+7]){
    for(let i=0;i<7;i++)box(trench.minX+tw*(i+.5)/7,y+Math.sin(i*2.4)*10,Z-8,tw/8,16+Math.sin(i)*5,7,concrete,3,Math.sin(i*3)*.23);
    barrier(3708,y+(y>cy?25:-25),150,amber);
  }
  for(let i=0;i<7;i++)box(trench.minX+tw*(i+.5)/7,cy+Math.sin(i*1.8)*td*.25,Z-depth+5,19+i*4,13+i*2,7,steel,0,i*.63);
  sign(3708,7330,Z+60,225,5,false);box(3708,7323,Z,8,8,84,steel);
  for(const [x,y] of [[3830,7375],[3910,7300],[3910,7200],[3830,7115]]){
    lamps.add({x,y,z:world.elevation(x,y),height:61,color:0xa4e8bb,seed:lampSerial++,groundAt:(px,py)=>world.elevation(px,py)});
  }
  // A battered atmospheric escape capsule anchors the first playable moment.
  // The pilot wakes beside its open service hatch, outside the intact shelter.
  const pod=data.collisionBoxes.find(p=>p.id==='escape-pod'),podX=pod?.x??3425,podY=pod?.y??7405,podZ=world.elevation(podX,podY);
  for(const x of [podX-24,podX+24]){box(x,podY,podZ,9,145,9,dark);beam([x,podY-42,podZ+8],[x,podY-42,podZ+35],5,steel);beam([x,podY+42,podZ+8],[x,podY+42,podZ+35],5,steel);}
  b.cylinder([podX,podZ+41,podY],[27,100,27],0x8f9182,[Math.PI/2,0,.11]);
  b.sphere([podX,podZ+41,podY-50],[27,27,20],0x6d7771);
  b.cylinder([podX,podZ+41,podY+52],[29,12,29],dark,[Math.PI/2,0,0]);
  b.cylinder([podX,podZ+41,podY+59],[19,4,19],0x3a4648,[Math.PI/2,0,0]);
  for(const y of [podY-33,podY+25])b.cylinder([podX,podZ+41,y],[28,6,28],dark,[Math.PI/2,0,0]);
  box(podX+27,podY,podZ+28,3,53,34,dark);box(podX+29,podY,podZ+37,2,38,17,0x6b9b96,1);
  box(podX+30,podY-21,podZ+29,3,4,30,cyan,2);
  box(podX+39,podY+27,podZ+3,36,48,5,0x8e8d7a,0,.28);
  for(let i=0;i<4;i++)box(podX-18+i*12,podY+51,podZ+64,7,14,3,amber);
  if(typeof ExoStoryRoute==='undefined')for(const p of (data.campaign.approach||[{x:3505,y:7420},{x:3590,y:7390},{x:3672,y:7360}]).slice(1,-1)){
    const x=p.x,y=p.y+43;lamps.add({x,y,z:world.elevation(x,y),height:40,color:0xa4e8bb,seed:lampSerial++,groundAt:(px,py)=>world.elevation(px,py)});
  }
  if(typeof ExoStoryRoute!=='undefined'){
    const S=ExoStoryRoute,grounded={...b,add:(g,p,scale,color,rotation,kind)=>b.add(g,[p[0],p[1]+world.elevation(p[0],p[2]),p[2]],scale,color,rotation,kind)};
    const prop=(site,asset,dx,dy,w,d,h,yaw=0,state='')=>drawStoryComposition(grounded,{x:site.x+dx,y:site.y+dy,w,d,h,asset,state},'belongings',{fragment:asset,yaw,state,family:'evacuation'});
    for(const [i,p]of S.lamps.entries()){
      prop(p,i===1?'radio':i===2?'battery':'case_open',-35,12,45,34,35,.15+i*.35);
      prop(p,i===0?'cot':'tools',-83,28,i===0?45:40,i===0?78:40,35,-.42);
      prop(p,i===2?'bag_open':'coil',28,40,35,32,22,.8);
    }
    prop(S.mother,'bench',-55,20,110,70,64,-.12,'missing');prop(S.mother,'chair_turned',-66,78,45,45,68,.6,'coat');prop(S.mother,'case_open',10,30,40,30,30,.45);
    prop(S.captain,'receiver',-40,20,55,40,70,.27);prop(S.captain,'panel',-80,65,60,45,20,-.45);prop(S.captain,'coil',-20,75,45,44,18,.7);
    const [belongings,lookout,cargo]=S.detours;
    prop(belongings,'bag_open',-20,15,44,35,30,-.5);prop(belongings,'oxygen_fallen',-56,-20,65,28,30,.6);prop(belongings,'cot',60,10,50,93,50,.3);prop(belongings,'coat',20,61,42,47,12,.85);
    prop(lookout,'chair_turned',-25,10,50,48,76,-.95,'coat');prop(lookout,'cup',18,23,12,12,15,.18);prop(lookout,'case_closed',22,-20,44,30,28,.3);
    prop(cargo,'rack',-45,0,110,80,115,.13,'oxygen');prop(cargo,'cases_left',60,45,78,64,65,-.42);prop(cargo,'cloth',30,110,62,58,14,.3);
    for(const p of [S.lamps[0],S.lamps[1],S.captain]){const z=world.elevation(p.x+80,p.y+52);sign(p.x+80,p.y+52,z+53,140,9,false);box(p.x+80,p.y+56,z,5,5,57,steel);}
    sign(S.mother.x-78,S.mother.y-34,world.elevation(S.mother.x-78,S.mother.y-34)+55,170,10,false);
    sign(S.refuge.x+130,S.refuge.y+130,world.elevation(S.refuge.x+130,S.refuge.y+130)+62,190,11,false);
  }
  const architecture=b.finish();architecture.name='Batched annex architecture';root.add(architecture,lamps.finish());
  if(trackGeometry.length){const merged=mergeGeometries(trackGeometry);trackGeometry.forEach(g=>g.dispose());const tracks=new T.Mesh(merged,trackMaterial);tracks.name='Dust-worn service tracks';tracks.receiveShadow=true;root.add(tracks);}
  if(signGeometry.length){const merged=mergeGeometries(signGeometry);signGeometry.forEach(g=>g.dispose());const signs=new T.Mesh(merged,signMaterial);signs.name='K09 wayfinding atlas';root.add(signs);}
  let visible=null;
  return {root,materials,surfaceHeight,update(o){const unit=o?.unit||o;const next=!!unit&&!world.cave&&unit.x>1000&&unit.x<6600&&unit.y>4800&&unit.y<11900;if(next!==visible){root.visible=next;visible=next;}},dispose(){scene.remove(root);lamps.dispose();root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());trackMaterial.dispose();signMaterial.dispose();atlas.dispose();}};
}
