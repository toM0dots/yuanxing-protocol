import bpy,numpy as np,json,math,time
from pathlib import Path
P=Path(__file__).resolve().parent/'world_v2'
bpy.ops.wm.read_factory_settings(use_empty=True)
edges={};bad=[];faces=0;files=sorted((P/'tiles').glob('tile_*.blend'))
for k,path in enumerate(files):
 with bpy.data.libraries.load(str(path),link=False) as (src,dst):dst.meshes=[name for name in src.meshes if name.startswith('HI_TILE_')]
 if len(dst.meshes)!=1:bad.append(str(path));continue
 d=dst.meshes[0];v=np.empty(len(d.vertices)*3,dtype='f');d.vertices.foreach_get('co',v);v=v.reshape(-1,3)
 if len(v)!=257*257 or not np.isfinite(v).all():bad.append(str(path))
 z=v[:,2].reshape(257,257);tx,ty=map(int,path.stem.split('_')[1:]);edges[(tx,ty)]=(z[:,0].copy(),z[:,-1].copy(),z[0,:].copy(),z[-1,:].copy());faces+=len(d.polygons)
 bpy.data.meshes.remove(d)
 if k%32==31:print('VERIFIED_ARCHIVES',k+1,flush=True)
maxgap=0;edgepoints=0
for (x,y),e in edges.items():
 if (x+1,y) in edges:maxgap=max(maxgap,float(abs(e[1]-edges[x+1,y][0]).max()));edgepoints+=257
 if (x,y+1) in edges:maxgap=max(maxgap,float(abs(e[3]-edges[x,y+1][2]).max()));edgepoints+=257
bpy.ops.wm.open_mainfile(filepath=str(P/'ECHO9_Full_Terrain_v2.blend'))
s=bpy.context.scene;rig=bpy.data.objects.get('AEGIS_RIG');orig=bpy.data.objects.get('K09 • 4km terrain at 5m')
report={'archives_read':len(files),'invalid_archives':bad,'archived_quads':faces,'edge_samples_checked':edgepoints,'max_adjacent_height_gap_m':maxgap,'main_scene_opened':True,'preview_tiles':len(bpy.data.collections['10_WORLD_LOD'].objects),'regional_meshes':len(bpy.data.collections['12_Regions_31m'].objects),'origin_vertices':len(orig.data.vertices) if orig else 0,'aegis_rig_present':bool(rig),'river_water_faces':len(bpy.data.objects['River and lake surfaces'].data.polygons),'runtime_gameplay_verified':False}
(P/'validation.json').write_text(json.dumps(report,indent=2));print('VALIDATION',json.dumps(report),flush=True)
