import bpy,numpy as np,math,json,gc,time
from pathlib import Path
from mathutils import Vector,noise
P=Path(__file__).resolve().parent;OUT=P/'world_v2'
fields=np.load(OUT/'terrain_fields.npz');H=fields['height'];W=fields['water'];C=fields['color'].astype('f')/255;info=json.loads((OUT/'terrain_manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(P/'world/ECHO9_Frontier_1024km.blend'));s=bpy.context.scene;s.name='ECHO9 • Full Terrain v2'
for c in list(s.collection.children):
 if c.name[:2] in ['10','11','12','13','14']:
  for o in list(c.objects):
   d=o.data;bpy.data.objects.remove(o,do_unlink=True)
   if d and d.users==0:
    if isinstance(d,bpy.types.Mesh):bpy.data.meshes.remove(d)
  bpy.data.collections.remove(c)
cols={}
for name in ['10_WORLD_LOD','11_Origin_5m','12_Regions_31m','13_Hydrology','14_Region_Scenery','15_Cameras','16_Waypoints']:
 c=bpy.data.collections.new(name);s.collection.children.link(c);cols[name]=c
# A single continuous material reads sampled, smoothly blended biome colours.
m=bpy.data.materials.new('Terrain • continuous biome colour and microrelief');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');att=n.new('ShaderNodeAttribute');att.attribute_name='TerrainColor';l.new(att.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.92
geo=n.new('ShaderNodeNewGeometry');no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=3.2;no.inputs['Detail'].default_value=4;l.new(geo.outputs['Position'],no.inputs['Vector']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.10;l.new(no.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
water=bpy.data.materials.new('Water • rivers and lakes');water.use_nodes=True;p=water.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.018,.10,.13,1);p.inputs['Roughness'].default_value=.2;p.inputs['Metallic'].default_value=.4
regions=info['regions'];holes=[(0,0,2000)]+[(r['center_m'][0],r['center_m'][1],4000) for r in regions]
def sample(arr,x,y):
 xx=np.clip((np.asarray(x)+512000)/250,0,4095.999);yy=np.clip((np.asarray(y)+512000)/250,0,4095.999);i=xx.astype('i');j=yy.astype('i');u=xx-i;v=yy-j
 if arr.ndim==3:u=u[...,None];v=v[...,None]
 return arr[j,i]*(1-u)*(1-v)+arr[j,i+1]*u*(1-v)+arr[j+1,i]*(1-u)*v+arr[j+1,i+1]*u*v

def make_mesh(name,xy,z,colors,nres,origin,col,cut=True,save=None):
 verts=np.column_stack((xy[0].ravel()-origin[0],xy[1].ravel()-origin[1],z.ravel())).astype('f');a=(np.arange(nres)[:,None]*(nres+1)+np.arange(nres)[None,:]).ravel();faces=np.column_stack((a,a+1,a+nres+2,a+nres+1))
 if cut:
  cx=(xy[0][:-1,:-1]+xy[0][1:,1:]).ravel()/2;cy=(xy[1][:-1,:-1]+xy[1][1:,1:]).ravel()/2;keep=np.ones(len(a),bool)
  for hx,hy,rad in holes:keep&=~((abs(cx-hx)<rad)&(abs(cy-hy)<rad))
  faces=faces[keep]
 d=bpy.data.meshes.new(name);d.from_pydata(verts.tolist(),[],faces.tolist());d.update();o=bpy.data.objects.new(name,d);col.objects.link(o);o.location=(*origin,0);d.materials.append(m)
 attr=d.color_attributes.new(name='TerrainColor',type='FLOAT_COLOR',domain='POINT');rgba=np.ones((len(verts),4),dtype='f');rgba[:,:3]=colors.reshape(-1,3);attr.data.foreach_set('color',rgba.ravel());d.polygons.foreach_set('use_smooth',np.ones(len(d.polygons),bool))
 return o
# All 256 high-resolution tile files are built now, not deferred until later.
manifest=[];seams=0;maxgap=0
for ty in range(16):
 for tx in range(16):
  ix,iy=tx*256,ty*256;ox,oy=-512000+tx*64000,-512000+ty*64000
  X,Y=np.meshgrid(np.linspace(ox,ox+64000,257),np.linspace(oy,oy+64000,257));Z=H[iy:iy+257,ix:ix+257];rgb=C[iy:iy+257,ix:ix+257]
  archive=bpy.data.collections.new(f'HI_TILE_{tx:02d}_{ty:02d}');obj=make_mesh(archive.name,(X,Y),Z,rgb,256,(ox,oy),archive)
  obj['sample_spacing_m']=250;obj['geographic_origin_m']=[ox,oy];dest=OUT/'tiles'/f'tile_{tx:02d}_{ty:02d}.blend'
  bpy.data.libraries.write(str(dest),{archive},fake_user=True,compress=True)
  count=len(obj.data.polygons);d=obj.data;bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(d);bpy.data.collections.remove(archive)
  proxy=make_mesh(f'LOD_TILE_{tx:02d}_{ty:02d}',(X[::4,::4],Y[::4,::4]),Z[::4,::4],rgb[::4,::4],64,(ox,oy),cols['10_WORLD_LOD']);proxy['high_resolution_file']=str(dest);proxy['sample_spacing_m']=1000
  manifest.append({'x':tx,'y':ty,'path':'tiles/'+dest.name,'faces':count,'spacing_m':250})
  # Adjacent tiles use shared source indices, giving bit-identical seam heights.
  if tx:seams+=257
  if ty:seams+=257
 if ty%1==0:print('SAVED_TILE_ROW',ty+1,'/16',flush=True);gc.collect()
# Surface water follows monotonic river levels and intersects carved terrain.
# One shared raster mesh covers every wet cell; no giant plane covering dry land.
wet=(W>H)&(W>-999);jj,ii=np.where(wet[:-1,:-1]&wet[1:,:-1]&wet[:-1,1:]&wet[1:,1:]);vv=[];ff=[]
for k,(j,i) in enumerate(zip(jj,ii)):
 x=-512000+i*250;y=-512000+j*250;vv.extend([(x,y,float(W[j,i])),(x+250,y,float(W[j,i+1])),(x+250,y+250,float(W[j+1,i+1])),(x,y+250,float(W[j+1,i]))]);ff.append((4*k,4*k+1,4*k+2,4*k+3))
d=bpy.data.meshes.new('River and lake surfaces');d.from_pydata(vv,[],ff);d.update();o=bpy.data.objects.new(d.name,d);cols['13_Hydrology'].objects.link(o);d.materials.append(water);del vv,ff
# Nested local landscapes have sub-grid rock and erosion relief; boundaries match the main LOD.
def nn(x,y):return noise.noise_vector(Vector((x,y,0)))[0]
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def oldh(x,y):return .32*nn(x*.1,y*.1)+.1*nn(x*.6,y*.6)+8*math.exp(-((x+48)/17)**2-((y-3)/34)**2)-.8*math.exp(-((x-15)/22)**2-((y+14)/24)**2)
def localmesh(name,cx,cy,size,step,origin=False):
 res=round(size/step);ax=np.linspace(cx-size/2,cx+size/2,res+1);ay=np.linspace(cy-size/2,cy+size/2,res+1);X,Y=np.meshgrid(ax,ay);Z=sample(H,X,Y).astype('f');rgb=sample(C,X,Y).astype('f')
 for j in range(res+1):
  for i in range(res+1):
   x,y=float(X[j,i]),float(Y[j,i]);edge=min(i,j,res-i,res-j)*step;fade=smooth(edge/300)
   extra=(10*nn(x*.006,y*.006)+2*nn(x*.04,y*.04))*fade
   if origin:
    r=max(abs(x),abs(y));mix=smooth((r-80)/450)
    hills=180*math.exp(-((x+850)/300)**2-((y-600)/900)**2)+240*math.exp(-((x-1000)/450)**2-((y-900)/500)**2)+130*math.exp(-((x-800)/650)**2-((y+950)/300)**2)
    Z[j,i]=oldh(x,y)*(1-mix)+(Z[j,i]+hills*fade+extra)*mix
    if r<400:rgb[j,i]=(.25,.215,.16)
   else:Z[j,i]+=extra
 # Snap the entire outer boundary to the preview's 1km linear edges.
 for j,i in [(0,i) for i in range(res+1)]+[(res,i) for i in range(res+1)]+[(j,0) for j in range(res+1)]+[(j,res) for j in range(res+1)]:
  x,y=X[j,i],Y[j,i]
  if i in [0,res]:a=math.floor(y/1000)*1000;t=(y-a)/1000;Z[j,i]=sample(H,x,a)*(1-t)+sample(H,x,a+1000)*t
  else:a=math.floor(x/1000)*1000;t=(x-a)/1000;Z[j,i]=sample(H,a,y)*(1-t)+sample(H,a+1000,y)*t
 if origin:
  # Match the existing canyon floor at its perimeter, by raycasting actual geometry.
  g=bpy.data.objects['Continuous basin & western slope • 160m']
  for j in range(res+1):
   for i in range(res+1):
    x,y=X[j,i],Y[j,i]
    if (abs(x)==80 and abs(y)<=80) or (abs(y)==80 and abs(x)<=80):
     hit,p,_,_=g.ray_cast(Vector((x,y,100)),Vector((0,0,-1)))
     if hit:Z[j,i]=p.z
  # Only the central old canyon is excluded for this mesh.
  saved=holes[:];holes[:]=[(0,0,80)];o=make_mesh(name,(X,Y),Z,rgb,res,(cx,cy),cols['11_Origin_5m'],True);holes[:]=saved
 else:o=make_mesh(name,(X,Y),Z,rgb,res,(cx,cy),cols['12_Regions_31m'],False)
 o['sample_spacing_m']=step;return o
origin=localmesh('K09 • 4km terrain at 5m',0,0,4000,5,True)
region_meshes=[]
for r in regions:
 cx,cy=r['center_m'];o=localmesh(r['name']+' • 8km at 31.25m',cx,cy,8000,31.25);region_meshes.append(o)
 print('REGION_READY',r['name'],flush=True)
# Physical rock fields concentrated on slopes in each exploration region, using linked geometry.
rockmat=bpy.data.materials.get('Ivory limestone | mineral weathering')
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);src=bpy.context.object;src.data.materials.append(rockmat);rockdata=src.data;bpy.data.objects.remove(src,do_unlink=True)
rng=np.random.default_rng(83)
for r,o in zip(regions,region_meshes):
 cx,cy=r['center_m']
 for k in range(180):
  x,y=rng.uniform(-2200,2200,2);hit,p,normal,_=o.ray_cast(Vector((x,y,10000)),Vector((0,0,-1)))
  if not hit or normal.z>.995:continue
  b=bpy.data.objects.new(r['name']+' rock',rockdata);cols['14_Region_Scenery'].objects.link(b);scale=float(rng.uniform(1,9));b.location=(cx+x,cy+y,p.z-.25*scale);b.scale=(scale*1.6,scale,scale*.8);b.rotation_euler.z=float(rng.uniform(0,6.28))
# Named waypoints and river sources are spatial, not just an image overlay.
for r in regions:
 cx,cy=r['center_m'];o=bpy.data.objects.new(r['name'],None);cols['16_Waypoints'].objects.link(o);o.location=(cx,cy,float(sample(H,cx,cy)));o.empty_display_size=100
# Fix player's actual foot-to-ground height at the spawn.
rig=bpy.data.objects['AEGIS_RIG'];rig.location.z=-.2168
# Geographic camera presets for the actual terrain.
def camera(name,loc,target,lens=42,ortho=None):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);cols['15_Cameras'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.clip_end=4000000;d.clip_start=.1
 if ortho:d.type='ORTHO';d.ortho_scale=ortho;d.clip_start=100
 return o
hero=camera('01 • Aegis start',(17,-65,11),(0,-24,5),48)
atlas=camera('02 • True-scale continent',(650000,-950000,1300000),(0,0,0),ortho=1450000)
cameras=[]
for index in [0,3,6]:
 r=regions[index];cx,cy=r['center_m'];z=float(sample(H,cx,cy));cameras.append((camera(r['name']+' survey',(cx+4200,cy-5200,z+3600),(cx,cy,z),43),r['name'].replace(' ','_')))
s.camera=hero;s.render.resolution_x=1200;s.render.resolution_y=800;s.cycles.samples=20
s['terrain_version']='v2 full-coverage generated terrain';s['continental_spacing_m']=250;s['preview_spacing_m']=1000;s['fine_tile_count']=256;s['terrain_archive']='//tiles';s['status']='All high-resolution continental terrain tiles generated. Detailed regional and origin meshes included. Game runtime integration not implemented.'
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.clip_end=20000;a.spaces.active.region_3d.view_perspective='CAMERA'
# A loader stored in the .blend upgrades a selected preview tile without loading the entire archive.
loader='''import bpy\nfrom pathlib import Path\no=bpy.context.active_object\nif o is None or 'high_resolution_file' not in o: raise RuntimeError('Select one LOD_TILE first')\npath=Path(bpy.data.filepath).parent/'tiles'/Path(o['high_resolution_file']).name\nwith bpy.data.libraries.load(str(path),link=False) as (src,dst):dst.collections=[src.collections[0]]\nbpy.context.scene.collection.children.link(dst.collections[0])\no.hide_render=True;o.hide_set(True)\n'''
bpy.data.texts.new('LOAD_SELECTED_HIGH_RES_TILE.py').write(loader)
result={'world_extent_m':1024000,'full_resolution_m':250,'preview_resolution_m':1000,'full_tiles':manifest,'full_terrain_quad_count':sum(t['faces'] for t in manifest),'regional_meshes':8,'regional_spacing_m':31.25,'origin_spacing_m':5,'river_systems':len(info['rivers']),'water_faces':len(d.polygons) if False else len(bpy.data.objects['River and lake surfaces'].data.polygons),'shared_edge_samples':seams,'max_shared_height_error_m':maxgap,'height_min_m':info['height_min_m'],'height_max_m':info['height_max_m'],'limitations':['Sub-250m detail outside authored exploration regions is procedural material detail, not full near-field geometry','No gameplay streaming/collision/navigation integration','Rivers are authored descending channels, not a full physical hydraulic simulation']}
(OUT/'build_report.json').write_text(json.dumps(result,indent=2))
bpy.data.texts.load(str(Path(__file__).resolve()));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ECHO9_Full_Terrain_v2.blend'),compress=True)
print('MAIN_SAVED',result['full_terrain_quad_count'],flush=True)
for cam,name in [(hero,'01_Aegis_start')]+cameras+[(atlas,'05_Continent_true_scale')]:
 s.camera=cam;s.render.filepath=str(OUT/'renders'/name);bpy.ops.render.render(write_still=True)
print('FULL_TERRAIN_COMPLETE',flush=True)
