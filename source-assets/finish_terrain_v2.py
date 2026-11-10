import bpy,numpy as np,math,json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent/'world_v2';f=np.load(P/'terrain_fields.npz');H=f['height'];W=np.load(P/'water_extended.npz')['water']
bpy.ops.wm.open_mainfile(filepath=str(P/'ECHO9_Full_Terrain_v2.blend'));s=bpy.context.scene
old=bpy.data.objects['River and lake surfaces'];mat=old.data.materials[0];d=old.data;bpy.data.objects.remove(old,do_unlink=True);bpy.data.meshes.remove(d)
regions=json.loads((P/'terrain_manifest.json').read_text())['regions'];holes=[(r['center_m'][0],r['center_m'][1]) for r in regions]
def sample(arr,x,y):
 xx=np.clip((np.asarray(x)+512000)/250,0,4095.999);yy=np.clip((np.asarray(y)+512000)/250,0,4095.999);i=xx.astype('i');j=yy.astype('i');u=xx-i;v=yy-j;return arr[j,i]*(1-u)*(1-v)+arr[j,i+1]*u*(1-v)+arr[j+1,i]*(1-u)*v+arr[j+1,i+1]*u*v
V=[];F=[]
def polygon(points):
 # Clip each surface cell against water depth=0, interpolating shore intersections.
 out=[]
 for a,b in zip(points,points[1:]+points[:1]):
  if a[3]>=0:out.append(a[:3])
  if (a[3]>=0)!=(b[3]>=0):
   t=a[3]/(a[3]-b[3]);out.append(tuple(a[k]+(b[k]-a[k])*t for k in range(3)))
 if len(out)>2:
  start=len(V);V.extend(out);F.append(tuple(start+i for i in range(len(out))))
wet=(W>H)&(W>-999);mask=wet[:-1,:-1]|wet[:-1,1:]|wet[1:,:-1]|wet[1:,1:]
for j,i in zip(*np.where(mask)):
 x=-512000+i*250;y=-512000+j*250
 if any(abs(x+125-cx)<4000 and abs(y+125-cy)<4000 for cx,cy in holes):continue
 pts=[]
 for dx,dy in [(0,0),(1,0),(1,1),(0,1)]:
  z=float(W[j+dy,i+dx]);pts.append((x+250*dx,y+250*dy,z,z-float(H[j+dy,i+dx])))
 polygon(pts)
# Fine water clip uses each region's actual 31.25 m terrain, eliminating stair-step banks.
for o in bpy.data.collections['12_Regions_31m'].objects:
 a=np.empty(len(o.data.vertices)*3,dtype='f');o.data.vertices.foreach_get('co',a);a=a.reshape(257,257,3);X=a[:,:,0]+o.location.x;Y=a[:,:,1]+o.location.y;Z=a[:,:,2];L=sample(W,X,Y);wet=(L>Z)&(L>-999);mask=wet[:-1,:-1]|wet[:-1,1:]|wet[1:,:-1]|wet[1:,1:]
 for j,i in zip(*np.where(mask)):
  polygon([(float(X[j+dy,i+dx]),float(Y[j+dy,i+dx]),float(L[j+dy,i+dx]),float(L[j+dy,i+dx]-Z[j+dy,i+dx])) for dx,dy in [(0,0),(1,0),(1,1),(0,1)]])
d=bpy.data.meshes.new('Clipped river and lake surfaces');d.from_pydata(V,[],F);d.update();o=bpy.data.objects.new('River and lake surfaces',d);bpy.data.collections['13_Hydrology'].objects.link(o);d.materials.append(mat)
def setcam(name,loc,target):
 o=bpy.data.objects[name];o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
def z(x,y):return float(sample(H,x,y))
dune=setcam('Dune Sea survey',(-159900,-90800,z(-159900,-90800)+100),(-160200,-88000,z(-160200,-88000)+50))
glacier=setcam('Glacier Gate survey',(-128200,327400,z(-128200,327400)+1100),(-130000,331500,z(-130000,331500)+100))
caldera=setcam('Caldera survey',(398000,-155000,20000),(355000,-110000,z(355000,-110000)))
s.camera=bpy.data.objects['01 • Aegis start'];bpy.data.texts.load(str(Path(__file__).resolve()));bpy.ops.wm.save_as_mainfile(filepath=str(P/'ECHO9_Full_Terrain_v2.blend'),compress=True)
r=json.loads((P/'build_report.json').read_text());r['water_faces']=len(F);r['shoreline_method']='depth-zero clipping at 250m globally and 31.25m in exploration regions';(P/'build_report.json').write_text(json.dumps(r,indent=2))
v=json.loads((P/'validation.json').read_text());v['river_water_faces']=len(F);v['shoreline_clipping_finite']=all(all(math.isfinite(x) for x in a) for a in V);(P/'validation.json').write_text(json.dumps(v,indent=2))
for c,name in [(dune,'Dune_Sea'),(glacier,'Glacier_Gate'),(caldera,'Caldera'),(bpy.data.objects['02 • True-scale continent'],'05_Continent_true_scale')]:
 s.camera=c;s.render.filepath=str(P/'renders'/name);bpy.ops.render.render(write_still=True)
print('FINISHED_SHORELINES',len(F),flush=True)
