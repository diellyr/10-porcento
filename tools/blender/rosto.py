"""Rosto do protagonista (v2): pele numa superfície única esculpida.

Em vez de juntar primitivas por fora (aparência de brinquedo), as formas do rosto — crânio, mandíbula, papada,
bochechas, queixo, arco das sobrancelhas, nariz, lábios, orelhas e pescoço — são fundidas por voxel remesh,
as órbitas e a boca são escavadas por boolean, e a malha é refeita e suavizada (como argila).
Cores por vértice dão bochechas/nariz rosados, lábios e olheiras. Expressões são shape keys com áreas de influência suaves.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def sm(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def gauss(p, c, r):
    return math.exp(-((p - c).length_squared) / (r * r))


def _ativo(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o


def _aplicar(o, md):
    _ativo(o); bpy.ops.object.modifier_apply(modifier=md.name)


def _esf(pos, r, esc=(1, 1, 1), seg=40, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=max(12, seg // 2), location=pos, rotation=rot)
    o = bpy.context.active_object; o.scale = esc
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def _cil(pos, r, h, rot=(0, 0, 0), v=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=pos, rotation=rot, vertices=v)
    return bpy.context.active_object


def _unir(obs, nome):
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = nome; o.data.name = nome
    return o


def _remesh(o, voxel, suav=8, fator=0.5):
    rm = o.modifiers.new("remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = voxel; rm.use_smooth_shade = True
    _aplicar(o, rm)
    if suav:
        s = o.modifiers.new("suave", "CORRECTIVE_SMOOTH"); s.factor = fator; s.iterations = suav; s.use_only_smooth = True
        _aplicar(o, s)


def _subtrair(o, cortador):
    b = o.modifiers.new("corte", "BOOLEAN"); b.operation = "DIFFERENCE"; b.object = cortador; b.solver = "EXACT"
    _aplicar(o, b)
    bpy.data.objects.remove(cortador, do_unlink=True)


def material_vc(nome, rug=0.5, coat=0.0, sss=0.0):
    """Material cuja cor vem das cores por vértice (exportadas como COLOR_0 para o three.js)."""
    m = bpy.data.materials.new(nome); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = "Cor"
    nt.links.new(ca.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rug
    if coat:
        p.inputs["Coat Weight"].default_value = coat
    if sss:
        p.inputs["Subsurface Weight"].default_value = sss
        p.inputs["Subsurface Radius"].default_value = (0.012, 0.005, 0.003)
    return m


def _lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [(x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def pintar(o, f):
    """Cores por vértice (camada 'Cor', no canto) a partir de f(posição) -> (r,g,b) linear."""
    me = o.data
    if "Cor" not in me.color_attributes:
        me.color_attributes.new("Cor", "BYTE_COLOR", "POINT")     # por vértice, 8 bits: não duplica vértices no glTF
    at = me.color_attributes["Cor"]
    mw = o.matrix_world
    for v in me.vertices:
        at.data[v.index].color = (*f(mw @ v.co), 1.0)


def mistura(a, b, t):
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def construir_rosto(base, R, M):
    """`base`: posição do osso Head. Retorna (objeto unido, C, R, centros dos olhos, z do pescoço)."""
    C = base + Vector((0, -0.02, R * 0.92))
    V = lambda x, y, z: C + Vector((x, y, z)) * R
    # ---------- pele: formas fundidas ----------
    f = []
    f.append(_esf(V(0, 0.05, 0.18), R, (0.86, 0.96, 1.0), 48))                   # crânio
    f.append(_esf(V(0, -0.12, -0.34), R * 0.98, (0.98, 0.86, 0.74), 48))         # face inferior larga (mandíbula)
    f.append(_esf(V(0, -0.2, -0.78), R * 0.72, (1.0, 0.82, 0.42), 40))           # papada
    for s in (-1, 1):
        f.append(_esf(V(s * 0.46, -0.6, -0.26), R * 0.36, (1, 0.9, 1)))           # bochechas
        f.append(_esf(V(s * 0.6, -0.36, -0.62), R * 0.34, (0.9, 0.9, 0.9)))       # cantos da mandíbula (quadrada)
        f.append(_esf(V(s * 0.95, 0.05, 0.0), R * 0.3, (0.32, 0.72, 1.1)))       # orelhas (de abano, caricatas)
    f.append(_esf(V(0, -0.74, -0.82), R * 0.32, (1.25, 0.85, 0.75)))             # queixo
    f.append(_esf(V(0, -0.8, 0.33), R * 0.6, (1.08, 0.3, 0.22)))                 # arco das sobrancelhas
    # nariz: ponte + bulbo + asas (caricato, caído)
    f.append(_esf(V(0, -0.93, 0.08), R * 0.13, (0.95, 1.0, 2.0)))
    f.append(_esf(V(0, -1.12, -0.14), R * 0.24, (1.0, 1.0, 0.92)))
    for s in (-1, 1):
        f.append(_esf(V(s * 0.17, -0.98, -0.2), R * 0.12))
    # lábios (o de baixo mais carnudo)
    f.append(_esf(V(0, -0.98, -0.44), R * 0.36, (1.0, 0.28, 0.14)))
    f.append(_esf(V(0, -0.96, -0.6), R * 0.33, (1.0, 0.3, 0.17)))
    # pescoço grosso (entra no colarinho)
    f.append(_cil(V(0, 0.08, -1.05), R * 0.62, R * 1.0))
    pele = _unir(f, "Pele")
    _remesh(pele, R * 0.03, 10)
    # ---------- órbitas e boca escavadas ----------
    olhos = [V(s * 0.37, -0.74, 0.12) for s in (-1, 1)]
    for c in olhos:
        _subtrair(pele, _esf(c + Vector((0, -R * 0.04, 0)), R * 0.19, (1.05, 0.9, 0.78)))
    # sorriso: crescente (elipsoide curvado para cima nos cantos)
    corte = _esf(V(0, -1.0, -0.51), R * 0.44, (1.0, 0.5, 0.25), 48)
    for v in corte.data.vertices:
        dx = (v.co.x - C.x) / (R * 0.42)
        v.co.z += R * 0.16 * dx * dx
        if v.co.z > C.z - R * 0.47:                       # borda de cima reta (lábio superior), de baixo curva
            v.co.z = C.z - R * 0.47 + (v.co.z - (C.z - R * 0.47)) * 0.25
    _subtrair(pele, corte)
    _remesh(pele, R * 0.022, 6, 0.35)
    dc = pele.modifiers.new("reduz", "DECIMATE"); dc.ratio = 0.3; _aplicar(pele, dc)
    for p_ in pele.data.polygons:
        p_.use_smooth = True
    # ---------- cor da pele ----------
    base_c, rosa, labio, olheira = _lin("#e9a985"), _lin("#de7f6a"), _lin("#b5534b"), _lin("#b98270")

    def cor_pele(p):
        c = base_c
        bo = max(gauss(p, V(0.46, -0.72, -0.3), R * 0.3), gauss(p, V(-0.46, -0.72, -0.3), R * 0.3))
        c = mistura(c, rosa, 0.55 * bo)
        c = mistura(c, rosa, 0.6 * gauss(p, V(0, -1.2, -0.14), R * 0.24))          # ponta do nariz
        c = mistura(c, rosa, 0.35 * max(gauss(p, V(0.93, 0.0, 0.0), R * 0.25), gauss(p, V(-0.93, 0.0, 0.0), R * 0.25)))
        lb = max(gauss(p, V(0, -1.05, -0.43), R * 0.2), gauss(p, V(0, -1.04, -0.6), R * 0.22),
                 gauss(p, V(0.25, -0.98, -0.46), R * 0.14), gauss(p, V(-0.25, -0.98, -0.46), R * 0.14))
        c = mistura(c, labio, 0.85 * lb)
        ol = max(gauss(p, V(0.37, -0.82, -0.04), R * 0.14), gauss(p, V(-0.37, -0.82, -0.04), R * 0.14))
        c = mistura(c, olheira, 0.35 * ol)
        c = mistura(c, _lin("#8f7f78"), 0.25 * sm(-0.2, -0.9, (p.z - C.z) / R) * sm(-0.6, -0.9, (p.y - C.y) / R) * 0)  # (barba rala: desligada)
        return c

    pintar(pele, cor_pele)
    pele.data.materials.clear()          # o boolean deixa uma vaga de material vazia na posição 0
    pele.data.materials.append(M["pele_vc"])
    for p_ in pele.data.polygons:
        p_.material_index = 0
    # ---------- olhos ----------
    partes = [pele]
    grupos = {}

    def marca(o, g):
        grupos.setdefault(g, []).append(o)

    for c in olhos:
        ob = _esf(c, R * 0.17, (1.0, 0.85, 1.0), 32); ob.data.materials.append(M["olho"]); partes.append(ob)
        ir = _esf(c + Vector((0, -R * 0.135, -R * 0.005)), R * 0.085, (1, 0.35, 1), 24); ir.data.materials.append(M["iris"]); partes.append(ir); marca(ir, "g_iris")
        pu = _esf(c + Vector((0, -R * 0.16, -R * 0.005)), R * 0.045, (1, 0.25, 1), 16); pu.data.materials.append(M["pupila"]); partes.append(pu); marca(pu, "g_iris")
        # pálpebras superior (pesada: ar de esperteza) e inferior, cor de pele
        for sup in (True, False):
            lid = _esf(c, R * 0.185, (1.04, 1.0, 1.04), 32)
            bm = bmesh.new(); bm.from_mesh(lid.data)
            corte_z = (-R * 0.012 if sup else -R * 0.08)                # (coordenadas locais, relativas ao centro do olho)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.z < corte_z) == sup or v.co.y > R * 0.02], context="VERTS")
            bm.to_mesh(lid.data); bm.free()
            so = lid.modifiers.new("esp", "SOLIDIFY"); so.thickness = R * 0.025; _aplicar(lid, so)
            for p_ in lid.data.polygons:
                p_.use_smooth = True
            pintar(lid, lambda p: mistura(base_c, olheira, 0.25))
            lid.data.materials.append(M["pele_vc"]); partes.append(lid); marca(lid, "g_palpebra" if sup else "g_palpebra_inf")
    # ---------- boca: interior, dentes de cima, língua ----------
    bi = _esf(V(0, -0.72, -0.54), R * 0.4, (1.0, 0.5, 0.32), 32); bi.data.materials.append(M["boca"]); partes.append(bi); marca(bi, "g_boca_int")
    den = _esf(V(0, -0.9, -0.535), R * 0.36, (1.0, 0.26, 0.1), 40)          # logo atrás do lábio de cima
    for v in den.data.vertices:
        dx = (v.co.x - C.x) / (R * 0.34); v.co.z += R * 0.12 * dx * dx; v.co.y += R * 0.12 * dx * dx   # arco da arcada
    den.data.materials.append(M["dente"]); partes.append(den); marca(den, "g_dentes")
    lin = _esf(V(0, -0.72, -0.66), R * 0.2, (1.1, 0.7, 0.22), 24); lin.data.materials.append(M["lingua"]); partes.append(lin); marca(lin, "g_boca_int")
    # ---------- sobrancelhas grossas (feixes) ----------
    for s in (-1, 1):
        for k, (dz, raio) in enumerate(((0.0, 0.07), (0.05, 0.055), (-0.04, 0.05))):
            pts = [V(s * x, -0.92 + 0.12 * abs(x - 0.36), z + dz) for x, z in ((0.1, 0.36), (0.28, 0.47), (0.46, 0.46), (0.64, 0.36))]
            cu = bpy.data.curves.new("sb", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 1.0; cu.bevel_resolution = 3
            sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
            for i, (bp, pt) in enumerate(zip(sp.bezier_points, pts)):
                bp.co = pt; bp.handle_left_type = bp.handle_right_type = "AUTO"
                bp.radius = R * raio * (0.55 + 0.45 * math.sin(math.pi * (0.25 + 0.6 * i / 3)))
            o = bpy.data.objects.new("sb", cu); bpy.context.scene.collection.objects.link(o); _ativo(o)
            bpy.ops.object.convert(target="MESH"); o = bpy.context.active_object
            o.data.materials.append(M["sobrancelha"])
            for p_ in o.data.polygons:
                p_.use_smooth = True
            partes.append(o); marca(o, "g_sobrancelha")
    # ---------- cabelo esculpido: topete com mechas, têmporas grisalhas ----------
    h = []
    h.append(_esf(V(0, 0.1, 0.32), R * 1.03, (0.9, 0.98, 0.86), 48))            # calota
    h.append(_esf(V(0, -0.5, 0.86), R * 0.55, (1.3, 0.95, 0.5), 40))            # topete
    h.append(_esf(V(0, -0.15, 0.95), R * 0.6, (1.25, 1.2, 0.42), 40))
    for k in range(7):                                                            # mechas penteadas para trás
        x = -0.48 + 0.16 * k
        pts = [V(x * 1.05, -0.72, 0.86), V(x * 1.1, -0.2, 1.04), V(x * 1.08, 0.4, 0.92), V(x * 1.0, 0.85, 0.45)]
        cu = bpy.data.curves.new("m", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = R * 0.13; cu.bevel_resolution = 2
        sp = cu.splines.new("BEZIER"); sp.bezier_points.add(3)
        for bp, pt in zip(sp.bezier_points, pts):
            bp.co = pt; bp.handle_left_type = bp.handle_right_type = "AUTO"
        o = bpy.data.objects.new("m", cu); bpy.context.scene.collection.objects.link(o); _ativo(o)
        bpy.ops.object.convert(target="MESH"); h.append(bpy.context.active_object)
    cab = _unir(h, "Cabelo")
    _remesh(cab, R * 0.018, 3, 0.3)                                     # mais detalhe: as mechas aparecem
    # recorta a frente/baixo para mostrar testa, orelhas e nuca, com uma forma lisa (borda limpa)
    rosto_c = _esf(V(0, -0.62, -0.05), R * 1.0, (1.05, 0.75, 0.62), 48)       # testa e rosto
    _subtrair(cab, rosto_c)
    for s_ in (-1, 1):
        _subtrair(cab, _esf(V(s_ * 0.9, 0.0, -0.05), R * 0.42, (0.6, 0.9, 0.75), 32))   # em volta das orelhas
    _subtrair(cab, _esf(V(0, 0.5, -0.55), R * 0.9, (1.2, 1.0, 0.6), 40))        # nuca
    cab.data.materials.clear()
    dc = cab.modifiers.new("reduz", "DECIMATE"); dc.ratio = 0.28; _aplicar(cab, dc)
    preto, gris = _lin("#15110e"), _lin("#9a9692")
    pintar(cab, lambda p: mistura(preto, gris, 0.8 * sm(0.74, 0.9, abs((p.x - C.x) / R)) * sm(0.32, 0.05, (p.z - C.z) / R)))
    cab.data.materials.append(M["cabelo_vc"])
    for p_ in cab.data.polygons:
        p_.use_smooth = True
    # cabelo fica fora da malha com expressões (morph targets só onde algo se move: arquivo bem menor)
    # ---------- grupos para shape keys e pesos ----------
    for g, obs in grupos.items():
        for o in obs:
            vg = o.vertex_groups.new(name=g); vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    head = _unir(partes, "Cabeca_Gestor")
    return head, C, olhos, cab


def expressoes_v2(head, C, R, olhos):
    """Shape keys: piscar, sorriso, boca_aberta, boca_triste, sobrancelha_raiva/surpresa/medo, iris_grande."""
    me = head.data
    mw = head.matrix_world; inv = mw.inverted()
    head.shape_key_add(name="Basis")
    vg = {g.name: g.index for g in head.vertex_groups}

    def w(v, nome):
        i = vg.get(nome)
        return next((g.weight for g in v.groups if g.group == i), 0.0) if i is not None else 0.0

    V = lambda x, y, z: C + Vector((x, y, z)) * R
    cantos = [V(s * 0.42, -0.94, -0.42) for s in (-1, 1)]
    boca = V(0, -0.98, -0.5)

    def chave(nome, f):
        k = head.shape_key_add(name=nome, from_mix=False)
        for v in me.vertices:
            p = mw @ v.co
            d = f(v, p)
            if d is not None and d.length > 1e-7:
                k.data[v.index].co = inv @ (p + d)
        k.value = 0.0

    def eh_pele(v):
        return not any(w(v, g) > 0.5 for g in ("g_iris", "g_palpebra", "g_palpebra_inf", "g_sobrancelha", "g_dentes", "g_boca_int"))

    # piscar: pálpebra superior gira para baixo sobre o olho
    def piscar(v, p):
        if w(v, "g_palpebra") < 0.5:
            return None
        c = min(olhos, key=lambda o: (o - p).length); rel = p - c
        return (Matrix.Rotation(math.radians(62), 3, "X") @ rel) - rel
    chave("piscar", piscar)

    # olhos arregalados: pálpebra de cima sobe (surpresa, medo, ganância)
    def arregalar(v, p):
        if w(v, "g_palpebra") < 0.5:
            return None
        c = min(olhos, key=lambda o: (o - p).length); rel = p - c
        return (Matrix.Rotation(math.radians(-48), 3, "X") @ rel) - rel
    chave("olhos_abertos", arregalar)

    # sorriso: cantos sobem/para trás/para fora, bochechas sobem (aperta os olhos de baixo)
    def sorriso(v, p):
        if not (eh_pele(v) or w(v, "g_palpebra_inf") > 0.5 or w(v, "g_dentes") > 0.5):
            return None
        d = Vector()
        for i, c in enumerate(cantos):
            g = gauss(p, c, R * 0.3); s = -1 if i == 0 else 1
            d += Vector((s * R * 0.06, R * 0.05, R * 0.09)) * g
            gb = gauss(p, V(s * 0.46, -0.7, -0.24), R * 0.3)
            d += Vector((0, -R * 0.01, R * 0.06)) * gb
        return d
    chave("sorriso", sorriso)

    # boca aberta: mandíbula desce (rotação em torno do eixo da articulação)
    piv = V(0, -0.1, -0.35)
    def abrir(v, p):
        if w(v, "g_dentes") > 0.5 or not (eh_pele(v) or w(v, "g_boca_int") > 0.5):
            return None
        rel_z = (p.z - C.z) / R; rel_y = (p.y - C.y) / R
        k = sm(-0.46, -0.66, rel_z) * sm(-0.2, -0.7, rel_y) * (1 - sm(-1.05, -1.3, rel_z))
        if k <= 0:
            return None
        rel = p - piv
        return ((Matrix.Rotation(math.radians(13 * k), 3, "X") @ rel) - rel)
    chave("boca_aberta", abrir)

    def triste(v, p):
        if not eh_pele(v):
            return None
        d = Vector()
        for i, c in enumerate(cantos):
            g = gauss(p, c, R * 0.26); s = -1 if i == 0 else 1
            d += Vector((-s * R * 0.03, 0, -R * 0.09)) * g
        return d
    chave("boca_triste", triste)

    def sobr(tipo):
        def f(v, p):
            sb = w(v, "g_sobrancelha") > 0.5
            testa = eh_pele(v) and gauss(p, V(0, -0.85, 0.45), R * 0.5) > 0.05
            if not (sb or testa):
                return None
            meio = 1 - sm(R * 0.1, R * 0.55, abs(p.x - C.x))
            peso_ = 1.0 if sb else 0.4 * gauss(p, V(0, -0.85, 0.42), R * 0.45)
            if tipo == "raiva":
                return Vector((0, -R * 0.03 * meio, -R * 0.13 * meio + R * 0.03 * (1 - meio))) * peso_
            if tipo == "surpresa":
                return Vector((0, 0, R * 0.14)) * peso_
            return Vector((0, 0, R * 0.12 * meio - R * 0.02)) * peso_       # medo: meio sobe
        return f
    chave("sobrancelha_raiva", sobr("raiva"))
    chave("sobrancelha_surpresa", sobr("surpresa"))
    chave("sobrancelha_medo", sobr("medo"))

    def iris(v, p):
        if w(v, "g_iris") < 0.5:
            return None
        c = min(olhos, key=lambda o: (o - p).length); rel = p - c
        return Vector((rel.x * 0.35, -R * 0.012, rel.z * 0.35))
    chave("iris_grande", iris)
