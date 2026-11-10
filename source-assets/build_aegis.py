import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
P=Path(__file__).resolve().parent
(P/'robot').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection':bpy.data.collections.remove(c)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
robot=bpy.data.collections.new('EV04 • AEGIS');scene.collection.children.link(robot)
studio=bpy.data.collections.new('STUDIO • presentation only');scene.collection.children.link(studio)
col=robot; parts={}; bone='chest'
def material(name,color,metal=.5,rough=.32,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
ivory=material('01 • ceramic titanium',(.74,.79,.82),.4,.28)
teal=material('02 • cobalt chest armor',(.018,.055,.25),.48,.3)
dark=material('03 • graphite chassis',(.018,.025,.033),.65,.38)
steel=material('04 • brushed actuator steel',(.25,.32,.35),.85,.26)
orange=material('05 • crimson armor',(.64,.022,.035),.4,.3)
yellow=material('10 • golden vent louvers',(.95,.56,.028),.55,.32)
glow=material('06 • amber reactor',(1,.2,.018),.25,.23,5)
cyan=material('07 • emerald optical sensors',(.05,1,.40),.3,.2,3)
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
# Pelvic cradle and layered waist.
bone='pelvis'
armor('Pelvic structural cradle',[(-.72,3.1),(-.88,3.6),(-.58,3.85),(.58,3.85),(.88,3.6),(.72,3.1)],0,.82,dark)
armor('Pelvic front armor',[(-.5,3.65),(.5,3.65),(.38,3.13),(0,2.99),(-.38,3.13)],-.54,.22,teal)
for z,r in [(3.85,.52),(4.02,.48),(4.16,.51)]:
 beam('Waist rotary segment',(0,0,z-.07),(0,0,z+.07),r,steel,32);ring('Waist flexible seal',(0,0,z),r,.05,rubber,(0,0,0))
# Chest keel and separate angular pectoral plates.
bone='chest'
armor('Monocoque torso',[(-.68,4.12),(-1.02,4.8),(-.92,5.48),(-.52,5.72),(.52,5.72),(.92,5.48),(1.02,4.8),(.68,4.12)],.08,1.1,dark,.10)
for s in [-1,1]:
 armor('Floating pectoral plate',[(s*x,z) for x,z in [(.13,5.53),(.85,5.49),(1.04,5.14),(.72,4.83),(.23,5.02)]],-.65,.3,ivory,.07)
 armor('Petrol rib guard',[(s*x,z) for x,z in [(.72,4.9),(1.01,4.8),(.8,4.23),(.37,4.16),(.4,4.48)]],-.53,.32,teal)
 armor('Collar vermilion insert',[(s*x,z) for x,z in [(.17,5.59),(.82,5.57),(.92,5.42),(.25,5.39)]],-.83,.055,orange,.02)
 for i in range(4):
  o=box('Rib radiator fin',(s*(.68+i*.025),-.73,4.38+i*.10),(.33,.10,.045),steel,.01);o.rotation_euler.y=s*-.24
 for x,z in [(s*.84,5.18),(s*.44,5.42),(s*.76,4.4)]:bolt(x,-.84,z)
 # Side torso pistons.
 beam('Torso hydraulic housing',(s*.53,.12,3.78),(s*.8,.12,4.55),.12,dark)
 beam('Torso polished ram',(s*.53,.12,3.78),(s*.86,.12,4.8),.055,steel)
# Inset circular core, surrounded by a mechanical bezel.
beam('Reactor well',(0,-.56,4.82),(0,-.89,4.82),.40,dark,48)
ring('Reactor titanium rim',(0,-.92,4.82),.35,.065,steel)
ring('Reactor luminous annulus',(0,-.962,4.82),.255,.035,glow)
beam('Hexagonal core',(0,-.92,4.82),(0,-1.0,4.82),.18,glow,6)
for i in range(6):
 a=i*math.tau/6;bolt(.35*math.cos(a),-.99,4.82+.35*math.sin(a),.033)
label('ECHO / 04',(-.78,-.831,5.17),.105)
# Backpack radiators and twin thruster nacelles.
for s in [-1,1]:
 box('Rear power nacelle',(s*.66,.8,4.95),(.55,.62,1.43),teal,.12)
 for j in range(6):box('Rear radiator vane',(s*.66,1.14,4.51+j*.16),(.45,.12,.065),steel,.018)
 beam('Vector thruster bell',(s*.66,.88,4.4),(s*.66,.88,4.02),.23,dark)
 ring('Thruster nozzle',(s*.66,.88,4.02),.18,.04,steel,(0,0,0))
 beam('Thruster core',(s*.66,.88,4.03),(s*.66,.88,4.0),.125,cyan)
# Helmet: small, recessed sensor face and winged temple plates.
bone='head'
beam('Neck actuator',(0,0,5.55),(0,0,5.95),.23,steel)
armor('Helmet housing',[(-.42,5.93),(-.5,6.26),(-.32,6.64),(.22,6.7),(.46,6.41),(.42,6.05),(0,5.84)],-.02,.63,ivory,.075)
armor('Visor surround',[(-.37,6.37),(.35,6.37),(.3,6.11),(0,5.99),(-.32,6.12)],-.39,.17,dark,.035)
armor('Continuous optical slit',[(-.32,6.30),(.30,6.30),(.28,6.23),(-.28,6.20)],-.491,.035,cyan,.015)
armor('Helmet brow',[(-.48,6.39),(-.29,6.57),(.22,6.59),(.47,6.4),(.29,6.35),(-.32,6.35)],-.41,.20,ivory,.035)
armor('Chin guard',[(-.22,6.14),(0,6.02),(.22,6.14),(.13,5.96),(-.12,5.96)],-.43,.16,ivory,.03)
for s in [-1,1]:
 beam('Temple rotary sensor',(s*.4,0,6.29),(s*.55,0,6.29),.17,steel)
 beam('Temple amber lens',(s*.55,0,6.29),(s*.58,0,6.29),.075,glow)
beam('Telemetry antenna',(.38,.15,6.45),(.5,.23,7.0),.025,steel)
beam('Antenna tip',(.5,.23,6.98),(.5,.23,7.05),.045,orange)
# Legs: separated thighs, knee cylinders, long shin armor and broad stabilised feet.
for s,side in [(-1,'L'),(1,'R')]:
 x=s*.67;bone='thigh.'+side
 beam('Hip axle',(s*.42,0,3.44),(s*.88,0,3.44),.28,steel)
 beam('Upper leg skeleton',(x,0,3.35),(s*.82,.04,2.29),.20,dark)
 armor('Thigh floating ceramic',[(s*a,z) for a,z in [(.4,3.35),(.84,3.43),(1.01,2.65),(.83,2.36),(.52,2.54)]],-.29,.52,ivory,.075)
 armor('Thigh inset panel',[(s*a,z) for a,z in [(.55,3.18),(.76,3.21),(.85,2.69),(.67,2.61)]],-.574,.035,teal,.02)
 box('Hip skirt plate',(s*.91,-.05,3.38),(.28,.86,.7),teal,.08)
 bone='shin.'+side
 beam('Knee rotary joint',(s*.82-.29,0,2.2),(s*.82+.29,0,2.2),.28,steel)
 ring('Knee outer seal',(s*1.13,0,2.2),.19,.045,rubber,(0,math.pi/2,0))
 armor('Knee shield',[(s*a,z) for a,z in [(.56,2.43),(1.08,2.43),(1.13,2.13),(.84,1.97),(.55,2.14)]],-.38,.3,teal)
 box('Knee identification stripe',(s*.83,-.55,2.25),(.35,.04,.08),orange,.01)
 beam('Shin inner frame',(s*.83,.12,2.05),(s*.86,0,.62),.19,dark)
 armor('Shin blade armor',[(s*a,z) for a,z in [(.55,1.95),(1.09,1.95),(1.17,.78),(.91,.46),(.56,.7)]],-.2,.62,ivory,.06)
 armor('Shin inset dark channel',[(s*a,z) for a,z in [(.73,1.84),(.92,1.86),(.98,.8),(.82,.66)]],-.53,.055,teal,.02)
 box('Shin running light',(s*.82,-.577,1.36),(.065,.035,.66),glow,.012)
 for yy in [.17,.39]:
  beam('Leg hydraulic body',(s*1.14,yy,1.8),(s*1.14,yy,1.15),.09,dark)
  beam('Leg hydraulic ram',(s*1.14,yy,1.18),(s*1.14,yy,.63),.045,steel)
 bone='foot.'+side
 beam('Ankle spindle',(s*.86-.22,0,.56),(s*.86+.22,0,.56),.20,steel)
 box('Traction sole',(s*.86,-.22,.16),(.8,1.46,.28),rubber,.08)
 armor('Armored foot',[(s*a,z) for a,z in [(.46,.25),(.5,.48),(.77,.67),(1.15,.55),(1.26,.26)]],-.32,1.5,orange,.075)
 box('Toe ceramic bumper',(s*.86,-1.08,.34),(.79,.30,.32),orange,.045)
 for j in [-1,0,1]:box('Toe grip segment',(s*.86+j*.21,-1.08,.21),(.13,.055,.19),steel,.012)
# Arms: shoulder pauldrons, exposed elbows, left hand and right arm cannon.
for s,side in [(-1,'L'),(1,'R')]:
 bone='upper_arm.'+side
 beam('Shoulder axle',(s*.9,0,5.29),(s*1.50,0,5.29),.31,steel)
 ring('Shoulder seal',(s*1.37,0,5.29),.30,.055,rubber,(0,math.pi/2,0))
 armor('Angular shoulder pauldron',[(s*a,z) for a,z in [(1.05,5.58),(1.39,5.90),(2.16,5.77),(2.32,5.17),(1.79,4.98),(1.22,5.2)]],0,1.05,ivory,.085)
 armor('Shoulder petrol inset',[(s*a,z) for a,z in [(1.36,5.66),(1.88,5.48),(1.89,5.27),(1.43,5.34)]],-.55,.06,teal,.025)
 for j in range(3):box('Shoulder vent',(s*(1.47+j*.13),-.6,5.42-j*.04),(.055,.04,.17),dark,.01)
 armor('Shoulder safety patch',[(s*a,z) for a,z in [(1.86,5.54),(1.98,5.49),(2.02,5.2),(1.89,5.24)]],-.56,.07,orange,.02)
 beam('Upper arm actuator',(s*1.54,0,5.04),(s*1.7,-.03,4.36),.17,dark)
 box('Bicep armor',(s*1.65,-.14,4.69),(.48,.63,.62),ivory,.08)
 bone='forearm.'+side
 beam('Elbow rotary joint',(s*1.7-.22,-.02,4.2),(s*1.7+.22,-.02,4.2),.23,steel)
 if side=='L':
  armor('Left forearm shell',[(-1.42,4.03),(-1.94,4.09),(-2.04,3.32),(-1.67,3.13),(-1.41,3.36)],-.18,.63,teal)
  armor('Forearm shield',[(-1.49,4.08),(-2.05,4.22),(-2.27,3.77),(-2.06,3.12),(-1.54,3.28)],-.59,.22,ivory,.06)
  box('Forearm power indicator',(-1.89,-.72,3.72),(.065,.04,.52),glow,.01)
  bone='hand.L';box('Left palm',(-1.73,-.18,2.95),(.44,.38,.36),dark)
  for j in range(4):
   x=-1.92+j*.12;box('Armored finger knuckle',(x,-.41,2.96),(.105,.16,.19),steel,.025);box('Curled finger',(x,-.35,2.8),(.105,.21,.18),dark,.025)
  box('Thumb',(-1.45,-.26,2.95),(.17,.25,.24),steel,.035)
 else:
  # Forward-facing integrated coil accelerator, compact enough for cave traversal.
  box('Cannon receiver',(1.72,-.22,3.75),(.75,1.05,.89),teal,.12)
  beam('Accelerator barrel',(1.72,-.62,3.76),(1.72,-2.0,3.76),.25,dark,32)
  for yy in [-.72,-1.02,-1.32,-1.62]:
   ring('Accelerator coil',(1.72,yy,3.76),.27,.05,steel);ring('Coil flux light',(1.72,yy-.055,3.76),.235,.018,cyan)
  for xx in [1.39,2.05]:box('Barrel floating shroud',(xx,-1.3,3.76),(.15,1.55,.56),ivory,.045)
  box('Upper cannon rail',(1.72,-1.28,4.09),(.30,1.65,.10),dark,.02)
  beam('Muzzle shroud',(1.72,-1.98,3.76),(1.72,-2.15,3.76),.31,steel,8)
  beam('Recessed muzzle',(1.72,-2.155,3.76),(1.72,-2.17,3.76),.22,dark,32)
  beam('Muzzle lens',(1.72,-2.175,3.76),(1.72,-2.18,3.76),.12,cyan,32)
  label('ION / 07',(1.42,-.76,3.55),.10)
# Mecha silhouette overhaul: V-fin helmet, vented chest, skirt armor and tall shield.
for o in list(robot.objects):
 if any(o.name.startswith(prefix) for prefix in ['Reactor','Hexagonal core','Telemetry antenna','Antenna tip','Forearm shield','Forearm power indicator','Continuous optical slit','Helmet brow','Chin guard','Floating pectoral plate','Collar vermilion insert']):
  parts.pop(o.name,None);bpy.data.objects.remove(o,do_unlink=True)
# Purposeful stepped chest with a blue breastplate and twin gold intake vents.
bone='chest'
armor('Blue chest breastplate',[(-1.02,5.4),(-.73,5.64),(.73,5.64),(1.02,5.4),(.81,4.94),(.31,4.83),(-.31,4.83),(-.81,4.94)],-.69,.31,teal,.065)
armor('Central red chest keystone',[(-.22,5.56),(.22,5.56),(.30,5.24),(0,5.08),(-.30,5.24)],-.9,.15,orange,.035)
for s in [-1,1]:
 armor('Chest vent recess',[(s*a,z) for a,z in [(.36,5.47),(.86,5.42),(.77,5.06),(.34,5.12)]],-.9,.10,dark,.025)
 for j in range(4):
  o=box('Gold chest intake louver',(s*.59,-.975,5.14+j*.075),(.36,.09,.045),yellow,.008);o.rotation_euler.y=s*.12
 armor('Chest lower white rim',[(s*a,z) for a,z in [(.31,4.98),(.83,5.08),(.84,4.92),(.4,4.74)]],-.79,.16,ivory,.025)
# Red abdomen under layered chest.
bone='pelvis'
armor('Red abdominal reactor casing',[(-.39,4.14),(.39,4.14),(.43,3.77),(-.43,3.77)],-.47,.28,orange,.04)
armor('Central waist buckle',[(-.27,3.77),(.27,3.77),(.30,3.4),(0,3.26),(-.30,3.4)],-.69,.25,orange,.04)
box('Waist gold insignia',(0,-.83,3.58),(.20,.03,.15),yellow,.01)
for s in [-1,1]:
 armor('Front articulated skirt plate',[(s*a,z) for a,z in [(.3,3.65),(.76,3.73),(.99,2.99),(.50,2.87),(.31,3.05)]],-.59,.32,ivory,.055)
 armor('Skirt recessed panel',[(s*a,z) for a,z in [(.4,3.5),(.68,3.55),(.77,3.19),(.48,3.12)]],-.77,.035,teal,.018)
 armor('Lateral hip flare',[(s*a,z) for a,z in [(.78,3.67),(1.02,3.7),(1.36,3.1),(1.02,2.99),(.91,3.21)]],.08,.8,ivory,.04)
# Helm: brow, split eyes, mouth guard and unmistakable V-shaped antenna.
bone='head'
armor('Angular brow ridge',[(-.47,6.43),(-.28,6.59),(.28,6.59),(.47,6.43),(.3,6.35),(-.3,6.35)],-.43,.21,ivory,.025)
for s in [-1,1]:
 armor('Emerald eye',[(s*a,z) for a,z in [(.04,6.35),(.30,6.34),(.27,6.27),(.05,6.28)]],-.501,.035,cyan,.009)
 armor('Swept cheek guard',[(s*a,z) for a,z in [(.31,6.38),(.49,6.4),(.52,5.96),(.34,5.87),(.26,6.12)]],-.30,.32,ivory,.025)
 armor('Primary gold V-fin',[(s*a,z) for a,z in [(.05,6.49),(.18,6.46),(.94,7.14),(.82,7.1)]],-.49,.07,yellow,.012)
 armor('Secondary white V-fin',[(s*a,z) for a,z in [(.13,6.50),(.22,6.47),(.63,6.95),(.55,6.94)]],-.38,.08,ivory,.01)
armor('Forehead crest',[(-.10,6.74),(.10,6.74),(.13,6.45),(0,6.36),(-.13,6.45)],-.49,.16,orange,.02)
box('Forehead camera',(0,-.588,6.65),(.1,.025,.09),cyan,.01)
armor('Vented mouth mask',[(-.25,6.25),(.25,6.25),(.20,6.03),(0,5.97),(-.20,6.03)],-.46,.19,ivory,.025)
for s in [-1,1]:
 for j in range(2):
  o=box('Faceplate ventilation slit',(s*(.065+j*.065),-.565,6.12),(.022,.015,.10),dark,.003);o.rotation_euler.y=s*.15
armor('Crimson chin',[(-.10,6.04),(.10,6.04),(.08,5.87),(-.08,5.87)],-.49,.19,orange,.015)
# Extended ankle armor and red toe blocks.
for s,side in [(-1,'L'),(1,'R')]:
 bone='shin.'+side
 armor('Lower shin flare',[(s*a,z) for a,z in [(.51,1.15),(1.14,1.15),(1.32,.58),(.98,.45),(.48,.61)]],-.24,.76,ivory,.05)
 bone='foot.'+side
 armor('Red armored toe',[(s*a,z) for a,z in [(.44,.19),(.47,.46),(1.17,.46),(1.28,.18)]],-.89,.60,orange,.035)
# Shield mounted to left forearm; central recesses and sharp tapered silhouette.
bone='forearm.L'
armor('Shield structural backing',[(-2.70,4.48),(-1.90,4.48),(-1.67,4.18),(-1.74,2.5),(-2.29,2.03),(-2.82,2.5),(-2.90,4.18)],-.83,.21,dark,.045)
armor('Shield white perimeter',[(-2.68,4.43),(-1.94,4.43),(-1.72,4.16),(-1.79,2.53),(-2.29,2.1),(-2.77,2.53),(-2.85,4.16)],-.98,.15,ivory,.035)
armor('Shield red face',[(-2.58,4.29),(-2.03,4.29),(-1.87,4.08),(-1.92,2.65),(-2.29,2.3),(-2.64,2.65),(-2.70,4.08)],-1.08,.13,orange,.025)
box('Shield viewport',(-2.29,-1.16,4.05),(.39,.045,.16),dark,.02)
box('Shield vertical insignia',(-2.29,-1.17,3.37),(.095,.045,.89),yellow,.01)
box('Shield horizontal insignia',(-2.29,-1.17,3.58),(.49,.045,.095),yellow,.01)
# Beam saber handles rising behind both shoulders.
bone='chest'
for s in [-1,1]:
 beam('Backpack saber mount',(s*.70,.78,5.20),(s*.80,.84,5.72),.12,dark)
 beam('Beam saber hilt',(s*.79,.84,5.65),(s*.95,.91,6.34),.075,ivory)
 for j in range(4):
  x=s*(.81+j*.025);z=5.75+j*.11
  ring('Saber grip collar',(x,.85+j*.012,z),.077,.012,steel,(0,0,0))
 beam('Saber emitter',(s*.95,.91,6.32),(s*.97,.92,6.41),.09,steel)
# Finish stencil.
label('AEGIS',(-.36,-.94,5.6),.075)
# Rigid mechanical armature: parts are bone-parented, not deforming armor.
bpy.ops.object.select_all(action='DESELECT');data=bpy.data.armatures.new('AEGIS skeleton');rig=bpy.data.objects.new('AEGIS_RIG',data);robot.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={'root':((0,0,0),(0,0,1),None),'pelvis':((0,0,3.4),(0,0,4),'root'),'chest':((0,0,4),(0,0,5.6),'pelvis'),'head':((0,0,5.6),(0,0,6.6),'chest')}
for s,side in [(-1,'L'),(1,'R')]:
 bones['thigh.'+side]=((s*.67,0,3.4),(s*.82,0,2.2),'pelvis');bones['shin.'+side]=((s*.82,0,2.2),(s*.86,0,.56),'thigh.'+side);bones['foot.'+side]=((s*.86,0,.56),(s*.86,-.8,.25),'shin.'+side)
 bones['upper_arm.'+side]=((s*1.35,0,5.3),(s*1.7,0,4.2),'chest');bones['forearm.'+side]=((s*1.7,0,4.2),(s*1.73,-.2,3.1),'upper_arm.'+side)
bones['hand.L']=((-1.73,-.2,3.1),(-1.73,-.2,2.7),'forearm.L')
for name,(a,b,parent) in bones.items():
 eb=data.edit_bones.new(name);eb.head=a;eb.tail=b
 if parent:eb.parent=data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
for name,bn in parts.items():
 o=bpy.data.objects[name];world=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone=bn;o.matrix_world=world
for frame,angle in [(1,0),(45,.012),(90,0)]:
 for bn,axis,value in [('chest',0,angle),('head',1,-angle*.6),('forearm.L',0,angle*.6)]:
  pb=rig.pose.bones[bn];pb.rotation_mode='XYZ';pb.rotation_euler[axis]=value;pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=bn)
rig.animation_data.action.name='AEGIS • reactor idle';scene.frame_end=90;scene.frame_set(1)
# Studio turntable with typography and industrial floor accents.
col=studio
beam('Display platform',(0,0,-.30),(0,0,-.03),3.4,dark,96)
ring('Platform amber ring',(0,0,-.025),3.15,.018,glow,(0,0,0))
box('Infinite studio floor',(0,0,-.42),(200,200,.2),material('Studio charcoal',(.016,.024,.033),.15,.55),.01)
label('E V – 0 4   /   A E G I S',(-2.15,-3.05,.01),.17)
# The pedestal text faces the front camera.
def camera(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
hero=camera('01 • Hero',(10,-17,8.5),(0,0,3.5),55)
rear=camera('02 • Rear engineering',(-10,15,8),(0,0,3.5),56)
close=camera('03 • Torso detail',(-6,-10,7.5),(0,-.1,5.1),70)
def area(name,loc,energy,color,size,target=(0,0,3.5)):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-5,-7,11),2400,(1,.86,.71),7)
area('Cool broad fill',(6,-4,6),1900,(.42,.72,1),6)
area('Amber rear rim',(4,5,8),3000,(1,.39,.12),4)
area('White shoulder rim',(-4,3,10),2500,(.7,.87,1),4)
scene.world.color=(.12,.12,.12);scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1300;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.camera=hero
scene['asset']='ECHO-9 EV-04 AEGIS';scene['stage']='Poseable robot art asset. Idle animation included; combat and locomotion animation not yet authored.'
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.color_type='MATERIAL'
bpy.data.texts.load(str(Path(__file__).resolve()))
bpy.ops.wm.save_as_mainfile(filepath=str(P/'robot/EV04_Aegis.blend'))
# Export only robot, armature and rigid animation; presentation stage stays out.
bpy.ops.object.select_all(action='DESELECT')
for o in robot.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(P/'robot/EV04_Aegis.glb'),use_selection=True,export_format='GLB',export_apply=True)
(P/'robot/aegis_asset_info.json').write_text(json.dumps({'name':'EV04 Aegis armored mecha','bone_count':len(data.bones),'parts':len(parts),'height_m':7.1,'forward':'-Y','up':'Z','animation':'90-frame mechanical idle','notes':'New design; original EV01 and map preserved. Text stencils may require conversion for engine use.'},indent=2))
for cam,name in [(hero,'Aegis_hero'),(rear,'Aegis_rear'),(close,'Aegis_detail')]:
 scene.camera=cam;scene.render.filepath=str(P/'robot'/name);bpy.ops.render.render(write_still=True)
print('ROBOT_BUILD_COMPLETE',len(parts),'parts',flush=True)
