/* The public rule catalogue and scheduler. Implementations are pure-data
   systems; object placements carry capabilities, never puzzle callbacks. */
const ExoRules=(()=>{
 const table=Object.freeze([
  {id:'P1',rule:'A charged socket supplies power and drains slowly.'},
  {id:'P2',rule:'Touching metal and connected cables share a component.'},
  {id:'P3',rule:'Standing water conducts within 120 units; shock stuns, not kills.'},
  {id:'P4',rule:'Taking the source away cuts power immediately.'},
  {id:'P5',rule:'A second cell in a single socket breaks its wiring.'},
  {id:'P6',rule:'Seam creatures seek and drain power; loose cells lure them.'}
 ].map(Object.freeze));
 function create(things,Power){const power=(Power||(typeof ExoPower!=='undefined'?ExoPower:require('./exo-power.js'))).create(things);return {power,tick:(dt,context)=>power.tick(dt,context),refresh:p=>power.refresh(p)};}
 return {table,create};
})();
if(typeof module!=='undefined')module.exports=ExoRules;
