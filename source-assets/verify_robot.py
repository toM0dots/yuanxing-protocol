import bpy,json,math
from pathlib import Path
from mathutils import Vector
p=Path(__file__).resolve().parent/'robot'
bpy.ops.wm.open_mainfile(filepath=str(p/'EV02_Vanguard.blend'))
rig=bpy.data.objects['EV02_VANGUARD_RIG'];s=bpy.context.scene;s.frame_set(1)
vv=[o.matrix_world@Vector(q) for o in bpy.data.collections['EV02 • VANGUARD'].objects if o.type=='MESH' for q in o.bound_box]
print('SOURCE_BOUNDS',min(q.z for q in vv),max(q.z for q in vv))
report={'bones':len(rig.data.bones),'actions':[a.name for a in bpy.data.actions],'rigged_objects':sum(o.parent==rig for o in bpy.data.objects)}
s.frame_set(45);report['idle_chest_rotation_rad']=list(rig.pose.bones['chest'].rotation_euler)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(p/'EV02_Vanguard.glb'));bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
helpers={pb.custom_shape for ar in bpy.context.scene.objects if ar.type=='ARMATURE' for pb in ar.pose.bones if pb.custom_shape}
v=[o.matrix_world@Vector(q) for o in bpy.context.scene.objects if o.type=='MESH' and o not in helpers for q in o.bound_box]
report['export_extent_m']=[max(q[i] for q in v)-min(q[i] for q in v) for i in range(3)]
report['lowest_meshes']=sorted([(min((o.matrix_world@Vector(q)).z for q in o.bound_box),o.name) for o in bpy.context.scene.objects if o.type=='MESH' and o not in helpers])[:5]
report['highest_meshes']=sorted([(max((o.matrix_world@Vector(q)).z for q in o.bound_box),o.name) for o in bpy.context.scene.objects if o.type=='MESH' and o not in helpers],reverse=True)[:5]
report['export_meshes']=sum(o.type=='MESH' and o not in helpers for o in bpy.context.scene.objects)
report['export_armatures']=sum(o.type=='ARMATURE' for o in bpy.context.scene.objects)
report['excluded_rig_display_helpers']=[o.name for o in helpers]
report['finite_geometry']=all(all(math.isfinite(x) for x in q) for q in v)
(p/'validation.json').write_text(json.dumps(report,indent=2));print('ROBOT_VALIDATION',json.dumps(report))
