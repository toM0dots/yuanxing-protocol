import bpy, math, random, json
from mathutils import Vector, noise
from pathlib import Path
random.seed(209)
OUT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection': bpy.data.collections.remove(c)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
COL={}
for name in ['01_Terrain','02_Strata_Cliffs','03_Cave_Interiors','04_Routes','05_Rockfall','06_Expedition_Structures','07_EV01','08_Lighting_Cameras','09_Gameplay_Markers']:
    c=bpy.data.collections.new(name); scene.collection.children.link(c); COL[name]=c
active='01_Terrain'
def put(o,name,mat=None):
    o.name=name
    for c in list(o.users_collection): c.objects.unlink(o)
    COL[active].objects.link(o)
    if mat: o.data.materials.append(mat)
    return o
def mat(name,c,metal=0,rough=.8,em=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if em: p.inputs['Emission Color'].default_value=(*c,1); p.inputs['Emission Strength'].default_value=em
    return m
def rockmat(name,c1,c2,scale=1):
    m=mat(name,c1); n=m.node_tree.nodes; l=m.node_tree.links; p=n.get('Principled BSDF')
    tex=n.new('ShaderNodeTexCoord'); no=n.new('ShaderNodeTexNoise'); no.inputs['Scale'].default_value=scale; no.inputs['Detail'].default_value=5; no.inputs['Roughness'].default_value=.74
    l.new(tex.outputs['Object'],no.inputs['Vector']); ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.22; ramp.color_ramp.elements[0].color=(*c1,1); ramp.color_ramp.elements[1].position=.8; ramp.color_ramp.elements[1].color=(*c2,1); l.new(no.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs[0],p.inputs['Base Color'])
    fine=n.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value=15; fine.inputs['Detail'].default_value=3; l.new(tex.outputs['Object'],fine.inputs['Vector'])
    bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.48; bump.inputs['Distance'].default_value=.13; l.new(fine.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs[0],p.inputs['Normal'])
    return m
ivory=rockmat('Ivory limestone | mineral weathering',(.23,.20,.155),(.66,.61,.49),.75)
strata=rockmat('Ochre sediment bands',(.13,.105,.075),(.40,.32,.22),1.3)
sand=rockmat('Basin gravel | compacted sediment',(.12,.105,.085),(.32,.28,.21),2.8)
pathmat=rockmat('Trail | fine dust',(.19,.165,.12),(.4,.34,.24),3)
graphite=rockmat('Graphite ceramic | worn',(.025,.034,.038),(.085,.10,.11),5)
metal=mat('Titanium edge',(.18,.22,.23),.8,.3)
orange=mat('Amber guidance', (1,.20,.025),.2,.3,5)
black=mat('Dark recess',(.008,.012,.014),.3,.5)
white=mat('Ivory expedition paint',(.65,.64,.54),.4,.42)
water=mat('Subterranean water',(.025,.085,.075),.5,.15)
def mesh(name,v,f,m):
    d=bpy.data.meshes.new(name); d.from_pydata(v,[],f); d.update(); o=bpy.data.objects.new(name,d); COL[active].objects.link(o); d.materials.append(m); return o
def box(name,loc,size,m,bevel=.07):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=put(bpy.context.object,name,m); o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel: mod=o.modifiers.new('Machined edge','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def cyl(name,loc,r,depth,m,vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); return put(bpy.context.object,name,m)
def n(x,y,z=0): return noise.noise_vector(Vector((x,y,z)))[0]
def h(x,y):
    # Low basin; western approach rises gradually to an overlook.
    return .32*n(x*.10,y*.10)+.10*n(x*.6,y*.6)+8*math.exp(-((x+48)/17)**2-((y-3)/34)**2)-.8*math.exp(-((x-15)/22)**2-((y+14)/24)**2)
# 160 m continuous ground, sub-metre triangles.
N=200; size=160; v=[]; f=[]
for j in range(N+1):
    y=-80+size*j/N
    for i in range(N+1):
        x=-80+size*i/N; v.append((x,y,h(x,y)))
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i; f.extend([(a,a+1,a+N+2),(a,a+N+2,a+N+1)])
ground=mesh('Continuous basin & western slope • 160m',v,f,sand)
for p in ground.data.polygons:p.use_smooth=True
# Layered continuous ridge: stratigraphic wall rings, irregular contour, no repeated cone peaks.
active='02_Strata_Cliffs'
def ridge(name,cx,cy,rx,ry,height):
    rings=76; count=240; v=[]; f=[]
    for k in range(rings+1):
        t=k/rings; z=-2+t*height
        taper=1-.24*t-.26*max(0,(t-.72)/.28)
        ledge=.025*math.sin(t*75)+.025*math.sin(t*141)
        for i in range(count):
            a=2*math.pi*i/count
            distortion=1+.065*math.sin(7*a)+.045*math.sin(13*a+.6)+.04*n(math.cos(a)*5,math.sin(a)*5,t*.4)
            r=taper+ledge+.018*n(math.cos(a)*13,math.sin(a)*13,t*34)
            x=cx+rx*math.cos(a)*r*distortion; y=cy+ry*math.sin(a)*r*distortion
            zz=z+(1.4*math.sin(a*5)+.8*math.sin(a*11))*t+.3*n(x*.3,y*.3,t*4) if k else -2
            v.append((x,y,zz))
    for k in range(rings):
        for i in range(count):
            a=k*count+i; b=k*count+(i+1)%count; f.append((a,b,b+count,a+count))
    f.append(tuple(reversed(range(count)))); f.append(tuple(rings*count+i for i in range(count)))
    o=mesh(name,v,f,ivory); o.data.materials.append(strata)
    for p in o.data.polygons:
        z=sum(o.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
        x=sum(o.data.vertices[i].co.x for i in p.vertices)/len(p.vertices)
        y=sum(o.data.vertices[i].co.y for i in p.vertices)/len(p.vertices)
        p.material_index=1 if math.sin(z*1.2+.7*n(x*.12,y*.12))>.90 else 0
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    return o
main=ridge('Northern escarpment | continuous carved massif',0,43,66,29,31)
ridge('Western folded ridge',-58,16,19,42,25)
east=ridge('Eastern fractured buttress',60,25,16,32,20)
# Closed tunnel cutters: flat bottom + tall arch, boolean creates actual interior walls.
active='03_Cave_Interiors'
def cutter(name,points,width=7,height=12):
    v=[]; f=[]; section=[(-width,-4),(width,-4),(width,3)]
    section += [(width*math.cos(math.pi*i/24),3+(height-3)*math.sin(math.pi*i/24)) for i in range(1,25)]
    M=len(section)
    for j,p in enumerate(points):
        tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)]); tangent.normalize(); side=Vector((tangent.y,-tangent.x))
        for s,z in section:v.append((p[0]+s*side.x,p[1]+s*side.y,z))
    for j in range(len(points)-1):
        for i in range(M):
            a=j*M+i; b=j*M+(i+1)%M; f.append((a,b,b+M,a+M))
    f.append(tuple(reversed(range(M)))); f.append(tuple((len(points)-1)*M+i for i in range(M)))
    o=mesh(name,v,f,ivory)
    # Recalculate manifold normals before exact boolean.
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    return o
def subtract(target,cut):
    bpy.context.view_layer.objects.active=target; mod=target.modifiers.new('Carved traversable volume','BOOLEAN'); mod.operation='DIFFERENCE'; mod.solver='EXACT'; mod.object=cut; bpy.ops.object.modifier_apply(modifier=mod.name); bpy.data.objects.remove(cut,do_unlink=True)
    print('CARVE',target.name,len(target.data.polygons),flush=True)
points=[(3*math.sin(t*math.pi),12+66*t) for t in [i/24 for i in range(25)]]
subtract(main,cutter('Main cave excavation',points,7.5,12))
branch=[(1+84*t,44+7*math.sin(t*math.pi)) for t in [i/24 for i in range(25)]]
subtract(main,cutter('Eastern branch excavation',branch,7,12))
subtract(east,cutter('East exit excavation',branch,7,12))
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(2,43,5)); chamber=bpy.context.object; chamber.scale=(13,13,10); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); subtract(main,chamber)
main['design']='Continuous cliff with boolean-carved main passage, chamber, east branch and north exit'
# Routes follow the actual terrain, not floating ribbons.
active='04_Routes'
def trail(name,points,width):
    v=[]; f=[]
    for i,(x,y) in enumerate(points):
        a=Vector(points[max(i-1,0)]); b=Vector(points[min(i+1,len(points)-1)]); d=(b-a).normalized(); side=Vector((-d.y,d.x))
        for sign in [-1,1]:
            xx=x+sign*side.x*width; yy=y+sign*side.y*width; v.append((xx,yy,h(xx,yy)+.045))
        if i:f.append((2*i-2,2*i,2*i+1,2*i-1))
    return mesh(name,v,f,pathmat)
trail('Main approach | 8m mech clearance',[(2*math.sin(i*.1),-61+i) for i in range(137)],4)
trail('Western overlook route',[(-4-44*math.sin(math.pi*i/100),-47+i*.9) for i in range(85)],3.5)
trail('Eastern combat flank',[(8+39*math.sin(math.pi*i/95),-48+i*.9) for i in range(90)],3.5)
trail('Cave branch floor',branch,4)
# Erosion debris concentrated around cliff toes, keeping tunnel mouths clear.
active='05_Rockfall'
rockmeshes=[]
for k in range(7):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1); o=bpy.context.object
    for vert in o.data.vertices:
        co=vert.co; co*=1+.22*n(co.x*3+k,co.y*3,co.z*3); co.z*=.65
    o.data.materials.append(ivory if k%3 else strata); rockmeshes.append(o.data); bpy.data.objects.remove(o,do_unlink=True)
for i in range(2200):
    x=random.uniform(-70,70); y=random.uniform(-65,65)
    near=(abs(x)>35 or 10<y<28)
    if not near or (abs(x)<11 and y>8) or (x>0 and abs(y-48)<9):continue
    z=h(x,y); s=random.uniform(.08,.6) if random.random()<.78 else random.uniform(1.2,3.8)
    o=bpy.data.objects.new('Talus fragment %03d'%i,random.choice(rockmeshes)); COL[active].objects.link(o); o.location=(x,y,z+s*.12); o.scale=(s*1.4,s,s); o.rotation_euler=(random.random()*.3,random.random()*.3,random.random()*6.28)
# Local combat cover clusters, leaving open boss space in the centre.
for x,y,s in [(-19,-16,4),(22,-10,3.5),(-25,3,4),(27,6,3),(-18,-35,2.8),(31,-33,3.2)]:
    o=bpy.data.objects.new('Basin cover | limestone shelf',random.choice(rockmeshes)); COL[active].objects.link(o); o.location=(x,y,h(x,y)); o.scale=(s*1.9,s,s)
active='06_Expedition_Structures'
def beacon(x,y,z=None):
    z=h(x,y) if z is None else z
    box('Survey beacon base',(x,y,z+.15),(.85,.85,.3),graphite)
    box('Survey mast',(x,y,z+1.5),(.18,.18,2.7),metal,.02)
    box('Amber navigation strip',(x,y-.12,z+2.3),(.22,.16,1.1),orange,.02)
    box('Beacon cap',(x,y,z+2.95),(.55,.55,.15),graphite)
for y in [-50,-32,-14,9,22,34,53,66]:
    for x in [-6,6]:beacon(x,y)
for x in [18,34,50]:beacon(x,48)
# Cave mouth industrial ribs fitted into the rock, open 13m clearance.
for y in [18,23]:
    for x in [-7.3,7.3]:
        box('Cave entrance structural foot',(x,y,2.5),(1,1.2,5),graphite,.15)
        box('Portal amber vertical',(x,y-.65,2.6),(.18,.08,3.8),orange,.02)
    for i in range(12):
        a=math.pi*(i+.5)/12; x=7.6*math.cos(a); z=3+9*math.sin(a)
        o=box('Segmented arch reinforcement',(x,y,z),(2.1,1.2,.5),graphite,.08); o.rotation_euler.y=a-math.pi/2
# Landing / maintenance station, inset into foreground.
x,y=-15,-49; z=h(x,y)
box('Forward station foundation',(x,y,z+.25),(12,9,.5),graphite,.18)
for dx in [-4.8,4.8]:box('Landing edge lamp',(x+dx,y,z+.53),(.12,7,.06),orange,.02)
for dx in [-3,0,3]:
    box('Equipment case',(x+dx,y+2,z+1.3),(2.1,1.7,1.5),white,.16)
    for dd in [-.65,.65]:box('Case graphite strap',(x+dx+dd,y+2,z+1.3),(.16,1.76,1.55),graphite,.02)
# Station pylons and roof canopy.
for dx in [-5,5]:box('Canopy pillar',(x+dx,y+3.5,z+3),(.4,.5,6),graphite)
box('Station canopy',(x,y+2.4,z+6.1),(12,4,.35),white,.14)
box('Station lightbar',(x,y+.38,z+5.8),(9,.12,.12),orange,.02)
# Human-readable location signage.
def label(text,loc,size=.8):
    bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0)); o=put(bpy.context.object,'Sign • '+text,white); o.data.body=text; o.data.size=size; o.data.extrude=.005; return o
box('K09 sign housing',(-11,16,4.2),(4,.5,2),graphite)
label('K–09',(-12.7,15.72,4.2),.75); label('NORTH ACCESS',(-12.7,15.71,3.7),.26)
# Basin encounter objective: low ruin with orange energy conduits, open fighting space.
for a in [0,math.pi/2,math.pi,3*math.pi/2]:
    x,y=13*math.cos(a),-13+13*math.sin(a); z=h(x,y)
    o=box('Ancient graphite obelisk',(x,y,z+1.8),(1.5,1.5,3.6),graphite,.2); o.rotation_euler.z=a
    box('Relic energy seam',(x,y-.78,z+1.9),(.12,.06,2.7),orange,.01)
# Cave chamber pool and machinery sit off the traversable main floor.
box('Chamber pool',(9,44,-.07),(6,10,.08),water,.2)
for x,y in [(-9,39),(-9,46)]:
    z=h(x,y); box('Buried ancient console',(x,y,z+.8),(2.2,3,1.6),graphite,.22); box('Console energy slit',(x,y-1.52,z+1),(.9,.08,.25),orange,.02)
# Import existing EV01 at original scale and retain animation hierarchy.
active='07_EV01'
before=set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=str(OUT/'assets/EV01.glb')); imported=set(bpy.data.objects)-before
for o in imported:
    for c in list(o.users_collection):c.objects.unlink(o)
    COL[active].objects.link(o)
roots=[o for o in imported if o.parent not in imported]
bpy.context.view_layer.update()
verts=[o.matrix_world@Vector(v) for o in imported if o.type=='MESH' for v in o.bound_box]
lo=min(v.z for v in verts); high=max(v.z for v in verts)
for o in roots:o.location+=Vector((0,-38,h(0,-38)-lo))
# Render lighting & cameras.
active='08_Lighting_Cameras'
def cam(name,loc,target,lens):
    d=bpy.data.cameras.new(name); o=bpy.data.objects.new(name,d); COL[active].objects.link(o); o.location=loc; o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler(); d.lens=lens; d.clip_end=1000; return o
hero=cam('01 • Arrival at K09',(38,-77,22),(0,13,7),37)
over=cam('02 • Region overview',(135,-170,147),(0,7,1),46)
player=cam('04 • Mech scale',(13,-49,8.8),(0,16,6),27)
cavecam=cam('03 • Cave chamber',(1,27,5.4),(2,52,5),22)
scene.camera=hero
world=bpy.data.worlds.new('Late afternoon sky'); scene.world=world; world.use_nodes=True; wn=world.node_tree.nodes; sky=wn.new('ShaderNodeTexSky'); sky.sky_type='NISHITA'; sky.sun_elevation=.38; sky.sun_rotation=math.radians(135); sky.altitude=.1; world.node_tree.links.new(sky.outputs[0],wn.get('Background').inputs[0]); wn.get('Background').inputs[1].default_value=.09
ld=bpy.data.lights.new('Raking afternoon sunlight','SUN'); ld.energy=1.5; ld.angle=.12; ob=bpy.data.objects.new(ld.name,ld); COL[active].objects.link(ob); ob.rotation_euler=(.55,-.5,-.8)
for x,y in [(-5,23),(5,36),(-5,53),(25,49),(49,49)]:
    d=bpy.data.lights.new('Warm cave practical','AREA'); d.energy=750; d.color=(1,.32,.09); d.shape='DISK'; d.size=4; ob=bpy.data.objects.new(d.name,d); COL[active].objects.link(ob); ob.location=(x,y,7)
# Gameplay markers are non-rendering empties, exported separately as metadata.
active='09_Gameplay_Markers'
markers={'spawn':(0,-38,h(0,-38)), 'boss_encounter':(0,-13,h(0,-13)), 'cave_entry':(0,16,0), 'cave_chamber':(2,43,0),'cave_exit_north':(0,73,0),'cave_exit_east':(77,44,0),'west_overlook':(-48,3,h(-48,3))}
for name,p in markers.items():
    o=bpy.data.objects.new(name,None); COL[active].objects.link(o); o.location=p; o.empty_display_type='ARROWS'; o.empty_display_size=2
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=1400; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'; scene.view_settings.exposure=-.7
scene.render.image_settings.file_format='PNG'
scene['project']='ECHO-9 / K–09 | basin, stratified ridges, connected cave network'
scene['stage']='Environment art prototype. Engine collision, LOD, navigation and gameplay integration pending.'
scene['mech_height_m']=high-lo
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.clip_end=1500; area.spaces.active.region_3d.view_perspective='CAMERA'; area.spaces.active.shading.color_type='MATERIAL'
# Save source inside the blend as a reproducible reference.
bpy.data.texts.load(str(Path(__file__).resolve()))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ECHO9_K09_Environment_v03.blend'))
(OUT/'map_metadata.json').write_text(json.dumps({'markers':markers,'mech_height_m':high-lo,'map_extent_m':160,'cave_clearance_m':{'main_width':15,'main_roof':12,'branch_width':14,'branch_roof':12},'stage':'art prototype; engine validation pending'},indent=2))
for camera,name in [(hero,'01_arrival'),(over,'02_overview'),(cavecam,'03_cave'),(player,'04_player_scale')]:
    scene.camera=camera; scene.render.filepath=str(OUT/'renders'/name); bpy.ops.render.render(write_still=True)
scene.camera=hero
print('ECHO9_BUILD_COMPLETE',len(bpy.data.objects),'objects',flush=True)
