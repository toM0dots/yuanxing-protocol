importScripts('tiny-cnn.js?v=5');
self.onmessage=e=>{try{const d=e.data,net=new TinyCNN(d.model),train=(d.train||[]).map(s=>({...s,x:TinyCNN.input(s)})),dev=(d.dev||[]).map(s=>({...s,x:TinyCNN.input(s)}));
 if(d.type==='train'){let before=net.evaluate(dev);postMessage({type:'baseline',metrics:before});for(let i=0;i<d.epochs;i++){let loss=net.epoch(train,{lr:d.lr||.002,augment:!!d.augment});postMessage({type:'epoch',epoch:net.epochs,loss,metrics:net.evaluate(dev),model:net.export()})}postMessage({type:'done',model:net.export(),metrics:net.evaluate(dev)})}
 else postMessage({type:'evaluated',metrics:net.evaluate(dev)});
}catch(err){postMessage({type:'error',message:err.message})}};
