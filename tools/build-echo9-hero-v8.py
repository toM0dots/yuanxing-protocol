"""ECHO-9 hero v8 / smooth sculpted armour. Original editable Blender geometry.

Rebuilt from the v7 builder: same palette, crest helmet, chest chevron, crimson
knees, thruster pack and arm cannon, but the armour is continuous curved shells
over a smooth undersuit, with bolts, hoses, exposed hydraulics, radiator fins and
tactical pouches removed. Gameplay joints, sockets and leg lengths are unchanged.
Blender --background --threads 2 --python tools/build-echo9-hero-v8.py [-- --export-only]
Set HERO_REVIEW to a folder to write the two studio review renders there.
"""
import bpy, bmesh, math, json, sys, os
from pathlib import Path
from mathutils import Vector, Matrix

P=Path(__file__).resolve().parents[1]
ART=P/'art/echo9-hero-v8'; OUT=P/'dist/assets/echo9-hero-v8'
REVIEW=Path(os.environ.get('HERO_REVIEW',str(ART/'review')))
for d in [ART,OUT,REVIEW]:d.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
robot=bpy.data.collections.new('EV-04 VANGUARD / editable engineered mobile-suit components');scene.collection.children.link(robot)
studio=bpy.data.collections.new('STUDIO / not exported');scene.collection.children.link(studio)
parts={};joint='chest'

def mat(name,color,metal,rough,emit=0):
 m=bpy.data.materials.new('Vanguard_'+name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m

ivory=mat('Armor',(.028,.115,.34),.32,.43)
pearl=mat('Edge',(.69,.68,.58),.24,.47)
navy=mat('Navy',(.012,.025,.054),.40,.46)
frame=mat('Frame',(.022,.029,.034),.64,.46)
steel=mat('Steel',(.21,.255,.28),.83,.34)
seal=mat('Seal',(.009,.014,.016),.04,.76)
red=mat('Red',(.47,.032,.025),.30,.45)
gold=mat('Gold',(.47,.32,.105),.60,.42)
optics=mat('Optics',(.018,.36,.39),.25,.25,1.3)
marking=mat('Marking',(.71,.73,.64),.06,.66)
paint=ivory;edgepaint=pearl;oxide=red;status=optics

def put(o,name,m):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 robot.objects.link(o);o.data.materials.append(m);parts[o.name]=joint;return o

def smooth(o,levels=0):
 # Sculpted armour: smooth shading weighted by face area keeps each plate's
 # broad face clean and rolls light softly over its narrow return edges.
 for f in o.data.polygons:f.use_smooth=True
 if levels:
  m=o.modifiers.new('Sculpted surface','SUBSURF');m.levels=levels;m.render_levels=levels;m.quality=2
 n=o.modifiers.new('Area-weighted normals','WEIGHTED_NORMAL');n.mode='FACE_AREA';n.keep_sharp=False
 return o

def bevel(o,w=.035,segments=3):
 if w:
  b=o.modifiers.new('Rounded edge radius','BEVEL');b.width=w*1.6;b.segments=segments;b.limit_method='ANGLE'
  for f in o.data.polygons:f.use_smooth=True
  n=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');n.keep_sharp=False
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
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=24,minor_segments=5,location=p,rotation=rot)
 o=put(bpy.context.object,name,m)
 for f in o.data.polygons:f.use_smooth=True
 return o

def hose(name,points,r=.035,m=seal):
 return None

def tube(name,points,r=.035,m=seal):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=6;curve.bevel_depth=r;curve.bevel_resolution=2
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
 return None
 v=Vector(p);d=Vector({'Y':(0,-.018,0),'X':(.018,0,0),'Z':(0,0,.018)}[axis]);return beam(name,v,v+d,r,steel,6)

def scuff(name,p,length=.12,width=.014,angle=0,back=False):
 return None
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

# Compound molded armor: independently curved face, manufactured return lip,
# backed by a dark edge seal. These are not extruded rectangular panels.
def contour(points,steps=2):
 # v8: two corner-cutting passes give each plate softly rounded corners while
 # its long edges stay straight, so plates read as sculpted, not angular.
 pts=[Vector(p) for p in points]
 for k in range(2):
  n=len(pts);out=[]
  for i in range(n):
   a,b=pts[i],pts[(i+1)%n];out.append(a.lerp(b,.2));out.append(a.lerp(b,.8))
  pts=out
 return [tuple(p) for p in pts]

def shell(name,outline,y,depth,m=ivory,dome=.07,seam=True):
 dome=dome*1.15
 pts=contour(outline,3);n=len(pts);cx=sum(x for x,z in pts)/n;cz=sum(z for x,z in pts)/n
 if seam:
  seal_object=shell(name+' / inset perimeter gasket',[(cx+(x-cx)*1.028,cz+(z-cz)*1.025) for x,z in outline],y+.025,depth+.016,seal,dome,False)
 rings=[(1,y+.014),(.984,y),(.92,y-.025),(.65,y-dome*.72),(.25,y-dome*.97)]
 vs=[]
 for r,yy in rings:
  for x,z in pts:vs.append((cx+(x-cx)*r,yy,cz+(z-cz)*r))
 vs.append((cx,y-dome,cz));center=len(vs)-1
 back=len(vs)
 for x,z in pts:vs.append((x,y+depth,z))
 vs.append((cx,y+depth,cz));backcenter=len(vs)-1
 fs=[]
 for ringid in range(len(rings)-1):
  for i in range(n):fs.append((ringid*n+i,ringid*n+(i+1)%n,(ringid+1)*n+(i+1)%n,(ringid+1)*n+i))
 for i in range(n):fs.append(((len(rings)-1)*n+i,(len(rings)-1)*n+(i+1)%n,center));fs.append((i,back+i,back+(i+1)%n,(i+1)%n));fs.append((back+i,backcenter,back+(i+1)%n))
 ob=mesh(name,vs,fs,m,0)
 if seam:ob['seal_object']=seal_object.name
 # Hard-normal break at each narrow chamfer/return; primary face stays planar.
 if m in (seal,):
  for f in ob.data.polygons:f.use_smooth=True
 else:smooth(ob,0)
 return ob

def bodyform(name,sections,m,roundness=3.3,segments=24):
 roundness=2.25+(roundness-2.25)*.35;segments=max(segments,40)
 vs=[]
 for z,cx,cy,w,d in sections:
  for i in range(segments):
   a=i*math.tau/segments;co=math.cos(a);si=math.sin(a)
   vs.append((cx+math.copysign(abs(co)**(2/roundness),co)*w/2,cy+math.copysign(abs(si)**(2/roundness),si)*d/2,z))
 fs=[];n=len(sections)
 for k in range(n-1):
  for i in range(segments):fs.append((k*segments+i,k*segments+(i+1)%segments,(k+1)*segments+(i+1)%segments,(k+1)*segments+i))
 fs.extend([tuple(reversed(range(segments))),tuple(range((n-1)*segments,n*segments))])
 ob=mesh(name,vs,fs,m,0)
 return smooth(ob,0)

def inset(name,p,w,h,rows=6,accent=gold):
 x,y,z=p;outline=[(x-w*.5,z-h*.4),(x-w*.39,z+h*.5),(x+w*.45,z+h*.46),(x+w*.5,z-h*.5)]
 shell(name+' / smooth recess',[(x+(a-x)*.9,z+(b-z)*.85) for a,b in outline],y-.02,.03,seal,.004,False)

def flange(name,p,r,axis='X',teeth=8):
 # Smooth domed joint cap with one thin pearl ring, in place of a bolted bearing.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=14,radius=r*.92,location=p)
 o=put(bpy.context.object,name+' / domed joint cap',navy)
 o.scale={'X':(.42,1,1),'Y':(1,.42,1),'Z':(1,1,.42)}[axis];bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 ring(name+' / pearl cap ring',p,r*.80,r*.05,pearl,axis)
 return o

def ram(name,a,b,r=.07):
 return None
 a,b=Vector(a),Vector(b);delta=b-a
 beam(name+' / cylinder body',a,a+delta*.58,r,frame,24)
 beam(name+' / polished piston',a+delta*.48,b,r*.44,steel,20)
 for point in [a,a+delta*.56,b]:beam(name+' / end gland',point-delta.normalized()*.025,point+delta.normalized()*.025,r*1.18,steel,20)

def trace(name,points,r=.012,m=frame):return tube(name,points,r,m)

def screwline(name,pts):
 return None

# Inner pelvis carries a narrow waist. Separate overlapping skirts articulate.
joint='pelvis'
bodyform('Pelvis / cast central load bearing',[ (3.55,0,.03,.90,.58),(3.70,0,.03,1.12,.70),(3.92,0,.03,1.10,.71),(4.03,0,.03,.78,.62)],frame)
shell('Pelvis / central red cockpit keel',[(-.19,4.02),(.19,4.02),(.28,3.82),(.18,3.55),(0,3.44),(-.20,3.56),(-.29,3.82)],-.43,.16,red,.08)
bodyform('Waist / tapered undersuit abdomen',[(3.98,0,.04,.80,.58),(4.12,0,.04,.66,.52),(4.30,0,.05,.70,.55),(4.50,0,.06,.90,.66)],navy,2.6,40)
for s,side in [(-1,'L'),(1,'R')]:
 ram('Waist / angled suspension',(s*.26,.12,3.97),(s*.45,.13,4.63),.08)
 hose('Waist / hydraulic loop',[(s*.34,.26,4.03),(s*.51,.34,4.20),(s*.55,.28,4.45)],.043)
 joint='skirt.'+side
 shell('Hip / broad split forward skirt',mirror([(.29,4.02),(.71,4.01),(.94,3.72),(.87,3.38),(.55,3.24),(.34,3.52)],s),-.40,.20,ivory,.085)
 shell('Hip / inset secondary skirt section',mirror([(.41,3.84),(.70,3.84),(.81,3.66),(.76,3.46),(.56,3.34),(.43,3.57)],s),-.50,.055,pearl,.04,False)
 shell('Hip / swept side guard',mirror([(.77,4.04),(1.00,3.98),(1.18,3.61),(1.02,3.34),(.85,3.55)],s),-.05,.47,navy,.08)
 inset('Hip / pressure relief',(s*.58,-.58,3.65),.20,.15,3,steel)
 joint='pelvis'
 bodyform('Hip / rear cuisse cover',[(3.49,s*.63,.36,.46,.23),(3.62,s*.66,.39,.59,.28),(3.95,s*.58,.35,.50,.26)],ivory)

# A broad tapered chest, navy structural housing, divided ivory pectorals.
joint='chest'
bodyform('Thorax / cast structural torso',[(4.34,0,.06,.87,.69),(4.56,0,.05,1.16,.87),(4.86,0,.06,1.65,1.07),(5.30,0,.08,1.90,1.16),(5.52,0,.10,1.73,1.05),(5.66,0,.10,1.23,.79)],ivory,3.8,24)
for s in [-1,1]:
 shell('Thorax / swept white breastplate',mirror([(.075,5.53),(.48,5.67),(.80,5.56),(1.01,5.32),(.88,5.13),(.53,5.12),(.13,5.26)],s),-.56,.18,ivory,.12)
 shell('Thorax / inset shoulder collar panel',mirror([(.18,5.53),(.50,5.61),(.75,5.50),(.78,5.42),(.47,5.47),(.21,5.39)],s),-.67,.025,pearl,.028,False)
 inset('Thorax / recessed heat exhaust',(s*.58,-.67,5.15),.44,.31,6,gold)
 shell('Thorax / lower floating rib armor',mirror([(.26,4.98),(.77,5.02),(.76,4.78),(.58,4.53),(.34,4.48),(.33,4.73)],s),-.45,.15,ivory,.07)
 for i in range(3):
  shell('Thorax / overlapping abdominal lamella',mirror([(.15,4.64+i*.14),(.37,4.67+i*.14),(.44,4.57+i*.14),(.18,4.52+i*.14)],s),-.46-i*.018,.04,steel,.015,False)
 trace('Thorax / curved panel seam',[(s*.24,-.66,5.49),(s*.44,-.70,5.52),(s*.71,-.68,5.44)],.010)
 screwline('Thorax / service fastener',[(s*.24,-.69,5.44),(s*.85,-.61,5.34),(s*.53,-.54,4.66)])
 ram('Thorax / side waist bracing',(s*.47,.10,4.47),(s*.79,.17,4.94),.065)
 hose('Thorax / braided power line',[(s*.73,.34,4.58),(s*.94,.42,4.88),(s*.88,.37,5.15)],.052)
 for z in [4.76,4.91,5.06]:
  box('Thorax / side cast cooling fin',(s*.92,.12,z),(.15,.52,.042),steel,.009)
shell('Thorax / central angular breastbone',[(-.15,5.45),(.15,5.45),(.24,5.26),(.17,5.02),(0,4.86),(-.17,5.02),(-.24,5.26)],-.65,.18,navy,.09)
shell('Thorax / shielded red cockpit plate',[(-.10,5.32),(.10,5.32),(.15,5.15),(0,4.99),(-.15,5.15)],-.78,.05,red,.045)
box('Thorax / subdued status bar',(0,-.835,5.25),(.08,.012,.025),optics,.004)
stencil('Thorax / maintenance number','E-09',(-.85,-.645,5.36),.072,frame)
for s in [-1,1]:
 beam('Collar / neck support strut',(s*.24,.02,5.44),(s*.47,.02,5.68),.085,steel,20)
 shell('Collar / raised protective lip',mirror([(.24,5.55),(.57,5.67),(.66,5.79),(.32,5.75)],s),-.20,.55,pearl,.04)

# ECHO-9 v7 helmet: enclosed compound shell, swept central crest and short
# backward temple fins. Anatomical right is +X in the editable source.
joint='head'
bodyform('Head / smooth undersuit neck',[(5.57,0,.04,.40,.40),(5.78,0,.03,.34,.36),(5.98,0,.03,.36,.38)],navy,2.4,32)
bodyform('Head / cobalt enclosed helmet',[(5.96,0,.025,.39,.44),(6.12,0,.04,.62,.60),(6.37,0,.05,.72,.69),(6.59,0,.13,.62,.63),(6.72,0,.20,.34,.40)],ivory,2.6,32)
shell('Head / recessed visor', [(-.30,6.42),(.30,6.42),(.26,6.19),(0,6.10),(-.26,6.19)],-.35,.10,seal,.035,False)
for sign in [-1,1]:
 shell('Head / ivory winged brow',mirror([(.02,6.43),(.22,6.51),(.37,6.47),(.31,6.35),(.08,6.31)],sign),-.39,.07,pearl,.04)
 shell('Head / cyan optical slit',mirror([(.035,6.32),(.25,6.37),(.22,6.29),(.05,6.27)],sign),-.455,.014,optics,.005,False)
 shell('Head / angular cheek mask',mirror([(.12,6.24),(.28,6.31),(.35,6.19),(.25,6.02),(.10,5.99)],sign),-.34,.16,pearl,.055)
 flange('Head / brass ear actuator',(sign*.37,.07,6.33),.145,'X',8)
 # Thin 3D swept blade: begins above the eye and runs back along the helmet.
 verts=[(sign*x,y,z) for x,y,z in [(.27,-.30,6.48),(.36,-.25,6.44),(.49,.43,6.78),(.32,.17,6.53)]]
 verts += [(x+sign*.036,y,z) for x,y,z in verts]
 mesh('Head / swept ivory temple fin',verts,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],pearl,.006)
 trace('Head / crimson temple stripe',[(sign*.32,-.23,6.47),(sign*.39,.05,6.59),(sign*.44,.29,6.70)],.022,red)
 for k in range(3):box('Head / jaw cooling slot',(sign*.23,-.43,6.11+k*.035),(.045,.012,.012),frame,.002)
shell('Head / ivory faceplate',[(-.09,6.25),(0,6.30),(.09,6.25),(.11,6.10),(0,5.98),(-.11,6.10)],-.46,.08,pearl,.055)
for sign in [-1,1]:trace('Head / mask seam',[(sign*.035,-.51,6.23),(sign*.06,-.52,6.12),(sign*.025,-.49,6.04)],.009,frame)
# Raised central crest wraps over the crown rather than a front-only V-fin.
profile=[(-.39,6.46),(-.36,6.66),(-.20,6.80),(.12,6.88),(.48,6.87),(.31,6.76),(-.07,6.69),(-.25,6.47)]
vs=[(x,y,z) for x in [-.065,.065] for y,z in profile];n=len(profile)
mesh('Head / swept crimson crown crest',vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],red,.015)
for yy,zz in [(-.19,6.80),(.03,6.86),(.24,6.87)]:box('Head / crest panel separation',(0,yy,zz),(.135,.017,.016),frame,.003)
for z in [6.18,6.26,6.34]:box('Head / rear thermal grille',(0,.395,z),(.30,.025,.024),frame,.005)

# Rear silhouette includes segmented propulsion pods and a densely articulated spine.
joint='chest'
bodyform('Back / central power spine',[(4.54,0,.60,.32,.28),(4.82,0,.66,.49,.34),(5.50,0,.65,.47,.31),(5.69,0,.57,.32,.25)],frame)
for z in [4.73,4.88,5.03,5.18,5.33]:
 box('Back / independent spine bridge',(0,.89,z),(.37,.08,.055),steel,.012)
for s in [-1,1]:
 bodyform('Back / vector thruster load housing',[(4.31,s*.56,.77,.37,.53),(4.51,s*.59,.83,.62,.72),(5.13,s*.62,.85,.66,.73),(5.63,s*.58,.75,.52,.60),(5.80,s*.51,.64,.33,.39)],navy,2.9,28)
 # rear shell is genuinely reversed so sculpted outer face faces the camera.
 ob=shell('Back / long white pod cover',mirror([(.35,5.65),(.72,5.65),(.91,5.36),(.86,4.75),(.61,4.52),(.37,4.78)],s),-1.15,.13,frame,.075)
 for vert in ob.data.vertices:vert.co.y=-vert.co.y
 # shell gasket partner also reverses.
 gasket=bpy.data.objects.get(ob.get('seal_object',''))
 if gasket:
  for vert in gasket.data.vertices:vert.co.y=-vert.co.y
 for i in range(6):box('Back / exposed heat exchanger rib',(s*.60,1.19,4.86+i*.096),(.36,.063,.039),steel,.008)
 beam('Back / gimbaled thruster',(s*.53,.77,4.65),(s*.53,.86,4.30),.25,frame,32,r2=.19)
 for z,r in [(4.40,.20),(4.32,.17)]:ring('Back / concentric nozzle rim',(s*.53,.86,z),r,.022,gold,'Z')
 beam('Back / nozzle deep throat',(s*.53,.86,4.33),(s*.53,.86,4.305),.125,seal,24)
 beam('Back / core ignition lens',(s*.53,.86,4.307),(s*.53,.86,4.299),.055,optics,24)
 hose('Back / shielded power hose',[(s*.33,.57,4.56),(s*.35,.85,4.36),(s*.53,1.00,4.48)],.052)
 ram('Back / trim actuator',(s*.79,.58,4.60),(s*.78,.64,5.39),.055)
 beam('Back / communications mast',(s*.75,.66,5.74),(s*.82,.69,6.28),.013,steel,12)
# Long interlocking legs. Thigh and calf have compound sweeps and filled frame,
# with joints visible only in intentional articulation gaps.
for s,side in [(-1,'L'),(1,'R')]:
 joint='thigh.'+side
 beam('Leg / hip drive',(s*.34,0,3.78),(s*.89,0,3.78),.255,frame,32)
 flange('Leg / hip outer bearing',(s*.91,0,3.78),.23,'X')
 bodyform('Leg / internal femur',[(2.54,s*.73,.02,.38,.41),(2.87,s*.70,.05,.49,.49),(3.35,s*.64,.03,.53,.52),(3.58,s*.62,.02,.43,.45)],frame,2.7,24)
 bodyform('Leg / thigh curved main armor',[(2.68,s*.73,-.02,.40,.49),(2.90,s*.72,-.015,.57,.59),(3.26,s*.65,.02,.63,.64),(3.56,s*.62,.025,.55,.55)],ivory,3,28)
 shell('Leg / thigh independent forward armor',mirror([(.39,3.52),(.77,3.57),(.91,3.29),(.96,2.93),(.75,2.63),(.53,2.75),(.43,3.09)],s),-.31,.12,ivory,.075)
 shell('Leg / thigh inset ceramic panel',mirror([(.48,3.42),(.75,3.47),(.82,3.20),(.83,2.93),(.73,2.77),(.60,2.86)],s),-.425,.035,pearl,.028,False)
 trace('Leg / thigh service seam',[(s*.55,-.436,3.38),(s*.65,-.457,3.09),(s*.74,-.446,2.86)],.010)
 ram('Leg / rear femur hydraulic',(s*.73,.33,3.47),(s*.77,.32,2.55),.079)
 hose('Leg / lateral actuator harness',[(s*.88,.11,3.51),(s*1.00,.17,3.15),(s*.94,.10,2.82)],.033)
 screwline('Leg / femur closure',[(s*.49,-.394,3.40),(s*.81,-.411,3.17),(s*.74,-.401,2.84)])
 joint='shin.'+side
 beam('Leg / knee load bearing axle',(s*.74-.29,0,2.29),(s*.74+.29,0,2.29),.26,frame,32)
 for ss in [-1,1]:flange('Leg / knee concentric service hub',(s*.74+ss*.30,0,2.29),.23,'X')
 shell('Leg / articulated angular knee guard',mirror([(.51,2.44),(.71,2.61),(.91,2.48),(.99,2.25),(.81,2.04),(.60,2.13)],s),-.30,.20,red,.10)
 bodyform('Leg / smooth undersuit knee sleeve',[(1.98,s*.74,.05,.46,.48),(2.28,s*.74,.03,.54,.56),(2.62,s*.73,.02,.50,.52)],navy,2.4,40)
 shell('Leg / knee red service inset',mirror([(.67,2.44),(.78,2.48),(.86,2.35),(.77,2.27),(.68,2.31)],s),-.437,.025,red,.022,False)
 bodyform('Leg / hollow tibia substructure',[(.59,s*.80,.07,.37,.46),(.90,s*.80,.10,.55,.58),(1.49,s*.78,.11,.58,.62),(1.93,s*.75,.06,.49,.49),(2.10,s*.74,.04,.34,.39)],frame,2.7,24)
 bodyform('Leg / wrapped calf shell',[(.66,s*.80,.12,.42,.48),(.94,s*.83,.15,.68,.67),(1.43,s*.82,.17,.74,.74),(1.83,s*.77,.10,.60,.60),(2.03,s*.74,.06,.43,.44)],ivory,2.8,32)
 shell('Leg / sweeping central greave',mirror([(.51,1.96),(.79,2.09),(.99,1.83),(1.09,1.34),(.98,.82),(.80,.58),(.60,.78),(.52,1.22)],s),-.35,.13,ivory,.13)
 shell('Leg / independent raised greave insert',mirror([(.63,1.89),(.78,1.98),(.88,1.77),(.97,1.35),(.87,.90),(.77,.74),(.69,.90)],s),-.508,.028,pearl,.035,False)
 trace('Leg / greave folded seam',[(s*.63,-.485,1.84),(s*.65,-.543,1.39),(s*.73,-.493,.88)],.010)
 inset('Leg / shin ventilation',(s*.79,-.516,1.09),.22,.23,4,steel)
 shell('Leg / outer ankle fairing',mirror([(.99,1.21),(1.12,1.33),(1.22,.97),(1.12,.62),(.98,.59)],s),-.06,.40,navy,.045)
 for yy in [.30,.43]:ram('Leg / twin calf actuator',(s*.98,yy,1.85),(s*1.00,yy,.66),.072)
 hose('Leg / calf flexible line',[(s*.54,.27,1.88),(s*.44,.36,1.42),(s*.55,.29,.78)],.032)
 for i in range(5):box('Leg / rear calf radiator',(s*.79,.53,1.10+i*.13),(.43,.065,.035),steel,.010)
 stencil('Leg / shin unit marking','09',(s*.79-.085,-.545,1.53),.12,frame)
 screwline('Leg / greave fastener',[(s*.58,-.415,1.89),(s*.98,-.408,1.43),(s*.85,-.419,.75)])
 joint='foot.'+side
 beam('Foot / articulated ankle axle',(s*.80-.20,0,.52),(s*.80+.20,0,.52),.16,steel,28)
 for ss in [-1,1]:flange('Foot / ankle hub',(s*.80+ss*.22,0,.52),.13,'X',6)
 # The same sole extrema as earlier versions keep planted IK support exact.
 loft('Foot / dark rubber traction sole',[(.025,s*.80,-.43,.55,1.40),(.10,s*.80,-.43,.60,1.42)],seal,.012)
 bodyform('Foot / red lower wedge',[(.11,s*.80,-.42,.59,1.40),(.20,s*.80,-.43,.60,1.40),(.32,s*.80,-.37,.56,1.23),(.40,s*.80,-.17,.43,.74)],red,3.2,28)
 bodyform('Foot / upper articulated instep',[(.25,s*.80,-.34,.51,1.02),(.36,s*.80,-.28,.52,.97),(.51,s*.80,-.08,.39,.57),(.62,s*.80,.01,.29,.35)],ivory,2.7,24)
 shell('Foot / layered toe cap',mirror([(.55,.20),(.59,.33),(.71,.40),(.91,.38),(1.06,.27),(1.04,.16),(.66,.15)],s),-1.12,.11,ivory,.045)
 for dx in [-.15,0,.15]:
  box('Foot / separate toe tread',(s*.80+dx,-1.20,.12),(.09,.05,.10),steel,.007)
  scuff('Foot / contact edge wear',(s*.80+dx,-1.178,.235),.08,.011,.13)
 box('Foot / heel stabilizer',(s*.80,.37,.16),(.31,.33,.19),frame,.025)
 for yy in [-.80,-.55,-.30]:
  box('Foot / side traction lug',(s*1.087,yy,.10),(.026,.11,.10),seal,.005)

# Shoulder armor is broad and layered, while the elbow and wrist retain exposed
# concentric drives. No square blocks stand in for the upper-arm silhouette.
for s,side in [(-1,'L'),(1,'R')]:
 joint='upper_arm.'+side
 beam('Arm / structural shoulder axle',(s*.79,0,5.35),(s*1.47,0,5.35),.26,frame,32)
 flange('Arm / shoulder servo face',(s*1.44,0,5.35),.24,'X')
 joint='shoulder.'+side
 bodyform('Shoulder / rounded underlying pauldron',[(5.18,s*1.46,.02,.64,.68),(5.44,s*1.50,.03,.96,.95),(5.74,s*1.46,.04,1.04,.87),(5.96,s*1.36,.05,.70,.64)],navy,3.6,28)
 shell('Shoulder / compound upper armor',mirror([(1.00,5.70),(1.24,5.99),(1.54,6.03),(1.94,5.86),(2.02,5.57),(1.81,5.43),(1.44,5.57),(1.17,5.47)],s),-.39,.62,ivory,.12)
 shell('Shoulder / independent upper panel',mirror([(1.21,5.86),(1.44,5.95),(1.73,5.85),(1.85,5.69),(1.73,5.61),(1.44,5.73)],s),-.53,.035,pearl,.038,False)
 shell('Shoulder / overlapping outer guard',mirror([(1.70,5.58),(1.99,5.60),(2.08,5.36),(1.98,5.12),(1.73,5.03),(1.62,5.25)],s),-.25,.45,ivory,.075)
 shell('Shoulder / red identification plate',mirror([(1.83,5.48),(1.96,5.46),(2.00,5.30),(1.88,5.22),(1.78,5.26)],s),-.355,.027,red,.015,False)
 inset('Shoulder / dark recessed intake',(s*1.46,-.525,5.49),.30,.18,4,steel)
 screwline('Shoulder / panel locking bolt',[(s*1.15,-.47,5.73),(s*1.88,-.45,5.68),(s*1.83,-.36,5.15)])
 if side=='L':stencil('Shoulder / serial stencil','E-09',(s*1.62-.13,-.574,5.76),.09,frame)
 for k in range(4):box('Shoulder / back radiator vane',(s*1.49,.50,5.38+k*.095),(.47,.07,.033),steel,.007)
 joint='upper_arm.'+side
 bodyform('Arm / upper actuator carrier',[(4.48,s*1.57,.015,.40,.46),(4.75,s*1.53,.02,.52,.55),(5.04,s*1.46,.01,.54,.57),(5.18,s*1.41,0,.40,.44)],frame,2.8,24)
 shell('Arm / upper curved ceramic sleeve',mirror([(1.28,5.11),(1.60,5.17),(1.79,4.89),(1.76,4.58),(1.49,4.49),(1.35,4.71)],s),-.30,.22,pearl,.07)
 ram('Arm / bicep power actuator',(s*1.77,.06,4.55),(s*1.65,.07,5.09),.063)
 hose('Arm / protected shoulder cable',[(s*1.58,.33,5.16),(s*1.79,.39,4.94),(s*1.76,.31,4.65)],.039)
 joint='forearm.'+side
 beam('Arm / elbow transverse bearing',(s*1.60-.25,0,4.30),(s*1.60+.25,0,4.30),.22,frame,28)
 for ss in [-1,1]:flange('Arm / elbow machined ring',(s*1.60+ss*.26,0,4.30),.19,'X',6)
 bodyform('Arm / forearm internal carriage',[(3.37,s*1.73,-.08,.34,.38),(3.61,s*1.70,-.07,.50,.52),(3.93,s*1.65,-.035,.53,.56),(4.12,s*1.62,-.01,.38,.41)],frame,2.9,24)
 shell('Arm / contoured long forearm armor',mirror([(1.43,4.13),(1.67,4.22),(1.89,4.04),(2.01,3.68),(1.84,3.31),(1.59,3.40),(1.49,3.73)],s),-.32,.21,ivory,.095)
 shell('Arm / floating wrist panel',mirror([(1.61,3.76),(1.87,3.82),(1.91,3.64),(1.81,3.42),(1.64,3.47)],s),-.459,.035,pearl,.029,False)
 inset('Arm / inset forearm vent',(s*1.69,-.455,3.98),.24,.18,4,steel)
 trace('Arm / forearm manufacturing seam',[(s*1.57,-.44,4.07),(s*1.60,-.48,3.90),(s*1.61,-.47,3.72)],.009)
 hose('Arm / rear control cable',[(s*1.86,.15,4.04),(s*2.00,.22,3.81),(s*1.90,.13,3.51)],.033)
 joint='hand.'+side
 bodyform('Hand / palm housing',[(3.00,s*1.73,-.09,.29,.27),(3.17,s*1.73,-.10,.35,.33),(3.31,s*1.73,-.08,.30,.29)],frame,3.4,20)
 shell('Hand / dorsum armor',mirror([(1.57,3.28),(1.86,3.28),(1.89,3.10),(1.78,3.02),(1.60,3.08)],s),.055,.06,ivory,.025)
 for i in range(4):
  x=s*1.73-.135+i*.09
  beam('Hand / individual knuckle hinge',(x-.033,-.27,3.15),(x+.033,-.27,3.15),.043,steel,12)
  box('Hand / rounded proximal finger',(x,-.29,3.07),(.075,.13,.17),ivory,.022)
  beam('Hand / middle finger joint',(x-.030,-.27,2.995),(x+.030,-.27,2.995),.031,frame,12)
  box('Hand / curled distal phalanx',(x,-.22,2.96),(.07,.17,.12),steel,.022)
  box('Hand / fingertip traction',(x,-.138,2.96),(.055,.016,.067),seal,.006)
 ram('Hand / opposable thumb',(s*1.91,-.08,3.25),(s*1.94,-.24,3.10),.054)

# Narrow wrap panels continue around the inner upper arms. They cover the broad
# rear/side carriage seen from a three-quarter camera while retaining vent gaps.
for sign,side in [(-1,'L'),(1,'R')]:
 joint='upper_arm.'+side
 for bottom,top in [(4.57,4.81),(4.85,5.10)]:
  yz=[(-.22,bottom+.025),(-.24,top-.04),(-.14,top),(.16,top-.03),(.22,bottom+.05),(.10,bottom)]
  verts=[(sign*(1.33-(z-4.6)*.24-.025),y,z) for y,z in yz]
  verts += [(x+sign*.047,y,z) for x,y,z in verts]
  n=len(yz);mesh('Arm / narrow interior ceramic wrap',verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],ivory,.012)
 # Interleaved metal cooling slots keep the side surface mechanical, not blank.
 for z in [4.67,4.74,4.93,5.0]:
  x=sign*(1.33-(z-4.6)*.24-.040)
  box('Arm / interior vent inset',(x,-.01,z),(.015,.19,.024),frame,.003)
 outline=mirror([(1.31,5.08),(1.56,5.13),(1.74,4.88),(1.71,4.61),(1.52,4.55),(1.39,4.73)],sign)
 rear=shell('Arm / rear upper ceramic cover',outline,-.32,.05,ivory,.02,False)
 for vert in rear.data.vertices:vert.co.y=-vert.co.y
 joint='forearm.'+side
 for y in [-.16,.13]:
  a=(sign*1.45,y,3.97);b=(sign*1.53,y,3.48)
  beam('Arm / inner forearm structural tie',a,b,.042,steel,16)
 # Primary accelerator cannon: tapered dual rails, exposed supported bore,
# induction coils, recessed top sight, layered receiver and an actual muzzle throat.
joint='forearm.R'
bodyform('Cannon / curved wrist cradle',[(3.30,1.73,-.45,.30,.36),(3.46,1.73,-.45,.44,.46),(3.63,1.73,-.45,.37,.44)],frame,3.8,24)
for yy in [-.57,-.83,-1.08]:
 beam('Cannon / receiver induction coil',(1.73,yy-.05,3.51),(1.73,yy+.05,3.51),.185,frame,28)
 ring('Cannon / coil retaining ring',(1.73,yy-.055,3.51),.18,.022,steel)
beam('Cannon / recessed accelerator bore',(1.73,-.55,3.51),(1.73,-2.26,3.51),.097,steel,32)
for yy in [-1.03,-1.33,-1.63,-1.93]:
 ring('Cannon / exposed support spider',(1.73,yy,3.51),.16,.022,frame)
 for xx in [-.16,.16]:beam('Cannon / cross tie',(1.73+xx,yy,3.37),(1.73+xx,yy,3.66),.018,steel,10)
for ss in [-1,1]:
 verts=[(1.73+ss*x,y,z) for x,y,z in [(.12,-.51,3.31),(.29,-.71,3.29),(.25,-1.45,3.33),(.19,-2.22,3.40),(.13,-2.34,3.48),(.13,-2.34,3.59),(.19,-2.22,3.65),(.25,-1.45,3.70),(.29,-.71,3.73),(.12,-.51,3.71)]]
 n=len(verts);verts+= [(x+ss*.065,y,z) for x,y,z in verts]
 ob=mesh('Cannon / tapered ceramic rail',verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],ivory,.028)
 for yy in [-.82,-1.10,-1.38,-1.66,-1.94]:
  box('Cannon / independent top cooling vane',(1.73+ss*.20,yy,3.72-(-yy-.82)*.055),(.105,.045,.041),steel,.008)
  bolt('Cannon / rail lock',(1.73+ss*.29,yy,3.50),'X',.018)
beam('Cannon / recessed muzzle collar',(1.73,-2.23,3.51),(1.73,-2.30,3.51),.15,frame,32)
ring('Cannon / muzzle machined lip',(1.73,-2.305,3.51),.12,.018,steel)
beam('Cannon / deep bore',(1.73,-2.31,3.51),(1.73,-2.315,3.51),.094,seal,24)
beam('Cannon / restrained core lens',(1.73,-2.316,3.51),(1.73,-2.32,3.51),.025,optics,20)
box('Cannon / sight rail',(1.73,-.81,3.82),(.12,.54,.06),navy,.012)
box('Cannon / recessed sight optic',(1.73,-1.06,3.85),(.06,.014,.027),optics,.004)
hose('Cannon / flexible energy feed',[(1.91,-.42,3.50),(2.06,-.56,3.38),(2.03,-.79,3.42)],.027)

# Tactical belt, thigh equipment and layered harness from the v7 turnaround.
joint='chest'
for sign in [-1,1]:
 trace('Harness / graphite load strap',[(sign*.61,-.46,5.66),(sign*.89,-.61,5.35),(sign*.89,-.52,4.94)],.067,frame)
 for z in [5.48,5.17]:
  box('Harness / brass keeper',(sign*.85,-.66,z),(.17,.055,.19),gold,.015)
  box('Harness / keeper opening',(sign*.85,-.692,z),(.095,.015,.12),frame,.009)
 for z in [4.75,5.15,5.53]:
  box('Back / luggage mounting rail',(sign*.43,1.24,z),(.10,.09,.25),frame,.025)
  box('Back / captive brass buckle',(sign*.43,1.30,z),(.15,.035,.12),gold,.014)
joint='pelvis'
for sign in [-1,1]:
 for k in range(2):
  box('Belt / worn utility pouch',(sign*(.68+k*.23),.37,3.94),(.21,.24,.30),frame,.04)
  box('Belt / pouch retention clasp',(sign*(.68+k*.23),.505,3.98),(.07,.028,.12),gold,.008)
joint='thigh.R'
bodyform('Equipment / right thigh pistol holster',[(2.82,1.03,.06,.24,.27),(3.10,1.04,.05,.30,.30),(3.43,1.00,.05,.26,.29)],frame,3,16)
box('Equipment / sidearm slide',(1.04,.035,3.47),(.17,.22,.30),steel,.025)
box('Equipment / sidearm grip',(1.00,.15,3.35),(.16,.22,.22),seal,.025)
joint='thigh.L'
bodyform('Equipment / left hip blade sheath',[(2.80,-1.04,.10,.15,.22),(3.18,-1.03,.10,.19,.26),(3.54,-1.00,.11,.23,.24)],frame,3,16)
beam('Equipment / sheathed blade grip',(-1.00,.11,3.54),(-.97,.11,3.86),.075,seal,16)
box('Equipment / brass blade guard',(-1.0,.10,3.55),(.30,.20,.05),gold,.013)
joint='chest'
rear_label=stencil('Back / power service marking','E-09',(.16,.921,5.42),.085,marking);rear_label.rotation_euler=(math.pi/2,0,math.pi)
# Sparse modeled edge chips at exposed contact points. The tiny, oriented facets
# complement scanned microtexture rather than covering armor in random speckle.
for s,side in [(-1,'L'),(1,'R')]:
 for part,coords in [('chest',[(s*.34,-.676,5.52),(s*.78,-.615,5.37),(s*.53,-.527,4.64)]),('shoulder.'+side,[(s*1.30,-.493,5.93),(s*1.84,-.451,5.72),(s*1.95,-.330,5.28)]),('thigh.'+side,[(s*.55,-.409,3.44),(s*.83,-.401,3.12)]),('shin.'+side,[(s*.70,-.491,1.93),(s*.98,-.420,1.39),(s*.81,-.466,.79)])]:
  joint=part
  for i,p in enumerate(coords):scuff('Armor / small contact chip',p,.065+i*.018,.012,.25*s)
joint='chest'
for sign in [-1,1]:
 shell('Hero / ivory swept chest chevron',mirror([(.08,5.47),(.43,5.59),(.78,5.47),(.72,5.39),(.40,5.48),(.11,5.36)],sign),-.75,.035,pearl,.035)
 shell('Hero / crimson lower pectoral edge',mirror([(.23,5.09),(.58,5.08),(.78,5.18),(.77,5.09),(.60,4.99),(.28,5.00)],sign),-.67,.03,red,.035)
 shell('Hero / overlapping ivory abdomen',mirror([(.04,4.96),(.33,4.94),(.47,4.77),(.30,4.61),(.05,4.70)],sign),-.53,.07,pearl,.045)
 joint='shoulder.'+('R' if sign>0 else 'L')
 shell('Hero / crimson shoulder slash',mirror([(1.32,5.77),(1.68,5.63),(1.94,5.36),(1.90,5.21),(1.60,5.54),(1.28,5.67)],sign),-.54,.035,red,.035)
 joint='chest'
joint='forearm.R'
box('Cannon / graphite rifle receiver',(1.73,-.43,3.52),(.26,.61,.26),frame,.045)
box('Cannon / angled hand grip',(1.73,-.35,3.24),(.18,.24,.35),seal,.025)
mag=box('Cannon / removable magazine',(1.73,-.79,3.21),(.21,.31,.39),frame,.025);mag.rotation_euler.x=-.14
for i in range(4):box('Cannon / magazine reinforcement',(1.73,-.87,3.10+i*.07),(.23,.03,.016),steel,.004)
box('Cannon / skeleton stock',(1.73,.10,3.54),(.20,.48,.17),frame,.025)
box('Cannon / stock shoulder pad',(1.73,.33,3.51),(.22,.10,.31),seal,.022)
beam('Cannon / low profile scope',(1.73,-.57,3.89),(1.73,-.97,3.89),.075,frame,20)
beam('Cannon / sight coated lens',(1.73,-.97,3.89),(1.73,-.982,3.89),.051,optics,20)
# v8 cleanup: sculpted armour reads as continuous shells, so leftover greebles
# and tactical gear are removed. Keep the crest, visor, chevrons, knees, pack,
# thrusters, cannon, blade sheath and markings.
REMOVE=('Harness /','Belt /','Back / luggage mounting rail','Back / captive brass buckle',
 'Equipment / right thigh pistol holster','Equipment / sidearm','Thorax / side cast cooling fin',
 'Back / independent spine bridge','Back / exposed heat exchanger rib','Leg / rear calf radiator',
 'Shoulder / back radiator vane','Head / jaw cooling slot','Head / rear thermal grille','Foot / side traction lug',
 'Foot / separate toe tread','Arm / interior vent inset','Back / communications mast','Head / crest panel separation',
 'Thorax / overlapping abdominal lamella','Cannon / magazine reinforcement','Cannon / independent top cooling vane',
 'Cannon / exposed support spider','Cannon / cross tie','Arm / inner forearm structural tie','Collar / neck support strut',
 'Head / brass ear actuator / pearl cap ring','Thorax / recessed heat exhaust')
for name in [n for n in parts if n.startswith(REMOVE)]:
 ob=bpy.data.objects.get(name)
 if ob:bpy.data.objects.remove(ob,do_unlink=True)
 del parts[name]
# Refurbished armour has restrained inset vents, not large gold toy blocks.
for name,bone in parts.items():
 ob=bpy.data.objects[name]
 if name.startswith('Thorax / recessed heat exhaust'):
  matrix=ob.matrix_world.copy();inv=matrix.inverted();sign=1 if (matrix@ob.data.vertices[0].co).x>0 else -1
  for v in ob.data.vertices:
   p=matrix@v.co;p.x=sign*.61+(p.x-sign*.58)*.72;p.z=5.15+(p.z-5.15)*.70;v.co=inv@p
 if name.startswith('Cannon / tapered ceramic rail'):ob.data.materials[0]=navy
# Slimmer, human-proportioned arm stance. Transform geometry in world space so
# cylinders, fasteners and mesh-authored panels stay aligned with each other.
arm_shift=.22
for name,bone in parts.items():
 ob=bpy.data.objects[name]
 if ob.type!='MESH':continue
 matrix=ob.matrix_world.copy();inverse=matrix.inverted()
 for v in ob.data.vertices:
  p=matrix@v.co
  if bone.startswith('shoulder.'):
   sign=1 if bone.endswith('R') else -1
   p.x=sign*1.30+(p.x-sign*1.30)*.76;p.z=5.35+(p.z-5.35)*.82
  if name.startswith('Cannon /'):
   p.x=1.73+(p.x-1.73)*.66;p.z=3.40+(p.z-3.51)*.82
  if bone.startswith(('shoulder.','upper_arm.','forearm.','hand.')):p.x-=arm_shift*(1 if bone.endswith('R') else -1)
  v.co=inverse@p
# Geometry reflected for rear armor retains outward normals.
for ob in robot.objects:
 if ob.type=='MESH':
  bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
# Gameplay bones are deliberately unchanged: same IK lengths and weapon sockets.
bones={'root':((0,0,0),None),'pelvis':((0,0,3.78),'root'),'chest':((0,0,4.4),'pelvis'),'head':((0,0,5.78),'chest')}
for s,side in [(-1,'L'),(1,'R')]:
 bones.update({'thigh.'+side:((s*.62,0,3.78),'pelvis'),'shin.'+side:((s*.74,0,2.29),'thigh.'+side),'foot.'+side:((s*.8,0,.52),'shin.'+side),'upper_arm.'+side:((s*1.30,0,5.35),'chest'),'forearm.'+side:((s*1.6,0,4.30),'upper_arm.'+side),'hand.'+side:((s*1.73,-.1,3.32),'forearm.'+side)})
for s,side in [(-1,'L'),(1,'R')]:
 bones['shoulder.'+side]=((s*1.30,0,5.35),'chest');bones['skirt.'+side]=((s*.62,-.28,3.98),'pelvis')
for name,(point,parent) in list(bones.items()):
 if name.startswith(('shoulder.','upper_arm.','forearm.','hand.')):bones[name]=((point[0]-.22*(1 if name.endswith('R') else -1),point[1],point[2]),parent)
source_joints={}
for name,(p,parent) in bones.items():
 o=bpy.data.objects.new('Rig_'+name,None);robot.objects.link(o);o.empty_display_type='SPHERE';o.empty_display_size=.08;o.parent=source_joints.get(parent);o.matrix_world=Matrix.Translation(Vector(p));source_joints[name]=o;bpy.context.view_layer.update()
for name,bone in parts.items():
 o=bpy.data.objects[name];world=o.matrix_world.copy();o.parent=source_joints[bone];o.matrix_world=world

export=bpy.data.collections.new('GAME EXPORT / hidden in studio');scene.collection.children.link(export)
root=bpy.data.objects.new('ECHO9_Hero_V8',None);export.objects.link(root);joints={};facing=Matrix.Rotation(math.pi,4,'Z');deps=bpy.context.evaluated_depsgraph_get()
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
for name,bone,p in [('Muzzle','forearm.R',(1.51,-2.33,3.40)),('Jet_L','chest',(-.53,.86,4.30)),('Jet_R','chest',(.53,.86,4.30))]:
 ob=bpy.data.objects.new('Aegis_'+name,None);export.objects.link(ob);ob.parent=joints[bone];ob.matrix_world=Matrix.Translation(facing@Vector(p));bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in export.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'Echo9_Hero_V8.glb'),use_selection=True,export_format='GLB',export_apply=True,export_animations=False)
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
for m in [ivory,pearl,navy,frame,steel,red,gold]:
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF')
 nt=n.new('ShaderNodeTexImage');nt.image=normal_image;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.12;l.new(nt.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
 rt=n.new('ShaderNodeTexImage');rt.image=rough_image;mix=n.new('ShaderNodeMath');mix.operation='MULTIPLY_ADD';mix.inputs[1].default_value=.22;mix.inputs[2].default_value=.38;l.new(rt.outputs['Color'],mix.inputs[0]);l.new(mix.outputs[0],bs.inputs['Roughness'])
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
hero=camera('01 / Vanguard front three-quarter',(9.0,-16,7.1),(0,0,3.48),63)
rear=camera('02 / Rear engineering',(-9,16,7.1),(0,0,3.48),63)
for name,p,energy,color,size in [('Broad warm key',(-6,-7,10),2100,(1,.91,.80),6),('Neutral fill',(6,-3,6),1500,(.73,.85,1),5),('Rear softbox',(2,5,8),2400,(.86,.93,1),5)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,3.5))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('Neutral overcast studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.19,.23,.26,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.45
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.camera=hero
scene['design']='EV-04 VANGUARD: original Gundam-inspired mobile suit; compound curved layered armor, faceted mask and V-fin, articulated inner frame, dense mechanical systems, realistic understated wear.'
scene['materials']='Ten shared runtime material families. Existing Poly Haven CC0 color/normal/roughness maps supplied by runtime, no bitmap duplication in GLB.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'Echo9_Hero_V8.blend'))
(OUT/'provenance.json').write_text(json.dumps({'design':'ECHO-9 / Hero v8','revision':'v8 smooth sculpted armour: continuous subdivided shells over a smooth undersuit, domed joint caps; keeps the cobalt/ivory/crimson palette, swept-crest helmet and cyan visor, chest chevron, crimson knees, thruster pack, arm cannon and blade sheath; bolts, hoses, exposed hydraulics, radiator fins, harness and pouches removed','source':'art/echo9-hero-v8/Echo9_Hero_V8.blend','generator':'tools/build-echo9-hero-v8.py','reference':'Smoothed from the v7 builder at the user\'s request for sleek, sculpted powered-armour surfaces; original Blender geometry, no downloaded model','parts':len(parts),'triangles':triangles,'joints':len(joints),'materials':10,'forward':'-Z','up':'+Y','rig':'Unchanged leg lengths and sole footprint; arms and muzzle shifted inward by .22 m; independent pauldrons, hip guards and functional jet sockets','textures':{'source':'https://polyhaven.com/a/blue_metal_plate','license':'CC0-1.0','maps':'../hangar-v1/panel-color.jpg + panel-normal-rough.png','credit':'Powered by Poly Haven'}},indent=2))
print('VANGUARD_ASSET_EXPORTED',len(parts),triangles,flush=True)
for cam,name in ([] if '--export-only' in sys.argv else [(hero,'hero-v8-front'),(rear,'hero-v8-rear')]):
 scene.camera=cam;scene.render.filepath=str(REVIEW/(name+'.png'));bpy.ops.render.render(write_still=True)
print('VANGUARD_COMPLETE',flush=True)
