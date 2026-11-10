"""Repair the QA-discovered degenerate triangles in the bridge's distance LOD."""
import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'SourceAssets/Prepared/scene-manifest.json').read_text())
src=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name=='ServiceBridge')
obj=src.copy();obj.data=src.data.copy();bpy.context.scene.collection.objects.link(obj)
bpy.ops.object.select_all(action='DESELECT');obj.hide_set(False);obj.hide_render=False
obj.select_set(True);bpy.context.view_layer.objects.active=obj
mod=obj.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.5;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=obj.modifiers.new('Stable export triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
bm=bmesh.new();bm.from_mesh(obj.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_area()<1e-10],context='FACES')
bm.to_mesh(obj.data);bm.free();obj.data.calc_loop_triangles()
n=len(obj.data.loop_triangles)
bpy.ops.export_scene.fbx(filepath=str(ROOT/'SourceAssets/Prepared/ServiceBridge_LOD1.fbx'),use_selection=True,object_types={'MESH'},bake_anim=False,add_leaf_bones=False,axis_forward='-Y',axis_up='Z',apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',use_mesh_modifiers=True,path_mode='STRIP')
bpy.data.objects.remove(obj,do_unlink=True)
data['assets']['ServiceBridge']['lods'][1]['triangles']=n
(ROOT/'SourceAssets/Prepared/scene-manifest.json').write_text(json.dumps(data,indent=2)+'\n')
print('Bridge LOD repaired:',n,'triangles')
