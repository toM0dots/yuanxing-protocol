"""Author the K-09 lived-in interior prop kit in Blender and export it as one GLB.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
    --python tools/build-interior-props.py

Units are game units (about 1 cm). Each prop is modelled Z-up in Blender with its
origin at the bottom centre and its front facing -Y, so after glTF's Y-up
conversion the front faces +Z in the game. Wall pieces (sign, key rack, curtain)
have their origin on the wall plane. Every prop shares one small material set;
a baked grime vertex colour (contact darkening, smudges, worn edges) is
multiplied into the base colour so plain shapes do not read as clean CG.
"""
import bpy, bmesh, math, json, random
from pathlib import Path
from mathutils import Vector, Matrix, noise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/interior-props-v1'
ART = ROOT / 'art/interior-props-v1'
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)
random.seed(9)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
    for item in list(block):
        block.remove(item)

# ---------------------------------------------------------------- materials
MATERIALS = {}
SPEC = [
    # name, linear base colour, metallic, roughness, emission strength
    ('IvoryCeramic', (0.70, 0.66, 0.56), 0.0, 0.34, 0),
    ('Graphite', (0.050, 0.056, 0.060), 0.45, 0.58, 0),
    ('OchrePaint', (0.52, 0.30, 0.085), 0.25, 0.60, 0),
    ('WornFabric', (0.25, 0.26, 0.19), 0.0, 0.96, 0),
    ('Blanket', (0.36, 0.15, 0.075), 0.0, 1.0, 0),
    ('Leather', (0.15, 0.075, 0.032), 0.0, 0.68, 0),
    ('Steel', (0.46, 0.47, 0.47), 0.9, 0.38, 0),
    ('Rubber', (0.018, 0.019, 0.02), 0.0, 0.9, 0),
    ('Wood', (0.29, 0.17, 0.085), 0.0, 0.74, 0),
    ('Soil', (0.055, 0.038, 0.024), 0.0, 1.0, 0),
    ('Leaf', (0.11, 0.24, 0.065), 0.0, 0.66, 0),
    ('Paper', (0.72, 0.67, 0.52), 0.0, 0.9, 0),
    ('AmberGlow', (1.0, 0.56, 0.20), 0.0, 0.4, 6.0),
    ('SignFace', (0.80, 0.76, 0.64), 0.1, 0.82, 0),
]
for name, color, metal, rough, emit in SPEC:
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emit
    if name not in ('AmberGlow', 'SignFace'):
        # Multiply the baked grime colour into the albedo (also shown in renders).
        attr = m.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Grime'
        mix = m.node_tree.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs['A'].default_value = (*color, 1)
        m.node_tree.links.new(attr.outputs['Color'], mix.inputs['B'])
        m.node_tree.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    MATERIALS[name] = m

# ---------------------------------------------------------------- helpers
parts = []
PROPS = {}
ANCHORS = {}


def _finish(o, mat, bevel=0.0, segments=2, smooth=True):
    o.data.materials.clear()
    o.data.materials.append(MATERIALS[mat])
    bpy.context.view_layer.objects.active = o
    if bevel:
        mod = o.modifiers.new('Worn edge', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if smooth:
        for f in o.data.polygons:
            f.use_smooth = True
        mod = o.modifiers.new('Weighted', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.append(o)
    return o


def _apply(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def cube(loc, size, mat, bevel=0.6, rot=(0, 0, 0), segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    _apply(o)
    return _finish(o, mat, min(bevel, min(size) * 0.3), segments)


def cyl(loc, r, depth, mat, rot=(0, 0, 0), verts=20, bevel=0.3, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    _apply(o)
    return _finish(o, mat, min(bevel, depth * 0.2, r * 0.3))


def sphere(loc, scale, mat, rot=(0, 0, 0), seg=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = scale
    _apply(o)
    return _finish(o, mat)


def torus(loc, major, minor, mat, rot=(0, 0, 0), seg=24, minor_seg=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=seg,
                                     minor_segments=minor_seg, location=loc, rotation=rot)
    o = bpy.context.object
    _apply(o)
    return _finish(o, mat)


def rod(a, b, r, mat, verts=10):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    _apply(o)
    return _finish(o, mat, min(0.25, r * 0.3))


def tube(points, r, mat, resolution=6, taper_end=None):
    curve = bpy.data.curves.new('tube', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = 2
    curve.resolution_u = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, p in zip(spline.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    if taper_end is not None:
        spline.bezier_points[-1].radius = taper_end
    o = bpy.data.objects.new('tube', curve)
    bpy.context.scene.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    return _finish(o, mat)


def revolve(profile, mat, loc=(0, 0, 0), segments=28, cap_bottom=True):
    """Lathe a (radius, height) profile around Z. Radius 0 points collapse to the axis."""
    me = bpy.data.meshes.new('lathe')
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 0.0001:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z))
                          for a in (i * 2 * math.pi / segments for i in range(segments))])
    for lo, hi in zip(rings, rings[1:]):
        if len(lo) == 1 and len(hi) == 1:
            continue
        for i in range(segments):
            j = (i + 1) % segments
            if len(lo) == 1:
                bm.faces.new((lo[0], hi[i], hi[j]))
            elif len(hi) == 1:
                bm.faces.new((lo[i], hi[0], lo[j]))
            else:
                bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    if cap_bottom and len(rings[0]) > 1:
        bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('lathe', me)
    o.location = loc
    bpy.context.scene.collection.objects.link(o)
    _apply(o)
    return _finish(o, mat)


def sheet(nx, ny, fn, mat, thickness=0.7, drop_faces=None):
    """A fabric sheet: fn(u, v) -> (x, y, z) with u, v in [0, 1]. Solidified."""
    me = bpy.data.meshes.new('sheet')
    bm = bmesh.new()
    grid = [[bm.verts.new(fn(i / nx, j / ny)) for i in range(nx + 1)] for j in range(ny + 1)]
    uv = bm.loops.layers.uv.new()
    for j in range(ny):
        for i in range(nx):
            if drop_faces and drop_faces(i / nx, j / ny):
                continue
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for loop, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                loop[uv].uv = (a / nx, b / ny)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('sheet', me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    mod = o.modifiers.new('Cloth thickness', 'SOLIDIFY')
    mod.thickness = thickness
    mod.offset = 0
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return _finish(o, mat)


def grime(o, prop_height):
    """Bake contact darkening, smudges and worn high edges into a 'Grime' colour."""
    me = o.data
    attr = me.color_attributes.new('Grime', 'BYTE_COLOR', 'CORNER')
    me.color_attributes.active_color = attr
    mat = o.data.materials[0].name if o.data.materials else ''
    clean = mat in ('AmberGlow', 'SignFace')
    seed = Vector((random.random() * 50, random.random() * 50, random.random() * 50))
    for poly in me.polygons:
        for li in poly.loop_indices:
            if clean:
                attr.data[li].color = (1, 1, 1, 1)
                continue
            v = me.vertices[me.loops[li].vertex_index]
            p = o.matrix_world @ v.co
            n = (o.matrix_world.to_3x3() @ poly.normal).normalized()
            contact = 1 - 0.32 * math.exp(-max(p.z, 0) / 6.0)          # soot where it meets the floor
            smudge = 0.86 + 0.14 * noise.noise(p * 0.08 + seed)          # broad dirt
            fleck = 0.94 + 0.06 * noise.noise(p * 0.9 + seed)            # fine grit
            under = 0.84 + 0.16 * max(0.0, n.z * 0.5 + 0.5)              # dust settles on top faces
            g = max(0.35, min(1.0, contact * smudge * fleck * under))
            attr.data[li].color = (g, g * 0.985, g * 0.96, 1)


def start():
    parts.clear()


def end(name, anchors=None):
    root = bpy.data.objects.new('Prop_' + name, None)
    bpy.context.scene.collection.objects.link(root)
    groups = {}
    for o in parts:
        groups.setdefault(o.data.materials[0].name, []).append(o)
    height = max((max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in parts), default=1)
    for mat, group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:
            o.select_set(True)
        bpy.context.view_layer.objects.active = group[0]
        if len(group) > 1:
            bpy.ops.object.join()
        o = bpy.context.object
        o.name = name + '_' + mat
        o.data.name = o.name
        grime(o, height)
        o.parent = root
    for key, loc in (anchors or {}).items():
        e = bpy.data.objects.new(name + '_' + key, None)
        e.location = loc
        bpy.context.scene.collection.objects.link(e)
        e.parent = root
    PROPS[name] = root
    return root


def arc(center, radius, a0, a1, n=8, axis='xz'):
    pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        c, s = math.cos(a) * radius, math.sin(a) * radius
        if axis == 'xz':
            pts.append((center[0] + c, center[1], center[2] + s))
        else:
            pts.append((center[0], center[1] + c, center[2] + s))
    return pts


# ================================================================== props
# 1. Painted sign ---------------------------------------------------------
start()
cube((0, -1.6, 30), (112, 3.2, 58), 'OchrePaint', 1.2)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -3.35, 30), rotation=(math.pi / 2, 0, 0))
face = bpy.context.object
face.scale = (104, 50, 1)
_apply(face)
_finish(face, 'SignFace', smooth=False)
for x in (-49, 49):
    cyl((x, -3.6, 52), 1.7, 1.4, 'Steel', rot=(math.pi / 2, 0, 0), verts=6)
    cyl((x, -3.6, 8), 1.7, 1.4, 'Steel', rot=(math.pi / 2, 0, 0), verts=6)
cube((0, -0.6, 62), (40, 1.2, 6), 'Graphite', 0.4)        # hanging bracket
rod((-18, -1.0, 59), (-14, -1.0, 66), 0.7, 'Steel')
rod((18, -1.0, 59), (14, -1.0, 66), 0.7, 'Steel')
end('sign')

# 2. Key rack ---------------------------------------------------------------
start()
cube((0, -1.3, 17), (64, 2.6, 30), 'Wood', 0.6)
cube((0, -3.6, 4), (60, 4.6, 2.2), 'Wood', 0.4)            # shelf ledge
for i in range(8):
    x = -26 + i * 7.4
    rod((x, -2.5, 22), (x, -7.5, 23.4), 0.45, 'Steel', 6)
    rod((x, -7.5, 23.4), (x, -7.8, 25.6), 0.45, 'Steel', 6)
    if i in (2, 5):
        continue                                            # empty hooks: keys that were taken
    tilt = random.uniform(-0.25, 0.25)
    torus((x, -7.2, 21.2), 1.5, 0.3, 'Steel', rot=(math.pi / 2, 0, 0), seg=14, minor_seg=5)
    cube((x + math.sin(tilt) * 4, -7.2, 16.4), (1.6, 0.5, 6.4), 'Steel', 0.15, rot=(0, tilt, 0))
    cube((x + math.sin(tilt) * 9, -7.6, 11.5), (3.6, 0.4, 5.2), 'Paper' if i % 3 else 'OchrePaint', 0.15, rot=(0, tilt, 0))
cube((24, -4.6, 6.4), (8, 3.5, 2.2), 'Paper', 0.2, rot=(0, 0, 0.2))   # a tag left on the ledge
end('key_rack')

# 3. Folding cot ------------------------------------------------------------
start()
L, W, H = 190, 72, 42
for y in (-W / 2, W / 2):
    rod((-L / 2, y, H), (L / 2, y, H), 1.7, 'Steel', 10)
for x in (-L / 2 + 2, L / 2 - 2):
    rod((x, -W / 2, H - 1), (x, W / 2, H - 1), 1.3, 'Steel', 8)
for x in (-70, 0, 70):
    for s in (-1, 1):
        rod((x - 14 * s, -W / 2 + 2, H), (x + 14 * s, -W / 2 + 2, 1.5), 1.2, 'Steel', 8)
        rod((x - 14 * s, W / 2 - 2, H), (x + 14 * s, W / 2 - 2, 1.5), 1.2, 'Steel', 8)
    for s in (-1, 1):
        cyl((x + 14 * s, -W / 2 + 2, 1.2), 1.9, 2.4, 'Rubber', verts=10)
        cyl((x + 14 * s, W / 2 - 2, 1.2), 1.9, 2.4, 'Rubber', verts=10)


def canvas(u, v):
    x = (u - 0.5) * (L - 6)
    y = (v - 0.5) * (W + 3)
    sag = 4.2 * (1 - (2 * v - 1) ** 2) * (0.6 + 0.4 * (1 - (2 * u - 1) ** 4))
    z = H + 1.2 - sag + 0.4 * noise.noise(Vector((x * 0.05, y * 0.05, 3)))
    return (x, y, z)


sheet(40, 12, canvas, 'WornFabric', 0.5)
cube((-L / 2 + 22, 0, H + 4.5), (34, 50, 9), 'Paper', 3.5, segments=3)   # rolled pillow / jacket
end('cot')

# 4. Blanket (draped over the cot footprint, one side sliding to the floor) ---
start()
BW, BD = 150, 140


def blanket(u, v):
    x = (u - 0.42) * BW
    y = (v - 0.30) * BD                   # y > W/2 hangs off the front long edge
    top = H + 3.2
    wr = Vector((x * 0.045, y * 0.045, 1.7))
    wrinkle = 2.2 * noise.noise(wr) + 0.8 * noise.noise(wr * 3.1)
    edge = W / 2 + 2
    if y <= edge:
        lump = 4.5 * math.exp(-((x + 15) ** 2) / 900 - ((y + 5) ** 2) / 500)   # where someone lay
        return (x, y, top + wrinkle * 0.6 + lump)
    hang = y - edge                        # length past the edge becomes a drop
    if hang < top:
        bulge = 3.5 * math.sin(hang / top * math.pi) + 1.5 * noise.noise(wr * 2)
        return (x, edge + bulge + 1.4 * wrinkle, top - hang)
    pool = hang - top                       # the rest piles on the floor
    return (x + 3 * noise.noise(wr * 2), edge + 4 + pool, 0.8 + abs(wrinkle) * 0.9 + 3 * math.exp(-pool / 6))


sheet(34, 34, blanket, 'Blanket', 1.1)
end('blanket')

# 5. Water bottle -------------------------------------------------------------
start()
revolve([(0, 0), (3.4, 0), (4.1, 0.8), (4.2, 3), (4.2, 18), (3.9, 20.5), (2.3, 23), (1.8, 24.2), (0, 24.2)], 'IvoryCeramic')
cyl((0, 0, 25.4), 2.1, 2.6, 'Graphite', verts=16)
torus((0, 0, 26.2), 1.6, 0.35, 'Graphite', rot=(math.pi / 2, 0, 0), seg=12, minor_seg=5)
cube((0, -4.2, 11), (5, 0.4, 8), 'Paper', 0.1)          # faded hand label
torus((0, 0, 12), 4.35, 0.35, 'Rubber', seg=24, minor_seg=5)
end('bottle')

# 6. Work boots (one standing, one fallen) ------------------------------------
def boot(ox, oy, rz, lie=False):
    base = Matrix.Translation((ox, oy, 0)) @ Matrix.Rotation(rz, 4, 'Z')
    if lie:
        base = base @ Matrix.Translation((0, 0, 6)) @ Matrix.Rotation(1.45, 4, 'Y') @ Matrix.Translation((0, 0, -6))
    made = []
    made.append(cube((0, -2, 1.6), (11.5, 29, 3.2), 'Rubber', 1.2))
    toe = cube((0, -7, 6.5), (10.6, 18, 8), 'Leather', 3.2, segments=3)
    made.append(toe)
    made.append(cube((0, 6, 9), (10.4, 11, 14), 'Leather', 3.0, segments=3))
    made.append(cyl((0, 7, 19), 5.6, 16, 'Leather', verts=18, bevel=1.2))
    made.append(torus((0, 7, 27.2), 5.4, 0.9, 'Leather', seg=18, minor_seg=6))
    for i in range(5):
        made.append(rod((-3.6, -4 + i * 2.6, 10.4 + i * 1.6), (3.6, -4 + i * 2.6, 10.4 + i * 1.6), 0.45, 'Graphite', 6))
    made.append(tube([(3, 0, 24), (6, -5, 22), (5, -9, 15)], 0.4, 'Graphite'))   # loose lace
    for o in made:
        o.matrix_world = base @ o.matrix_world


start()
boot(-8, 0, 0.12)
boot(13, 6, -0.6, lie=True)
end('boots')

# 7. Kettle -----------------------------------------------------------------
start()
revolve([(0, 0.4), (7.5, 0), (9.4, 0.8), (10.6, 4.5), (10.6, 9.5), (9.2, 13.4), (6.4, 15.6), (4.6, 16.1), (4.6, 16.6), (0, 16.6)], 'OchrePaint')
torus((0, 0, 0.6), 7.6, 0.6, 'Graphite', seg=28, minor_seg=6)        # chipped enamel rim
revolve([(0, 19), (1.0, 19), (1.0, 18), (4.2, 17.2), (4.5, 16.4), (0, 16.4)], 'OchrePaint')
sphere((0, 0, 19.6), (1.4, 1.4, 1.2), 'Graphite')
cyl((-11.2, 0, 10.6), 2.6, 9, 'OchrePaint', rot=(0, -0.95, 0), verts=14, r2=1.3)
tube([(5.4, 0, 15.6), (8.5, 0, 23.5), (0, 0, 27.2), (-8.5, 0, 23.5), (-5.4, 0, 15.6)], 0.85, 'Steel')
cyl((0, 0, 26.6), 1.3, 7, 'Wood', rot=(0, math.pi / 2, 0), verts=10)   # wooden grip
end('kettle')

# 8. Bowl and spoon -------------------------------------------------------------
start()
revolve([(0, 0.5), (3.6, 0), (4.6, 0.6), (7.6, 3.4), (8.2, 5.6), (7.6, 5.9), (7.0, 4.0), (3.6, 1.5), (0, 1.5)], 'IvoryCeramic')
torus((0, 0, 5.75), 7.9, 0.28, 'OchrePaint', seg=32, minor_seg=4)     # glaze line
sphere((10.5, -4, 0.9), (2.0, 1.3, 0.45), 'Steel')
rod((11.8, -5.5, 1.1), (19, -11, 2.4), 0.45, 'Steel', 6)
end('bowl')

# 9. Curtain on a wall rail -------------------------------------------------
start()
CW, CH = 200, 228


def curtain(u, v):
    x = (u - 0.5) * CW
    z = v * CH
    gather = 0.55 + 0.45 * (1 - v)
    fold = 4.2 * math.sin(x * 0.17) + 1.8 * math.sin(x * 0.41 + 1.2)
    y = -9 - fold * gather - 1.2 * noise.noise(Vector((x * 0.03, z * 0.03, 0.4)))
    hem = 4 * noise.noise(Vector((x * 0.05, 7.0, 0))) if v < 0.02 else 0
    return (x, y, z + 6 + hem)


def torn(u, v):
    return u > 0.78 and v < 0.12 - (u - 0.78) * 0.35 and noise.noise(Vector((u * 9, v * 9, 1))) > -0.25


sheet(60, 24, curtain, 'WornFabric', 0.6, drop_faces=torn)
rod((-106, -9, CH + 10), (106, -9, CH + 10), 1.4, 'Steel', 10)
for x in (-102, 102):
    cube((x, -4.5, CH + 10), (3, 9, 3), 'Graphite', 0.4)
for i in range(13):
    torus((-96 + i * 16, -9, CH + 8.8), 2.2, 0.35, 'Steel', rot=(0, math.pi / 2, 0), seg=12, minor_seg=4)
end('curtain')

# 10. Work lamp --------------------------------------------------------------
start()
cyl((0, 0, 1.6), 8, 3.2, 'Graphite', verts=24, bevel=0.8)
cyl((0, 0, 3.8), 2.2, 1.4, 'Steel', verts=12)
rod((0, 0, 4), (-6, 0, 24), 0.9, 'Steel')
sphere((-6, 0, 24), (1.6, 1.6, 1.6), 'Graphite')
rod((-6, 0, 24), (6, -2, 36), 0.9, 'Steel')
sphere((6, -2, 36), (1.4, 1.4, 1.4), 'Graphite')
shade = revolve([(2.4, 6.5), (3.2, 5.8), (6.8, 1.0), (7.2, 0)], 'OchrePaint', cap_bottom=False, segments=24)
inner = revolve([(7.0, 0.05), (6.6, 1.0), (3.0, 5.6), (2.2, 6.2)], 'IvoryCeramic', cap_bottom=False, segments=24)
bulb = sphere((0, 0, 1.6), (2.4, 2.4, 2.6), 'AmberGlow')
lamp_tip = Matrix.Translation((9, -3.5, 33)) @ Matrix.Rotation(-2.3, 4, 'Y') @ Matrix.Rotation(0.25, 4, 'X')
for o in (shade, inner, bulb):
    o.matrix_world = lamp_tip @ o.matrix_world
tube([(4, 3, 2.5), (10, 9, 0.6), (22, 14, 0.6), (30, 9, 0.6)], 0.5, 'Rubber')     # power lead
light_at = lamp_tip @ Vector((0, 0, 1.6))
end('lamp', anchors={'Light': tuple(light_at)})

# 11. Battery case ------------------------------------------------------------
start()
cube((0, 0, 17), (58, 38, 34), 'Graphite', 2.2, segments=3)
cube((0, 0, 17), (58.6, 38.6, 5), 'OchrePaint', 0.6)
cube((0, -19.3, 26), (22, 0.6, 7), 'Paper', 0.1)
for x in (-31, 31):
    tube([(x, -9, 22), (x - 2 * math.copysign(1, x), -9, 27), (x - 2 * math.copysign(1, x), 9, 27), (x, 9, 22)], 1.1, 'Rubber')
for x in (-20, 20):
    cube((x, -19.6, 31), (6, 1.6, 4), 'Steel', 0.3)
cube((14, -19.4, 8), (9, 0.5, 3), 'AmberGlow', 0.1)                 # charge window, still faintly lit
for x in (-8, 8):
    cyl((x, 4, 35.5), 1.8, 3, 'Steel', verts=10)
torus((0, 2, 35.2), 9, 1.0, 'Rubber', seg=24, minor_seg=6)          # coiled lead on the lid
end('battery_case')

# 12. Toolbox --------------------------------------------------------------
start()
cube((0, 0, 9), (50, 22, 18), 'OchrePaint', 1.0)
lid = cube((0, 0, 20.5), (50.4, 22.4, 5), 'OchrePaint', 1.0)
lid.matrix_world = Matrix.Translation((0, 11.2, 18)) @ Matrix.Rotation(-0.12, 4, 'X') @ Matrix.Translation((0, -11.2, -18)) @ lid.matrix_world
tube([(-12, 0, 23), (-12, 0, 28), (12, 0, 28), (12, 0, 23)], 0.9, 'Steel')
for x in (-21, 21):
    cube((x, -11.4, 16.5), (4, 1.2, 4), 'Steel', 0.3)
cube((0, -11.2, 6), (46, 0.6, 1.2), 'Graphite', 0.1)
rod((-20, -6, 0.8), (-6, -16, 0.8), 0.7, 'Steel', 8)                # wrench on the floor beside it
cube((-4.5, -17.4, 0.8), (3.6, 1.2, 1.4), 'Steel', 0.3, rot=(0, 0, -0.6))
rod((8, -16, 1.2), (22, -20, 1.2), 0.35, 'Steel', 6)                 # screwdriver
cyl((6, -15.4, 1.4), 1.3, 7, 'OchrePaint', rot=(0, math.pi / 2, 0.28), verts=8)
end('toolbox')

# 13. Seedling tray -----------------------------------------------------------
start()
cube((0, 0, 3.6), (60, 40, 7.2), 'Graphite', 0.8)
cube((0, 0, 6.6), (56, 36, 1.2), 'Soil', 0.3)
sheet(18, 12, lambda u, v: ((u - 0.5) * 55, (v - 0.5) * 35, 7.4 + 0.6 * noise.noise(Vector((u * 6, v * 6, 2)))), 'Soil', 0.4)
for i in range(34):
    x, y = random.uniform(-25, 25), random.uniform(-15, 15)
    wilt = random.random() < 0.35
    h = random.uniform(3, 7) * (0.6 if wilt else 1)
    tip = (x + (4 if wilt else random.uniform(-1, 1)), y + (2 if wilt else 0), 7.6 + h)
    tube([(x, y, 7.4), ((x + tip[0]) / 2, y, 7.6 + h * 0.8), tip], 0.22, 'Leaf', resolution=3)
    for s in (-1, 1):
        sphere((tip[0] + s * 1.4, tip[1], tip[2] + (-0.8 if wilt else 0.3)), (1.6, 0.8, 0.18), 'Leaf',
               rot=(0, s * (0.9 if wilt else 0.35), random.uniform(0, 3)), seg=8, rings=4)
end('plant_tray')

# 14. Stool -----------------------------------------------------------------
start()
cyl((0, 0, 45), 17, 4, 'Wood', verts=28, bevel=1.2)
cyl((0, 0, 42.4), 9, 1.6, 'Graphite', verts=16)
for i in range(3):
    a = i * 2 * math.pi / 3 + 0.3
    rod((math.cos(a) * 7, math.sin(a) * 7, 42), (math.cos(a) * 17, math.sin(a) * 17, 1.5), 1.1, 'Steel')
    cyl((math.cos(a) * 17, math.sin(a) * 17, 1.0), 1.7, 2, 'Rubber', verts=10)
torus((0, 0, 16), 13.4, 0.7, 'Steel', seg=28, minor_seg=6)
cube((4, -3, 47.4), (8, 6, 0.6), 'Paper', 0.1, rot=(0, 0, 0.5))      # a note left on the seat
end('stool')

# 15. Workbench -------------------------------------------------------------
start()
BL, BDp, BH = 180, 72, 88
cube((0, 0, BH - 2.5), (BL, BDp, 5), 'Wood', 1.0)
for x in (-BL / 2 + 4, BL / 2 - 4):
    for y in (-BDp / 2 + 4, BDp / 2 - 4):
        cube((x, y, (BH - 5) / 2), (5, 5, BH - 5), 'Graphite', 0.6)
cube((0, 0, 18), (BL - 8, BDp - 8, 2.2), 'Steel', 0.5)
for y in (-BDp / 2 + 4, BDp / 2 - 4):
    cube((0, y, 18), (BL - 8, 3, 3), 'Graphite', 0.4)
cube((0, BDp / 2 - 1.5, BH + 32), (BL, 3, 60), 'Graphite', 0.8)     # back board
for i in range(9):
    for j in range(4):
        cyl((-80 + i * 20, BDp / 2 - 3.2, BH + 10 + j * 13), 0.8, 0.6, 'Steel', rot=(math.pi / 2, 0, 0), verts=6)
cube((BL / 2 - 26, 0, 46), (40, BDp - 12, 50), 'OchrePaint', 1.0)     # drawer unit
for z in (30, 46, 62):
    cube((BL / 2 - 26, -BDp / 2 + 5.6, z), (36, 0.6, 13.5), 'OchrePaint', 0.2)
    cube((BL / 2 - 26, -BDp / 2 + 4.6, z + 3), (12, 1.6, 1.6), 'Steel', 0.3)
cube((-BL / 2 + 16, -BDp / 2 + 10, BH + 6), (16, 14, 8), 'Steel', 0.8)   # vise
cube((-BL / 2 + 16, -BDp / 2 + 1, BH + 7), (16, 3, 10), 'Steel', 0.5)
rod((-BL / 2 + 8, -BDp / 2 - 1, BH + 5), (-BL / 2 + 24, -BDp / 2 - 1, BH + 5), 0.6, 'Steel')
rod((-30, BDp / 2 - 5, BH + 52), (-30, BDp / 2 - 5, BH + 22), 0.6, 'Steel')   # hanging wrench
cube((-30, BDp / 2 - 5, BH + 20), (3.6, 1.2, 4), 'Steel', 0.3)
rod((-10, BDp / 2 - 5, BH + 50), (-14, BDp / 2 - 5, BH + 26), 1.0, 'Wood')     # hammer
cube((-14.5, BDp / 2 - 5, BH + 24), (8, 3, 3), 'Steel', 0.4)
cube((20, -6, BH + 0.4), (30, 22, 0.4), 'Paper', 0.1, rot=(0, 0, 0.18))  # spread schematic
end('workbench')

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='DESELECT')
for root in PROPS.values():
    root.select_set(True)
    for c in root.children:
        c.select_set(True)
glb = OUT / 'interior-props.glb'
kwargs = dict(filepath=str(glb), use_selection=True, export_format='GLB', export_apply=True, export_animations=False)
try:
    bpy.ops.export_scene.gltf(**kwargs, export_vertex_color='ACTIVE')
except TypeError:
    bpy.ops.export_scene.gltf(**kwargs, export_colors=True)

manifest = {}
for name, root in PROPS.items():
    meshes = [c for c in root.children if c.type == 'MESH']
    pts = [c.matrix_world @ Vector(b) for c in meshes for b in c.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    manifest[name] = {
        'materials': sorted(c.data.materials[0].name for c in meshes),
        'triangles': sum(sum(len(p.vertices) - 2 for p in c.data.polygons) for c in meshes),
        'size_game_units': [round(hi[0] - lo[0], 1), round(hi[2] - lo[2], 1), round(hi[1] - lo[1], 1)],
    }
(OUT / 'props-manifest.json').write_text(json.dumps(manifest, indent=2))
(OUT / 'provenance.json').write_text(json.dumps({
    'source': 'tools/build-interior-props.py', 'author': 'Original procedural Blender models for this project',
    'license': 'Same as the project', 'third_party_assets': None}, indent=2))

# ---------------------------------------------------------------- contact sheet
cols = 5
for i, (name, root) in enumerate(PROPS.items()):
    root.location = ((i % cols) * 230 - 460, (i // cols) * 230, 0)
    if name == 'blanket':
        root.location.x += 0
scene = bpy.context.scene
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1800, 1100
scene.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('Studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.035, 0.04, 1)
scene.world = world
bpy.ops.mesh.primitive_plane_add(size=4000, location=(0, 0, 0))
floor = bpy.context.object
fm = bpy.data.materials.new('Floor')
fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.09, 0.1, 0.1, 1)
floor.data.materials.append(fm)
for loc, energy, color in [((-600, -900, 900), 9e7, (1, 0.82, 0.62)), ((800, -300, 500), 3e7, (0.6, 0.75, 1)), ((0, 900, 700), 2e7, (1, 1, 1))]:
    ld = bpy.data.lights.new('key', 'POINT')
    ld.energy, ld.color, ld.shadow_soft_size = energy, color, 60
    lo = bpy.data.objects.new('key', ld)
    lo.location = loc
    scene.collection.objects.link(lo)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.location = (0, -1150, 820)
scene.collection.objects.link(cam)
cam.rotation_euler = (Vector((0, 230, 40)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.lens = 38
cam.data.clip_start, cam.data.clip_end = 5, 20000
scene.camera = cam
scene.render.filepath = str(ART / 'contact-sheet.png')
bpy.ops.render.render(write_still=True)
print('INTERIOR_PROPS_COMPLETE', json.dumps({k: v['triangles'] for k, v in manifest.items()}))
