import bpy,numpy as np,math,json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent/'world_v2';bpy.ops.wm.open_mainfile(filepath=str(P/'ECHO9_Full_Terrain_v2.blend'))
o=bpy.data.objects['Dune Sea • 8km at 31.25m'];a=np.empty(len(o.data.vertices)*3,dtype='f');o.data.vertices.foreach_get('co',a);a=a.reshape(-1,3);x=a[:,0];y=a[:,1];fade=np.clip((4000-np.maximum(abs(x),abs(y)))/500,0,1);fade=fade*fade*(3-2*fade);delta=27*(.5+.5*np.sin(x*.022+y*.007+1.4*np.sin(y*.0014)))**3*fade;a[:,2]+=delta;o.data.vertices.foreach_set('co',a.ravel());o.data.update();bpy.context.view_layer.update()
for rock in bpy.data.collections['14_Region_Scenery'].objects:
 if rock.name.startswith('Dune Sea rock'):
  x,y=rock.location.x-o.location.x,rock.location.y-o.location.y;hit,p,_,_=o.ray_cast(Vector((x,y,10000)),Vector((0,0,-1)))
  if hit:rock.location.z=p.z-rock.scale.y*.25
cam=bpy.data.objects['Dune Sea survey'];cam.location=(o.location.x+300,o.location.y-650,0);hit,p,_,_=o.ray_cast(Vector((300,-650,10000)),Vector((0,0,-1)));cam.location.z=p.z+55;target=Vector((o.location.x-100,o.location.y+500,p.z+10));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene;s.camera=bpy.data.objects['01 • Aegis start'];bpy.data.texts.load(str(Path(__file__).resolve()));bpy.ops.wm.save_as_mainfile(filepath=str(P/'ECHO9_Full_Terrain_v2.blend'),compress=True)
s.camera=cam;s.render.filepath=str(P/'renders/Dune_Sea.png');bpy.ops.render.render(write_still=True)
print('DUNES_FINALIZED',float(delta.max()))
