"""Refresh sculpted bounds from the saved Blender source, then rerun FBX QA."""
import bpy,json,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'SourceAssets/K09_Refined_Source.blend'))
bpy.context.view_layer.update()
p=ROOT/'SourceAssets/Prepared/scene-manifest.json'
d=json.loads(p.read_text())
for name in ['CliffCore','ArchCore']:
    d['assets'][name]['bounds']=[list(bpy.data.objects[name].dimensions),list(bpy.data.objects[name].location)]
p.write_text(json.dumps(d,indent=2)+'\n')
runpy.run_path(str(ROOT/'Tools/check_assets_blender.py'),run_name='__main__')
