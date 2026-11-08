/* A service pull-off beside the existing eastbound road. The open center gives
   a 280-unit warning distance and two 150-unit sidestep lanes for the charger.
   Shared footprints keep the dressed outcrops identical to collision/LOS. */
const ExoRoadsideEncounter=(()=>{
 const spawn={x:6620,y:6080},enemy={x:6600,y:5800},name='旧货运线 · 检修弯道';
 const rocks=[{x:6370,y:5840,r:80},{x:6430,y:5770,r:70},{x:6340,y:5940,r:55},{x:6880,y:6150,r:50},{x:6940,y:6200,r:36}].map((p,i)=>({...p,authoredEncounter:true,seed:i}));
 const obstacles=[...rocks,{x:6425,y:6120,r:68,authoredEncounter:true,kind:'cart'}];
 const approach=[{x:6810,y:5890},{x:6765,y:6000},spawn];
 const contains=(x,y,pad=0)=>Math.hypot((x-6620)/1.15,y-5940)<410+pad;
 return {name,spawn,enemy,rocks,obstacles,approach,contains};
})();
if(typeof module!=='undefined')module.exports=ExoRoadsideEncounter;
