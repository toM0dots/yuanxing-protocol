/* Production script order + real movement/input/event loop. This is logic QA,
   not a WebGL/browser rendering claim. Only the VM copy gets state probes. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dist=path.join(__dirname,'../dist');
function harness(saved=new Map()){
  const nodes=new Map(),events={},docEvents={},frames=new Map();let next=0,now=0;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
  function element(id){
    let html='',children=[];
    const el={id,isConnected:false,parentNode:null,style:{},dataset:{},open:false,hidden:false,textContent:'',paused:true,currentTime:0,classList:{contains:()=>false,toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector:()=>element('selector'),querySelectorAll:()=>[],showModal(){this.open=true;},close(){this.open=false;},appendChild(n){this.append(n);},contains(){return false;},matches(){return false;},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){},getBoundingClientRect:()=>({width:900,height:700,left:0,top:0}),getContext:()=>ctx,setPointerCapture(){},focus(){},remove(){nodes.delete(this.id);this.isConnected=false;this.parentNode=null;},append(n){n.isConnected=true;n.parentNode=this;if(n.id)nodes.set(n.id,n);}};
    Object.defineProperty(el,'innerHTML',{get:()=>html,set:value=>{for(const child of children)nodes.delete(child);children=[];html=String(value);for(const m of html.matchAll(/\bid="([^"]+)"/g)){children.push(m[1]);nodes.set(m[1],element(m[1]));}}});
    return el;
  }
  nodes.set('app',element('app'));nodes.set('modal',element('modal'));
  const doc={getElementById:id=>nodes.get(id)||null,querySelector:s=>s[0]==='#'?nodes.get(s.slice(1))||null:null,querySelectorAll:()=>[],addEventListener:(n,f)=>docEvents[n]=f,body:element('body'),createElement:element,hidden:false};
  const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  const scope={console,document:doc,window:{scrollTo(){},devicePixelRatio:1,localStorage},modal(title,html){nodes.get('modal').innerHTML=html;nodes.get('modal').open=true;},closeModal(){nodes.get('modal').open=false;},localStorage,matchMedia:()=>({matches:false}),Image:class{complete=true;naturalWidth=512;naturalHeight=640},performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:i=>frames.delete(i),setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},addEventListener:(n,f)=>events[n]=f,location:{hostname:'localhost',search:''},URLSearchParams};
  vm.createContext(scope);
  const scripts=[...fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script(?: [^>]*?)? src="([^"?]+)(?:\?[^"]*)?"[^>]*>/g)].map(m=>m[1]);
  const first=scripts.indexOf('exo-app.js'),last=scripts.indexOf('expedition.js');
  assert(first>=0&&last>first,'use the live HTML script order');
  for(const file of scripts.slice(first,last+1)){
    if(file==='exo-premium.mjs'||file==='exo-map-status.js')continue; // no GPU in this DOM harness
    let source=fs.readFileSync(path.join(dist,file),'utf8');
    if(file==='expedition.js'){
      const anchor='return {wildsMap,wildsExplore,wildsNavigate,campaign,startCampaign';assert(source.includes(anchor));
      source=source.replace(anchor,'return {__qa:{get unit(){return unit},get camera(){return camera},get fire(){return fireCourse},get terrain(){return terrain},get campaign(){return campaignState},get combat(){return combat},get journey(){return journey},observe:observeCampaign,sync:syncUpgrades},wildsMap,wildsExplore,wildsNavigate,campaign,startCampaign');
    }
    vm.runInContext(source,scope,{filename:file});
  }
  const run=s=>vm.runInContext(s,scope);
  run('ExoScene.draw=()=>{};ExoGreenTrail.draw=()=>{};ExoFireControl.overlay=()=>{};ExoTerrainCourse.overlay=()=>{};ExoTrainingUI.overlay=()=>{};');
  const qa=run('Exo.__qa');
  function frame(ms=50){now+=ms;const pending=[...frames.entries()].at(-1);assert(pending,'world animation is running');frames.delete(pending[0]);pending[1](now);}
  function escapeOpening(){run('Exo.openingAct()');frame();run('Exo.openingAct()');frame();driveTo({x:qa.unit.x,y:qa.unit.y-250});}
  function settle(n=10){for(let i=0;i<n;i++)frame();}
  function pointer(x,y){return {pointerId:77,clientX:x,clientY:y,preventDefault(){}};}
  function driveTo(p){
    run('closeModal()');const joystick=nodes.get('exo-joystick');assert(joystick);
    joystick.getBoundingClientRect=()=>({width:140,height:140,left:0,top:0});joystick.onpointerdown(pointer(70,70));
    let steps=0;
    while(Math.hypot(qa.unit.x-p.x,qa.unit.y-p.y)>10&&steps++<2500){
      const dx=p.x-qa.unit.x,dy=p.y-qa.unit.y,d=Math.hypot(dx,dy),cs=Math.cos(qa.camera.yaw),sn=Math.sin(qa.camera.yaw),m=Math.min(1,d/45);
      joystick.onpointermove(pointer(70+(dx*cs-dy*sn)/d*48*m,70+(dx*sn+dy*cs)/d*48*m));frame();
    }
    joystick.onpointerup(pointer(70,70));settle(8);
    assert(steps<2500,`ground route blocked: ${JSON.stringify({from:{x:qa.unit.x,y:qa.unit.y},to:p})}`);
    return steps;
  }
  return {run,qa,frame,settle,escapeOpening,driveTo,nodes,events,saved,frames};
}

module.exports=harness;
