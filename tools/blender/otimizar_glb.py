"""Otimiza um GLB sem ferramentas externas, usando só formatos que o three.js lê nativamente:

- WEIGHTS_0 (float) -> UNSIGNED_BYTE normalizado (soma 255 por vértice)
- COLOR_0  (float)  -> UNSIGNED_BYTE normalizado, VEC4
- NORMAL   (float)  -> BYTE normalizado (extensão padrão KHR_mesh_quantization)
- índices  uint32   -> uint16 quando cabem

Posições, morph targets e animações ficam em float (precisão de deformação e de pose).

    python tools/blender/otimizar_glb.py entrada.glb [saida.glb]
"""
import json
import struct
import sys

import numpy as np

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def ler(path):
    b = open(path, "rb").read()
    n = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + n])
    o = 20 + n
    bl = struct.unpack("<I", b[o:o + 4])[0]
    return j, b[o + 8:o + 8 + bl]


def dados(j, binb, i):
    a = j["accessors"][i]; v = j["bufferViews"][a["bufferView"]]
    dt = COMP[a["componentType"]]; nc = NCOMP[a["type"]]; isz = np.dtype(dt).itemsize
    off = v.get("byteOffset", 0) + a.get("byteOffset", 0); st = v.get("byteStride", 0) or nc * isz
    if st == nc * isz:
        return np.frombuffer(binb, dt, a["count"] * nc, off).reshape(a["count"], nc).copy()
    raw = np.frombuffer(binb, np.uint8, a["count"] * st, off).reshape(a["count"], st)
    return raw[:, :nc * isz].copy().view(dt).reshape(a["count"], nc)


def otimizar(entrada, saida):
    j, binb = ler(entrada)
    novos = {}          # accessor -> (array bytes, componentType, type, normalized, stride)
    usos = {}
    for m in j["meshes"]:
        for p in m["primitives"]:
            for k, i in p["attributes"].items():
                usos.setdefault(i, set()).add(k)
            if "indices" in p:
                usos.setdefault(p["indices"], set()).add("IDX")
    quant = False
    for i, ks in usos.items():
        a = j["accessors"][i]
        if "WEIGHTS_0" in ks and a["componentType"] == 5126:
            w = dados(j, binb, i); s = w.sum(1, keepdims=True); s[s == 0] = 1
            q = np.floor(w / s * 255 + 0.5).astype(np.int32)
            q[:, 0] += 255 - q.sum(1)                                     # soma exata 255
            novos[i] = (np.clip(q, 0, 255).astype(np.uint8), 5121, "VEC4", True, 4)
        elif "COLOR_0" in ks and a["componentType"] == 5126:
            c = dados(j, binb, i)
            if c.shape[1] == 3:
                c = np.concatenate([c, np.ones((len(c), 1), np.float32)], 1)
            novos[i] = (np.clip(np.round(c * 255), 0, 255).astype(np.uint8), 5121, "VEC4", True, 4)
        elif ks == {"NORMAL"} and a["componentType"] == 5126:
            nrm = dados(j, binb, i)
            q = np.clip(np.round(nrm * 127), -127, 127).astype(np.int8)
            pad = np.zeros((len(q), 4), np.int8); pad[:, :3] = q             # passo de 4 bytes (alinhamento)
            novos[i] = (pad, 5120, "VEC3", True, 4); quant = True
        elif ks == {"IDX"} and a["componentType"] == 5125 and a["count"]:
            ix = dados(j, binb, i)
            if ix.max() < 65536:
                novos[i] = (ix.astype(np.uint16), 5123, "SCALAR", False, 0)
    # remonta o buffer: cada accessor ganha um bufferView próprio (mais simples e seguro)
    out = bytearray(); views = []
    alvo = {}
    for m in j["meshes"]:
        for p in m["primitives"]:
            for k, i in p["attributes"].items():
                alvo[i] = 34962
            if "indices" in p:
                alvo[p["indices"]] = 34963
            for t in p.get("targets", []):
                for i in t.values():
                    alvo[i] = 34962
    copiados = {}

    def copiar_view(vi):
        """Copia um bufferView original inteiro (usado pelos accessors esparsos dos morph targets), uma vez só."""
        if vi in copiados:
            return copiados[vi]
        v0 = j_views_orig[vi]; o0 = v0.get("byteOffset", 0)
        while len(out) % 4:
            out.append(0)
        nv = {"buffer": 0, "byteOffset": len(out), "byteLength": v0["byteLength"]}
        out.extend(binb[o0:o0 + v0["byteLength"]]); views.append(nv)
        copiados[vi] = len(views) - 1
        return copiados[vi]

    j_views_orig = [dict(v) for v in j["bufferViews"]]
    for i, a in enumerate(j["accessors"]):
        if "sparse" in a:                                      # morph targets esparsos: índices e valores à parte
            sp = a["sparse"]
            sp["indices"]["bufferView"] = copiar_view(sp["indices"]["bufferView"])
            sp["values"]["bufferView"] = copiar_view(sp["values"]["bufferView"])
        if "bufferView" not in a:
            continue
        while len(out) % 4:
            out.append(0)
        if i in novos:
            arr, ct, tp, nm, st = novos[i]
            a["componentType"] = ct; a["type"] = tp
            if nm:
                a["normalized"] = True
            else:
                a.pop("normalized", None)
            if tp == "VEC3" and ct == 5120:
                a.pop("min", None); a.pop("max", None)
            data = arr.tobytes()
            v = {"buffer": 0, "byteOffset": len(out), "byteLength": len(data)}
            if st and alvo.get(i) == 34962:
                v["byteStride"] = st
        else:
            arr = dados(j, binb, i); data = arr.tobytes()
            v = {"buffer": 0, "byteOffset": len(out), "byteLength": len(data)}
            nc = NCOMP[a["type"]]; isz = np.dtype(COMP[a["componentType"]]).itemsize
            if alvo.get(i) == 34962 and (nc * isz) % 4:
                v["byteStride"] = ((nc * isz + 3) // 4) * 4                  # (raro) mantém alinhamento
                pad = np.zeros((len(arr), v["byteStride"]), np.uint8); pad[:, :nc * isz] = arr.view(np.uint8).reshape(len(arr), -1)
                data = pad.tobytes(); v["byteLength"] = len(data)
        if i in alvo:
            v["target"] = alvo[i]
        out += data; a["bufferView"] = len(views); a.pop("byteOffset", None); views.append(v)
    # bufferViews sem accessor (ex.: imagens) — este pipeline não usa; aborta se houver
    if any("bufferView" in im for im in j.get("images", [])):
        raise SystemExit("GLB com imagens embutidas: não suportado por este otimizador")
    j["bufferViews"] = views
    while len(out) % 4:
        out.append(0)
    j["buffers"] = [{"byteLength": len(out)}]
    if quant:
        for k in ("extensionsUsed", "extensionsRequired"):
            j.setdefault(k, [])
            if "KHR_mesh_quantization" not in j[k]:
                j[k].append("KHR_mesh_quantization")
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(saida, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(out), 0x004E4942)); f.write(out)
    return total


if __name__ == "__main__":
    ent = sys.argv[1]; sai = sys.argv[2] if len(sys.argv) > 2 else ent
    antes = len(open(ent, "rb").read())
    depois = otimizar(ent, sai)
    print(f"{ent}: {antes / 1024:.0f} KB -> {depois / 1024:.0f} KB")
