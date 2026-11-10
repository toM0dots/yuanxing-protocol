"""FBX round-trip QA in Blender, preserving the authored scene."""
import bpy,json,math,traceback,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'SourceAssets/Prepared/scene-manifest.json').read_text())
selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
source=bpy.context.window.scene
check=bpy.data.scenes.new('K09 export validation temporary')
bpy.context.window.scene=check
report={'status':'running','assets':{},'issues':[]}
try:
    for name,asset in DATA['assets'].items():
        if selected and name not in selected:continue
        lods=[]
        for index,lod in enumerate(asset['lods']):
            before=set(check.objects)
            bpy.ops.import_scene.fbx(filepath=str(ROOT/'SourceAssets/Prepared'/lod['file']))
            objects=[o for o in check.objects if o not in before and o.type=='MESH']
            if len(objects)!=1:raise RuntimeError(name+' did not round-trip as one mesh')
            obj=objects[0];obj.data.calc_loop_triangles()
            n=len(obj.data.loop_triangles)
            if n!=lod['triangles']:report['issues'].append(f'{name} LOD{index}: triangle count {n} != {lod["triangles"]}')
            if not all(math.isfinite(c) for v in obj.data.vertices for c in v.co):report['issues'].append(name+': non-finite vertices')
            if not obj.data.uv_layers and name not in ['PlanetRings']:report['issues'].append(name+': no texture UVs')
            if name in ['RingedPlanet','PlanetRings'] and not obj.data.color_attributes:report['issues'].append(name+': celestial vertex colours missing')
            if index==0:
                for a,b in zip(sorted(obj.dimensions),sorted(asset['bounds'][0])):
                    if abs(a-b)>max(.01,b*.01):report['issues'].append(name+': FBX round-trip scale changed')
            lods.append({'triangles':n,'uv_layers':len(obj.data.uv_layers),'material_slots':len(obj.data.materials),'dimensions_m':list(obj.dimensions)})
            for obj in list(check.objects):bpy.data.objects.remove(obj,do_unlink=True)
        report['assets'][name]=lods
    report['status']='passed Blender FBX round-trip' if not report['issues'] else 'failed'
except Exception:
    report.update(status='failed',error=traceback.format_exc())
finally:
    bpy.context.window.scene=source;bpy.data.scenes.remove(check)
    (ROOT/'Validation'/('fbx-refined-roundtrip.json' if selected else 'fbx-roundtrip.json')).write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'])
