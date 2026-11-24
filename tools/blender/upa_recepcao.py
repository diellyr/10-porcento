"""CENÁRIO PILOTO — Recepção e Triagem da UPA (nível 1).

Mobília e sinalização da sala, no espaço local da sala do jogo (9,6 × 7 m; origem no centro do piso).
Respeita os pontos de jogo existentes: balcão com computador (pc-balcao em x 1,6 / z −1,3), painel de espera na
parede do fundo (x −2,4), portas no centro do fundo (x ±0,9), Célia de pé em (−2,6, 0,2) e as duas fileiras de
pacientes sentados (z 2,3 com 6 lugares a partir de x −4,0; z 0,9 com 4 lugares a partir de x −3,4; passo 1,25).

Coordenadas: escrevo em "coordenadas do jogo" (x, altura, z) e converto para o Blender (x, −z, altura).
"""
import math

import bpy

from comum import caixa, cilindro, limpar, material, toro, unir


def P(x, y, z):
    return (x, -z, y)


def T(x, y, z):
    """tamanho (largura x, altura y, profundidade z) do jogo -> Blender"""
    return (x, z, y)


def texto(txt, pos, tam, mat, frente="+z", prof=0.004, alinha="CENTER"):
    """Texto em malha voltado para +z do jogo (−y do Blender) ou para +x."""
    rot = (math.radians(90), 0, 0) if frente == "+z" else (math.radians(90), 0, math.radians(90))
    bpy.ops.object.text_add(location=pos, rotation=rot)
    t = bpy.context.active_object
    t.data.body = txt; t.data.align_x, t.data.align_y = alinha, "CENTER"; t.data.size = tam; t.data.extrude = prof
    bpy.ops.object.convert(target="MESH")
    t.data.materials.clear(); t.data.materials.append(mat)
    return t


def construir():
    limpar()
    M = dict(
        madeira=material("laminado_madeira", "#b5733f", rug=0.45, clearcoat=0.3),
        tampo=material("tampo_claro", "#ece6da", rug=0.35, clearcoat=0.4),
        rodape=material("rodape_cinza", "#8d939c", rug=0.5),
        branco=material("branco", "#f6f4ef", rug=0.5),
        vermelho=material("vermelho_upa", "#d7262f", rug=0.4),
        azul=material("assento_azul", "#2a5be0", rug=0.35, clearcoat=0.5),
        metal=material("metal_cromado", "#c9ced6", metal=1.0, rug=0.25),
        metal_esc=material("metal_grafite", "#3d4350", metal=0.7, rug=0.4),
        acrilico=material("acrilico", "#dff3ff", rug=0.05, alfa=0.22),
        tela=material("tela_acesa", "#cfeaff", emissao=1.6),
        tela_escura=material("tela_escura", "#14171d", rug=0.3),
        preto=material("plastico_preto", "#1c1e22", rug=0.45),
        papel=material("papel", "#f4efe2", rug=0.8),
        ouro=material("ouro", "#e8b84a", metal=1.0, rug=0.25),
        verde=material("verde_sus", "#159447", rug=0.45),
        cortica=material("cortica", "#a77b4f", rug=0.9),
        amarelo=material("amarelo_aviso", "#f5c518", rug=0.5),
        agua=material("agua", "#7cc4f0", rug=0.05, alfa=0.5),
        texto_esc=material("texto_escuro", "#1d2433", rug=0.6),
    )
    pecas = []
    add = pecas.append

    # ---------- balcão em L ----------
    bx, bz, bw, bd, bh = 1.2, -1.7, 4.6, 0.9, 1.05
    add(caixa(T(bw, bh - 0.08, bd - 0.06), P(bx, (bh - 0.08) / 2, bz), M["madeira"], 0.01))
    add(caixa(T(bw + 0.12, 0.06, bd + 0.08), P(bx, bh - 0.03, bz + 0.02), M["tampo"], 0.012))       # tampo com sobra
    add(caixa(T(bw + 0.02, 0.12, 0.02), P(bx, 0.06, bz + bd / 2 - 0.02), M["rodape"]))              # rodapé
    for k in range(3):                                                                               # frisos
        add(caixa(T(bw - 0.3, 0.012, 0.01), P(bx, 0.32 + 0.18 * k, bz + bd / 2 - 0.025), M["tampo"]))
    sx, sz, sd = 3.35, -0.6, 2.0                                                                     # perna do L
    add(caixa(T(0.84, bh - 0.08, sd), P(sx, (bh - 0.08) / 2, sz), M["madeira"], 0.01))
    add(caixa(T(0.96, 0.06, sd + 0.1), P(sx, bh - 0.03, sz), M["tampo"], 0.012))
    # logotipo e letreiro na frente do balcão
    fz = bz + bd / 2 - 0.02
    add(cilindro(0.17, 0.02, P(bx - 1.25, 0.62, fz + 0.012), M["branco"], 40, rot=(math.radians(90), 0, 0)))
    add(caixa(T(0.2, 0.06, 0.012), P(bx - 1.25, 0.62, fz + 0.026), M["vermelho"]))
    add(caixa(T(0.06, 0.2, 0.012), P(bx - 1.25, 0.62, fz + 0.026), M["vermelho"]))
    add(texto("RECEPÇÃO", P(bx + 0.35, 0.62, fz + 0.02), 0.2, M["branco"]))
    # acrílico de proteção, com fresta de atendimento
    for x0, w in ((bx - 1.55, 1.4), (bx + 1.05, 2.3)):
        add(caixa(T(w, 0.55, 0.012), P(x0, bh + 0.3, bz + 0.18), M["acrilico"]))
        add(caixa(T(w, 0.02, 0.03), P(x0, bh + 0.575, bz + 0.18), M["metal"]))
    # sobre o balcão: monitor (onde está o ponto "computador"), teclado, campainha, papelada, carimbo, caneca
    mx, mz = 1.6, -1.85
    add(caixa(T(0.56, 0.36, 0.04), P(mx, bh + 0.36, mz), M["preto"], 0.01))
    add(caixa(T(0.5, 0.3, 0.005), P(mx, bh + 0.36, mz + 0.023), M["tela"]))
    add(cilindro(0.025, 0.16, P(mx, bh + 0.12, mz - 0.02), M["preto"], 16))
    add(caixa(T(0.22, 0.015, 0.16), P(mx, bh + 0.035, mz - 0.02), M["preto"], 0.004))
    add(caixa(T(0.42, 0.02, 0.14), P(mx, bh + 0.035, mz + 0.28), M["preto"], 0.004))                 # teclado
    add(cilindro(0.05, 0.012, P(0.2, bh + 0.006, -1.45), M["metal_esc"], 24))                         # campainha
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=P(0.2, bh + 0.02, -1.45), segments=24, ring_count=12)
    sino = bpy.context.active_object; bpy.ops.object.shade_smooth(); sino.data.materials.append(M["ouro"])
    import bmesh
    bm = bmesh.new(); bm.from_mesh(sino.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0], context="VERTS"); bm.to_mesh(sino.data); bm.free()
    add(sino)
    for k in range(7):                                                                               # pilha de fichas
        add(caixa(T(0.24, 0.006, 0.32), P(-0.45 + 0.004 * (k % 2), bh + 0.004 + 0.007 * k, -1.65), M["papel"]))
    add(caixa(T(0.24, 0.006, 0.32), P(-0.12, bh + 0.004, -1.55), M["papel"]))
    add(cilindro(0.025, 0.06, P(-0.12, bh + 0.04, -1.5), M["preto"], 16))                              # carimbo
    add(cilindro(0.035, 0.03, P(-0.12, bh + 0.085, -1.5), M["madeira"], 16))
    add(cilindro(0.04, 0.09, P(2.4, bh + 0.045, -1.55), M["branco"], 20))                              # caneca
    add(toro(0.025, 0.007, P(2.445, bh + 0.05, -1.55), M["branco"], rot=(math.radians(90), 0, 0)))
    # plaquinha satírica no balcão
    add(caixa(T(0.42, 0.13, 0.01), P(-0.75, bh + 0.08, -1.32), M["acrilico"]))
    add(caixa(T(0.4, 0.11, 0.003), P(-0.75, bh + 0.08, -1.315), M["branco"]))
    add(texto("ATENDIMENTO", P(-0.75, bh + 0.105, -1.31), 0.038, M["texto_esc"]))
    add(texto("(SE DER TEMPO)", P(-0.75, bh + 0.06, -1.31), 0.03, M["vermelho"]))

    # ---------- longarinas (cadeiras unidas por viga), nas posições dos pacientes ----------
    def longarina(x0, z, n):
        xs = [x0 + 1.25 * i for i in range(n)]
        add(caixa(T(xs[-1] - xs[0] + 0.7, 0.05, 0.07), P((xs[0] + xs[-1]) / 2, 0.36, z), M["metal_esc"], 0.01))
        for x in xs:
            add(caixa(T(0.6, 0.06, 0.5), P(x, 0.45, z - 0.02), M["azul"], 0.025))                    # assento
            add(caixa(T(0.6, 0.5, 0.05), P(x, 0.75, z + 0.25), M["azul"], 0.025))                    # encosto (lado +z)
            add(caixa(T(0.04, 0.32, 0.04), P(x, 0.62, z + 0.235), M["metal_esc"]))
        for x in [xs[0] - 0.25] + [xs[i] + 0.625 for i in range(0, n - 1, 2)] + [xs[-1] + 0.25]:
            add(caixa(T(0.05, 0.36, 0.05), P(x, 0.18, z - 0.15), M["metal_esc"]))                    # pés
            add(caixa(T(0.05, 0.36, 0.05), P(x, 0.18, z + 0.15), M["metal_esc"]))
            add(caixa(T(0.08, 0.02, 0.4), P(x, 0.01, z), M["metal_esc"]))
    longarina(-4.0, 2.3, 6)
    longarina(-3.4, 0.9, 4)

    # ---------- totem de senha ----------
    tx, tz = 4.2, -3.0
    add(caixa(T(0.5, 1.55, 0.4), P(tx, 0.775, tz), M["azul"], 0.04))
    add(caixa(T(0.42, 0.3, 0.02), P(tx, 1.3, tz + 0.205), M["tela"]))
    add(texto("RETIRE SUA", P(tx, 1.34, tz + 0.217), 0.045, M["texto_esc"]))
    add(texto("SENHA", P(tx, 1.27, tz + 0.217), 0.06, M["vermelho"]))
    add(cilindro(0.05, 0.03, P(tx, 1.0, tz + 0.21), M["vermelho"], 24, rot=(math.radians(90), 0, 0)))
    add(caixa(T(0.18, 0.02, 0.03), P(tx, 0.86, tz + 0.21), M["preto"]))
    add(caixa(T(0.12, 0.004, 0.05), P(tx + 0.02, 0.85, tz + 0.235), M["papel"]))

    # ---------- fila: pedestais com fita retrátil e "FILA ÚNICA" ----------
    postes = [(-0.6, -0.55), (1.0, -0.55), (2.6, -0.55)]
    for x, z in postes:
        add(cilindro(0.14, 0.03, P(x, 0.015, z), M["metal_esc"], 32))
        add(cilindro(0.028, 0.95, P(x, 0.48, z), M["metal"], 20))
        add(cilindro(0.04, 0.06, P(x, 0.95, z), M["metal"], 20))
    for (x0, z0), (x1, z1) in zip(postes, postes[1:]):
        add(caixa(T(x1 - x0 - 0.08, 0.05, 0.006), P((x0 + x1) / 2, 0.9, z0), M["vermelho"]))
    add(caixa(T(0.04, 0.5, 0.04), P(-0.6, 1.2, -0.55), M["metal"]))
    add(caixa(T(0.5, 0.3, 0.015), P(-0.6, 1.52, -0.55), M["amarelo"], 0.01))
    add(texto("FILA ÚNICA", P(-0.6, 1.52, -0.54), 0.07, M["texto_esc"]))

    # ---------- bebedouro "em manutenção" (parede esquerda) ----------
    bbx, bbz = -4.45, -1.0
    add(caixa(T(0.42, 1.0, 0.4), P(bbx, 0.5, bbz), M["branco"], 0.03))
    add(caixa(T(0.42, 0.05, 0.4), P(bbx, 1.02, bbz), M["metal"], 0.01))
    add(cilindro(0.15, 0.4, P(bbx, 1.25, bbz), M["agua"], 32))
    add(cilindro(0.16, 0.03, P(bbx, 1.06, bbz), M["metal_esc"], 32))
    add(caixa(T(0.02, 0.18, 0.3), P(bbx + 0.215, 0.72, bbz), M["papel"]))
    add(texto("EM", P(bbx + 0.228, 0.77, bbz), 0.04, M["vermelho"], frente="+x"))
    add(texto("MANUTENÇÃO", P(bbx + 0.228, 0.71, bbz), 0.034, M["vermelho"], frente="+x"))

    # ---------- ventilador de parede (parede esquerda) ----------
    vx, vy, vz = -4.62, 2.25, -2.3
    add(caixa(T(0.08, 0.16, 0.12), P(vx, vy, vz), M["branco"], 0.02))
    add(cilindro(0.06, 0.18, P(vx + 0.13, vy - 0.04, vz), M["branco"], 20, rot=(0, math.radians(90), 0)))
    add(toro(0.22, 0.012, P(vx + 0.3, vy - 0.06, vz), M["metal"], rot=(0, math.radians(90), 0)))
    for k in range(3):
        a = k * 2 * math.pi / 3
        add(caixa(T(0.01, 0.16, 0.07), P(vx + 0.29, vy - 0.06 + 0.08 * math.sin(a), vz + 0.08 * math.cos(a)), M["branco"], 0.01))

    # ---------- letreiro "UPA 24h" atrás do balcão e mural de avisos ----------
    add(caixa(T(1.9, 0.5, 0.05), P(3.0, 2.45, -3.32), M["branco"], 0.02))
    add(caixa(T(0.3, 0.1, 0.02), P(2.35, 2.45, -3.29), M["vermelho"]))
    add(caixa(T(0.1, 0.3, 0.02), P(2.35, 2.45, -3.29), M["vermelho"]))
    add(texto("UPA 24h", P(3.2, 2.45, -3.29), 0.24, M["vermelho"]))
    add(caixa(T(1.1, 0.8, 0.03), P(4.0, 1.6, -3.33), M["cortica"], 0.01))
    for (px, py, cor, rot) in ((3.7, 1.75, "papel", 0.05), (4.15, 1.8, "amarelo", -0.08), (3.85, 1.45, "verde", 0.0), (4.3, 1.45, "papel", 0.1)):
        c = caixa(T(0.28, 0.22, 0.005), P(px, py, -3.31), M[cor]); c.rotation_euler = (0, rot, 0); add(c)
        add(cilindro(0.012, 0.01, P(px, py + 0.09, -3.303), M["vermelho"], 12, rot=(math.radians(90), 0, 0)))

    # ---------- arquitetura: barra de azulejos, rachaduras e placa de "inaugurações" ----------
    azulejo = material("azulejo", "#cfe6ee", rug=0.2, clearcoat=0.6)
    rejunte = material("rejunte", "#9fb6bf", rug=0.7)
    ztras, xesq = -3.36, -4.66                    # face interna das paredes do fundo e da esquerda
    for x0, x1 in ((-4.6, -1.7), (1.7, 4.6)):     # fundo (deixa livres as portas no centro)
        add(caixa(T(x1 - x0, 1.2, 0.02), P((x0 + x1) / 2, 0.6, ztras + 0.012), azulejo))
        x = x0 + 0.2
        while x < x1 - 0.05:
            add(caixa(T(0.006, 1.2, 0.006), P(x, 0.6, ztras + 0.024), rejunte)); x += 0.2
        for k in range(1, 6):
            add(caixa(T(x1 - x0, 0.006, 0.006), P((x0 + x1) / 2, 0.2 * k, ztras + 0.024), rejunte))
        add(caixa(T(x1 - x0, 0.05, 0.035), P((x0 + x1) / 2, 1.22, ztras + 0.02), rejunte))
    add(caixa(T(0.02, 1.2, 6.6), P(xesq + 0.012, 0.6, 0.0), azulejo))           # esquerda (atrás do bebedouro e das cadeiras)
    for k in range(1, 6):
        add(caixa(T(0.006, 0.006, 6.6), P(xesq + 0.024, 0.2 * k, 0.0), rejunte))
    add(caixa(T(0.035, 0.05, 6.6), P(xesq + 0.02, 1.22, 0.0), rejunte))
    # rachaduras (sátira: a UPA "nova" já trinca)
    trinca = material("trinca", "#5d5146", rug=0.9)
    for pts in (((-3.9, 2.6), (-3.75, 2.3), (-3.8, 2.05), (-3.6, 1.8), (-3.65, 1.55)), ((2.3, 1.95), (2.45, 1.75), (2.4, 1.6), (2.6, 1.45))):
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            L = math.hypot(xb - xa, yb - ya); ang = math.atan2(xb - xa, yb - ya)
            c = caixa(T(0.012, L, 0.004), P((xa + xb) / 2, (ya + yb) / 2, ztras + 0.003), trinca)
            c.rotation_euler = (0, ang, 0); add(c)
    # placa de bronze das "inaugurações"
    bronze = material("bronze", "#9c6b30", metal=0.9, rug=0.35)
    add(caixa(T(0.62, 0.36, 0.025), P(-1.75 + 0.0, 1.65, ztras + 0.015), bronze, 0.008))
    add(texto("INAUGURADA EM", P(-1.75, 1.74, ztras + 0.03), 0.045, M["texto_esc"]))
    add(texto("2016 · 2018 · 2022", P(-1.75, 1.66, ztras + 0.03), 0.045, M["texto_esc"]))
    add(texto("(E SEGUE EM OBRAS)", P(-1.75, 1.57, ztras + 0.03), 0.032, M["vermelho"]))

    estatico = unir(pecas, "Recepcao")
    return estatico


if __name__ == "__main__":
    construir()
