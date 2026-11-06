"""Органические монстры (метаболлы): mouse, fox, owl, dragon -> GLB."""
import sys, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *


def finish(root, meshes, name):
    for o in meshes:
        if o.parent is None:
            o.parent = root
    export_glb(f"{OUT_DIR}/mon_{name}.glb", [root] + meshes)
    preview(f"/tmp/prev_mon_{name}.png", meshes, size=1.4)
    print("OK", name)


def eye_set(root, meshes, x, y, z, r, iris=None):
    WHITE = mat("eye_white", (0.98, 0.98, 0.98), rough=0.25)
    PUP = mat("eye_pupil", (0.02, 0.02, 0.03), rough=0.2)
    w = uv("EyeW", (x, y, z), (r, r * 0.9, r), WHITE, 20, 14)
    meshes.append(w)
    if iris:
        IM = mat("eye_iris", iris, rough=0.3)
        meshes.append(uv("EyeI", (x, y - r * 0.6, z), (r * 0.55, r * 0.25, r * 0.55), IM, 14, 10))
    meshes.append(uv("EyeP", (x, y - r * 0.75, z), (r * 0.4, r * 0.2, r * 0.4), PUP, 12, 8))
    meshes.append(uv("EyeH", (x - r * 0.3, y - r * 0.82, z + r * 0.35),
                     (r * 0.15, r * 0.08, r * 0.15), WHITE, 8, 6))


def mouse():
    GRAY = mat("mouse", (0.60, 0.63, 0.71))
    CREAM = mat("mouse_belly", (0.82, 0.84, 0.90))
    PINK = mat("mouse_pink", (0.93, 0.60, 0.70))
    PINK_D = mat("mouse_pink2", (0.88, 0.48, 0.60))
    DARK = mat("mouse_dark", (0.35, 0.38, 0.46))
    root = empty("Root")
    meshes = []
    parts = [
        (0, 0.02, 0.45, 0.30, 0.36, 0.38),      # тело-груша
        (0, -0.10, 0.42, 0.26, 0.26, 0.30),     # грудь
        (0, -0.16, 0.88, 0.24, 0.22, 0.22),     # голова
        (0, -0.34, 0.82, 0.14, 0.12, 0.11),     # мордочка
        (0, 0.02, 0.24, 0.28, 0.30, 0.22),      # бёдра сидя
        (-0.16, -0.18, 0.14, 0.10, 0.13, 0.08), # ступни
        (0.16, -0.18, 0.14, 0.10, 0.13, 0.08),
        (-0.24, -0.16, 0.52, 0.06, 0.07, 0.13), # передние лапки
        (0.24, -0.16, 0.52, 0.06, 0.07, 0.13),
        (-0.26, -0.22, 0.42, 0.055, 0.06, 0.055),
        (0.26, -0.22, 0.42, 0.055, 0.06, 0.055),
    ]
    body = metabody("MouseBody", parts, voxel=0.013, material=GRAY,
                    zones=[(CREAM, (0, -0.6, -0.55), 0.30, 0.50)])
    meshes.append(body)
    # уши: плоские сферы (отдельно — метаболл сделал бы толстыми)
    for side, x in (("L", -0.16), ("R", 0.16)):
        ear = uv(f"Ear{side}", (x, -0.06, 1.06), (0.13, 0.045, 0.15), GRAY, 20, 14)
        inner = uv(f"EarIn{side}", (x, -0.10, 1.06), (0.09, 0.02, 0.11), PINK, 16, 10)
        meshes += [ear, inner]
    meshes.append(uv("Nose", (0, -0.455, 0.84), (0.045, 0.03, 0.04), PINK_D, 14, 10))
    eye_set(root, meshes, -0.105, -0.375, 0.94, 0.078)
    eye_set(root, meshes, 0.105, -0.375, 0.94, 0.078)
    for side in (-1, 1):
        b = cube(f"Brow{side}", (side * 0.105, -0.36, 1.0), (0.09, 0.02, 0.02), DARK, bev=0.008)
        meshes.append(b)
        for i in range(3):
            w = cyl(f"Wh{side}{i}", (side * 0.22, -0.42, 0.83 + (i - 1) * 0.035),
                    0.004, 0.004, 0.2, mat("whisk", (0.9, 0.91, 0.95)),
                    rot=(math.pi / 2, side * (0.2 - i * 0.15), 0), seg=6)
            meshes.append(w)
        meshes.append(uv(f"Paw{side}", (side * 0.26, -0.25, 0.40), (0.055, 0.06, 0.05), PINK, 12, 8))
        meshes.append(uv(f"Foot{side}", (side * 0.17, -0.28, 0.10), (0.08, 0.11, 0.045), PINK, 12, 8))
    # хвост
    cu = bpy.data.curves.new("Tail", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.026
    cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    pts = [(0, 0.32, 0.28), (0.18, 0.48, 0.16), (0.10, 0.60, 0.06), (0.25, 0.66, 0.12)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    tail = bpy.data.objects.new("Tail", cu)
    bpy.context.collection.objects.link(tail)
    tail.data.materials.append(PINK_D)
    meshes.append(tail)
    finish(root, meshes, "mouse")


def fox():
    ORANGE = mat("fox", (0.90, 0.46, 0.15))
    ORANGE_D = mat("fox_dark", (0.80, 0.38, 0.11))
    WHITE = mat("fox_white", (0.97, 0.93, 0.85))
    DARK = mat("fox_nose", (0.10, 0.07, 0.05))
    root = empty("Root")
    meshes = []
    parts = [
        (0, 0.06, 0.52, 0.23, 0.40, 0.25),       # тело
        (0, -0.16, 0.50, 0.19, 0.24, 0.23),      # грудь
        (0, -0.26, 0.88, 0.19, 0.18, 0.17),      # голова
        (0, -0.44, 0.82, 0.11, 0.14, 0.10),      # морда
        (-0.14, -0.20, 0.30, 0.06, 0.07, 0.17),  # передние ноги
        (0.14, -0.20, 0.30, 0.06, 0.07, 0.17),
        (-0.15, 0.28, 0.32, 0.08, 0.09, 0.17),   # задние ноги
        (0.15, 0.28, 0.32, 0.08, 0.09, 0.17),
        (-0.14, -0.23, 0.07, 0.065, 0.10, 0.05), # лапы
        (0.14, -0.23, 0.07, 0.065, 0.10, 0.05),
        (-0.16, 0.30, 0.08, 0.075, 0.11, 0.06),
        (0.16, 0.30, 0.08, 0.075, 0.11, 0.06),
        (0, 0.44, 0.68, 0.15, 0.19, 0.14),       # хвост: пышный, загнут вверх
        (0, 0.60, 0.80, 0.13, 0.17, 0.12),
        (0, 0.74, 0.90, 0.11, 0.14, 0.10),
    ]
    body = metabody("FoxBody", parts, voxel=0.013, material=ORANGE,
                    zones=[(WHITE, (0, -0.6, -0.5), 0.35, 0.62)])
    meshes.append(body)
    # белый кончик хвоста
    tip = uv("TailTip", (0, 0.85, 0.98), (0.09, 0.13, 0.08), WHITE, 16, 10)
    meshes.append(tip)
    meshes.append(uv("Nose", (0, -0.575, 0.845), (0.038, 0.028, 0.032), DARK, 12, 8))
    for side, x in (("L", -0.11), ("R", 0.11)):
        ear = cone(f"Ear{side}", (x, -0.20, 1.06), 0.085, 0.22, ORANGE_D, rot=(-0.15, x * 1.5, 0), seg=12)
        inner = cone(f"EarIn{side}", (x, -0.235, 1.04), 0.05, 0.13,
                     mat("fox_ear", (0.94, 0.62, 0.58)), rot=(-0.15, x * 1.5, 0), seg=10)
        meshes += [ear, inner]
    eye_set(root, meshes, -0.09, -0.415, 0.92, 0.06)
    eye_set(root, meshes, 0.09, -0.415, 0.92, 0.06)
    for side in (-1, 1):
        b = cube(f"Brow{side}", (side * 0.09, -0.425, 1.0), (0.08, 0.02, 0.02), ORANGE_D, bev=0.008)
        meshes.append(b)
    finish(root, meshes, "fox")


def owl():
    BROWN = mat("owl", (0.52, 0.33, 0.18))
    CREAM = mat("owl_cream", (0.85, 0.72, 0.52))
    BROWN_D = mat("owl_dark", (0.38, 0.23, 0.12))
    YELLOW = mat("owl_yellow", (1.0, 0.68, 0.20), rough=0.4)
    root = empty("Root")
    meshes = []
    parts = [
        (0, 0, 0.60, 0.32, 0.28, 0.42),
        (0, -0.04, 0.42, 0.28, 0.24, 0.28),
        (0, -0.02, 0.94, 0.26, 0.24, 0.20),
    ]
    body = metabody("OwlBody", parts, voxel=0.016, material=BROWN,
                    zones=[(CREAM, (0, -0.65, -0.6), 0.30, 0.72)])
    meshes.append(body)
    # перья на брюшке
    for i in range(3):
        for j in range(2):
            d = uv(f"F{i}{j}", ((i - 1) * 0.11, -0.315, 0.52 - j * 0.15),
                   (0.04, 0.02, 0.055), mat("owl_f", (0.68, 0.53, 0.33)), 10, 8)
            meshes.append(d)
    eye_set(root, meshes, -0.13, -0.235, 0.80, 0.115, iris=(0.95, 0.65, 0.15))
    eye_set(root, meshes, 0.13, -0.235, 0.80, 0.115, iris=(0.95, 0.65, 0.15))
    for side in (-1, 1):
        b = cube(f"Brow{side}", (side * 0.13, -0.31, 0.93), (0.13, 0.025, 0.03), BROWN_D, bev=0.01)
        b.rotation_euler[1] = math.radians(17) * side
        meshes.append(b)
        t = cone(f"Tuft{side}", (side * 0.15, -0.04, 1.12), 0.06, 0.18, BROWN_D,
                 rot=(0, side * 0.5, 0), seg=8)
        meshes.append(t)
    meshes.append(cone("Beak", (0, -0.325, 0.71), 0.068, 0.17, YELLOW,
                       rot=(math.pi / 2 + 0.35, 0, 0), seg=10))
    # крылья с пивотами: сегменты перекрываются, без разрывов
    for side, x in (("L", -0.28), ("R", 0.28)):
        w = empty(f"Wing{side}", (x, 0, 0.80), root)
        wm = uv(f"WingM{side}", (x * 0.22, 0.02, -0.13), (0.13, 0.18, 0.26), BROWN_D, 20, 14)
        tip = uv(f"WingT{side}", (x * 0.30, 0, -0.36), (0.10, 0.14, 0.18), BROWN, 16, 10)
        for k in range(3):
            f = cone(f"WingF{side}{k}", (x * 0.32, -0.02, -0.50 - k * 0.03),
                     0.034, 0.16, BROWN_D, rot=(0.3 + k * 0.2, 0, 0), seg=6)
            f.parent = w
            meshes.append(f)
        wm.parent = w
        tip.parent = w
        meshes += [wm, tip]
    # лапы
    for side, x in (("L", -0.10), ("R", 0.10)):
        meshes.append(cone(f"Leg{side}", (x, -0.03, 0.10), 0.05, 0.15, YELLOW, seg=8))
        for i in range(3):
            meshes.append(cone(f"Claw{side}{i}", (x + (i - 1) * 0.05, -0.11, 0.03), 0.017,
                               0.065, BROWN_D, rot=(math.pi / 2 + 0.25, 0, 0), seg=6))
    finish(root, meshes, "owl")


def dragon():
    GREEN = mat("dragon", (0.30, 0.62, 0.34))
    GREEN_D = mat("dragon_dark", (0.22, 0.50, 0.27))
    YELLOW = mat("dragon_belly", (0.94, 0.77, 0.34))
    CREAM = mat("dragon_horn", (0.92, 0.87, 0.70))
    root = empty("Root")
    meshes = []
    parts = [
        (0, 0, 0.60, 0.28, 0.34, 0.34),
        (0, -0.18, 0.58, 0.24, 0.24, 0.28),
        (0, -0.20, 1.04, 0.19, 0.19, 0.17),
        (0, -0.38, 0.98, 0.11, 0.15, 0.10),
        (-0.18, -0.06, 0.28, 0.075, 0.09, 0.17),
        (0.18, -0.06, 0.28, 0.075, 0.09, 0.17),
        (-0.19, -0.11, 0.08, 0.07, 0.10, 0.05),
        (0.19, -0.11, 0.08, 0.07, 0.10, 0.05),
        (0, 0.36, 0.50, 0.09, 0.16, 0.09),
        (0, 0.52, 0.52, 0.07, 0.14, 0.07),
        (0, 0.65, 0.55, 0.055, 0.11, 0.055),
    ]
    body = metabody("DragonBody", parts, voxel=0.016, material=GREEN,
                    zones=[(YELLOW, (0, -0.65, -0.6), 0.30, 0.80)])
    meshes.append(body)
    # лопатка хвоста
    spade = cone("Spade", (0, 0.76, 0.58), 0.085, 0.18, GREEN_D, rot=(math.pi / 2 - 0.25, 0, 0), seg=8)
    spade.scale.x = 1.5
    meshes.append(spade)
    meshes.append(uv("NoseTip", (0, -0.50, 1.0), (0.05, 0.03, 0.035),
                     mat("nostril", (0.08, 0.15, 0.10)), 10, 8))
    for side, x in (("L", -0.09), ("R", 0.09)):
        meshes.append(cone(f"Tooth{side}", (x, -0.47, 0.90), 0.02, 0.06,
                           mat("tooth", (0.97, 0.97, 0.95)), rot=(math.pi, 0, 0), seg=6))
    eye_set(root, meshes, -0.10, -0.33, 1.10, 0.065)
    eye_set(root, meshes, 0.10, -0.33, 1.10, 0.065)
    for side, x in (("L", -0.11), ("R", 0.11)):
        h = cone(f"Horn{side}", (x, -0.08, 1.24), 0.055, 0.22, CREAM,
                 rot=(-0.4, x * 1.8, 0), seg=10)
        b = cube(f"Brow{side}", (x, -0.335, 1.17), (0.09, 0.02, 0.025), YELLOW, bev=0.008)
        meshes += [h, b]
    for i in range(4):
        s = cone(f"Spine{i}", (0, 0.16 - i * 0.04, 0.94 - i * 0.15), 0.04, 0.12,
                 GREEN_D, rot=(-0.5, 0, 0), seg=8)
        meshes.append(s)
    # крылья с пивотами: мягкие, из сплюснутых сфер (перекрываются)
    for side, x in (("L", -0.20), ("R", 0.20)):
        w = empty(f"Wing{side}", (x, 0.06, 0.92), root)
        arm = uv(f"WingArm{side}", (x * 1.6, 0, 0.10), (0.22, 0.045, 0.05), GREEN_D, 12, 8)
        m1 = uv(f"WingM{side}", (x * 2.1, 0.01, -0.10), (0.19, 0.03, 0.15), GREEN_D, 16, 10)
        m2 = uv(f"WingT{side}", (x * 2.6, 0, -0.24), (0.13, 0.025, 0.11), GREEN, 14, 8)
        f1 = cone(f"WingF{side}", (x * 3.0, 0, -0.33), 0.03, 0.14, GREEN_D,
                  rot=(0, -x * 6, 0), seg=6)
        for o in (arm, m1, m2, f1):
            o.parent = w
            meshes.append(o)
    for side in (-1, 1):
        for i in range(3):
            meshes.append(cone(f"Claw{side}{i}", (side * 0.19 + (i - 1) * 0.055 * 1, -0.20, 0.06),
                               0.018, 0.07, CREAM, rot=(math.pi / 2 - 0.2, 0, 0), seg=6))
    finish(root, meshes, "dragon")


for fn in (mouse, fox, owl, dragon):
    reset_scene()
    fn()
