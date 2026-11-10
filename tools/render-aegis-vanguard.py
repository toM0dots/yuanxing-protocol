"""Render the current saved, exported Vanguard model without rebuilding geometry."""
import bpy
from pathlib import Path
P=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(P/'art/aegis-v5/EV04_Aegis_Vanguard.blend'))
scene=bpy.context.scene
scene.render.resolution_x=1000;scene.render.resolution_y=1100
scene.render.resolution_percentage=100;scene.cycles.samples=32
out=P.parent/'output/detailed-models-v75'
for cam,name in [('01 / Vanguard front three-quarter','robot-vanguard-front'),('02 / Rear engineering','robot-vanguard-rear')]:
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
