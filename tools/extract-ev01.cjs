// Extract the supplied self-contained prototype without changing the source artifact.
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.argv[2],'utf8'),dest=path.resolve('dist/assets/ev01');
fs.mkdirSync(dest,{recursive:true});
const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
for(const name of ['three.module','BufferGeometryUtils','GLTFLoader','RoomEnvironment','mech']){
 let code=Buffer.from(imports[name].split(',')[1],'base64').toString();
 for(const id of Object.keys(imports))code=code.replaceAll("'"+id+"'","'./"+id+".mjs'").replaceAll('"'+id+'"','"./'+id+'.mjs"');
 // Three addons also use the package spelling.
 code=code.replaceAll("from 'three'","from './three.module.mjs'");
 fs.writeFileSync(path.join(dest,name+'.mjs'),code);
}
const model=Buffer.from(html.match(/window.ECHO_MODEL_BASE64="([^"]+)"/)[1],'base64');
fs.writeFileSync(path.join(dest,'ECHO9_EV01.glb'),model);
console.log('Extracted EV–01 GLB and local rendering dependencies:',model.length,'bytes');
