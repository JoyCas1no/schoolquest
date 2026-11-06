"""Общие помощники для генерации моделей schoolquest в Blender.

Запуск: blender -b -P gen_xxx.py
Модели строятся в метрах, персонажи смотрят в -Y (после экспорта в glTF -> +Z).
"""
import bpy
import math
import os
from mathutils import Vector

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "models")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=0.8, metallic=0.0, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)  # цвет для Workbench-превью
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 4.0
    return m


def smooth(obj):
    if obj.type == "MESH":
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def bevel(obj, width=0.02, segments=2):
    mod = obj.modifiers.new("soft", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    return obj


def _primitive_add(fn, *args, **kw):
    fn(*args, **kw)
    return bpy.context.active_object


def uv(name, loc, scale, material, seg=24, rings=16):
    """Сфера со скейлом (rx, ry, rz)."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=seg, ring_count=rings, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(o)
    o.data.materials.append(material)
    return o


def capsule(name, loc, radius, depth, material, rot=(0, 0, 0), seg=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=seg, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    smooth(o)
    bevel(o, radius * 0.95, 3)
    return o


def cube(name, loc, scale, material, rot=(0, 0, 0), bev=0.02):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bev:
        bevel(o, bev, 2)
    o.data.materials.append(material)
    return o


def cyl(name, loc, r1, r2, depth, material, rot=(0, 0, 0), seg=20):
    bpy.ops.mesh.primitive_cone_add(
        vertices=seg, radius1=r1, radius2=r2, depth=depth,
        location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    smooth(o)
    bevel(o, min(r1, r2) * 0.15, 2)
    return o


def cone(name, loc, r, depth, material, rot=(0, 0, 0), seg=16):
    return cyl(name, loc, r, 0.004, depth, material, rot, seg)


def torus(name, loc, major, minor, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor,
        major_segments=20, minor_segments=8,
        location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    smooth(o)
    return o


def empty(name, loc=(0, 0, 0), parent=None, display="PLAIN_AXES", size=0.1):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.empty_display_type = display
    o.empty_display_size = size
    o.location = loc
    if parent:
        o.parent = parent
    return o


def parent_to(objs, parent):
    for o in objs:
        o.parent = parent
    return parent


def metabody(name, parts, voxel=0.02, material=None, zones=None):
    """Сплавляет эллипсоиды [(x,y,z,sx,sy,sz),...] в единую органическую сетку.

    zones: [(material, (dx,dy,dz), thresh, max_z)] — полигоны, нормаль которых
    смотрит в направлении dir с cos > thresh и центр ниже max_z, получают
    свой материал (например жёлтое брюхо).
    """
    mb = bpy.data.metaballs.new(name)
    mb.resolution = voxel
    mb.render_resolution = voxel
    mb.threshold = 0.7
    for (x, y, z, sx, sy, sz) in parts:
        e = mb.elements.new()
        e.co = (x, y, z)
        e.type = 'ELLIPSOID'
        e.size_x = sx
        e.size_y = sy
        e.size_z = sz
        e.stiffness = 2.0
    o = bpy.data.objects.new(name, mb)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object  # convert заменяет объект
    o.name = name
    mod = o.modifiers.new("remesh", "REMESH")
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel * 0.8
    bpy.ops.object.modifier_apply(modifier="remesh")
    bpy.ops.object.shade_smooth()
    o.select_set(False)
    if material:
        o.data.materials.append(material)
    if zones:
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = o.evaluated_get(dg).to_mesh() if False else o.data
        for (matz, dirv, thr, maxz) in zones:
            o.data.materials.append(matz)
            idx = len(o.data.materials) - 1
            d = Vector(dirv).normalized()
            for p in o.data.polygons:
                c = p.center
                if c.z < maxz and p.normal.dot(d) > thr:
                    p.material_index = idx
    return o


def export_glb(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    seen = set()
    def sel(o):
        if o.name in seen:
            return
        seen.add(o.name)
        o.select_set(True)
        for c in o.children:
            sel(c)
    for o in objects:
        sel(o)
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_materials="EXPORT",
    )


def preview(path, objects, size=2.0):
    """Рендер-превью Workbench для самопроверки (авторамка по bbox)."""
    import mathutils
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objects:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            mn = mathutils.Vector(map(min, mn, w))
            mx = mathutils.Vector(map(max, mx, w))
    center = (mn + mx) / 2
    dim = (mx - mn)
    maxd = max(dim.x, dim.y, dim.z, 0.4)
    dist = maxd * 2.0
    direction = mathutils.Vector((0.5, -1.0, 0.38))
    direction.normalize()
    bpy.ops.object.camera_add(location=center + direction * dist)
    camera = bpy.context.active_object
    camera.data.lens = 55
    bpy.context.scene.camera = camera
    look = center - camera.location
    camera.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_shadows = True
    sc.display.shading.show_cavity = True
    world = bpy.data.worlds.new("W")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.92, 0.95, 1)
    sc.world = world
    sc.render.resolution_x = 640
    sc.render.resolution_y = 640
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
