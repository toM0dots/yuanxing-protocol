const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const gains=[],starts=[];
const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),threshold:param(),ratio:param(),connect(){},disconnect(){},start(t){starts.push(t)},stop(){}});
class AudioContext {
 constructor(){this.currentTime=10;this.sampleRate=1000;this.state='running';this.destination=node()}
 createGain(){const n=node();gains.push(n);return n}
 createDynamicsCompressor(){return node()} createConvolver(){return node()} createBiquadFilter(){return node()} createBufferSource(){return node()} createOscillator(){return node()} createStereoPanner(){return node()}
 createBuffer(channels,length,rate){return {duration:length/rate,getChannelData:()=>new Float32Array(length)}}
 resume(){return Promise.resolve()}
}
const prefs=new Map(),scope={window:{AudioContext},document:{getElementById:()=>null,hidden:false},performance:{now:()=>10000},localStorage:{getItem:k=>prefs.get(k),setItem:(k,v)=>prefs.set(k,v)},setTimeout(){},setInterval(){},addEventListener(){}};
vm.createContext(scope);vm.runInContext(fs.readFileSync('dist/exo-ambience.js','utf8'),scope);
vm.runInContext('ExoAmbience.knock(false)',scope);assert.equal(gains[0].gain.value,.9,'the mix opens even before the 3D scene starts updating');const first=starts.length;vm.runInContext('ExoAmbience.knock(true)',scope);assert(starts.length>first,'the reply schedules its own sound');vm.runInContext('ExoAmbience.setEnabled(false)',scope);const muted=starts.length;vm.runInContext('ExoAmbience.knock(true);ExoAmbience.refugeRepair("filter")',scope);assert.equal(starts.length,muted,'saved mute preference covers all added sounds');vm.runInContext('ExoAmbience.setEnabled(true);ExoAmbience.refugeRepair("filter")',scope);assert(starts.length>muted,'filter installation schedules its motor-start sound');
console.log('PASS: audible mix during loading, separate reply sound, explicit mute preservation and first-delivery motor start (Web Audio scheduling, not a listening test).');
