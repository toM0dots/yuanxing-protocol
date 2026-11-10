"""Author the HELIOS modular hangar kit in Blender, with applied bevels and UVs.
Run: Blender --background --factory-startup --python tools/build-hangar-kit.py
Coordinates below use the game's Y-up convention; the export is glTF Y-up.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/hangar-v1'
ART=ROOT/'art/hangar-v1'
OUT.mkdir(parents=True,exist_ok=True); ART.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color,metal,rough in [
 ('Ivory',(0.59,0.62,0.58),.42,.43),('Graphite',(.075,.1,.115),.7,.4),
 ('Steel',(.33,.39,.40),.86,.32),('Amber',(.65,.32,.065),.3,.48),
 ('Rubber',(.014,.021,.025),.0,.85),('Deck',(.36,.41,.42),.7,.65),
 ('Light',(.74,.9,1),.0,.4),('Status',(.1,.75,.68),.0,.3),('OrangeLight',(1,.45,.07),.0,.4)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if 'Light' in name or name=='Status':
  p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=3
 materials[name]=m

modules={};parts=[];current=None
def point(p):return (p[0],-p[2],p[1])
def finish_obj(o,mat,bevel=0):
 o.data.materials.append(materials[mat])
 if bevel:
  mod=o.modifiers.new('Machined edge radius','BEVEL');mod.width=bevel;mod.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 if o.type=='MESH':
  mod=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 parts.append(o);return o
def box(p,size,mat='Graphite',bevel=2,angle=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(p));o=bpy.context.object
 o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.rotation_euler.z=-angle
 return finish_obj(o,mat,min(bevel,min(size)*.22))
def cyl(p,r,h,mat='Steel',axis='y',vertices=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=point(p));o=bpy.context.object
 if axis=='z':o.rotation_euler.x=math.pi/2
 if axis=='x':o.rotation_euler.y=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish_obj(o,mat,0 if vertices<=6 else min(1.2,h*.16))
def beam(a,b,r,mat='Steel'):
 aa,bb=Vector(point(a)),Vector(point(b));d=bb-aa
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(aa+bb)/2);o=bpy.context.object
 o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y')
 return finish_obj(o,mat,.8)
def bolts(x0,y0,z,w,h):
 for x in [-w/2,w/2]:
  for y in [-h/2,h/2]:cyl((x0+x,y0+y,z),3.3,2.5,'Steel','z',6)
def start(name):
 global current,parts
 current=name;parts=[]
def end():
 root=bpy.data.objects.new(current,None);bpy.context.scene.collection.objects.link(root)
 groups={mat:[o for o in parts if o.data.materials[0].name==mat] for mat in materials}
 for mat,group in groups.items():
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object
  o.name=current+'_'+mat
  # Reproject UVs by actual surface orientation, preserving world-scale texel density.
  mesh=o.data
  if not mesh.uv_layers:mesh.uv_layers.new()
  uv=mesh.uv_layers.active.data
  for f in mesh.polygons:
   n=o.matrix_world.to_3x3()@f.normal;axis=max(range(3),key=lambda i:abs(n[i]))
   for li in f.loop_indices:
    p=o.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co
    pair=(p.x,p.y) if axis==2 else (p.x,p.z) if axis==1 else (p.y,p.z)
    uv[li].uv=(pair[0]/240,pair[1]/240)
  world=o.matrix_world.copy();o.parent=root;o.matrix_world=world
 modules[current]=root

start('WallBay')
box((0,260,-16),(160,520,30),'Graphite',4)
box((0,260,4),(149,310,16),'Rubber',4)
for x,w in [(-38,68),(38,68)]:
 box((x,260,15),(w,292,12),'Ivory',5);bolts(x,260,23,w-15,270)
 box((x,272,23),(w-14,7,2),'Steel',.3)
box((0,62,8),(149,106,28),'Graphite',5)
for i in range(9):box((-60+i*15,65,25),(7,70,7),'Steel',1.2)
box((0,135,16),(153,16,30),'Amber',2)
box((0,440,4),(148,48,25),'Rubber',3)
for i in range(7):box((-60+i*20,440,18),(12,32,4),'Steel',1)
box((0,488,12),(120,12,16),'Light',2)
for x in [-77,77]:box((x,260,14),(9,510,30),'Steel',1)
end()

start('DoorFrame')
for side in [-1,1]:
 box((side*181,184,0),(32,368,52),'Graphite',7)
 box((side*187,187,30),(24,300,13),'Ivory',4)
 box((side*168,187,29),(5,270,6),'Light',1)
 box((side*186,47,40),(28,75,10),'Amber',2)
 beam((side*181,365,0),(side*128,421,0),22,'Steel')
box((0,427,0),(260,40,52),'Graphite',6)
box((0,427,30),(204,18,8),'Amber',2)
for x in [-115,-70,70,115]:bolts(x,427,37,8,10)
end()

start('FloorTile')
box((0,-5,0),(198,10,198),'Graphite',2)
box((0,-.5,0),(185,2,185),'Deck',1)
for x in [-89,89]:
 for z in [-89,89]:cyl((x,1.5,z),3,1.2,'Steel','y',6)
end()

start('Buttress')
box((0,245,0),(32,490,45),'Graphite',6)
box((0,230,22),(20,420,18),'Ivory',4)
box((0,70,36),(25,110,10),'Amber',2)
for y in [30,150,340,460]:box((0,y,20),(46,20,65),'Steel',3)
box((0,300,35),(6,100,5),'Light',1)
end()

start('Crate')
box((0,80,0),(90,160,190),'Graphite',7)
for z in [-1,1]:
 box((0,83,z*96),(72,125,8),'Ivory',4)
 for x in [-32,32]:box((x,80,z*102),(8,150,8),'Steel',1.4)
 box((0,92,z*102),(22,30,8),'Amber',2)
for y in [13,146]:box((0,y,0),(96,12,200),'Steel',3)
for side in [-1,1]:
 box((side*47,85,0),(5,86,130),'Amber',2)
 for z in [-56,56]:box((side*52,84,z),(7,95,9),'Graphite',2)
box((0,170,0),(92,9,195),'Graphite',2)
end()

start('Terminal')
box((0,8,0),(78,16,54),'Graphite',6)
box((0,65,-5),(40,110,30),'Steel',4)
box((0,128,5),(82,64,22),'Graphite',6)
box((0,128,18),(68,49,4),'Rubber',2)
box((0,128,21),(60,40,1.5),'Status',.1)
for y in [117,126,135]:box((-5,y,22),(40,2,1),'Light',.1)
box((0,90,22),(74,12,25),'Ivory',2)
for x in [-24,-12,0,12,24]:box((x,97,25),(7,2,9),'Graphite',.2)
end()

start('ServiceArm')
cyl((0,12,0),70,24,'Graphite')
cyl((0,75,0),43,120,'Steel')
cyl((0,138,0),52,25,'Amber')
beam((0,140,0),(-50,245,-30),24,'Ivory')
cyl((-50,245,-30),36,70,'Graphite','z')
beam((-50,245,-30),(25,312,15),17,'Ivory')
cyl((25,312,15),23,42,'Steel','z')
for side in [-1,1]:beam((25+side*15,312,15),(50+side*22,276,34),7,'Graphite')
beam((20,135,-15),(-20,235,-30),6,'Steel')
box((0,55,65),(40,30,7),'Status',3)
end()

start('Reactor')
for y,r,h,mat in [(12,85,24,'Graphite'),(45,70,32,'Steel'),(85,64,45,'Ivory'),(122,73,16,'Amber'),(158,48,55,'Graphite'),(195,69,16,'Steel'),(224,62,38,'Ivory'),(250,76,14,'Graphite')]:cyl((0,y,0),r,h,mat)
for i in range(8):
 a=i*math.pi/4;x,z=math.cos(a)*56,math.sin(a)*56
 beam((x,130,z),(x,187,z),4,'Status')
for side in [-1,1]:
 beam((side*77,25,0),(side*77,230,0),7,'Steel')
 beam((side*77,230,0),(side*20,230,0),7,'Steel')
end()

start('CeilingLight')
box((0,0,0),(200,20,75),'Graphite',5)
for z in [-24,0,24]:box((0,-12,z),(180,5,12),'Light',2)
for x in [-104,104]:box((x,0,0),(12,27,90),'Steel',2)
end()

start('PipeRack')
for z,r in [(-35,12),(0,20),(40,10)]:
 cyl((0,0,z),r,200,'Steel','x')
 for x in [-85,0,85]:cyl((x,0,z),r+4,9,'Graphite','x')
for x in [-88,88]:box((x,24,0),(12,10,120),'Amber',2)
end()

# Keep a useful spread of modules visible in the editable Blender file.
for i,root in enumerate(modules.values()):root.location=(i%4*350,-(i//4)*650,0)
bpy.context.scene.world.color=(.12,.12,.12)
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'Helios_Hangar_Kit.blend'))
for root in modules.values():root.location=(0,0,0)
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(OUT/'helios-kit.glb'),export_format='GLB',export_apply=True,export_animations=False)
manifest={name:{'meshes':len(root.children),'vertices':sum(len(o.data.vertices) for o in root.children),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children)} for name,root in modules.items()}
(OUT/'kit-manifest.json').write_text(json.dumps(manifest,indent=2))
print('HELIOS_KIT_COMPLETE',json.dumps(manifest))
