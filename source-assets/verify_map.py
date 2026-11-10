import bpy, json, math
from pathlib import Path
from mathutils import Vector
p=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(p/'ECHO9_K09_Environment_v03.blend'))
s=bpy.context.scene; dg=bpy.context.evaluated_depsgraph_get()
ground=bpy.data.objects['Continuous basin & western slope • 160m']; cliff=bpy.data.objects['Northern escarpment | continuous carved massif']
report={'objects':len(s.objects),'mesh_polygons':sum(len(o.data.polygons) for o in s.objects if o.type=='MESH'),'animation_actions':len(bpy.data.actions),'main_clearance_samples':[],'branch_clearance_samples':[]}
for name,points in [('main',[(3*math.sin(t*math.pi),12+66*t) for t in [i/40 for i in range(41)]]),('branch',[(1+76*t,44+7*math.sin(t*math.pi)) for t in [i/40 for i in range(41)]])]:
    for x,y in points:
        hit,floor,_,_=ground.ray_cast(Vector((x,y,30)),Vector((0,0,-1)))
        if hit:
            roofs=[]
            for rock in bpy.data.collections['02_Strata_Cliffs'].objects:
                hit2,roof,_,_=rock.ray_cast(floor+Vector((0,0,.2)),Vector((0,0,1)))
                if hit2:roofs.append(roof.z-floor.z)
            if roofs:report[name+'_clearance_samples'].append(round(min(roofs),3))
for name in ['main','branch']:
    values=report[name+'_clearance_samples'];report[name+'_minimum_roof_clearance_m']=min(values) if values else None
report['mech_height_m']=s['mech_height_m']
report['finite_geometry']=all(all(math.isfinite(a) for a in v.co) for o in s.objects if o.type=='MESH' for v in o.data.vertices)
(p/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
