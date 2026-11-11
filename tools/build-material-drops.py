"""ECHO-9 material drops: 能源晶核 (energy core) and 合金 (alloy salvage).

Two small hero props dropped by defeated creatures. Original procedural geometry
with generated PBR textures (brushed alloy colour/roughness/normal and a crystal
vein emission map), exported to one GLB with the roots Drop_Energy and Drop_Metal.
Blender -b --factory-startup --python tools/build-material-drops.py [-- --export-only]
Set DROPS_REVIEW to a folder to also render a studio preview there.
"""
import bpy, bmesh, math, os, sys, json, tempfile
import numpy as np
from pathlib import Path
from mathutils import Vector

P=Path(__file__).resolve().parents[1]
OUT=P/'dist/assets/material-drops-v1';OUT.mkdir(parents=True,exist_ok=True)
REVIEW=os.environ.get('DROPS_REVIEW')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
rng=np.random.default_rng(9)

# ---------------------------------------------------------------- textures
TMP=Path(tempfile.mkdtemp(prefix='echo9-drops-'))
def image(name,arr,colorspace='sRGB'):
 # Write a real PNG and load it back: packing a generated image directly
 # exports a blank texture.
 h,w,_=arr.shape;img=bpy.data.images.new(name,w,h,alpha=False)
 rgba=np.concatenate([np.clip(arr,0,1),np.ones((h,w,1))],axis=2).astype(np.float32)
 img.pixels.foreach_set(rgba.ravel());path=TMP/(name+'.png');img.filepath_raw=str(path);img.file_format='PNG';img.save()
 bpy.data.images.remove(img);img=bpy.data.images.load(str(path));img.name=name;img.colorspace_settings.name=colorspace;img.pack();return img

def blur(a,k):
 for axis in (0,1):
  out=np.zeros_like(a)
  for d in range(-k,k+1):out+=np.roll(a,d,axis=axis)
  a=out/(2*k+1)
 return a

N=256
# Brushed alloy: long horizontal streaks, faint machining bands, sparse scratches.
streak=blur(rng.normal(0,1,(N,N)),1);streak=np.stack([blur(streak[i:i+1].repeat(1,0),0)[0] for i in range(N)])
streak=blur(np.repeat(rng.normal(0,1,(N,1)),N,axis=1)+.35*rng.normal(0,1,(N,N)),1)
streak=(streak-streak.min())/(np.ptp(streak)+1e-6)
bands=.5+.5*np.sin(np.linspace(0,22*math.pi,N))[:,None]*np.ones((1,N))
scratch=np.zeros((N,N))
for _ in range(9):
 x0,y0=rng.integers(0,N,2);ang=rng.uniform(-.5,.5);ln=rng.integers(20,90)
 for t in range(ln):
  x=int(x0+t*math.cos(ang))%N;y=int(y0+t*math.sin(ang))%N;scratch[y,x]=1
scratch=blur(scratch,0)
alloy=.55+.12*streak+.03*bands+.18*scratch
alloy_col=np.stack([alloy*.93,alloy*.95,alloy*1.0],axis=2)
alloy_rough=np.clip(.30+.22*(1-streak)+.06*bands-.12*scratch,0,1)
alloy_rough=np.repeat(alloy_rough[:,:,None],3,axis=2)
hgt=blur(.6*streak+.4*scratch,1);gy,gx=np.gradient(hgt)
nrm=np.stack([.5-gx*2.5,.5-gy*2.5,np.ones_like(gx)],axis=2);nrm[...,2]=1
nrm[...,:2]=np.clip(nrm[...,:2],0,1);nrm[...,2]=.95
# Crystal: soft vertical gradient with branching bright veins.
yy,xx=np.mgrid[0:N,0:N]/N
veins=np.zeros((N,N))
for i in range(5):
 phase=rng.uniform(0,6.3);freq=rng.uniform(.6,1.4);width=rng.uniform(.01,.022);x0=rng.uniform(.05,.95)
 path=x0+.12*np.sin(yy*freq*6.28+phase)+.03*np.sin(yy*17+phase*3)
 veins=np.maximum(veins,np.exp(-((xx-path)/width)**2))
veins=blur(veins,1)
glow=.30+.45*(1-np.abs(yy-.5)*2)+.9*veins
crystal_emit=np.stack([glow*.32,glow*.95,glow*.82],axis=2)
crystal_col=np.stack([.05+.10*veins,.32+.25*(1-yy)+.2*veins,.30+.2*(1-yy)+.2*veins],axis=2)

IMG={'alloy_col':image('drop_alloy_color',alloy_col),'alloy_rough':image('drop_alloy_rough',alloy_rough,'Non-Color'),
     'alloy_nrm':image('drop_alloy_normal',nrm,'Non-Color'),'crystal_emit':image('drop_crystal_emission',np.clip(crystal_emit,0,1)),
     'crystal_col':image('drop_crystal_color',np.clip(crystal_col,0,1))}

# ---------------------------------------------------------------- materials
def material(name,color=(.5,.5,.5),metal=0.,rough=.5,emit=None,strength=0.,tex=None):
 m=bpy.data.materials.new('Drop_'+name);m.use_nodes=True;nt=m.node_tree;bs=nt.nodes['Principled BSDF']
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if tex=='alloy':
  for key,inp in [('alloy_col','Base Color'),('alloy_rough','Roughness')]:
   n=nt.nodes.new('ShaderNodeTexImage');n.image=IMG[key];nt.links.new(n.outputs['Color'],bs.inputs[inp])
  n=nt.nodes.new('ShaderNodeTexImage');n.image=IMG['alloy_nrm'];nm=nt.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.18
  nt.links.new(n.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 if tex=='crystal':
  n=nt.nodes.new('ShaderNodeTexImage');n.image=IMG['crystal_col'];nt.links.new(n.outputs['Color'],bs.inputs['Base Color'])
  e=nt.nodes.new('ShaderNodeTexImage');e.image=IMG['crystal_emit'];nt.links.new(e.outputs['Color'],bs.inputs['Emission Color'])
  bs.inputs['Emission Strength'].default_value=strength
 elif emit:
  bs.inputs['Emission Color'].default_value=(*emit,1);bs.inputs['Emission Strength'].default_value=strength
 return m

crystal=material('EnergyCrystal',(.06,.45,.40),0,.12,strength=2.2,tex='crystal')
alloy=material('BrushedAlloy',(.62,.64,.66),.92,.34,tex='alloy')
cobalt=material('CobaltPaint',(.03,.12,.34),.35,.42)
graphite=material('Graphite',(.025,.03,.035),.6,.5)
steel=material('Steel',(.42,.45,.47),.9,.28)
amber=material('AmberStrap',(.55,.33,.08),.2,.55)
amberlight=material('AmberLamp',(.9,.55,.12),0,.3,emit=(1,.6,.15),strength=6)
crimson=material('CrimsonTag',(.42,.03,.025),.3,.45)
ivory=material('IvoryMark',(.72,.70,.62),.1,.6)

# ---------------------------------------------------------------- helpers
def finish(o,m,bevel=0,smooth=True,segments=3):
 o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=smooth
 if bevel:
  b=o.modifiers.new('Bevel','BEVEL');b.width=bevel;b.segments=segments;b.limit_method='ANGLE'
 w=o.modifiers.new('Normals','WEIGHTED_NORMAL');w.keep_sharp=True
 return o
def uv(o):
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
def cyl(name,p,r,h,m,verts=24,bevel=.01,rot=(0,0,0),r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r,radius2=r if r2 is None else r2,depth=h,location=p,rotation=rot)
 o=bpy.context.object;o.name=name;uv(o);return finish(o,m,bevel)
def cube(name,p,s,m,bevel=.012,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p,rotation=rot);o=bpy.context.object;o.name=name;o.scale=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);uv(o);return finish(o,m,bevel)
def torus(name,p,R,r,m,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,major_segments=40,minor_segments=10,location=p,rotation=rot)
 o=bpy.context.object;o.name=name;uv(o);return finish(o,m)
def tube(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4;c.resolution_u=10
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type=b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);uv(o);return finish(o,m)
def root(name):
 e=bpy.data.objects.new(name,None);scene.collection.objects.link(e);return e
def parent(children,r):
 for c in children:c.parent=r

# ---------------------------------------------------------------- energy core
# A faceted hexagonal crystal held in a cobalt cage between two machined caps.
parts=[]
bm=bmesh.new();h=.50;rad=.135
ring=lambda z,s:[bm.verts.new((math.cos(a)*rad*s,math.sin(a)*rad*s,z)) for a in [i*math.tau/6+.26 for i in range(6)]]
bot=bm.verts.new((0,0,.16));r1=ring(.26,.82);r2=ring(.36,1);r3=ring(.36+h*.55,1.04);r4=ring(.36+h*.82,.86);top=bm.verts.new((0,0,.36+h+.10))
for i in range(6):
 j=(i+1)%6;bm.faces.new((bot,r1[j],r1[i]))
 for a,b in [(r1,r2),(r2,r3),(r3,r4)]:bm.faces.new((a[i],a[j],b[j],b[i]))
 bm.faces.new((r4[i],r4[j],top))
me=bpy.data.meshes.new('Energy crystal');bm.to_mesh(me);bm.free()
o=bpy.data.objects.new('Energy / faceted crystal',me);scene.collection.objects.link(o);uv(o)
o.data.materials.append(crystal)
for f in o.data.polygons:f.use_smooth=False
parts.append(o)
parts.append(cyl('Energy / lower cap',(0,0,.13),.20,.10,graphite,32,.02))
parts.append(cyl('Energy / lower collar',(0,0,.21),.17,.05,steel,32,.012))
parts.append(cyl('Energy / upper cap',(0,0,.97),.17,.07,graphite,32,.018))
parts.append(cyl('Energy / upper finial',(0,0,1.03),.07,.06,steel,24,.01,r2=.04))
parts.append(cyl('Energy / foot',(0,0,.04),.24,.08,cobalt,40,.025,r2=.21))
parts.append(torus('Energy / lower ring',(0,0,.25),.205,.018,steel))
parts.append(torus('Energy / upper ring',(0,0,.92),.19,.016,steel))
for i in range(3):
 a=i*math.tau/3+.5;c,s=math.cos(a),math.sin(a)
 parts.append(tube('Energy / cobalt cage rib',[(c*.20,s*.20,.25),(c*.26,s*.26,.58),(c*.19,s*.19,.92)],.024,cobalt))
 parts.append(cube('Energy / rib clamp',(c*.255,s*.255,.58),(.05,.05,.07),steel,.01,rot=(0,0,a)))
parts.append(cube('Energy / status lamp',(.20,-.07,.13),(.035,.05,.03),amberlight,.006,rot=(0,0,-.35)))
parts.append(cube('Energy / ivory serial plate',(-.17,-.12,.13),(.10,.012,.045),ivory,.004,rot=(0,0,.6)))
# Two loose shards that broke off when the creature fell.
for k,(x,y,ang) in enumerate([(.30,.10,.9),(-.26,.16,-.6)]):
 bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.045,radius2=0,depth=.16,location=(x,y,.05),rotation=(1.2,0,ang))
 s=bpy.context.object;s.name='Energy / loose shard';uv(s);s.data.materials.append(crystal);parts.append(s)
energy_root=root('Drop_Energy');parent(parts,energy_root)

# ---------------------------------------------------------------- alloy salvage
# Strapped alloy ingots with a tag, beside a bent fragment of cobalt armour.
parts=[]
def ingot(name,p,rot=0):
 bm=bmesh.new();L,W,H,t=.46,.20,.12,.035
 low=[(-L/2,-W/2),(L/2,-W/2),(L/2,W/2),(-L/2,W/2)];up=[(x-math.copysign(t,x),y-math.copysign(t,y)) for x,y in low]
 v=[bm.verts.new((x,y,0)) for x,y in low]+[bm.verts.new((x,y,H)) for x,y in up]
 bm.faces.new(v[3::-1]);bm.faces.new(v[4:])
 for i in range(4):j=(i+1)%4;bm.faces.new((v[i],v[j],v[4+j],v[4+i]))
 me=bpy.data.meshes.new(name);bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o)
 o.location=p;o.rotation_euler=(0,0,rot);uv(o);finish(o,alloy,.012)
 return o
parts+= [ingot('Alloy / ingot',(-.11,0,0),.0),ingot('Alloy / ingot',(.12,.02,0),.04),ingot('Alloy / top ingot',(0,.01,.12),-.06)]
# Amber strap wrapped around the stack, with a buckle and a crimson tag.
for x in (-.15,.16):
 tube('Alloy / amber strap',[(x,-.13,.0),(x,-.13,.22),(x,0,.27),(x,.13,.22),(x,.13,.0)],.012,amber);parts.append(bpy.context.view_layer.objects.active)
parts.append(cube('Alloy / strap buckle',(.16,-.13,.15),(.05,.016,.05),steel,.006))
parts.append(torus('Alloy / tag ring',(.21,-.15,.11),.018,.004,steel,rot=(math.pi/2,0,0)))
parts.append(cube('Alloy / crimson tag',(.24,-.155,.07),(.06,.006,.085),crimson,.006,rot=(0,.25,0)))
parts.append(cube('Alloy / tag stencil',(.24,-.16,.075),(.035,.003,.012),ivory,.002,rot=(0,.25,0)))
# Bent cobalt armour fragment leaning on the ingots.
bm=bmesh.new();cols,rows=7,5
grid=[[bm.verts.new(((i/(cols-1)-.5)*.36,0,(j/(rows-1))*.30)) for i in range(cols)] for j in range(rows)]
for j in range(rows-1):
 for i in range(cols-1):bm.faces.new((grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]))
for j,row in enumerate(grid):
 for i,v in enumerate(row):
  x=i/(cols-1)-.5;v.co.y=.06*x*x*4+.025*math.sin(j*1.3)
  if (i==cols-1 and j>2) or (i==0 and j==rows-1):v.co.z-=.06;v.co.x*=.9   # torn corners
me=bpy.data.meshes.new('Alloy armour fragment');bm.to_mesh(me);bm.free()
frag=bpy.data.objects.new('Alloy / bent cobalt armour fragment',me);scene.collection.objects.link(frag)
sol=frag.modifiers.new('Thickness','SOLIDIFY');sol.thickness=.018
frag.location=(-.02,.20,.02);frag.rotation_euler=(-.42,0,.15);uv(frag);finish(frag,cobalt,.004)
parts.append(frag)
parts.append(cube('Alloy / fragment edge',(-.02,.21,.315),(.30,.012,.014),ivory,.003,rot=(-.42,0,.15)))
for k,(x,y) in enumerate([(.30,.12),(-.30,-.10),(.26,-.22)]):
 parts.append(cube('Alloy / loose offcut',(x,y,.012),(.07,.03,.022),alloy,.004,rot=(0,0,k*1.1)))
metal_root=root('Drop_Metal');parent(parts,metal_root)

# ---------------------------------------------------------------- export
energy_root.location=(0,0,0);metal_root.location=(0,0,0)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'material-drops.glb'),use_selection=True,export_format='GLB',export_apply=True,export_yup=True,export_animations=False,export_image_format='AUTO')
tris=sum(sum(len(p.vertices)-2 for p in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().polygons) for o in scene.objects if o.type=='MESH')
(OUT/'provenance.json').write_text(json.dumps({'design':'ECHO-9 material drops','contents':{'Drop_Energy':'能源晶核 / energy core: faceted vein-lit crystal in a cobalt cage, amber status lamp','Drop_Metal':'合金 / alloy salvage: strapped brushed ingots, crimson tag, bent cobalt armour fragment'},'generator':'tools/build-material-drops.py','textures':'Generated in the builder (brushed alloy colour/roughness/normal, crystal vein colour/emission); no downloads','units':'metres; the game scales them to world units','triangles':tris},indent=2,ensure_ascii=False))
print('DROPS_EXPORTED',tris,flush=True)

if REVIEW and '--export-only' not in sys.argv:
 metal_root.location=(.75,0,0);energy_root.location=(-.45,0,0)
 bpy.ops.mesh.primitive_plane_add(size=20);floor=bpy.context.object;floor.data.materials.append(material('Floor',(.05,.06,.065),0,.8))
 cam=bpy.data.cameras.new('cam');co=bpy.data.objects.new('cam',cam);scene.collection.objects.link(co);co.location=(1.2,-3.3,1.7);cam.lens=50
 co.rotation_euler=(Vector((.15,0,.45))-co.location).to_track_quat('-Z','Y').to_euler();scene.camera=co
 for name,p,e,col in [('key',(-2,-2,3),300,(1,.92,.82)),('rim',(2,2,2.5),220,(.7,.85,1)),('fill',(2.5,-1.5,1),90,(1,1,1))]:
  d=bpy.data.lights.new(name,'AREA');d.energy=e;d.size=2;d.color=col;l=bpy.data.objects.new(name,d);scene.collection.objects.link(l);l.location=p;l.rotation_euler=(Vector((0,0,.4))-l.location).to_track_quat('-Z','Y').to_euler()
 w=bpy.data.worlds.new('w');scene.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs['Color'].default_value=(.08,.1,.12,1);w.node_tree.nodes['Background'].inputs['Strength'].default_value=1.0
 scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=760;scene.view_settings.view_transform='AgX'
 scene.render.filepath=str(Path(REVIEW)/'material-drops.png');bpy.ops.render.render(write_still=True);print('DROPS_REVIEW',scene.render.filepath)
