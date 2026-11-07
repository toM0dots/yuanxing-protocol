/* Deterministic teaching simulations. No network calls or invented metrics. */
const ExpeditionModels = (() => {
  const rng = (seed=71) => () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
  const softmax=a=>{const m=Math.max(...a),v=a.map(x=>Math.exp(x-m)),s=v.reduce((a,b)=>a+b,0);return v.map(x=>x/s)};
  function regression(seed=11,n=12){const r=rng(seed);return Array.from({length:n},(_,i)=>{const x=.08+i*.84/(n-1);return {x,y:.66*x+.17+(r()-.5)*.025}})}
  const loss=(rows,w,b)=>mean(rows.map(p=>(w*p.x+b-p.y)**2));
  function fit(rows,w,b,lr=.25){let dw=0,db=0;for(const p of rows){const e=w*p.x+b-p.y;dw+=2*e*p.x/rows.length;db+=2*e/rows.length}return {w:w-lr*dw,b:b-lr*db}}
  function terrain(seed=82,n=12){const r=rng(seed);return Array.from({length:n},(_,i)=>{const rough=.12+r()*.8,slope=.05+r()*.8;return {id:i,rough,slope,pass:rough>.45&&slope<.55}})}
  const decide=(p,rough,slope)=>p.rough>rough&&p.slope<slope;
  function minerals(seed=17,n=48){const r=rng(seed),centers=[[.2,.24],[.75,.27],[.53,.78]];return Array.from({length:n},(_,i)=>{const c=centers[i%3];return {x:clamp(c[0]+(r()-.5)*.24,.03,.97),y:clamp(c[1]+(r()-.5)*.24,.03,.97)}})}
  function assign(points,centers){return points.map(p=>{const ds=centers.map(c=>(p.x-c.x)**2+(p.y-c.y)**2);return ds.indexOf(Math.min(...ds))})}
  function cluster(points,centers){const groups=assign(points,centers),next=centers.map((c,j)=>{const rows=points.filter((_,i)=>groups[i]===j);return rows.length?{x:mean(rows.map(p=>p.x)),y:mean(rows.map(p=>p.y))}:{...c}});return {centers:next,groups:assign(points,next),inertia:mean(points.map((p,i)=>(p.x-next[groups[i]].x)**2+(p.y-next[groups[i]].y)**2))}}
  function geology(seed=3,n=60){const r=rng(seed);return Array.from({length:n},(_,i)=>{const label=i%3,x=new Float32Array(24*24*3),shift=Math.floor(r()*6),bright=.75+r()*.4;for(let y=0;y<24;y++)for(let col=0;col<24;col++){let v;if(label===0)v=.28+r()*.55+Math.sin(col*.9+y*.8+shift)*.13;else if(label===1)v=.5+Math.sin((y+shift)*.85+col*.12)*.18+(r()-.5)*.12;else v=((col+shift)%8<2||(y+shift)%8<2)?.8:.2+(r()-.5)*.12;const tint=label===0?[.82,.8,.78]:label===1?[1,.8,.51]:[.59,.85,1];for(let c=0;c<3;c++)x[(y*24+col)*3+c]=clamp(v*tint[c]*bright,0,1)*2-1}return {id:seed+'-'+i,label,x}})}
  // Configurable convolution -> ReLU -> average pooling, repeated 1 or 2 times.
  // Exact backpropagation and Adam over every layer, including the convolution kernels.
  class CNN {
    constructor({kernel=3,stride=2,depth=1}={}){
      this.config={kernel,stride,depth};this.random=rng(103);this.layers=[];this.epochs=0;this.steps=0;this.history=[];let size=24,channels=3;
      for(let i=0;i<depth;i++){const k=i?3:kernel,s=i?1:stride,f=i?6:4,o=Math.floor((size-k)/s)+1,p=Math.floor(o/2);if(p<1)throw Error('网络尺寸不足');const layer={size,channels,k,s,f,o,p,w:this.weights(f*k*k*channels,Math.sqrt(6/(k*k*channels))),b:new Float32Array(f)};this.layers.push(layer);size=p;channels=f}
      this.flat=size*size*channels;this.hw=this.weights(24*this.flat,Math.sqrt(6/this.flat));this.hb=new Float32Array(24);this.ow=this.weights(72,.5);this.ob=new Float32Array(3);this.params=[];for(const l of this.layers)this.params.push(l.w,l.b);this.params.push(this.hw,this.hb,this.ow,this.ob);this.m=this.params.map(a=>new Float32Array(a.length));this.v=this.params.map(a=>new Float32Array(a.length));
    }
    weights(n,scale){return Float32Array.from({length:n},()=> (this.random()*2-1)*scale)}
    forward(input){let x=input,caches=[];for(const l of this.layers){const a=new Float32Array(l.o*l.o*l.f),pool=new Float32Array(l.p*l.p*l.f);for(let y=0;y<l.o;y++)for(let col=0;col<l.o;col++)for(let f=0;f<l.f;f++){let v=l.b[f];for(let dy=0;dy<l.k;dy++)for(let dx=0;dx<l.k;dx++)for(let c=0;c<l.channels;c++)v+=x[((y*l.s+dy)*l.size+col*l.s+dx)*l.channels+c]*l.w[((f*l.k+dy)*l.k+dx)*l.channels+c];a[(y*l.o+col)*l.f+f]=Math.max(0,v)}for(let y=0;y<l.p;y++)for(let col=0;col<l.p;col++)for(let f=0;f<l.f;f++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)pool[(y*l.p+col)*l.f+f]+=a[((y*2+dy)*l.o+col*2+dx)*l.f+f]/4;caches.push({x,a,pool});x=pool}
      const h=new Float32Array(24),z=new Float32Array(3);for(let j=0;j<24;j++){let v=this.hb[j];for(let i=0;i<this.flat;i++)v+=x[i]*this.hw[j*this.flat+i];h[j]=Math.max(0,v)}for(let c=0;c<3;c++){z[c]=this.ob[c];for(let j=0;j<24;j++)z[c]+=h[j]*this.ow[c*24+j]}const probs=softmax(Array.from(z));return {caches,x,h,probs,label:probs.indexOf(Math.max(...probs))};
    }
    gradient(sample,g){const t=this.forward(sample.x),d=t.probs.slice();d[sample.label]--;const base=this.layers.length*2,dh=new Float32Array(24);let dx=new Float32Array(this.flat);for(let c=0;c<3;c++){g[base+3][c]+=d[c];for(let j=0;j<24;j++){g[base+2][c*24+j]+=d[c]*t.h[j];dh[j]+=d[c]*this.ow[c*24+j]}}for(let j=0;j<24;j++){if(t.h[j]<=0)continue;g[base+1][j]+=dh[j];for(let i=0;i<this.flat;i++){g[base][j*this.flat+i]+=dh[j]*t.x[i];dx[i]+=dh[j]*this.hw[j*this.flat+i]}}
      for(let li=this.layers.length-1;li>=0;li--){const l=this.layers[li],cache=t.caches[li],da=new Float32Array(l.o*l.o*l.f),back=new Float32Array(cache.x.length);for(let y=0;y<l.p;y++)for(let col=0;col<l.p;col++)for(let f=0;f<l.f;f++)for(let dy=0;dy<2;dy++)for(let xx=0;xx<2;xx++)da[((y*2+dy)*l.o+col*2+xx)*l.f+f]+=dx[(y*l.p+col)*l.f+f]/4;for(let y=0;y<l.o;y++)for(let col=0;col<l.o;col++)for(let f=0;f<l.f;f++){const ai=(y*l.o+col)*l.f+f;if(cache.a[ai]<=0)continue;const v=da[ai];g[li*2+1][f]+=v;for(let dy=0;dy<l.k;dy++)for(let xx=0;xx<l.k;xx++)for(let c=0;c<l.channels;c++){const ii=((y*l.s+dy)*l.size+col*l.s+xx)*l.channels+c,wi=((f*l.k+dy)*l.k+xx)*l.channels+c;g[li*2][wi]+=v*cache.x[ii];back[ii]+=v*l.w[wi]}}dx=back}
      return -Math.log(Math.max(1e-8,t.probs[sample.label]));
    }
    *epoch(data,lr=.003){const order=data.slice();for(let i=order.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}let loss=0;for(let off=0;off<order.length;off+=6){const batch=order.slice(off,off+6),g=this.params.map(a=>new Float32Array(a.length));for(const p of batch)loss+=this.gradient(p,g);this.steps++;for(let a=0;a<this.params.length;a++)for(let i=0;i<g[a].length;i++){const v=clamp(g[a][i]/batch.length,-5,5);this.m[a][i]=.9*this.m[a][i]+.1*v;this.v[a][i]=.999*this.v[a][i]+.001*v*v;this.params[a][i]-=lr*(this.m[a][i]/(1-.9**this.steps))/(Math.sqrt(this.v[a][i]/(1-.999**this.steps))+1e-8)}yield off+batch.length}this.epochs++;this.history.push(loss/data.length);return loss/data.length}
    evaluate(data){return mean(data.map(p=>+(this.forward(p.x).label===p.label)))}
  }
  class Rover {
    constructor(){this.n=8;this.walls=new Set([10,18,26,34,42,21,22,23,39,47,55]);this.q=Array.from({length:64},()=>[0,0,0,0]);this.random=rng(54);this.episodes=0;this.reward=12;this.epsilon=.25;this.history=[]}
    next(s,a){const delta=[[-1,0],[0,1],[1,0],[0,-1]][a],x=s%8+delta[1],y=Math.floor(s/8)+delta[0],n=y*8+x;return x<0||x>7||y<0||y>7||this.walls.has(n)?s:n}
    train(n=20){for(let ep=0;ep<n;ep++){let s=0,total=0;for(let i=0;i<100;i++){const a=this.random()<this.epsilon?Math.floor(this.random()*4):this.q[s].indexOf(Math.max(...this.q[s])),next=this.next(s,a),r=next===63?this.reward:next===s?-.7:-.15;this.q[s][a]+=.3*(r+(next===63?0:.95*Math.max(...this.q[next]))-this.q[s][a]);total+=r;s=next;if(s===63)break}this.episodes++;this.history.push(total)}}
    route(){let s=0,path=[s];for(let i=0;i<60;i++){s=this.next(s,this.q[s].indexOf(Math.max(...this.q[s])));path.push(s);if(s===63)break}return path}
  }
  const defaultLog='探测器发现岩石。机甲降低速度。雷达发现沙地。机甲切换步态。前方出现遗迹。机甲启动扫描。信号恢复，返回基地。探测器发现沙地。机甲切换步态。雷达发现岩石。机甲降低速度。前方出现遗迹。机甲启动扫描。信号恢复，返回基地。';
  class Sequence {
    constructor(text=defaultLog,order=2){this.order=order;this.text=Array.from(text.trim()).slice(0,12000);this.tables=Array.from({length:order+1},()=>new Map());for(let i=0;i<this.text.length;i++)for(let n=0;n<=Math.min(order,i);n++){const key=this.text.slice(i-n,i).join(''),table=this.tables[n];if(!table.has(key))table.set(key,new Map());const row=table.get(key);row.set(this.text[i],(row.get(this.text[i])||0)+1)}}
    predict(prefix){const chars=Array.from(prefix);for(let n=Math.min(this.order,chars.length);n>=0;n--){const key=n?chars.slice(-n).join(''):'',row=this.tables[n].get(key);if(row){const total=[...row.values()].reduce((a,b)=>a+b,0);return [...row].map(([token,count])=>({token,p:count/total,context:key})).sort((a,b)=>b.p-a.p)}}return []}
  }
  return {rng,clamp,mean,softmax,regression,loss,fit,terrain,decide,minerals,assign,cluster,geology,CNN,Rover,Sequence,defaultLog};
})();
if(typeof module!=='undefined')module.exports=ExpeditionModels;
