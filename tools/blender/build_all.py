"""Генерация всех GLB-моделей одной командой:
blender -b -P tools/blender/build_all.py
"""
import sys, os, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

def run(modname):
    path = os.path.join(HERE, modname)
    src = open(path).read().replace("\nmain()", "\n# main() пропущен")
    ns = {"__file__": path}
    exec(compile(src, modname, "exec"), ns)
    return ns

# 1. герои (свой main — генерирует 4 GLB)
run("gen_hero.py")["main"]()
# 2. жабка (органическая, по референсу)
run("gen_frog.py")["main"]()
# 3. органические монстры (мышь, лиса, сова, дракон) — генерируем за один запуск
ns = run("gen_organic.py")
# 4. робот (из gen_monsters, без main)
ns = run("gen_monsters.py")
from lib import reset_scene
reset_scene()
root, meshes = ns["robot"]()
from lib import export_glb, OUT_DIR
export_glb(f"{OUT_DIR}/mon_robot.glb", [root] + meshes)
# 5. природа (свой main — 12 GLB)
run("gen_nature.py")["main"]()
print("ALL DONE")
