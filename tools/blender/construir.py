"""Constrói os assets do jogo no Blender, exporta GLB e gera prévias.

    .venv-blender/bin/python tools/blender/construir.py [asset ...] [--sem-previa]
"""
import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import comum  # noqa: E402

# asset -> (quadros da prévia, parâmetros da câmera)
ASSETS = {
    "cofre": ([1, 72], dict(alvo=(0, 0, 0.95), dist=4.6, alt=1.1)),
    "maleta": ([24], dict(alvo=(0, 0, 0.12), dist=1.5, alt=0.7)),
    "maco": ([None], dict(alvo=(0, 0, 0.02), dist=0.6, alt=0.25)),
    "moeda": ([None], dict(alvo=(0, 0, 0.0), dist=0.3, alt=0.15)),
    "trofeu": ([None], dict(alvo=(0, 0, 0.22), dist=1.4, alt=0.3)),
    "coroa": ([None], dict(alvo=(0, 0, 0.1), dist=1.0, alt=0.4)),
    "trono": ([None], dict(alvo=(0, 0, 0.85), dist=4.0, alt=0.6)),
}
# assets definidos em módulos com várias funções (módulo -> nomes)
MULTI = {"tesouros": ["maleta", "maco", "moeda", "trofeu", "coroa", "trono"]}

if __name__ == "__main__":
    pedidos = [a for a in sys.argv[1:] if not a.startswith("--")] or list(ASSETS)
    for nome in pedidos:
        dono = next((m for m, ns in MULTI.items() if nome in ns), None)
        if dono:
            getattr(importlib.import_module(dono), nome)()
        else:
            importlib.import_module(nome).construir()
        arq = comum.exportar(nome)
        print(f"{nome}: {arq} ({arq.stat().st_size / 1024:.0f} KB)")
        if "--sem-previa" not in sys.argv:
            quadros, cam = ASSETS[nome]
            for q in quadros:
                print("  prévia:", comum.previa(nome, quadro=q, **cam))
