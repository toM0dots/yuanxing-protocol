"""Blender-authored K–09 cliff hangar and field equipment, in canyon metres.
Uses the approved landscape as composition reference; runtime exports contain
real geometry, world-scale UVs and seven shared material groups. No image cards.
Run in Blender's Python console with runpy.run_path(__file__).
"""
import bpy, math, json, random, traceback
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/k09-hero-v1'; OUT=ROOT/'dist/assets/k09-hero-v1'
ART.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
random.seed(709)
F=json.loads((ART/'terrain-input.json').read_text())
def ground(x,y):
    u=max(0,min(F['nx']-1.00001,(x-F['xmin'])/F['dx']));v=max(0,min(F['ny']-1.00001,(y-F['ymin'])/F['dy']))
    i,j=int(u),int(v);a,b=u-i,v-j;k=j*F['nx']+i;h=F['heights'];n=F['nx']
    return (h[k]*(1-a)+h[k+1]*(a-b)+h[k+n+1]*b if a>=b else h[k]*(1-b)+h[k+n+1]*a+h[k+n]*(b-a))/1000

scene=bpy.data.scenes.new('K09 • The people who left the lights on')
bpy.context.window.scene=scene
materials={};parts=[]
for name,c,metal,rough,glow in [
    ('K09_Painted',(.48,.43,.34),.3,.7,0),('K09_Steel',(.18,.22,.23),.75,.52,0),
    ('K09_Dark',(.025,.036,.04),.35,.82,0),('K09_Amber',(.93,.35,.06),.15,.45,4),
    ('K09_Green',(.15,.88,.53),0,.36,3.3),('K09_Cloth',(.18,.21,.17),0,.95,0),
    ('K09_Glass',(.12,.22,.25),.72,.18,0)]:
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if glow:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=glow
    materials[name]=m

def finish(o,mat,bevel=0):
    o.data.materials.append(materials['K09_'+mat]);parts.append(o)
    if bevel:
        mod=o.modifiers.new('Manufactured edge radius','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted planar normals','WEIGHTED_NORMAL');mod.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def box(name,p,size,mat='Steel',bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,mat,min(bevel,min(size)*.2))
def cyl(name,p,r,h,mat='Steel',vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p);o=bpy.context.object;o.name=name
    return finish(o,mat)
def beam(name,a,b,r=.07,mat='Steel',vertices=8):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)*.5,r,(b-a).length,mat,vertices)
    o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o
def rail(a,b,height=1.1):
    a,b=Vector(a),Vector(b);n=max(1,math.ceil((b-a).length/2.5))
    for i in range(n+1):
        p=a.lerp(b,i/n);beam('Handrail stanchion',p,p+Vector((0,0,height)),.045)
    for h in [.45,height]:beam('Safety rail',a+Vector((0,0,h)),b+Vector((0,0,h)),.045)
def cable(points,r=.025):
    for a,b in zip(points,points[1:]):beam('Emergency power cable',a,b,r,'Dark',6)
def label(text,p,size=1.4):
    bpy.ops.object.select_all(action='DESELECT')
    curve=bpy.data.curves.new('Embossed station identification','FONT');curve.body=text;curve.size=size;curve.extrude=.015;curve.align_x='CENTER'
    o=bpy.data.objects.new('Station sign '+text,curve);scene.collection.objects.link(o);o.location=p;o.rotation_euler.x=math.pi/2
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');finish(bpy.context.object,'Painted')
def crate(x,y,z,w=1.4):
    box('Sealed field case',(x,y,z+.48*w),(w,.7*w,.96*w),'Dark',.08)
    for side in [-1,1]:
        box('Case inset',(x,y+side*.36*w,z+.48*w),(.84*w,.05*w,.7*w),'Painted')
        for dx in [-.32,.32]:box('Case lock',(x+dx*w,y+side*.4*w,z+.48*w),(.1*w,.1*w,.3*w),'Steel',.015)
    for h in [.1,.83]:box('Reinforced case band',(x,y,z+h*w),(1.05*w,.76*w,.06*w),'Steel',.015)
    box('Case handle',(x,y,z+1.0*w),(.45*w,.1*w,.08*w),'Steel',.02)

# A narrow, tall industrial silhouette tied to the same collision footprint.
cx,cy=38,0;base=ground(cx,cy)
def H(name,p,s,mat='Steel',bevel=.04):return box(name,(p[0]+cx,p[1]+cy,p[2]+base),s,mat,bevel)
def B(name,a,b,r=.07,mat='Steel'):return beam(name,(a[0]+cx,a[1]+cy,a[2]+base),(b[0]+cx,b[1]+cy,b[2]+base),r,mat)
H('Foundation slab',(0,0,-.28),(36,22,.7),'Dark',.12)
H('Recessed back wall',(0,10,19),(35,1.2,38),'Dark')
H('Hangar roof',(0,0,38),(36,22,1.2),'Steel',.12)
for side in [-1,1]:
    H('Heavy side wall',(side*17.5,0,19),(1,22,38),'Dark')
    H('Elevator tower',(side*13,-9.7,26),(10,2.4,52),'Dark',.14)
    for col in [-1,1]:
        x=side*13+col*2.2
        for row in range(7):
            z=4+row*7
            H('Weathered modular armor',(x,-11,z),(3.9,.5,6.4),'Painted',.12)
            H('Armor recessed seam',(x,-11.29,z+.9),(3.6,.035,.08),'Dark',0)
            H('Panel fastener',(x-1.5,-11.32,z+2.5),(.13,.09,.13),'Steel',0)
            H('Panel fastener',(x+1.5,-11.32,z-2.5),(.13,.09,.13),'Steel',0)
    for x in [side*18.3,side*8]:
        H('Exposed structural spine',(x,-11.4,25),(.4,.7,50),'Steel')
        for z in range(1,49,4):B('Diagonal tower bracing',(x-.65,-11.6,z),(x+.65,-11.6,z+3),.08)
    H('Door jamb',(side*7.9,-10.9,15),(.65,1.1,30),'Steel',.1)
    H('Door guide rail',(side*7.55,-11.5,15),(.12,.18,28),'Dark',.01)
    for z in [3,11,19,27,35,43]:
        H('Amber service fixture',(side*8.6,-11.7,z),(.18,.16,.8),'Amber',.02)
    B('External service pipe',(side*18.7,-8,1),(side*18.7,-8,46),.26)
    for z in range(2,46,5):H('Pipe collar',(side*18.7,-8,z),(.7,.7,.12),'Painted',.02)
    # Side maintenance landings, readable as separate floors from ground level.
    for z in [13,27,39]:
        H('Service balcony',(side*14,-12.7,z),(7,2,.2),'Steel')
        rail((cx+side*10.5,cy-13.6,base+z),(cx+side*17.5,cy-13.6,base+z))
        H('Service access',(side*14,-11.1,z+1.5),(1.6,.15,2.8),'Dark')
        H('Service access light',(side*14,-11.25,z+3),(1.7,.1,.12),'Amber',.01)
    # Visible indoor gantry structure, emissive strips carry light without shadow lights.
    for y in [-7,-1,5]:
        H('Interior rib',(side*7.4,y,16),(.4,.5,31),'Steel')
        B('Roof diagonal',(side*7.4,y,30),(0,y,34),.15)
        H('Interior warm strip',(side*7.15,y,12),(.1,.4,5),'Amber',.01)
H('Door lintel',(0,-10.8,31),(17,1.4,2.2),'Steel',.12)
H('Raised blast door',(0,-9.9,34.8),(15.3,.55,5.2),'Painted',.09)
for z in [32.6,33.5,34.4,35.3,36.2]:H('Door horizontal seam',(0,-10.2,z),(14.8,.06,.12),'Dark',0)
H('Lintel running light',(0,-11.6,30.9),(14.6,.08,.14),'Amber',.01)
label('K–09',(cx,cy-11.7,base+38.7),2.0)
for x in [-13,13]:
    for h in [52.5,54.5]:B('Antenna mast',(x,-7,50),(x,-7,h),.10)
    B('Antenna crossbar',(x-1.2,-7,53.8),(x+1.2,-7,53.8),.04)
    H('Redundant communications cabinet',(x,0,40),(3,4,3),'Painted',.1)
    for i in range(5):H('Cabinet ventilation',(x, -2.05,39.2+i*.4),(2.5,.08,.12),'Dark',0)
# Flush approach deck, not a floating ramp that the gameplay cannot walk on.
H('Approach landing',(0,-13,-.15),(23,6,.3),'Steel',.03)
for side in [-1,1]:
    rail((cx+side*11,-16,base+.02),(cx+side*11,-11,base+.02))
    for y in [-15,-13,-11]:H('Apron guidance',(side*8.5,y,.03),(.18,1.2,.035),'Green',0)
for x in [-5,-2.5,0,2.5,5]:H('Hangar approach lane',(x,-13,.02),(1.4,.12,.035),'Painted',0)
for x,y in [(50,-12),(52,-12),(51,-14),(26,-8)]:crate(x,y,base,1.5)
for x in [49,50]:
    cyl('Oxygen cylinder',(x,-7,base+1.8),.36,3.6,'Painted',16)
    cyl('Cylinder valve',(x,-7,base+3.65),.1,.15,'Steel',8)

# The authored kit retains battery cases/cables at these exact sockets. Detailed
# optical lamps are assembled by exo-field-lamps.mjs, shared with every field route.
lamps=[(1.1,8.37),(13,18.87),(5,26.87),(14,27.87),(2.8,17.37),(14,9.37),(-1,8.48)]
for i,(x,y) in enumerate(lamps):
    z=ground(x,y)
    if i<3:
        crate(x-.65,y+.3,z,.8)
        cable([(x-.6,y+.3,z+.05),(x-.4,y+.05,z+.025),(x,y,z+.15)],.022)

# The maintenance nook sits against the cave wall, outside the tested walk lane.
x,y=1.3,23;z=ground(x,y)
for dx in [-1.6,1.6]:beam('Nook canopy pole',(x+dx,y-1,z),(x+dx,y-1,z+2.4),.045)
verts=[];faces=[];nx,ny=9,7
for j in range(ny):
    for i in range(nx):
        u=i/(nx-1);v=j/(ny-1);verts.append((x+(u-.5)*3.4,y-1+v*2.2,z+2.4-.24*math.sin(u*math.pi)+.12*math.sin(v*math.pi)))
for j in range(ny-1):
    for i in range(nx-1):a=j*nx+i;faces.append((a,a+1,a+nx+1,a+nx))
mesh=bpy.data.meshes.new('Tensioned field canvas');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Field repair canopy',mesh);scene.collection.objects.link(o);finish(o,'Cloth')
crate(x-.9,y,z,.9);crate(x+.5,y+.4,z,.7)
cyl('Thermos left for the next traveller',(x+.5,y+.4,z+.88),.12,.4,'Steel',12)
box('Work lamp',(x,y+.7,z+1.9),(.22,.2,.35),'Amber',.03)

# Join compatible pieces. Large DCC part count does not become runtime draw count.
bpy.ops.object.select_all(action='DESELECT')
groups=[]
material_parts={name:[o for o in parts if o.type=='MESH' and o.data.materials[0]==mat] for name,mat in materials.items()}
for name,mat in materials.items():
    group=material_parts[name]
    if not group:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    mesh=o.data
    if not mesh.uv_layers:mesh.uv_layers.new()
    uv=mesh.uv_layers.active.data
    for face in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        for li in face.loop_indices:
            p=mesh.vertices[mesh.loops[li].vertex_index].co
            a,b=(p.x,p.y) if axis==2 else (p.x,p.z) if axis==1 else (p.y,p.z)
            uv[li].uv=(a/3,b/3)
    mesh.calc_loop_triangles();groups.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in groups:o.select_set(True)
triangles=sum(len(o.data.loop_triangles) for o in groups)
if triangles>30000:raise RuntimeError('Hero geometry exceeded its 30k triangle budget: '+str(triangles))
bpy.ops.export_scene.gltf(filepath=str(OUT/'k09-hangar-field.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
report={'triangles':triangles,'material_groups':len(groups),'source':'Blender 4.5.14 / tools/build-k09-hero.py','model':'k09-hangar-field.glb','hangar':{'center_local':[38,0],'floor_local':base,'width':36,'depth':22,'height':54,'entry_local':[38,-17]},'lamps_local':lamps,'runtime_lamps':'exo-field-lamps.mjs / sealed optical evacuation fixtures at the retained sockets','textures':'World-scale UVs; runtime reuses existing Poly Haven CC0 packed metal/panel maps','collision':'hangar axis-aligned footprint / open south portal; canyon floor and cave collision remain authoritative','reference':'nine-regions-multiview-v1/09-k09-layered-canyon','status':'exported; runtime inspection pending'}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')

# Keep an editable full scene for review, while exporting only the runtime kit.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'dist/assets/canyon-v2/canyon-authored.glb'))
world=bpy.data.worlds.new('K09 sunset ambience');scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.13,.18,.26,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.4
light=bpy.data.lights.new('Low amber sun','SUN');light.energy=3.0;light.color=(1,.65,.36);light.angle=.09
o=bpy.data.objects.new('Low amber sun',light);scene.collection.objects.link(o);o.rotation_euler=(math.radians(65),math.radians(-15),math.radians(-35))
camera=bpy.data.cameras.new('K09 approach camera');o=bpy.data.objects.new('K09 approach camera',camera);scene.collection.objects.link(o);o.location=(10,-56,10);o.rotation_euler=(Vector((25,2,18))-o.location).to_track_quat('-Z','Y').to_euler();camera.lens=26;scene.camera=o
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ART/'blender-preview.png')
scene.view_settings.view_transform='AgX'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'K09_Cliffside_Hangar.blend'))
(ART/'build-complete.json').write_text(json.dumps(report,indent=2)+'\n')
for area in bpy.context.screen.areas:
    if area.type=='CONSOLE':
        area.type='VIEW_3D';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
print('K09 HERO EXPORT COMPLETE',triangles,'triangles',len(groups),'material groups')
