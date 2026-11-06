"""Монстры schoolquest: frog, mouse, fox, owl, dragon, robot -> GLB.
Пивоты: WingL/WingR у совы и дракона, ArmL/ArmR у робота."""
import sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *


def add_eye(parent, meshes, x, y, z, r, iris=None, iris_r=0.55):
    WHITE = mat("eye_white", (0.98, 0.98, 0.98), rough=0.25)
    PUP = mat("eye_pupil", (0.02, 0.02, 0.03), rough=0.2)
    parts = [uv("EyeW", (x, y, z), (r, r * 0.85, r), WHITE, 16, 12)]
    if iris:
        IM = mat("eye_iris", iris, rough=0.3)
        parts.append(uv("EyeI", (x, y - r * 0.55, z), (r * iris_r, r * 0.3, r * iris_r), IM, 14, 10))
    parts.append(uv("EyeP", (x, y - r * 0.72, z), (r * 0.42, r * 0.22, r * 0.42), PUP, 12, 8))
    parts.append(uv("EyeH", (x - r * 0.3, y - r * 0.8, z + r * 0.35),
                    (r * 0.16, r * 0.1, r * 0.16), WHITE, 8, 6))
    for p in parts:
        p.parent = parent
        meshes.append(p)


def smile_arc(meshes, x, y, z, r, color):
    """Улыбка — дуга (полукруг) из кривой, смотрит в -Y."""
    m = mat("mouth", color)
    pts = []
    for i in range(17):
        a = math.pi * (0.12 + 0.76 * i / 16)  # нижняя дуга
        pts.append((x + math.cos(a) * r, y, z - math.sin(a) * r * 0.5 + r * 0.25))
    cu = bpy.data.curves.new("Smile", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r * 0.09
    cu.bevel_resolution = 2
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for bp, co in zip(sp.points, pts):
        bp.co = (*co, 1.0)
    o = bpy.data.objects.new("Smile", cu)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    meshes.append(o)
    return o


def curve_tail(meshes, points, r, material, name="Tail"):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, co in zip(sp.bezier_points, points):
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    meshes.append(o)
    return o


def frog():
    GREEN = mat("frog", (0.32, 0.70, 0.28))
    GREEN_D = mat("frog_dark", (0.25, 0.60, 0.22))
    BELLY = mat("frog_belly", (0.78, 0.92, 0.62))
    PINK = mat("blush", (1.0, 0.60, 0.68))
    root = empty("Root")
    meshes = []
    # тело приплюснутое, мордой в -Y
    body = uv("Body", (0, 0, 0.30), (0.36, 0.42, 0.26), GREEN, 28, 20)
    belly = uv("Belly", (0, -0.14, 0.24), (0.30, 0.32, 0.20), BELLY, 24, 16)
    meshes += [body, belly]
    # пятна
    for x, y, z, r in ((0.12, 0.15, 0.42, 0.06), (-0.15, 0.1, 0.40, 0.05), (0.0, 0.28, 0.34, 0.045)):
        s = uv("Spot", (x, y, z), (r, r, r * 0.5), GREEN_D, 12, 8)
        meshes.append(s)
    # глазные бугры
    for side, x in (("L", -0.17), ("R", 0.17)):
        bump = uv(f"EyeBump{side}", (x, -0.16, 0.52), (0.11, 0.11, 0.10), GREEN, 18, 12)
        lid = uv(f"Lid{side}", (x, -0.16, 0.585), (0.115, 0.115, 0.05), GREEN_D, 18, 12)
        meshes += [bump, lid]
        add_eye(root, meshes, x, -0.24, 0.54, 0.085)
        meshes[-4].parent = root  # EyeW
    # передние лапки
    for side, x in (("L", -0.28), ("R", 0.28)):
        arm = capsule(f"Arm{side}", (x, -0.22, 0.16), 0.035, 0.16, GREEN,
                      rot=(0.5, 0, x * 1.2))
        hand = uv(f"Hand{side}", (x * 1.08, -0.34, 0.08), (0.05, 0.06, 0.045), GREEN, 14, 10)
        meshes += [arm, hand]
        for i in range(3):
            f = cone(f"Finger{side}{i}",
                     (x * 1.08 + (i - 1) * 0.045, -0.40, 0.045), 0.018, 0.07, BELLY,
                     rot=(math.pi / 2 - 0.35, 0, 0), seg=8)
            meshes.append(f)
    # задние лапы: сложенные, длинные ступни
    for side, x in (("L", -0.33), ("R", 0.33)):
        thigh = uv(f"Thigh{side}", (x, 0.06, 0.20), (0.13, 0.18, 0.13), GREEN_D, 18, 12)
        foot = uv(f"Foot{side}", (x * 1.05, -0.18, 0.06), (0.09, 0.20, 0.05), GREEN, 16, 10)
        meshes += [thigh, foot]
        for i in range(3):
            f = cone(f"Toe{side}{i}",
                     (x * 1.05 + (i - 1) * 0.055, -0.38, 0.04), 0.022, 0.10, BELLY,
                     rot=(math.pi / 2 - 0.3, 0, 0), seg=8)
            meshes.append(f)
    # рот и щёчки
    smile_arc(meshes, 0, -0.475, 0.24, 0.15, (0.15, 0.42, 0.20))
    meshes.append(uv("CheekL", (-0.22, -0.36, 0.28), (0.05, 0.03, 0.04), PINK, 12, 8))
    meshes.append(uv("CheekR", (0.22, -0.36, 0.28), (0.05, 0.03, 0.04), PINK, 12, 8))
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


def mouse():
    GRAY = mat("mouse", (0.62, 0.65, 0.72))
    GRAY_L = mat("mouse_light", (0.72, 0.75, 0.82))
    PINK = mat("mouse_pink", (0.95, 0.55, 0.65))
    PINK_L = mat("mouse_pink2", (1.0, 0.72, 0.78))
    DARK = mat("mouse_dark", (0.35, 0.38, 0.46))
    root = empty("Root")
    meshes = []
    body = uv("Body", (0, 0, 0.42), (0.32, 0.38, 0.40), GRAY, 28, 20)
    belly = uv("Belly", (0, -0.17, 0.36), (0.24, 0.28, 0.32), GRAY_L, 24, 16)
    head = uv("Head", (0, -0.08, 0.88), (0.26, 0.24, 0.24), GRAY_L, 24, 16)
    snout = uv("Snout", (0, -0.30, 0.82), (0.12, 0.12, 0.10), GRAY_L, 18, 12)
    nose = uv("Nose", (0, -0.415, 0.84), (0.045, 0.035, 0.04), PINK, 14, 10)
    meshes += [body, belly, head, snout, nose]
    for side, x in (("L", -0.17), ("R", 0.17)):
        ear = uv(f"Ear{side}", (x, -0.02, 1.10), (0.13, 0.06, 0.15), GRAY, 20, 14)
        inner = uv(f"EarIn{side}", (x, -0.065, 1.10), (0.085, 0.03, 0.11), PINK_L, 16, 10)
        ear.rotation_euler[1] = math.radians(8) * (1 if x > 0 else -1)
        meshes += [ear, inner]
        add_eye(root, meshes, x * 0.62, -0.29, 0.92, 0.075)
        # бровь
        b = cube(f"Brow{side}", (x * 0.62, -0.30, 1.02), (0.09, 0.02, 0.02), DARK, bev=0.008)
        meshes.append(b)
        # лапка
        a = capsule(f"Arm{side}", (x * 1.5, -0.20, 0.42), 0.035, 0.14, GRAY,
                    rot=(0.5, 0, x * 2))
        p = uv(f"Paw{side}", (x * 1.55, -0.30, 0.34), (0.055, 0.06, 0.05), PINK_L, 14, 10)
        meshes += [a, p]
        # ступня
        meshes.append(uv(f"Foot{side}", (x * 1.2, -0.16, 0.06), (0.09, 0.13, 0.05), PINK_L, 14, 10))
    # усы
    for side in (-1, 1):
        for i in range(3):
            w = cyl(f"Whisker{side}{i}",
                    (side * 0.24, -0.38, 0.82 + (i - 1) * 0.035),
                    0.004, 0.004, 0.22, mat("whisk", (0.92, 0.93, 0.96)),
                    rot=(math.pi / 2, side * (0.2 - i * 0.15), 0), seg=6)
            meshes.append(w)
    # хвост
    curve_tail(meshes, [(0, 0.32, 0.25), (0.15, 0.5, 0.18), (0.05, 0.62, 0.32)], 0.028, PINK)
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


def fox():
    ORANGE = mat("fox", (0.92, 0.48, 0.16))
    ORANGE_D = mat("fox_dark", (0.82, 0.40, 0.12))
    WHITE = mat("fox_white", (0.98, 0.94, 0.86))
    DARK = mat("fox_nose", (0.10, 0.07, 0.05))
    root = empty("Root")
    meshes = []
    body = uv("Body", (0, 0.05, 0.55), (0.24, 0.42, 0.26), ORANGE, 28, 20)
    chest = uv("Chest", (0, -0.22, 0.52), (0.18, 0.22, 0.24), WHITE, 22, 14)
    head = uv("Head", (0, -0.28, 0.92), (0.20, 0.19, 0.18), ORANGE, 24, 16)
    snout = cone("Snout", (0, -0.50, 0.86), 0.10, 0.28, WHITE, rot=(math.pi / 2 + 0.12, 0, 0))
    nose = uv("Nose", (0, -0.645, 0.90), (0.04, 0.035, 0.035), DARK, 14, 10)
    meshes += [body, chest, head, snout, nose]
    for side, x in (("L", -0.12), ("R", 0.12)):
        ear = cone(f"Ear{side}", (x, -0.24, 1.12), 0.085, 0.22, ORANGE_D, seg=12)
        inner = cone(f"EarIn{side}", (x, -0.275, 1.10), 0.045, 0.13, mat("fox_ear", (0.95, 0.65, 0.62)), seg=10)
        meshes += [ear, inner]
        add_eye(root, meshes, x * 0.8, -0.44, 0.96, 0.06)
        b = cube(f"Brow{side}", (x * 0.8, -0.45, 1.04), (0.08, 0.02, 0.02), ORANGE_D, bev=0.008)
        meshes.append(b)
        # щёчный пучок
        t = cone(f"Tuft{side}", (x * 1.9, -0.38, 0.86), 0.05, 0.16, WHITE,
                 rot=(0, x * 6, 0), seg=8)
        meshes.append(t)
    # 4 лапы
    for i, (x, y) in enumerate(((-0.13, -0.22), (0.13, -0.22), (-0.13, 0.30), (0.13, 0.30))):
        leg = capsule(f"Leg{i}", (x, y, 0.26), 0.055, 0.28, ORANGE)
        paw = uv(f"Paw{i}", (x, y - 0.03, 0.09), (0.07, 0.09, 0.06), WHITE, 14, 10)
        meshes += [leg, paw]
    # хвост слоями
    tail = empty("Tail", (0, 0.45, 0.62), root)
    t1 = uv("Tail1", (0, 0.10, 0.02), (0.14, 0.24, 0.14), ORANGE, 20, 14)
    t2 = uv("Tail2", (0, 0.30, 0.10), (0.12, 0.18, 0.12), ORANGE_D, 18, 12)
    t3 = uv("TailTip", (0, 0.44, 0.16), (0.10, 0.14, 0.10), WHITE, 16, 10)
    for o in (t1, t2, t3):
        o.parent = tail
        meshes.append(o)
    tail.rotation_euler[0] = math.radians(-35)
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


def owl():
    BROWN = mat("owl", (0.55, 0.36, 0.20))
    BROWN_D = mat("owl_dark", (0.40, 0.25, 0.13))
    CREAM = mat("owl_cream", (0.85, 0.73, 0.54))
    YELLOW = mat("owl_yellow", (1.0, 0.68, 0.20), rough=0.4)
    root = empty("Root")
    meshes = []
    body = uv("Body", (0, 0, 0.62), (0.34, 0.30, 0.44), BROWN, 28, 20)
    belly = uv("Belly", (0, -0.20, 0.55), (0.26, 0.20, 0.36), CREAM, 24, 16)
    meshes += [body, belly]
    # перья на брюшке
    for i in range(3):
        for j in range(2):
            d = uv(f"Feather{i}{j}", ((i - 1) * 0.11, -0.385, 0.48 - j * 0.14),
                   (0.04, 0.02, 0.055), mat("owl_f", (0.70, 0.55, 0.35)), 10, 8)
            meshes.append(d)
    # глаза и сердитые брови
    for side, x in (("L", -0.13), ("R", 0.13)):
        add_eye(root, meshes, x, -0.26, 0.82, 0.115, iris=(0.95, 0.65, 0.15), iris_r=0.62)
        b = cube(f"Brow{side}", (x, -0.335, 0.95), (0.13, 0.025, 0.03), BROWN_D, bev=0.01)
        b.rotation_euler[1] = math.radians(18) * (1 if x > 0 else -1)
        meshes.append(b)
        # пучки на голове
        t = cone(f"Tuft{side}", (x * 1.25, -0.05, 1.08), 0.06, 0.18, BROWN_D,
                 rot=(0, x * 3, 0), seg=8)
        meshes.append(t)
    # клюв
    beak = cone("Beak", (0, -0.36, 0.72), 0.06, 0.14, YELLOW, rot=(math.pi / 2 + 0.35, 0, 0), seg=10)
    meshes.append(beak)
    # крылья с пивотами
    for side, x in (("L", -0.30), ("R", 0.30)):
        w = empty(f"Wing{side}", (x, 0, 0.78), root)
        wm = uv(f"WingM{side}", (x * 0.22, 0.02, -0.18), (0.14, 0.20, 0.30), BROWN_D, 20, 14)
        tip = uv(f"WingT{side}", (x * 0.3, 0.0, -0.48), (0.10, 0.14, 0.18), BROWN, 16, 10)
        for k in range(3):
            f = cone(f"WingF{side}{k}", (x * 0.3, -0.02, -0.60 - k * 0.02),
                     0.035, 0.16, BROWN_D, rot=(0.3 + k * 0.2, 0, 0), seg=6)
            f.parent = w
            meshes.append(f)
        wm.parent = w
        tip.parent = w
        meshes += [wm, tip]
    # лапы
    for side, x in (("L", -0.10), ("R", 0.10)):
        leg = cone(f"Leg{side}", (x, -0.02, 0.10), 0.05, 0.16, YELLOW, seg=8)
        meshes.append(leg)
        for i in range(3):
            c = cone(f"Claw{side}{i}", (x + (i - 1) * 0.05, -0.10, 0.03), 0.018, 0.07,
                     BROWN_D, rot=(math.pi / 2 + 0.25, 0, 0), seg=6)
            meshes.append(c)
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


def dragon():
    GREEN = mat("dragon", (0.32, 0.65, 0.35))
    GREEN_D = mat("dragon_dark", (0.24, 0.52, 0.28))
    YELLOW = mat("dragon_belly", (0.95, 0.78, 0.35))
    CREAM = mat("dragon_horn", (0.92, 0.87, 0.70))
    root = empty("Root")
    meshes = []
    body = uv("Body", (0, 0, 0.62), (0.30, 0.36, 0.36), GREEN, 28, 20)
    meshes.append(body)
    # брюшные пластины
    for i in range(4):
        p = uv(f"Plate{i}", (0, -0.30, 0.72 - i * 0.14), (0.16 - i * 0.02, 0.06, 0.075), YELLOW, 16, 10)
        meshes.append(p)
    head = uv("Head", (0, -0.22, 1.08), (0.20, 0.20, 0.18), GREEN, 24, 16)
    snout = uv("Snout", (0, -0.42, 1.02), (0.13, 0.13, 0.10), GREEN_D, 18, 12)
    meshes += [head, snout]
    # ноздри и зубы
    for side, x in (("L", -0.06), ("R", 0.06)):
        meshes.append(uv(f"Nostril{side}", (x, -0.53, 1.06), (0.018, 0.012, 0.015),
                         mat("nostril", (0.08, 0.15, 0.10)), 10, 8))
        t = cone(f"Tooth{side}", (x, -0.50, 0.94), 0.02, 0.06, mat("tooth", (0.97, 0.97, 0.95)),
                 rot=(math.pi, 0, 0), seg=6)
        meshes.append(t)
    add_eye(root, meshes, -0.10, -0.36, 1.14, 0.065)
    add_eye(root, meshes, 0.10, -0.36, 1.14, 0.065)
    for side, x in (("L", -0.12), ("R", 0.12)):
        h = cone(f"Horn{side}", (x, -0.10, 1.28), 0.055, 0.22, CREAM,
                 rot=(-0.35, x * 2, 0), seg=10)
        meshes.append(h)
        b = cube(f"Brow{side}", (x, -0.37, 1.22), (0.09, 0.02, 0.025), YELLOW, bev=0.008)
        meshes.append(b)
    # шипы по спине
    for i in range(4):
        s = cone(f"Spine{i}", (0, 0.20 - i * 0.02, 0.98 - i * 0.16), 0.045, 0.13,
                 GREEN_D, rot=(-0.4, 0, 0), seg=8)
        meshes.append(s)
    # крылья с перепонкой
    for side, x in (("L", -0.22), ("R", 0.22)):
        w = empty(f"Wing{side}", (x, 0.08, 0.92), root)
        arm1 = cyl(f"WingArm{side}", (x * 1.9, 0, 0.12), 0.03, 0.03, 0.42, GREEN_D,
                   rot=(0, math.pi / 2 - x * 3, 0), seg=8)
        mem = cube(f"Membrane{side}", (x * 2.6, 0.03, -0.02), (0.42, 0.02, 0.30),
                   GREEN_D, bev=0.01)
        mem.rotation_euler[1] = x * 1.2
        for o in (arm1, mem):
            o.parent = w
            meshes.append(o)
    # хвост
    tail = empty("Tail", (0, 0.32, 0.45), root)
    t1 = capsule("Tail1", (0, 0.15, -0.05), 0.07, 0.30, GREEN, rot=(math.pi / 2 + 0.2, 0, 0))
    spade = cone("Spade", (0, 0.38, -0.10), 0.09, 0.20, GREEN_D,
                 rot=(math.pi / 2 + 0.2, 0, 0), seg=8)
    spade.scale.x = 1.5
    for o in (t1, spade):
        o.parent = tail
        meshes.append(o)
    # лапы
    for side, x in (("L", -0.20), ("R", 0.20)):
        leg = capsule(f"Leg{side}", (x, -0.05, 0.24), 0.07, 0.24, GREEN)
        meshes.append(leg)
        meshes.append(uv(f"Foot{side}", (x, -0.13, 0.08), (0.09, 0.12, 0.06), GREEN_D, 14, 10))
        for i in range(3):
            c = cone(f"Claw{side}{i}", (x + (i - 1) * 0.06, -0.23, 0.06), 0.02, 0.08,
                     CREAM, rot=(math.pi / 2 - 0.2, 0, 0), seg=6)
            meshes.append(c)
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


def robot():
    STEEL = mat("robot", (0.66, 0.72, 0.80), rough=0.5, metallic=0.2)
    STEEL_D = mat("robot_dark", (0.46, 0.52, 0.62), rough=0.55, metallic=0.2)
    DARK = mat("robot_joint", (0.30, 0.35, 0.43), rough=0.6, metallic=0.15)
    GLOW = mat("robot_glow", (0.15, 0.75, 0.95), emission=(0.15, 0.75, 0.95))
    RED = mat("robot_red", (0.9, 0.25, 0.30), emission=(0.9, 0.25, 0.30))
    root = empty("Root")
    meshes = []
    body = cube("Body", (0, 0, 0.85), (0.50, 0.34, 0.46), STEEL, bev=0.05)
    panel = cube("Panel", (0, -0.18, 0.85), (0.36, 0.02, 0.28), STEEL_D, bev=0.02)
    core = uv("Core", (0, -0.20, 0.98), (0.05, 0.03, 0.05), GLOW, 14, 10)
    pelvis = cube("Pelvis", (0, 0, 0.52), (0.36, 0.26, 0.18), STEEL_D, bev=0.04)
    meshes += [body, panel, core, pelvis]
    # болты и вентиляция
    for i, (x, z) in enumerate(((-0.20, 1.02), (0.20, 1.02), (-0.20, 0.68), (0.20, 0.68))):
        meshes.append(cyl(f"Bolt{i}", (x, -0.19, z), 0.025, 0.025, 0.03, DARK,
                          rot=(math.pi / 2, 0, 0), seg=8))
    for i in range(3):
        meshes.append(cube(f"Vent{i}", (0, -0.195, 0.70 + i * 0.05), (0.14, 0.015, 0.02), DARK, bev=0.006))
    # голова с экраном-лицом
    meshes.append(cube("Head", (0, 0, 1.32), (0.40, 0.36, 0.34), STEEL, bev=0.05))
    scr = cube("Screen", (0, -0.185, 1.32), (0.30, 0.02, 0.20),
               mat("screen", (0.04, 0.10, 0.14), emission=(0.02, 0.06, 0.09)), bev=0.02)
    meshes.append(scr)
    for i, x in enumerate((-0.08, 0.08)):
        meshes.append(cube(f"PixE{i}", (x, -0.20, 1.35), (0.05, 0.01, 0.07), GLOW, bev=0.008))
    meshes.append(cube("PixM", (0, -0.20, 1.26), (0.12, 0.01, 0.025), GLOW, bev=0.008))
    # антенна
    meshes.append(cyl("Antenna", (0, 0, 1.60), 0.015, 0.015, 0.18, DARK, seg=8))
    meshes.append(uv("Bulb", (0, 0, 1.72), (0.05, 0.05, 0.05), RED, 14, 10))
    # руки с пивотами
    for side, x in (("L", -0.34), ("R", 0.34)):
        a = empty(f"Arm{side}", (x, 0, 1.02), root)
        sh = uv(f"Shoulder{side}", (0, 0, 0), (0.10, 0.11, 0.10), DARK, 16, 12)
        up = cube(f"Up{side}", (0, 0, -0.16), (0.12, 0.14, 0.26), STEEL_D, bev=0.03)
        el = uv(f"Elbow{side}", (0, 0, -0.32), (0.07, 0.08, 0.07), DARK, 14, 10)
        fo = cube(f"Fore{side}", (0, 0, -0.44), (0.10, 0.12, 0.20), STEEL, bev=0.03)
        for k, cx in enumerate((-0.03, 0.03)):
            cl = cone(f"Claw{side}{k}", (cx, -0.01, -0.60), 0.022, 0.10, DARK,
                      rot=(math.pi, 0, 0), seg=6)
            cl.parent = a
            meshes.append(cl)
        for o in (sh, up, el, fo):
            o.parent = a
            meshes.append(o)
    # ноги
    for side, x in (("L", -0.15), ("R", 0.15)):
        meshes.append(cube(f"Leg{side}", (x, 0, 0.32), (0.13, 0.16, 0.28), STEEL_D, bev=0.03))
        meshes.append(uv(f"Knee{side}", (x, -0.02, 0.20), (0.07, 0.08, 0.07), DARK, 12, 10))
        meshes.append(cube(f"Foot{side}", (x, -0.03, 0.07), (0.16, 0.24, 0.12), DARK, bev=0.03))
        for k in range(2):
            meshes.append(cube(f"Toe{side}{k}", (x - 0.035 + k * 0.07, -0.15, 0.06),
                               (0.06, 0.08, 0.07), STEEL, bev=0.02))
    for o in meshes:
        if o.parent is None:
            o.parent = root
    return root, meshes


MONSTERS = {"frog": frog, "mouse": mouse, "fox": fox, "owl": owl, "dragon": dragon, "robot": robot}


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)
    for mid, fn in MONSTERS.items():
        reset_scene()
        root, meshes = fn()
        export_glb(f"{OUT_DIR}/mon_{mid}.glb", [root] + meshes)
        preview(f"/tmp/prev_mon_{mid}.png", meshes, size=1.6)
        print("OK", mid)


main()
