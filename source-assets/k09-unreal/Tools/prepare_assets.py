"""Run in Blender's Python console. Builds the isolated K09 source scene and FBX kit.
Only the newly created scene is edited. Unreal import and performance remain separate gates.
"""
import bpy, json, math, random, traceback
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT.parent
EXPORT=ROOT/'SourceAssets/Prepared'
EXPORT.mkdir(parents=True,exist_ok=True)
random.seed(709)
previous=[s for s in bpy.data.scenes if s.name.startswith('K09 Unreal - reference composition')]
scene=bpy.data.scenes.new('K09 Unreal - reference composition')
bpy.context.window.scene=scene
for old in previous:
    for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.scenes.remove(old)
scene.name='K09 Unreal - reference composition'
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1.0
manifest={'units':'metres; FBX carries unit conversion to centimetres','status':'Blender source preparation; Unreal import and rendering unverified','assets':{},'instances':[],'cameras':[]}
prototypes={}

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]

def import_mesh(path,name,center=None,max_triangles=None):
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects=[o for o in scene.objects if o not in before and o.type=='MESH']
    if name=='Hangar':objects=[o for o in objects if o.name.startswith('K09')]
    select(objects)
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if center:obj.data.transform(Matrix.Translation(-Vector(center)))
    if name=='Hangar':
        # Keep the hangar; separate field equipment is authored at the new route.
        import bmesh
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x < -20],context='VERTS')
        bm.to_mesh(obj.data);bm.free()
    if max_triangles:
        obj.data.calc_loop_triangles();n=len(obj.data.loop_triangles)
        if n>max_triangles:
            mod=obj.modifiers.new('Runtime silhouette budget','DECIMATE');mod.ratio=max_triangles/n
            bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def texture_mat(name,color,metal=0,rough=.9,glow=0,prefix=None):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if glow:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=glow
    if prefix:
        folder=ROOT/'SourceAssets/Textures'
        for suffix,socket in [('color','Base Color'),('rough','Roughness'),('normal','Normal')]:
            path=folder/(prefix+'-'+suffix+'.jpg')
            tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True)
            if suffix!='color':tex.image.colorspace_settings.name='Non-Color'
            if suffix=='normal':
                normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.4
                mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],p.inputs[socket])
            else:mat.node_tree.links.new(tex.outputs['Color'],p.inputs[socket])
    return mat

steel=texture_mat('K09_Steel',(.17,.2,.21),.7,.65,prefix='metal')
paint=texture_mat('K09_Paint',(.46,.4,.31),.25,.83,prefix='panel')
dark=texture_mat('K09_Dark',(.025,.035,.04),.35,.85)
amber=texture_mat('K09_Amber',(1,.36,.055),0,.5,5)
green=texture_mat('K09_Green',(.08,.85,.4),0,.5,4)
cloth=texture_mat('K09_Cloth',(.19,.17,.11),0,.97)
sand=texture_mat('K09_Sand',(.34,.17,.073),0,.98)
for suffix,socket in [('diff','Base Color'),('rough','Roughness')]:
    tex=sand.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=bpy.data.images.load(str(ROOT/'SourceAssets/Textures'/('trail-'+suffix+'.jpg')),check_existing=True)
    if suffix=='rough':tex.image.colorspace_settings.name='Non-Color'
    sand.node_tree.links.new(tex.outputs['Color'],sand.node_tree.nodes.get('Principled BSDF').inputs[socket])
strata=texture_mat('K09_Strata',(.35,.16,.065),0,.92)
for suffix,socket in [('diff','Base Color'),('rough','Roughness')]:
    tex=strata.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=bpy.data.images.load(str(ROOT/'SourceAssets/Textures'/('rock-'+suffix+'.jpg')),check_existing=True)
    if suffix=='rough':tex.image.colorspace_settings.name='Non-Color'
    strata.node_tree.links.new(tex.outputs['Color'],strata.node_tree.nodes.get('Principled BSDF').inputs[socket])
for mat,prefix in [(sand,'trail'),(strata,'rock')]:
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=bpy.data.images.load(str(ROOT/'SourceAssets/Textures'/(prefix+'-normal.jpg')),check_existing=True)
    tex.image.colorspace_settings.name='Non-Color'
    normal=mat.node_tree.nodes.new('ShaderNodeNormalMap')
    mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
    mat.node_tree.links.new(normal.outputs['Normal'],mat.node_tree.nodes.get('Principled BSDF').inputs['Normal'])

def box(p,size,mat=steel,bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Soft machined edges','BEVEL');m.width=min(bevel,min(size)*.2);m.segments=2
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def beam(a,b,r=.04,mat=steel):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');o.data.materials.append(mat);return o
def join_parts(name,parts):
    select(parts);bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);return o

def export_asset(name,obj,lods=(1,.42,.14),collision='convex'):
    obj.name=name;obj.data.calc_loop_triangles();asset={'mesh':name+'.fbx','collision':collision,'materials':[m.name for m in obj.data.materials],'lods':[]}
    for i,ratio in enumerate(lods):
        temp=obj.copy();temp.data=obj.data.copy();scene.collection.objects.link(temp);temp.name=name
        select([temp])
        if ratio<1:
            mod=temp.modifiers.new('Distance LOD','DECIMATE');mod.ratio=ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
        # Lock triangulation before measuring/exporting; FBX otherwise may discard
        # degenerate n-gons left by decimation and change the reported triangle count.
        mod=temp.modifiers.new('Stable export triangulation','TRIANGULATE')
        bpy.ops.object.modifier_apply(modifier=mod.name)
        import bmesh
        bm=bmesh.new();bm.from_mesh(temp.data)
        bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_area()<1e-10],context='FACES')
        bm.to_mesh(temp.data);bm.free()
        temp.data.calc_loop_triangles();n=len(temp.data.loop_triangles)
        if not all(math.isfinite(c) for v in temp.data.vertices for c in v.co):raise ValueError('Nonfinite geometry '+name)
        filename=name+('' if i==0 else '_LOD'+str(i))+'.fbx'
        bpy.ops.export_scene.fbx(filepath=str(EXPORT/filename),use_selection=True,object_types={'MESH'},bake_anim=False,add_leaf_bones=False,axis_forward='-Y',axis_up='Z',apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',use_mesh_modifiers=True,path_mode='STRIP')
        asset['lods'].append({'file':filename,'triangles':n})
        bpy.data.objects.remove(temp,do_unlink=True)
    asset['bounds']=[list(obj.dimensions),list(obj.location)]
    manifest['assets'][name]=asset;prototypes[name]=obj
    obj.hide_render=True;obj.hide_set(True)

for name,budget in [('rock_face_01',12000),('namaqualand_cliff_02',32000),('sand_rocks_small_01',10000)]:
    obj=import_mesh(ROOT/'SourceAssets/PolyHaven'/name/(name+'.gltf'),name,max_triangles=budget)
    export_asset(name,obj,collision='convex' if 'small' not in name else 'none')

hangar=import_mesh(WORK/'game_source/dist/assets/k09-hero-v1/k09-hangar-field.glb','Hangar',(38,0,-.1532857142857))
for i,m in enumerate(hangar.data.materials):
    name=m.name
    hangar.data.materials[i]=paint if 'Painted' in name else amber if 'Amber' in name else green if 'Green' in name else cloth if 'Cloth' in name else dark if 'Dark' in name else steel
for p in hangar.data.polygons:p.use_smooth=False
export_asset('Hangar',hangar,(1,.6),collision='custom')

parts=[beam((0,0,.2),(0,0,1.65),.11,dark),beam((0,0,1.1),(0,0,1.7),.145,green)]
for z in [1.03,1.76]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.035,major_segments=16,minor_segments=6,location=(0,0,z));o=bpy.context.object;o.data.materials.append(steel);parts.append(o)
for n in range(4):
    a=n*math.pi/2;x,y=math.cos(a),math.sin(a)
    parts.append(beam((x*.21,y*.21,1.03),(x*.21,y*.21,1.76),.025))
    parts.append(beam((x*.08,y*.08,.65),(x*.5,y*.5,.05),.055));parts.append(box((x*.5,y*.5,.035),(.22,.22,.07),dark))
export_asset('GreenLamp',join_parts('GreenLamp',parts),(1,),collision='none')
parts=[box((0,0,.48),(1.5,1,.96),dark,.09)]
for side in [-1,1]:
    parts.append(box((0,side*.51,.48),(1.31,.04,.75),paint))
    for x in [-.47,.47]:parts.append(box((x,side*.55,.48),(.12,.06,.25),steel))
for x in [-.61,.61]:parts.append(box((x,0,.48),(.07,1.06,1.02),steel))
parts.append(box((0,0,1.02),(.5,.15,.08),steel))
export_asset('FieldCase',join_parts('FieldCase',parts),(1,.5),collision='convex')
parts=[]
for x in [-1.5,1.5]:parts.append(beam((x,0,0),(x,0,1.15),.045))
for h in [.45,1.15]:parts.append(beam((-1.5,0,h),(1.5,0,h),.045))
export_asset('Rail',join_parts('Rail',parts),(1,),collision='none')
parts=[box((0,0,-.3),(72,8,.6),paint,.08)]
for y in [-3.7,3.7]:
    parts.append(beam((-36,y,-1.5),(36,y,-1.5),.27))
    for x in range(-36,37,6):
        parts.append(beam((x,y,0),(x,y,1.6),.08))
    for z in [.65,1.6]:parts.append(beam((-36,y,z),(36,y,z),.06))
for x in range(-33,34,6):
    parts.append(beam((x-3,-3.7,-1.5),(x+3,3.7,-.3),.12))
    parts.append(box((x,0,.02),(.15,7.4,.04),dark,0))
export_asset('ServiceBridge',join_parts('ServiceBridge',parts),(1,.5),collision='custom')

def surface_mesh(name,verts,faces,uvs):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);mesh.materials.append(strata)
    uv=mesh.uv_layers.new(name='UVMap')
    for p in mesh.polygons:
        p.use_smooth=True
        for li in p.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    return obj

# Continuous low-frequency rock mass supports the open photogrammetry surfaces.
from mathutils import noise
verts=[];faces=[];uvs=[];rings=60;segments=96
for j in range(rings+1):
    z=j*1.4
    for i in range(segments+1):
        a=i/segments*math.tau
        n=noise.fractal(Vector((math.cos(a)*3,math.sin(a)*3,z*.055)),1,2,3)
        shelf=1.8*math.sin(z*.64)+.5*math.sin(z*2.3)+1.3*math.sin(z*.16)
        r=1-.0024*z+(shelf+2*n)/24
        verts.append((24*r*math.cos(a),29*r*math.sin(a),z))
        uvs.append((a*24/5,z/5))
for j in range(rings):
    for i in range(segments):
        k=j*(segments+1)+i;faces.append((k,k+1,k+segments+2,k+segments+1))
faces.append(tuple(rings*(segments+1)+i for i in range(segments)))
export_asset('CliffCore',surface_mesh('CliffCore',verts,faces,uvs),(1,.45,.16),collision='convex')
verts=[];faces=[];uvs=[];sections=80;radial=32
for j in range(sections+1):
    a=j/sections*math.pi
    centre=Vector((30*math.cos(a),0,35*math.sin(a)))
    normal=Vector((math.cos(a),0,math.sin(a)))
    for i in range(radial+1):
        b=i/radial*math.tau
        n=noise.fractal(Vector((centre.x*.13,math.cos(b)*2,centre.z*.13)),1,2,3)
        radius=9+.9*math.sin(centre.z*.8)+n
        co=centre+normal*(radius*math.cos(b))+Vector((0,math.sin(b)*12,0))
        verts.append(tuple(co));uvs.append((a*34/4,b*10/4))
for j in range(sections):
    for i in range(radial):
        k=j*(radial+1)+i;faces.append((k,k+1,k+radial+2,k+radial+1))
export_asset('ArchCore',surface_mesh('ArchCore',verts,faces,uvs),(1,.5,.2),collision='terrain')

# Actual distant geometry, with vertex colour bands carried through the FBX.
planetmat=texture_mat('K09_Planet',(.6,.4,.28),0,1)
nodes=planetmat.node_tree.nodes;nodes.clear()
attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='CelestialColor'
em=nodes.new('ShaderNodeEmission');out=nodes.new('ShaderNodeOutputMaterial')
planetmat.node_tree.links.new(attr.outputs['Color'],em.inputs['Color']);planetmat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
def celestial_colors(obj):
    colors=obj.data.color_attributes.new(name='CelestialColor',type='FLOAT_COLOR',domain='POINT')
    for v in obj.data.vertices:
        p=v.co;n=noise.fractal(p*3.1,1,2,4);band=.5+.5*math.sin(p.z*51+n*4)
        shade=.47+.53*max(0,p.normalized().dot(Vector((-.6,-.6,.5)).normalized()))
        colors.data[v.index].color=((.55+.28*band)*shade,(.33+.26*band)*shade,(.23+.19*band)*shade,1)
    obj.data.materials.clear();obj.data.materials.append(planetmat)
bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=64,radius=1)
planet=bpy.context.object;celestial_colors(planet)
for p in planet.data.polygons:p.use_smooth=True
export_asset('RingedPlanet',planet,(1,),collision='none')
verts=[];faces=[]
for band in range(20):
    inner=1.3+band*.043;outer=inner+.032
    start=len(verts)
    for i in range(193):
        a=i/192*math.tau
        for r in [inner,outer]:verts.append((r*math.cos(a),r*math.sin(a),0))
    for i in range(192):
        k=start+i*2;faces.append((k,k+1,k+3,k+2))
mesh=bpy.data.meshes.new('PlanetRings');mesh.from_pydata(verts,[],faces);mesh.update()
rings=bpy.data.objects.new('PlanetRings',mesh);scene.collection.objects.link(rings);celestial_colors(rings)
export_asset('PlanetRings',rings,(1,),collision='none')

def place(name,p,scale=(1,1,1),rotation=(0,0,0),label=None):
    src=prototypes[name];o=src.copy();o.data=src.data;scene.collection.objects.link(o)
    o.name=label or name;o.hide_render=False;o.hide_set(False);o.location=p;o.scale=scale;o.rotation_euler=[math.radians(v) for v in rotation]
    manifest['instances'].append({'asset':name,'name':o.name,'location_m':list(p),'scale':list(scale),'rotation_xyz_degrees':list(rotation)})
    return o

# Hangar to the left, arch to the right, layered distant silhouettes.
place('Hangar',(-53,45,16))
place('ServiceBridge',(3,-1,15.3))
for side in [-1,1]:
    for j in range(7):
        place('CliffCore',(side*103,-45+j*44,-7),(1.35,1.2,.9+(j%3)*.12),(0,0,j*37),'CanyonMass')
place('CliffCore',(-80,65,5),(1,1.1,1.1),(0,0,15),'HangarBedrock')
place('ArchCore',(49,55,24))
place('RingedPlanet',(150,1800,900),(650,650,650),(16,12,20))
place('PlanetRings',(150,1800,900),(650,650,650),(16,12,20))
for side in [-1,1]:
    for j in range(7):
        y=-40+j*38;x=side*(83+8*math.sin(j*1.7));z=3+j*2
        for layer in range(3):
            place('namaqualand_cliff_02',(x,y,z+layer*21),(2.1,3.0,3.2), (0,0,90 if side<0 else -90),f'Cliff_{side}_{j}_{layer}')
for j in range(7):
    a=math.pi*j/6;x=49+30*math.cos(a);z=24+35*math.sin(a)
    place('rock_face_01',(x,55,z),(3.8,3.4,3.4),(0,math.degrees(a)-90,12),'HeroArch_'+str(j))
for j in range(7):
    place('namaqualand_cliff_02',(-190+j*68,380+35*math.sin(j),-5),(4.0,4.5,6+j%3),(0,0,j*43),'DistantMesa_'+str(j))
    place('CliffCore',(-190+j*68,380+35*math.sin(j),-20),(2,1.8,1.3+(j%3)*.25),(0,0,j*43),'DistantMass')
# A 48 m service cave branches east, with a clear floor and vaulted scan walls.
for j in range(5):
    x=78+j*10
    for side in [-1,1]:
        place('rock_face_01',(x,83+side*8,18),(3,3,4),(0,0,0 if side<0 else 180),'CaveWall')
    place('rock_face_01',(x,83,34),(3.4,4,2.8),(0,90,90),'CaveRoof')

# Walkable terrace ribbons. The centre channel stays below the footpath.
def route_height(x,y):
    return 13+1.7*math.sin(y*.013)+.018*(y+100)
verts=[];faces=[];nx,ny=80,130
for j in range(ny+1):
    y=-150+j*3
    for i in range(nx+1):
        x=-120+i*3;channel=math.exp(-((x-4-10*math.sin(y*.012))/24)**4)
        z=route_height(x,y)-channel*28+math.sin(x*.16+y*.11)*.33+math.sin(y*.43)*.11
        # Smooth elevated landing outside the hangar, joined to the eastward approach.
        if -80<x<-25 and 12<y<65:z=16
        if 70<x and 75<y<92:z=18
        verts.append((x,y,z))
for j in range(ny):
    for i in range(nx):
        k=j*(nx+1)+i;faces.extend([(k,k+1,k+nx+2),(k,k+nx+2,k+nx+1)])
mesh=bpy.data.meshes.new('TerraceSurface');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('TerraceSurface',mesh);scene.collection.objects.link(obj);obj.data.materials.append(sand)
# Planar metre UVs for the scanned trail material.
uv=mesh.uv_layers.new(name='UVMap')
for polygon in mesh.polygons:
    polygon.use_smooth=True
    for loop in polygon.loop_indices:
        co=mesh.vertices[mesh.loops[loop].vertex_index].co;uv.data[loop].uv=(co.x/4,co.y/4)
export_asset('TerraceSurface',obj,(1,.4),collision='terrain');place('TerraceSurface',(0,0,0))

for i in range(120):
    x=random.choice([-1,1])*random.uniform(32,105);y=random.uniform(-125,200);s=random.uniform(.6,2.1)
    place('sand_rocks_small_01',(x,y,route_height(x,y)-.08),(s,s,s),(0,0,random.uniform(0,360)))
for j in range(18):
    y=-125+j*13;x=41+9*math.sin(j*.21);z=route_height(x,y)
    place('GreenLamp',(x,y,z),(1,1,1))
    place('Rail',(x-4,y+3,z),(1,1,1),(0,0,90))
for j in range(7):place('FieldCase',(-73+(j%3)*2.0,18+(j//3)*1.5,16))
for j in range(5):place('FieldCase',(68+(j%2)*1.6,-58+j,route_height(68,-58+j)))
for j in range(5):
    place('GreenLamp',(80+j*10,77,18))
    place('FieldCase',(117+(j%2)*1.7,86+(j//2)*1.3,18))

def camera(name,p,target,lens=30):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;data.clip_end=10000
    manifest['cameras'].append({'name':name,'location_m':p,'target_m':target,'lens_mm':lens});return o
scene.camera=camera('ReferenceApproach',(76,-118,23),(-11,75,36),27)
camera('CaveReverse',(70,85,25),(-50,38,37),28)
camera('HangarInterior',(-53,55,23),(-53,8,26),25)
sun_data=bpy.data.lights.new('Amber low sun','SUN');sun_data.energy=3.2;sun_data.angle=.12;sun_data.color=(1,.63,.34)
o=bpy.data.objects.new('Amber low sun',sun_data);scene.collection.objects.link(o);o.rotation_euler=(math.radians(68),math.radians(-16),math.radians(-50))
world=bpy.data.worlds.new('K09 warm dusk');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.31,.42,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
for p in [(-53,39,42),(-62,25,21),(-43,25,21)]:
    data=bpy.data.lights.new('Hangar service light','AREA');data.energy=1200;data.color=(1,.4,.11);data.shape='DISK';data.size=5;o=bpy.data.objects.new(data.name,data);scene.collection.objects.link(o);o.location=p
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.device='CPU'
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'Validation/blender-layout-preview.png');scene.view_settings.view_transform='AgX'
manifest['spawn_m']=[45,-110,20]
manifest['hangar_collision_boxes']=[{'center_m':[-53,55.5,35],'size_m':[36,1,38]},{'center_m':[-70.5,45,35],'size_m':[1,22,38]},{'center_m':[-35.5,45,35],'size_m':[1,22,38]},{'center_m':[-53,45,54],'size_m':[36,22,1.2]}]
manifest['route_collision_boxes']=[{'center_m':[3,-1,15],'size_m':[72,8,.6]}, {'center_m':[99,83,17.7],'size_m':[52,16,.6]}]
(EXPORT/'scene-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'SourceAssets/K09_Unreal_Source.blend'))
(ROOT/'Validation/asset-preparation-complete.json').write_text(json.dumps({'assets':len(manifest['assets']),'instances':len(manifest['instances']),'mesh_lod_files':sum(len(a['lods']) for a in manifest['assets'].values()),'status':'FBX exported; not yet imported or tested in Unreal'},indent=2)+'\n')
print('K09 Unreal source assets prepared:',len(manifest['assets']),'assets;',len(manifest['instances']),'placements')
