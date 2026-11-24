/* The public rule catalogue and scheduler. Implementations are pure-data
   systems; object placements carry capabilities, never puzzle callbacks. */
const ExoRules=(()=>{
 const table=Object.freeze([
  {id:'P1',rule:'A charged socket supplies power and drains slowly.'},
  {id:'P2',rule:'Touching metal and connected cables share a component.'},
  {id:'P3',rule:'Standing water conducts within 120 units; shock stuns, not kills.'},
  {id:'P4',rule:'Taking the source away cuts power immediately.'},
  {id:'P5',rule:'A second cell in a single socket breaks its wiring.'},
  {id:'P6',rule:'Seam creatures seek and drain power; loose cells lure them.'},
  {id:'W1',rule:'A spring pulls movable masses across terrain; obstacles stop them.'},
  {id:'W2',rule:'Enough supported mass presses a plate and opens its linked door.'},
  {id:'W3',rule:'A pulled pylon falls in the pull direction and stuns underneath.'},
  {id:'W4',rule:'Reeling toward a fixed anchor winches the mech uphill.'},
  {id:'W5',rule:'The tow cable joins metal endpoints to the same power graph.'}
 ].map(Object.freeze));
 function create(things,Power){const power=(Power||(typeof ExoPower!=='undefined'?ExoPower:require('./exo-power.js'))).create(things);
  function weight(context){const rows=things.wake(context.point);things.transaction(()=>{for(const plate of rows.filter(t=>t.kind==='plate')){let mass=0;for(const body of rows)if(body.id!==plate.id&&['tow','push','carry'].includes(body.physics)&&Math.hypot(body.x-plate.x,body.y-plate.y)<plate.radius&&Math.abs((body.z||0)-(plate.z||0))<25)mass+=body.mass;if(!context.point.flight&&(context.point.altitude||0)<25&&Math.hypot(context.point.x-plate.x,context.point.y-plate.y)<plate.radius)mass+=90;things.patch(plate.id,{state:{pressed:mass>=plate.threshold}},'plate-weight');}},{save:false});}
  return {power,weight,tick(dt,context){weight(context);power.tick(dt,context);},refresh:p=>power.refresh(p)};}
 return {table,create};
})();
if(typeof module!=='undefined')module.exports=ExoRules;
