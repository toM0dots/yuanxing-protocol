import bpy,json,math
from mathutils import Vector
from pathlib import Path
p=Path(__file__).resolve().parent/'robot'
bpy.ops.wm.open_mainfile(filepath=str(p/'EV03_Aurel_Humanoid.blend'))
rig=bpy.data.objects['AUREL_RIG'];collection=bpy.data.collections['EV03 • AUREL humanoid']
report={'bones':len(rig.data.bones),'rigged_objects':sum(o.parent==rig for o in collection.objects),'finger_rig':'Fingers modeled, not independently rigged','animations':0}
# Include curve tubing and type in the exchange asset, preserving editable originals in blend.
bpy.ops.object.select_all(action='DESELECT')
curves=[o for o in collection.objects if o.type in ['CURVE','FONT']]
for o in curves:o.select_set(True)
if curves:
 bpy.context.view_layer.objects.active=curves[0];bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(p/'EV03_Aurel_Humanoid.glb'),use_selection=True,export_format='GLB',export_apply=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(p/'EV03_Aurel_Humanoid.glb'));bpy.context.view_layer.update()
helpers={pb.custom_shape for ar in bpy.context.scene.objects if ar.type=='ARMATURE' for pb in ar.pose.bones if pb.custom_shape}
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in helpers]
v=[o.matrix_world@Vector(q) for o in meshes for q in o.bound_box]
report['export_dimensions_m']=[max(q[i] for q in v)-min(q[i] for q in v) for i in range(3)]
report['export_mesh_count']=len(meshes);report['export_armatures']=sum(o.type=='ARMATURE' for o in bpy.context.scene.objects);report['finite_geometry']=all(all(math.isfinite(x) for x in q) for q in v)
(p/'humanoid_validation.json').write_text(json.dumps(report,indent=2));print('HUMANOID_VALIDATION',json.dumps(report))
