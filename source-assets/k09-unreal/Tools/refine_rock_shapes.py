"""Blender: replace periodic cliff ripples with broken, angular sandstone forms."""
import bpy,math,json,shutil,time
from pathlib import Path
from mathutils import Vector
from mathutils import noise
ROOT=Path(__file__).resolve().parents[1]
PREP=ROOT/'SourceAssets/Prepared'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'SourceAssets/K09_Unreal_Source.blend'))
manifest=json.loads((PREP/'scene-manifest.json').read_text())
backup=ROOT/'Validation/FBXBackups'/time.strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True)
for name in ['CliffCore','ArchCore']:
    for file in PREP.glob(name+'*.fbx'):shutil.copy2(file,backup/file.name)
obj=bpy.data.objects['CliffCore']
for j in range(61):
    z=j*1.4
    for i in range(97):
        a=i/96*math.tau
        ca,sa=math.cos(a),math.sin(a)
        n=noise.fractal(Vector((ca*2.4,sa*2.4,z*.047)),1,2,4)
        fractures=noise.fractal(Vector((ca*8,sa*8,z*.025)),1,2,3)
        strata=.45*math.sin(z*.53+1.7*noise.noise_vector(Vector((ca*4,sa*4,z*.01))).x)
        r=1-.002*z+.19*n+.055*fractures+strata/24
        x=24*r*math.copysign(abs(ca)**.62,ca)
        y=29*r*math.copysign(abs(sa)**.62,sa)
        obj.data.vertices[j*97+i].co=(x,y,z)
obj.data.update()
obj=bpy.data.objects['ArchCore']
for j in range(81):
    a=j/80*math.pi
    cx=30*math.cos(a);cz=36*math.sin(a)**.55
    normal=Vector((math.cos(a),0,math.sin(a)))
    for i in range(33):
        b=i/32*math.tau
        n=noise.fractal(Vector((cx*.14,math.cos(b)*2.8,cz*.12)),1,2,4)
        radius=8.8+2.1*n+.6*math.sin(cz*.45+math.cos(b)*3)
        co=Vector((cx,0,cz))+normal*(radius*math.cos(b))+Vector((0,math.sin(b)*(11+1.3*n),0))
        obj.data.vertices[j*33+i].co=co
obj.data.update()
for name,ratios in [('CliffCore',(1,.45,.16)),('ArchCore',(1,.5,.2))]:
    bpy.context.view_layer.update()
    obj=bpy.data.objects[name]
    manifest['assets'][name]['bounds']=[list(obj.dimensions),list(obj.location)]
    for index,ratio in enumerate(ratios):
        bpy.ops.object.select_all(action='DESELECT')
        tmp=obj.copy();tmp.data=obj.data.copy();bpy.context.scene.collection.objects.link(tmp)
        tmp.hide_set(False);tmp.select_set(True);bpy.context.view_layer.objects.active=tmp
        if ratio<1:
            mod=tmp.modifiers.new('Distance LOD','DECIMATE');mod.ratio=ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=tmp.modifiers.new('Triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
        tmp.data.calc_loop_triangles()
        filename=name+('' if index==0 else '_LOD'+str(index))+'.fbx'
        bpy.ops.export_scene.fbx(filepath=str(PREP/filename),use_selection=True,object_types={'MESH'},bake_anim=False,add_leaf_bones=False,axis_forward='-Y',axis_up='Z',apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',path_mode='STRIP')
        manifest['assets'][name]['lods'][index]['triangles']=len(tmp.data.loop_triangles)
        bpy.data.objects.remove(tmp,do_unlink=True)
(PREP/'scene-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'SourceAssets/K09_Refined_Source.blend'))
(ROOT/'Validation/rock-refinement.json').write_text(json.dumps({'status':'refined FBX exported; native import pending','changed':['CliffCore','ArchCore'],'backup':str(backup)},indent=2)+'\n')
