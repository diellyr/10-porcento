"""Objetos de poder e patrimônio (todos fictícios, no tom de sátira do jogo).

- maleta  : maleta de couro preto com fechos dourados, cheia de maços; animação "Abrir" (tampa).
- maco    : um maço de notas com cinta (peça leve para instancing em pilhas).
- moeda   : moeda dourada "10%" (peça leve para chuva de moedas).
- trofeu  : troféu dourado "Gestor do Ano" sobre base de madeira.
- coroa   : coroa dourada com pedras vermelhas e roxas (final Imperador).
- trono   : trono de veludo vinho com espaldar alto e frisos dourados.
"""
import math

import bpy

from comum import caixa, chave, cilindro, limpar, material, toro, unir, vazio, filho


def _mats():
    return dict(
        ouro=material("ouro", "#e8b84a", metal=1.0, rug=0.22),
        couro=material("couro_preto", "#17151a", rug=0.42, clearcoat=0.5),
        nota=material("nota_verde", "#3f8f5a", rug=0.7),
        cinta=material("cinta_papel", "#f2e6c2", rug=0.6),
        madeira=material("madeira_escura", "#4a2a18", rug=0.45, clearcoat=0.6),
        veludo=material("veludo_vinho", "#5c1622", rug=0.85),
        rubi=material("rubi", "#c8323c", metal=0.1, rug=0.08, clearcoat=1.0),
        ametista=material("ametista", "#6a4fa8", metal=0.1, rug=0.08, clearcoat=1.0),
        forro=material("forro_vinho", "#3a0f18", rug=0.9),
    )


def _texto(txt, pos, tam, mat, rot=(math.radians(90), 0, 0), prof=0.004):
    bpy.ops.object.text_add(location=pos, rotation=rot)
    t = bpy.context.active_object
    t.data.body = txt
    t.data.align_x, t.data.align_y = "CENTER", "CENTER"
    t.data.size = tam
    t.data.extrude = prof
    bpy.ops.object.convert(target="MESH")
    t.data.materials.clear()
    t.data.materials.append(mat)
    return t


def _macos(m, x, y, z, n, lista):
    for k in range(n):
        zz = z + 0.036 * k + 0.018
        lista.append(caixa((0.2, 0.09, 0.034), (x, y, zz), m["nota"], 0.004, segs=1))
        lista.append(caixa((0.035, 0.092, 0.036), (x, y, zz), m["cinta"]))


def maleta():
    limpar()
    m = _mats()
    W, D, H = 0.62, 0.42, 0.11
    e = 0.018                                        # bandeja aberta: fundo + 4 paredes
    base = [caixa((W, D, e), (0, 0, e / 2), m["couro"], 0.006),
            caixa((W, e, H), (0, -D / 2 + e / 2, H / 2), m["couro"], 0.006),
            caixa((W, e, H), (0, D / 2 - e / 2, H / 2), m["couro"], 0.006),
            caixa((e, D, H), (-W / 2 + e / 2, 0, H / 2), m["couro"], 0.006),
            caixa((e, D, H), (W / 2 - e / 2, 0, H / 2), m["couro"], 0.006),
            caixa((W - 2 * e, D - 2 * e, 0.004), (0, 0, e + 0.002), m["forro"])]
    for x in (-0.19, 0.0, 0.19):                     # dinheiro dentro, até a borda
        for y in (-0.1, 0.0, 0.1):
            _macos(m, x, y, e, 2, base)
    for x in (-0.2, 0.2):                            # fechos
        base.append(caixa((0.06, 0.02, 0.04), (x, -D / 2 - 0.008, H - 0.01), m["ouro"], 0.005))
    base.append(toro(0.05, 0.012, (0, -D / 2 - 0.03, H - 0.01), m["ouro"], rot=(0, 0, 0)))   # alça
    unir(base, "Base")
    dob = vazio("Dobradica", (0, D / 2, H))
    tampa = [caixa((W, D, 0.06), (0, 0, H + 0.03), m["couro"], 0.02, segs=3),
             caixa((W - 0.04, D - 0.04, 0.01), (0, 0, H + 0.004), m["forro"]),
             caixa((0.14, 0.004, 0.05), (0, -D / 2 - 0.002, H + 0.03), m["ouro"])]
    tp = unir(tampa, "Tampa")
    filho(dob, tp)
    sc = bpy.context.scene
    sc.render.fps = 24
    chave(dob, "rotation_euler", 1, (0, 0, 0))
    chave(dob, "rotation_euler", 18, (math.radians(-104), 0, 0))
    chave(dob, "rotation_euler", 24, (math.radians(-98), 0, 0))
    dob.animation_data.action.name = "Abrir"


def maco():
    limpar()
    m = _mats()
    pecas = [caixa((0.2, 0.09, 0.034), (0, 0, 0.017), m["nota"], 0.004, segs=1),
             caixa((0.035, 0.092, 0.036), (0, 0, 0.017), m["cinta"])]
    unir(pecas, "Maco")


def moeda():
    limpar()
    m = _mats()
    pecas = [cilindro(0.05, 0.008, (0, 0, 0.004), m["ouro"], 24, chanfro=0.002),
             toro(0.046, 0.003, (0, 0, 0.008), m["ouro"])]
    unir(pecas, "Moeda")


def trofeu():
    limpar()
    m = _mats()
    p = [caixa((0.24, 0.24, 0.1), (0, 0, 0.05), m["madeira"], 0.01),
         caixa((0.16, 0.005, 0.04), (0, -0.121, 0.05), m["ouro"]),
         cilindro(0.06, 0.04, (0, 0, 0.12), m["ouro"], 32, chanfro=0.005),
         cilindro(0.018, 0.12, (0, 0, 0.2), m["ouro"], 20)]
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.05, radius2=0.12, depth=0.2, end_fill_type="NOTHING", location=(0, 0, 0.36))
    taca = bpy.context.active_object
    sol = taca.modifiers.new("espessura", "SOLIDIFY")
    sol.thickness = 0.01
    bpy.ops.object.modifier_apply(modifier=sol.name)
    bpy.ops.object.shade_smooth()
    p.append(cilindro(0.05, 0.012, (0, 0, 0.266), m["ouro"], 40))   # fundo da taça
    taca.data.materials.append(m["ouro"])
    p.append(taca)
    for s in (-1, 1):                                # alças
        p.append(toro(0.05, 0.01, (s * 0.115, 0, 0.37), m["ouro"], rot=(math.radians(90), 0, 0)))
    p.append(_texto("GESTOR DO ANO", (0, -0.124, 0.05), 0.018, m["madeira"]))
    unir(p, "Trofeu")


def coroa():
    limpar()
    m = _mats()
    p = [cilindro(0.16, 0.08, (0, 0, 0.04), m["ouro"], 48, chanfro=0.006),
         toro(0.16, 0.012, (0, 0, 0.0), m["ouro"]), toro(0.16, 0.012, (0, 0, 0.08), m["ouro"])]
    bpy.ops.object.select_all(action="DESELECT")
    for k in range(8):                               # pontas com pérolas
        a = k * math.pi / 4
        x, y = 0.16 * math.cos(a), 0.16 * math.sin(a)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.05, depth=0.12, location=(x, y, 0.14), rotation=(0, 0, a + math.pi / 4))
        c = bpy.context.active_object
        c.scale = (1, 0.35, 1)
        bpy.ops.object.transform_apply(scale=True)
        c.data.materials.append(m["ouro"])
        p.append(c)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.016, location=(x, y, 0.205), segments=16, ring_count=8)
        pe = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        pe.data.materials.append(m["cinta"])
        p.append(pe)
        gema = m["rubi"] if k % 2 == 0 else m["ametista"]
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.022, subdivisions=1, location=(0.163 * math.cos(a + math.pi / 8), 0.163 * math.sin(a + math.pi / 8), 0.04))
        g = bpy.context.active_object
        g.data.materials.append(gema)
        p.append(g)
    p.append(cilindro(0.15, 0.05, (0, 0, 0.03), m["veludo"], 40))   # forro
    unir(p, "Coroa")


def trono():
    limpar()
    m = _mats()
    p = [caixa((0.9, 0.8, 0.45), (0, 0, 0.225), m["madeira"], 0.03),
         caixa((0.78, 0.7, 0.12), (0, -0.02, 0.5), m["veludo"], 0.05, segs=4),         # assento
         caixa((0.9, 0.16, 1.5), (0, 0.33, 0.95), m["madeira"], 0.03),                   # espaldar
         caixa((0.7, 0.06, 1.2), (0, 0.24, 1.0), m["veludo"], 0.04, segs=4)]
    for s in (-1, 1):
        p.append(caixa((0.12, 0.7, 0.32), (s * 0.45, -0.02, 0.6), m["madeira"], 0.03))     # braços
        p.append(cilindro(0.07, 0.06, (s * 0.45, -0.34, 0.79), m["ouro"], 24, rot=(math.radians(90), 0, 0)))
        p.append(cilindro(0.05, 1.62, (s * 0.46, 0.33, 0.81), m["ouro"], 20))              # colunas
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(s * 0.46, 0.33, 1.66), segments=24, ring_count=12)
        b = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        b.data.materials.append(m["ouro"])
        p.append(b)
    p.append(toro(0.22, 0.02, (0, 0.205, 1.25), m["ouro"], rot=(math.radians(90), 0, 0)))  # medalhão
    p.append(_texto("10%", (0, 0.2, 1.25), 0.16, m["ouro"], prof=0.01))
    p.append(caixa((1.1, 1.0, 0.05), (0, 0, 0.025), m["ouro"], 0.01))                       # degrau dourado
    unir(p, "Trono")


ASSETS = {"maleta": maleta, "maco": maco, "moeda": moeda, "trofeu": trofeu, "coroa": coroa, "trono": trono}
