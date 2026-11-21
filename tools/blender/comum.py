"""Utilitários do pipeline Blender do MEUS 10%.

Roda com o Blender como módulo Python (pacote oficial `bpy`, sem janela):
    python -m venv .venv-blender && .venv-blender/bin/pip install bpy==5.3.0
    .venv-blender/bin/python tools/blender/construir.py            # todos os assets
    .venv-blender/bin/python tools/blender/construir.py cofre      # só um

Cada asset é um módulo com `construir()` que monta a cena; aqui ficam materiais,
modificadores, exportação GLB (pasta public/jogo/3d/blender) e render de prévia (Cycles, CPU).
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import bpy

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "public" / "jogo" / "3d" / "blender"
PREVIA = Path(os.environ.get("PREVIA_DIR", RAIZ / "tools" / "blender" / "previas"))


def limpar() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.lights, bpy.data.cameras):
        for b in list(col):
            col.remove(b)


_mats: dict[str, bpy.types.Material] = {}


def material(nome: str, cor: str, metal: float = 0.0, rug: float = 0.5, emissao: float = 0.0, clearcoat: float = 0.0) -> bpy.types.Material:
    """Material PBR (Principled BSDF) que o exportador glTF converte 1:1 para o three.js."""
    if nome in _mats and _mats[nome].name in bpy.data.materials:
        return _mats[nome]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    r, g, b = (int(cor[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = tuple(((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in (r, g, b))
    p.inputs["Base Color"].default_value = (*lin, 1.0)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rug
    if clearcoat:
        p.inputs["Coat Weight"].default_value = clearcoat
    if emissao:
        p.inputs["Emission Color"].default_value = (*lin, 1.0)
        p.inputs["Emission Strength"].default_value = emissao
    _mats[nome] = m
    return m


def _fim(ob: bpy.types.Object, mat: bpy.types.Material | None, nome: str | None) -> bpy.types.Object:
    if nome:
        ob.name = nome
        ob.data.name = nome
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob


def caixa(tam, pos, mat=None, chanfro: float = 0.0, nome: str | None = None, segs: int = 3) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    ob = bpy.context.active_object
    ob.scale = tam
    bpy.ops.object.transform_apply(scale=True)
    if chanfro:
        bv = ob.modifiers.new("chanfro", "BEVEL")
        bv.width = chanfro
        bv.segments = segs
        bv.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=bv.name)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    return _fim(ob, mat, nome)


def cilindro(raio, alt, pos, mat=None, vert: int = 32, rot=(0, 0, 0), chanfro: float = 0.0, nome: str | None = None) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vert, radius=raio, depth=alt, location=pos, rotation=rot)
    ob = bpy.context.active_object
    if chanfro:
        bv = ob.modifiers.new("chanfro", "BEVEL")
        bv.width = chanfro
        bv.segments = 2
        bv.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=bv.name)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    return _fim(ob, mat, nome)


def toro(r_maior, r_menor, pos, mat=None, rot=(0, 0, 0), nome: str | None = None) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=r_maior, minor_radius=r_menor, major_segments=40, minor_segments=10, location=pos, rotation=rot)
    ob = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    return _fim(ob, mat, nome)


def unir(obs: list[bpy.types.Object], nome: str) -> bpy.types.Object:
    """Junta várias peças estáticas numa malha só (uma chamada de desenho por material no jogo)."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ob.name = nome
    ob.data.name = nome
    return ob


def vazio(nome: str, pos=(0, 0, 0)) -> bpy.types.Object:
    ob = bpy.data.objects.new(nome, None)
    ob.location = pos
    bpy.context.scene.collection.objects.link(ob)
    return ob


def filho(pai: bpy.types.Object, *obs: bpy.types.Object) -> None:
    for o in obs:
        mw = o.matrix_world.copy()
        o.parent = pai
        o.matrix_world = mw


def chave(ob: bpy.types.Object, prop: str, quadro: int, valor) -> None:
    setattr(ob, prop, valor)
    ob.keyframe_insert(data_path=prop, frame=quadro)


def exportar(nome: str) -> Path:
    SAIDA.mkdir(parents=True, exist_ok=True)
    arq = SAIDA / f"{nome}.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(arq), export_format="GLB", export_yup=True, export_apply=True,
                              export_animations=True, export_animation_mode="ACTIVE_ACTIONS", export_cameras=False, export_lights=False)
    return arq


def previa(nome: str, alvo=(0, 0, 0.9), dist: float = 4.2, alt: float = 1.6, quadro: int | None = None, amostras: int = 48) -> Path:
    """Render de conferência (Cycles na CPU), com câmera em 3/4, luz-chave quente e preenchimento frio."""
    sc = bpy.context.scene
    if quadro is not None:
        sc.frame_set(quadro)
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = amostras
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 960, 720
    sc.view_settings.view_transform = "AgX"
    w = bpy.data.worlds.new("mundo")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.045, 0.06, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sc.world = w
    ax, ay, az = alvo
    cam_d = bpy.data.cameras.new("cam")
    cam_d.lens = 45
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    cam.location = (ax + dist * 0.62, ay - dist * 0.78, az + alt)
    d = bpy.data.objects.new("mira", None)
    d.location = alvo
    sc.collection.objects.link(d)
    tr = cam.constraints.new("TRACK_TO")
    tr.target = d
    sc.camera = cam
    for nome_l, pos, en, cor, tam in (("chave", (ax - 2.5, ay - 3.0, az + 3.5), 900, (1.0, 0.82, 0.62), 2.0),
                                      ("prench", (ax + 3.5, ay - 1.0, az + 1.5), 300, (0.6, 0.72, 1.0), 3.0),
                                      ("recorte", (ax, ay + 3.0, az + 2.5), 500, (1.0, 0.9, 0.8), 1.5)):
        ld = bpy.data.lights.new(nome_l, "AREA")
        ld.energy, ld.color, ld.size = en, cor, tam
        lo = bpy.data.objects.new(nome_l, ld)
        lo.location = pos
        sc.collection.objects.link(lo)
        t2 = lo.constraints.new("TRACK_TO")
        t2.target = d
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    chao = bpy.context.active_object
    chao.name = "chao_previa"
    chao.data.materials.append(material("chao_previa", "#2a2430", rug=0.6))
    PREVIA.mkdir(parents=True, exist_ok=True)
    arq = PREVIA / f"{nome}{'' if quadro is None else f'-q{quadro}'}.png"
    sc.render.filepath = str(arq)
    bpy.ops.render.render(write_still=True)
    # remove o que é só da prévia, para não ir junto numa exportação posterior
    for o in (cam, d, chao, *[o for o in sc.objects if o.type == "LIGHT"]):
        bpy.data.objects.remove(o, do_unlink=True)
    return arq
