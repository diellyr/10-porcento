"""Constrói o protagonista piloto, exporta public/jogo/3d/blender/gestor.glb e renderiza as vistas de aprovação.

    .venv-blender/bin/python tools/blender/piloto_gestor.py [--sem-render]
"""
import math
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import comum  # noqa: E402
import gestor  # noqa: E402

PREVIA = Path(os.environ.get("PREVIA_DIR", Path(__file__).parent / "previas"))


def exportar(arm):
    comum.SAIDA.mkdir(parents=True, exist_ok=True)
    arq = comum.SAIDA / "gestor.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type in ("ARMATURE", "MESH"):
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(arq), export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=False, export_animations=True, export_animation_mode="ACTIONS",
                              export_skins=True, export_morph=True, export_morph_normal=False, export_texcoords=False,
                              export_cameras=False, export_lights=False)
    return arq


def palco():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 64; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 900, 1100
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    w = bpy.data.worlds.new("mundo"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.09, 0.07, 0.12, 1)
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=20); chao = bpy.context.active_object
    chao.data.materials.append(comum.material("chao_estudio", "#2a2333", rug=0.5))
    luzes = []
    for nome, pos, en, cor, tam in (("chave", (-2.2, -3.0, 3.2), 700, (1.0, 0.86, 0.7), 2.2), ("prench", (3.0, -2.0, 1.6), 260, (0.7, 0.78, 1.0), 3.0),
                                    ("recorte", (1.0, 3.0, 3.0), 650, (1.0, 0.85, 0.55), 1.6)):
        ld = bpy.data.lights.new(nome, "AREA"); ld.energy, ld.color, ld.size = en, cor, tam
        lo = bpy.data.objects.new(nome, ld); lo.location = pos; sc.collection.objects.link(lo); luzes.append(lo)
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    mira = bpy.data.objects.new("mira", None); sc.collection.objects.link(mira)
    tr = cam.constraints.new("TRACK_TO"); tr.target = mira
    for lo in luzes:
        t2 = lo.constraints.new("TRACK_TO"); t2.target = mira
    return cam, mira


def vista(nome, cam, mira, pos, alvo, lente, quadro=1, acao="Parado", chaves=None, res=(900, 1100)):
    sc = bpy.context.scene
    arm = bpy.data.objects["Gestor"]
    arm.animation_data.action = bpy.data.actions[acao]
    sc.frame_set(quadro)
    head = bpy.data.objects["Cabeca_Gestor"]
    for kb in head.data.shape_keys.key_blocks[1:]:
        kb.value = (chaves or {}).get(kb.name, 0.0)
    cam.location = pos; mira.location = alvo; cam.data.lens = lente
    sc.render.resolution_x, sc.render.resolution_y = res
    PREVIA.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(PREVIA / f"gestor-{nome}.png")
    bpy.ops.render.render(write_still=True)
    print("render", sc.render.filepath)


if __name__ == "__main__":
    arm = gestor.construir()
    arq = exportar(arm)
    print("exportado", arq, f"{arq.stat().st_size / 1024:.0f} KB")
    if "--sem-render" not in sys.argv:
        cam, mira = palco()
        h = bpy.data.objects["Cabeca_Gestor"]
        bb = [h.matrix_world @ Vector(c) for c in h.bound_box]
        hz = sum(p.z for p in bb) / 8
        so = [a for a in sys.argv[1:] if not a.startswith("--")]
        V = {
            "frente": ((0, -4.6, 1.05), (0, 0, 0.98), 50, 1, "Parado", {"sorriso": 0.5}),
            "lado": ((4.6, 0, 1.05), (0, 0, 0.98), 50, 1, "Parado", {"sorriso": 0.5}),
            "costas": ((0, 4.6, 1.05), (0, 0, 0.98), 50, 1, "Parado", {}),
            "rosto": ((0.35, -1.25, hz + 0.05), (0, 0, hz - 0.01), 85, 1, "Parado", {"sorriso": 0.8}),
            "pose": ((1.6, -3.6, 1.3), (0, 0, 0.95), 45, 18, "Comemorar", {"sorriso": 1.0, "iris_grande": 0.8, "sobrancelha_surpresa": 0.4}),
        }
        for nome, (pos, alvo, lente, q, acao, ch) in V.items():
            if so and nome not in so:
                continue
            vista(nome, cam, mira, pos, alvo, lente, q, acao, ch, (900, 900) if nome == "rosto" else (900, 1100))
