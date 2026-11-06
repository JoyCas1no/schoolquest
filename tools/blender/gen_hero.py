"""Герой schoolquest: реалистичные пропорции, 4 класса. Экспорт: hero_<class>.glb"""
import sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

SKIN = None; HAIR = None; SHIRT = None; PANTS = None; BOOT = None


def build_body(cls):
    """Базовое тело. Возвращает dict с пивотами и мешами."""
    global SKIN, HAIR, SHIRT, PANTS, BOOT
    SKIN = mat("skin", (0.93, 0.72, 0.55))
    HAIR = mat("hair", (0.16, 0.10, 0.06))
    SHIRT = mat("shirt", cls["shirt"])
    PANTS = mat("pants", cls["pants"])
    BOOT = mat("boot", (0.25, 0.16, 0.10))

    root = empty("Root")
    parts = {"Root": root}
    meshes = []

    def add(o):
        meshes.append(o)
        return o

    # ---- таз ----
    hips = uv("Hips", (0, 0, 1.02), (0.16, 0.11, 0.10), PANTS)
    add(hips)

    # ---- ноги (пивот в тазобедренном суставе) ----
    for side, x in (("L", -0.10), ("R", 0.10)):
        leg = empty(f"Leg{side}", (x, 0, 1.0), root)
        parts[f"Leg{side}"] = leg
        # бедро
        th = capsule(f"Thigh{side}", (0, 0, -0.24), 0.085, 0.30, PANTS)
        # колено
        kn = uv(f"Knee{side}", (0, 0.005, -0.44), (0.075, 0.075, 0.075), PANTS, 16, 12)
        # голень
        sh = capsule(f"Shin{side}", (0, 0, -0.66), 0.062, 0.30, PANTS)
        # обувь: стопа + носок + лодыжка
        an = uv(f"Ankle{side}", (0, -0.01, -0.86), (0.055, 0.06, 0.06), BOOT, 14, 10)
        ft = cube(f"Foot{side}", (0, -0.045, -0.925), (0.11, 0.24, 0.09), BOOT, bev=0.03)
        to = uv(f"Toe{side}", (0, -0.13, -0.93), (0.052, 0.07, 0.045), BOOT, 16, 12)
        for o in (th, kn, sh, an, ft, to):
            o.parent = leg
            add(o)

    # ---- торс (пивот в начале координат: детали в мировых координатах) ----
    torso = empty("Torso", (0, 0, 0), root)
    parts["Torso"] = torso
    belly = uv("Belly", (0, 0, 1.16), (0.155, 0.105, 0.14), SHIRT)
    chest = uv("Chest", (0, 0, 1.34), (0.185, 0.12, 0.17), SHIRT)
    back = uv("Back", (0, 0.045, 1.30), (0.16, 0.10, 0.16), SHIRT)
    belt = torus("Belt", (0, 0, 1.10), 0.155, 0.028,
                  mat("belt", (0.20, 0.13, 0.08)), rot=(math.pi / 2, 0, 0))
    buckle = cube("Buckle", (0, -0.135, 1.10), (0.06, 0.02, 0.05),
                  mat("buckle", (0.85, 0.65, 0.20), rough=0.35, metallic=0.7), bev=0.01)
    for o in (belly, chest, back, belt, buckle):
        o.parent = torso
        add(o)

    # ---- шея и голова ----
    neck = capsule("Neck", (0, 0, 1.50), 0.05, 0.08, SKIN)
    add(neck)
    head = empty("Head", (0, 0, 1.52), root)
    parts["Head"] = head
    skull = uv("Skull", (0, 0, 0.14), (0.115, 0.125, 0.135), SKIN)
    jaw = uv("Jaw", (0, -0.01, 0.055), (0.085, 0.10, 0.075), SKIN, 20, 14)
    nose = uv("Nose", (0, -0.115, 0.11), (0.022, 0.03, 0.03), SKIN, 12, 10)
    # уши
    earL = uv("EarL", (-0.115, 0, 0.13), (0.025, 0.035, 0.045), SKIN, 12, 10)
    earR = uv("EarR", (0.115, 0, 0.13), (0.025, 0.035, 0.045), SKIN, 12, 10)
    # глаза: белок, радужка, зрачок, блик
    WHITE = mat("white", (0.98, 0.98, 0.98), rough=0.3)
    IRIS = mat("iris", cls.get("iris", (0.25, 0.35, 0.55)), rough=0.3)
    PUP = mat("pupil", (0.02, 0.02, 0.03), rough=0.2)
    for side, x in (("L", -0.048), ("R", 0.048)):
        w = uv(f"EyeW{side}", (x, -0.105, 0.155), (0.032, 0.026, 0.034), WHITE, 16, 12)
        i = uv(f"EyeI{side}", (x, -0.126, 0.155), (0.016, 0.010, 0.018), IRIS, 12, 10)
        p = uv(f"EyeP{side}", (x, -0.133, 0.155), (0.008, 0.006, 0.010), PUP, 10, 8)
        hlt = uv(f"EyeH{side}", (x - 0.008, -0.137, 0.168), (0.005, 0.004, 0.006),
                 WHITE, 8, 6)
        brow = cube(f"Brow{side}", (x, -0.118, 0.205), (0.05, 0.02, 0.014),
                    HAIR, bev=0.006)
        for o in (w, i, p, hlt, brow):
            o.parent = head
            add(o)
    # рот: губы
    LIP = mat("lip", (0.75, 0.42, 0.38))
    mouth = uv("Mouth", (0, -0.095, 0.035), (0.045, 0.018, 0.014), LIP, 16, 10)
    for o in (skull, jaw, nose, earL, earR, mouth):
        o.parent = head
        add(o)

    # ---- руки (пивот в плече) ----
    for side, x in (("L", -0.235), ("R", 0.235)):
        arm = empty(f"Arm{side}", (x, 0, 1.44), root)
        parts[f"Arm{side}"] = arm
        sh = uv(f"Shoulder{side}", (0, 0, 0.0), (0.075, 0.075, 0.08), SHIRT, 16, 12)
        up = capsule(f"UpperArm{side}", (0, 0, -0.17), 0.055, 0.20, SHIRT)
        el = uv(f"Elbow{side}", (0, 0, -0.30), (0.05, 0.05, 0.05), SHIRT, 14, 10)
        fo = capsule(f"ForeArm{side}", (0, 0, -0.43), 0.045, 0.18, SKIN)
        wr = uv(f"Wrist{side}", (0, 0, -0.545), (0.042, 0.042, 0.04), SKIN, 12, 10)
        hand = uv(f"Hand{side}", (0, -0.005, -0.60), (0.045, 0.055, 0.06), SKIN, 14, 10)
        for o in (sh, up, el, fo, wr, hand):
            o.parent = arm
            add(o)
    neck.parent = torso
    return root, parts, meshes


def gear_warrior(parts, meshes):
    METAL = mat("steel", (0.62, 0.66, 0.72), rough=0.35, metallic=0.85)
    DARK = mat("darksteel", (0.35, 0.38, 0.45), rough=0.4, metallic=0.8)
    RED = mat("crest", (0.75, 0.15, 0.12))
    GOLD = mat("gold", (0.85, 0.62, 0.20), rough=0.3, metallic=0.8)
    head = parts["Head"]; torso = parts["Torso"]
    armR = parts["ArmR"]; armL = parts["ArmL"]

    # шлем: купол + обруч + назатыльник + гребень
    helm = uv("Helm", (0, 0.005, 0.20), (0.125, 0.13, 0.115), METAL, 24, 16)
    band = torus("HelmBand", (0, 0, 0.16), 0.12, 0.018, DARK, rot=(math.pi / 2, 0, 0))
    neckg = uv("HelmNeck", (0, 0.06, 0.02), (0.115, 0.09, 0.09), DARK, 20, 12)
    crest = uv("Crest", (0, 0.02, 0.33), (0.025, 0.14, 0.09), RED, 16, 12)
    for o in (helm, band, neckg, crest):
        o.parent = head; meshes.append(o)
    # носовой гребень шлема
    nasal = cube("Nasal", (0, -0.125, 0.14), (0.025, 0.02, 0.09), DARK, bev=0.008)
    nasal.parent = head; meshes.append(nasal)
    # панцирь поверх груди
    cuir = uv("Cuirass", (0, -0.01, 1.34), (0.20, 0.135, 0.18), METAL, 24, 16)
    cuir.parent = torso; meshes.append(cuir)
    # наплечники
    for side, x in (("L", -0.235), ("R", 0.235)):
        p = uv(f"Pauldron{side}", (x, 0, 1.47), (0.10, 0.10, 0.07), METAL, 20, 12)
        meshes.append(p)
    # меч в правой руке (в локальных координатах ArmR)
    sw = empty("Sword", (0, -0.01, -0.60), armR)
    blade = cube("Blade", (0, 0, -0.42), (0.045, 0.012, 0.62), METAL, bev=0.008)
    fuller = cube("Fuller", (0, -0.008, -0.42), (0.012, 0.006, 0.5), DARK, bev=0.004)
    guard = cube("Guard", (0, 0, -0.10), (0.16, 0.03, 0.03), GOLD, bev=0.01)
    grip = capsule("Grip", (0, 0, -0.02), 0.02, 0.09, mat("grip", (0.3, 0.18, 0.1)))
    pommel = uv("Pommel", (0, 0, 0.04), (0.028, 0.028, 0.028), GOLD, 12, 10)
    for o in (blade, fuller, guard, grip, pommel):
        o.parent = sw; meshes.append(o)
    # щит на левом предплечье
    sh = empty("Shield", (0, -0.10, -0.35), armL)
    rim = torus("ShieldRim", (0, 0, 0), 0.16, 0.022, GOLD, rot=(math.pi / 2, 0, 0))
    face = cyl("ShieldFace", (0, 0, 0), 0.16, 0.16, 0.025, DARK, rot=(math.pi / 2, 0, 0))
    boss = uv("ShieldBoss", (0, -0.02, 0), (0.045, 0.03, 0.045), METAL, 14, 10)
    for o in (rim, face, boss):
        o.parent = sh; meshes.append(o)


def gear_mage(parts, meshes):
    ROBE = mat("robe", (0.35, 0.22, 0.65))
    ROBE_D = mat("robe_dark", (0.26, 0.16, 0.5))
    GOLD = mat("gold", (0.85, 0.62, 0.20), rough=0.3, metallic=0.8)
    STAR = mat("star", (1.0, 0.85, 0.4), emission=(1.0, 0.8, 0.3))
    GLOWB = mat("orb", (0.55, 0.85, 1.0), emission=(0.55, 0.85, 1.0))
    head = parts["Head"]; root = parts["Root"]; armR = parts["ArmR"]

    # мантия-доломан поверх тела
    robe = cyl("Robe", (0, 0, 0.62), 0.30, 0.17, 0.85, ROBE)
    robe.parent = root; meshes.append(robe)
    trim = torus("RobeTrim", (0, 0, 0.21), 0.29, 0.02, GOLD, rot=(math.pi / 2, 0, 0))
    trim.parent = root; meshes.append(trim)
    clasp = uv("Clasp", (0, -0.15, 1.42), (0.035, 0.02, 0.035), GOLD, 12, 10)
    meshes.append(clasp)
    # колпак
    brim = cyl("Brim", (0, 0, 0.235), 0.19, 0.20, 0.02, ROBE_D)
    cone_hat = cone("Hat", (0, 0, 0.42), 0.145, 0.36, ROBE_D)
    cone_hat.rotation_euler[1] = 0.12
    band = torus("HatBand", (0, 0, 0.26), 0.15, 0.02, GOLD, rot=(math.pi / 2, 0, 0))
    star = uv("HatStar", (0.10, -0.10, 0.36), (0.02, 0.012, 0.02), STAR, 10, 8)
    tip = uv("HatTip", (0.05, 0, 0.60), (0.02, 0.02, 0.02), STAR, 10, 8)
    for o in (brim, cone_hat, band, star, tip):
        o.parent = head; meshes.append(o)
    # посох
    st = empty("Staff", (0, -0.02, -0.60), armR)
    shaft = capsule("Shaft", (0, 0, -0.16), 0.022, 0.72, mat("wood", (0.35, 0.22, 0.12)))
    orb = uv("Orb", (0, 0, 0.28), (0.07, 0.07, 0.07), GLOWB, 20, 14)
    r1 = torus("OrbRing1", (0, 0, 0.28), 0.10, 0.012, GOLD)
    r2 = torus("OrbRing2", (0, 0, 0.28), 0.115, 0.010, GOLD, rot=(0.7, 0.3, 0))
    crown = cone("StaffCrown", (0, 0, 0.24), 0.045, 0.07, GOLD)
    for o in (shaft, orb, r1, r2, crown):
        o.parent = st; meshes.append(o)


def gear_rogue(parts, meshes):
    HOOD = mat("hood", (0.13, 0.32, 0.19))
    HOOD_D = mat("hood_dark", (0.09, 0.22, 0.13))
    LEATHER = mat("leather", (0.30, 0.19, 0.11))
    STEEL = mat("steel", (0.65, 0.68, 0.74), rough=0.3, metallic=0.85)
    head = parts["Head"]; root = parts["Root"]
    armR = parts["ArmR"]; armL = parts["ArmL"]

    # капюшон: затылок и темя, лицо открыто
    hood = uv("Hood", (0, 0.035, 0.17), (0.125, 0.135, 0.135), HOOD, 24, 16)
    hoodtail = cone("HoodTail", (0, 0.10, 0.02), 0.085, 0.24, HOOD, rot=(2.7, 0, 0))
    mask = cube("Mask", (0, -0.105, 0.075), (0.18, 0.035, 0.05), HOOD_D, bev=0.015)
    for o in (hood, hoodtail, mask):
        o.parent = head; meshes.append(o)
    # плащ
    cape = empty("Cape", (0, 0.09, 1.46), root)
    parts["Cape"] = cape
    cm = cyl("CapeMesh", (0, 0.06, -0.52), 0.34, 0.17, 1.05, HOOD)
    cm.scale.y = 0.55
    cm.parent = cape; meshes.append(cm)
    # кинжалы в обе руки
    for nm, arm in (("DaggerR", armR), ("DaggerL", armL)):
        d = empty(nm, (0, -0.01, -0.62), arm)
        blade = cone(f"{nm}Blade", (0, 0, -0.14), 0.028, 0.24, STEEL)
        guard = cube(f"{nm}Guard", (0, 0, -0.015), (0.09, 0.025, 0.02), LEATHER, bev=0.008)
        grip = capsule(f"{nm}Grip", (0, 0, 0.03), 0.018, 0.07, LEATHER)
        for o in (blade, guard, grip):
            o.parent = d; meshes.append(o)


def gear_vampire(parts, meshes):
    HAIR_V = mat("vhair", (0.05, 0.04, 0.07))
    CAPE = mat("vcape", (0.45, 0.08, 0.16))
    CAPE_D = mat("vcape_d", (0.30, 0.05, 0.10))
    GOLD = mat("gold", (0.85, 0.62, 0.20), rough=0.3, metallic=0.8)
    WHITE = mat("white", (0.95, 0.95, 0.95), rough=0.4)
    head = parts["Head"]; root = parts["Root"]; torso = parts["Torso"]

    # причёска: зализанные волосы + пряди
    hair = uv("VHair", (0, 0.015, 0.20), (0.12, 0.125, 0.10), HAIR_V, 24, 16)
    # зализанный пробор
    part = uv("Part", (0, -0.095, 0.235), (0.10, 0.06, 0.045), HAIR_V, 20, 12)
    s1 = uv("Strand1", (-0.07, -0.105, 0.21), (0.028, 0.015, 0.045), HAIR_V, 12, 8)
    s2 = uv("Strand2", (0.06, -0.11, 0.22), (0.032, 0.015, 0.035), HAIR_V, 12, 8)
    for o in (hair, part, s1, s2):
        o.parent = head; meshes.append(o)
    # клыки
    f1 = cone("Fang1", (-0.035, -0.085, 0.005), 0.012, 0.035, WHITE, rot=(math.pi, 0, 0))
    f2 = cone("Fang2", (0.035, -0.085, 0.005), 0.012, 0.035, WHITE, rot=(math.pi, 0, 0))
    f1.parent = head; f2.parent = head
    meshes += [f1, f2]
    # высокий воротник
    collar = cyl("Collar", (0, 0.03, -0.02), 0.15, 0.10, 0.16, CAPE)
    collar.parent = head; meshes.append(collar)
    # плащ с подкладкой
    cape = empty("Cape", (0, 0.10, 1.46), root)
    parts["Cape"] = cape
    cm = cyl("CapeMesh", (0, 0.07, -0.52), 0.36, 0.19, 1.08, CAPE)
    cm.scale.y = 0.55
    cm.parent = cape; meshes.append(cm)
    cm2 = cyl("CapeLining", (0, 0.045, -0.52), 0.345, 0.18, 1.04, CAPE_D)
    cm2.scale.y = 0.5
    cm2.parent = cape; meshes.append(cm2)
    # медальон
    chain = torus("Chain", (0, -0.135, 1.40), 0.05, 0.008, GOLD, rot=(math.pi / 2 - 0.3, 0, 0))
    med = uv("Medallion", (0, -0.155, 1.33), (0.028, 0.014, 0.032), GOLD, 12, 10)
    chain.parent = torso; med.parent = torso
    meshes += [chain, med]


CLASSES = {
    "warrior": dict(shirt=(0.25, 0.38, 0.75), pants=(0.20, 0.26, 0.50), iris=(0.30, 0.45, 0.70), gear=gear_warrior),
    "mage": dict(shirt=(0.45, 0.30, 0.75), pants=(0.30, 0.22, 0.55), iris=(0.55, 0.35, 0.70), gear=gear_mage),
    "rogue": dict(shirt=(0.18, 0.45, 0.28), pants=(0.14, 0.28, 0.18), iris=(0.30, 0.55, 0.30), gear=gear_rogue),
    "vampire": dict(shirt=(0.14, 0.12, 0.22), pants=(0.09, 0.08, 0.14), iris=(0.65, 0.15, 0.15), gear=gear_vampire),
}


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)
    for cls_id, cfg in CLASSES.items():
        reset_scene()
        cfg2 = dict(cfg); cfg2.pop("gear")
        root, parts, meshes = build_body(cfg2)
        cfg["gear"](parts, meshes)
        export_glb(f"{OUT_DIR}/hero_{cls_id}.glb", [root] + meshes)
        preview(f"/tmp/prev_hero_{cls_id}.png", meshes)
        print("OK", cls_id)


main()
