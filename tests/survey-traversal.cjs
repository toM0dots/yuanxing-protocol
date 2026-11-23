const assert=require('node:assert/strict'),harness=require('./expedition-harness.cjs');
const h=harness(new Map([['exo-campaign-v1',JSON.stringify({version:1,started:true,done:['crash','route','lamps','mother','captain','refuge','model','defense','stabilizer'],checkpoint:{x:5200,y:12230,angle:0}})],['exo-field-story-v1',JSON.stringify({relayComplete:true,relayBattery:true})]]));
const {run,qa}=h,W=run('ExoWorld'),M=run('ExoMotion');run('Exo.resume()');let motionFrames=0;
function walk(points){for(const p of points.slice(1)){let frames=0;while(Math.hypot(qa.unit.x-p.x,qa.unit.y-p.y)>9&&frames++<9000){const dx=p.x-qa.unit.x,dy=p.y-qa.unit.y,d=Math.hypot(dx,dy);M.step(qa.unit,{x:dx/d*Math.min(1,d/40),y:dy/d*Math.min(1,d/40)},.05);motionFrames++;}assert(frames<9000,'physical movement blocked toward '+JSON.stringify(p));}}
run('Exo.trackCampaign()');walk(W.navigation(qa.unit).route.points);assert.equal(run('Exo.interaction().kind'),'survey');
for(let i=0;i<6;i++){run(`Exo.surveyTrack(${i})`);walk(W.navigation(qa.unit).route.points);assert.equal(run('Exo.interaction().id'),i);}
run('Exo.intro()');console.log('PASS: '+motionFrames+' real ground-motion frames along summit return and six-beacon route, including collision, rocks and terrain limits.');
