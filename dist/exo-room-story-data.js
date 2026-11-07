/* Shared by the physical floor planner and both renderers. A room is a moment
   of use, with independently placed furniture and traces of the same action.
   These are art directions, not new historical facts or player-facing lore. */
globalThis.ExoRoomStoryData ||= (()=>{
 const stories={
 'k09-hero-hangar':['passenger','belongings','reroute','silent','handoff','waiting'],
 'camp-0-0':['conversion','oxygen','calibration','reroute','handoff','workbench'],
 'camp-0-1':['emptied','oxygen','passenger','sealed','lamps','handoff'],
 'camp-1-0':['bypass','comparison','comparison','samples','samples','locked'],
 'camp-1-1':['bypass','samples','comparison','samples','strata','workbench'],
 'camp-2-0':['strata','strata','calibration','strata','film','locked'],
 'camp-2-1':['film','comparison','strata','silent','missing','film'],
 'camp-3-0':['seedlings','waiting','irrigation','care','belongings','irrigation'],
 'camp-3-1':['passenger','belongings','reroute','rail','handoff','waiting'],
 'camp-4-0':['silent','sealed','comparison','silent','receivers','window'],
 'camp-4-1':['storm','comparison','receivers','storm','silent','storm'],
 'camp-5-0':['drill','strata','comparison','locked','samples','locked'],
 'camp-5-1':['bypass','care','filters','workbench','oxygen','calibration'],
 'camp-6-0':['passenger','oxygen','reroute','emptied','handoff','belongings'],
 'camp-6-1':['workbench','brakes','brakes','lamps','filters','workbench'],
 'camp-7-0':['brakes','window','receivers','window','sealed','lamps'],
 'camp-7-1':['window','receivers','receivers','workbench','window','workbench'],
 'camp-8-0':['lamps','emptied','lamps','lamps','handoff','workbench'],
 'camp-8-1':['rail','rail','calibration','brakes','rail','reroute'],
 'lift-0':['passenger','handoff','brakes','lamps','waiting','filters'],
 'lift-1':['passenger','brakes','handoff','locked','receivers','reroute']
};
 const evacuation=new Set(['k09-hero-hangar','camp-0-0','camp-0-1','camp-3-0','camp-3-1','camp-6-0','lift-0','lift-1']);
 const maintenance=new Set(['camp-5-1','camp-6-1','camp-8-0','camp-8-1']);
 const family=id=>evacuation.has(id)?'evacuation':maintenance.has(id)?'maintenance':'research';
 // Maximum native object envelopes, before yaw. Small floor objects are low
 // enough for the mech to step over; furniture has matching body/camera solids.
 const sizes={
  chair:[66,72,116],chair_turned:[66,72,116],chair_fallen:[88,110,66],bench:[224,124,125],
  rack:[210,142,224],case_open:[86,83,69],case_closed:[82,65,52],cases_left:[138,100,112],
  bag:[63,46,28],bag_open:[79,59,27],coat:[80,66,14],cloth:[88,81,9],cup:[20,20,19],spill:[55,39,6],
  tools:[76,58,12],panel:[95,108,25],coil:[82,68,18],oxygen:[35,38,96],oxygen_fallen:[94,39,34],
  seed_bed:[222,148,161],seed_carrier:[72,59,26],pot_spill:[59,67,23],cot:[114,212,102],
  lamp:[38,34,108],battery:[59,49,47],radio:[99,70,71],receiver:[88,74,154],
  relay:[131,103,206],pump:[175,145,203],sample_cart:[160,106,143],drill:[198,123,177],
  filter:[85,49,102],brake:[114,89,76],rail:[200,101,37],film:[113,90,112]
 };
 // Furniture positions use fractions of a room half-width/depth. Subsequent
 // details are offsets from the named furniture, so a spill stays by its cup,
 // an opened bag by its chair, and fragments below their actual source.
 // asset, x, z, yaw, state; small traces are separate below.
 const moments={
  boarding:{items:[['chair',-.50,-.52,.06,'coat'],['chair_turned',.48,.27,-.58,'bare'],['oxygen',-.76,-.40,.12]],loose:[['bag_open',0,62,28,.42],['cloth',1,-39,36,-.26]],trace:'drag',damage:'removed'},
  packing:{items:[['bench',-.42,-.55,.08,'packing'],['case_open',.61,.30,-.37],['rack',.70,-.64,0,'emptied']],loose:[['bag_open',0,-72,88,-.46],['seed_carrier',1,-49,64,.36]],trace:'packing'},
  unloading:{items:[['cases_left',-.68,-.63,.02],['case_open',.55,.32,-.47]],loose:[['coil',1,-61,43,-.32],['bag',0,67,27,.22]],trace:'drag',damage:'removed'},
  stripped_rack:{items:[['rack',-.57,-.65,.02,'emptied'],['cases_left',.68,-.57,.12]],loose:[['cloth',0,59,62,.45],['oxygen_fallen',0,98,38,-.8]],trace:'dust',damage:'removed'},
  short_rest:{items:[['chair',-.65,.25,1.18,'coat'],['case_closed',-.57,.58,-.19]],loose:[['cup',1,19,-48,0],['bag',0,35,22,-.5]],trace:'cup'},
  last_watch:{items:[['chair_turned',.57,-.45,-.73,'bare'],['lamp',.76,-.62,-.2],['battery',.73,-.37,.04]],loose:[['coat',0,-49,35,.72],['cup',0,32,18,0]],trace:'cable'},
  care_handover:{items:[['cot',-.57,-.36,.14,'pulled'],['case_open',.53,.36,-.22],['oxygen',-.76,.14,.12]],loose:[['cloth',0,58,67,.23],['bag',1,-56,22,.49]],trace:'wheels'},
  meal_interrupted:{items:[['bench',-.53,-.57,-.05,'meal'],['chair_turned',-.34,-.25,.52,'bare']],loose:[['spill',0,67,73,.35],['coat',1,-16,22,-.55]],trace:'cup'},
  seedlings_taken:{items:[['seed_bed',-.51,-.56,.02,'missing'],['case_open',.64,.22,-.42]],loose:[['seed_carrier',0,82,72,.27],['pot_spill',0,-65,68,-.64]],trace:'soil'},
  water_left:{items:[['seed_bed',.60,-.52,-.04,'water'],['pump',-.67,-.52,.08]],loose:[['coil',1,68,83,-.32],['cloth',1,34,65,.55]],trace:'water',damage:'mineral'},
  valve_paused:{items:[['pump',-.59,-.56,.03,'bypass'],['case_open',.54,.29,-.28]],loose:[['tools',0,86,75,.32],['cloth',0,53,43,.17]],trace:'water',damage:'mineral'},
  isolate_power:{items:[['relay',-.63,-.53,.02,'isolated'],['battery',.59,.29,.24]],loose:[['panel',0,72,60,-.41],['tools',0,42,83,.62]],trace:'cable',damage:'opened'},
  samples_lifted:{items:[['sample_cart',-.54,-.52,-.18,'one_missing'],['case_open',.62,.28,-.51]],loose:[['tools',0,61,62,.7],['cloth',1,-22,61,-.35]],trace:'wheels'},
  compare_paused:{items:[['bench',-.47,-.58,.03,'samples'],['sample_cart',.58,-.41,-.23,'separate']],loose:[['cup',0,68,70,0],['cloth',1,-52,56,.51]],trace:'cup'},
  calibration_reset:{items:[['bench',.54,-.55,-.05,'calibration'],['chair_turned',.41,-.24,-.7]],loose:[['tools',0,-65,73,-.37],['case_open',0,67,83,.19]],trace:'drag'},
  cores_examined:{items:[['sample_cart',-.56,-.51,-.13,'cores'],['bench',.60,-.50,.02,'strata']],loose:[['case_open',0,75,84,-.43],['cloth',1,-65,72,.38]],trace:'mineral'},
  drilling_stopped:{items:[['drill',.55,-.54,-.08,'locked'],['sample_cart',-.63,-.40,.28,'cores']],loose:[['tools',0,-92,73,-.24],['case_open',1,65,65,.36]],trace:'dust',damage:'handled'},
  silence_work:{items:[['relay',.61,-.53,-.03,'disconnected'],['chair_turned',.49,-.22,-1.02],['lamp',-.66,-.55,.23]],loose:[['panel',0,-86,48,-.62],['coil',0,-49,91,.42]],trace:'cable',damage:'opened'},
  two_receivers:{items:[['receiver',-.63,-.51,.18,'one'],['receiver',.53,.30,-.51,'two'],['bench',.63,-.59,0,'notes']],loose:[['battery',0,53,43,-.2],['battery',1,-36,38,.31]],trace:'cable'},
  window_wait:{items:[['receiver',.57,-.55,.09,'window'],['chair_turned',.48,-.21,-.37,'coat']],loose:[['cup',1,-32,18,0],['case_open',0,-75,61,-.38]],trace:'cup'},
  repair_open:{items:[['bench',-.51,-.56,.05,'repair'],['chair_fallen',-.29,-.28,-.81]],loose:[['tools',0,66,76,.43],['panel',0,-91,54,-.32]],trace:'repair',damage:'opened'},
  brake_test:{items:[['bench',.55,-.53,-.04,'brakes'],['brake',-.62,.30,.38]],loose:[['tools',0,-73,70,-.31],['cloth',1,43,53,.36]],trace:'repair',damage:'handled'},
  filter_changed:{items:[['filter',-.66,-.56,.1,'new'],['filter',-.47,-.40,-.23,'used'],['case_open',.60,.28,-.38]],loose:[['panel',0,74,54,.38],['tools',1,42,59,-.67]],trace:'repair',damage:'mineral'},
  lamp_rewired:{items:[['bench',-.53,-.56,-.03,'lamp'],['lamp',.61,.27,-.26],['battery',.73,.42,.19]],loose:[['tools',0,64,71,.44],['panel',0,-71,64,-.23]],trace:'cable',damage:'handled'},
  storm_repair:{items:[['bench',-.51,-.54,-.06,'storm'],['chair_fallen',.57,.30,.86],['lamp',.70,-.49,.1]],loose:[['panel',0,71,68,-.29],['tools',0,-74,54,.37]],trace:'debris',damage:'storm'},
  rail_rejected:{items:[['rail',-.54,-.45,-.22,'broken'],['brake',.60,.24,.4]],loose:[['tools',0,75,61,.51],['panel',1,-52,44,-.62]],trace:'mineral',damage:'handled'},
  route_changed:{items:[['bench',.55,-.56,.05,'route'],['chair_turned',.39,-.25,-.54]],loose:[['case_open',0,-80,69,-.36],['cloth',0,63,78,.42]],trace:'drag'},
  film_unpacked:{items:[['film',-.62,-.52,.11,'opened'],['bench',.58,-.54,0,'film']],loose:[['case_open',0,65,63,-.45],['cloth',1,-75,65,.26]],trace:'paper'},
  missing_pages:{items:[['bench',-.52,-.58,.02,'missing'],['chair_turned',-.39,-.25,.74]],loose:[['case_open',0,79,62,-.29],['cloth',0,-76,65,.37]],trace:'paper'},
  sealed_spares:{items:[['cases_left',-.67,-.58,.04,'sealed'],['rack',.68,-.61,-.02,'closed']],loose:[['cloth',0,62,43,-.35]],trace:'dust'},
  tools_left:{items:[['bench',.55,-.57,-.04,'tools'],['case_open',-.57,.31,.34]],loose:[['coat',0,-54,64,-.41],['cup',0,74,69,0]],trace:'repair'},
  check_in:{items:[['bench',-.56,-.58,.02,'check'],['chair_turned',-.39,-.28,.32]],loose:[['bag',1,36,26,-.51]],trace:'shoes'},
  passage_cleared:{items:[['cases_left',.73,-.64,-.05]],loose:[['cloth',0,-59,41,.32]],trace:'drag',damage:'removed'},
  dispatch_pause:{items:[['bench',-.54,-.56,.04,'route'],['chair_turned',-.38,-.27,.59]],loose:[['cup',1,35,31,0],['case_open',0,81,64,-.28]],trace:'paper'},
  unclaimed:{items:[['rack',-.65,-.58,.03,'emptied'],['bag_open',.60,.29,-.44]],loose:[['coat',1,39,40,.24]],trace:'dust'},
  oxygen_priority:{items:[['rack',.62,-.58,.01,'oxygen'],['oxygen',-.61,-.37,.18],['case_open',-.50,.39,-.39]],loose:[['cloth',1,29,31,.37],['bag_open',2,51,48,-.4]],trace:'wheels',damage:'removed'},
  inspection_pause:{items:[['case_open',.57,-.50,-.32],['chair_turned',-.66,.28,1.04,'coat']],loose:[['tools',0,-54,54,.61],['bag',1,32,27,-.28]],trace:'shoes'},
  checked_empty:{items:[['sample_cart',-.61,-.53,-.26,'empty'],['filter',.63,.23,.31,'used']],loose:[['cloth',0,64,51,.35]],trace:'wheels'},
  shutter_cleared:{items:[['chair_fallen',-.65,-.57,-.42],['case_closed',.67,-.60,.13]],loose:[['coil',1,-39,48,.38]],trace:'drag',damage:'handled'},
  panel_open:{items:[['relay',.65,-.49,.05,'opened'],['case_open',.59,.34,-.43]],loose:[['panel',0,-64,83,-.58],['tools',0,48,62,.31]],trace:'repair',damage:'opened'},
  fuse_replaced:{items:[['battery',.63,-.60,-.11],['case_open',.55,.30,.35]],loose:[['tools',0,-53,48,.24],['panel',1,-57,51,-.36]],trace:'repair',damage:'handled'},
  backup_running:{items:[['battery',.62,-.58,.07],['lamp',.58,.31,-.18]],loose:[['coil',0,-37,53,.27]],trace:'cable'},
  battery_swapped:{items:[['battery',.65,-.57,.03],['case_open',-.62,.28,.41]],loose:[['panel',1,61,43,-.31],['cloth',0,-36,32,.44]],trace:'repair'},
  repair_cleared:{items:[['case_closed',.62,-.56,-.12],['chair_turned',-.65,.28,1.38,'coat']],loose:[['tools',0,35,51,.37],['cup',1,28,31,0]],trace:'dust'},
  stores_selected:{items:[['rack',-.59,-.60,-.01,'emptied'],['case_open',.59,.32,-.39]],loose:[['coil',1,49,41,.38],['cloth',0,62,63,-.44]],trace:'packing'},
  spares_returned:{items:[['case_open',.62,-.52,.31],['cases_left',-.64,.29,-.15]],loose:[['panel',0,-55,57,-.46],['tools',1,48,53,.34]],trace:'repair'},
  protected_stock:{items:[['rack',-.64,-.58,.02,'closed']],loose:[['cloth',0,63,61,-.48]],trace:'dust'},
  load_checked:{items:[['cases_left',.61,-.53,-.07],['chair_turned',-.65,.29,1.26,'bare']],loose:[['bag',1,26,38,.43],['coil',0,-53,51,-.31]],trace:'wheels'},
  straps_left:{items:[['rack',.63,-.57,.02,'emptied']],loose:[['coil',0,-67,56,.38],['cloth',0,31,71,-.23]],trace:'drag',damage:'removed'},
  final_inspection:{items:[['case_closed',-.66,-.56,-.09],['lamp',.67,.26,-.12]],loose:[['tools',0,42,54,.31]],trace:'shoes'},
  shift_finished:{items:[['chair_turned',-.65,.29,1.54,'coat'],['radio',.64,-.61,.08]],loose:[['bag_open',0,39,29,-.27],['cup',0,-24,34,0]],trace:'shoes'},
  dispatch_left:{items:[['radio',.64,-.55,-.09],['case_open',-.63,.28,.38]],loose:[['cloth',1,39,57,-.34]],trace:'paper'},
  reserve_light:{items:[['lamp',.65,-.58,.09],['case_closed',-.65,.28,-.24]],loose:[['coil',0,-43,42,.29],['tools',1,36,52,-.31]],trace:'cable'},
  transfer_wait:{items:[['sample_cart',-.59,-.53,-.23,'empty'],['cases_left',.61,.29,.12]],loose:[['cloth',0,65,51,-.37]],trace:'wheels'},
  coolant_check:{items:[['pump',-.59,-.52,.04,'bypass'],['filter',.63,.29,-.18,'used']],loose:[['tools',0,75,69,.31]],trace:'water',damage:'mineral'},
  signal_backup:{items:[['receiver',.62,-.55,.12,'one'],['battery',-.62,.29,-.21]],loose:[['coil',0,-56,56,.36]],trace:'cable'},
  crates_arrived:{items:[['cases_left',-.64,-.57,-.09],['sample_cart',.61,.27,.28,'empty']],loose:[['coat',1,-51,51,-.36]],trace:'wheels'},
  work_lamp_left:{items:[['lamp',.61,-.53,.08],['battery',.60,.30,.24]],loose:[['coil',0,-32,44,.31],['tools',1,-44,41,-.28]],trace:'cable',damage:'handled'},
  core_set_aside:{items:[['sample_cart',.59,-.53,.21,'cores'],['case_open',-.63,.29,-.42]],loose:[['cloth',0,-62,54,.31]],trace:'mineral'},
  sample_packed:{items:[['case_open',.61,-.54,-.31],['rack',-.63,.20,.03,'closed']],loose:[['cloth',0,-54,61,.43]],trace:'packing'},
  radio_capped:{items:[['radio',.62,-.52,.05],['case_closed',-.61,.28,-.17]],loose:[['coil',0,-51,48,.31]],trace:'cable',damage:'opened'},
  repair_arrival:{items:[['case_open',-.63,-.54,.26],['bag_open',.61,.28,-.43]],loose:[['tools',0,51,57,.33]],trace:'shoes'},
  brake_open:{items:[['brake',-.62,-.50,-.24],['case_open',.60,.29,.37]],loose:[['tools',0,55,51,.31],['cloth',1,-48,53,-.4]],trace:'repair'},
  recheck_finished:{items:[['bench',.58,-.54,.03,'calibration'],['case_closed',-.64,.29,-.21]],loose:[['cloth',0,-65,72,.38]],trace:'dust'}
 };
 const byKind={passenger:'boarding',conversion:'boarding',belongings:'packing',handoff:'unloading',emptied:'stripped_rack',oxygen:'oxygen_priority',waiting:'short_rest',care:'care_handover',seedlings:'seedlings_taken',irrigation:'water_left',bypass:'valve_paused',locked:'isolate_power',samples:'samples_lifted',comparison:'compare_paused',calibration:'calibration_reset',strata:'cores_examined',drill:'drilling_stopped',silent:'silence_work',receivers:'two_receivers',window:'window_wait',workbench:'repair_open',brakes:'brake_test',filters:'filter_changed',lamps:'lamp_rewired',storm:'storm_repair',rail:'rail_rejected',reroute:'route_changed',film:'film_unpacked',missing:'missing_pages',sealed:'sealed_spares'};
 // The quiet rooms carry different moments from the clue rooms. Repeated
 // functions also progress from preparation through departure to maintenance.
 const roles=[
  ['check_in','crates_arrived','repair_arrival'],['stores_selected','spares_returned','protected_stock'],
  ['inspection_pause','checked_empty','shutter_cleared'],['panel_open','fuse_replaced','reserve_light'],
  null,['tools_left','brake_open','repair_cleared'],null,
  ['transfer_wait','core_set_aside','sample_packed'],['backup_running','battery_swapped','work_lamp_left'],
  ['meal_interrupted','care_handover','last_watch'],['load_checked','straps_left','final_inspection'],
  ['dispatch_pause','shift_finished','dispatch_left'],['unclaimed','sealed_spares','passage_cleared']
 ];
 function momentFor(siteId,program,level,room){
  const fam=family(siteId),index=level*2+(room.id===6?1:0),kind=stories[siteId]?.[index];
  let id=[4,6].includes(room.id)?(byKind[kind]||'repair_open'):roles[room.id]?.[level]||'tools_left';
  if(room.id===7)id=['pump','cooling','greenhouse','ventilation'].includes(program)?['coolant_check','filter_changed','valve_paused'][level]:['hangar','logistics','lift'].includes(program)?['transfer_wait','unloading','stripped_rack'][level]:program==='relay'||program==='weather'?['signal_backup','radio_capped','window_wait'][level]:id;
  if(room.id===10&&fam!=='evacuation')id=['calibration_reset','recheck_finished','final_inspection'][level];
  if(room.id===9&&fam==='research')id=['meal_interrupted','short_rest','last_watch'][level];
  // The two clue rooms can concern the same event, but show distinct stages:
  // an examined core vs a core set aside, a repair bench vs the light left on.
  if(room.id===6&&stories[siteId]?.[level*2]===kind)id=({strata:'core_set_aside',samples:'sample_packed',lamps:'work_lamp_left',comparison:'samples_lifted',rail:'brake_test'}[kind]||id);
  const beats=stories[siteId]?.slice(level*2,level*2+2)||[];
  if(room.id===9&&id==='care_handover'&&beats.includes('care'))id='short_rest';
  if(room.id===12&&id==='sealed_spares'&&beats.includes('sealed'))id='protected_stock';
  if(room.id===7&&id==='window_wait'&&beats.includes('window'))id='signal_backup';
  if(room.id===7&&id==='filter_changed'&&beats.includes('filters'))id='coolant_check';
  if(room.id===7&&id==='unloading'&&beats.includes('handoff'))id='transfer_wait';
  return {id,kind:kind||'workbench',family:fam,stage:level,role:room.id,instance:siteId+':'+level+':'+room.id,...moments[id]};
 }
 function segmentClear(p,a,b,margin=48){
  const hx=p.w/2+margin,hy=p.d/2+margin,dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
  for(const [origin,delta,min,max]of [[a.x,dx,p.x-hx,p.x+hx],[a.y,dy,p.y-hy,p.y+hy]]){if(Math.abs(delta)<.001){if(origin<min||origin>max)return true;}else{const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return true;}}
  return false;
 }
 function object(asset,x,y,yaw,room,state='',role='furniture'){
  const [w,d,h]=sizes[asset],cs=Math.abs(Math.cos(yaw)),sn=Math.abs(Math.sin(yaw));
  return {kind:'story',asset,x,y,yaw,w:w*cs+d*sn+2,d:d*cs+w*sn+2,h,baseW:w,baseD:d,room,state,role};
 }
 function arrange(plan){
  if(plan.livedRooms)return plan;plan.livedRooms=true;
  for(const deck of plan.decks){
   deck.dressing=[];
   for(const room of deck.rooms){
    const moment=momentFor(plan.id,plan.program.id,deck.level,room);room.moment=moment;
    const originals=deck.props.filter(p=>p.room===room.id),replaceAll=[4,6,9].includes(room.id);
    // Keep functional machinery in service rooms; replace the old matched
    // corner displays completely in the rooms that carry the human story.
    const removed=replaceAll?originals:originals.slice(-1);deck.props=deck.props.filter(p=>!removed.includes(p));
    const reserved=deck.nodes.filter(n=>n.room===room.id).map(n=>[room,n]);
    for(const link of deck.links)if(link.a===room||link.b===room)reserved.push([link.a,link.b]);
    reserved.push([room,room]);if([2,5,8,10,11].includes(room.id))reserved.push([{x:room.x+140,y:room.y-150},{x:room.x+140,y:room.y-150}]);
    const hasRoom=p=>p.x-p.w/2>room.x-room.w/2+35&&p.x+p.w/2<room.x+room.w/2-35&&p.y-p.d/2>room.y-room.d/2+35&&p.y+p.d/2<room.y+room.d/2-35;
    const fits=p=>hasRoom(p)&&reserved.every(([a,b])=>segmentClear(p,a,b))&&deck.props.filter(q=>q.room===room.id).every(q=>Math.abs(q.x-p.x)>(q.w+p.w)/2+18||Math.abs(q.y-p.y)>(q.d+p.d)/2+18)&&deck.nodes.filter(n=>n.room===room.id).every(n=>Math.abs(n.x-p.x)>p.w/2+100||Math.abs(n.y-p.y)>p.d/2+100);
    const placed=[];
    for(const [i,entry]of moment.items.entries()){
     const [asset,rx,rz,angle,state]=entry,side=(deck.level===1&&room.id%2)?-1:1;
     const wanted={x:room.x+rx*room.w/2*side,y:room.y+rz*room.d/2},yaw=angle*side;
     // Limited authored alternatives preserve the action's relation to the
     // room. No random scatter, and no silent blocking of an existing route.
     const candidates=[[0,0],[0,-70],[70*side,0],[-70*side,0],[0,70],[0,-135],[125*side,0],[-125*side,0],[0,125]];
     let p;
     for(const [dx,dy]of candidates){const q=object(asset,wanted.x+dx,wanted.y+dy,yaw,room.id,state,i===0?'anchor':'furniture');if(fits(q)){p=q;break;}}
     if(!p){
      // Select the nearest viable place in the same room, rather than dropping
      // an entire moment when a power terminal occupies the preferred wall.
      const alternatives=[];for(const x of [-.68,-.48,.48,.68])for(const z of [-.65,-.42,.32,.56])alternatives.push({x:room.x+x*room.w/2,y:room.y+z*room.d/2});
      alternatives.sort((a,b)=>Math.hypot(a.x-wanted.x,a.y-wanted.y)-Math.hypot(b.x-wanted.x,b.y-wanted.y));
      for(const q of alternatives){const trial=object(asset,q.x,q.y,yaw,room.id,state,i===0?'anchor':'furniture');if(fits(trial)){p=trial;break;}}
     }
     placed.push(p||null);if(p)(p.h<=30?deck.dressing:deck.props).push(p);
    }
    // Low objects follow a particular piece of furniture, not a neat shelf or
    // an equally spaced ring around every interaction node.
    for(const [asset,anchor,dx,dy,yaw]of moment.loose||[]){const p=placed[anchor];if(!p)continue;const cs=Math.cos(p.yaw),sn=Math.sin(p.yaw),q=object(asset,p.x+dx*cs+dy*sn,p.y+dy*cs-dx*sn,yaw+p.yaw,room.id,'left', 'trace');
     if(!hasRoom(q))continue;
     // Tall loose items (e.g. a case or cylinder) still get proper collision.
     if(q.h>30){if(fits(q))deck.props.push(q);}else if(deck.nodes.filter(n=>n.room===room.id).every(n=>Math.hypot(n.x-q.x,n.y-q.y)>90))deck.dressing.push(q);
    }
    room.moment.anchors=placed.filter(Boolean).map(p=>({x:p.x,y:p.y,w:p.w,d:p.d,yaw:p.yaw,asset:p.asset}));
   }
  }
  return plan;
 }
 return {stories,kinds:[...new Set(Object.values(stories).flat())],family,sizes,moments,momentFor,arrange,segmentClear};
})();
if(typeof module!=='undefined')module.exports=globalThis.ExoRoomStoryData;
