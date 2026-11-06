"""Природа schoolquest: oak, pine, flowers, mushroom, rock, bush, cloud, butterfly, grass."""
import sys, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def init_mats():
    """Пересоздаёт материалы после reset_scene (глобалы висят мёртвыми)."""
    global LEAF1, LEAF2, LEAF3, BARK, BARK_D, APPLE
    LEAF1 = mat("leaf1", (0.16, 0.50, 0.24))
    LEAF2 = mat("leaf2", (0.20, 0.60, 0.30))
    LEAF3 = mat("leaf3", (0.25, 0.68, 0.36))
    BARK = mat("bark", (0.42, 0.30, 0.16))
    BARK_D = mat("bark_dark", (0.34, 0.23, 0.12))
    APPLE = mat("apple", (0.85, 0.20, 0.18))


def finish(root, meshes, name):
    for o in meshes:
        if o.parent is None:
            o.parent = root
    export_glb(f"{OUT_DIR}/nat_{name}.glb", [root] + meshes)
    preview(f"/tmp/prev_nat_{name}.png", meshes, size=2.2)
    print("OK", name)


def oak():
    root = empty("Root")
    meshes = []
    trunk = cyl("Trunk", (0, 0, 0.75), 0.16, 0.26, 1.5, BARK, seg=14)
    meshes.append(trunk)
    # ветви
    for i, a in enumerate((0.4, 2.2, 4.0)):
        br = cyl(f"Branch{i}", (math.sin(a) * 0.35, math.cos(a) * 0.35, 1.55),
                 0.06, 0.10, 0.9, BARK_D, rot=(math.pi / 3.2, a, 0), seg=10)
        meshes.append(br)
    # корни
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        r = uv(f"Root{i}", (math.sin(a) * 0.30, math.cos(a) * 0.30, 0.10),
               (0.06, 0.16, 0.07), BARK_D, 12, 8)
        r.rotation_euler[2] = -a
        meshes.append(r)
    # крона из пушистых кластеров
    blobs = [(0, 0, 2.15, 0.75, LEAF1), (0.55, 0.15, 1.85, 0.55, LEAF2),
             (-0.55, -0.1, 1.90, 0.55, LEAF2), (0.1, -0.5, 1.95, 0.5, LEAF3),
             (-0.15, 0.5, 1.9, 0.5, LEAF3), (0.05, 0.05, 2.6, 0.5, LEAF2)]
    for i, (x, y, z, r, m) in enumerate(blobs):
        # низкополигональная неровность: икосфера
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, z))
        o = bpy.context.active_object
        o.name = f"Leaf{i}"
        smooth(o)
        o.data.materials.append(m)
        meshes.append(o)
    # яблоки
    for i, (x, y, z) in enumerate(((0.45, -0.35, 1.9), (-0.5, 0.3, 2.0), (0.1, 0.55, 1.85))):
        meshes.append(uv(f"Apple{i}", (x, y, z), (0.07, 0.07, 0.075), APPLE, 14, 10))
    finish(root, meshes, "oak")


def pine():
    root = empty("Root")
    meshes = []
    meshes.append(cyl("Trunk", (0, 0, 0.55), 0.12, 0.19, 1.1, BARK_D, seg=12))
    layers = [(1.35, 0.85, 1.1, LEAF1), (2.05, 0.65, 0.95, LEAF2), (2.7, 0.45, 0.85, LEAF3)]
    for i, (z, r, h, m) in enumerate(layers):
        c = cone(f"Needles{i}", (0, 0, z), r, h, m, seg=14)
        meshes.append(c)
    for i in range(3):
        a = i * 2.1
        r = uv(f"Root{i}", (math.sin(a) * 0.22, math.cos(a) * 0.22, 0.08),
               (0.05, 0.12, 0.06), BARK_D, 12, 8)
        r.rotation_euler[2] = -a
        meshes.append(r)
    finish(root, meshes, "pine")


def flower(petal, name):
    STEM = mat("stem", (0.22, 0.55, 0.28))
    CENTER = mat("center", (0.95, 0.78, 0.25))
    PETAL = mat("petal", petal)
    root = empty("Root")
    meshes = []
    meshes.append(cyl("Stem", (0, 0, 0.16), 0.018, 0.025, 0.32, STEM, seg=8))
    # листики
    for side in (-1, 1):
        lf = uv(f"Leaf{side}", (side * 0.05, 0, 0.12), (0.06, 0.015, 0.03), STEM, 10, 8)
        lf.rotation_euler[1] = side * 0.5
        meshes.append(lf)
    meshes.append(uv("Center", (0, 0, 0.34), (0.055, 0.055, 0.045), CENTER, 14, 10))
    for i in range(6):
        a = i * math.pi / 3
        p = uv(f"Petal{i}", (math.sin(a) * 0.09, math.cos(a) * 0.09, 0.33),
               (0.055, 0.04, 0.018), PETAL, 12, 8)
        p.rotation_euler[2] = -a
        meshes.append(p)
    finish(root, meshes, name)


def shroom():
    STIPE = mat("stipe", (0.95, 0.90, 0.82))
    CAP = mat("cap", (0.85, 0.20, 0.16))
    DOTS = mat("dots", (0.97, 0.97, 0.95))
    root = empty("Root")
    meshes = []
    meshes.append(cyl("Stipe", (0, 0, 0.16), 0.09, 0.12, 0.32, STIPE, seg=14))
    cap = uv("Cap", (0, 0, 0.36), (0.24, 0.24, 0.13), CAP, 24, 14)
    meshes.append(cap)
    for i, (x, y, z, r) in enumerate(((0.1, 0.08, 0.44, 0.035), (-0.09, -0.05, 0.46, 0.03),
                                      (0.02, -0.12, 0.42, 0.025), (-0.12, 0.1, 0.40, 0.028))):
        meshes.append(uv(f"Dot{i}", (x, y, z), (r, r, r * 0.6), DOTS, 10, 8))
    finish(root, meshes, "shroom")


def rock():
    STONE = mat("stone", (0.58, 0.60, 0.65))
    STONE_D = mat("stone_d", (0.48, 0.50, 0.56))
    root = empty("Root")
    meshes = []
    for i, (x, y, z, r, m) in enumerate(((0, 0, 0.16, 0.26, STONE),
                                         (0.2, 0.1, 0.12, 0.17, STONE_D),
                                         (-0.18, 0.12, 0.10, 0.14, STONE_D))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, z))
        o = bpy.context.active_object
        o.name = f"Rock{i}"
        o.scale.z = 0.7
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        o.rotation_euler = (0.3 * i, 0.5 * i, 0.2 * i)
        o.data.materials.append(m)
        meshes.append(o)
    finish(root, meshes, "rock")


def bush():
    root = empty("Root")
    meshes = []
    for i, (x, y, z, r, m) in enumerate(((0, 0, 0.28, 0.32, LEAF1),
                                         (0.26, 0.1, 0.22, 0.24, LEAF2),
                                         (-0.25, -0.05, 0.20, 0.22, LEAF2),
                                         (0.05, -0.2, 0.24, 0.2, LEAF3))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, z))
        o = bpy.context.active_object
        o.name = f"Bush{i}"
        smooth(o)
        o.data.materials.append(m)
        meshes.append(o)
    finish(root, meshes, "bush")


def cloud():
    WHITE = mat("cloud", (0.98, 0.99, 1.0))
    root = empty("Root")
    meshes = []
    for i, (x, y, z, r) in enumerate(((0, 0, 0, 0.55), (0.6, 0.1, 0.05, 0.4),
                                      (-0.6, -0.05, 0, 0.42), (0.15, -0.35, -0.08, 0.38),
                                      (-0.2, 0.35, -0.05, 0.36))):
        meshes.append(uv(f"Puff{i}", (x, y, z), (r, r * 0.85, r * 0.7), WHITE, 20, 14))
    finish(root, meshes, "cloud")


def butterfly():
    BODY = mat("bbody", (0.15, 0.10, 0.08))
    WING = mat("bwing", (1.0, 0.55, 0.65))
    WING2 = mat("bwing2", (0.65, 0.35, 0.55))
    root = empty("Root")
    meshes = []
    meshes.append(capsule("Body", (0, 0, 0), 0.02, 0.14, BODY, rot=(math.pi / 2, 0, 0), seg=10))
    for side, x in (("L", -1), ("R", 1)):
        w = empty(f"Wing{side}", (0, 0, 0.02), root)
        up = uv(f"WingUp{side}", (x * 0.10, 0, 0.05), (0.11, 0.075, 0.012), WING, 14, 10)
        dn = uv(f"WingDn{side}", (x * 0.08, 0, -0.05), (0.085, 0.06, 0.010), WING2, 12, 8)
        for o in (up, dn):
            o.parent = w
            meshes.append(o)
    finish(root, meshes, "butterfly")


def grass_tuft():
    G1 = mat("grass1", (0.28, 0.62, 0.30))
    G2 = mat("grass2", (0.35, 0.70, 0.34))
    root = empty("Root")
    meshes = []
    for i in range(8):
        a = i * 0.785
        h = 0.26 + (i % 3) * 0.08
        tilt = 0.12 if i % 2 else 0.22
        blade = cone(f"Blade{i}", (math.sin(a) * 0.035, math.cos(a) * 0.035, h / 2),
                     0.02, h, G1 if i % 2 else G2, rot=(math.sin(a) * tilt, math.cos(a) * tilt, 0), seg=6)
        meshes.append(blade)
    finish(root, meshes, "grass")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for fn in (oak, pine,
               lambda: flower((0.95, 0.40, 0.60), "flower_pink"),
               lambda: flower((0.95, 0.60, 0.25), "flower_orange"),
               lambda: flower((0.75, 0.50, 0.95), "flower_violet"),
               lambda: flower((0.95, 0.85, 0.35), "flower_yellow"),
               shroom, rock, bush, cloud, butterfly, grass_tuft):
        reset_scene()
        init_mats()
        fn()


main()
