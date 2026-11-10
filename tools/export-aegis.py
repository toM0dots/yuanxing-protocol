"""Create the gameplay hierarchy from the approved Blender armor, without altering the source."""
import bpy, json
from pathlib import Path
from mathutils import Matrix, Vector

project=Path(__file__).resolve().parents[2]
out=project/'game_source/dist/assets/aegis'
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(project/'robot/EV04_Aegis.blend'))
bpy.context.scene.frame_set(1)
source=bpy.data.collections.get('EV04 • AEGIS')
armature=bpy.data.objects['AEGIS_RIG']
deps=bpy.context.evaluated_depsgraph_get()
facing=Matrix.Rotation(3.141592653589793,4,'Z')
parts=[]
for o in list(source.objects):
    if o.type not in {'MESH','FONT'}: continue
    evaluated=o.evaluated_get(deps)
    mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=deps)
    mesh.transform(facing @ o.matrix_world)
    obj=bpy.data.objects.new(o.name+'_game',mesh)
    bpy.context.scene.collection.objects.link(obj)
    parts.append((obj,o.parent_bone or 'chest'))

# Empty joints have aligned local axes, so runtime gait doesn't depend on Blender
# bone roll. The exported GLB retains all armor geometry and PBR materials.
joints={}
root=bpy.data.objects.new('AEGIS',None);bpy.context.scene.collection.objects.link(root)
for b in armature.data.bones:
    node=bpy.data.objects.new('Aegis_'+b.name.replace('.','_'),None)
    bpy.context.scene.collection.objects.link(node)
    node.parent=joints.get(b.parent.name) if b.parent else root
    node.matrix_world=Matrix.Translation(facing @ armature.matrix_world @ b.head_local)
    joints[b.name]=node
    bpy.context.view_layer.update()
export_objects=[root,*joints.values()]
for name in joints:
    batch=[o for o,bn in parts if bn==name]
    if not batch: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in batch:o.select_set(True)
    bpy.context.view_layer.objects.active=batch[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name='Armor_'+name.replace('.','_')
    world=obj.matrix_world.copy();obj.parent=joints[name];obj.matrix_world=world
    export_objects.append(obj)

def socket(name,parent,world):
    o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o)
    o.parent=joints[parent];o.matrix_world=Matrix.Translation(facing @ Vector(world));export_objects.append(o)
    bpy.context.view_layer.update()
socket('Aegis_Muzzle','forearm.R',(1.72,-2.2,3.76))
socket('Aegis_Jet_L','chest',(-.66,.88,3.98))
socket('Aegis_Jet_R','chest',(.66,.88,3.98))
# The facing rotation is baked into geometry and joint locations; joint axes stay aligned.
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in export_objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(out/'EV04_Aegis_game.glb'),use_selection=True,
    export_format='GLB',export_apply=True,export_animations=False)
(out/'provenance.json').write_text(json.dumps({
    'source':'robot/EV04_Aegis.blend','design':'EV–04 Aegis',
    'original_parts':len(parts),'rigid_joints':len(joints),
    'forward':'-Z','up':'+Y','animation':'Runtime rigid-joint walk, boost, aim, recoil and ground contact',
    'notes':'Original armor and materials, grouped by joint for game rendering. Source Blender file unchanged.'
},indent=2))
print('AEGIS_GAME_EXPORTED',out)
