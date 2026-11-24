const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../dist/exo-systems-playtest.js'),'utf8');
const saved=new Map([['exo-campaign-v1','original campaign'],['exo-things-v1','original things']]);
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
function boot(search){const scope={localStorage:storage,location:{search},URLSearchParams};scope.window=scope;vm.createContext(scope);vm.runInContext(source,scope);return scope;}
const normal=boot('');assert.equal(normal.localStorage,storage);assert.equal(saved.size,2);
const trial=boot('?playtest=systems110');assert(trial.ExoSystemsPlaytest);const campaign=JSON.parse(trial.localStorage.getItem('exo-campaign-v1'));assert.equal(campaign.done.length,9);assert.equal(campaign.checkpoint.x,5980);
trial.localStorage.setItem('exo-things-v1','playtest outcome');trial.localStorage.setItem('exo-campaign-v1','continued playtest');
const reload=boot('?playtest=systems110');assert.equal(reload.localStorage.getItem('exo-things-v1'),'playtest outcome');assert.equal(reload.localStorage.getItem('exo-campaign-v1'),'continued playtest');assert.equal(saved.get('exo-things-v1'),'original things');assert.equal(saved.get('exo-campaign-v1'),'original campaign');
console.log('PASS: explicit depot playtest, one-time seed, independent persistence and untouched story saves.');
