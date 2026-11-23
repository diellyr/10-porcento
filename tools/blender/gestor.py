"""PILOTO — protagonista "O Gestor" (caricatura satírica), sobre o esqueleto e as animações CC0 da
Universal Animation Library (Quaternius, base/UAL1_Standard.glb).

Corpo: malha do manequim CC0 (topologia e pesos profissionais) reesculpida para a caricatura (barriga, peito,
pescoço grosso) SEM mudar comprimentos de ossos — as 43 animações continuam válidas. A roupa é a própria malha,
com materiais por região (terno, camisa, gravata, faixa verde-amarela, sapatos, pele), então deforma junto.
Cabeça: modelada aqui (caricatura: queixo largo, bochechas, nariz grande, topete), presa ao osso Head, com
shape keys de expressão exportadas como morph targets: piscar, sorriso, raiva, surpresa, medo, ganancia.
"""
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

from comum import material

BASE = Path(__file__).parent / "base" / "UAL1_Standard.glb"
# animações exportadas (as que correspondem a situações que o jogo realmente tem)
ANIMS = {"Idle_Loop": "Parado", "Idle_Talking_Loop": "Falando", "Dance_Loop": "Comemorar", "Death01": "Derrota",
         "Walk_Formal_Loop": "Andar", "PickUp_Table": "Coletar", "Sitting_Idle_Loop": "Sentado", "Hit_Head": "Susto",
         "Interact": "Interagir"}


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def mats():
    return dict(
        pele=material("pele", "#e8a787", rug=0.55),
        terno=material("terno_grafite", "#22252d", rug=0.62),
        camisa=material("camisa", "#f3f1ea", rug=0.5),
        gravata=material("gravata_vermelha", "#b3141f", rug=0.35, clearcoat=0.3),
        faixa_verde=material("faixa_verde", "#159447", rug=0.45, clearcoat=0.2),
        faixa_amarela=material("faixa_amarela", "#f5c518", rug=0.4, clearcoat=0.2),
        sapato=material("sapato_couro", "#120f0e", rug=0.25, clearcoat=0.8),
        ouro=material("ouro", "#e8b84a", metal=1.0, rug=0.22),
        cabelo=material("cabelo", "#17120f", rug=0.32, clearcoat=0.6),
        grisalho=material("grisalho", "#8d8b88", rug=0.4),
        olho=material("olho_branco", "#f7f4ee", rug=0.15, clearcoat=1.0),
        iris=material("iris", "#4a2c17", rug=0.2, clearcoat=1.0),
        pupila=material("pupila", "#050404", rug=0.1, clearcoat=1.0),
        boca=material("boca_interna", "#5a1a1d", rug=0.7),
        dente=material("dente", "#f4efe2", rug=0.3, clearcoat=0.5),
        labio=material("labio", "#c46d62", rug=0.45),
        sobrancelha=material("sobrancelha", "#050302", rug=1.0),
    )


def importar():
    bpy.ops.import_scene.gltf(filepath=str(BASE))
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name != "Mannequin":
            bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    corpo = bpy.data.objects["Mannequin"]
    arm.animation_data.action = None
    for b in arm.pose.bones:
        b.location = (0, 0, 0); b.rotation_quaternion = (1, 0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    return arm, corpo


def peso(me, v, nomes):
    tot = 0.0
    for g in v.groups:
        if me.vertex_groups[g.group].name in nomes:
            tot += g.weight
    return tot


def osso_dominante(me, v):
    melhor, w = None, 0.0
    for g in v.groups:
        if g.weight > w:
            melhor, w = me.vertex_groups[g.group].name, g.weight
    return melhor or ""


def _dup(o, nome):
    c = o.copy(); c.data = o.data.copy(); c.name = nome; c.data.name = nome
    bpy.context.scene.collection.objects.link(c)
    return c


def _ativo(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o


def _aplicar(o, md):
    _ativo(o); bpy.ops.object.modifier_apply(modifier=md.name)


def transferir_pesos(fonte, alvo):
    """Pesos de esqueleto do manequim profissional para a malha nova (vizinho mais próximo, interpolado)."""
    for g in fonte.vertex_groups:
        if g.name not in alvo.vertex_groups:
            alvo.vertex_groups.new(name=g.name)
    md = alvo.modifiers.new("pesos", "DATA_TRANSFER")
    md.object = fonte; md.use_vert_data = True; md.data_types_verts = {"VGROUP_WEIGHTS"}
    md.vert_mapping = "POLYINTERP_NEAREST"; md.layers_vgroup_select_src = "ALL"; md.layers_vgroup_select_dst = "NAME"
    _ativo(alvo); bpy.ops.object.datalayout_transfer(modifier=md.name)
    _aplicar(alvo, md)


PERNA = {"l": ("thigh_l", "calf_l", "foot_l", "ball_l", "ball_leaf_l"), "r": ("thigh_r", "calf_r", "foot_r", "ball_r", "ball_leaf_r")}


def afastar_pernas(obj, fonte_pesos, dist, arm):
    """Desloca cada perna para fora (dist>0) ou de volta (dist<0), proporcional ao peso da perna."""
    sx = {k: 1 if (arm.matrix_world @ arm.data.bones[PERNA[k][0]].head_local).x > (arm.matrix_world @ arm.data.bones["pelvis"].head_local).x else -1 for k in "lr"}
    inv = obj.matrix_world.inverted().to_3x3()
    for v in obj.data.vertices:
        ws = {fonte_pesos.vertex_groups[g.group].name: g.weight for g in v.groups}
        for k in "lr":
            w = sum(ws.get(n, 0) for n in PERNA[k])
            if w > 0:
                v.co += inv @ Vector((sx[k] * dist * w, 0, 0))


def dobras(arm, corpo):
    """Dobras de tecido por cima da forma: franzido no cotovelo e na dobra do braço, barra da calça amontoada no
    sapato, vinco na frente da calça. Deslocamento pequeno ao longo da normal, ponderado pelo peso do osso."""
    me = corpo.data; mw = corpo.matrix_world; inv = mw.inverted()
    me.update(); bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
    nomes = {g.index: g.name for g in corpo.vertex_groups}
    for v in bm.verts:
        ws = {nomes[g.group]: g.weight for g in me.vertices[v.index].groups}
        p = mw @ v.co; n = (mw.to_3x3() @ v.normal).normalized(); dz = 0.0
        for lado in "lr":
            for osso, faixa, amp, freq in (("lowerarm_", (0.0, 0.3), 0.0045, 38.0), ("upperarm_", (0.75, 1.0), 0.004, 34.0), ("calf_", (0.78, 1.0), 0.005, 30.0)):
                w = ws.get(osso + lado, 0.0)
                if w < 0.3:
                    continue
                bo = arm.data.bones[osso + lado]; a = arm.matrix_world @ bo.head_local; t = arm.matrix_world @ bo.tail_local
                u = (p - a).dot((t - a).normalized()) / (t - a).length
                if faixa[0] <= u <= faixa[1]:
                    jan = math.sin(math.pi * (u - faixa[0]) / (faixa[1] - faixa[0]))
                    # ondas inclinadas (dobras não são anéis perfeitos)
                    fase = (p - a).length * freq + 3.0 * (p.x + p.y)
                    dz += amp * w * jan * max(0.0, math.sin(fase)) ** 2
            for osso in ("thigh_", "calf_"):
                w = ws.get(osso + lado, 0.0)
                if w > 0.4:
                    bo = arm.data.bones[osso + lado]; a = arm.matrix_world @ bo.head_local; t = arm.matrix_world @ bo.tail_local
                    d = (t - a).normalized(); q = a + d * (p - a).dot(d); rad = (p - q)
                    if rad.length > 1e-6 and rad.normalized().y < -0.97:       # bem na frente da perna: vinco
                        dz += 0.004 * w
        if dz:
            v.co = inv @ (p + n * dz)
    bm.to_mesh(me); bm.free(); me.update()


TUBOS = True
VOXEL = 0.012            # (0,009 faz o remesh perder pernas e tronco: testado)
OMBREIRA = True


def esculpir_corpo(arm, base, M):
    """Silhueta de terno: corpo do manequim inflado (roupa), barriga/peito caricatos, refeito por voxel remesh
    (some a segmentação do manequim) e suavizado; pesos voltam do manequim original."""
    corpo = _dup(base, "Corpo_Gestor")
    me = corpo.data
    mw = corpo.matrix_world; inv = mw.inverted()
    B = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
    pel, sp2, nk = B("pelvis"), B("spine_02"), B("neck_01")
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
    dl = base.data.vertices
    for v in bm.verts:
        bv = dl[v.index]; p = mw @ v.co; n = (mw.to_3x3() @ v.normal).normalized()
        dom = osso_dominante(base, bv)
        mao = dom.startswith(("hand", "index", "middle", "pinky", "ring", "thumb"))
        pe = dom.startswith(("foot", "ball"))
        tronco = peso(base, bv, {"pelvis", "spine_01", "spine_02", "spine_03"})
        # folga de roupa (terno) em tudo que não é mão/cabeça; sapato um pouco maior
        folga = 0.0 if (mao or dom in ("Head",)) else (0.012 if pe else 0.022)
        p += n * folga
        if tronco > 0.15:
            h = smooth(pel.z - 0.15, sp2.z + 0.02, p.z) * (1 - smooth(sp2.z + 0.08, nk.z - 0.02, p.z))
            frente = max(0.0, -(p.y - pel.y))
            p.y -= tronco * h * (0.06 + 0.7 * frente)
            p.x = pel.x + (p.x - pel.x) * (1 + 0.26 * tronco * h)
            if p.y > pel.y:   # costas e bumbum
                p.y += tronco * 0.25 * h * (p.y - pel.y)
            hp = smooth(sp2.z, nk.z - 0.05, p.z) * (1 - smooth(nk.z - 0.05, nk.z + 0.02, p.z))
            p.x = pel.x + (p.x - pel.x) * (1 + 0.12 * tronco * hp)
        if TUBOS and dom in ("upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r", "thigh_l", "thigh_r", "calf_l", "calf_r"):
            # tecido, não músculo: seção quase circular de raio-alvo (manga e calça "caem" retas)
            bo = arm.data.bones[dom]; a = arm.matrix_world @ bo.head_local; t = arm.matrix_world @ bo.tail_local
            d = (t - a).normalized(); u = max(0.0, min(1.0, (p - a).dot(d) / (t - a).length)); q = a + d * (p - a).dot(d)
            alvo = {"upperarm": 0.074, "lowerarm": 0.064 + 0.008 * u, "thigh": 0.1 - 0.008 * u, "calf": 0.088}[dom[:-2]]
            r = (p - q).length
            if r > 1e-6:
                p = q + (p - q) * ((0.3 * r + 0.7 * alvo) / r)
        if OMBREIRA and dom in ("clavicle_l", "clavicle_r", "upperarm_l", "upperarm_r"):
            # ombreira: ombro quadrado e um pouco mais alto
            ua = B("upperarm_" + dom[-1]); g = math.exp(-((p - ua).length ** 2) / (0.09 ** 2))
            if p.z > ua.z - 0.03:
                p.z += 0.022 * g; p.x += (0.016 if p.x > pel.x else -0.016) * g
        if dom == "neck_01":
            c = B("neck_01"); p.x = c.x + (p.x - c.x) * 1.5; p.y = c.y + (p.y - c.y) * 1.5
        v.co = inv @ p
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.update()
    # remesh: um volume contínuo (sem anéis de articulação), depois suavização e redução
    for md in list(corpo.modifiers):
        corpo.modifiers.remove(md)          # sem o Armature na pilha: o remesh vê a malha crua, na pose de repouso
    # pernas grossas encostam na pose de repouso e o remesh as fundiria: afasta, refaz e depois devolve
    afastar_pernas(corpo, corpo, 0.06, arm)
    base_af = _dup(base, "BaseAfastada")
    for md in list(base_af.modifiers):
        base_af.modifiers.remove(md)
    afastar_pernas(base_af, base_af, 0.06, arm)
    rm = corpo.modifiers.new("remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = VOXEL; rm.use_smooth_shade = True; rm.adaptivity = 0.0
    _aplicar(corpo, rm)
    sm = corpo.modifiers.new("suave", "CORRECTIVE_SMOOTH"); sm.factor = 0.5; sm.iterations = 12; sm.use_only_smooth = True
    _aplicar(corpo, sm)
    dc = corpo.modifiers.new("reduz", "DECIMATE"); dc.ratio = 0.7
    _aplicar(corpo, dc)
    print("corpo após remesh:", len(corpo.data.vertices), "vértices")
    corpo.vertex_groups.clear()
    transferir_pesos(base_af, corpo)
    afastar_pernas(corpo, corpo, -0.06, arm)
    bpy.data.objects.remove(base_af, do_unlink=True)
    # tira cabeça e mãos (vêm de peças próprias); mãos do manequim original, que já deformam bem
    me = corpo.data
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    fora = []
    for v in bm.verts:
        dom = osso_dominante(corpo, me.vertices[v.index])
        if dom in ("Head",) or dom.startswith(("hand", "index", "middle", "pinky", "ring", "thumb")):
            fora.append(v)
        elif (lambda w_: min(w_.get("thigh_l", 0) + w_.get("calf_l", 0), w_.get("thigh_r", 0) + w_.get("calf_r", 0)) > 0.12)(
                {corpo.vertex_groups[g.group].name: g.weight for g in me.vertices[v.index].groups}):
            fora.append(v)          # ponte entre as coxas criada pelo remesh: as pernas precisam ficar separadas
        elif dom == "neck_01" and (mw @ me.vertices[v.index].co).z > nk.z - 0.01:
            fora.append(v)
    bmesh.ops.delete(bm, geom=fora, context="VERTS")
    # borda do pescoço: arredonda o contorno serrilhado deixado pelo corte
    borda = [v for v in bm.verts if v.is_boundary and (mw @ v.co).z > sp2.z]
    for _ in range(12):
        bmesh.ops.smooth_vert(bm, verts=borda, factor=0.8, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(me); bm.free(); me.update()
    dobras(arm, corpo)
    maos = _dup(base, "Maos_Gestor")
    bm = bmesh.new(); bm.from_mesh(maos.data); bm.verts.ensure_lookup_table()
    dl = maos.data.vertices
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (osso_dominante(maos, dl[v.index]).startswith(("hand", "index", "middle", "pinky", "ring", "thumb")))], context="VERTS")
    bm.to_mesh(maos.data); bm.free()
    for v in maos.data.vertices:                       # dedos e palma um pouco mais cheios (caricatura gordinha)
        v.co += v.normal * 0.0025
    maos.data.materials.clear(); maos.data.materials.append(M["pele_vc"])
    import rosto as _r
    base_c, rosa = _r._lin("#e9a985"), _r._lin("#d97a66")
    pontas = {f"{d}_03_{s_}" for d in DEDOS for s_ in "lr"} | {f"{d}_02_{s_}" for d in DEDOS for s_ in "lr"}
    nomes = {g.index: g.name for g in maos.vertex_groups}
    if "Cor" not in maos.data.color_attributes:
        maos.data.color_attributes.new("Cor", "BYTE_COLOR", "POINT")
    at = maos.data.color_attributes["Cor"]
    for v in maos.data.vertices:
        w = sum(g.weight for g in v.groups if nomes.get(g.group) in pontas)
        at.data[v.index].color = (*_r.mistura(base_c, rosa, 0.45 * min(1.0, w)), 1.0)
    for f in maos.data.polygons:
        f.use_smooth = True
    return corpo, maos


def vestir(arm, corpo, M):
    """Terno (corpo inteiro), sapatos pelos pés; camisa, gravata, lapelas e faixa como peças sobre o terno."""
    me = corpo.data
    me.materials.clear()
    for k in ("terno", "sapato"):
        me.materials.append(M[k])
    for f in me.polygons:
        doms = [osso_dominante(corpo, me.vertices[i]) for i in f.vertices]
        f.material_index = 1 if sum(d.startswith(("foot", "ball")) for d in doms) * 2 > len(doms) else 0
        f.use_smooth = True
    B = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
    pel, sp3, nk = B("pelvis"), B("spine_03"), B("neck_01")
    pecas = []

    def faixa_sobre(nome, pts, larg, mat, desloc=0.004, divs=40, esp=0.004, nrm_fixa=None):
        """Fita (malha) de largura `larg` passando pelos pontos (Catmull-Rom), deitada na superfície do terno."""
        P = [Vector(p) for p in pts]
        def cr(t):
            n = len(P) - 1; i = min(int(t * n), n - 1); u = t * n - i
            p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, n)]
            return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
        bm = bmesh.new(); ant = None
        for k in range(divs + 1):
            t = k / divs; c = cr(t); tg = (cr(min(1, t + 0.01)) - cr(max(0, t - 0.01))).normalized()
            nrm = nrm_fixa or Vector((0, -1, 0)); lado = tg.cross(nrm).normalized()
            L = larg(t) if callable(larg) else larg
            par = (bm.verts.new(c - lado * L / 2), bm.verts.new(c + lado * L / 2))
            if ant:
                bm.faces.new((ant[0], ant[1], par[1], par[0]))
            ant = par
        me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(nome, me); bpy.context.scene.collection.objects.link(o)
        sd = o.modifiers.new("sub", "SUBSURF"); sd.levels = 1; _aplicar(o, sd)
        sw = o.modifiers.new("cola", "SHRINKWRAP"); sw.target = corpo; sw.wrap_method = "NEAREST_SURFACEPOINT"; sw.wrap_mode = "OUTSIDE_SURFACE"; sw.offset = desloc
        _aplicar(o, sw)
        so = o.modifiers.new("esp", "SOLIDIFY"); so.thickness = esp; so.offset = 1.0; _aplicar(o, so)
        o.data.materials.append(mat)
        for f in o.data.polygons:
            f.use_smooth = True
        pecas.append(o)
        return o

    def frente(x, z):
        ys = [(corpo.matrix_world @ v.co).y for v in me.vertices if abs((corpo.matrix_world @ v.co).x - x) < 0.025 and abs((corpo.matrix_world @ v.co).z - z) < 0.025]
        return (min(ys) if ys else pel.y - 0.25)

    cx = pel.x
    # camisa (V do paletó) e gravata
    zt, zb = nk.z - 0.01, sp3.z - 0.2
    for i in range(1):
        pts = [Vector((cx, frente(cx, z), z)) for z in (zt, (zt + zb) / 2, zb)]
    camisa = []
    for k in range(7):
        z = zt - (zt - zb) * k / 6
        w = 0.075 * (1 - k / 6) + 0.004
        camisa.append((z, w))
    # camisa: um V contínuo que afina até o botão
    faixa_sobre("Camisa", [Vector((cx, frente(cx, z), z)) for z, _ in camisa], lambda t: 0.16 * (1 - t) + 0.012, M["camisa"], 0.003)
    faixa_sobre("Gravata", [Vector((cx, frente(cx, z), z)) for z in (zt - 0.02, zt - 0.08, zb + 0.02, zb - 0.03)], lambda t: 0.034 + 0.03 * t, M["gravata"], 0.008, esp=0.006)
    # nó da gravata
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.022, location=(cx, frente(cx, zt - 0.015) - 0.014, zt - 0.015), segments=20, ring_count=12)
    no = bpy.context.active_object; no.scale = (1.2, 0.7, 1.0); bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth()
    no.data.materials.append(M["gravata"]); pecas.append(no)
    # lapelas: largas no peito, finas no botão, com espessura (gola do paletó)
    for s_ in (-1, 1):
        pts = [Vector((cx + s_ * (0.1 - 0.085 * t), frente(cx + s_ * (0.1 - 0.085 * t), zt + 0.02 - (zt + 0.02 - zb) * t), zt + 0.02 - (zt + 0.02 - zb) * t)) for t in (0.0, 0.3, 0.65, 1.0)]
        faixa_sobre("Lapela", pts, lambda t: 0.075 * (1 - t) ** 0.8 + 0.012, M["terno_lapela"], 0.007, esp=0.008)
    # gola do paletó em volta da nuca (cobre o recorte do pescoço)
    gola = []
    for k in range(13):
        a_ = math.radians(-150 + 300 * k / 12)
        gola.append(Vector((nk.x + math.sin(a_) * 0.105, nk.y + 0.005 - math.cos(a_) * 0.095 * -1, nk.z + 0.0)))
    faixa_sobre("GolaPaleto", gola, 0.045, M["terno_lapela"], 0.004, esp=0.01, nrm_fixa=Vector((0, 0, 1)))
    # faixa verde-amarela do ombro direito ao quadril esquerdo
    ua = B("upperarm_r"); ombro = Vector((ua.x * 0.8 + pel.x * 0.2, pel.y, ua.z - 0.02))
    quadril = Vector((pel.x - (ua.x - pel.x) * 0.85, pel.y, pel.z - 0.03))
    pts = []
    for t in (0.0, 0.25, 0.5, 0.75, 1.0):
        p = ombro.lerp(quadril, t)
        p.y = frente(p.x, p.z) - 0.01
        pts.append(p)
    verde = faixa_sobre("Faixa", pts, 0.09, M["faixa_verde"], 0.01)
    for s in (-1, 1):
        faixa_sobre("FaixaBorda", [q + Vector((s * 0.04, 0, s * 0.03)) for q in pts], 0.014, M["faixa_amarela"], 0.013)
    # botões
    for z in (zb - 0.06, zb - 0.14):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.008, location=(cx, frente(cx, z) - 0.006, z), rotation=(math.radians(90), 0, 0), vertices=20)
        b = bpy.context.active_object; b.data.materials.append(M["ouro"]); bpy.ops.object.shade_smooth(); pecas.append(b)
    # abas dos bolsos (quadril) e bolso do peito com lenço e a caneta de ouro do jogo
    for s_ in (-1, 1):
        x0 = cx + s_ * 0.16; z0 = pel.z + 0.01
        faixa_sobre("BolsoAba", [Vector((x0 - 0.065, frente(x0 - 0.065, z0), z0)), Vector((x0, frente(x0, z0), z0)), Vector((x0 + 0.065, frente(x0 + 0.065, z0), z0))], 0.04, M["terno_lapela"], 0.006, esp=0.006)
    xp = cx - (B("upperarm_r").x - cx) * 0.55; zp = sp3.z - 0.02
    faixa_sobre("BolsoPeito", [Vector((xp - 0.045, frente(xp - 0.045, zp), zp)), Vector((xp + 0.045, frente(xp + 0.045, zp), zp))], 0.012, M["terno_lapela"], 0.006, esp=0.004)
    for k, dx in enumerate((-0.025, 0.0, 0.022)):                  # pontas do lenço
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.018, depth=0.04, location=(xp + dx, frente(xp + dx, zp) + 0.006, zp + 0.022 + 0.006 * (k == 1)))
        c_ = bpy.context.active_object; c_.scale = (1, 0.3, 1); bpy.ops.object.transform_apply(scale=True)
        c_.data.materials.append(M["camisa"]); pecas.append(c_)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0065, depth=0.1, location=(xp + 0.032, frente(xp + 0.032, zp) + 0.008, zp + 0.025), vertices=16)
    caneta = bpy.context.active_object; caneta.rotation_euler = (0, math.radians(-8), 0); bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.shade_smooth(); caneta.data.materials.append(M["ouro"]); pecas.append(caneta)
    # punhos da camisa aparecendo na manga
    for lado in "lr":
        hd = B("hand_" + lado); la = B("lowerarm_" + lado); d = (hd - la).normalized()
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.03, location=hd - d * 0.035, vertices=28, end_fill_type="NOTHING")
        pu = bpy.context.active_object; pu.rotation_mode = "QUATERNION"; pu.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
        bpy.ops.object.transform_apply(rotation=True)
        so = pu.modifiers.new("esp", "SOLIDIFY"); so.thickness = 0.006; _aplicar(pu, so)
        bpy.ops.object.shade_smooth(); pu.data.materials.append(M["camisa"]); pecas.append(pu)
    # aba do paletó (barra sobre os quadris), aberta na frente
    bm = bmesh.new(); aneis = []
    zs = [pel.z + 0.06 - 0.028 * i for i in range(7)]
    for i, z in enumerate(zs):
        anel = []
        for k in range(49):
            ab = 10 + 3.5 * i                                         # abertura cresce para baixo (corte arredondado)
            a = math.radians(ab + (360 - 2 * ab) * k / 48)
            d = Vector((math.sin(a), -math.cos(a), 0))
            rs = [((corpo.matrix_world @ v.co) - Vector((pel.x, pel.y, z))) for v in me.vertices if abs((corpo.matrix_world @ v.co).z - z) < 0.02]
            r = max((q.x * d.x + q.y * d.y for q in rs if (Vector((q.x, q.y, 0)).normalized().dot(d)) > 0.93), default=0.2)
            r = min(r, 0.26) + 0.008 + 0.002 * i                    # rente ao corpo, abrindo só um pouco
            anel.append(bm.verts.new(Vector((pel.x, pel.y, z)) + d * r))
        aneis.append(anel)
    for i in range(len(aneis) - 1):
        for k in range(48):
            bm.faces.new((aneis[i][k], aneis[i][k + 1], aneis[i + 1][k + 1], aneis[i + 1][k]))
    mea = bpy.data.meshes.new("Aba"); bm.to_mesh(mea); bm.free()
    aba = bpy.data.objects.new("Aba", mea); bpy.context.scene.collection.objects.link(aba)
    so = aba.modifiers.new("esp", "SOLIDIFY"); so.thickness = 0.008; _aplicar(aba, so)
    sd = aba.modifiers.new("sub", "SUBSURF"); sd.levels = 1; _aplicar(aba, sd)
    aba.data.materials.append(M["terno"])
    ga = aba.vertex_groups.new(name="pelvis"); ga.add(list(range(len(aba.data.vertices))), 1.0, "REPLACE")
    for f in aba.data.polygons:
        f.use_smooth = True
    pecas.append(aba)
    # colarinho branco
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.1, location=(nk.x, nk.y + 0.008, nk.z + 0.02), vertices=48, end_fill_type="NOTHING")
    col = bpy.context.active_object; col.scale = (1.05, 0.95, 1.0); bpy.ops.object.transform_apply(scale=True)
    so = col.modifiers.new("esp", "SOLIDIFY"); so.thickness = 0.01; _aplicar(col, so)
    gc = col.vertex_groups.new(name="neck_01"); gc.add(list(range(len(col.data.vertices))), 1.0, "REPLACE")
    bpy.ops.object.shade_smooth(); col.data.materials.append(M["camisa"]); pecas.append(col)
    return pecas


def esfera(nome, r, pos, mat, seg=48, anel=32, esc=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=anel, location=pos)
    o = bpy.context.active_object
    o.name = nome; o.scale = esc
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


def grupo(o, nome):
    g = o.vertex_groups.new(name=nome)
    g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")


def tubo(nome, pts, r0, r1, mat, seg=16):
    """Tubo afinando ao longo de uma curva (sobrancelhas, lábios)."""
    cu = bpy.data.curves.new(nome, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 1.0; cu.bevel_resolution = 4
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for i, (bp, p) in enumerate(zip(sp.bezier_points, pts)):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = "AUTO"
        t = i / (len(pts) - 1); bp.radius = r0 + (r1 - r0) * math.sin(math.pi * t) ** 0.7 if r1 > r0 else r0
    cu.resolution_u = seg
    o = bpy.data.objects.new(nome, cu); bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def cabeca(arm, M):
    """Cabeça caricata. Retorna o objeto unido (pele, olhos, nariz, orelhas, cabelo, sobrancelhas, boca)."""
    hb = arm.data.bones["Head"]
    base = arm.matrix_world @ hb.head_local
    R = 0.15                        # cabeça grande (caricatura)
    C = base + Vector((0, -0.015, R * 0.92))
    # crânio + rosto (esfera deformada)
    o = esfera("Cabeca", R, C, M["pele"], 96, 72)
    for v in o.data.vertices:
        p = (v.co - C) / R          # unitário; -Y é a frente
        x, y, z = p.x, p.y, p.z
        sx = 0.84 + 0.42 * smooth(0.15, -0.7, z)            # mandíbula/papada bem larga embaixo
        sz = 1.12
        sy = 1.0 + 0.12 * smooth(0.0, -0.6, z)
        x *= sx; y *= sy; z *= sz
        if y < 0:                                            # frente: queixo e bochechas para a frente
            y -= 0.16 * smooth(-0.35, -0.95, p.z) * (1 - abs(p.x)) * 1.4
            y -= 0.1 * math.exp(-((p.x - 0.5) ** 2 + (p.z + 0.25) ** 2) / 0.06) + 0.1 * math.exp(-((p.x + 0.5) ** 2 + (p.z + 0.25) ** 2) / 0.06)
        z -= 0.12 * smooth(-0.6, -1.0, p.z) * (1 - abs(p.x))  # queixo duplo descendo
        if y < 0:                                            # queixo quadrado com covinha no meio
            y -= 0.09 * smooth(-0.55, -0.9, p.z) * smooth(0.55, 0.15, abs(p.x))
            y += 0.035 * math.exp(-(p.x ** 2) / 0.004) * smooth(-0.6, -0.85, p.z)
        if z < -0.9:
            z = -0.9 - (z + 0.9) * 0.5
        v.co = C + Vector((x, y, z)) * R
    # nariz bulboso
    na = esfera("Nariz", R * 0.22, C + Vector((0, -R * 1.02, -R * 0.14)), M["pele"], 32, 24, (1.0, 1.05, 0.95))
    ponte = esfera("Ponte", R * 0.12, C + Vector((0, -R * 0.94, R * 0.06)), M["pele"], 24, 16, (0.95, 1.0, 2.1))
    asas = [esfera(f"Asa{s}", R * 0.09, C + Vector((s * R * 0.14, -R * 0.92, -R * 0.15)), M["pele"], 24, 16) for s in (-1, 1)]
    orelhas = [esfera(f"Orelha{s}", R * 0.22, C + Vector((s * R * 0.93, R * 0.05, R * 0.02)), M["pele"], 24, 16, (0.35, 0.8, 1.2)) for s in (-1, 1)]
    pecas = [o, na, ponte, *asas, *orelhas]
    # olhos (um pouco caídos: ar de esperteza), com pálpebra superior
    olhos, palp = [], []
    for s in (-1, 1):
        ce = C + Vector((s * R * 0.36, -R * 0.78, R * 0.2))
        b = esfera(f"Olho{s}", R * 0.17, ce, M["olho"], 32, 24, (1.0, 0.7, 1.0))
        ir = esfera(f"Iris{s}", R * 0.085, ce + Vector((0, -R * 0.105, -R * 0.01)), M["iris"], 24, 16, (1, 0.4, 1))
        pu = esfera(f"Pupila{s}", R * 0.045, ce + Vector((0, -R * 0.13, -R * 0.01)), M["pupila"], 16, 12, (1, 0.3, 1))
        # pálpebra: meia esfera de pele, um pouco maior, cobrindo o topo do olho
        bpy.ops.mesh.primitive_uv_sphere_add(radius=R * 0.185, segments=32, ring_count=16, location=ce)
        lid = bpy.context.active_object; lid.name = f"Palpebra{s}"; lid.scale = (1.02, 0.75, 1.02)
        bpy.ops.object.transform_apply(scale=True)
        bm = bmesh.new(); bm.from_mesh(lid.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < lid.location.z * 0 + (ce.z - lid.location.z) + R * 0.03 - 0.0], context="VERTS")
        bm.to_mesh(lid.data); bm.free()
        bpy.ops.object.shade_smooth(); lid.data.materials.append(M["pele"])
        olhos += [b, ir, pu]; palp.append((lid, ce))
    # sobrancelhas grossas, arqueadas para cima no meio (arrogância)
    sobr = []
    for s in (-1, 1):
        pts = [C + Vector((s * R * x, -R * (0.86 - 0.08 * abs(x - 0.36)), R * zz)) for x, zz in ((0.12, 0.36), (0.3, 0.45), (0.5, 0.43), (0.64, 0.34))]
        sobr.append(tubo(f"Sobrancelha{s}", pts, R * 0.05, R * 0.09, M["sobrancelha"]))
    # boca: sorriso largo e confiante (meia-lua escura com dentes e lábios)
    bocaC = C + Vector((0, -R * 1.04, -R * 0.47))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=R * 0.42, segments=48, ring_count=24, location=bocaC)
    bo = bpy.context.active_object; bo.name = "Boca"; bo.scale = (1.0, 0.22, 0.42)
    bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(bo.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > bocaC.z - bo.location.z + R * 0.02], context="VERTS")
    bm.to_mesh(bo.data); bm.free()
    for v in bo.data.vertices:   # curva para cima nos cantos (sorriso)
        dx = (v.co.x) / (R * 0.42)
        v.co.z += R * 0.16 * dx * dx
    bpy.ops.object.shade_smooth(); bo.data.materials.append(M["boca"])
    dentes = esfera("Dentes", R * 0.36, bocaC + Vector((0, -R * 0.02, -R * 0.035)), M["dente"], 32, 16, (1.0, 0.2, 0.16))
    labio = tubo("Labio", [bocaC + Vector((R * x, -R * 0.06, -R * 0.17 + R * 0.95 * x * x)) for x in (-0.4, -0.2, 0.0, 0.2, 0.4)], R * 0.025, R * 0.05, M["labio"])
    # cabelo penteado para trás com topete, têmporas grisalhas
    cab = esfera("Cabelo", R * 1.04, C + Vector((0, R * 0.04, R * 0.08)), M["cabelo"], 64, 48, (0.92, 1.03, 1.0))
    bm = bmesh.new(); bm.from_mesh(cab.data)
    cc = C + Vector((0, R * 0.04, R * 0.08)) - cab.location
    rm = []
    for v in bm.verts:
        q = (v.co - cc) / R
        # mantém só o topo/trás, recuando na testa
        if q.z < 0.25 - 0.55 * max(0.0, q.y) or (q.y < -0.55 and q.z < 0.6):
            rm.append(v)
    bmesh.ops.delete(bm, geom=rm, context="VERTS")
    for v in bm.verts:
        q = (v.co - cc) / R
        v.co.z += R * 0.2 * smooth(0.6, 1.0, q.z) * smooth(0.2, -0.5, q.y)   # topete na frente
        v.co.y -= R * 0.08 * smooth(0.6, 1.0, q.z) * smooth(0.0, -0.4, q.y)
    bm.to_mesh(cab.data); bm.free()
    sol = cab.modifiers.new("esp", "SOLIDIFY"); sol.thickness = R * 0.06
    bpy.context.view_layer.objects.active = cab; bpy.ops.object.modifier_apply(modifier=sol.name)
    bpy.ops.object.shade_smooth()
    topete = esfera("Topete", R * 0.55, C + Vector((0, -R * 0.45, R * 0.82)), M["cabelo"], 48, 32, (1.25, 0.95, 0.55))
    temp = [esfera(f"Tempora{s}", R * 0.16, C + Vector((s * R * 0.8, R * 0.05, R * 0.2)), M["grisalho"], 24, 16, (0.3, 0.75, 0.85)) for s in (-1, 1)]

    # pescoço novo (liga a cabeça ao colarinho)
    nkb = arm.matrix_world @ arm.data.bones["neck_01"].head_local
    bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=(C.z - R * 0.6) - nkb.z + 0.02, location=(base.x, base.y + 0.005, (nkb.z + C.z - R * 0.6) / 2), vertices=32)
    pesc = bpy.context.active_object; pesc.name = "Pescoco"; bpy.ops.object.shade_smooth(); pesc.data.materials.append(M["pele"])

    # vertex groups para as shape keys antes de unir
    for lid, ce in palp:
        grupo(lid, "g_palpebra"); lid["ce"] = list(ce)
    for s in sobr:
        grupo(s, "g_sobrancelha_esq" if s.name.endswith("-1") else "g_sobrancelha_dir")
    for b in (bo, dentes, labio):
        grupo(b, "g_boca")
    for i, ob in enumerate(olhos):
        if "Iris" in ob.name or "Pupila" in ob.name:
            grupo(ob, "g_iris")
    tudo = pecas + olhos + [p[0] for p in palp] + sobr + [bo, dentes, labio, cab, topete, *temp]
    bpy.ops.object.select_all(action="DESELECT")
    for p in tudo:
        p.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()
    head = bpy.context.active_object; head.name = "Cabeca_Gestor"
    expressoes(head, C, R, [ce for _, ce in palp])
    return head, pesc, C, R


def expressoes(head, C, R, centros):
    """Shape keys (morph targets no glTF). O jogo combina estas para cada emoção."""
    me = head.data
    head.shape_key_add(name="Basis")
    vg = {g.name: g.index for g in head.vertex_groups}

    def w(v, nome):
        i = vg.get(nome)
        return next((g.weight for g in v.groups if g.group == i), 0.0) if i is not None else 0.0

    def chave(nome, f):
        k = head.shape_key_add(name=nome, from_mix=False)
        for v in me.vertices:
            d = f(v, v.co.copy())
            if d is not None:
                k.data[v.index].co = v.co + d
        return k

    def piscar(v, p):
        if w(v, "g_palpebra") < 0.5:
            return None
        ce = min(centros, key=lambda c: (c - p).length)
        rel = p - ce
        rot = Matrix.Rotation(math.radians(70), 3, "X")
        return (rot @ rel) - rel

    chave("piscar", piscar)

    def sorriso(v, p):
        if w(v, "g_boca") < 0.5:
            return None
        dx = (p.x - C.x) / (R * 0.33)
        return Vector((dx * R * 0.05, -R * 0.01, R * 0.07 * dx * dx - R * 0.02))

    chave("sorriso", sorriso)

    def abrir(v, p):
        if w(v, "g_boca") < 0.5:
            return None
        baixo = smooth(-0.40 * R, -0.55 * R, p.z - C.z)
        return Vector((0, 0, -R * 0.14 * baixo))

    chave("boca_aberta", abrir)

    def triste(v, p):
        if w(v, "g_boca") < 0.5:
            return None
        dx = (p.x - C.x) / (R * 0.33)
        return Vector((-dx * R * 0.04, 0, -R * 0.12 * dx * dx + R * 0.02))

    chave("boca_triste", triste)

    def sobr(sentido):
        def f(v, p):
            e, d = w(v, "g_sobrancelha_esq"), w(v, "g_sobrancelha_dir")
            if e + d < 0.5:
                return None
            lado = -1 if e > d else 1
            meio = 1 - smooth(R * 0.1, R * 0.6, abs(p.x - C.x))   # perto do nariz
            if sentido == "raiva":
                return Vector((0, -R * 0.02, -R * 0.12 * meio + R * 0.03 * (1 - meio)))
            if sentido == "surpresa":
                return Vector((0, 0, R * 0.12))
            if sentido == "medo":
                return Vector((0, 0, R * 0.1 * meio - R * 0.01))
            return None
        return f

    chave("sobrancelha_raiva", sobr("raiva"))
    chave("sobrancelha_surpresa", sobr("surpresa"))
    chave("sobrancelha_medo", sobr("medo"))

    def iris_grande(v, p):           # ganância: pupilas dilatadas (cifrão fica a cargo do brilho no jogo)
        if w(v, "g_iris") < 0.5:
            return None
        ce = min(centros, key=lambda c: (c - p).length)
        rel = p - ce
        return Vector((rel.x * 0.3, -R * 0.01, rel.z * 0.3))

    chave("iris_grande", iris_grande)
    for kb in head.data.shape_keys.key_blocks[1:]:
        kb.value = 0.0          # sem isso o glTF sai com peso padrão 1 (olhos fechados)


def acessorios(arm, corpo, M):
    """Anel de ouro no dedo, medalha 10% na faixa, abotoaduras."""
    pecas = []
    rb = arm.data.bones["ring_01_r"]
    a = arm.matrix_world @ rb.head_local; t = arm.matrix_world @ rb.tail_local
    meio = a + (t - a) * 0.55
    bpy.ops.mesh.primitive_torus_add(major_radius=0.011, minor_radius=0.0035, location=meio)
    anel = bpy.context.active_object; anel.name = "Anel"
    anel.rotation_mode = "QUATERNION"; anel.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((t - a).normalized())
    bpy.ops.object.transform_apply(rotation=True); bpy.ops.object.shade_smooth(); anel.data.materials.append(M["ouro"])
    g = anel.vertex_groups.new(name="ring_01_r"); g.add(list(range(len(anel.data.vertices))), 1.0, "REPLACE")
    pecas.append(anel)
    # medalha na faixa (peito, lado esquerdo do personagem)
    sp3 = arm.matrix_world @ arm.data.bones["spine_03"].head_local
    pel = arm.matrix_world @ arm.data.bones["pelvis"].head_local
    pos = Vector((pel.x - 0.07, 0, sp3.z - 0.12))
    # acha a superfície da frente do terno nessa altura
    ys = [(corpo.matrix_world @ v.co).y for v in corpo.data.vertices if abs((corpo.matrix_world @ v.co).x - pos.x) < 0.03 and abs((corpo.matrix_world @ v.co).z - pos.z) < 0.03]
    pos.y = (min(ys) if ys else pel.y - 0.2) - 0.012
    bpy.ops.mesh.primitive_cylinder_add(radius=0.042, depth=0.012, location=pos, rotation=(math.radians(90), 0, 0), vertices=40)
    med = bpy.context.active_object; med.name = "Medalha"; bpy.ops.object.shade_smooth(); med.data.materials.append(M["ouro"])
    bpy.ops.object.text_add(location=pos + Vector((0, -0.0065, 0)), rotation=(math.radians(90), 0, 0))
    tx = bpy.context.active_object; tx.data.body = "10%"; tx.data.size = 0.026; tx.data.extrude = 0.0015
    tx.data.align_x, tx.data.align_y = "CENTER", "CENTER"
    bpy.ops.object.convert(target="MESH"); tx.data.materials.clear(); tx.data.materials.append(M["faixa_verde"])
    bpy.ops.object.select_all(action="DESELECT"); med.select_set(True); tx.select_set(True)
    bpy.context.view_layer.objects.active = med; bpy.ops.object.join()
    g = med.vertex_groups.new(name="spine_03"); g.add(list(range(len(med.data.vertices))), 1.0, "REPLACE")
    pecas.append(med)
    return pecas


def prender(arm, objs):
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = arm; o.matrix_world = mw
        if not any(m.type == "ARMATURE" for m in o.modifiers):
            md = o.modifiers.new("Armature", "ARMATURE"); md.object = arm


# quanto do "punho" da animação original fica em cada animação (0 = mão reta, 1 = punho original)
FECHAMENTO = {"Parado": 0.42, "Sentado": 0.42, "Andar": 0.45, "Falando": 0.28, "Derrota": 0.25, "Susto": 0.12,
              "Comemorar": 1.0, "Coletar": 1.0, "Interagir": 1.0}
DEDOS = ("index", "middle", "pinky", "ring", "thumb")


def _fcurves(action):
    """Curvas de uma ação (Blender 5: ações em camadas/slots; versões antigas: action.fcurves)."""
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for slot in action.slots:
                cb = strip.channelbag(slot)
                if cb:
                    out += list(cb.fcurves)
    return out


def maos_relaxadas():
    """As animações da biblioteca fecham os dedos em punho o tempo todo. Aqui cada animação recebe uma mão
    entre a reta (pose de base) e o punho original, conforme a situação: relaxada parado, aberta falando/no susto,
    punho mantido em comemorar/coletar/interagir."""
    from mathutils import Quaternion
    for act in bpy.data.actions:
        k = FECHAMENTO.get(act.name, 1.0)
        if k >= 0.999:
            continue
        grupos = {}
        for fc in _fcurves(act):
            if fc.data_path.endswith("rotation_quaternion") and any(f'"{d}_' in fc.data_path for d in DEDOS):
                grupos.setdefault(fc.data_path, {})[fc.array_index] = fc
        for path, comp in grupos.items():
            if len(comp) != 4 or len({len(c.keyframe_points) for c in comp.values()}) != 1:
                continue
            kk = k * (1.15 if '"thumb_' in path else 1.0)
            for i in range(len(comp[0].keyframe_points)):
                q = Quaternion([comp[j].keyframe_points[i].co[1] for j in range(4)])
                r = Quaternion((1, 0, 0, 0)).slerp(q, min(1.0, kk))
                for j in range(4):
                    kp = comp[j].keyframe_points[i]
                    kp.co[1] = r[j]; kp.handle_left[1] = r[j]; kp.handle_right[1] = r[j]
            for c in comp.values():
                c.update()


def construir():
    from comum import limpar
    limpar()
    M = mats()
    M["terno_lapela"] = material("terno_lapela", "#2c3039", rug=0.35, clearcoat=0.4)
    import rosto
    M["pele_vc"] = rosto.material_vc("pele", rug=0.5)
    arm, base = importar()
    corpo, maos = esculpir_corpo(arm, base, M)
    extras = vestir(arm, corpo, M)
    M["cabelo_vc"] = rosto.material_vc("cabelo", rug=0.42, coat=0.25)
    M["lingua"] = material("lingua", "#a8434a", rug=0.5)
    R = 0.15
    hb = arm.matrix_world @ arm.data.bones["Head"].head_local
    head, C, olhos, cab = rosto.construir_rosto(hb, R, M)
    gc_ = cab.vertex_groups.new(name="Head"); gc_.add(list(range(len(cab.data.vertices))), 1.0, "REPLACE")
    rosto.expressoes_v2(head, C, R, olhos)
    # pesos: pescoço (neck_01) embaixo, cabeça (Head) em cima, transição suave
    gh = head.vertex_groups.new(name="Head"); gn = head.vertex_groups.new(name="neck_01")
    for v in head.data.vertices:
        z = (head.matrix_world @ v.co).z
        t = smooth(hb.z - 0.06, hb.z + 0.015, z)
        gh.add([v.index], t, "REPLACE"); gn.add([v.index], 1 - t, "REPLACE")
    pesc = None
    ac = acessorios(arm, corpo, M)
    for o in extras + ac:
        if not o.vertex_groups:
            transferir_pesos(base, o)
    bpy.data.objects.remove(base, do_unlink=True)
    prender(arm, [corpo, maos, head, cab, *extras, *ac])
    print("vértices: rosto", len(head.data.vertices), "cabelo", len(cab.data.vertices), "corpo", len(corpo.data.vertices))
    for a in list(bpy.data.actions):
        if a.name in ANIMS:
            a.name = ANIMS[a.name]; a.use_fake_user = True
        else:
            bpy.data.actions.remove(a)
    maos_relaxadas()
    arm.name = "Gestor"
    arm.animation_data.action = bpy.data.actions["Parado"]
    return arm


if __name__ == "__main__":
    construir()
