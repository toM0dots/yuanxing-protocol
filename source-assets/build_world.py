import bpy,math,json,time
from mathutils import Vector,noise
from pathlib import Path
P=Path(__file__).resolve().parent;OUT=P/'world'
bpy.ops.wm.open_mainfile(filepath=str(P/'ECHO9_K09_Environment_v03.blend'))
s=bpy.context.scene;s.name='ECHO9 • 1024km Frontier';s.frame_set(1)
# Preserve the original source file; replace only the actor in this new world.
old=bpy.data.collections.get('07_EV01')
if old:
 for o in list(old.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(old)
with bpy.data.libraries.load(str(P/'robot/EV04_Aegis.blend'),link=False) as (src,dst):dst.collections=['EV04 • AEGIS']
actor=dst.collections[0];s.collection.children.link(actor);rig=bpy.data.objects['AEGIS_RIG'];rig.location=(0,-38,-.18)
rig['role']='Player proxy | Aegis | original metre scale'
COL={}
for name in ['10_Continental_Tiles','11_Local_Transition','12_Expedition_Routes','13_Biomes_and_Waypoints','14_Atlas_Cameras']:
 c=bpy.data.collections.new(name);s.collection.children.link(c);COL[name]=c
active='10_Continental_Tiles'
def material(name,c,rough=.9):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;return m
sand=material('WORLD • ochre desert',(.32,.23,.12));rock=material('WORLD • weathered stone',(.22,.235,.22));snow=material('WORLD • icefield',(.66,.76,.80));basalt=material('WORLD • volcanic basalt',(.07,.075,.085));green=material('WORLD • highland steppe',(.13,.18,.11));salt=material('WORLD • salt flats',(.52,.50,.40));watermat=material('WORLD • glacial water',(.018,.09,.13),.16)
route_mat=material('ATLAS • amber route',(.9,.29,.035));bs=route_mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.24,.02,1);bs.inputs['Emission Strength'].default_value=.4
MATS=[sand,rock,snow,basalt,green,salt]
def n(x,y,z=0):return noise.noise_vector(Vector((x,y,z)))[0]
def gauss(x,y,cx,cy,rx,ry):return math.exp(-((x-cx)/rx)**2-((y-cy)/ry)**2)
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def local_h(x,y):return .32*n(x*.1,y*.1)+.1*n(x*.6,y*.6)+8*gauss(x,y,-48,3,17,34)-.8*gauss(x,y,15,-14,22,24)
def height(x,y):
 # Continental ridges and climate zones, in metres. No scaled-up robot or old map.
 kmx,kmy=x/1000,y/1000
 broad=n(kmx*.009,kmy*.009)
 ridged=1-abs(n(kmx*.026,kmy*.026))
 detail=.55*n(kmx*.06,kmy*.06)+.23*n(kmx*.15,kmy*.15)
 west=gauss(kmx,kmy,-245,90,75,280)
 north=gauss(kmx,kmy,90,330,290,65)
 east=gauss(kmx,kmy,310,-95,68,230)
 value=350+420*broad+270*detail+(west*4700+north*5800+east*3600)*(ridged**2)
 value-=1000*gauss(kmx,kmy,190,135,70,48)
 value-=500*gauss(kmx,kmy,-320,-280,85,65)
 # Main corridor stays on land through the continent.
 corridor=math.exp(-((kmy-18*math.sin(kmx*.012))/6)**2)
 value=value*(1-.75*corridor)+(190+70*math.sin(kmx*.017))*.75*corridor
 # Smooth, low-gradient transition into the handcrafted origin region.
 fade=smooth((math.hypot(x,y)-500)/7000)
 value*=fade
 if math.hypot(x,y)<12000:value+=25*n(x*.0009,y*.0009)*smooth((math.hypot(x,y)-150)/1400)*(1-fade)
 if max(abs(x),abs(y))<1000:
  mix=smooth((max(abs(x),abs(y))-80)/650);value=value*mix+local_h(x,y)*(1-mix)
 # Near-field hills make the starting 4 km an actual landscape, with open passes.
 local=(180*gauss(x,y,-850,600,300,900)+240*gauss(x,y,1000,900,450,500)+130*gauss(x,y,800,-950,650,300))
 local*=smooth((math.hypot(x,y)-120)/200)*(1-smooth((max(abs(x),abs(y))-1600)/400))
 value+=local*(.8+.2*n(x*.008,y*.008))
 return value

def biome(x,y,z):
 if z>3000 or y>280000+55000*n(x*.000008,y*.000006):return 2
 if x>220000+45000*n(x*.000008,y*.000008) and y<20000+40000*n(x*.000007,y*.000008):return 3
 if gauss(x,y,-340000,-330000,140000,160000)>.23+.06*n(x*.00001,y*.00001):return 5
 if y< -150000+60000*n(x*.000009,y*.000009) and x> -150000+40000*n(x*.000008,y*.000008):return 4
 if z>1100:return 1
 return 0

def mesh(name,v,f,materials,col):
 d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(name,d);COL[col].objects.link(o)
 for m in materials:d.materials.append(m)
 return o
# Each tile stores small local XY coordinates and a geographic offset.
# Tile edges sample the same height function exactly.
SIZE=1024000;STEP=64000;RES=32;tileinfo=[]
for ty in range(16):
 for tx in range(16):
  ox=-SIZE/2+tx*STEP;oy=-SIZE/2+ty*STEP
  # Four centre tiles use a hole matching the detailed 4 km origin terrain.
  v=[];f=[];materialids=[]
  for j in range(RES+1):
   for i in range(RES+1):
    xx=ox+i*STEP/RES;yy=oy+j*STEP/RES;v.append((xx-ox,yy-oy,height(xx,yy)))
  for j in range(RES):
   for i in range(RES):
    xx=ox+(i+.5)*STEP/RES;yy=oy+(j+.5)*STEP/RES
    if abs(xx)<2000 and abs(yy)<2000:continue
    a=j*(RES+1)+i;f.append((a,a+1,a+RES+2,a+RES+1));materialids.append(biome(xx,yy,height(xx,yy)))
  name=f'TILE_{tx:02d}_{ty:02d} • 64km';o=mesh(name,v,f,MATS,'10_Continental_Tiles');o.location=(ox,oy,0)
  for p,mi in zip(o.data.polygons,materialids):p.material_index=mi;p.use_smooth=True
  o['tile_origin_m']=[ox,oy];o['tile_extent_m']=STEP;o['purpose']='Continental terrain layout; 2km sampling, not final near-field terrain'
  tileinfo.append({'name':name,'origin_m':[ox,oy],'size_m':STEP,'sampling_m':2000})
print('CONTINENT_TILES_READY',flush=True)
# Concentric square rings: 160m handcrafted region -> 4km transition with exact boundary matching.
# 100 points per side, same topology at every ring, progressive sample spacing.
levels=[80,90,105,125,150,180,220,270,330,400,500,650,850,1100,1400,1700,2000]
PER=100;v=[];f=[]
for radius in levels:
 for edge in range(4):
  for i in range(PER):
   t=i/PER
   if edge==0:x,y=-radius+2*radius*t,-radius
   elif edge==1:x,y=radius,-radius+2*radius*t
   elif edge==2:x,y=radius-2*radius*t,radius
   else:x,y=-radius,radius-2*radius*t
   z=height(x,y)
   # Exact interpolation onto the coarse macro edge prevents cracks at 2km boundary.
   if radius==2000:
    if abs(x)==2000:
     a=math.floor(y/2000)*2000;b=a+2000;z=height(x,a)*(1-(y-a)/2000)+height(x,b)*(y-a)/2000
    else:
     a=math.floor(x/2000)*2000;b=a+2000;z=height(a,y)*(1-(x-a)/2000)+height(b,y)*(x-a)/2000
   v.append((x,y,z))
M=4*PER
for k in range(len(levels)-1):
 for i in range(M):
  a=k*M+i;b=k*M+(i+1)%M;f.append((a,b,b+M,a+M))
transition=mesh('Origin transition • 160m to 4km',v,f,[bpy.data.materials['Basin gravel | compacted sediment']],'11_Local_Transition')
for p in transition.data.polygons:p.use_smooth=True
# Water intersects only low depressions. Coarse continental level; not a sea over the origin.
v=[(-512000,-512000,-50),(512000,-512000,-50),(512000,512000,-50),(-512000,512000,-50)]
mesh('Continental water level • lakes',v,[(0,1,2,3)],[watermat],'10_Continental_Tiles')
# Expedition locations and a route whose measured length implies days on foot.
locations=[('K09 • Landing canyon',0,0),('Dune observatory',-160000,-90000),('Salt sea ruins',-330000,-290000),('Western escarpment',-300000,80000),('Glacier gate',-130000,330000),('Northern ice shelf',180000,400000),('Lake frontier',290000,140000),('Obsidian caldera',360000,-100000),('Southern steppe',160000,-350000),('Return to K09',0,0)]
# Routes are atlas overlays, clearly isolated from physical ground.
routepoints=[]
for i in range(len(locations)-1):
 _,ax,ay=locations[i];_,bx,by=locations[i+1]
 for j in range(30):
  t=j/30;x=ax+(bx-ax)*t;y=ay+(by-ay)*t;routepoints.append((x,y,height(x,y)+1000))
routepoints.append((0,0,1000))
curve=bpy.data.curves.new('Expedition route • cartographic overlay','CURVE');curve.dimensions='3D';curve.bevel_depth=700;curve.bevel_resolution=2;sp=curve.splines.new('POLY');sp.points.add(len(routepoints)-1)
for point,co in zip(sp.points,routepoints):point.co=(*co,1)
o=bpy.data.objects.new(curve.name,curve);COL['12_Expedition_Routes'].objects.link(o);curve.materials.append(route_mat)
# Route overlay is hidden in the default local scene; enabled only for atlas rendering.
COL['12_Expedition_Routes'].hide_render=True;COL['12_Expedition_Routes'].hide_viewport=True
for i,(name,x,y) in enumerate(locations[:-1]):
 o=bpy.data.objects.new(f'{i:02d} • '+name,None);COL['13_Biomes_and_Waypoints'].objects.link(o);o.location=(x,y,height(x,y));o.empty_display_type='PLAIN_AXES';o.empty_display_size=800;o['geographic_position_m']=[x,y,height(x,y)]
# Local destinations give the expanded starting area visible scale at walking distance.
localmat=bpy.data.materials['Graphite ceramic | worn'];glow=bpy.data.materials['Amber guidance']
for x,y in [(350,-450),(-650,-250),(950,650),(-1300,900),(200,1500)]:
 z=height(x,y);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=2.5,depth=14,location=(x,y,z+7));o=bpy.context.object;o.name='Frontier navigation pylon'
 for c in list(o.users_collection):c.objects.unlink(o)
 COL['11_Local_Transition'].objects.link(o);o.data.materials.append(localmat)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1.4,location=(x,y,z+14.5));o=bpy.context.object;o.name='Pylon amber signal'
 for c in list(o.users_collection):c.objects.unlink(o)
 COL['11_Local_Transition'].objects.link(o);o.data.materials.append(glow)
def camera(name,loc,target,lens=45,ortho=None):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);COL['14_Atlas_Cameras'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.clip_start=10 if ortho else .1;d.clip_end=4000000
 if ortho:d.type='ORTHO';d.ortho_scale=ortho
 return o
hero=camera('05 • Aegis at the frontier',(17,-65,11),(0,-24,5),48)
regional=camera('06 • Starting region 4km',(2800,-3500,2400),(0,0,20),48)
atlas=camera('07 • Entire 1024km continent',(700000,-1000000,1200000),(0,0,0),ortho=1500000)
# Keep a single combined scene, with local and continental cameras.
s.camera=hero;s.render.resolution_x=1400;s.render.resolution_y=900;s.cycles.samples=24
s['world_width_m']=1024000;s['world_area_km2']=1048576;s['straight_crossing_hours_at_5mps']=1024000/5/3600
s['status']='Combined Blender world and Aegis. Continental terrain is a coarse layout. No playable engine streaming or movement has been implemented.'
s['navigation']='Camera 05: mech; 06: 4km starting region; 07: full continent. Continental tiles are 64km squares.'
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.clip_end=10000;a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.color_type='MATERIAL'
# Blender text contains exact scale and production limitations alongside the model.
distance=sum(math.dist((locations[i][1],locations[i][2]),(locations[i+1][1],locations[i+1][2])) for i in range(len(locations)-1))
manifest={'world':'ECHO9 Frontier','extent_m':1024000,'area_km2':1048576,'tile_count':256,'tile_size_m':64000,'continental_sampling_m':2000,'atlas_vertical_exaggeration':8,'detailed_origin_extent_m':160,'transition_extent_m':4000,'crossing_at_5mps_hours':1024000/5/3600,'expedition_planar_distance_km':distance/1000,'expedition_at_5mps_days':distance/5/86400,'actor':'EV04 Aegis, original metre scale','waypoints':[{'name':name,'position_m':[x,y,height(x,y)]} for name,x,y in locations[:-1]],'tiles':tileinfo,'limitations':['Coarse continental layout; only original canyon has near-field detail','Atlas route is an exploration plan, not a validated traversable road','No live engine movement, streaming, collision or floating-origin system','Distances assume uninterrupted movement at 5 m/s; no rests or obstacles']}
(OUT/'world_manifest.json').write_text(json.dumps(manifest,indent=2))
t=bpy.data.texts.new('READ ME • world scale and navigation');t.write(json.dumps({k:v for k,v in manifest.items() if k!='tiles'},indent=2));bpy.data.texts.load(str(Path(__file__).resolve()))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ECHO9_Frontier_1024km.blend'))
# Local view first: genuine new robot in the existing canyon, within the continent.
s.camera=hero;s.render.filepath=str(OUT/'01_Aegis_in_world.png');bpy.ops.render.render(write_still=True)
s.camera=regional;s.render.filepath=str(OUT/'02_starting_region.png');bpy.ops.render.render(write_still=True)
# Atlas: isolate low-cost terrain and visual route, without changing saved local configuration.
for c in s.collection.children:
 if c.name not in ['10_Continental_Tiles','12_Expedition_Routes','13_Biomes_and_Waypoints','14_Atlas_Cameras','08_Lighting_Cameras']:c.hide_render=True
# Cartographic relief exaggeration only for this preview, after saving the actual-scale blend.
for o in COL['10_Continental_Tiles'].objects:o.scale.z=8
for o in COL['12_Expedition_Routes'].objects:o.scale.z=8
COL['12_Expedition_Routes'].hide_render=False;s.camera=atlas;s.render.resolution_x=1600;s.render.resolution_y=1200;s.render.filepath=str(OUT/'03_continent_atlas.png');bpy.ops.render.render(write_still=True)
print('WORLD_COMPLETE',distance/1000,'km expedition',flush=True)
