/* Authored placements, independent of the renderer. New placements inherit
   the same rules; no coordinate checks belong in the rule implementations. */
const ExoThingData=(()=>{
 const home={x:4365,y:6400,context:'surface'},relayId='socket:south-relay';
 const battery=(id,location,x=0,y=0)=>({id,kind:'battery',name:'应急电池',material:'metal',physics:'carry',mass:8,radius:13,x,y,location,state:{charge:1}});
 function batteries({lamps=[],relay={x:5200,y:12230}}={}){
  const rows=[];for(const l of lamps){const isCache=l.kind==='cache',capacity=l.kind==='spare'?2:1;
   rows.push({id:l.id,kind:isCache?'cache':'lamp',name:l.name,x:l.x,y:l.y,material:'metal',physics:'fixed',mass:70,radius:28,socket:isCache?null:{capacity},state:{rewired:l.kind!=='broken',broken:l.kind==='broken',powered:l.kind==='spare',lit:l.kind==='spare'},tags:[l.kind]});
   if(isCache||l.kind==='spare')for(let i=0;i<(isCache?1:2);i++)rows.push(battery(l.id+':cell:'+i,(isCache?'cache:':'socket:')+l.id,l.x,l.y));
  }
  rows.push({id:relayId,kind:'relay',name:'南线中继电池仓',x:relay.x,y:relay.y,radius:30,mass:200,socket:{capacity:1},state:{rewired:true,powered:false}});
  return rows;
 }
 return {home,relayId,battery,batteries};
})();
if(typeof module!=='undefined')module.exports=ExoThingData;
