/* A small, fully trainable CNN. HWC RGB input, 3x3 stride-2 conv, ReLU,
   2x2 average pool, dense ReLU, softmax. Adam updates ALL trainable layers. */
class TinyCNN {
 constructor(saved){
  this.F=8;this.H=24;this.D=200;this.epochs=0;this.steps=0;this.seed=314159;
  this.p={cw:new Float32Array(8*27),cb:new Float32Array(8),hw:new Float32Array(24*200),hb:new Float32Array(24),ow:new Float32Array(3*24),ob:new Float32Array(3)};
  for(let key of ['cw','hw','ow']){let scale=key==='cw'?Math.sqrt(6/27):key==='hw'?Math.sqrt(6/200):Math.sqrt(6/24);for(let i=0;i<this.p[key].length;i++)this.p[key][i]=(this.random()*2-1)*scale}
  if(saved){if(saved.version!==1)throw Error('Unsupported CNN version');for(let k in this.p){if(!Array.isArray(saved.p[k])||saved.p[k].length!==this.p[k].length||!saved.p[k].every(Number.isFinite))throw Error('Invalid CNN weights');this.p[k].set(saved.p[k])}this.epochs=saved.epochs||0;this.steps=saved.steps||0;this.seed=saved.seed||314159}
  this.m={};this.v={};for(let k in this.p){this.m[k]=new Float32Array(this.p[k].length);this.v[k]=new Float32Array(this.p[k].length);if(saved?.m?.[k]?.length===this.m[k].length)this.m[k].set(saved.m[k]);if(saved?.v?.[k]?.length===this.v[k].length)this.v[k].set(saved.v[k])}
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
 static input(sample){return Float32Array.from(sample.rgb8||sample.rgb,v=>sample.rgb8?v/127.5-1:v*2-1)}
 static transform(x,brightness=1,dx=0,flip=false){let out=new Float32Array(x.length);for(let y=0;y<24;y++)for(let col=0;col<24;col++){let xx=Math.max(0,Math.min(23,(flip?23-col:col)-dx));for(let c=0;c<3;c++)out[(y*24+col)*3+c]=Math.max(-1,Math.min(1,(x[(y*24+xx)*3+c]+1)*brightness-1))}return out}
 forward(x){let {cw,cb,hw,hb,ow,ob}=this.p,a=new Float32Array(11*11*8),pool=new Float32Array(200),h=new Float32Array(24),z=new Float32Array(3);
  for(let y=0;y<11;y++)for(let col=0;col<11;col++)for(let f=0;f<8;f++){let val=cb[f];for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++)for(let c=0;c<3;c++)val+=x[((y*2+ky)*24+col*2+kx)*3+c]*cw[f*27+(ky*3+kx)*3+c];a[(y*11+col)*8+f]=Math.max(0,val)}
  for(let y=0;y<5;y++)for(let col=0;col<5;col++)for(let f=0;f<8;f++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)pool[(y*5+col)*8+f]+=a[((y*2+dy)*11+col*2+dx)*8+f]/4;
  for(let j=0;j<24;j++){let val=hb[j];for(let i=0;i<200;i++)val+=pool[i]*hw[j*200+i];h[j]=Math.max(0,val)}
  for(let j=0;j<3;j++){z[j]=ob[j];for(let i=0;i<24;i++)z[j]+=h[i]*ow[j*24+i]}
  let max=Math.max(...z),sum=0;for(let i=0;i<3;i++){z[i]=Math.exp(z[i]-max);sum+=z[i]}for(let i=0;i<3;i++)z[i]/=sum;
  return {a,pool,h,probs:z,label:z.indexOf(Math.max(...z))};
 }
 gradients(x,label,g){let t=this.forward(x),d=Float32Array.from(t.probs);d[label]-=1;let dh=new Float32Array(24),dp=new Float32Array(200),da=new Float32Array(968);
  for(let j=0;j<3;j++){g.ob[j]+=d[j];for(let i=0;i<24;i++){g.ow[j*24+i]+=d[j]*t.h[i];dh[i]+=d[j]*this.p.ow[j*24+i]}}
  for(let j=0;j<24;j++){if(t.h[j]<=0)continue;g.hb[j]+=dh[j];for(let i=0;i<200;i++){g.hw[j*200+i]+=dh[j]*t.pool[i];dp[i]+=dh[j]*this.p.hw[j*200+i]}}
  for(let y=0;y<5;y++)for(let col=0;col<5;col++)for(let f=0;f<8;f++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)da[((y*2+dy)*11+col*2+dx)*8+f]+=dp[(y*5+col)*8+f]/4;
  for(let y=0;y<11;y++)for(let col=0;col<11;col++)for(let f=0;f<8;f++){let ai=(y*11+col)*8+f;if(t.a[ai]<=0)continue;let d=da[ai];g.cb[f]+=d;for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++)for(let c=0;c<3;c++)g.cw[f*27+(ky*3+kx)*3+c]+=d*x[((y*2+ky)*24+col*2+kx)*3+c]}
  return -Math.log(Math.max(1e-8,t.probs[label]));
 }
 *epochBatches(data,{lr=.002,augment=false}={}){let order=data.map((_,i)=>i);for(let i=order.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}let loss=0;
  for(let off=0;off<order.length;off+=8){let g={};for(let k in this.p)g[k]=new Float32Array(this.p[k].length);let batch=order.slice(off,off+8);for(let idx of batch){let s=data[idx],x=s.x||TinyCNN.input(s);if(augment)x=TinyCNN.transform(x,.75+this.random()*.5,Math.floor(this.random()*5)-2,this.random()<.5);loss+=this.gradients(x,s.label,g)}this.steps++;let bc1=1-Math.pow(.9,this.steps),bc2=1-Math.pow(.999,this.steps);for(let k in this.p)for(let i=0;i<this.p[k].length;i++){let gg=Math.max(-5,Math.min(5,g[k][i]/batch.length));this.m[k][i]=.9*this.m[k][i]+.1*gg;this.v[k][i]=.999*this.v[k][i]+.001*gg*gg;this.p[k][i]-=lr*(this.m[k][i]/bc1)/(Math.sqrt(this.v[k][i]/bc2)+1e-8)}yield {completed:Math.min(off+8,data.length),total:data.length}}this.epochs++;return loss/data.length;
 }
 epoch(data,options){const steps=this.epochBatches(data,options);let result;do{result=steps.next()}while(!result.done);return result.value}
 evaluate(data){let matrix=Array.from({length:3},()=>[0,0,0]),loss=0,items=[];for(let s of data){let t=this.forward(s.x||TinyCNN.input(s));matrix[s.label][t.label]++;loss-=Math.log(Math.max(1e-8,t.probs[s.label]));items.push({id:s.id,actual:s.label,pred:t.label,probs:Array.from(t.probs)})}return {n:data.length,accuracy:data.length?matrix.reduce((n,row,i)=>n+row[i],0)/data.length:0,loss:loss/Math.max(1,data.length),matrix,items}}
 export(){let o={version:1,epochs:this.epochs,steps:this.steps,seed:this.seed,p:{},m:{},v:{}};for(let k in this.p){o.p[k]=Array.from(this.p[k]);o.m[k]=Array.from(this.m[k]);o.v[k]=Array.from(this.v[k])}return o}
}
if(typeof module!=='undefined')module.exports={TinyCNN};
