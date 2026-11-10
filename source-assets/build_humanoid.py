import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
P=Path(__file__).resolve().parent
(P/'robot').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection':bpy.data.collections.remove(c)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
robot=bpy.data.collections.new('EV03 • AUREL humanoid');scene.collection.children.link(robot)
studio=bpy.data.collections.new('STUDIO • presentation only');scene.collection.children.link(studio)
col=robot; parts={}; bone='chest'
def material(name,color,metal=.5,rough=.32,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
ivory=material('01 • ceramic titanium',(.64,.68,.65),.65,.3)
teal=material('02 • deep petrol armor',(.025,.095,.105),.7,.3)
dark=material('03 • graphite chassis',(.018,.025,.033),.65,.38)
steel=material('04 • brushed actuator steel',(.25,.32,.35),.85,.26)
orange=material('05 • safety vermilion',(.85,.125,.026),.45,.34)
glow=material('06 • amber reactor',(1,.2,.018),.25,.23,5)
cyan=material('07 • optical cyan',(.035,.7,1),.3,.2,4)
rubber=material('08 • flexible joint seals',(.008,.012,.016),.1,.75)
white=material('09 • typography',(.75,.83,.82),.3,.4)
def put(o,name,mat):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
 if mat:o.data.materials.append(mat)
 if col==robot:parts[o.name]=bone
 return o
def bevel(o,w=.05):
 m=o.modifiers.new('Machined edge radii','BEVEL');m.width=w;m.segments=3
 o.modifiers.new('Weighted hard surface normals','WEIGHTED_NORMAL')
 return o
def box(name,loc,scale,mat,w=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=put(bpy.context.object,name,mat);o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bevel(o,w)
def beam(name,a,b,r,mat,verts=24):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+b)/2);o=put(bpy.context.object,name,mat);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();bevel(o,.018)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def ring(name,loc,major,minor,mat,rot=(math.pi/2,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=10,location=loc,rotation=rot);o=put(bpy.context.object,name,mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def armor(name,outline,y,depth,mat,w=.055):
 # Outline points in the XZ plane: true beveled prism armor, not stacked boxes.
 v=[(x,y+d,z) for d in [-depth/2,depth/2] for x,z in outline];n=len(outline);f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat);parts[o.name]=bone
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');return bevel(o,w)
def bolt(x,y,z,r=.055):return beam('Recessed titanium fastener',(x,y,z),(x,y-.035,z),r,steel,6)
def label(txt,loc,size=.12):
 bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0));o=put(bpy.context.object,'Stencil • '+txt,white);o.data.body=txt;o.data.size=size;o.data.extrude=.0015;o.data.space_character=1.2;return o
# Human-scale android: 1.96m, eight-head proportions, no weaponry.
ivory.diffuse_color=(.46,.51,.52,1);p=ivory.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.46,.51,.52,1);p.inputs['Metallic'].default_value=.72;p.inputs['Roughness'].default_value=.3
teal.diffuse_color=(.07,.09,.10,1);teal.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.07,.09,.10,1)
for mat in [ivory,steel,teal]:
 n=mat.node_tree.nodes;l=mat.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=420;tex.inputs['Detail'].default_value=2
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.14;bump.inputs['Distance'].default_value=.00025;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
glow.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2
cyan.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2
# Smooth ellipsoid and tapered anatomical shells.
def ellipsoid(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,radius=1,location=loc);o=put(bpy.context.object,name,mat);o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return o
def shell(name,sections,mat,centerx=0,angles=(-math.pi,math.pi),count=64):
 # Each section is z, half-width, half-depth, depth offset. Curved anatomical envelopes.
 v=[];f=[]
 for z,rx,ry,cy in sections:
  for i in range(count+1):
   a=angles[0]+(angles[1]-angles[0])*i/count;v.append((centerx+rx*math.sin(a),cy-ry*math.cos(a),z))
 for k in range(len(sections)-1):
  for i in range(count):
   q=k*(count+1)+i;f.append((q,q+1,q+count+2,q+count+1))
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat);parts[o.name]=bone
 for p in me.polygons:p.use_smooth=True
 sub=o.modifiers.new('Continuous body curvature','SUBSURF');sub.levels=2;sub.render_levels=2
 sol=o.modifiers.new('Panel wall thickness','SOLIDIFY');sol.thickness=.004
 return o
def cable(name,pts,r,mat):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3;sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu);col.objects.link(o);cu.materials.append(mat);parts[o.name]=bone;return o
# Pelvis and abdominal spine: flexible waist instead of a solid block.
bone='pelvis'
shell('Pelvic monocoque',[(.93,.08,.065,.01),(.96,.125,.09,.01),(1.04,.154,.10,0),(1.09,.13,.085,0)],teal)
for s in [-1,1]:
 shell('Iliac ceramic wing',[(.96,.065,.072,0),(1.01,.072,.09,0),(1.08,.06,.08,0)],ivory,s*.085,(-1.5,1.5),32)
beam('Lumbar spine',(0,.035,1.04),(0,.035,1.29),.035,steel)
for z in [1.105,1.145,1.185,1.225]:
 ellipsoid('Segmented abdominal shield',(0,-.051,z),(.102,.035,.025),teal)
 beam('Flexible waist vertebra',(0,.035,z-.012),(0,.035,z+.012),.063,dark,32)
for s in [-1,1]:
 cable('Oblique power tendon',[(s*.11,.035,1.07),(s*.087,.025,1.17),(s*.14,.02,1.28)],.011,rubber)
 beam('Oblique piston',(s*.10,-.012,1.1),(s*.15,-.012,1.27),.009,steel)
# Rib cage, segmented front and rear plates.
bone='chest'
shell('Thoracic inner frame',[(1.23,.105,.073,0),(1.29,.16,.095,0),(1.40,.205,.11,0),(1.49,.20,.09,0),(1.55,.12,.065,0)],dark)
for s in [-1,1]:
 lo,hi=(.035,1.65) if s==1 else (-1.65,-.035)
 shell('Sculpted pectoral shell',[(1.29,.12,.08,-.005),(1.34,.174,.11,-.005),(1.43,.204,.119,-.005),(1.50,.188,.096,-.005),(1.535,.12,.075,-.005)],ivory,0,(lo,hi),40)
 shell('Scapular rear shell',[(1.28,.115,.07,.01),(1.4,.185,.098,.01),(1.49,.17,.075,.01),(1.53,.10,.06,.01)],teal,0,(s*1.68,s*3.1),32)
 # Clavicle follows human shoulder line.
 cable('Clavicle titanium ridge',[(s*.045,-.045,1.54),(s*.12,-.07,1.53),(s*.205,-.025,1.51)],.012,steel)
 for j in range(5):
  o=box('Lateral rib vent',(s*(.137+j*.006),.015,1.29+j*.025),(.026,.13,.008),steel,.002);o.rotation_euler.y=s*.2
 for z in [1.36,1.46]:beam('Flush pectoral fastener',(s*.14,-.105,z),(s*.14,-.11,z),.007,dark,6)
# Small status slit; no oversized reactor.
box('Sternum dark inlay',(0,-.122,1.415),(.018,.012,.115),dark,.004)
box('Sternum amber status',(0,-.130,1.435),(.005,.003,.055),glow,.001)
label('A U R E L',(-.14,-.129,1.418),.013)
label('03',(.102,-.128,1.39),.017)
# Neck tendon assembly.
bone='head'
beam('Neck core',(0,0,1.51),(0,0,1.68),.028,dark)
for s in [-1,1]:
 beam('Cervical chrome actuator',(s*.037,.013,1.55),(s*.028,.01,1.67),.009,steel)
 cable('Neck data loom',[(s*.035,.028,1.54),(s*.045,.03,1.6),(s*.035,.026,1.68)],.007,rubber)
for z in [1.58,1.61,1.64]:ring('Cervical bearing seal',(0,0,z),.032,.004,steel,(0,0,0))
# Human-like cranial volume, jaw and facial planes.
shell('Cranium rear shell',[(1.69,.043,.04,.01),(1.73,.068,.063,.012),(1.81,.082,.076,.012),(1.89,.072,.064,.01),(1.91,.052,.047,.006),(1.925,.025,.023,0),(1.929,.004,.004,0)],teal,0,(1.1,5.18),64)
shell('Forehead ceramic plate',[(1.818,.073,.073,0),(1.84,.078,.077,0),(1.89,.065,.064,0),(1.908,.049,.045,0),(1.922,.025,.023,0),(1.926,.005,.004,0)],ivory,0,(-1.42,1.42),48)
# Inset eyes beneath a subtle brow, short individual lenses.
ellipsoid('Orbital dark mask',(0,-.059,1.801),(.071,.024,.019),dark)
for s in [-1,1]:
 o=ellipsoid('Recessed optical eye',(s*.034,-.084,1.805),(.020,.005,.0055),cyan)
 cable('Supraorbital brow',[(s*.008,-.083,1.823),(s*.038,-.085,1.828),(s*.066,-.065,1.82)],.005,ivory)
 # Cheek and cheekbone contour using curved patches.
 shell('Facial cheek plate',[(1.70,.041,.042,-.006),(1.733,.060,.060,-.006),(1.775,.070,.064,-.006),(1.793,.072,.063,-.006)],ivory,0,(s*.28,s*1.5),32)
 beam('Temple joint',(s*.074,.0,1.804),(s*.087,.0,1.804),.022,steel,32)
 beam('Temple inset',(s*.088,.0,1.804),(s*.09,.0,1.804),.014,dark,24)
 beam('Temple status pin',(s*.091,-.003,1.804),(s*.093,-.003,1.804),.003,glow,16)
armor('Nose bridge',[(-.009,1.821),(.009,1.821),(.014,1.771),(0,1.762),(-.014,1.771)],-.087,.014,steel,.003)
shell('Mandible & chin',[(1.68,.025,.032,-.003),(1.696,.045,.049,-.003),(1.724,.058,.057,-.003),(1.743,.057,.057,-.003)],ivory,0,(-1.55,1.55),48)
box('Mouth service seam',(0,-.064,1.742),(.042,.006,.003),dark,.001)
# Arms and legs maintain human-scale proportions.
for s,side in [(-1,'L'),(1,'R')]:
 bone='thigh.'+side;x=s*.092
 ellipsoid('Hip ball',(x,0,.984),(.059,.059,.059),steel)
 shell('Upper leg carbon sleeve',[(.57,.035,.036,.018),(.63,.048,.05,.018),(.82,.066,.07,0),(.94,.062,.06,0)],dark,x)
 shell('Quadriceps shaped shell',[(.61,.034,.044,.012),(.67,.054,.065,.012),(.82,.072,.081,0),(.925,.057,.061,0)],ivory,x,(-1.8,1.8),48)
 shell('Hamstring protector',[(.65,.041,.041,.016),(.82,.055,.061,.014),(.91,.05,.052,0)],teal,x,(1.9,4.38),32)
 bone='shin.'+side
 beam('Knee hinge',(x-.045,.018,.554),(x+.045,.018,.554),.039,steel,32)
 ellipsoid('Patella shield',(x,-.038,.56),(.045,.025,.046),teal)
 shell('Tibial housing',[(.15,.026,.03,.018),(.22,.032,.038,.025),(.36,.044,.052,.038),(.49,.038,.042,.03)],dark,x)
 shell('Long tibial ceramic',[(.175,.023,.031,.015),(.24,.034,.041,.02),(.40,.045,.051,.026),(.495,.037,.04,.025)],ivory,x,(-1.65,1.65),48)
 shell('Calf sculpted housing',[(.20,.025,.025,.025),(.31,.041,.050,.036),(.42,.048,.060,.027),(.49,.035,.037,.023)],teal,x,(1.7,4.58),40)
 for dx in [-.032,.032]:
  beam('Achilles piston body',(x+dx,.053,.36),(x+dx,.055,.24),.007,dark)
  beam('Achilles chrome shaft',(x+dx,.055,.24),(x+dx,.04,.13),.004,steel)
 bone='foot.'+side
 ellipsoid('Ankle gimbal',(x,.01,.13),(.03,.032,.032),steel)
 ellipsoid('Heel foot foundation',(x,-.025,.065),(.047,.105,.043),dark)
 ellipsoid('Human foot ceramic upper',(x,-.055,.083),(.046,.103,.033),ivory)
 box('Foot traction sole',(x,-.043,.025),(.092,.22,.025),rubber,.011)
 for j in range(4):box('Toe articulation seam',(x+(j-1.5)*.019,-.135,.058),(.003,.043,.013),dark,.001)
 bone='upper_arm.'+side
 ellipsoid('Spherical shoulder actuator',(s*.222,0,1.487),(.057,.057,.057),steel)
 shell('Deltoid curved cap',[(1.405,.045,.055,0),(1.46,.063,.068,0),(1.515,.061,.061,0),(1.544,.036,.039,0)],ivory,s*.236,(-1.9,1.9),48)
 beam('Humeral chassis',(s*.25,.0,1.43),(s*.29,.012,1.245),.025,dark)
 shell('Upper arm anatomical casing',[(1.25,.029,.033,.008),(1.31,.044,.046,.004),(1.4,.047,.048,0),(1.445,.038,.04,0)],teal,s*.273)
 shell('Bicep ceramic cover',[(1.27,.024,.034,0),(1.34,.040,.048,0),(1.408,.038,.043,0)],ivory,s*.273,(-1.3,1.3),40)
 bone='forearm.'+side
 beam('Elbow axle',(s*.29-.033,.01,1.218),(s*.29+.033,.01,1.218),.031,steel,32)
 beam('Elbow cap',(s*.29+s*.034,.01,1.218),(s*.29+s*.04,.01,1.218),.021,dark)
 shell('Forearm graphite structure',[(.989,.023,.025,-.005),(1.055,.028,.032,0),(1.15,.042,.042,.006),(1.195,.035,.036,.01)],dark,s*.302)
 shell('Forearm ceramic shell',[(1.015,.022,.026,-.006),(1.07,.033,.037,0),(1.155,.043,.043,.005),(1.186,.035,.036,.008)],ivory,s*.302,(-1.9,1.9),48)
 box('Forearm status light',(s*.302,-.044,1.13),(.004,.003,.036),glow,.001)
 beam('Wrist swivel',(s*.307,-.004,.974),(s*.307,-.004,1.0),.021,steel)
 bone='hand.'+side
 # Palm plus five separate articulated digits, relaxed downward pose.
 ellipsoid('Palm chassis',(s*.307,-.009,.938),(.035,.022,.041),dark)
 ellipsoid('Metacarpal shell',(s*.307,-.026,.941),(.031,.008,.034),ivory)
 for j,length in enumerate([.065,.08,.076,.059]):
  xx=s*(.281+j*.018);z=.91
  for k,ratio in enumerate([.44,.32,.24]):
   dz=length*ratio;yy=-.008-k*.006
   ellipsoid('Finger knuckle',(xx,yy,z),(.008,.009,.008),steel)
   beam('Finger phalanx',(xx,yy,z-.006),(xx,yy-.004,z-dz+.004),.007,ivory,16)
   z-=dz
  ellipsoid('Finger contact pad',(xx,-.024,z+.004),(.006,.006,.01),rubber)
 # Opposable thumb, angled inward from palm.
 points=[(s*.276,-.009,.953),(s*.255,-.014,.931),(s*.25,-.028,.905)]
 for k in range(2):
  ellipsoid('Thumb hinge',points[k],(.010,.01,.01),steel);beam('Thumb phalanx',points[k],points[k+1],.009,ivory,16)
# Shorten exposed cervical region while preserving head assembly alignment.
for name,bn in parts.items():
 if bn=='head':bpy.data.objects[name].location.z-=.045
# Rig every body region; cables follow their owning rigid region.
bpy.ops.object.select_all(action='DESELECT');data=bpy.data.armatures.new('AUREL human proportion skeleton');rig=bpy.data.objects.new('AUREL_RIG',data);robot.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={'root':((0,0,0),(0,0,.2),None),'pelvis':((0,0,1),(0,0,1.23),'root'),'chest':((0,0,1.23),(0,0,1.55),'pelvis'),'head':((0,0,1.55),(0,0,1.93),'chest')}
for s,side in [(-1,'L'),(1,'R')]:
 bones['thigh.'+side]=((s*.092,0,.984),(s*.092,.018,.554),'pelvis');bones['shin.'+side]=((s*.092,.018,.554),(s*.092,.01,.13),'thigh.'+side);bones['foot.'+side]=((s*.092,.01,.13),(s*.092,-.1,.05),'shin.'+side)
 bones['upper_arm.'+side]=((s*.222,0,1.487),(s*.29,.01,1.218),'chest');bones['forearm.'+side]=((s*.29,.01,1.218),(s*.307,-.004,.99),'upper_arm.'+side);bones['hand.'+side]=((s*.307,-.004,.99),(s*.307,-.009,.91),'forearm.'+side)
for name,(a,b,parent) in bones.items():
 eb=data.edit_bones.new(name);eb.head=a;eb.tail=b
 if parent:eb.parent=data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
for name,bn in parts.items():
 o=bpy.data.objects[name];world=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone=bn;o.matrix_world=world
# Composed human stance: head turns slightly; hands hang naturally.
for bn,rot in [('head',(0,.10,0)),('upper_arm.L',(.015,0,-.018)),('upper_arm.R',(-.015,0,.018))]:
 rig.pose.bones[bn].rotation_mode='XYZ';rig.pose.bones[bn].rotation_euler=rot
# Still pose is intentional; fingers are modelled articulated parts, not individually rigged yet.
col=studio
stage=material('Studio floor',(.025,.03,.034),.35,.42)
beam('Presentation disk',(0,0,-.04),(0,0,0),.64,dark,96)
box('Studio floor',(0,0,-.07),(200,200,.05),stage,.01)
ring('Fine platform locator',(0,0,.001),.59,.0018,glow,(0,0,0))
def camera(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
hero=camera('01 • Human proportion full body',(2.65,-4.6,2.2),(0,0,.99),66)
close=camera('02 • Face and torso',(.62,-1.8,1.86),(0,-.01,1.58),68)
rear=camera('03 • Rear mechanics',(-2.5,4.2,2.0),(0,0,1.02),65)
def area(name,loc,energy,color,size,target=(0,0,1)):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Soft neutral key',(-2,-3,3.4),280,(.88,.94,1),2.5)
area('Warm fill',(2,-1,2.1),120,(1,.84,.66),2)
area('Rim strip',(1,2,3),350,(.63,.79,1),1.5)
area('Face softbox',(-.4,-1.2,2.4),45,(1,1,1),.8)
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.015,.02,.025,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.3
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.camera=hero
scene['asset']='AUREL / EV03 human-scale android';scene['status']='Poseable rigid body regions; fingers modeled but not individually rigged. No locomotion animation.'
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.color_type='MATERIAL'
bpy.data.texts.load(str(Path(__file__).resolve()))
bpy.ops.wm.save_as_mainfile(filepath=str(P/'robot/EV03_Aurel_Humanoid.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in robot.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(P/'robot/EV03_Aurel_Humanoid.glb'),use_selection=True,export_format='GLB',export_apply=True)
for cam,name in [(hero,'Aurel_humanoid'),(close,'Aurel_face_detail'),(rear,'Aurel_rear')]:
 scene.camera=cam;scene.render.filepath=str(P/'robot'/name);bpy.ops.render.render(write_still=True)
print('HUMANOID_COMPLETE',len(parts),'parts',flush=True)
