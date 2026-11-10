import bpy,json,math
from pathlib import Path
from mathutils import Vector
p=Path(__file__).resolve().parent/'world';bpy.ops.wm.open_mainfile(filepath=str(p/'ECHO9_Frontier_1024km.blend'))
tiles=[o for o in bpy.data.collections['10_Continental_Tiles'].objects if 'tile_origin_m' in o]
grid={tuple(round(x/64000) for x in o.location[:2]):o for o in tiles};maxgap=0;checked=0
for (x,y),o in grid.items():
 for dx,dy in [(1,0),(0,1)]:
  other=grid.get((x+dx,y+dy))
  if not other:continue
  for i in range(33):
   a=i*33+32 if dx else 32*33+i;b=i*33 if dx else i
   gap=abs(o.data.vertices[a].co.z-other.data.vertices[b].co.z);maxgap=max(maxgap,gap);checked+=1
rig=bpy.data.objects['AEGIS_RIG'];bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
parts=[o for o in bpy.data.collections['EV04 • AEGIS'].objects if o.type=='MESH']
v=[o.matrix_world@Vector(q) for o in parts for q in o.bound_box]
ground=bpy.data.objects['Continuous basin & western slope • 160m'];hit,co,normal,index=ground.ray_cast(Vector((0,-38,100)),Vector((0,0,-1)))
manifest=json.loads((p/'world_manifest.json').read_text())
report={'tiles':len(tiles),'world_width_m':1024000,'edge_samples_checked':checked,'maximum_adjacent_height_gap_m':maxgap,'actor_dimensions_m':[max(q[i] for q in v)-min(q[i] for q in v) for i in range(3)],'actor_lowest_z':min(q.z for q in v),'ground_at_spawn_z':co.z if hit else None,'crossing_hours_at_5mps':manifest['crossing_at_5mps_hours'],'expedition_distance_km':manifest['expedition_planar_distance_km'],'expedition_days_at_5mps':manifest['expedition_at_5mps_days'],'finite_terrain':all(all(math.isfinite(x) for x in vert.co) for o in tiles for vert in o.data.vertices),'engine_traversal_tested':False}
(p/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
