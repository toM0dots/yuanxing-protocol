import {createRoadsideEncounter} from './exo-roadside-encounter.mjs?v=20261108-inspection92b';
import {installShaderGate,steadyLights} from './exo-shader-gate.mjs?v=20261110-perf94';
import {loadGameModel,yieldToInput} from './exo-asset-loader.mjs?v=20261107-loading90';
import {loadBiomeScans} from './exo-biome-textures.mjs?v=20261107-loading90';
import {createBiomes} from './exo-biomes.mjs?v=20261108-inspection92b';
import * as T from './assets/ev01/three.module.mjs';
import {createTrainingGround} from './exo-training-ground.mjs?v=20261108-inspection92b';
import {createTerrainWilds} from './exo-terrain-wilds.mjs?v=20261108-inspection92b';
import {createBuildingCameraGuard} from './exo-building-camera.mjs?v=20261106-wilds79c';
import {createHardwareShadows} from './exo-hardware-shadows.mjs?v=20261107-performance89';
import {createDepthPrepass} from './exo-depth-prepass.mjs?v=20261107-performance89';
import {createInstanceCuller,sceneGeometryKey,batchRigidModel,partitionStaticMeshes} from './exo-render-optimization.mjs?v=20261107-performance89';
import {terrainGeometry} from './exo-terrain-geometry.mjs?v=20261107-vegetation88';
import {createTerrainStream,terrainLevel} from './exo-terrain-stream.mjs?v=20261108-inspection92b';
import { createAegisRig, poseAegis } from './exo-aegis.mjs?v=20261108-inspection92b';
import {applyAegisSurface} from './exo-aegis-surface.mjs?v=20261108-inspection92b';
import {createGroundContact} from './exo-ground-contact.mjs?v=20261106-art79';
import {RoomEnvironment} from './assets/ev01/RoomEnvironment.mjs';
import { createSpaceSky } from './exo-space.mjs?v=20261106-story80';
import {loadAshland,createAshland,climate} from './exo-ashland.mjs?v=20261107-loading90';
import { createCreatureLayer, configureFaunaSurface } from './exo-creatures.mjs?v=20261108-inspection92b';
import { createWeaponRig, createPlayerWeaponLayer } from './exo-player-weapons.mjs?v=20261106-landscape87';
import { createFlightEffects } from './exo-flight-fx.mjs?v=45';
import { scannedMaterial, createWorldDetails, configureWorldMaterials } from './exo-world-details.mjs?v=20261108-inspection92b';
import { createCaverns } from './exo-caverns.mjs?v=20261108-inspection92b';
import { createBoundaryGuardian } from './exo-guardian.mjs?v=20261108-inspection92b';
import {createGuideLightsAsync,createGuideLightPool} from './exo-guide-lights.mjs?v=20261110-lamps97';
import {createRepairLamps} from './exo-lamp-repair-render.mjs?v=20261110-lamps97b';
import { createClueLayer } from './exo-clue-render.mjs?v=20261106-lived85';
import { createFacilityLayer } from './exo-facility-render.mjs?v=20261110-contact94c';
import { loadInteriorProps } from './exo-interior-dressing.mjs?v=20261110-contact94c';
import {loadHangarKit,createHangarArt,FLAGSHIP} from './exo-hangar-art.mjs?v=20261107-loading90';
import { loadCanyon } from './exo-canyon-render.mjs?v=20261107-loading90';
import {createExteriorGround} from './exo-exterior-ground.mjs?v=20261106-exterior86';
import {createRegionalLandmarks} from './exo-regional-landmarks.mjs?v=20261106-exterior86';
import {loadK09Hero,createK09Hero,K09_HANGAR} from './exo-k09-hero.mjs?v=20261107-loading90';

// The field chassis uses its authored Blender geometry and scanned PBR surfaces.
// World geometry and all game logic continue to come from the existing expedition.
const engine={ready:false,render,prepare,fail,suspendClock(){lastTime=performance.now();sampleTime=0;},constrainCamera:(target,eye)=>{const safe=hangarArt?.constrainCamera(target,eye,ExoWorld)||eye;const heroSafe=k09Hero?.constrainCamera(target,safe)||safe;const wreckSafe=ashland?.constrainCamera(target,heroSafe)||heroSafe;return !ExoWorld.cave&&buildingCamera?buildingCamera(target,wreckSafe):wreckSafe;}};window.ExoPremium=engine;
let roadside,biomes,guideLights,guideLightPool,trainingGround,terrainWilds,buildingCamera,groundContact,hardwareShadows,exteriorGround,regionalLandmarks,k09Root,k09Hero,renderer,canvas,scene,camera,model,rig,sun,worldMesh,canyonGroup,muzzleFlash,lastHP=100,damage=0,lastTime=0,floorOffset=0,host,spaceSky,creatureLayer,weaponRig,weaponLayer,flightEffects,worldDetails,caverns,facilityLayer,clueLayer,hangarKit,interiorProps=null,repairLamps=null,contactClock=0,hangarArt,ashlandAssets,ashland,guardian,terrainMaterial,hemi,lantern,mechFill,bodyPitch=0,bodyBank=0,armorBatch;
const renderProbe=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('profile')?new URLSearchParams(location.search).get('renderProbe'):null;
const frameTimes=[];let sampleTime=0,renderWidth=0,renderHeight=0,worldGeometryKey=null;
const depthPrepass=createDepthPrepass(),instanceCuller=createInstanceCuller(true),terrainStream=createTerrainStream();

const terrain=new Map(),worldMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.08,side:T.DoubleSide});
const toThree=(a)=>new T.Vector3(a[0],a[2],a[1]);
const geometry=(data,smooth=false)=>terrainGeometry(data,ExoWorld.elevation,smooth,true);

async function initialize(){await checkpoint("唤醒驾驶舱");canvas=document.createElement('canvas');canvas.id='exo-premium';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
 renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.debug.onShaderError=()=>{throw new Error('Blender scene shader could not compile')};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('EV–04 Aegis graphics context lost'))});
 await checkpoint('接通机甲与天空');scene=new T.Scene();scene.background=new T.Color(0x050912);scene.fog=new T.Fog(0x172a39,2400,7200);spaceSky=createSpaceSky(renderer);scene.add(spaceSky.mesh);configureFaunaSurface(canyonGroup.userData.scans);creatureLayer=createCreatureLayer(scene);weaponLayer=createPlayerWeaponLayer(scene);weaponRig=createWeaponRig(rig);camera=new T.PerspectiveCamera(54,1,12,9000);
 await checkpoint('校准反射与光照');const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();groundContact=createGroundContact(scene);
 await checkpoint('接通现场照明');hemi=new T.HemisphereLight(0xb7d8ff,0x202939,1.8);scene.add(hemi);mechFill=new T.DirectionalLight(0xbad5e7,.65);scene.add(mechFill,mechFill.target);lantern=new T.PointLight(0xb3ecff,80000,1100,2);scene.add(lantern);sun=new T.DirectionalLight(0xe4ecff,3.1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-450;sun.shadow.camera.right=450;sun.shadow.camera.top=450;sun.shadow.camera.bottom=-450;sun.shadow.camera.near=10;sun.shadow.camera.far=2600;sun.shadow.normalBias=1.5;sun.shadow.bias=-.00015;scene.add(sun,sun.target);if(renderProbe!=='packed')hardwareShadows=createHardwareShadows(sun);
 scene.add(model);worldMesh=new T.Mesh(new T.BufferGeometry(),worldMaterial);worldMesh.receiveShadow=true;scene.add(worldMesh);scene.add(canyonGroup);
 muzzleFlash=new T.Mesh(new T.SphereGeometry(.17,8,6),new T.MeshBasicMaterial({color:0xffe3a1}));muzzleFlash.scale.set(1,1,3);rig.muzzle.add(muzzleFlash);
 await checkpoint('准备原野植被');configureWorldMaterials(hangarKit.maps);biomes=createBiomes(scene,ExoWorld,canyonGroup.userData.scans);await checkpoint('检查沿途灯箱');guideLights=await createGuideLightsAsync(scene,hangarKit.maps,ExoWorld,ExoCanyonV2);try{repairLamps=createRepairLamps(scene,hangarKit.maps,ExoWorld,interiorProps);}catch(e){console.warn('Repairable lamps unavailable.',e);}guideLightPool=createGuideLightPool(scene);await checkpoint('准备维护路线');trainingGround=createTrainingGround(scene,ExoWorld,undefined,{...hangarKit.maps,...canyonGroup.userData.scans});await checkpoint('准备河谷与山路');terrainWilds=createTerrainWilds(scene,ExoWorld,{...hangarKit.maps,...canyonGroup.userData.scans});await checkpoint('铺好建筑周围的地面');exteriorGround=createExteriorGround(scene,{...hangarKit.maps,...canyonGroup.userData.scans},ExoWorld);await checkpoint('准备远处的地标');regionalLandmarks=createRegionalLandmarks(scene,{...hangarKit.maps,...canyonGroup.userData.scans},ExoWorld);await checkpoint('检查机甲装甲');armorBatch=batchRigidModel(model);flightEffects=createFlightEffects(scene,rig);terrainMaterial=scannedMaterial(canyonGroup.userData.scans,{color:0xffffff,vertexColors:true,ground:true});await checkpoint('放好沿途建筑与岩石');worldDetails=createWorldDetails(scene,canyonGroup.userData.scans,{exclude:new Set(k09Root?[FLAGSHIP,K09_HANGAR]:[FLAGSHIP])});await checkpoint('检查道路与洞口');buildingCamera=createBuildingCameraGuard(worldDetails.buildings);caverns=createCaverns(scene,{...hangarKit.maps,...canyonGroup.userData.scans});await checkpoint('准备原野生物');roadside=createRoadsideEncounter(scene,ExoWorld,{...hangarKit.maps,...canyonGroup.userData.scans});guardian=createBoundaryGuardian(scene);await checkpoint('准备建筑入口');facilityLayer=createFacilityLayer(scene,{maps:hangarKit.maps,props:interiorProps,exclude:a=>a.structure.id===FLAGSHIP});clueLayer=createClueLayer(scene,{maps:hangarKit.maps});await checkpoint('整理机库设备');hangarArt=createHangarArt(scene,hangarKit);await checkpoint('准备坠落现场');ashland=createAshland(scene,ashlandAssets,hangarKit.maps,ExoWorld);await checkpoint('点亮 K–09 维修间');k09Hero=createK09Hero(scene,k09Root,hangarKit.maps,canyonGroup);await checkpoint('整理可见的景物');partitionStaticMeshes(canyonGroup);partitionStaticMeshes(ashland.wreck);
}
function render(o,api,preparing=false){if(!renderer)return false;const current=document.getElementById('exo-field');if(!current)return false;if(host!==current){current.prepend(canvas);host=current;lastHP=o.combat?.hp??100;lastTime=o.now;}
 const legacy=document.getElementById('exo-gl');if(legacy)legacy.style.display='none';canvas.style.display='block';
 const perf=window.ExoPerf;perf?.mark('render start');if(o.w!==renderWidth||o.h!==renderHeight){renderer.setSize(o.w,o.h,false);renderWidth=o.w;renderHeight=o.h;}const v=api.view(o.c,o.w,o.h);camera.aspect=o.w/o.h;camera.fov=o.c.fov||54;camera.position.copy(toThree(v.eye));camera.up.copy(toThree(v.up));camera.lookAt(toThree(v.target));{const hit=(typeof ExoContact!=='undefined'?ExoContact:null)?.state;if(hit){const step=Math.min(.1,Math.max(0,(o.now-(contactClock||o.now))/1000));contactClock=o.now;ExoContact.tick(step);if(hit.shake>0&&!o.reduced){const t=o.now/1000,a=hit.shake*hit.shake;camera.position.x+=Math.sin(t*61)*a*5;camera.position.y+=Math.sin(t*47+1.3)*a*4;camera.position.z+=Math.sin(t*53+2.1)*a*5;camera.rotateZ(Math.sin(t*39)*a*.012);}}}camera.updateProjectionMatrix();spaceSky.update(camera,!!ExoWorld.cave,climate(o.unit.x,o.unit.y),o.now/1000);
 perf?.mark('resize/view/sky');canyonGroup.visible=!ExoWorld.cave&&Math.hypot(o.c.x-ExoCanyonV2.origin.x,o.c.y-ExoCanyonV2.origin.y)<4700;
 const prefix=ExoWorld.cave?.id||'surface',gx=Math.floor(o.c.x/1000),gy=Math.floor(o.c.y/1000),radius=ExoWorld.cave?2:4,keep=new Set();
 if(!ExoWorld.interior)for(let x=gx-radius;x<=gx+radius;x++)for(let y=gy-radius;y<=gy+radius;y++){const lod=terrainLevel(prefix,gx,gy,x,y),key=prefix+':'+x+','+y+':'+lod;keep.add(key);if(!terrain.has(key)){const mesh=new T.Mesh(terrainStream.take(key)||geometry(api.mesh(x,y,lod,false),true),terrainMaterial);mesh.receiveShadow=true;scene.add(mesh);terrain.set(key,mesh)}}
 for(const [key,mesh] of terrain)if(!keep.has(key)){scene.remove(mesh);mesh.geometry.dispose();terrain.delete(key)}
 api.releaseMeshes(keep);if(!ExoWorld.interior)terrainStream.prefetch(prefix,gx,gy,keep,ExoWorld.cave?4:6);
 perf?.mark('terrain cache');const markerKey=sceneGeometryKey(o,ExoWorld,o.terrain?ExoTerrainCourse.rover(o.terrain):null);if(markerKey!==worldGeometryKey){const old=worldMesh.geometry;worldMesh.geometry=geometry(api.sceneGeometry(o,false,false,false,false));old.dispose();worldGeometryKey=markerKey;}
 perf?.mark('world geometry');const u=o.unit,scale=18,ground=ExoWorld.elevation(u.x,u.y),dt=Math.min(.05,Math.max(0,(o.now-lastTime)/1000));lastTime=o.now;
 const hp=o.combat?.hp??100;if(hp<lastHP)damage=1;lastHP=hp;damage=Math.max(0,damage-dt*3);
 model.position.set(u.x,ground+(u.altitude||0)+floorOffset*scale,u.y);{const hit=(typeof ExoContact!=='undefined'?ExoContact:null)?.state;if(hit&&!o.reduced){model.position.x+=hit.leanX*5;model.position.z+=hit.leanY*5;model.position.y-=Math.min(1,Math.hypot(hit.leanX,hit.leanY))*2.5;}}model.scale.setScalar(scale);const bodyBlend=1-Math.exp(-dt*9);bodyPitch+=((u.flight?.pitch||0)-bodyPitch)*bodyBlend;bodyBank+=((u.flight?.bank||0)-bodyBank)*bodyBlend;model.rotation.set(-bodyPitch,-u.angle,bodyBank,'YXZ');
 const target=(!o.fireCourse?.active&&(o.combat?.aimAssist===false||o.combat?.targetInfo?.kind!=='fireable'))?null:o.combat?.enemies.find(e=>e.id===o.combat.target&&e.hp>0);let aimYaw=0,aimPitch=0;
 if(target){if(u.flight)aimPitch=Math.atan2(ExoWorld.elevation(target.x,target.y)+65-ground-(u.altitude||0)-65,Math.hypot(target.x-u.x,target.y-u.y))+(u.flight.pitch||0);aimYaw=Math.atan2(target.x-u.x,-(target.y-u.y))-u.angle;aimYaw=Math.atan2(Math.sin(aimYaw),Math.cos(aimYaw));}
 poseAegis(rig,(u.distance||0)*.07,{speed:Math.min(1,(o.motion.speed||0)/95),distance:u.distance||0,run:o.motion.boosting,aimYaw,aimPitch,recoil:u.recoil||0,damage,dt,sampleHeight:ExoWorld.elevation,flight:u.flight,idleTime:o.now/1000,saber:!o.fireCourse?.active?o.combat?.saber:null});
 const armed=!o.fireCourse?.active;weaponRig.update(o.combat,armed,o.now/1000,!!o.reduced);model.updateMatrixWorld(true);armorBatch?.sync();weaponLayer.update(o.combat,u,o.now/1000,ExoWorld.elevation,rig,armed,weaponRig,camera,!!o.reduced);muzzleFlash.visible=!armed&&(u.recoil||0)>.5;flightEffects.update(u,o.motion,o.now/1000,ground,!!o.reduced);
 perf?.mark('robot/weapon animation');trainingGround.update(o);terrainWilds.update(u,ExoWorld,o.now/1000,!!o.reduced);biomes.update(u,camera,o.now/1000,!!o.reduced);const weather=climate(u.x,u.y),flagship=ExoWorld.interior?.structure.id===FLAGSHIP;groundContact.update(u,ExoWorld,trainingGround.surfaceHeight);regionalLandmarks.update(u,ExoWorld);exteriorGround.update(u,ExoWorld);k09Hero.update(u,ExoWorld);ashland.update(u,camera,o.now/1000,!!o.reduced);hangarArt.update(u,ExoWorld,o.now/1000);facilityLayer.update(u,ExoWorld);clueLayer.update(u,ExoWorld,o.reduced?0:dt);worldDetails.update(u,ExoWorld);roadside.update(u);caverns.update(u,ExoWorld);guideLights.update(u,ExoWorld);repairLamps?.update(u,ExoWorld,o.now);guideLightPool.update(u,[guideLights.root,repairLamps?.root,trainingGround.root,terrainWilds.root,caverns.lanterns],!ExoWorld.interior);guardian.update(u,ExoWorld,o.combat,o.now/1000,!!o.reduced);hemi.intensity=flagship?.62:ExoWorld.interior?.50:ExoWorld.cave?.55:1.03;sun.castShadow=!flagship&&renderProbe!=='unshadowed';sun.intensity=flagship?.18:ExoWorld.interior?.08:ExoWorld.cave?.6:2.65-weather*.82;lantern.visible=!!ExoWorld.cave&&!ExoWorld.interior;lantern.position.set(u.x,ground+160,u.y);if(ExoWorld.cave)scene.fog.color.setHex(0x06151e);else scene.fog.color.setHex(0xa4aaab).lerp(new T.Color(0x8496a0),weather);scene.fog.near=flagship?1000:ExoWorld.cave?700:320;scene.fog.far=flagship?1750:ExoWorld.cave?2400:4300;sun.color.setHex(ExoWorld.cave?0xe4ecff:0xffd9b8).lerp(new T.Color(0xc3d6cf),ExoWorld.cave?0:weather);hemi.color.setHex(ExoWorld.cave?0xb7d8ff:0x8aa3b6);if(!ExoWorld.cave&&!ExoWorld.interior)hemi.groundColor.setHex(0x2a2622);
 perf?.mark('world effects');creatureLayer.update(o.combat,u,o.combat.time||o.now/1000,ExoWorld.elevation,camera,!!o.reduced);
 perf?.mark('creature animation');mechFill.position.copy(camera.position);mechFill.position.y+=200;mechFill.target.position.set(u.x,ground+70+(u.altitude||0),u.y);mechFill.intensity=ExoWorld.cave?.26:.42;sun.position.set(u.x-900,ground+(u.altitude||0)+680,u.y-620);sun.target.position.set(u.x,ground+(u.altitude||0),u.y);{const far=Math.min(9000,scene.fog.far+400);if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}spaceSky.mesh.scale.setScalar(Math.min(1,far*.9/7800));}camera.updateMatrixWorld();sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);biomes.cull(camera,sun.castShadow?sun.shadow.getFrustum():null);instanceCuller.prepare(camera);for(const batch of [...worldDetails.stones,ashland.rocks])instanceCuller.cull(batch,sun.castShadow?sun.shadow.getFrustum():null);hardwareShadows?.prepare(scene);perf?.mark('instance culling');if(preparing)return true;shaderGate?.poll();perf?.gpuBegin(renderer);if(renderProbe==='single')renderer.render(scene,camera);else depthPrepass.render(renderer,scene,camera);perf?.gpuEnd();perf?.mark('GPU submission');if(sampleTime&&o.now>sampleTime){adaptResolution(o.now-sampleTime,o.now);frameTimes.push(o.now-sampleTime);if(frameTimes.length>120)frameTimes.shift();}sampleTime=o.now;engine.stats={resolution:+renderer.getPixelRatio().toFixed(2),fps:frameTimes.length?Math.round(1000*frameTimes.length/frameTimes.reduce((a,b)=>a+b,0)):0,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,streaming:terrainStream.status};ExoMapStatus.rendered();return true;
}

let shaderGate=null,resScale=1,resEMA=0,resHold=0,resGood=0,preparation=null,initialFrame=null,bootStep=0;
async function checkpoint(label){ExoMapStatus.phase(label,bootStep++,24);await yieldToInput();}
function prepare(o,api){
 initialFrame={o,api};
 if(preparation)return preparation;
 const prefix=ExoWorld.cave?.id||'surface',gx=Math.floor(o.c.x/1000),gy=Math.floor(o.c.y/1000);
 terrainStream.prefetch(prefix,gx,gy,new Set(),ExoWorld.cave?2:4);
 preparation=(async()=>{
  await assetsReady;
  await initialize();
  await checkpoint('核对脚下的地形');
  const frame=initialFrame,{o,api}=frame,prefix=ExoWorld.cave?.id||'surface',gx=Math.floor(o.c.x/1000),gy=Math.floor(o.c.y/1000),radius=ExoWorld.cave?2:4;
  terrainStream.prefetch(prefix,gx,gy,new Set(),radius);
  const jobs=[];
  if(!ExoWorld.interior)for(let x=gx-radius;x<=gx+radius;x++)for(let y=gy-radius;y<=gy+radius;y++)jobs.push({x,y,lod:terrainLevel(prefix,gx,gy,x,y)});
  jobs.sort((a,b)=>Math.hypot(a.x-gx,a.y-gy)-Math.hypot(b.x-gx,b.y-gy));
  const deadline=performance.now()+4000;
  for(const {x,y,lod} of jobs){
   const key=prefix+':'+x+','+y+':'+lod;let geometry=terrainStream.take(key);
   while(!geometry&&terrainStream.status.enabled&&performance.now()<deadline){await new Promise(resolve=>setTimeout(resolve,12));geometry=terrainStream.take(key);}
   geometry??=terrainGeometry(api.mesh(x,y,lod,false),ExoWorld.elevation,true,true);
   const mesh=new T.Mesh(geometry,terrainMaterial);mesh.receiveShadow=true;scene.add(mesh);terrain.set(key,mesh);
   await yieldToInput();
  }
  await checkpoint('准备眼前的景物');
  render(initialFrame.o,initialFrame.api,true);
  await checkpoint('准备材质与光影');
  const textures=new Set([...Object.values(hangarKit.maps),...Object.values(canyonGroup.userData.scans)]);
  scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
  for(const texture of textures){renderer.initTexture(texture);await yieldToInput();}
  await checkpoint('完成最后的光影检查');
  steadyLights(scene);await renderer.compileAsync(scene,camera);
  await yieldToInput();
  ExoMapStatus.phase('准备好了，即将进入原野。',1,1);shaderGate=installShaderGate(renderer,scene,camera);engine.ready=true;
 })().catch(error=>fail(error,ExoMapStatus.snapshot().state==='error'?'asset':'graphics'));
 return preparation;
}
// Lower the render resolution when frames run slow (below ~42 fps) and restore
// it after sustained headroom. Stalls and pauses (>250 ms) are ignored.
function adaptResolution(interval,now){
 if(!renderer||interval>250)return;
 resEMA=resEMA?resEMA*.94+interval*.06:interval;resGood=resEMA<18.5?resGood+interval:0;
 if(now<resHold)return;
 const top=Math.min(window.devicePixelRatio||1,1.25),floor=Math.min(1,.7/top);let next=resScale;
 if(resEMA>24&&resScale>floor)next=Math.max(floor,resScale-.1);
 else if(resGood>6000&&resScale<1)next=Math.min(1,resScale+.1);
 if(next!==resScale){resScale=next;renderer.setPixelRatio(top*resScale);resHold=now+2500;resGood=0;}
}
function fail(error,kind='graphics'){engine.ready=false;ExoMapStatus.fail(kind);canvas?.remove();const legacy=document.getElementById('exo-gl');if(legacy)legacy.style.display='';console.warn('EV–04 Aegis / Blender map unavailable.',error);}
const assetsReady=(async()=>{try{const [gltf,canyon,kit,ashAssets,interiorKit,hero,flora]=await Promise.all([loadGameModel(new URL('./assets/echo9-hero-v7/Echo9_Hero_V7.glb',import.meta.url).href).then(asset=>{ExoMapStatus.loaded('mech');return asset}),loadCanyon(ExoMapStatus.loaded),loadHangarKit(),loadAshland(),loadInteriorProps().catch(e=>{console.warn('Interior prop kit unavailable; rooms keep their built-in dressing.',e);return null}),loadK09Hero().catch(e=>{console.warn('K09 detail kit unavailable; retaining the base building and lamps.',e);return null}),loadBiomeScans()]);k09Root=hero;hangarKit=kit;interiorProps=interiorKit;ashlandAssets=ashAssets;canyonGroup=canyon;Object.assign(canyonGroup.userData.scans,ashAssets.maps,flora);model=gltf.scene;applyAegisSurface(model,kit.maps);rig=createAegisRig(model);poseAegis(rig,0,{speed:0});model.updateMatrixWorld(true);floorOffset=-new T.Box3().setFromObject(model).min.y;model.traverse(obj=>{if(obj.isMesh){obj.castShadow=obj.receiveShadow=true;}});}catch(error){fail(error,'asset');throw error;}})();
assetsReady.catch(()=>{});
