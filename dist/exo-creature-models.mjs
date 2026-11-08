import * as T from './assets/ev01/three.module.mjs';
import {indexExactGeometry} from './exo-render-optimization.mjs?v=20261107-performance89';
import {mergeGeometries} from './assets/ev01/BufferGeometryUtils.mjs';
import {faunaMaterial,applyFaunaScan} from './exo-fauna-surface.mjs?v=20261106-fauna81';

// Original editable creature anatomy, revision75: smooth sculpted volumes,
// articulated convex limbs, thoracic sclerites and biological cuticle maps.
// All rigid details are baked together per moving part. Instances share the
// expensive geometry, while their gait state and luminous materials are private.
const Y = new T.Vector3(0, 1, 0), DOWN = new T.Vector3(0, -1, 0);
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const v3 = a => new T.Vector3(...a);
const basalt = 0x53676b, edge = 0xbfc3ac, sinew = 0x403d36, recess = 0x232d30;
const lights = [0x476f61, 0x6c5631, 0x67733c, 0x775335];
const hullMaterial = faunaMaterial('Layered cuticle / sculpted chitin', {vertexColors:true});
// Opaque, fibrous chambers avoid transparency sorting and the former balloons.
const sacMaterial = faunaMaterial('Folded spore chamber', {color:0x80764f,roughness:.72});
const glows = lights.map(color => new T.MeshStandardMaterial({name:'Recessed sensory organ', color, emissive:color, emissiveIntensity:.28, roughness:.43, metalness:0}));

// Kept compatible with the world setup call; fauna now retains its dedicated
// biological maps instead of borrowing bedrock textures from the environment.
export function configureFaunaSurface(maps){return [hullMaterial,sacMaterial].map(m=>applyFaunaScan(m,maps)).every(Boolean);}

function finishGeometry(positions, indices, uvs) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

// End caps need their own planar UV island. Sharing circumferential wall UVs
// collapses V around the entire rim and stretches a scan into concentric bands.
// Expand only after normals are computed, keeping geometry/lighting unchanged.
function planarCapUV(geometry,capIndexStart){
  const mapped=geometry.toNonIndexed(),p=mapped.attributes.position,uv=mapped.attributes.uv;
  for(let i=capIndexStart;i<p.count;i++)uv.setXY(i,p.getX(i)/40,p.getY(i)/40);
  geometry.dispose();return mapped;
}

// Closed axial chamber: flattened ends and longitudinal folded lobes are
// anatomical shell geometry, not transparent spheres with glowing centres.
function chamberGeometry(radius,length,lowDetail){
  const p=[],uv=[],ix=[],rings=lowDetail?8:12,segments=lowDetail?10:16;
  for(let j=0;j<=rings;j++){
    const t=j/rings,z=(t-.5)*length;
    const end=Math.pow(Math.max(.002,Math.sin(Math.PI*t)),.42);
    for(let i=0;i<=segments;i++){
      const a=i/segments*TAU,fold=1+.055*Math.cos(a*6+Math.sin(t*8)*.35);
      p.push(Math.cos(a)*radius*end*fold,Math.sin(a)*radius*.92*end*fold,z);
      uv.push(i/segments*radius*TAU/40,t*length/40);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=a+segments+1;ix.push(a,a+1,b,b,a+1,b+1);
  }
  const capIndexStart=ix.length;
  for(const j of [0,rings]){
    const center=p.length/3;p.push(0,0,(j/rings-.5)*length);uv.push(.5,j/rings);
    for(let i=0;i<segments;i++){const a=j*(segments+1)+i;ix.push(...(j?[center,a,a+1]:[center,a+1,a]));}
  }
  return planarCapUV(finishGeometry(p,ix,uv),capIndexStart);
}

// Anatomically authored cross sections form a continuous rigid exoskeleton.
// Sections are [Z, centreY, halfWidth, halfHeight]; lower flanks tuck into the
// ventral seam instead of exposing an ellipsoid between floating decorations.
function carapaceGeometry(authored,detail=1,hardRim=false){
  const n=detail>=1?28:detail>0?16:12,sub=detail>=1?5:detail>0?3:2;
  // Round the two ends with actual geometry; no wide flat fan across a snout.
  const sections=authored.map(s=>s.slice()),first=sections[0],last=sections.at(-1),sign=Math.sign(first[0]-last[0])||1;
  sections.unshift([first[0]+sign*Math.min(first[2],first[3])*(hardRim?.035:.32),first[1],first[2]*(hardRim?.94:.45),first[3]*(hardRim?.94:.45)]);
  sections.push([last[0]-sign*Math.min(last[2],last[3])*(hardRim?.035:.32),last[1],last[2]*(hardRim?.94:.40),last[3]*(hardRim?.94:.40)]);
  const p=[],uv=[],ix=[],rows=(sections.length-1)*sub;
  function cubic(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
  for(let j=0;j<=rows;j++){
    const f=j/sub,k=Math.min(sections.length-2,Math.floor(f)),t=f-k;
    const values=sections[k].map((_,i)=>cubic(sections[Math.max(0,k-1)][i],sections[k][i],sections[k+1][i],sections[Math.min(sections.length-1,k+2)][i],t));
    const [z,y,w,h]=values,anatomical=k>0&&k<sections.length-2;
    const seam=anatomical?Math.exp(-Math.pow((t-.87)/.105,2))*.07:0;
    for(let i=0;i<=n;i++){
      const a=i/n*TAU,x=Math.sin(a),d=Math.cos(a),top=Math.max(0,d),underside=d<0?.69:1;
      const keel=Math.exp(-Math.pow(x/.23,2))*.075*top;
      const growth=(Math.sin(a*5+z*.1)*.012+Math.sin(z*.61+a*2)*.008)*top;
      const r=1-seam*(.4+.6*top)+growth;
      const crown=hardRim&&d>0?Math.pow(d,.67):d;
      p.push(x*w*r,y+crown*h*underside*r+h*keel,z);
      // Arc length is stable between adjacent loft rings, preserving pore scale.
      uv.push(i/n*authored.reduce((m,s)=>Math.max(m,s[2]),0)*TAU/35,z/35);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,d=a+n+1,c=d+1;ix.push(a,b,d,b,c,d);}
  const capIndexStart=ix.length;
  for(const j of [0,rows]){const center=p.length/3,offset=j*(n+1)*3;let y=0;for(let i=0;i<n;i++)y+=p[offset+i*3+1];p.push(0,y/n,p[offset+2]);uv.push(0,0);for(let i=0;i<n;i++){const a=j*(n+1)+i;ix.push(...(j?[center,a,a+1]:[center,a+1,a]));}}
  const geometry=finishGeometry(p,ix,uv),normal=geometry.attributes.normal;
  for(let j=0;j<=rows;j++){const a=j*(n+1),b=a+n,v=new T.Vector3().fromBufferAttribute(normal,a).add(new T.Vector3().fromBufferAttribute(normal,b)).normalize();normal.setXYZ(a,...v);normal.setXYZ(b,...v);}
  const g=planarCapUV(geometry,capIndexStart);g.userData.shell=true;return g;
}

// A closed, tapered curved shell: broad root, raised central keel, scalloped
// cutting edges, and a real underside. Unlike scaled polyhedra this has a
// deliberately sculpted cross-section and overlaps neighbouring armor.
function shellGeometry(width,height,length,seed=0,detail=1){
  // Curved solid sclerite rather than a thin tapered polygon card. Its rounded
  // lateral shoulders and tucked underside continue around a real rim.
  const p=[],uv=[],ix=[],rows=detail>=1?10:detail>0?7:5,radial=detail>=1?16:detail>0?10:8;
  const h=Math.max(height*.62,width*.115);
  for(let j=0;j<=rows;j++){
    const t=j/rows,z=(.5-t)*length;
    const radius=Math.pow(Math.max(.003,Math.sin(Math.PI*(.08+t*.88))),.50);
    const taper=1-t*.22;
    for(let i=0;i<=radial;i++){
      const a=i/radial*TAU,x=Math.sin(a),up=Math.cos(a),crest=Math.exp(-Math.pow(x/.25,2))*.12*Math.max(0,up);
      const ripple=1+.018*Math.cos(t*30+seed+x*3),y=up>=0?up*h+crest*h:up*h*.23;
      p.push(x*width*.5*radius*taper,y*radius*ripple,z);uv.push(i/radial*width*2/35,t*length/35);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<radial;i++){const a=j*(radial+1)+i,b=a+radial+1;ix.push(a,a+1,b,b,a+1,b+1);}
  const capIndexStart=ix.length;
  for(const j of [0,rows]){const center=p.length/3;p.push(0,0,(.5-j/rows)*length);uv.push(0,0);for(let i=0;i<radial;i++){const a=j*(radial+1)+i;ix.push(...(j?[center,a,a+1]:[center,a+1,a]));}}
  const g=planarCapUV(finishGeometry(p,ix,uv),capIndexStart);g.userData.shell=true;return g;
}

function sweepGeometry(points, radii, radial = 9, steps = 15) {
  const curve = new T.CatmullRomCurve3(points.map(v3)), frames = curve.computeFrenetFrames(steps, false);
  const p = [], uv = [], ix = [];
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, position = curve.getPointAt(t), f = t * (radii.length - 1), index = Math.min(radii.length - 2, Math.floor(f)), radius = T.MathUtils.lerp(radii[index], radii[index + 1], f - index);
    for (let i = 0; i <= radial; i++) {
      const a = i / radial * TAU, ridge = 1 + .035 * Math.cos(a * 5 + t * 12);
      const point = position.clone().addScaledVector(frames.normals[j], Math.cos(a) * radius * ridge).addScaledVector(frames.binormals[j], Math.sin(a) * radius * ridge);
      p.push(...point); uv.push(i / radial * Math.max(...radii)*TAU/40, t*curve.getLength()/40);
    }
  }
  for (let j = 0; j < steps; j++) for (let i = 0; i < radial; i++) { const a = j * (radial + 1) + i, b = a + radial + 1; ix.push(a,a+1,b,b,a+1,b+1); }
  for (const j of [0, steps]) { const center = p.length / 3; p.push(...curve.getPointAt(j / steps)); uv.push(.5,.5); for (let i = 0; i < radial; i++) { const a = j * (radial + 1) + i; ix.push(...(j ? [center,a,a+1] : [center,a+1,a])); } }
  return finishGeometry(p, ix, uv);
}

function colored(g,color){
  const c=new T.Color(color),rim=new T.Color(edge),a=[],pos=g.attributes.position,normal=g.attributes.normal;
  g.computeBoundingBox();const bounds=g.boundingBox,span=Math.max(.01,bounds.max.y-bounds.min.y);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),height=(y-bounds.min.y)/span;
    const mottling=Math.sin(x*.27+Math.sin(z*.19))*Math.sin(z*.23+y*.13);
    const dorsal=g.userData.shell?smooth(height)*.13:0;
    const nearEnd=Math.min(Math.abs(z-bounds.min.z),Math.abs(z-bounds.max.z));
    const weather=g.userData.shell?(Math.exp(-nearEnd*1.4)*.19+Math.pow(Math.max(0,normal.getY(i)),5)*(.025+.025*Math.sin(z*.8+x*.31))):0;
    const rgb=c.clone().multiplyScalar(.83+dorsal+mottling*.025).lerp(rim,weather);
    a.push(rgb.r,rgb.g,rgb.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(a,3));return g;
}

// Shared with the guardian. The API deliberately retains individual editable
// anatomical definitions, then only batches the final rendered surfaces.
export function createChitinBuilder(level = 1, detail = 1) {
  const bins = new Map();
  function add(parent, geometry, color = basalt, pos = [0,0,0], rot = [0,0,0], type = 'hull') {
    colored(geometry, color);
    geometry.applyMatrix4(new T.Matrix4().compose(v3(pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));
    if (!geometry.index) { /* all generators normally use indexed geometry */ }
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    const key = `${parent.uuid}:${type}`;
    if (!bins.has(key)) bins.set(key,{parent,type,geometries:[]});
    bins.get(key).geometries.push(g);
  }
  return {
    add,
    carapace(parent,sections,color=basalt){add(parent,carapaceGeometry(sections,detail),color);},
    scute(parent,sections,color=basalt,pos=[0,0,0],rot=[0,0,0],sculptDetail=detail,hardRim=false){add(parent,carapaceGeometry(sections,Math.min(detail,sculptDetail),hardRim),color,pos,rot);},
    plate(parent,pos,size,rot=[0,0,0],color=basalt,seed=0) { add(parent,shellGeometry(...size,seed,detail),color,pos,rot); },
    tissue(parent,pos,size,color=sinew,type='hull') {
      const g = new T.SphereGeometry(1,detail>=1?16:detail>0?12:8,detail>=1?10:detail>0?8:5), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z=p.getZ(i), y=p.getY(i), x=p.getX(i), folds=1+Math.sin(z*15+x*3)*.025*(1-y*y); p.setXYZ(i,x*size[0]*folds,y*size[1]*(1-.06*z),z*size[2]); }
      g.attributes.uv.array.forEach((n,i,a)=>a[i]=n*(i%2?Math.max(size[1],size[2]):size[0])*TAU/40);g.computeVertexNormals();add(parent,g,color,pos,[0,0,0],type);
    },
    tendon(parent,points,radii,color=sinew,radial=8,steps=12,type='hull') { add(parent,sweepGeometry(points,radii,detail>=1?radial:Math.max(4,Math.floor(radial*(detail>0?.8:.55))),detail>=1?steps:Math.max(4,Math.floor(steps*(detail>0?.72:.45)))),color,[0,0,0],[0,0,0],type); },
    finish() {
      const meshes = [];
      for (const {parent,type,geometries} of bins.values()) {
        const g = mergeGeometries(geometries, false);g.computeBoundingBox();g.computeBoundingSphere();
        const mesh = new T.Mesh(g,type === 'glow' ? glows[clamp(level-1,0,3)] : type === 'sac' ? sacMaterial : hullMaterial);
        mesh.name = `${parent.name || 'carapace'}_${type}`;mesh.castShadow = type === 'hull';mesh.receiveShadow = type === 'hull';mesh.userData.materialRole = type;
        parent.add(mesh);meshes.push(mesh);geometries.forEach(g => g.dispose());
      }
      bins.clear();return meshes;
    }
  };
}

function group(parent, name, position = [0,0,0]) { const g = new T.Group();g.name = name;g.position.fromArray(position);parent.add(g);return g; }

// Rigid skinning keeps the exact mechanical joints while letting all opaque
// surfaces draw once. Geometry and bind poses are shared by each detail tier.
export function bakeRigidSkin(root) {
  root.updateMatrixWorld(true);
  const pieces=[];root.traverse(o=>{if(o.isMesh&&o.userData.materialRole==='hull')pieces.push(o);});
  const drivers=[],geometries=[];
  for(const [i,mesh] of pieces.entries()) {
    const driver=mesh.parent;driver.userData.skinDriver=`rigid_${i}`;
    drivers.push({id:driver.userData.skinDriver,matrix:driver.matrixWorld.clone()});
    const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),n=g.attributes.position.count,index=new Uint16Array(n*4),weight=new Float32Array(n*4);
    for(let j=0;j<n;j++){index[j*4]=i;weight[j*4]=1;}
    g.setAttribute('skinIndex',new T.BufferAttribute(index,4));g.setAttribute('skinWeight',new T.BufferAttribute(weight,4));geometries.push(g);mesh.removeFromParent();mesh.geometry.dispose();
  }
  const geometry=indexExactGeometry(mergeGeometries(geometries,false));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.forEach(g=>g.dispose());
  return {geometry,drivers};
}

export function attachRigidSkin(root, template, name='Articulated chitin') {
  const nodes=new Map();root.traverse(o=>{if(o.userData.skinDriver)nodes.set(o.userData.skinDriver,o);});
  const bones=template.drivers.map(d=>{const b=new T.Bone();d.matrix.decompose(b.position,b.quaternion,b.scale);return b;});
  const mesh=new T.SkinnedMesh(template.geometry,hullMaterial);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
  mesh.add(...bones);root.add(mesh);mesh.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);
  mesh.boundingSphere=template.geometry.boundingSphere.clone();mesh.boundingSphere.radius*=1.65;
  const inverse=new T.Matrix4(),matrix=new T.Matrix4();
  return {mesh,skeleton,sync(){inverse.copy(root.matrixWorld).invert();template.drivers.forEach((d,i)=>{matrix.multiplyMatrices(inverse,nodes.get(d.id).matrixWorld);matrix.decompose(bones[i].position,bones[i].quaternion,bones[i].scale);});mesh.updateMatrixWorld(true);skeleton.update();},dispose(){skeleton.dispose();}};
}

function buildCreature(level, lowDetail=false) {
  const root = new T.Group();root.name = ['Hunter','Charger','Spore Artillery','Brood Lord'][level-1];
  const body = group(root,'body'), b = createChitinBuilder(level,lowDetail?0:1), spec = {level,legs:[],stride:[49,42,36,48][level-1],lift:[13,11,9,14][level-1]};
  const scaleColor = level === 3 ? 0x655c3f : level === 4 ? 0x5b483e : basalt;
  let serial = 0;
  function plate(parent,pos,size,rot=[0,0,0],color=scaleColor) { b.plate(parent,pos,size,rot,color,serial++); }
  function eye(parent,pos,size) { b.tissue(parent,pos,[size[0]*.75,size[1]*.72,size[2]*.68],0xffffff,'glow'); }
  function horn(parent,points,radii,color=edge) { b.tendon(parent,points,radii,color,9,16); }
  function ribbed(parent,points,radius,color=sinew) { b.tendon(parent,points,[radius*.7,radius,radius*.6],color,9,14); }
  function trunk(sections,color=scaleColor){
    // A dark continuous ventral mantle joins the separate thoracic sclerites.
    // Each convex armor segment is a closed volume, with its basal skirt sunk
    // into that mantle; the narrow gaps reveal a plausible flexible membrane.
    b.carapace(body,sections.map(([z,y,w,h])=>[z,y,w*.88,h*.85]),sinew);
    for(let i=0;i<sections.length-1;i++){
      const a=sections[i],c=sections[i+1],mid=a.map((n,k)=>(n+c[k])*.5),span=Math.abs(a[0]-c[0]),center=mid[0];
      const width=mid[2],height=mid[3],y=mid[1];
      b.scute(body,[[center+span*.49,y,width*.89,height*.84],[center+span*.12,y+.3,width*1.01,height*.92],[center-span*.40,y,width*.95,height*.88]],i%2?color:new T.Color(color).multiplyScalar(.91),[0,0,0],[0,0,0],lowDetail?0:.65,true);
      if(!lowDetail)for(const side of [-1,1]){
        // Cuticle growth ridges and embedded breathing slits along both flanks.
        b.tendon(body,[[side*width*.86,y+height*.43,center+span*.18],[side*width*.98,y+height*.20,center],[side*width*.94,y-height*.10,center-span*.10]],[.52,.69,.25],edge,5,6);
        b.tendon(body,[[side*width*.88,y-height*.08,center+span*.12],[side*width*.92,y-height*.19,center-span*.11],[side*width*.86,y-height*.26,center-span*.22]],[.55,.75,.20],recess,5,6);
      }
    }
  }
  function leg(hip, knee, foot, thickness, index) {
    const a = v3(hip), k = v3(knee), f = v3(foot), l1 = a.distanceTo(k), l2 = k.distanceTo(f), side = Math.sign(hip[0]);
    const legRoot = group(root,`leg_${index}`), upper = group(legRoot,'upper'), lower = group(legRoot,'lower');
    const hipRef = group(body,`hip_${index}`,hip);
    spec.legs.push({hip,knee,foot,l1,l2,side,offset:level===2?(index%2?.5:0):(index%3)/3+(side>0?.5:0),thickness});
    upper.position.copy(a);upper.quaternion.setFromUnitVectors(DOWN,k.clone().sub(a).normalize());
    lower.position.copy(k);lower.quaternion.setFromUnitVectors(DOWN,f.clone().sub(k).normalize());
    for(const [part,length,radius] of [[upper,l1,thickness],[lower,l2,thickness*.72]]){
      // Articulated ball and annular folds sit inside curved femur/tibia armor.
      b.tissue(part,[0,-radius*.18,0],[radius*.95,radius*.80,radius*.88],recess);
      ribbed(part,[[0,-radius*.2,0],[0,-length*.45,0],[0,-length,0]],radius*.59,sinew);
      const count=lowDetail?3:6;
      for(let j=0;j<count;j++){
        const y=-radius*.35-j*radius*.29;
        b.tendon(part,[[-radius*.57,y,-radius*.20],[0,y-.10,-radius*.64],[radius*.57,y,-radius*.20]],[radius*.11,radius*.14,radius*.11],sinew,lowDetail?4:6,lowDetail?4:6);
      }
      const outline=[[length*.13,0,radius*.72,radius*.62],[length*.27,-radius*.05,radius*1.04,radius*.89],[length*.52,0,radius*.90,radius*.76],[length*.78,radius*.12,radius*.53,radius*.47],[length*.90,0,radius*.33,radius*.32]].reverse();
      b.scute(part,outline,scaleColor,[0,0,-radius*.08],[Math.PI/2,0,0]);
      for(const side of [-1,1])b.tendon(part,[[side*radius*.50,-length*.18,radius*.28],[side*radius*.68,-length*.48,radius*.35],[side*radius*.25,-length*.88,radius*.16]],[radius*.16,radius*.20,radius*.09],sinew,6,lowDetail?6:10);
      // An embedded raised cuticular ridge carries a readable highlight.
      b.tendon(part,[[0,-length*.22,-radius*.79],[0,-length*.46,-radius*.88],[0,-length*.76,-radius*.44]],[radius*.10,radius*.12,.1],edge,5,lowDetail?5:9);
    }
    const toe = thickness * (level===2?1.05:.45);
    for (const s of level===2?[-1,0,1]:[-1,1]) horn(lower,[[s*toe*.52,-l2+2,-1],[s*toe*.76,-l2,-toe*.9],[s*toe*.87,-l2+1,-toe*2.2]],[toe*.6,toe*.34,.15]);
    return hipRef;
  }

  if (level === 1) {
    trunk([[46,34,9,7],[32,34,18,10],[12,36,21,12],[-11,37,20,12],[-30,35,15,10]]);
    for(const s of [-1,1]) {
      for(let j=0;j<3;j++)b.tendon(body,[[s*15,37,21-j*13],[s*20,34,22-j*13],[s*17,29,26-j*13]],[1.8,1.5,.6],sinew,6,7);
      for(let i=0;i<3;i++) leg([s*12,34,23-i*21],[s*(40+i*3),42-i*5,32-i*28],[s*(52+i*4),1,51-i*39],5.35,i+(s>0?3:0));
    }
    const head=group(body,'head',[0,36,-29]);b.carapace(head,[[11,1,10,7],[0,1,14,9],[-16,-1,12,7],[-29,-3,7,4]],scaleColor);
    b.scute(head,[[6,6,7,4],[-8,5,8,5],[-22,0,4,3],[-30,-2,2,1.5]],0x766348,[0,0,0],[0,0,0],.65);
    b.tissue(head,[0,-5,-20],[7,3.4,10],recess);
    for(const side of [-1,1]){
      b.scute(head,[[6,0,4.5,3],[-4,.3,5,3.5],[-15,-1,2.7,2]],scaleColor,[side*10.3,2,-5],[0,side*.12,-side*.48],.65);
      b.tissue(head,[side*8,-4,-8],[3.2,3.1,3.7],sinew);
      b.tendon(head,[[side*9,-3,3],[side*10,-6,-6],[side*7,-5,-12]],[1.6,1.8,.6],sinew,6,lowDetail?5:8);
    }
    for(const s of [-1,1]) {
      for(let i=0;i<3;i++){const p=[s*(9.5+i*.9),1-i*.4,-21+i*4.8];b.tissue(head,p,[2.1,1.5,2.5],recess);eye(head,[p[0],p[1],p[2]-.9],[1.5-i*.2,1.0,1.5]);}
      const jaw=group(head,`jaw_${s}`,[s*6,-5,-10]);horn(jaw,[[0,0,0],[s*7,-5,-11],[s*2,-2,-27]],[4.7,3.2,.18]);
      for(let j=0;j<(lowDetail?2:4);j++)horn(jaw,[[s*(4+j*.3),-3,-7-j*4],[s*(1+j*.2),-2,-8-j*4],[-s*1,-1,-11-j*4]],[1.2,.8,.12],edge);
      horn(jaw,[[s*3,-2,-7],[s*1,-2,-9],[-s*1,0,-13]],[1.5,1,.1]);
    }
    const tail=group(body,'tail',[0,36,30]);b.tendon(tail,[[0,0,0],[0,-2,19],[0,4,36],[0,11,44]],[6,4,2,.1],recess);
    for(let i=0;i<4;i++)plate(tail,[0,-i*.2,i*9+3],[12-i*2,4,14],[-.15,Math.PI,0]);
  } else if (level === 2) {
    trunk([[50,44,12,12],[37,45,25,19],[14,46,32,23],[-10,47,34,24],[-30,45,30,20],[-43,42,20,14]]);
    for(const s of [-1,1]) {
      leg([s*23,44,-22],[s*40,24,-36],[s*43,1,-43],9.5,s>0?2:0);
      leg([s*22,41,32],[s*37,30,40],[s*39,1,52],8,s>0?3:1);
      for(let i=0;i<4;i++)b.tendon(body,[[s*29,46,-23+i*15],[s*32,42,-22+i*15],[s*29,38,-18+i*15]],[2.3,2.6,.65],recess,6,8);
    }
    const head=group(body,'head',[0,39,-45]);b.carapace(head,[[12,2,20,14],[0,3,25,15],[-17,0,21,12],[-32,-3,13,7],[-38,-5,6,3]],scaleColor);
    b.scute(head,[[11,11,9,6],[0,12,11,8],[-16,7,8,7],[-31,0,4,3]],0x7b664a,[0,0,0],[0,0,0],.65);
    b.tissue(head,[0,-9,-25],[12,4.4,11],recess);
    for(const side of [-1,1]){
      b.scute(head,[[10,0,5,4],[0,1,6,5],[-14,-2,3.2,2.6]],0x6f5c43,[side*19,6,-14],[.10,side*.10,-side*.45],.65);
      b.tissue(head,[side*16,-5,-10],[5.2,5.5,5.7],sinew);
      b.tendon(head,[[side*18,-1,6],[side*21,-6,-7],[side*14,-9,-18]],[2.8,3.4,1.2],sinew,7,lowDetail?6:11);
      for(let j=0;j<(lowDetail?2:4);j++)b.tendon(head,[[side*22,-1,-1-j*3],[side*23,-3,-2-j*3],[side*20,-6,-4-j*3]],[.4,.7,.3],edge,5,5);
    }
    b.tendon(head,[[-13,-7,-31],[-7,-10,-37],[0,-11,-39],[7,-10,-37],[13,-7,-31]],[1.2,1.7,1.7,1.7,.8],recess,6,12);
    for(const s of [-1,1]) {
      horn(head,[[s*17,1,-18],[s*20,5,-31],[s*16,7,-41]],[4.5,2.7,.18]);
      b.tissue(head,[s*19,4,-19],[3.7,2.1,2.5],recess);b.tissue(head,[s*23.0,4.0,-19.7],[2.3,1.2,2.2],recess);eye(head,[s*24.1,4.1,-20.1],[1.65,.8,1.6]);
      const jaw=group(head,`jaw_${s}`,[s*7,-11,-11]);b.scute(jaw,[[8,0,7,3.5],[-3,-.4,8,4.2],[-15,1,5,3]],0x7d6b51,[0,0,-1],[0,0,s*.13],.65);
      for(let i=0;i<(lowDetail?3:5);i++)horn(jaw,[[s*3.7,-1,-12+i*3.5],[s*3.2,3.5,-13+i*3.5],[s*2.7,5,-14+i*3.5]],[1.35,.75,.08]);
    }
    const tail=group(body,'tail',[0,46,39]);b.tendon(tail,[[0,0,0],[0,-4,22],[0,1,42],[0,4,53]],[10,7,3,.2],recess);
    for(let i=0;i<5;i++)plate(tail,[0,2-i*.6,i*10+3],[22-i*3.5,6-i*.8,19],[-.12,Math.PI,0]);
  } else if (level === 3) {
    trunk([[38,36,15,10],[25,39,29,17],[4,39,32,19],[-21,38,28,17],[-36,34,14,9]]);
    for(const s of [-1,1]) {
      for(let i=0;i<3;i++) {
        leg([s*24,34,24-i*24],[s*(49+(i===1?5:0)),48,27-i*26],[s*(65+(i===1?7:0)),1,42-i*40],6,i+(s>0?3:0));
      }
      eye(body,[s*13,38,-30],[3,2.5,3]);eye(body,[s*7,39,-33],[1.7,1.8,2]);
      horn(body,[[s*10,29,-25],[s*17,24,-37],[s*5,20,-44]],[5,3,.2]);
    }
    const sacs=group(body,'sacs');
    for(const [x,y,z,r] of [[-17,60,7,12],[17,59,7,12],[0,61,28,11]]) {
      b.add(sacs,chamberGeometry(r,44,lowDetail),0xffffff,[x,y,z],[0,0,x<0?.12:x>0?-.12:0],'sac');
      for(let j=0;j<(lowDetail?3:6);j++){
        const z0=z-18+j*(lowDetail?13:7.1);
        b.tendon(sacs,[[x-r*.7,y-r*.8,z0],[x-r*.9,y+r*.38,z0+2],[x,y+r*.92,z0+3],[x+r*.9,y+r*.35,z0+2],[x+r*.7,y-r*.8,z0]],[1.05,1.15,1.05,1.15,.6],0x655439,6,10);
      }
      // Narrow natural slit vents, not a luminous sphere inside each chamber.
      b.tendon(sacs,[[x-3,y+r*.72,z-12],[x,y+r*.79,z],[x+2,y+r*.70,z+11]],[.65,.8,.35],recess,5,8);
    }
    const turret=group(body,'turret',[0,59,8]);
    b.tendon(turret,[[0,0,0],[0,16,2],[0,37,-10]],[11,10,6],sinew,14,16);
    for(const s of [-1,1]) {
      plate(turret,[s*7,20,1],[17,7,39],[-1.15,0,-s*.35]);
      horn(turret,[[s*5,13,4],[s*11,32,2],[s*8,47,-9]],[5,3,.2],basalt);
    }
    // Six naturally uneven cuticle lips replace the manufactured torus rim.
    for(let j=0;j<(lowDetail?4:6);j++){
      const a=j/(lowDetail?4:6)*TAU,da=.44,x=Math.cos(a),z=Math.sin(a);
      b.tendon(turret,[[Math.cos(a-da)*6.5,36.6,-10+Math.sin(a-da)*6.5],[x*7.3,38.2+(j%2)*.6,-10+z*7.3],[Math.cos(a+da)*6.5,36.8,-10+Math.sin(a+da)*6.5]],[1.4,1.8,1.3],edge,6,lowDetail?5:8);
      if(!lowDetail)b.tendon(turret,[[x*6.2,35,-10+z*6.2],[x*6.8,28,-7+z*7.2],[x*7.1,18,-3+z*8]],[.55,.8,.2],scaleColor,5,8);
    }
    // Recessed luminous membrane leaves a clearly visible dark mortar rim.
    b.tissue(turret,[0,35.4,-9.4],[4.9,1.2,4.9],0xffffff,'glow');
  } else {
    // Upright load-bearing thorax: narrowed waist, broad shoulder girdle and
    // protected sternum, with connected abdominal segments rather than spheres.
    b.scute(body,[[142,0,13,13],[127,0,29,26],[108,3,27,25],[90,1,20,19],[79,0,13,13]],sinew,[0,0,2],[-Math.PI/2,0,0]);
    b.scute(body,[[85,0,16,14],[75,0,26,20],[64,0,27,18],[55,0,15,13]],scaleColor,[0,0,12],[-Math.PI/2,0,0]);
    for(let j=0;j<4;j++){
      const y=91+j*12,w=[30,39,43,39][j],z=[-17,-23,-25,-22][j];
      plate(body,[0,y,z],[w,9,18],[-Math.PI/2,0,0],j%2?scaleColor:0x766049);
      if(!lowDetail)for(const side of [-1,1])b.tendon(body,[[side*w*.35,y+4,z-2],[side*w*.46,y,z+1],[side*w*.42,y-5,z+4]],[.6,1,.35],edge,5,7);
    }
    for(const side of [-1,1])b.tendon(body,[[side*17,82,0],[side*25,104,6],[side*24,127,4]],[3,4.4,3],sinew,8,lowDetail?8:14);
    for(const s of [-1,1]) {
      leg([s*21,64,4],[s*49,36,-21],[s*58,1,-41],8,s>0?2:0);
      leg([s*20,59,25],[s*43,32,42],[s*53,1,62],7,s>0?3:1);
      const arm=group(body,`arm_${s}`,[s*31,127,-1]);
      b.tissue(arm,[0,0,0],[13,12,12],recess);ribbed(arm,[[0,0,0],[s*13,-16,0],[s*20,-33,-4]],9.5);
      plate(arm,[s*3,3,-8],[48,12,43],[-1.18,0,-s*.48]);
      for(let i=0;i<2;i++)plate(arm,[s*(12+i*6),-16-i*13,-11],[29-i*4,6,25],[-1.27,0,-s*.35]);
      plate(arm,[s*7,9,4],[32,8,35],[.18,0,-s*.25]);
      const forearm=group(arm,'forearm',[s*20,-33,-4]);ribbed(forearm,[[0,0,0],[s*6,-22,-3],[s*8,-43,-13]],6);
      for(let i=0;i<2;i++)plate(forearm,[s*4,-8-i*20,-9-i*4],[32-i*4,7,37],[-1.28,0,s*.12]);
      plate(forearm,[s*12,-33,-13],[33,8,47],[-1.1,0,-s*.38]);
      horn(forearm,[[s*10,-10,-7],[s*22,-39,-28],[s*15,-71,-48],[-s*7,-83,-57]],[10,8.4,4.6,.16],0x8b8776);
      horn(forearm,[[-s*6,-31,-11],[-s*10,-51,-25],[-s*2,-63,-39]],[5.5,3.5,.12],basalt);
      b.tendon(forearm,[[s*13,-19,-14],[s*21,-39,-29],[s*13,-65,-47]],[.9,1.4,.3],0x9b683d,6,12);
      group(forearm,s<0?'Claw_L':'Claw_R',[-s*7,-83,-57]);
    }
    const head=group(body,'head',[0,151,-4]);b.carapace(head,[[18,-2,11,7],[6,0,17,10],[-11,-3,17,9],[-30,-7,10,5],[-37,-9,4,2.5]],scaleColor);
    for(const s of [-1,1]) {
      b.tissue(head,[s*13,-1,-20],[3.6,1.9,2.8],recess);eye(head,[s*14.3,-1.3,-21.2],[1.8,.75,1.4]);plate(head,[s*13,1,-18],[12,2.8,17],[.1,0,-s*.5]);
      const jaw=group(head,`jaw_${s}`,[s*5,-7,-7]);horn(jaw,[[0,0,0],[s*5,-9,-5],[s*1,-15,-13]],[3,2,.1]);
    }
    b.tissue(body,[0,115,-24],[4,7,3],recess);eye(body,[0,115,-27],[1.4,3.1,1.2]);
  }
  if(level===1)group(root.getObjectByName('head'),'AttackEmitter',[0,-3,-23]);
  else if(level===2)group(root.getObjectByName('head'),'AttackEmitter',[0,-1,-29]);
  else if(level===3)group(root.getObjectByName('turret'),'AttackEmitter',[0,39,-10]);
  else group(body,'AttackEmitter',[0,115,-27]);
  b.finish();root.userData.spec = spec;root.userData.level = level;
  return {root,skin:bakeRigidSkin(root)};
}

const templates = new Map();
export function createCreature(level = 1, lowDetail = false) {
  level = Math.round(clamp(finite(level,1),1,4));
  const key=`${level}:${lowDetail?1:0}`;
  if (!templates.has(key)) templates.set(key,buildCreature(level,lowDetail));
  const template=templates.get(key),root = template.root.clone(true), body = root.getObjectByName('body'), spec = root.userData.spec;
  const skin=template.skin?attachRigidSkin(root,template.skin):null;
  const privateMaterials = [];
  root.traverse(o => { if (o.isMesh && o.userData.materialRole === 'glow') {o.material=o.material.clone();privateMaterials.push(o.material);} });
  const legs=spec.legs.map((def,i)=>{const g=root.getObjectByName(`leg_${i}`);return {root:g,upper:g.getObjectByName('upper'),lower:g.getObjectByName('lower'),hip:root.getObjectByName(`hip_${i}`),def,world:null,from:new T.Vector3(),to:new T.Vector3(),foot:new T.Vector3(),knee:new T.Vector3(),swing:false,swingT:0,lastPhase:0};});
  return {root,body,legs,level,spec,lowDetail,skin,head:root.getObjectByName('head'),tail:root.getObjectByName('tail'),turret:root.getObjectByName('turret'),sacs:root.getObjectByName('sacs'),arms:body.children.filter(o=>o.name.startsWith('arm_')),jaws:[],distance:0,heading:null,lastTime:null,lastPosition:null,
    dispose(){root.removeFromParent();privateMaterials.forEach(m=>m.dispose());skin?.dispose();}};
}

function poseLeg(leg, hip, foot, bend) {
  const {l1,l2} = leg.def, direction = foot.clone().sub(hip), actual = direction.length(), length = clamp(actual,.001,l1+l2-.001);direction.normalize();
  const x = (l1*l1-l2*l2+length*length)/(2*length), y = Math.sqrt(Math.max(0,l1*l1-x*x));
  const pole = bend.clone().sub(hip);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  if(pole.lengthSq()<.001)pole.set(leg.def.side,0,0);
  const knee=hip.clone().addScaledVector(direction,x).addScaledVector(pole,y);
  // On extreme slopes extend the two sections uniformly, preserving planted
  // contact instead of letting unreachable feet hang above terrain.
  const stretch=Math.max(1,actual/(l1+l2-.001));
  leg.upper.position.copy(hip);leg.upper.quaternion.setFromUnitVectors(DOWN,knee.clone().sub(hip).normalize());leg.upper.scale.set(1,knee.distanceTo(hip)/l1,1);
  leg.lower.position.copy(knee);leg.lower.quaternion.setFromUnitVectors(DOWN,foot.clone().sub(knee).normalize());leg.lower.scale.set(1,foot.distanceTo(knee)/l2,1);
  leg.foot.copy(foot);leg.knee.copy(knee);leg.root.userData.stretch=stretch;
}

// ground may be the old numeric center height or an elevation(x, gameY)
// callback. Callback mode plants every toe on its own terrain sample.
export function poseCreature(rig,e,u,time,ground) {
  time=finite(time);const dt=rig.lastTime===null?1/60:clamp(time-rig.lastTime,0,.1);rig.lastTime=time;
  const sample=typeof ground==='function'?(x,z)=>finite(ground(x,z)) : ()=>finite(ground);
  const position=new T.Vector3(finite(e.x),sample(e.x,e.y)+finite(e.jumpZ),finite(e.y));
  const delta=rig.lastPosition?Math.hypot(position.x-rig.lastPosition.x,position.z-rig.lastPosition.z):0;
  const teleport=delta>rig.spec.stride*4;
  if(Number.isFinite(e.distance))rig.distance=e.distance;else if(!teleport)rig.distance+=delta;
  rig.lastPosition=position.clone();rig.root.position.copy(position);
  const a=e.action,phase=a?.phase,windup=phase==='windup',dash=phase==='dash',release=phase==='release',recover=phase==='recover';
  const durations={windup:.7,dash:.5,release:.25,recover:.65},duration=Math.max(.001,finite(a?.duration,durations[phase]||.7)),p=clamp(1-finite(a?.time,duration)/duration);
  const brace=windup?smooth(p):recover?(1-smooth(p))*.35:0,impulse=release?Math.exp(-p*6):dash?1:0;
  const vx=finite(e.vx),vz=finite(e.vy),speed=Math.hypot(vx,vz),moving=speed>1.5||delta>.01;
  const target=a?.target||(e.state==='chase'?u:null);
  let desired=rig.heading??0;
  if(target&&Math.hypot(target.x-e.x,target.y-e.y)>.1)desired=Math.atan2(-(target.x-e.x),-(target.y-e.y));
  else if(moving)desired=Math.atan2(-vx,-vz);
  if(rig.heading===null||teleport)rig.heading=desired;
  else rig.heading+=Math.atan2(Math.sin(desired-rig.heading),Math.cos(desired-rig.heading))*(1-Math.exp(-dt*(dash?4:8)));
  rig.root.rotation.y=rig.heading;rig.root.rotation.z=0;rig.root.scale.setScalar(1);
  if(e.hp<=0&&e.death){
   // The first impact buckles the support legs; the body settles on its flank.
   // Corpses stay while the pilot is nearby and never keep attacking.
   const collapse=smooth(e.death.age/1.05),settle=Math.sin(clamp(e.death.age/1.35)*Math.PI)*3,side=e.death.side||1;
   rig.body.position.set(0,-collapse*(rig.level===4?50:rig.level===3?31:rig.level===2?23:15)+settle,0);
   rig.body.rotation.set(.12*collapse,0,side*.42*collapse);
   if(rig.head)rig.head.rotation.x=.30*collapse;
   if(rig.tail)rig.tail.rotation.y=side*.35*collapse;
   for(const arm of rig.arms){arm.rotation.x=.7*collapse;arm.rotation.z=Math.sign(arm.position.x)*.4*collapse;}
   rig.root.traverse(o=>{if(o.isMesh&&o.userData.materialRole==='glow')o.material.emissiveIntensity=.28*(1-collapse);});
   rig.root.updateMatrixWorld(true);const inverse=rig.root.matrixWorld.clone().invert();
   for(const leg of rig.legs){const hip=leg.hip.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),foot=v3(leg.def.foot);foot.x+=leg.def.side*collapse*12;foot.z+=collapse*(leg.def.offset<.5?9:-9);const world=foot.clone().applyMatrix4(rig.root.matrixWorld);world.y=sample(world.x,world.z)+1;poseLeg(leg,hip,world.applyMatrix4(inverse),v3(leg.def.knee));leg.world=null;}
   rig.root.updateMatrixWorld(true);rig.skin?.sync();return;
  }
  const hit=e.hitReaction,envelope=hit?Math.sin(clamp(1-hit.time/hit.total)*Math.PI)*Math.exp(-clamp(1-hit.time/hit.total)*2)*hit.strength:0;
  const hitSide=hit?(hit.x*Math.cos(rig.heading)-hit.y*Math.sin(rig.heading)):0,hitForward=hit?(hit.x*Math.sin(rig.heading)+hit.y*Math.cos(rig.heading)):0;
  rig.body.position.x=hitSide*envelope*5;rig.body.position.z=hitForward*envelope*4;
  const gait=rig.distance/rig.spec.stride,breath=Math.sin(time*1.35+finite(e.id))*.24;
  const goalY=breath-(e.stagger>0?4:0)-brace*(rig.level===4?9:rig.level===2?6:4)+(release?-impulse*2:0);
  const follow=1-Math.exp(-dt*14);
  rig.body.position.y=T.MathUtils.lerp(rig.body.position.y,goalY,follow);
  rig.body.rotation.x=T.MathUtils.lerp(rig.body.rotation.x,(rig.level===3?.06:.20)*brace+(dash?-.08:0)+hitForward*envelope*.12,follow);
  rig.body.rotation.z=T.MathUtils.lerp(rig.body.rotation.z,(moving?Math.sin(gait*TAU)*.018:0)-hitSide*envelope*.16,follow);
  rig.body.rotation.y=T.MathUtils.lerp(rig.body.rotation.y,rig.level===4?-.24*brace+(release?.48*impulse:0):0,follow);
  if(rig.head) {rig.head.rotation.x=T.MathUtils.lerp(rig.head.rotation.x,(rig.level===2?.39:-.16)*brace+(release?-.13*impulse:0),follow);rig.head.rotation.y=rig.level===1?Math.sin(time*.8+finite(e.id))*.025:0;}
  if(rig.tail)rig.tail.rotation.y=Math.sin(gait*TAU*.5+time*.2)*.1;
  if(rig.turret) {rig.turret.rotation.x=.16*brace-.22*impulse;rig.turret.position.y=59-impulse*4;}
  if(rig.sacs) {rig.sacs.scale.setScalar(1+.015*brace-.022*impulse);rig.sacs.position.y=-64*(rig.sacs.scale.y-1);}
  for(const arm of rig.arms) {
    const side=Math.sign(arm.position.x),forearm=arm.getObjectByName('forearm');
    arm.rotation.z=T.MathUtils.lerp(arm.rotation.z,side*(.05+.5*brace-.36*impulse),follow);
    arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,-.5*brace+.75*impulse,follow);
    arm.rotation.y=T.MathUtils.lerp(arm.rotation.y,side*(-.25*brace+.6*impulse),follow);
    forearm.rotation.x=T.MathUtils.lerp(forearm.rotation.x,-.3*brace+.4*impulse,follow);
  }
  rig.root.traverse(o=>{if(o.name.startsWith('jaw_'))o.rotation.y=Math.sign(o.position.x)*(.07+.18*brace+.25*impulse);if(o.isMesh&&o.userData.materialRole==='glow')o.material.emissiveIntensity=.28+brace*.48+impulse*.7;});
  rig.root.updateMatrixWorld(true);
  const inverse=rig.root.matrixWorld.clone().invert(),airborne=finite(e.jumpZ)>2;
  for(const leg of rig.legs) {
    const def=leg.def,hip=leg.hip.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),rest=v3(def.foot),nominal=rest.clone().applyMatrix4(rig.root.matrixWorld);
    nominal.y=sample(nominal.x,nominal.z)+1;
    const cycle=((gait+def.offset)%1+1)%1,swingPhase=(cycle-.64)/.36;
    if(!leg.world||teleport) {leg.world=nominal.clone();leg.swing=false;leg.lastPhase=cycle;}
    if(airborne) {
      const tuck=rest.clone();tuck.y+=12; tuck.z+=7;poseLeg(leg,hip,tuck,v3(def.knee));leg.world=null;continue;
    }
    const displaced=leg.world.distanceTo(nominal)>rig.spec.stride*.9;
    if(!leg.swing&&((moving&&cycle>=.64&&leg.lastPhase<.64)||displaced)) {
      leg.swing=true;leg.swingT=0;leg.from.copy(leg.world);leg.to.copy(nominal);
      const lead=rig.spec.stride*.22;const velocity=new T.Vector3(vx,0,vz);if(velocity.lengthSq()>1)leg.to.addScaledVector(velocity.normalize(),lead);
      leg.to.y=sample(leg.to.x,leg.to.z)+1;
    }
    if(leg.swing) {
      const stepRate=Math.max(2.6,speed/(rig.spec.stride*.36));leg.swingT=clamp(leg.swingT+dt*stepRate);
      leg.world.lerpVectors(leg.from,leg.to,smooth(leg.swingT));leg.world.y+=Math.sin(Math.PI*leg.swingT)*rig.spec.lift;
      if(leg.swingT>=1){leg.swing=false;leg.world.copy(leg.to);}
    } else leg.world.y=sample(leg.world.x,leg.world.z)+1;
    const foot=leg.world.clone().applyMatrix4(inverse);poseLeg(leg,hip,foot,v3(def.knee));leg.lastPhase=cycle;
  }
  rig.root.updateMatrixWorld(true);
  rig.skin?.sync();
}

export const creatureModelInfo = Object.freeze({reference:'art/creature-anatomy-v75.json',axes:'Y up, -Z forward',supportLegs:[6,4,6,4],attackArms:[0,0,0,2],materials:'Original512px biological cuticle color/normal/roughness maps, cool slate cuticle with pale worn rims, dull connective tissue and waxy plate highlights; no environmental rock texture. Smooth authored lofts and closed sclerites retain2LODs.'});
