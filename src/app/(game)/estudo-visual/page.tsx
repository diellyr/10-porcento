"use client";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Estilo } from "@/game/ui/three/estudo/personagem";

/** Página isolada de ESTUDO VISUAL (propostas A/B/C da reformulação 3D). Não faz parte do jogo. */
function G() {
  const sp = useSearchParams(); const ref = useRef<HTMLCanvasElement>(null);
  const estilo = ((sp.get("estilo") ?? "b").toLowerCase() as Estilo); const vista = sp.get("vista") === "2" ? 2 : 1;
  const w = Number(sp.get("w") ?? 1600), h = Number(sp.get("h") ?? 900);
  useEffect(() => {
    let vivo = true; let fim: (() => void) | undefined;
    void import("@/game/ui/three/estudo/render").then(({ montarEstudo }) => {
      if (!vivo || !ref.current) return;
      const t0 = performance.now();
      const st = montarEstudo(ref.current, estilo, vista as 1 | 2, w, h); fim = st.dispose;
      st.render(); st.render();
      document.body.dataset.ms = String(Math.round(performance.now() - t0)); document.body.dataset.pronto = "1";
    }).catch((e) => { document.body.dataset.erro = String(e); });
    return () => { vivo = false; fim?.(); };
  }, [estilo, vista, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w, height: h, display: "block" }} aria-label={`Estudo visual ${estilo.toUpperCase()}${vista}`} />;
}
export default function Page() { return <Suspense><G /></Suspense>; }
