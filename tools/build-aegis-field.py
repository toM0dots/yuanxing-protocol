"""EV-04 FIELD / grounded expedition chassis. Original editable Blender geometry.

Preserves the AEGIS gameplay joints and sockets, replaces every visible armor part.
Blender --background --threads 2 --python tools/build-aegis-field.py [-- --export-only]
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector, Matrix

P=Path(__file__).resolve().parents[1]
ART=P/'art/aegis-v4'; OUT=P/'dist/assets/aegis-v4'
REVIEW=P.parent/'output/grounded-models-v74'
for d in [ART,OUT,REVIEW]:d.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
robot=bpy.data.collections.new('EV-04 FIELD / editable manufactured components');scene.collection.children.link(robot)
studio=bpy.data.collections.new('STUDIO / not exported');scene.collection.children.link(studio)
parts={};joint='chest'

def mat(name,color,metal,rough,emit=0):
 m=bpy.data.materials.new('Field_'+name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m

paint=mat('Paint',(.115,.140,.106),.12,.75)
edgepaint=mat('Edge',(.195,.218,.184),.18,.69)
frame=mat('Frame',(.035,.043,.045),.45,.62)
steel=mat('Steel',(.14,.165,.17),.72,.46)
seal=mat('Seal',(.014,.019,.021),.02,.86)
oxide=mat('Oxide',(.34,.13,.047),.22,.76)
status=mat('Status',(.42,.18,.025),.1,.48,.65)
optics=mat('Optics',(.008,.028,.034),.2,.23,.06)

def put(o,name,m):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 robot.objects.link(o);o.data.materials.append(m);parts[o.name]=joint;return o

def bevel(o,w=.035,segments=2):
 if w:
  b=o.modifiers.new('Machined edge radius','BEVEL');b.width=w;b.segments=segments
  n=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o

def mesh(name,verts,faces,m,w=.035):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 return bevel(put(bpy.data.objects.new(name,me),name,m),w)

def box(name,p,size,m,w=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=put(bpy.context.object,name,m);o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bevel(o,w)

def beam(name,a,b,r,m,sides=16,r2=None):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(a+b)/2)
 o=put(bpy.context.object,name,m);o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return bevel(o,min(.012,r*.08),1)

def ring(name,p,r,t,m,axis='Y'):
 rot={'Y':(math.pi/2,0,0),'X':(0,math.pi/2,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=24,minor_segments=6,location=p,rotation=rot)
 o=put(bpy.context.object,name,m)
 for f in o.data.polygons:f.use_smooth=True
 return o

def hose(name,points,r=.035,m=seal):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=r;curve.bevel_resolution=2
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for b,p in zip(spline.bezier_points,points):b.co=p;b.handle_left_type=b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);robot.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);o.data.materials.append(m);parts[o.name]=joint;return o

def loft(name,sections,m,w=.035):
 verts=[]
 for z,cx,cy,sx,sy in sections:
  for x,y in [(-.72,-1),(.72,-1),(1,-.72),(1,.72),(.72,1),(-.72,1),(-1,.72),(-1,-.72)]:verts.append((cx+x*sx/2,cy+y*sy/2,z))
 n=len(sections);faces=[tuple(reversed(range(8))),tuple(range((n-1)*8,n*8))]
 for j in range(n-1):
  for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 return mesh(name,verts,faces,m,w)

def plate(name,outline,y,depth,m,w=.025):
 n=len(outline);verts=[(x,y,z) for x,z in outline]+[(x,y+depth,z) for x,z in outline]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,verts,faces,m,w)

def mirror(points,s):return [(s*x,z) for x,z in points]

def bolt(name,p,axis='Y',r=.028):
 v=Vector(p);d=Vector({'Y':(0,-.018,0),'X':(.018,0,0),'Z':(0,0,.018)}[axis]);return beam(name,v,v+d,r,steel,6)

def scuff(name,p,length=.12,width=.014,angle=0,back=False):
 # Real sparse chipped-paint facets at contact edges, not broad noise over armor.
 x,y,z=p;c=math.cos(angle);s=math.sin(angle)
 outline=[(-.5,0),(-.25,.38),(.27,.21),(.5,0),(.14,-.26),(-.38,-.16)]
 verts=[(x+c*a*length-s*b*width,y,z+s*a*length+c*b*width) for a,b in outline]
 # X/Z polygon order points +Y; front surfaces face -Y.
 faces=[tuple(range(6)) if back else tuple(reversed(range(6)))]
 return mesh(name+' / worn contact edge',verts,faces,steel,0)

def frontpanel(name,p,size,m=paint):
 x,y,z=p;sx,sy,sz=size
 box(name+' / recessed gasket',(x,y+.012,z),(sx+.018,sy+.018,sz+.015),seal,min(.025,sz*.06))
 box(name,p,size,m,min(.045,sz*.10))
 for dx in [-sx*.37,sx*.37]:
  for dz in [-sz*.34,sz*.34]:bolt(name+' / captive fastener',(x+dx,y-sy/2-.006,z+dz))
 if m in [paint,edgepaint]:
  side=-1 if x<0 else 1
  scuff(name,(x+side*sx*.43,y-sy/2-.002,z-.06*sz),min(sz*.35,.16),.025,math.pi/2+.1*side)
  scuff(name,(x-side*sx*.12,y-sy/2-.002,z-sz*.42),min(sx*.28,.13),.018,.045*side)

def stencil(name,text,p,size=.105,m=edgepaint):
 curve=bpy.data.curves.new(name,'FONT');curve.body=text;curve.size=size;curve.extrude=.0008;curve.space_character=1.15
 o=bpy.data.objects.new(name,curve);robot.objects.link(o);o.location=p;o.rotation_euler=(math.pi/2,0,0)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);o.data.materials.append(m);parts[o.name]=joint;return o

# The central structure carries weight; armor ends at real bearing clearances.
joint='pelvis'
loft('Forged pelvic yoke',[(3.55,0,.02,1.12,.72),(3.82,0,.02,1.32,.86),(4.04,0,.02,1.19,.82)],frame)
frontpanel('Lower abdomen service cover',(0,-.49,3.86),(.77,.14,.32),paint)
for z,r in [(4.08,.38),(4.20,.36),(4.33,.38)]:
 beam('Axial waist bearing',(0,0,z-.04),(0,0,z+.04),r,steel,24)
 ring('Waist dust labyrinth',(0,0,z),r,.024,seal,'Z')
for s,side in [(-1,'L'),(1,'R')]:
 joint='skirt.'+side
 plate('Hinged thigh debris guard',mirror([(.34,4.00),(.87,4.00),(1.02,3.73),(.93,3.38),(.43,3.37),(.32,3.60)],s),-.49,.19,paint,.048)
 frontpanel('Debris guard latch',(s*.65,-.606,3.68),(.28,.045,.20),edgepaint)
 joint='pelvis'
 beam('Abdomen actuator sleeve',(s*.41,.18,3.94),(s*.52,.18,4.38),.095,frame)
 beam('Abdomen actuator rod',(s*.52,.18,4.36),(s*.57,.18,4.59),.043,steel)
 hose('Protected waist harness',[(s*.46,.34,4.02),(s*.58,.44,4.19),(s*.60,.38,4.47)],.037)

# Deep, load-bearing thorax: blunt compound plates, service closures and ribs.
joint='chest'
loft('Ribbed thoracic monocoque',[(4.33,0,.06,1.08,.77),(4.63,0,.04,1.58,1.02),(5.18,0,.06,2.00,1.20),(5.55,0,.08,1.90,1.08),(5.73,0,.10,1.28,.86)],frame,.07)
for s in [-1,1]:
 plate('Compound chest shell',mirror([(.075,5.59),(.70,5.61),(.98,5.40),(.94,5.04),(.70,4.88),(.11,4.94)],s),-.60,.24,paint,.065)
 if s<0:
  frontpanel('Left chest removable service tile',(s*.46,-.743,5.27),(.61,.026,.32),paint)
 else:
  box('Chest respirator recess',(s*.46,-.744,5.27),(.57,.025,.27),seal,.022)
  for k in range(6):box('Chest intake protective louver',(s*.46,-.773,5.17+k*.041),(.51,.035,.017),steel,.005)
 bolt('Upper chest closure',(s*.75,-.70,5.45),r=.038)
 scuff('Chest upper rim',(s*.55,-.603,5.562),.19,.024,.055*s)
 scuff('Chest lower rim',(s*.46,-.603,4.945),.14,.026,-.035*s)
 for i in range(4):box('Protected lower rib louver',(s*.64,-.52,4.63+i*.063),(.40,.10,.028),steel,.006)
 beam('Collar bearing support',(s*.36,.03,5.50),(s*.87,.03,5.50),.13,steel)
 frontpanel('Lower chest access cover',(s*.36,-.46,4.68),(.48,.10,.25),paint)
 hose('Side conduit',[(s*.89,.17,4.65),(s*1.02,.20,4.95),(s*.96,.30,5.24)],.045)
 for z in [4.84,5.00,5.16]:box('Side rib casting',(s*.94,.12,z),(.15,.56,.06),steel,.012)
frontpanel('Central diagnostics module',(0,-.66,5.23),(.13,.10,.42),frame)
for z in [5.34,5.25,5.16]:box('Small diagnostic indicator',(0,-.721,z),(.039,.009,.021),status,.003)
box('Chest inspection paint stripe',(-.56,-.791,5.26),(.045,.006,.24),oxide,.003)
stencil('Chest service identification','EV 04',(-.65,-.765,5.27),.10)
stencil('Chest maintenance serial','K-09',(-.63,-.766,5.13),.059)
for s in [-1,1]:
 hose('Chest guard handle',[(s*.73,-.69,5.49),(s*.75,-.78,5.54),(s*.88,-.78,5.49),(s*.89,-.66,5.43)],.023,steel)

# Rear silhouette: recessed heat exchangers and vectored propulsion, no wings.
frontpanel('Spinal power cover',(0,.62,5.11),(.40,.19,.95),frame)
for s in [-1,1]:
 loft('Backpack heat exchanger pod',[(4.43,s*.57,.74,.49,.56),(4.63,s*.61,.82,.68,.65),(5.41,s*.61,.82,.66,.63),(5.68,s*.58,.74,.50,.49)],paint,.055)
 box('Radiator aperture',(s*.61,1.15,5.12),(.49,.065,.57),seal,.035)
 for i in range(7):box('Radiator slat',(s*.61,1.198,4.91+i*.067),(.43,.045,.027),steel,.007)
 for z in [4.71,5.55]:bolt('Backpack captive bolt',(s*.60,1.08,z),r=.034)
 scuff('Backpack rear wear',(s*.77,1.139,5.36),.17,.026,math.pi/2,True)
 hose('Backpack armoured feed',[(s*.30,.55,4.61),(s*.36,.79,4.48),(s*.53,.90,4.51)],.055)
 beam('Gimbal thruster shroud',(s*.53,.77,4.62),(s*.53,.86,4.30),.26,frame,24,r2=.20)
 ring('Thruster heat ring',(s*.53,.86,4.31),.174,.029,steel,'Z')
 beam('Thruster throat',(s*.53,.86,4.315),(s*.53,.86,4.30),.12,seal,20)
 box('Recovery lifting bracket',(s*.78,.79,5.64),(.12,.28,.18),steel,.025)

# Small optical turret sunk into a protective collar. No face, crest or ears.
joint='head'
beam('Neck servo',(0,0,5.60),(0,0,5.85),.23,frame,24)
ring('Neck weather seal',(0,0,5.80),.235,.035,seal,'Z')
loft('Sensor turret casting',[(5.82,0,.02,.57,.50),(5.94,0,.01,.73,.65),(6.28,0,.035,.76,.66),(6.40,0,.07,.61,.54)],paint,.045)
frontpanel('Optics recessed cassette',(0,-.332,6.12),(.58,.065,.24),seal)
for x,z,r in [(-.125,6.15,.055),(.125,6.15,.035),(.125,6.02,.018)]:
 beam('Sensor barrel',(x,-.36,z),(x,-.405,z),r+.021,steel,24)
 beam('Recessed optical glass',(x,-.408,z),(x,-.414,z),r,optics,24)
box('Sensor armored brow',(0,-.36,6.31),(.68,.16,.075),paint,.018)
for s in [-1,1]:
 beam('Sensor tilt trunnion',(s*.32,.02,6.10),(s*.42,.02,6.10),.12,frame,24)
 ring('Trunnion outer seal',(s*.425,.02,6.10),.082,.015,steel,'X')
for z in [6.03,6.13,6.23]:box('Turret rear cooling slot',(0,.355,z),(.37,.055,.025),seal,.008)
beam('Short communications mast',(.24,.18,6.35),(.25,.20,6.57),.017,frame,10)
box('Sensor mast base',(.24,.18,6.35),(.10,.09,.055),steel,.012)

# Structural legs, forked joint yokes, actual ram sleeves and fixed hoses.
for s,side in [(-1,'L'),(1,'R')]:
 joint='thigh.'+side;x=s*.62
 beam('Hip rotary drive',(s*.35,0,3.78),(s*.91,0,3.78),.27,frame,24)
 ring('Hip rotary seal',(s*.91,0,3.78),.21,.032,seal,'X')
 loft('Femur forged section',[(2.52,s*.73,.035,.40,.45),(3.06,s*.66,.03,.56,.58),(3.60,s*.62,.015,.56,.55)],frame)
 plate('Thigh service armor',mirror([(.36,3.51),(.83,3.54),(.98,3.26),(.94,2.72),(.80,2.57),(.47,2.61),(.38,2.85)],s),-.35,.19,paint,.045)
 frontpanel('Thigh service hatch',(s*.66,-.464,3.12),(.31,.06,.44),edgepaint)
 beam('Thigh ram sleeve',(s*.70,.32,3.50),(s*.73,.34,2.98),.095,frame)
 beam('Thigh ram rod',(s*.73,.34,2.98),(s*.76,.30,2.55),.043,steel)
 hose('Thigh hydraulic line',[(s*.87,.16,3.40),(s*.98,.20,3.02),(s*.93,.12,2.69)],.030)
 joint='shin.'+side
 beam('Knee drive drum',(s*.74-.28,0,2.29),(s*.74+.28,0,2.29),.28,frame,24)
 for ss in [-1,1]:
  beam('Knee bearing cover',(s*.74+ss*.25,0,2.29),(s*.74+ss*.31,0,2.29),.22,steel,24)
  ring('Knee labyrinth seal',(s*.74+ss*.32,0,2.29),.17,.026,seal,'X')
  for a in range(4):bolt('Knee service fastener',(s*.74+ss*.33,math.sin(a*math.pi/2)*.16,2.29+math.cos(a*math.pi/2)*.16),'X',.022)
 frontpanel('Blunt knee impact pad',(s*.74,-.31,2.29),(.43,.16,.33),edgepaint)
 loft('Calf load frame',[(.56,s*.80,.07,.40,.42),(.87,s*.80,.08,.63,.61),(1.77,s*.77,.08,.65,.67),(2.05,s*.74,.05,.49,.49)],frame)
 plate('Calf compound armor',mirror([(.49,1.99),(.93,1.99),(1.08,1.73),(1.07,.93),(.94,.67),(.64,.64),(.49,.85)],s),-.34,.20,paint,.047)
 frontpanel('Calf removable hatch',(s*.79,-.456,1.39),(.37,.07,.67),edgepaint)
 box('Calf identification stripe',(s*.79,-.501,1.49),(.32,.009,.07),oxide,.008)
 for yy in [.27,.40]:
  beam('Calf ram sleeve',(s*.97,yy,1.84),(s*.99,yy,1.25),.078,frame)
  beam('Calf polished ram rod',(s*.99,yy,1.28),(s*1.01,yy,.64),.034,steel)
 hose('Calf flex cable',[(s*.53,.28,1.89),(s*.45,.36,1.36),(s*.54,.30,.80)],.031)
 for k in range(4):box('Rear calf cooling rib',(s*.79,.43,1.17+k*.12),(.44,.08,.033),steel,.009)
 joint='foot.'+side
 beam('Ankle load axle',(s*.80-.19,0,.52),(s*.80+.19,0,.52),.16,steel)
 # Sole extents retain v3's support footprint exactly: x ±.30, y -1.225..+.535.
 loft('Replaceable traction sole',[(.025,s*.8,-.43,.55,1.40),(.10,s*.8,-.43,.60,1.42)],seal,.018)
 loft('Ankle bridge',[(.12,s*.80,-.30,.55,1.11),(.28,s*.80,-.30,.58,1.13),(.48,s*.80,-.12,.43,.66),(.60,s*.80,.01,.31,.40)],paint,.04)
 for dx in [-.14,.14]:
  box('Separated front toe', (s*.80+dx,-.91,.21),(.255,.53,.24),edgepaint,.035)
  box('Toe traction lug',(s*.80+dx,-1.20,.12),(.19,.05,.10),steel,.007)
  scuff('Toe contact scar',(s*.80+dx,-1.177,.23),.145,.028,.08)
 box('Heel stabilizer',(s*.80,.37,.16),(.31,.33,.19),frame,.025)
 for yy in [-.72,-.42,-.12]:box('Sole side tread',(s*1.082,yy,.10),(.029,.105,.11),seal,.005)

# Compact pauldrons and useful manipulators. Forearms have tool mounting rails.
for s,side in [(-1,'L'),(1,'R')]:
 joint='upper_arm.'+side
 beam('Shoulder rotary axle',(s*.80,0,5.35),(s*1.48,0,5.35),.27,steel,24)
 ring('Shoulder dust seal',(s*1.30,0,5.35),.26,.035,seal,'X')
 joint='shoulder.'+side
 loft('Compact shoulder cap',[(5.02,s*1.48,.02,.62,.76),(5.31,s*1.52,.015,.82,.86),(5.68,s*1.45,.015,.77,.77),(5.82,s*1.38,.03,.55,.58)],paint,.075)
 frontpanel('Shoulder wear panel',(s*1.48,-.46,5.40),(.48,.075,.33),edgepaint)
 box('Shoulder unit band',(s*1.48,-.506,5.42),(.41,.009,.06),oxide,.008)
 if side=='L':stencil('Shoulder unit serial','04',(s*1.48-.08,-.507,5.46),.13)
 for k in range(3):box('Shoulder rear intake',(s*1.46,.435,5.30+k*.10),(.41,.055,.035),seal,.009)
 joint='upper_arm.'+side
 loft('Upper arm structural casing',[(4.52,s*1.57,.02,.39,.47),(4.96,s*1.48,.00,.50,.55),(5.18,s*1.41,0,.47,.47)],frame)
 frontpanel('Upper arm plate',(s*1.52,-.30,4.83),(.36,.13,.49),paint)
 beam('Biceps actuator sleeve',(s*1.76,.06,4.56),(s*1.67,.07,4.93),.071,frame)
 beam('Biceps actuator rod',(s*1.67,.07,4.93),(s*1.62,.05,5.11),.035,steel)
 joint='forearm.'+side
 beam('Elbow rotary axle',(s*1.6-.25,0,4.30),(s*1.6+.25,0,4.30),.22,frame,24)
 for ss in [-1,1]:ring('Elbow bearing lip',(s*1.6+ss*.25,0,4.30),.15,.024,steel,'X')
 loft('Forearm forged tool cradle',[(3.37,s*1.73,-.08,.36,.40),(3.69,s*1.70,-.07,.58,.62),(4.03,s*1.63,-.025,.52,.55),(4.15,s*1.62,0,.39,.40)],frame)
 frontpanel('Forearm service cover',(s*1.69,-.40,3.76),(.42,.15,.57),paint)
 hose('Forearm armored hose',[(s*1.87,.10,4.05),(s*2.01,.13,3.85),(s*1.93,.10,3.52)],.03)
 box('Forearm tool attachment rail',(s*1.98,-.04,3.77),(.08,.29,.54),steel,.018)
 joint='hand.'+side
 box('Palm housing',(s*1.73,-.1,3.17),(.32,.31,.33),frame,.04)
 frontpanel('Back of hand plate',(s*1.73,.07,3.18),(.27,.06,.24),paint)
 for i in range(4):
  x=s*1.73-.135+i*.09
  beam('Finger knuckle',(x-.035,-.27,3.15),(x+.035,-.27,3.15),.043,steel,10)
  box('Finger proximal',(x,-.29,3.07),(.075,.13,.17),edgepaint,.016)
  box('Finger gripping pad',(x,-.22,2.96),(.07,.17,.12),seal,.016)
 beam('Opposable thumb',(s*1.91,-.08,3.25),(s*1.94,-.24,3.10),.065,steel,12)
 if side=='R':
  joint='forearm.R'
  box('Accelerator wrist cradle',(1.73,-.42,3.50),(.41,.35,.35),frame,.035)
  box('Accelerator receiver',(1.73,-.78,3.51),(.45,.65,.43),paint,.045)
  beam('Recessed accelerator barrel',(1.73,-.91,3.51),(1.73,-2.27,3.51),.12,frame,24)
  for yy in [-1.06,-1.37,-1.68,-1.97]:ring('Barrel support collar',(1.73,yy,3.51),.145,.025,steel)
  for ss in [-1,1]:box('Barrel protective rail',(1.73+ss*.17,-1.60,3.51),(.10,1.30,.28),edgepaint,.025)
  for yy in [-1.17,-1.39,-1.61,-1.83]:box('Barrel upper cooling rib',(1.73,yy,3.68),(.25,.07,.038),frame,.007)
  beam('Muzzle collar',(1.73,-2.18,3.51),(1.73,-2.28,3.51),.155,steel,16)
  beam('Muzzle dark aperture',(1.73,-2.285,3.51),(1.73,-2.30,3.51),.105,seal,20)
  beam('Muzzle inner emitter',(1.73,-2.305,3.51),(1.73,-2.31,3.51),.035,optics,16)

# Gameplay bones are deliberately unchanged: same IK lengths and weapon sockets.
bones={'root':((0,0,0),None),'pelvis':((0,0,3.78),'root'),'chest':((0,0,4.4),'pelvis'),'head':((0,0,5.78),'chest')}
for s,side in [(-1,'L'),(1,'R')]:
 bones.update({'thigh.'+side:((s*.62,0,3.78),'pelvis'),'shin.'+side:((s*.74,0,2.29),'thigh.'+side),'foot.'+side:((s*.8,0,.52),'shin.'+side),'upper_arm.'+side:((s*1.30,0,5.35),'chest'),'forearm.'+side:((s*1.6,0,4.30),'upper_arm.'+side),'hand.'+side:((s*1.73,-.1,3.32),'forearm.'+side)})
for s,side in [(-1,'L'),(1,'R')]:
 bones['shoulder.'+side]=((s*1.30,0,5.35),'chest');bones['skirt.'+side]=((s*.62,-.28,3.98),'pelvis')
source_joints={}
for name,(p,parent) in bones.items():
 o=bpy.data.objects.new('Rig_'+name,None);robot.objects.link(o);o.empty_display_type='SPHERE';o.empty_display_size=.08;o.parent=source_joints.get(parent);o.matrix_world=Matrix.Translation(Vector(p));source_joints[name]=o;bpy.context.view_layer.update()
for name,bone in parts.items():
 o=bpy.data.objects[name];world=o.matrix_world.copy();o.parent=source_joints[bone];o.matrix_world=world

export=bpy.data.collections.new('GAME EXPORT / hidden in studio');scene.collection.children.link(export)
root=bpy.data.objects.new('AEGIS_Field',None);export.objects.link(root);joints={};facing=Matrix.Rotation(math.pi,4,'Z');deps=bpy.context.evaluated_depsgraph_get()
for name,(p,parent) in bones.items():
 o=bpy.data.objects.new('Aegis_'+name.replace('.','_'),None);export.objects.link(o);o.parent=joints.get(parent,root);o.matrix_world=Matrix.Translation(facing@Vector(p));joints[name]=o;bpy.context.view_layer.update()
for name in bones:
 batch=[]
 for objname,bone in parts.items():
  if bone!=name:continue
  src=bpy.data.objects[objname];me=bpy.data.meshes.new_from_object(src.evaluated_get(deps),depsgraph=deps);me.transform(facing@src.matrix_world);me.update()
  uv=me.uv_layers.new(name='UVMap') if not me.uv_layers else me.uv_layers.active
  for poly in me.polygons:
   axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
   for li in poly.loop_indices:
    p=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p[axes[0]]/1.6,p[axes[1]]/1.6)
  ob=bpy.data.objects.new(objname+'_export',me);export.objects.link(ob);batch.append(ob)
 if not batch:continue
 bpy.ops.object.select_all(action='DESELECT')
 for ob in batch:ob.select_set(True)
 bpy.context.view_layer.objects.active=batch[0];bpy.ops.object.join();ob=bpy.context.object;ob.name='Armor_'+name.replace('.','_');world=ob.matrix_world.copy();ob.parent=joints[name];ob.matrix_world=world
for name,bone,p in [('Muzzle','forearm.R',(1.73,-2.33,3.51)),('Jet_L','chest',(-.53,.86,4.30)),('Jet_R','chest',(.53,.86,4.30))]:
 ob=bpy.data.objects.new('Aegis_'+name,None);export.objects.link(ob);ob.parent=joints[bone];ob.matrix_world=Matrix.Translation(facing@Vector(p));bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in export.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'EV04_Aegis_Field.glb'),use_selection=True,export_format='GLB',export_apply=True,export_animations=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in export.objects if o.type=='MESH')
for o in export.objects:o.hide_render=True;o.hide_set(True)

# Studio uses the same physical UV density and CC0 surface signal as the game.
for name in parts:
 ob=bpy.data.objects[name];me=ob.data;uv=me.uv_layers.active or me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
  for li in poly.loop_indices:
   p=ob.matrix_world@me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p[axes[0]]/1.6,p[axes[1]]/1.6)
normal_image=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-normal.jpg'));normal_image.colorspace_settings.name='Non-Color';normal_image.pack()
rough_image=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-rough.jpg'));rough_image.colorspace_settings.name='Non-Color';rough_image.pack()
color_image=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-color.jpg'));color_image.pack()
for m in [paint,edgepaint,frame,steel,oxide]:
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF')
 nt=n.new('ShaderNodeTexImage');nt.image=normal_image;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.16;l.new(nt.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 rt=n.new('ShaderNodeTexImage');rt.image=rough_image;mix=n.new('ShaderNodeMath');mix.operation='MULTIPLY_ADD';mix.inputs[1].default_value=.25;mix.inputs[2].default_value=.55;l.new(rt.outputs['Color'],mix.inputs[0]);l.new(mix.outputs[0],bs.inputs['Roughness'])
 ct=n.new('ShaderNodeTexImage');ct.image=color_image;bw=n.new('ShaderNodeRGBToBW');l.new(ct.outputs['Color'],bw.inputs[0]);ramp=n.new('ShaderNodeValToRGB');base=m.diffuse_color
 ramp.color_ramp.elements[0].position=.05;ramp.color_ramp.elements[0].color=(*[v*.58 for v in base[:3]],1)
 ramp.color_ramp.elements[1].position=.70;ramp.color_ramp.elements[1].color=(*[min(1,v*1.12) for v in base[:3]],1)
 l.new(bw.outputs[0],ramp.inputs[0]);l.new(ramp.outputs[0],bs.inputs['Base Color'])

def studio_obj(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 studio.objects.link(o);return o
bpy.ops.mesh.primitive_plane_add(size=200);floor=studio_obj(bpy.context.object);floor.name='Studio ground';floor.data.materials.append(mat('StudioFloor',(.065,.075,.077),.05,.85))
def camera(name,p,target,lens=64):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
hero=camera('01 / Field front three-quarter',(9.0,-15,7.2),(0,0,3.25),63)
rear=camera('02 / Rear engineering',(-9,15,7.2),(0,0,3.25),63)
for name,p,energy,color,size in [('Broad warm key',(-6,-7,10),2100,(1,.91,.80),6),('Neutral fill',(6,-3,6),1500,(.73,.85,1),5),('Rear softbox',(2,5,8),2400,(.86,.93,1),5)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,3.5))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('Neutral overcast studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.19,.23,.26,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.45
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.camera=hero
scene['design']='EV-04 FIELD: grounded expedition chassis, compact optical turret, blunt cast armor, visible service access, load-bearing limbs, radiator backpack. Original authored geometry.'
scene['materials']='Eight shared runtime material families. Existing Poly Haven CC0 color/normal/roughness maps supplied by runtime, no bitmap duplication in GLB.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'EV04_Aegis_Field.blend'))
(OUT/'provenance.json').write_text(json.dumps({'design':'EV-04 AEGIS Field','revision':'v4: newly authored grounded expedition chassis; all visible v3 armor replaced','source':'art/aegis-v4/EV04_Aegis_Field.blend','generator':'tools/build-aegis-field.py','reference':'Original design for the requested realistic expedition style; not a third-party model','parts':len(parts),'triangles':triangles,'joints':len(joints),'materials':8,'forward':'-Z','up':'+Y','rig':'Unchanged Aegis joint transforms, forearm muzzle and chest jet sockets; sole footprint preserved','textures':{'source':'https://polyhaven.com/a/blue_metal_plate','license':'CC0-1.0','maps':'../hangar-v1/panel-color.jpg + panel-normal-rough.png','credit':'Powered by Poly Haven'}},indent=2))
print('FIELD_ASSET_EXPORTED',len(parts),triangles,flush=True)
for cam,name in ([] if '--export-only' in sys.argv else [(hero,'robot-field-front'),(rear,'robot-field-rear')]):
 scene.camera=cam;scene.render.filepath=str(REVIEW/(name+'.png'));bpy.ops.render.render(write_still=True)
print('FIELD_COMPLETE',flush=True)
