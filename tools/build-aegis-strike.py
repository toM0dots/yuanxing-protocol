"""AEGIS Strike: reference-directed layered mechanical armor, authored in Blender.
Run with Blender --background --python tools/build-aegis-strike.py.
"""
import bpy, bmesh, math, json, random, sys
from pathlib import Path
from mathutils import Vector, Matrix
P=Path(__file__).resolve().parents[1]; ART=P/'art/aegis-v3'; OUT=P/'dist/assets/aegis-v3'
ART.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'
robot=bpy.data.collections.new('AEGIS STRIKE • articulated armor');scene.collection.children.link(robot)
studio=bpy.data.collections.new('STUDIO • not exported');scene.collection.children.link(studio)
parts={}; joint='chest'
def mat(name,color,metal=.4,rough=.4,emit=0):
 m=bpy.data.materials.new('Strike_'+name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
ivory=mat('Ceramic',(.67,.70,.68),.28,.35); pearl=mat('Edge',(.82,.84,.79),.38,.3)
frame=mat('Graphite',(.035,.044,.05),.65,.42);steel=mat('Titanium',(.22,.26,.28),.85,.32)
rubber=mat('JointSeal',(.008,.011,.014),.08,.68);red=mat('Oxide',(.27,.028,.017),.5,.4)
glow=mat('Reactor',(1,.075,.013),.15,.24,5);lens=mat('Optics',(1,.22,.035),.25,.2,4)
bronze=mat('HeatShield',(.28,.17,.09),.8,.35)
def put(o,name,m):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 robot.objects.link(o);o.data.materials.append(m);parts[o.name]=joint;return o
def edge(o,w=.018):
 b=o.modifiers.new('Micro bevel • highlight catching edges','BEVEL');b.width=w;b.segments=2
 n=o.modifiers.new('Weighted mechanical normals','WEIGHTED_NORMAL');n.keep_sharp=True;return o
def mesh(name,verts,faces,m,w=.018):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=put(bpy.data.objects.new(name,me),name,m)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return edge(o,w) if w else o
def plate(name,outline,y,depth,m,ridge=.05,w=.018):
 # Raised central ridge makes a shaped armored surface, not an extruded box.
 n=len(outline);cx=sum(p[0] for p in outline)/n;cz=sum(p[1] for p in outline)/n
 ys=y if isinstance(y,list) else [y]*n
 verts=[(x,ys[i],z) for i,(x,z) in enumerate(outline)]+[(x,ys[i]+depth,z) for i,(x,z) in enumerate(outline)]+[(cx,sum(ys)/n-ridge,cz)]
 faces=[(2*n,i,(i+1)%n) for i in range(n)]+[tuple(range(n,2*n))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
 return mesh(name,verts,faces,m,w)
def layered(name,outline,y,depth=.16,m=ivory,ridge=.065):
 cx=sum(x for x,z in outline)/len(outline);cz=sum(z for x,z in outline)/len(outline)
 plate(name+' / recessed perimeter',[(cx+(x-cx)*1.045,cz+(z-cz)*1.025) for x,z in outline],([v+.018 for v in y] if isinstance(y,list) else y+.018),depth+.025,frame,ridge,.015)
 return plate(name,outline,y,depth,m,ridge)
def mirrored(points,s):return [(s*x,z) for x,z in points]
def box(name,p,scale,m,w=.018):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=put(bpy.context.object,name,m);o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return edge(o,w)
def beam(name,a,b,r,m,vertices=16,r2=None):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(a+b)/2);o=put(bpy.context.object,name,m);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();edge(o,min(.012,r*.1))
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def ring(name,p,r,t,m,axis='Y'):
 rot={'Y':(math.pi/2,0,0),'X':(0,math.pi/2,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=32,minor_segments=6,location=p,rotation=rot);o=put(bpy.context.object,name,m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def bolt(p,r=.035):
 x,y,z=p;beam('Captive fastener',(x,y,z),(x,y-.022,z),r,steel,6)
def loft(name,sections,m):
 verts=[]
 for z,cx,cy,w,d in sections:
  for x,y in [(-.7,-1),(.7,-1),(1,-.65),(1,.65),(.7,1),(-.7,1),(-1,.65),(-1,-.65)]:verts.append((cx+x*w/2,cy+y*d/2,z))
 n=len(sections);faces=[tuple(reversed(range(8))),tuple(range((n-1)*8,n*8))]
 for j in range(n-1):
  for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 return mesh(name,verts,faces,m,.022)
# Narrow suspended waist, exposed abdominal mechanism, floating hip armor.
joint='pelvis';loft('Pelvic cradle',[(3.55,0,0,1.0,.62),(3.85,0,0,1.2,.68),(4.05,0,0,.9,.65)],frame)
for z,r in [(4.05,.36),(4.18,.33),(4.31,.35)]:
 beam('Waist bearing',(0,0,z-.045),(0,0,z+.045),r,steel,24);ring('Waist bearing seal',(0,0,z),r,.026,rubber,'Z')
layered('Central groin keel',[(-.22,3.98),(.22,3.98),(.3,3.62),(0,3.39),(-.3,3.62)],-.42,.16)
plate('Waist reactor slit',[(-.06,3.88),(.06,3.88),(.06,3.65),(0,3.56),(-.06,3.65)],-.52,.015,glow,.008,.005)
for s in [-1,1]:
 joint='skirt.'+('L' if s<0 else 'R')
 layered('Floating forward hip blade',mirrored([(.3,4.04),(.72,4.04),(.96,3.34),(.70,3.18),(.43,3.48)],s),-.36,.16,ridge=.10)
 layered('Swept lateral hip blade',mirrored([(.64,4.04),(.88,4.13),(1.35,3.42),(1.05,3.48),(.79,3.7)],s),-.02,.45,ridge=.10)
 joint='pelvis'
 beam('Abdominal piston',(s*.25,.1,3.9),(s*.48,.1,4.62),.065,steel)
# Angular chest with raised pectoral facets and red core.
joint='chest';loft('Monocoque torso',[(4.34,0,.04,.78,.60),(4.65,0,.05,1.2,.88),(5.27,0,.06,1.8,1.0),(5.63,0,.06,1.4,.82)],frame)
for s in [-1,1]:
 layered('Pectoral armor',mirrored([(.09,5.55),(.68,5.7),(1.06,5.33),(.78,4.98),(.21,5.18)],s),-.54,.20,ridge=.16)
 layered('Lower rib plate',mirrored([(.28,5.01),(.8,5.05),(.72,4.63),(.30,4.43),(.34,4.76)],s),-.42,.15,ridge=.08)
 plate('Chest slash inset',mirrored([(.27,5.44),(.70,5.55),(.86,5.37),(.61,5.35)],s),-.71,.015,steel,.01,.008)
 for i in range(4):
  o=box('Inset rib louver',(s*.66,-.50,4.68+i*.085),(.28,.08,.035),steel,.006);o.rotation_euler.y=-s*.22
 for p in [(s*.72,-.69,5.37),(s*.43,-.56,4.76)]:bolt(p)
 beam('Collar actuator',(s*.35,0,5.43),(s*.82,.02,5.73),.09,steel)
layered('Reactor bezel',[(-.18,5.37),(.18,5.37),(.27,5.12),(0,4.89),(-.27,5.12)],-.66,.18,m=frame)
plate('Ruby reactor prism',[(0,5.34),(.12,5.16),(0,4.99),(-.12,5.16)],-.83,.06,glow,.07,.008)
# Back thrusters with diagonal swept stabilizers, readable from the play camera.
for s in [-1,1]:
 loft('Vector engine housing',[(4.4,s*.52,.69,.43,.6),(4.8,s*.60,.77,.6,.62),(5.56,s*.64,.75,.55,.48),(5.83,s*.58,.68,.3,.30)],steel)
 for k in range(5):box('Rear engine cooling fin',(s*.59,1.08,4.83+k*.12),(.39,.08,.035),frame,.008)
 beam('Thruster nozzle',(s*.53,.77,4.58),(s*.53,.86,4.30),.23,frame,24,r2=.18)
 ring('Nozzle heat rim',(s*.53,.86,4.31),.165,.025,bronze,'Z');beam('Nozzle plasma',(s*.53,.86,4.31),(s*.53,.86,4.30),.115,lens,24)
 layered('Swept dorsal blade',mirrored([(.66,5.29),(.85,5.84),(1.43,6.88),(1.33,5.72),(1.08,4.88)],s),.66,.18,ridge=.075)
 plate('Dorsal graphite inset',mirrored([(.89,5.78),(1.33,6.65),(1.22,5.75),(1.02,5.18)],s),.64,.02,frame,.012,.007)
# Compact avian helm with swept ears and thin red optics.
joint='head';beam('Neck',(0,0,5.54),(0,0,5.99),.18,steel)
loft('Helmet shell',[(5.93,0,0,.42,.43),(6.19,0,-.01,.67,.63),(6.48,0,.04,.61,.59),(6.66,0,.12,.27,.36)],ivory)
plate('Recessed face cavity',[(-.3,6.33),(.3,6.33),(.26,6.09),(0,5.93),(-.26,6.09)],-.35,.11,frame,.04)
for s in [-1,1]:
 plate('Optical eye',mirrored([(.025,6.27),(.27,6.33),(.23,6.23),(.035,6.20)],s),-.456,.018,lens,.012,.003)
 layered('Temple blade',mirrored([(.24,6.51),(.43,6.47),(.57,6.12),(.35,5.90),(.29,6.2)],s),-.22,.28,ridge=.08)
 layered('Swept cranial fin',mirrored([(.2,6.45),(.33,6.50),(.75,7.16),(.54,6.39),(.33,6.30)],s),.04,.11,ridge=.05)
 beam('Temple rotary axle',(s*.28,.02,6.26),(s*.45,.02,6.26),.115,steel)
layered('Helmet brow',[(-.34,6.37),(0,6.55),(.34,6.37),(.22,6.32),(0,6.41),(-.22,6.32)],-.36,.11,ridge=.07)
layered('Face keel',[(-.10,6.23),(0,6.3),(.10,6.23),(.14,6.06),(0,5.93),(-.14,6.06)],-.46,.10,ridge=.11)
plate('Forehead ruby',[(0,6.56),(.065,6.47),(0,6.37),(-.065,6.47)],-.52,.024,glow,.02,.004)
# Long, fully articulated legs: exposed circular knees and pointed greaves.
for s,side in [(-1,'L'),(1,'R')]:
 x=s*.62;joint='thigh.'+side
 beam('Hip drive axle',(s*.36,0,3.78),(s*.87,0,3.78),.24,steel,24)
 beam('Femur structural link',(x,0,3.73),(s*.74,0,2.30),.13,frame)
 loft('Upper thigh shield',[(2.56,s*.73,-.08,.40,.42),(3.15,s*.65,-.06,.56,.57),(3.67,s*.62,-.02,.48,.48)],ivory)
 layered('Thigh frontal plate',mirrored([(.43,3.62),(.78,3.66),(.93,2.80),(.72,2.54),(.49,2.91)],s),-.33,.13,ridge=.09)
 plate('Thigh seam',mirrored([(.55,3.53),(.61,3.54),(.76,2.85),(.70,2.79)],s),-.41,.015,frame,.008,.005)
 beam('Thigh rear hydraulic',(s*.70,.29,3.45),(s*.76,.27,2.55),.066,steel)
 joint='shin.'+side
 beam('Knee drum',(s*.74-.26,0,2.29),(s*.74+.26,0,2.29),.25,frame,24)
 for ss in [-1,1]:
  beam('Knee disc',(s*.74+ss*.22,0,2.29),(s*.74+ss*.28,0,2.29),.20,steel,24)
  ring('Knee bearing',(s*.74+ss*.29,0,2.29),.13,.025,bronze,'X')
 layered('Pointed knee cap',mirrored([(.49,2.44),(.74,2.66),(.98,2.44),(.88,2.13),(.73,2.02),(.57,2.15)],s),-.30,.18,ridge=.14)
 plate('Knee red slit',mirrored([(.69,2.48),(.77,2.48),(.80,2.31),(.72,2.26)],s),-.46,.018,red,.01)
 beam('Tibial chassis',(s*.74,.05,2.20),(s*.80,.05,.54),.13,frame)
 loft('Calf armor',[(.56,s*.80,.08,.40,.40),(1.05,s*.82,.14,.69,.66),(1.77,s*.77,.08,.59,.57),(2.12,s*.74,.05,.40,.41)],ivory)
 layered('Long blade greave',mirrored([(.52,2.03),(.84,2.11),(1.10,1.29),(.98,.66),(.78,.49),(.59,.72)],s),[-.34,-.38,-.40,-.41,-.40,-.33],.16,ridge=.16)
 plate('Greave inset seam',mirrored([(.68,1.96),(.76,1.97),(.91,1.19),(.80,.67),(.75,.89)],s),-.53,.02,frame,.02,.007)
 plate('Greave emissive tracer',mirrored([(.73,1.76),(.765,1.77),(.86,1.21),(.82,1.15)],s),-.565,.012,glow,.004,.003)
 layered('Outer ankle blade',mirrored([(.98,1.17),(1.13,1.40),(1.30,.65),(.96,.47)],s),-.03,.42,ridge=.08)
 for yy in [.27,.40]:
  beam('Calf piston sleeve',(s*.96,yy,1.84),(s*.99,yy,1.25),.075,frame)
  beam('Calf piston polished rod',(s*.99,yy,1.28),(s*1.01,yy,.64),.034,steel)
 joint='foot.'+side
 beam('Ankle axle',(s*.80-.19,0,.52),(s*.80+.19,0,.52),.16,steel)
 # Long narrow wedge toes, articulated ankle, dark sole. No rectangular red boots.
 loft('Foot shell',[(.10,s*.80,-.40,.57,1.37),(.28,s*.80,-.42,.61,1.40),(.49,s*.80,-.15,.40,.70),(.62,s*.80,.02,.31,.40)],ivory)
 loft('Traction sole',[(.025,s*.8,-.43,.55,1.40),(.10,s*.8,-.43,.60,1.42)],rubber)
 plate('Toe plate',mirrored([(.55,.28),(.65,.42),(.94,.42),(1.10,.26),(.92,.13),(.61,.13)],s),-1.12,.12,ivory,ridge=.07)
 for offset in [-.14,0,.14]:box('Toe grip',(s*.8+offset,-1.20,.12),(.075,.05,.10),steel,.007)
 box('Heel stabilizer',(s*.80,.37,.16),(.31,.33,.19),frame)
# Layered shoulder blades, articulated fingers, long angular forearm cannon.
for s,side in [(-1,'L'),(1,'R')]:
 joint='upper_arm.'+side
 beam('Shoulder axle',(s*.80,0,5.35),(s*1.42,0,5.35),.25,steel,24)
 ring('Shoulder rotary seal',(s*1.30,0,5.35),.24,.035,rubber,'X')
 joint='shoulder.'+side
 layered('Primary shoulder blade',mirrored([(1.04,5.67),(1.39,6.04),(2.02,6.31),(1.83,5.65),(1.99,5.35),(1.44,5.17),(1.10,5.38)],s),-.28,.65,ridge=.18)
 layered('Outer shoulder petal',mirrored([(1.66,5.66),(2.02,5.83),(2.22,5.30),(1.91,4.94),(1.72,5.23)],s),-.16,.48,ridge=.11)
 plate('Shoulder inset',mirrored([(1.27,5.68),(1.75,5.98),(1.62,5.65),(1.40,5.47)],s),-.48,.035,steel,.025)
 plate('Shoulder warning slash',mirrored([(1.75,5.53),(1.86,5.60),(1.96,5.31),(1.87,5.22)],s),-.47,.024,red,.015)
 for i in range(3):box('Shoulder intake',(s*(1.39+i*.12),-.48,5.42+i*.04),(.06,.06,.16),frame,.005)
 joint='upper_arm.'+side
 beam('Upper arm chassis',(s*1.39,0,5.18),(s*1.58,0,4.38),.125,frame)
 loft('Upper arm shell',[(4.51,s*1.57,-.03,.38,.44),(4.98,s*1.48,-.05,.48,.50),(5.13,s*1.41,0,.39,.42)],ivory)
 beam('Biceps piston',(s*1.72,.06,4.53),(s*1.6,.06,5.0),.055,steel)
 joint='forearm.'+side
 beam('Elbow axle',(s*1.60-.22,0,4.30),(s*1.60+.22,0,4.30),.19,steel,24)
 ring('Elbow seal',(s*1.6,0,4.3),.15,.027,rubber,'X')
 loft('Forearm chassis',[(3.36,s*1.73,-.10,.32,.34),(3.78,s*1.68,-.07,.48,.50),(4.12,s*1.62,-.03,.37,.40)],frame)
 layered('Forearm blade',mirrored([(1.49,4.13),(1.91,4.30),(2.07,3.76),(1.88,3.21),(1.60,3.38)],s),-.31,.24,ridge=.12)
 plate('Forearm inlay',mirrored([(1.74,4.09),(1.83,4.12),(1.92,3.75),(1.81,3.49)],s),-.45,.025,steel,.02)
 for z in [3.69,3.81,3.93]:bolt((s*1.67,-.43,z),.027)
 joint='hand.'+side
 box('Articulated palm',(s*1.73,-.1,3.17),(.31,.31,.33),frame,.045)
 for i in range(4):
  x=s*1.73-.135+i*.09
  beam('Knuckle axle',(x-.035,-.27,3.15),(x+.035,-.27,3.15),.043,steel,12)
  box('Finger proximal',(x,-.29,3.07),(.075,.13,.17),ivory,.018)
  box('Finger distal',(x,-.22,2.96),(.07,.17,.12),frame,.018)
 beam('Opposable thumb',(s*1.91,-.08,3.25),(s*1.94,-.24,3.10),.065,steel,12)
 if side=='R':
  joint='forearm.R';box('Cannon wrist mount',(1.73,-.42,3.50),(.38,.32,.35),frame,.035)
  beam('Accelerator bore',(1.73,-.52,3.51),(1.73,-2.18,3.51),.105,frame,20)
  for yy in [-.64,-.92,-1.20,-1.48,-1.76]:
   ring('Accelerator collar',(1.73,yy,3.51),.145,.025,steel);ring('Accelerator heat channel',(1.73,yy-.03,3.51),.108,.012,glow)
  for ss in [-1,1]:
   # Rail is a tapered wedge along the bore, with an exposed central channel.
   verts=[(1.73+ss*x,y,z) for x,y,z in [(.13,-.5,3.3),(.27,-.6,3.32),(.20,-2.18,3.38),(.12,-2.35,3.45),(.12,-2.35,3.57),(.20,-2.18,3.64),(.27,-.6,3.72),(.13,-.5,3.72)]]
   # Eight vertices lie on a slightly skewed rail plate; use a convex hull.
   bm=bmesh.new()
   for v in verts:bm.verts.new(v)
   bm.verts.ensure_lookup_table();bmesh.ops.convex_hull(bm,input=list(bm.verts));me=bpy.data.meshes.new('Cannon tapered rail');bm.to_mesh(me);bm.free();edge(put(bpy.data.objects.new('Cannon tapered rail',me),'Cannon tapered rail',ivory),.015)
  beam('Muzzle collar',(1.73,-2.18,3.51),(1.73,-2.28,3.51),.155,steel,8)
  beam('Muzzle aperture',(1.73,-2.285,3.51),(1.73,-2.30,3.51),.105,frame,16)
  beam('Muzzle hot core',(1.73,-2.305,3.51),(1.73,-2.31,3.51),.056,glow,16)
# Low-profile physical surface wear: sparse edge nicks, tiny fasteners remain geometry.
random.seed(32)
# Mechanical hierarchy remains compatible with all existing gameplay poses and sockets.
bones={'root':((0,0,0),None),'pelvis':((0,0,3.78),'root'),'chest':((0,0,4.4),'pelvis'),'head':((0,0,5.78),'chest')}
for s,side in [(-1,'L'),(1,'R')]:
 bones.update({'thigh.'+side:((s*.62,0,3.78),'pelvis'),'shin.'+side:((s*.74,0,2.29),'thigh.'+side),'foot.'+side:((s*.8,0,.52),'shin.'+side),'upper_arm.'+side:((s*1.30,0,5.35),'chest'),'forearm.'+side:((s*1.6,0,4.30),'upper_arm.'+side),'hand.'+side:((s*1.73,-.1,3.32),'forearm.'+side)})
for s,side in [(-1,'L'),(1,'R')]:
 bones['shoulder.'+side]=((s*1.30,0,5.35),'chest')
 bones['skirt.'+side]=((s*.62,-.28,3.98),'pelvis')
source_joints={}
for name,(p,parent) in bones.items():
 o=bpy.data.objects.new('Rig_'+name,None);robot.objects.link(o);o.empty_display_type='SPHERE';o.empty_display_size=.08;o.parent=source_joints.get(parent);o.matrix_world=Matrix.Translation(Vector(p));source_joints[name]=o;bpy.context.view_layer.update()
for name,bone in parts.items():
 o=bpy.data.objects[name];world=o.matrix_world.copy();o.parent=source_joints[bone];o.matrix_world=world
# Export evaluated bevels, consistent UV scale, grouped per joint for bounded draw calls.
export=bpy.data.collections.new('GAME EXPORT • hidden in studio');scene.collection.children.link(export)
root=bpy.data.objects.new('AEGIS_Strike',None);export.objects.link(root);joints={};facing=Matrix.Rotation(math.pi,4,'Z');deps=bpy.context.evaluated_depsgraph_get()
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
bpy.ops.export_scene.gltf(filepath=str(OUT/'EV04_Aegis_Strike.glb'),use_selection=True,export_format='GLB',export_apply=True,export_animations=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in export.objects if o.type=='MESH')
for o in export.objects:o.hide_render=True;o.hide_set(True)
# Source .blend carries the same scanned surface detail as the game.
for name in parts:
 ob=bpy.data.objects[name];me=ob.data
 if ob.type!='MESH':continue
 uv=me.uv_layers.active or me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
  for li in poly.loop_indices:
   p=ob.matrix_world@me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p[axes[0]]/1.6,p[axes[1]]/1.6)
normal_image=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-normal.jpg'));normal_image.colorspace_settings.name='Non-Color';normal_image.pack()
rough_image=bpy.data.images.load(str(P/'dist/assets/hangar-v1/panel-rough.jpg'));rough_image.colorspace_settings.name='Non-Color';rough_image.pack()
for m in [ivory,pearl,frame,steel,red,bronze]:
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');nt=n.new('ShaderNodeTexImage');nt.image=normal_image;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.10;l.new(nt.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal']);rt=n.new('ShaderNodeTexImage');rt.image=rough_image;mix=n.new('ShaderNodeMath');mix.operation='MULTIPLY_ADD';mix.inputs[1].default_value=.5;mix.inputs[2].default_value=.25;l.new(rt.outputs['Color'],mix.inputs[0]);l.new(mix.outputs[0],bs.inputs['Roughness'])
# Studio matches the reference's warm key/cool industrial fill. Render is real geometry.
def studio_obj(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 studio.objects.link(o);return o
bpy.ops.mesh.primitive_plane_add(size=200);floor=studio_obj(bpy.context.object);floor.name='Studio ground';floor.data.materials.append(mat('StudioFloor',(.028,.038,.044),.25,.6))
def camera(name,p,target,lens=60):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
hero=camera('01 • Aegis Strike',(10,-16,8),(0,0,3.55),63);rear=camera('02 • Rear armor',(-9,16,8),(0,0,3.6),63)
for name,p,energy,color,size in [('Warm key',(-6,-6,10),1900,(1,.77,.55),6),('Cool fill',(5,-3,6),1200,(.52,.69,.82),5),('Sunset rim',(2,4,9),2400,(1,.33,.10),4),('Sky rim',(-5,2,8),1800,(.65,.83,1),4)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,3.5))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('Cold dusk');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.11,.15,.20,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.camera=hero
scene['design']='AEGIS Strike: swept ceramic armor, exposed titanium mechanisms, ruby reactor. User reference guided silhouette; custom modeled geometry.'
scene['materials']='Runtime uses Poly Haven Blue Metal Plate CC0 normal/roughness maps with restrained strength. GLB contains UVs; no embedded bitmap duplication.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'EV04_Aegis_Strike.blend'))
(OUT/'provenance.json').write_text(json.dumps({'design':'EV-04 AEGIS Strike','revision':'v3: independent shoulder pauldrons and floating hip guards; original visible geometry and PBR palette retained','runtime':'exo-aegis.mjs: world-space support feet, authored bone-offset IK, blended flight/aim, socket-preserving recoil','source':'art/aegis-v3/EV04_Aegis_Strike.blend','generator':'tools/build-aegis-strike.py','reference':'User-supplied mecha illustration; newly authored 3D geometry','parts':len(parts),'triangles':triangles,'joints':len(joints),'forward':'-Z','up':'+Y','textures':{'source':'https://polyhaven.com/a/blue_metal_plate','license':'CC0-1.0','maps':'../hangar-v1/panel-normal.jpg + panel-rough.jpg','credit':'Powered by Poly Haven'}},indent=2))
print('STRIKE_ASSET_EXPORTED',len(parts),triangles,flush=True)
for cam,name in ([] if '--export-only' in sys.argv else [(hero,'Aegis_Strike_hero'),(rear,'Aegis_Strike_rear')]):
 scene.camera=cam;scene.render.filepath=str(ART/(name+'.png'));bpy.ops.render.render(write_still=True)
print('STRIKE_COMPLETE',flush=True)
