"""Build ECHO-9's hollow crashed orbital drive. Blender 4.x/5.x, no add-ons.
Source: Blender +Z up, mouth toward -Y. Export: glTF +Y up, mouth toward -Z.
The playable mesh is open at both ends. The studio is excluded from export.
"""
import bpy, math, random, json, bmesh
from pathlib import Path
from mathutils import Vector, Matrix
P=Path(__file__).resolve().parents[1]; OUT=P/'dist/assets/wreck-v1'; ART=P/'art/wreck-v1'
OUT.mkdir(parents=True,exist_ok=True);ART.mkdir(parents=True,exist_ok=True)
rng=random.Random(9817)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
asset=bpy.data.collections.new('ECHO-9 · ORBITAL DRIVE WRECK');scene.collection.children.link(asset)
studio=bpy.data.collections.new('STUDIO · not exported');scene.collection.children.link(studio)
materials={}
for n,c,m,r in [
 ('Wreck_Ivory',(.58,.64,.62),.38,.53),('Wreck_IvoryCool',(.44,.53,.54),.42,.57),
 ('Wreck_IvoryWarm',(.64,.63,.54),.32,.62),('Wreck_ExposedSteel',(.16,.20,.21),.84,.42),
 ('Wreck_DarkHull',(.035,.047,.05),.65,.68),('Wreck_InnerLiner',(.12,.15,.15),.5,.66),
 ('Wreck_Rust',(.32,.105,.028),.15,.95),('Wreck_RustLight',(.55,.25,.065),.08,.94),
 ('Wreck_Burn',(.043,.036,.026),.12,.95),('Wreck_Debris',(.32,.34,.30),.05,1),
 ('Wreck_Amber',(.68,.32,.055),.25,.63),('Wreck_Light',(.19,.60,.66),.25,.3)]:
 mat=bpy.data.materials.new(n);mat.use_nodes=True;mat.diffuse_color=(*c,1);p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=m;p.inputs['Roughness'].default_value=r
 if n=='Wreck_Light':p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=2.2
 materials[n]=mat
parts=[]
def put(o,name,mat):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 asset.objects.link(o);o.data.materials.append(materials[mat]);parts.append(o);return o
def finish(o,bevel=0,smooth=False):
 bpy.context.view_layer.objects.active=o
 if bevel:
  m=o.modifiers.new('Worn panel edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
 for f in o.data.polygons:f.use_smooth=smooth
 if bevel:
  m=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');m.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=m.name)
 return o
def mesh(name,verts,faces,mat,bevel=0,smooth=False):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);put(o,name,mat)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free();return finish(o,bevel,smooth)
def box(name,p,size,mat='Wreck_DarkHull',bevel=.06,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=put(bpy.context.object,name,mat);o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=rot;return finish(o,bevel)
def beam(name,a,b,r,mat='Wreck_ExposedSteel',n=16):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length,location=(a+b)/2);o=put(bpy.context.object,name,mat);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,0,True)
def radial(t,y,r):return (math.cos(t)*r,y,15+math.sin(t)*r)
profile=[(-23,11.5),(-22,12.4),(-20,13.8),(-16,14.8),(-10,15),(-3,15),(4,14.8),(11,14.4),(17,13.7),(22,12.4)]
def radius(y):
 for (a,ra),(b,rb) in zip(profile,profile[1:]):
  if a<=y<=b:return ra+(rb-ra)*(y-a)/(b-a)
 return profile[0][1] if y<profile[0][0] else profile[-1][1]
def shell(name,t0,t1,y0,y1,r0,r1,thickness,mat,sub=4,ragged=False):
 verts=[]
 for inner in [False,True]:
  for y,r in [(y0,r0),(y1,r1)]:
   for i in range(sub+1):
    t=t0+(t1-t0)*i/sub;off=(math.sin(t*11+.7)*.14+math.cos(t*19)*.07) if ragged and y==y0 else 0
    verts.append(radial(t,y+off,r-(thickness if inner else 0)))
 k=sub+1;faces=[]
 for i in range(sub):
  faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
 faces.extend([(0,k,3*k,2*k),(sub,2*k-1,4*k-1,3*k-1)])
 return mesh(name,verts,faces,mat,.035,True)
# Structural liner, seam-separated curved shell plates, and an exposed side service bay.
for j,((y0,r0),(y1,r1)) in enumerate(zip(profile,profile[1:])):
 for i in range(28):
  t0=i*math.tau/28+.005;t1=(i+1)*math.tau/28-.005
  service=10<=i<=16 and 3<=j<=6
  # Continuous liner beneath the outer plating makes the cutaway a recessed bay, not a capped tunnel.
  shell('Pressure hull liner',t0,t1,y0,y1,r0-.48,r1-.48,.45,'Wreck_InnerLiner',3)
  if service:continue
  if j==0 and i in [2,3,21]:continue
  mat=rng.choices(['Wreck_Ivory','Wreck_IvoryCool','Wreck_IvoryWarm'],[8,1,1])[0]
  shell('Segmented ceramic hull panel',t0,t1,y0+.055,y1-.055,r0,r1,.33,mat,4, j==0)
  if rng.random()<.35:
   tm=(t0+t1)*.5
   for y in [y0+.24,y1-.24]:
    r=radius(y)+.05;p=radial(tm,y,r);q=radial(tm,y,r+.11);beam('Flush hull lock',p,q,.105,'Wreck_ExposedSteel',6)
# Torn front lip with dark inner collar and asymmetric chips.
for i in range(56):
 t0=i*math.tau/56;t1=(i+1)*math.tau/56-.008
 if i in [5,6,7,42]:continue
 y=-23.2+rng.uniform(-.32,.17);shell('Fractured mouth rim',t0,t1,y,-22.6,11.65,12,.65,'Wreck_Rust' if i%5<2 else 'Wreck_ExposedSteel',2,True)
 if i%4==0:
  t=(t0+t1)*.5;beam('Front flange bolt',radial(t,-23.27,11.13),radial(t,-23.42,11.13),.16,'Wreck_ExposedSteel',6)
# Large surrounding rear flange and readable long ribs along the exterior.
for y in [-16,-3,11,21.4]:
 for i in range(28):
  shell('Circumferential expansion joint',i*math.tau/28,(i+1)*math.tau/28-.008,y-.11,y+.11,radius(y)+.09,radius(y)+.09,.18,'Wreck_ExposedSteel',3)
for i in [1,5,9,19,23,27]:
 t=i*math.tau/28
 for (y0,r0),(y1,r1) in zip(profile[2:],profile[3:]):beam('External longitudinal stiffener',radial(t,y0,r0+.10),radial(t,y1,r1+.1),.13,'Wreck_IvoryCool',8)
# Rust bleed at seams and lip: thin irregular patches follow the cylinder, not flat decals.
for i in range(220):
 t=rng.uniform(0,math.tau);y=rng.choice([-21.5,-16,-3,11,20])+rng.uniform(-.65,.65)
 length=rng.uniform(.28,2.4);spread=rng.uniform(.006,.036);y1=min(21.8,y+length)
 shell('Rust bloom and runoff',t-spread,t+spread,y,y1,radius(y)+.022,radius(y1)+.023,.008,rng.choice(['Wreck_Rust','Wreck_RustLight','Wreck_Burn']),1)
# A torn edge near the top-left front, with bent metal teeth.
for i in range(8):
 t=2.05+i*.09;y=-22.7+rng.uniform(-.3,.3);r=12.0
 a=radial(t,y,r);b=radial(t+.075,y+.2,r+.2);c=radial(t+.04,y-1-rng.random()*1.5,r-.6)
 mesh('Bent fracture petal',[a,b,c,tuple(Vector(a)+Vector((0,.1,0))),tuple(Vector(b)+Vector((0,.1,0))),tuple(Vector(c)+Vector((0,.1,0)))],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'Wreck_Rust',.025)
# Recessed machinery bay: deep cylinders, coolant conduits, open ribs, charcoal recesses.
for z in [10.0,12.4,15.0,17.6,20.0]:
 x=-math.sqrt(max(0,14.25**2-(z-15)**2))-.1
 beam('Service bay heat exchanger',(x,-9,z),(x,13,z),.52 if z==15 else .32,'Wreck_DarkHull',24)
 for y in [-8,-4,0,4,8,12]:beam('Heat exchanger collar',(x,y-.16,z),(x,y+.16,z),.62 if z==15 else .42,'Wreck_ExposedSteel',20)
for y in [-9,-2,5,12]:
 beam('Exposed service bay frame',(-13.45,y,9),(-13.45,y,21),.22,'Wreck_ExposedSteel',10)
 box('Service bay inset cartridge',(-14.15,y+.5,15),(1.0,2.5,2.8),'Wreck_DarkHull',.15)
 for z in [14.1,14.6,15.1,15.6,16.1]:box('Cartridge ventilation slat',(-14.72,y+.5,z),(.12,2.05,.12),'Wreck_Rust',.02)
# Internal hoops and cable runs are visible from the open mouth.
for y in [-20,-13,-6,1,8,15,21]:
 r=radius(y)-.9
 for i in range(32):shell('Interior structural rib',i*math.tau/32,(i+1)*math.tau/32-.006,y-.16,y+.16,r,r,.28,'Wreck_ExposedSteel',3)
for i in [2,6,10,14,18,22,26,30]:
 t=i*math.tau/32
 for (y0,r0),(y1,r1) in zip(profile[1:],profile[2:]):beam('Internal armored cable trunk',radial(t,y0,r0-1.1),radial(t,y1,r1-1.1),.16,'Wreck_DarkHull',10)
# Walkable deck is deliberately independent of the hollow pressure hull.
box('Interior maintenance deck',(0,.8,3.65),(13.4,40,.35),'Wreck_DarkHull',.04)
for y in range(-18,22,2):box('Deck cross-grating',(0,y,3.85),(13.2,.18,.08),'Wreck_ExposedSteel',.02)
for side in [-1,1]:
 beam('Walkway edge rail',(side*6.5,-19,4.0),(side*6.5,20,4.0),.13,'Wreck_Amber',10)
 for y in [-18,-10,-2,6,14]:
  box('Emergency marker',(side*6.3,y,4.15),(.22,.8,.12),'Wreck_Light',.02)
# Broad ramp from the rubble to the deck; no collision cap in the mouth.
mesh('Collapsed boarding ramp',[(-6.5,-29,.08),(6.5,-29,.08),(6.5,-19.4,3.85),(-6.5,-19.4,3.85),(-6.5,-29,-.14),(6.5,-29,-.14),(6.5,-19.4,3.62),(-6.5,-19.4,3.62)],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'Wreck_InnerLiner',.05)
for y in [-27,-25,-23,-21]:
 z=.08+(y+29)/9.6*3.77;beam('Ramp tread',(-6.3,y,z+.06),(6.3,y,z+.06),.075,'Wreck_ExposedSteel',8)
# Scatter broken concrete and sharp hull plates along the outside, leave center ramp clear.
for i in range(65):
 side=rng.choice([-1,1]);x=side*rng.uniform(8,18);y=rng.uniform(-26,23);size=rng.uniform(.4,2.1)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,size*.3));o=put(bpy.context.object,'Grounded fractured rubble','Wreck_Debris');o.scale=(size*rng.uniform(.7,1.5),size*rng.uniform(.6,1.3),size*.5);o.rotation_euler=(rng.random(),rng.random(),rng.random()*6.28);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for i in range(12):
 x=rng.choice([-1,1])*rng.uniform(8,17);y=rng.uniform(-27,22)
 box('Detached hull armor shard',(x,y,.42),(rng.uniform(1,3),rng.uniform(1.5,4),.18),rng.choice(['Wreck_Ivory','Wreck_Rust']),.04,(rng.uniform(-.3,.3),rng.uniform(-.4,.4),rng.uniform(-1,1)))
# The impact tore away the bottom of the lip, leaving a broad boarding opening.
# This removes only the front shell panels below the ramp, never the center deck.
for o in list(parts):
 if not o.name.startswith(('Pressure hull liner','Segmented ceramic hull panel','Fractured mouth rim','Front flange bolt','Rust bloom')):continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 if not pts:continue
 c=sum(pts,Vector())/len(pts)
 if max(v.y for v in pts)<-19.7 and c.z<7 and abs(c.x)<8.5:
  parts.remove(o);bpy.data.objects.remove(o,do_unlink=True)
print('WRECK_GEOMETRY_READY',len(parts),flush=True)

# Join by material for a small runtime submission budget, retaining an editable part copy in source.
for o in parts:
 if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
 uv=o.data.uv_layers.active.data
 for f in o.data.polygons:
  n=o.matrix_world.to_3x3()@f.normal;axis=max(range(3),key=lambda k:abs(n[k]));axes=[k for k in range(3) if k!=axis]
  for li in f.loop_indices:
   p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv[li].uv=(p[axes[0]]/2.5,p[axes[1]]/2.5)
# Export copies bake the facing conversion, preserving aligned axes in glTF.
export=[];facing=Matrix.Rotation(math.pi,4,'Z')
for mat in materials:
 batch=[o for o in parts if o.data.materials[0].name==mat]
 if not batch:continue
 verts=[];faces=[];uvs=[];normals=[]
 for o in batch:
  offset=len(verts);transform=facing@o.matrix_world;normal_matrix=transform.to_3x3().inverted().transposed()
  verts.extend([tuple(transform@v.co) for v in o.data.vertices])
  for f in o.data.polygons:
   faces.append(tuple(offset+i for i in f.vertices))
   for li in f.loop_indices:
    uvs.append(tuple(o.data.uv_layers.active.data[li].uv))
    normals.append(tuple((normal_matrix@o.data.corner_normals[li].vector).normalized()))
 data=bpy.data.meshes.new(mat+'_game');data.from_pydata(verts,[],faces);data.update();data.materials.append(materials[mat]);data.uv_layers.new(name='UVMap')
 for i,uv in enumerate(uvs):data.uv_layers.active.data[i].uv=uv
 for f in data.polygons:f.use_smooth=True
 data.normals_split_custom_set(normals)
 o=bpy.data.objects.new(mat,data);scene.collection.objects.link(o);export.append(o)
# Preserve silhouette but keep the game export below the requested geometry budget.
raw_triangles=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in export)
if raw_triangles>98000:
 ratio=94000/raw_triangles
 for o in export:
  bpy.context.view_layer.objects.active=o
  mod=o.modifiers.new('Game mesh budget','DECIMATE');mod.ratio=ratio
  bpy.ops.object.modifier_apply(modifier=mod.name)
for o in export:o.data.validate(clean_customdata=False)
print('WRECK_EXPORT_READY',raw_triangles,flush=True)
bpy.ops.object.select_all(action='DESELECT')
for o in export:o.select_set(True)
bpy.context.view_layer.objects.active=export[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'echo9-orbital-wreck.glb'),use_selection=True,export_format='GLB',export_apply=True,export_animations=False)
triangles=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in export)
for o in export:bpy.data.objects.remove(o,do_unlink=True)
# The .blend and rendered proof use the same Poly Haven scanned normal/rough maps as runtime.
normal=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-normal.jpg'),check_existing=True);normal.colorspace_settings.name='Non-Color';normal.pack()
rough=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-rough.jpg'),check_existing=True);rough.colorspace_settings.name='Non-Color';rough.pack()
for n,mat in materials.items():
 if 'Ivory' not in n and 'Steel' not in n and 'InnerLiner' not in n:continue
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');tex=nodes.new('ShaderNodeTexImage');tex.image=normal;norm=nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.22;links.new(tex.outputs['Color'],norm.inputs['Color']);links.new(norm.outputs['Normal'],p.inputs['Normal']);tex=nodes.new('ShaderNodeTexImage');tex.image=rough;links.new(tex.outputs['Color'],p.inputs['Roughness'])
# Presentation stage and large soft illumination.
def studio_obj(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 studio.objects.link(o);return o
bpy.ops.mesh.primitive_plane_add(size=260,location=(0,0,-.45));floor=studio_obj(bpy.context.object);floor.name='Studio ground';floor.data.materials.append(materials['Wreck_Debris'])
def area(name,p,power,color,size,target=(0,-3,13)):
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;d.energy=power;d.color=color;d.shape='DISK';d.size=size;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Cloud softbox',(-30,-35,60),42000,(.77,.90,1),38);area('Amber grazing rim',(30,15,35),32000,(1,.56,.27),25);area('Interior bounce',(0,-32,16),17000,(.65,.82,1),20)
d=bpy.data.cameras.new('Wreck hero');cam=bpy.data.objects.new('Wreck hero',d);studio.objects.link(cam);cam.location=(-46,-67,36);cam.rotation_euler=(Vector((0,-4,13))-cam.location).to_track_quat('-Z','Y').to_euler();d.lens=45;scene.camera=cam
scene.world.color=(.22,.27,.3);scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene['asset']='ECHO-9 crashed orbital drive';scene['front']='Blender -Y; GLB -Z';scene['walkway']='13m wide deck at 3.85m; ramp from source Y=-29 at Z=.08 to Y=-19.4 at Z=3.85.'
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.color_type='MATERIAL'
bpy.data.texts.load(str(Path(__file__).resolve()))
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'ECHO9_Orbital_Drive_Wreck.blend'))
(OUT/'provenance.json').write_text(json.dumps({'name':'ECHO-9 crashed orbital drive','source':'art/wreck-v1/ECHO9_Orbital_Drive_Wreck.blend','generator':'tools/build-wreck.py','reference':'User-provided crashed spacecraft image; custom geometry, no third-party model','geometry':{'triangles':triangles,'material_draws':len(materials),'forward':'-Z','up':'+Y','mouth':'Open at both ends; no cap','deck_height':3.85,'deck_width':13.4,'ramp_game_z':[-29,-19.4]},'surface':{'source':'https://polyhaven.com/a/blue_metal_plate','license':'CC0-1.0','credit':'Powered by Poly Haven','maps':['../hangar-v1/panel-normal.jpg','../hangar-v1/panel-rough.jpg'],'application':'Runtime normal and roughness on ivory/steel/liner; source Blender has packed copies. GLB intentionally contains no embedded images.'}},indent=2))
scene.render.filepath=str(ART/'wreck-hero.png');bpy.ops.render.render(write_still=True)
print('WRECK_COMPLETE',triangles,'triangles',len(materials),'materials',flush=True)
