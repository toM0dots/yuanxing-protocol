/* Four physical cells in a back rack. Every transfer moves an existing ID;
   neither taking nor inserting can mint inventory. */
const ExoCarry=(()=>{
 const CAPACITY=4,REACH=110;
 function create(things,{home={x:4365,y:6400,context:'surface'}}={}){
  const rack=()=>things.contents('rack').filter(t=>t.kind==='battery').sort((a,b)=>(a.slot??0)-(b.slot??0));
  const contents=id=>things.contents('socket:'+id).filter(t=>t.kind==='battery');
  function result(ok,message,extra={}){return {ok,message,...extra};}
  function take(id){const t=things.get(id);if(!t||t.kind!=='battery'||t.location==='rack')return result(false,'这里没有可取的电池。');if(rack().length>=CAPACITY)return result(false,'背架满了。先放下一块电池。');const slots=new Set(rack().map(t=>t.slot));const slot=[0,1,2,3].find(i=>!slots.has(i));things.transaction(()=>things.patch(id,{location:'rack',slot},'battery-taken'));return result(true,'电池扣上背架。',{id,sound:'take'});}
  function insert(socketId){const socket=things.get(socketId),cell=rack().find(t=>t.state.charge>0);if(!socket?.socket)return result(false,'这里没有电池插槽。');if(contents(socketId).length>=socket.socket.capacity)return result(false,'插槽已经装满了。');if(!cell)return result(false,'背架上没有带电的电池。');things.transaction(()=>things.patch(cell.id,{location:'socket:'+socketId,slot:0,x:socket.x,y:socket.y,context:socket.context},'battery-inserted'));return result(true,'电池卡进插槽。',{id:cell.id,sound:'light'});}
  function remove(socketId){const cell=contents(socketId).at(-1);return cell?take(cell.id):result(false,'电池仓是空的。');}
  function cache(id){const cell=things.contents('cache:'+id).find(t=>t.kind==='battery');return cell?take(cell.id):result(false,'箱子已经空了。');}
  function nearest(unit,canReach=()=>true){return things.near(unit,REACH,{kind:'battery'}).find(t=>canReach(t))||null;}
  function drop(unit,{canPlace=()=>true}={}){const cell=rack().at(-1);if(!cell)return result(false,'背架上没有电池；走近地上的电池按 Z 拾取。');const angle=unit.angle||0,point={x:unit.x+Math.sin(angle)*65,y:unit.y-Math.cos(angle)*65,context:unit.context||'surface'};if(!canPlace(point))return result(false,'这里放不稳。换一块平地。');things.transaction(()=>things.patch(cell.id,{...point,location:'world',slot:0,z:0},'battery-dropped'));return result(true,'电池放在这里。',{id:cell.id,sound:'take'});}
  function toggle(unit,options={}){const cell=nearest(unit,options.canReach);return cell?take(cell.id):drop(unit,options);}
  function migrate({lamp={},relay=false}={}){
   if(things.getFlag('batteriesMigrated'))return false;
   things.transaction(()=>{
    const pool=[];for(const cacheId of lamp.caches||[])for(const t of things.contents('cache:'+cacheId))pool.push(t.id);
    for(const [id,drawn] of Object.entries(lamp.drawn||{}))for(const t of contents(id).slice(0,Math.max(0,drawn|0)))pool.push(t.id);
    let count=0;const next=()=>{const id=pool.shift();if(id)return id;const generated='legacy:cell:'+count++;things.add({id:generated,kind:'battery',name:'应急电池',material:'metal',physics:'carry',mass:8,radius:13,location:'legacy',state:{charge:1}},'legacy-battery');return generated;};
    for(const id of lamp.fixed||[]){const socket=things.get(id);if(!socket?.socket)continue;things.patch(id,{state:{rewired:true,broken:false}},'legacy-repair');things.patch(next(),{location:'socket:'+id,x:socket.x,y:socket.y},'legacy-installed');}
    if(relay){const id='socket:south-relay',socket=things.get(id);if(socket)things.patch(next(),{location:'socket:'+id,x:socket.x,y:socket.y},'legacy-relay');}
    const cells=Math.max(0,Number.isSafeInteger(lamp.cells)?lamp.cells:0),extra=[];
    for(let i=0;i<cells;i++){const id=next();if(i<CAPACITY)things.patch(id,{location:'rack',slot:i},'legacy-rack');else extra.push(id);}pool.push(...extra);
    const overflow=pool.length;for(let i=0;i<overflow;i++)things.patch(pool[i],{location:'world',x:home.x+(i%4)*32,y:home.y+Math.floor(i/4)*32,context:home.context||'surface',slot:0},'legacy-overflow');
    things.flag('batteriesMigrated',true);things.flag('legacyOverflow',overflow);
   });return true;
  }
  return {rack,contents,take,insert,remove,cache,nearest,drop,toggle,migrate,get count(){return rack().length;},capacity:CAPACITY};
 }
 return {create,CAPACITY,REACH};
})();
if(typeof module!=='undefined')module.exports=ExoCarry;
