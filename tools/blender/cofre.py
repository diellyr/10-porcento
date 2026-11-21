"""Cofre do Guardião: aço grafite com frisos dourados, porta redonda com volante, interior forrado
de veludo e cheio de maços de dinheiro, barras de ouro e pilhas de moedas.

Animação "Abrir" (24 fps, 3 s): o volante dá duas voltas e a porta se abre 110° na dobradiça.
Peças nomeadas para o jogo: Dobradica (pivô da porta), Volante, Brilho (luz dourada interna).
"""
import math

import bpy

from comum import caixa, chave, cilindro, exportar, filho, limpar, material, previa, toro, unir, vazio

L, P, A = 1.5, 1.0, 1.9      # largura, profundidade, altura
E = 0.12                     # espessura das paredes


def construir():
    limpar()
    aco = material("aco_grafite", "#2c2f36", metal=0.85, rug=0.32, clearcoat=0.3)
    aco_esc = material("aco_escuro", "#1a1c21", metal=0.8, rug=0.45)
    ouro = material("ouro", "#e8b84a", metal=1.0, rug=0.22)
    veludo = material("veludo_vinho", "#5c1622", rug=0.85)
    nota = material("nota_verde", "#3f8f5a", rug=0.7)
    cinta = material("cinta_papel", "#f2e6c2", rug=0.6)
    brilho = material("brilho_ouro", "#ffcf6a", emissao=4.0)

    # --- corpo (caixa aberta na frente, voltada para -Y) ---
    pecas = [
        caixa((L, E, A), (0, P / 2 - E / 2, A / 2 + 0.08), aco, 0.03),                 # fundo
        caixa((E, P, A), (-L / 2 + E / 2, 0, A / 2 + 0.08), aco, 0.03),                # lado esq.
        caixa((E, P, A), (L / 2 - E / 2, 0, A / 2 + 0.08), aco, 0.03),                 # lado dir.
        caixa((L, P, E), (0, 0, A + 0.08 - E / 2), aco, 0.03),                         # teto
        caixa((L, P, E), (0, 0, 0.08 + E / 2), aco, 0.03),                             # base
        caixa((L + 0.04, 0.05, 0.06), (0, -P / 2 - 0.01, A + 0.06), ouro, 0.01),       # friso superior
        caixa((L + 0.04, 0.05, 0.06), (0, -P / 2 - 0.01, 0.12), ouro, 0.01),           # friso inferior
    ]
    for x in (-L / 2 + 0.12, L / 2 - 0.12):
        for y in (-P / 2 + 0.12, P / 2 - 0.12):
            pecas.append(cilindro(0.07, 0.08, (x, y, 0.04), ouro, 24, chanfro=0.01))  # pés
    # forro e prateleiras
    pecas.append(caixa((L - 2 * E, 0.02, A - 2 * E), (0, P / 2 - E - 0.01, A / 2 + 0.08), veludo))
    for z in (0.75, 1.35):
        pecas.append(caixa((L - 2 * E, P - E - 0.06, 0.04), (0, 0.03, z), aco_esc, 0.01))
        pecas.append(caixa((L - 2 * E, 0.02, 0.05), (0, -P / 2 + 0.05, z), ouro))
    corpo = unir(pecas, "Corpo")

    # --- tesouro ---
    t = []

    def macos(x, y, z, n):
        for k in range(n):
            zz = z + 0.036 * k + 0.018
            t.append(caixa((0.2, 0.09, 0.034), (x, y, zz), nota, 0.004, segs=1))
            t.append(caixa((0.035, 0.092, 0.036), (x, y, zz), cinta))

    def moedas(x, y, z, n):
        t.append(cilindro(0.05, 0.009 * n, (x, y, z + 0.0045 * n), ouro, 28, chanfro=0.003))

    topo, meio, base = 1.39, 0.79, 0.08 + E
    # prateleira de cima: fileira de maços, alturas variadas
    for i, x in enumerate((-0.48, -0.25, -0.02, 0.21, 0.44)):
        macos(x, 0.0, topo, (5, 7, 4, 6, 3)[i])
        macos(x, 0.17, topo, (3, 4, 6, 2, 5)[i])
    # prateleira do meio: pirâmide de barras de ouro e moedas
    for fila, (n, z) in enumerate(((5, 0), (4, 1), (3, 2), (1, 3))):
        for k in range(n):
            x = -0.5 + 0.11 * fila + 0.22 * k
            t.append(caixa((0.2, 0.1, 0.058), (x, 0.05, meio + 0.03 + 0.06 * z), ouro, 0.012, segs=2))
    for x, y, n in ((0.42, 0.18, 14), (0.3, 0.2, 9), (0.48, 0.02, 6)):
        moedas(x, y, meio, n)
    # base: sacos de dinheiro, maços e moedas
    for x, y, r in ((0.3, 0.08, 0.2), (0.0, 0.18, 0.17)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, base + r * 0.85), segments=24, ring_count=14)
        saco = bpy.context.active_object
        saco.scale = (1, 1, 0.88)
        bpy.ops.object.transform_apply(scale=True)
        bpy.ops.object.shade_smooth()
        saco.data.materials.append(material("saco_lona", "#c9b27a", rug=0.9))
        t.append(saco)
        t.append(cilindro(0.045, 0.07, (x, y, base + r * 1.7), cinta, 16))
        t.append(cilindro(0.06, 0.012, (x, y - r * 0.95, base + r * 0.9), nota, 6, rot=(math.radians(90), 0, 0)))  # cifrão estilizado
    macos(-0.45, 0.0, base, 6)
    macos(-0.45, 0.17, base, 4)
    for x, y, n in ((-0.2, -0.05, 10), (-0.12, 0.08, 6), (0.5, -0.12, 5)):
        moedas(x, y, base, n)
    unir(t, "Tesouro")

    # filetes de LED dourado sob o teto e sob as prateleiras (emissivos: o bloom do jogo faz o halo)
    for z in (A + 0.08 - E - 0.012, 0.75 - 0.03, 1.35 - 0.03):
        caixa((L - 2 * E - 0.06, 0.02, 0.012), (0, -P / 2 + 0.1, z), brilho, nome=None)
    leds = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.data.materials and o.data.materials[0] == brilho]
    unir(leds, "Brilho")

    # --- porta (pivô na dobradiça esquerda) ---
    yP = -P / 2 - 0.09
    dob = vazio("Dobradica", (-L / 2 + 0.02, yP, A / 2 + 0.08))
    pp = [caixa((L - 0.06, 0.16, A - 0.06), (0, yP, A / 2 + 0.08), aco, 0.05, segs=4)]
    pp.append(toro(0.5, 0.025, (0, yP - 0.085, A / 2 + 0.1), ouro, rot=(math.radians(90), 0, 0)))
    for z in (0.45, A / 2 + 0.08, A - 0.3):                                            # trincos
        pp.append(cilindro(0.04, 0.1, (L / 2 - 0.06, yP, z), ouro, 20, rot=(0, math.radians(90), 0)))
    for z in (0.4, A - 0.25):                                                            # dobradiças
        pp.append(cilindro(0.05, 0.22, (-L / 2 + 0.02, yP, z), aco_esc, 20))
    # placa "10%"
    pp.append(caixa((0.42, 0.02, 0.16), (0, yP - 0.09, A - 0.22), ouro, 0.01))
    bpy.ops.object.text_add(location=(0, yP - 0.101, A - 0.22), rotation=(math.radians(90), 0, 0))
    tx = bpy.context.active_object
    tx.data.body = "10%"
    tx.data.align_x, tx.data.align_y = "CENTER", "CENTER"
    tx.data.size = 0.13
    tx.data.extrude = 0.006
    bpy.ops.object.convert(target="MESH")
    tx.data.materials.clear()
    tx.data.materials.append(aco_esc)
    pp.append(tx)
    porta = unir(pp, "Porta")

    # volante (gira em torno do eixo Y, perpendicular à porta)
    cz = A / 2 + 0.1
    vv = [toro(0.3, 0.03, (0, yP - 0.17, cz), ouro, rot=(math.radians(90), 0, 0)),
          cilindro(0.08, 0.1, (0, yP - 0.13, cz), ouro, 24, rot=(math.radians(90), 0, 0), chanfro=0.01)]
    for k in range(4):
        a = k * math.pi / 4
        vv.append(cilindro(0.016, 0.6, (0, yP - 0.17, cz), ouro, 12, rot=(0, a, 0)))
    for k in range(8):                                                                    # pegadores
        a = k * math.pi / 4
        vv.append(cilindro(0.028, 0.05, (0.33 * math.cos(a), yP - 0.17, cz + 0.33 * math.sin(a)), ouro, 12, rot=(math.radians(90), 0, 0)))
    vol = unir(vv, "Volante")
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")  # cursor está na origem; reposiciona abaixo
    bpy.context.scene.cursor.location = (0, yP - 0.15, cz)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0, 0, 0)

    filho(dob, porta)
    filho(porta, vol)

    # --- animação "Abrir" ---
    sc = bpy.context.scene
    sc.render.fps = 24
    sc.frame_start, sc.frame_end = 1, 72
    chave(vol, "rotation_euler", 1, (0, 0, 0))
    chave(vol, "rotation_euler", 30, (0, math.radians(720), 0))
    chave(dob, "rotation_euler", 1, (0, 0, 0))
    chave(dob, "rotation_euler", 30, (0, 0, 0))
    chave(dob, "rotation_euler", 64, (0, 0, math.radians(-110)))
    chave(dob, "rotation_euler", 72, (0, 0, math.radians(-104)))   # pequeno rebote
    for ob in (vol, dob):
        act = ob.animation_data.action
        act.name = "Abrir"
    return corpo


if __name__ == "__main__":
    construir()
    print(exportar("cofre"))
