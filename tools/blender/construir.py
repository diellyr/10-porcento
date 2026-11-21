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
}

if __name__ == "__main__":
    pedidos = [a for a in sys.argv[1:] if not a.startswith("--")] or list(ASSETS)
    for nome in pedidos:
        mod = importlib.import_module(nome)
        mod.construir()
        arq = comum.exportar(nome)
        print(f"{nome}: {arq} ({arq.stat().st_size / 1024:.0f} KB)")
        if "--sem-previa" not in sys.argv:
            quadros, cam = ASSETS[nome]
            for q in quadros:
                print("  prévia:", comum.previa(nome, quadro=q, **cam))
