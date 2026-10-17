"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fictionalScenario } from "@/game/content/scenario";
import { apply } from "@/game/engine/rules";
import type { LocationId } from "@/game/engine/types";
import { activeHotspots } from "@/game/ui/GameScene";
import { World3D, type Modo } from "@/game/ui/three/World3D";

function G() {
  const sp = useSearchParams();
  const [modo, setModo] = useState<Modo>((sp.get("modo") as Modo) || "mapa");
  const [loc, setLoc] = useState<LocationId>((sp.get("l") as LocationId) || (sp.get("nivel") === "2" ? "secretaria" : "recepcao"));
  const nivel = Number(sp.get("nivel") ?? 1);
  const caso = Number(sp.get("caso") ?? (nivel === 2 ? 11 : 1));
  const s = useMemo(() => {
    const r = apply(null, "g-start", { type: "start", playerName: "Teste", avatar: "av1", scenario: fictionalScenario("2026-01-01T00:00:00.000Z"), seed: 7, gameId: "galeria-mundo3d" });
    return { ...r.state, nivel, location: loc, caso } as typeof r.state;
  }, [loc, caso, nivel]);
  const hs = activeHotspots(s);
  const pins = Object.fromEntries((["recepcao", "farmacia", "enfermagem", "administracao", "cofre", "patio", "secretaria", "planejamento", "prefeitura", "camara", "ubs"] as LocationId[]).map((k, i) => [k, { novo: i % 3, objetivo: k === "farmacia" }])) as Record<LocationId, { novo: number; objetivo: boolean }>;
  return <div className="mx-auto max-w-[1200px] p-3"><World3D s={s} hs={hs} q={(sp.get("q") as "alta" | "media" | "baixa") || "alta"} modo={modo} foco={sp.get("foco")} pins={pins} onPick={() => undefined} onGoRoom={(l) => { setLoc(l); setModo("sala"); }} onModo={setModo} reduzir={false} onFail={() => undefined} /></div>;
}
export default function Page() { return <Suspense><G /></Suspense>; }
